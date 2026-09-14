import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { type PlayerStats } from '@/store/slices/authSlice';
import registrationReducer, { type TournamentHistoryEntry } from '@/store/slices/registrationSlice';
import Profile from '../src/app/(tabs)/profile';
import type { CareerProfile, RecentMatch } from '@/api/career';
import { formatMoney } from '@/lib/format';

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

// Same pattern for the registration slice's `fetchPlayerTournamentHistory` —
// a real thunk that calls `API.get('/player/auth/tournament-history')`. The
// reducer stays real so `preloadedState.registration.tournamentHistory` in
// `makeStore` below is what actually renders.
jest.mock('@/store/slices/registrationSlice', () => {
  const actual = jest.requireActual('@/store/slices/registrationSlice');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    fetchPlayerTournamentHistory: () => ({ type: 'registration/noop' }),
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

const tournamentHistoryEntry = (over: Partial<TournamentHistoryEntry> = {}): TournamentHistoryEntry => ({
  _id: 'h1',
  status: 'active',
  stats: { matchesPlayed: 9, matchesWon: 7, pointsContributed: 0 },
  createdAt: '2025-06-01T00:00:00.000Z',
  tournament: { _id: 't1', name: 'Kria Smash Cup', sport: 'badminton', startDate: '2025-06-01', endDate: '2025-06-05', status: 'completed' },
  team: { _id: 'tm1', name: 'Koramangala Smashers', primaryColor: '#8B3FD1' },
  ...over,
});

const INIT = { type: '@@preload' };

const makeStore = (stats: PlayerStats | null, tournamentHistory: TournamentHistoryEntry[] = []) =>
  configureStore({
    reducer: { auth: authReducer, registration: registrationReducer },
    preloadedState: {
      auth: {
        ...authReducer(undefined, INIT),
        user: { _id: 'p1', firstName: 'Rohan', lastName: 'Sunwar', email: 'rohan@kria.club', phone: '9000000000', status: 'active' },
        playerStats: stats,
      },
      registration: {
        ...registrationReducer(undefined, INIT),
        tournamentHistory,
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

  // Task 2: the tournament-only Matches/Wins/Rate cells came off the strip —
  // the career ledger below already states the same record, blended across
  // tournament and quick play, and two numbers for "how many matches" a few
  // centimetres apart was the bug this task fixes. `playerStats.totalMatchesPlayed`
  // (20) and `totalMatchesWon` (15) must not appear anywhere on the screen.
  it('no longer shows Matches, Wins or Rate cells sourced from playerStats', () => {
    const { queryByText } = render(
      <Provider store={makeStore(playerStats())}><Profile /></Provider>
    );

    expect(queryByText('Matches')).toBeNull();
    expect(queryByText('Wins')).toBeNull();
    expect(queryByText('Rate')).toBeNull();
    // 20 and 15 are the playerStats-sourced played/won counts — distinct
    // from the career fixture's 9/6/3 so a stray match here is unambiguous.
    expect(queryByText('20')).toBeNull();
    expect(queryByText('15')).toBeNull();
  });

  // The tournament count is the one figure the career ledger genuinely does
  // not know (a quick match has no TournamentRegistration), so it survives.
  it('still shows the tournament count from playerStats', () => {
    const { getByText } = render(
      <Provider store={makeStore(playerStats())}><Profile /></Provider>
    );

    expect(getByText('Events')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('renders BestSportHero when the server named a best sport', () => {
    mockUseCareer.mockReturnValue({
      profile: { ...careerProfile(), bestSport: { sport: 'badminton', played: 31, decided: 31, won: 21, lost: 10, tied: 0, noResult: 0, winRate: 21 / 31 } },
      recent: [recentMatch()],
      loading: false,
      error: false,
      recentError: false,
      reload: jest.fn(),
    });

    const { getByText } = render(
      <Provider store={makeStore(playerStats())}><Profile /></Provider>
    );

    expect(getByText(/best sport/i)).toBeTruthy();
  });

  it('renders no BestSportHero when the server named no best sport', () => {
    mockUseCareer.mockReturnValue({
      profile: careerProfile(),
      recent: [recentMatch()],
      loading: false,
      error: false,
      recentError: false,
      reload: jest.fn(),
    });

    const { queryByText } = render(
      <Provider store={makeStore(playerStats())}><Profile /></Provider>
    );

    expect(queryByText(/best sport/i)).toBeNull();
  });

  // The career table is the only place a win rate appears now — CareerCard's
  // own inline "Best sport" badge would otherwise be a second restatement of
  // the same fact BestSportHero already leads with (showBestSportBadge={false}).
  it('shows a win rate only in the career table, not a second time via CareerCard\'s badge', () => {
    mockUseCareer.mockReturnValue({
      profile: { ...careerProfile(), bestSport: { sport: 'badminton', played: 31, decided: 31, won: 21, lost: 10, tied: 0, noResult: 0, winRate: 21 / 31 } },
      recent: [recentMatch()],
      loading: false,
      error: false,
      recentError: false,
      reload: jest.fn(),
    });

    const { getAllByText } = render(
      <Provider store={makeStore(playerStats())}><Profile /></Provider>
    );

    // 68% is BestSportHero's big figure; 67% is the career table's row for
    // the same sport (6/9 in the fixture). Neither should appear twice —
    // CareerCard's own badge (also 68%) must be suppressed.
    expect(getAllByText('68%')).toHaveLength(1);
    expect(getAllByText('67%')).toHaveLength(1);
  });

  // Task 3: the own-profile tab is the one place `auctionData.soldPrice` is
  // genuinely available (the authenticated registration history carries it;
  // the public profile's payload omits it by whitelist — see
  // PlayerProfileAchievements.test.tsx for that side).
  it('renders a played-for entry with its sold price, formatted with formatMoney', () => {
    const { getByText } = render(
      <Provider store={makeStore(playerStats(), [tournamentHistoryEntry({ auctionData: { soldPrice: 25000 } })])}>
        <Profile />
      </Provider>
    );

    expect(getByText('Koramangala Smashers')).toBeTruthy();
    expect(getByText(formatMoney(25000))).toBeTruthy();
  });

  // PlayedForCard already omits the "Sold for" cell entirely when the prop
  // is absent — no dash, no zero. This asserts that behaviour survives here
  // rather than adding a second guard in profile.tsx that could drift from it.
  it('omits the sold-price cell for a played-for entry with no auction data', () => {
    const { getByText, queryByText } = render(
      <Provider store={makeStore(playerStats(), [tournamentHistoryEntry({ auctionData: undefined })])}>
        <Profile />
      </Provider>
    );

    expect(getByText('Koramangala Smashers')).toBeTruthy();
    expect(queryByText(/sold for/i)).toBeNull();
  });
});
