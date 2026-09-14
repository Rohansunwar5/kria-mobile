import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { type PlayerStats } from '@/store/slices/authSlice';
import Profile from '../src/app/(tabs)/profile';
import type { CareerProfile, RecentMatch } from '@/api/career';

// Characterisation test: `profile.tsx` had no test at all before this file.
// It pins what the screen renders TODAY so later tasks that change it (Task 2
// deletes the four-cell stats strip on purpose) show up as a diff here
// instead of shipping silently. Every assertion below must already be true
// of the screen as it stands — a failure means a misreading of the screen,
// not a bug to fix.

// Same shape as HomeScreen.test.tsx: no navigation container around a bare
// screen render, so every push is a no-op.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// The screen dispatches `fetchPlayerStats()` on mount (a real thunk that
// calls `API.get('/player/auth/stats')`). Mocking the thunk itself — exactly
// how HomeScreen.test.tsx stubs `fetchPublicTournaments` — keeps the real
// reducer and every other export intact while stopping that dispatch from
// ever reaching axios.
jest.mock('@/store/slices/authSlice', () => {
  const actual = jest.requireActual('@/store/slices/authSlice');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    fetchPlayerStats: () => ({ type: 'auth/noop' }),
  };
});

// The screen reads the player's career profile and recent matches through
// this hook (local state, not Redux — see useCareer.ts). Mocking it is what
// lets the career card and recent-matches assertions below be deterministic
// instead of depending on `getCareerProfile`/`getRecentMatches` resolving.
const mockUseCareer = jest.fn();
jest.mock('@/lib/useCareer', () => ({ useCareer: () => mockUseCareer() }));

// Numbers deliberately distinct from the career-table fixture below (9/6/3,
// 67%) so `getByText` on a bare number can't match the wrong cell — the
// screen renders both the playerStats strip and the CareerCard's per-sport
// row on the same tree.
const playerStats = (over: Partial<PlayerStats> = {}): PlayerStats => ({
  totalTournaments: 5,
  pendingCount: 0,
  approvedCount: 5,
  auctionedCount: 4,
  totalMatchesPlayed: 20,
  totalMatchesWon: 15,
  totalPointsContributed: 0,
  totalEarnings: 0,
  highestBid: 0,
  ...over,
});

const recentMatch = (over: Partial<RecentMatch> = {}): RecentMatch => ({
  _id: 'm1',
  matchId: 'x1',
  sport: 'badminton',
  context: 'quick',
  result: 'won',
  playedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const careerProfile = (): CareerProfile => ({
  sports: [
    { sport: 'badminton', played: 9, decided: 9, won: 6, lost: 3, tied: 0, noResult: 0, winRate: 6 / 9 },
  ],
  bestSport: null,
  achievements: [],
});

const INIT = { type: '@@preload' };

const makeStore = (stats: PlayerStats | null) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        ...authReducer(undefined, INIT),
        user: { _id: 'p1', firstName: 'Rohan', lastName: 'Sunwar', email: 'rohan@kria.club', phone: '9000000000', status: 'active' },
        playerStats: stats,
      },
    },
  });

describe('own profile screen (characterisation)', () => {
  beforeEach(() => {
    mockUseCareer.mockReturnValue({
      profile: careerProfile(),
      recent: [recentMatch()],
      loading: false,
      error: false,
      recentError: false,
      reload: jest.fn(),
    });
  });

  it('renders the player\'s name and avatar', () => {
    const { getByText, getByLabelText } = render(
      <Provider store={makeStore(playerStats())}><Profile /></Provider>
    );

    expect(getByText('Rohan Sunwar')).toBeTruthy();
    // AvatarPicker is the only place the identity photo/initials render.
    expect(getByLabelText('Change profile photo')).toBeTruthy();
  });

  it('renders the career card', () => {
    const { getByText } = render(
      <Provider store={makeStore(playerStats())}><Profile /></Provider>
    );

    expect(getByText(/career by sport/i)).toBeTruthy();
  });

  it('renders the recent-matches feed', () => {
    const { getByText } = render(
      <Provider store={makeStore(playerStats())}><Profile /></Provider>
    );

    expect(getByText(/recent matches/i)).toBeTruthy();
  });

  // Task 2 deletes this strip on purpose. This assertion pins its current
  // presence so that deletion is a visible diff here, not a silent one — the
  // brief for Task 2 says to remove this test once it has served that
  // purpose.
  it('shows the four-cell stats strip from playerStats — Events, Matches, Wins, Rate', () => {
    const { getByText } = render(
      <Provider store={makeStore(playerStats())}><Profile /></Provider>
    );

    expect(getByText('Events')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();

    expect(getByText('Matches')).toBeTruthy();
    expect(getByText('20')).toBeTruthy();

    expect(getByText('Wins')).toBeTruthy();
    expect(getByText('15')).toBeTruthy();

    expect(getByText('Rate')).toBeTruthy();
    expect(getByText('75%')).toBeTruthy();
  });
});
