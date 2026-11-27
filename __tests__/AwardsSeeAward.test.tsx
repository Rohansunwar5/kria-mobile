import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Awards from '../src/app/(tabs)/awards';
import { loadStates, seedIfNeeded } from '@/lib/rewardSeen';

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [cb]);
  },
  useScrollToTop: () => undefined,
  useIsFocused: () => true,
}));
jest.mock('@/lib/launchGate', () => ({ whenLaunchDone: () => Promise.resolve(), isLaunchDone: () => true }));
jest.mock('@/lib/haptics', () => ({ haptics: { award: jest.fn(), press: jest.fn(), select: jest.fn() } }));
jest.mock('@/api/quickKnockout', () => ({ listMyQuickKnockouts: jest.fn(async () => []) }));
// Two knockout wins in one sport: one award, revealed under one key, with both keys behind it.
jest.mock('@/api/profileApi', () => ({
  getPublicPlayer: jest.fn(async () => ({
    player: {
      titles: [],
      honors: [
        { title: 'Won Cup', badge: 'knockout-winner', ref: 'k1', eventName: 'Cup', sport: 'badminton' },
        { title: 'Won Plate', badge: 'knockout-winner', ref: 'k2', eventName: 'Plate', sport: 'badminton' },
      ],
    },
    history: [],
  })),
}));
jest.mock('@/store/hooks', () => ({ useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'p-see' } } }) }));
jest.mock('@/lib/useCareer', () => ({
  useCareer: () => ({
    profile: { sports: [], bestSport: null, achievements: [] }, recent: [], loading: false, error: false, recentError: false, reload: jest.fn(),
  }),
}));

it('See award opens the award like a tap does: every key behind it is seen, and no dot is left (review M15)', async () => {
  await seedIfNeeded('p-see', []); // not a first run: both wins are new
  render(<Awards />);
  expect(await screen.findByText('See award')).toBeTruthy();
  fireEvent.press(screen.getByTestId('reveal-skip'));
  fireEvent.press(screen.getByText('See award'));
  expect(await screen.findByText('Quick knockout · ×2')).toBeTruthy();
  await waitFor(async () => {
    const st = await loadStates('p-see', ['ko_k1', 'ko_k2']);
    expect([st.get('ko_k1'), st.get('ko_k2')]).toEqual(['opened', 'opened']);
  });
  expect(screen.queryByTestId('new-dot-ko-badminton')).toBeNull();
});
