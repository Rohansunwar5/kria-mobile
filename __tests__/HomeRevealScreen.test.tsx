import { render, screen } from '@testing-library/react-native';
import Home from '../src/app/(tabs)/home';
import { seedIfNeeded } from '@/lib/rewardSeen';

// Home's data sources, reduced to what a returning player with one new title needs.
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [cb]);
  },
  useScrollToTop: () => undefined,
  useIsFocused: () => true,
}));
jest.mock('@/lib/launchGate', () => ({ whenLaunchDone: () => Promise.resolve(), isLaunchDone: () => true }));
jest.mock('@/api/quickKnockout', () => ({ listMyQuickKnockouts: jest.fn(async () => []) }));
jest.mock('@/api/quickMatch', () => ({ listMyQuickMatches: jest.fn(async () => []) }));
jest.mock('@/api/rankings', () => ({ getTopPlayers: jest.fn(async () => []) }));
jest.mock('@/api/tournaments', () => ({ latestTournaments: jest.fn(async () => []) }));
jest.mock('@/api/profileApi', () => ({
  getPublicPlayer: jest.fn(async () => ({
    player: { titles: [{ place: 'winner', tournamentId: 't1', categoryId: 'c1', tournamentName: 'Kria City Open 2026', categoryName: "Women's singles" }], honors: [] },
    history: [],
  })),
}));
jest.mock('@/lib/useLiveNow', () => ({ useLiveNow: () => ({ items: [], loading: false }) }));
jest.mock('@/lib/unreadBell', () => ({ useUnreadCount: () => 0 }));
jest.mock('@/lib/usePushAsk', () => ({ usePushAsk: () => undefined }));
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'home-p1', firstName: 'Asha', lastName: 'Nair' } } }),
}));
jest.mock('@/lib/useCareer', () => ({
  useCareer: () => ({
    profile: { sports: [{ sport: 'badminton', played: 12, decided: 12, won: 7, lost: 5, tied: 0, noResult: 0, winRate: 7 / 12 }], bestSport: null, achievements: [] },
    recent: [], loading: false, error: false, recentError: false, reload: jest.fn(),
  }),
}));

it('reveals a title the player has not seen yet, on Home', async () => {
  await seedIfNeeded('home-p1', []); // not a first run, so the title counts as new
  render(<Home />);
  expect(await screen.findByText('Title · Winner')).toBeTruthy();
  expect(screen.getByText('Kria City Open 2026')).toBeTruthy();
  expect(screen.getByText('See award')).toBeTruthy();
});
