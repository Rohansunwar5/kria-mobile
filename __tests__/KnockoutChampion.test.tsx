import { act, fireEvent, render, screen } from '@testing-library/react-native';
import KnockoutScreen from '../src/app/knockout/[id]';
import { loadStates, resetRewardCache } from '@/lib/rewardSeen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'k1' }),
  useIsFocused: () => true,
}));
jest.mock('@/lib/launchGate', () => ({ whenLaunchDone: () => Promise.resolve(), isLaunchDone: () => true }));
jest.mock('@/lib/haptics', () => ({ haptics: { award: jest.fn(), press: jest.fn(), select: jest.fn() } }));
jest.mock('@/api/quickMatch', () => ({ getQuickMatch: jest.fn(() => new Promise(() => {})) }));
jest.mock('@/api/profileApi', () => ({
  getPublicPlayer: jest.fn(async () => ({
    player: { titles: [], honors: [{ title: 'Won Cup', badge: 'knockout-winner', ref: 'k1' }, { title: 'Won Old', badge: 'knockout-winner', ref: 'k0' }, { title: 'Won Older', badge: 'knockout-winner', ref: 'kx' }] },
    history: [],
  })),
}));
let mockViewer = 'champ';
jest.mock('@/store/hooks', () => ({ useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: mockViewer } } }) }));
jest.mock('@/lib/useQuickKnockout', () => ({
  useQuickKnockout: () => ({
    knockout: {
      _id: 'k1', hostId: 'h1', name: 'Cup', sport: 'badminton', format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 21 },
      status: 'completed', awardsEligible: false, awards: [], createdAt: '2026-11-01T00:00:00.000Z', pairs: [],
      players: [{ playerKey: 'a', playerId: 'h1', displayName: 'Arjun' }, { playerKey: 'b', playerId: 'champ', displayName: 'Asha' }, { playerKey: 'c', displayName: 'Sam' }],
      entrants: [{ entrantId: 'e1', playerKeys: ['a'] }, { entrantId: 'e2', playerKeys: ['b'] }, { entrantId: 'e3', playerKeys: ['c'] }],
      fixtures: [
        { fixtureId: 'f1', round: 1, position: 0, entrantA: 'e1', bye: true, winnerEntrantId: 'e1' },
        { fixtureId: 'f2', round: 1, position: 1, entrantA: 'e2', entrantB: 'e3', bye: false, winnerEntrantId: 'e2' },
        { fixtureId: 'f3', round: 2, position: 0, entrantA: 'e1', entrantB: 'e2', bye: false, winnerEntrantId: 'e2' },
      ],
      roundNames: ['Semi-Final', 'Final'], championEntrantId: 'e2',
    },
    loading: false, error: false, busy: false, problem: '', reload: jest.fn(),
  }),
}));

test('the champion sees the knockout reveal once, with their wins and their count', async () => {
  mockViewer = 'champ';
  render(<KnockoutScreen />);
  expect(await screen.findByText('2 wins to the title. Your 3rd knockout win.')).toBeTruthy();
  expect(screen.getByText('See award')).toBeTruthy();
  fireEvent.press(screen.getByTestId('reveal-skip')); // the buttons take taps once shown
  fireEvent.press(screen.getByText('Done'));
  await act(async () => { await Promise.resolve(); });
  expect(screen.queryByText('2 wins to the title. Your 3rd knockout win.')).toBeNull();
  expect((await loadStates('champ', ['ko_k1'])).get('ko_k1')).toBe('opened');
});

test('anyone else sees no reveal', async () => {
  mockViewer = 'h1';
  render(<KnockoutScreen />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(screen.queryByText(/wins? to the title/)).toBeNull();
});

test('when the profile does not load, the line leaves out the count instead of guessing "1st" (review #4)', async () => {
  mockViewer = 'champ';
  const { getPublicPlayer } = jest.requireMock('@/api/profileApi');
  // A fresh champion: forget the first test's opened state.
  const SecureStore = jest.requireMock('expo-secure-store');
  await SecureStore.deleteItemAsync('seen_champ_ko_k1');
  await SecureStore.deleteItemAsync('ann_champ_ko_k1');
  resetRewardCache();
  getPublicPlayer.mockRejectedValueOnce(new Error('offline'));
  render(<KnockoutScreen />);
  expect(await screen.findByText('2 wins to the title.')).toBeTruthy();
  expect(screen.queryByText(/knockout win\./)).toBeNull();
});
