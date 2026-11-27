import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Awards from '../src/app/(tabs)/awards';
import { awardSeenKey, markAnnounced, seedIfNeeded } from '@/lib/rewardSeen';

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [cb]);
  },
  useScrollToTop: () => undefined,
  useIsFocused: () => true,
}));
jest.mock('@/lib/launchGate', () => ({ whenLaunchDone: () => Promise.resolve(), isLaunchDone: () => true }));
jest.mock('@/api/quickKnockout', () => ({ listMyQuickKnockouts: jest.fn(async () => []) }));
jest.mock('@/api/profileApi', () => ({
  getPublicPlayer: jest.fn(async () => ({
    player: { titles: [{ place: 'winner', categoryName: "Men's Doubles", tournamentName: 'HSR Shuttle Cup' }], honors: [{ title: 'Fair Play', badge: 'fair-play' }] },
    history: [],
  })),
}));
let mockMe = 'p1';
jest.mock('@/store/hooks', () => ({ useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: mockMe } } }) }));
jest.mock('@/lib/useCareer', () => ({
  useCareer: () => ({
    profile: { sports: [], bestSport: null, achievements: [] }, recent: [], loading: false, error: false, recentError: false, reload: jest.fn(),
  }),
}));

it('features the latest title, and a grid badge opens its sheet', async () => {
  render(<Awards />);
  expect(await screen.findByText('Latest title')).toBeTruthy();
  expect(screen.getAllByText("Champion · Men's Doubles").length).toBeGreaterThan(0);
  fireEvent.press(screen.getByLabelText('Fair Play, Given by an organiser'));
  expect(await screen.findByText('Organiser honour')).toBeTruthy();
});

it('marks an unseen honour New until its sheet is opened', async () => {
  mockMe = 'p-dot';
  await seedIfNeeded('p-dot', []); // not a first run
  // Announced in an earlier reveal's batch: no reveal of its own, but it keeps its dot.
  await markAnnounced('p-dot', [awardSeenKey({ kind: 'honour', honor: { title: 'Fair Play', badge: 'fair-play' } })!]);
  render(<Awards />);
  const dot = await screen.findByTestId('new-dot-honour-0');
  expect(dot).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Fair Play, Given by an organiser, new'));
  expect(await screen.findByText('Organiser honour')).toBeTruthy();
  await waitFor(() => expect(screen.queryByTestId('new-dot-honour-0')).toBeNull());
  expect(screen.getByLabelText('Fair Play, Given by an organiser')).toBeTruthy();
});
