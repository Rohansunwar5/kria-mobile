import { act, render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { type PlayerStats } from '@/store/slices/authSlice';
import registrationReducer, { type TournamentHistoryEntry } from '@/store/slices/registrationSlice';
import Profile from '../src/app/(tabs)/profile';
import type { QuickKnockout } from '@/api/quickKnockout';
import type { Achievement, CareerProfile, RecentMatch, SportSummary } from '@/api/career';
import { formatMoney } from '@/lib/format';

// The You tab, as redesigned in docs/profile-redesign.html: player card,
// sport cards, trophy cabinet, a history switch, then the account rows.

// No navigation container around a bare screen render, so every push is a
// no-op the test can read back.
const mockPush = jest.fn();
// useFocusEffect runs its callback on mount, like a focused screen; the test
// calls the latest one again to stand in for coming back to the tab.
let mockFocus: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => {
    mockFocus = cb;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [cb]);
  },
  // An honour renders a Badge, which pauses its halo off-screen.
  useIsFocused: () => true,
}));

// The Knockouts list loads through this; never let it reach axios.
const mockListKnockouts = jest.fn();
jest.mock('@/api/quickKnockout', () => ({
  listMyQuickKnockouts: () => mockListKnockouts(),
}));

// The screen dispatches `fetchPlayerStats()` on mount, a real thunk that
// calls axios. Mocking the thunk keeps the real reducer and every other export
// intact while stopping that dispatch from reaching the network.
jest.mock('@/store/slices/authSlice', () => {
  const actual = jest.requireActual('@/store/slices/authSlice');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    fetchPlayerStats: () => ({ type: 'auth/noop' }),
  };
});

// Same for the registration slice's `fetchPlayerTournamentHistory`. The
// reducer stays real so `preloadedState.registration.tournamentHistory` below
// is what renders.
jest.mock('@/store/slices/registrationSlice', () => {
  const actual = jest.requireActual('@/store/slices/registrationSlice');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    fetchPlayerTournamentHistory: () => ({ type: 'registration/noop' }),
  };
});

// Career profile and recent matches come through this hook (local state, not
// Redux); mocking it keeps every assertion deterministic.
const mockUseCareer = jest.fn();
jest.mock('@/lib/useCareer', () => ({ useCareer: () => mockUseCareer() }));

// playerStats carries tournament-only played/won counts (20/15) distinct from
// the career fixture's 9/6/3, so a stray one on screen is unambiguous.
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
  title: 'Rohan vs Dev',
  ...over,
});

const badminton: SportSummary = { sport: 'badminton', played: 9, decided: 9, won: 6, lost: 3, tied: 0, noResult: 0, winRate: 6 / 9 };

const achievement = (over: Partial<Achievement> = {}): Achievement => ({
  id: 'matches-50',
  label: 'Play 50 matches',
  earned: false,
  progress: 9,
  target: 50,
  ...over,
});

const careerProfile = (over: Partial<CareerProfile> = {}): CareerProfile => ({
  sports: [badminton],
  bestSport: null,
  achievements: [],
  ...over,
});

const careerState = (over: Partial<ReturnType<typeof baseCareer>> = {}) => ({ ...baseCareer(), ...over });
const baseCareer = () => ({
  profile: careerProfile() as CareerProfile | null,
  recent: [recentMatch()] as RecentMatch[] | null,
  loading: false,
  error: false,
  recentError: false,
  reload: jest.fn(),
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

const renderProfile = (stats: PlayerStats | null = playerStats(), history: TournamentHistoryEntry[] = []) =>
  render(<Provider store={makeStore(stats, history)}><Profile /></Provider>);

const knockout = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k1',
  hostId: 'someone',
  name: 'Friday Cup',
  sport: 'badminton',
  format: 'singles',
  matchConfig: { bestOf: 3, pointsToWin: 21 },
  status: 'live',
  players: [],
  pairs: [],
  entrants: [],
  fixtures: [],
  roundNames: [],
  awards: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

describe('own profile screen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockListKnockouts.mockResolvedValue([]);
    mockUseCareer.mockReturnValue(careerState());
  });

  describe('player card', () => {
    it('renders your name and the photo picker', () => {
      const { getByText, getByLabelText } = renderProfile();
      expect(getByText('Rohan Sunwar')).toBeTruthy();
      expect(getByLabelText('Change profile photo')).toBeTruthy();
    });

    // Your email is private and says nothing about you as a player; it lives
    // in Edit profile.
    it('keeps your email off the profile', () => {
      const { queryByText } = renderProfile();
      expect(queryByText(/rohan@kria\.club/i)).toBeNull();
    });

    it('opens Settings from the gear', () => {
      const { getByLabelText } = renderProfile();
      fireEvent.press(getByLabelText('Open settings'));
      expect(mockPush).toHaveBeenCalledWith('/profile/settings');
    });

    // Played and win rate come from the career ledger, which blends tournament
    // and quick play; Events is the one figure only playerStats knows.
    it('shows played, win rate, honours and events', () => {
      const { getByLabelText } = renderProfile();
      expect(getByLabelText('Played 9')).toBeTruthy();
      expect(getByLabelText('Win rate 67%')).toBeTruthy();
      expect(getByLabelText('Honours 0')).toBeTruthy();
      expect(getByLabelText('Events 5')).toBeTruthy();
    });

    // playerStats' tournament-only played/won counts would put a second
    // "how many matches" on screen that disagrees with the ledger.
    it('never shows the tournament-only played or won counts from playerStats', () => {
      const { queryByText } = renderProfile();
      expect(queryByText('20')).toBeNull();
      expect(queryByText('15')).toBeNull();
    });

    it('shows a dash, not a zero, while the career is still loading', () => {
      mockUseCareer.mockReturnValue(careerState({ profile: null, recent: null, loading: true }));
      const { getByLabelText } = renderProfile();
      expect(getByLabelText('Played –')).toBeTruthy();
      expect(getByLabelText('Win rate –')).toBeTruthy();
    });
  });

  describe('by sport', () => {
    it('shows a card per sport with its win rate and record', () => {
      const { getByText, getByLabelText } = renderProfile();
      expect(getByText(/^by sport$/i)).toBeTruthy();
      expect(getByLabelText(/^badminton\. 67% win rate\. 6W · 3L · 9 played\.$/i)).toBeTruthy();
    });

    it('marks the best sport only when the server names one', () => {
      mockUseCareer.mockReturnValue(careerState({ profile: careerProfile({ bestSport: badminton }) }));
      const named = renderProfile();
      expect(named.getByLabelText(/^badminton, best sport\./i)).toBeTruthy();
      named.unmount();

      mockUseCareer.mockReturnValue(careerState());
      const unnamed = renderProfile();
      expect(unnamed.queryByText('Best')).toBeNull();
    });

    it('offers Host a match when nothing has been played', () => {
      mockUseCareer.mockReturnValue(careerState({ profile: careerProfile({ sports: [] }), recent: [] }));
      const { getByLabelText } = renderProfile();
      fireEvent.press(getByLabelText('Host a match'));
      expect(mockPush).toHaveBeenCalledWith('/quick/host');
    });
  });

  // The milestones were only ever shown to other players, on the public profile.
  it('shows your earned milestones and the next ones in the trophy cabinet', () => {
    mockUseCareer.mockReturnValue(
      careerState({
        profile: careerProfile({
          achievements: [achievement({ id: 'sports-2', label: 'Play 2 different sports', earned: true, progress: 2, target: 2 }), achievement()],
        }),
      }),
    );
    const { getByText, getByLabelText } = renderProfile();
    expect(getByText(/^trophy cabinet$/i)).toBeTruthy();
    expect(getByLabelText(/play 2 different sports — earned/i)).toBeTruthy();
    expect(getByLabelText(/play 50 matches, 9 of 50 — locked/i)).toBeTruthy();
  });

  describe('history', () => {
    it('opens on your latest results', () => {
      const { getByText } = renderProfile();
      expect(getByText(/^history$/i)).toBeTruthy();
      expect(getByText('Rohan vs Dev')).toBeTruthy();
    });

    it('hands the rest of your results to All matches', () => {
      mockUseCareer.mockReturnValue(
        careerState({ recent: Array.from({ length: 5 }, (_, i) => recentMatch({ _id: `m${i}`, title: `Match ${i}` })) }),
      );
      const { getByLabelText, queryByText } = renderProfile();
      expect(queryByText('Match 3')).toBeNull();
      fireEvent.press(getByLabelText('All matches'));
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[playerId]', params: { playerId: 'p1' } });
    });

    // The own-profile tab is the one place `auctionData.soldPrice` is available;
    // the public payload omits it by whitelist.
    it('shows a team you played for with its sold price under Teams', () => {
      const { getByLabelText, getByText } = renderProfile(playerStats(), [tournamentHistoryEntry({ auctionData: { soldPrice: 25000 } })]);
      fireEvent.press(getByLabelText('Teams'));
      expect(getByText('Koramangala Smashers')).toBeTruthy();
      expect(getByText(formatMoney(25000))).toBeTruthy();
    });

    it('omits the sold price for a team entry with no auction data', () => {
      const { getByLabelText, getByText, queryByText } = renderProfile(playerStats(), [tournamentHistoryEntry({ auctionData: undefined })]);
      fireEvent.press(getByLabelText('Teams'));
      expect(getByText('Koramangala Smashers')).toBeTruthy();
      expect(queryByText(/sold for/i)).toBeNull();
    });

    describe('knockouts', () => {
      const four = [
        knockout({ _id: 'k1', name: 'Cup One', hostId: 'p1' }),
        knockout({
          _id: 'k2',
          name: 'Cup Two',
          format: 'doubles',
          status: 'completed',
          players: [{ playerKey: 'a', displayName: 'Arjun Mehta' }],
          entrants: [{ entrantId: 'e1', playerKeys: ['a'] }],
          championEntrantId: 'e1',
        }),
        knockout({ _id: 'k3', name: 'Cup Three' }),
        knockout({ _id: 'k4', name: 'Cup Four' }),
      ];

      const openKnockouts = async (view: ReturnType<typeof renderProfile>) => {
        await act(async () => {});
        fireEvent.press(view.getByLabelText('Knockouts'));
      };

      it('shows the 3 latest with a Host tag, singles/doubles and the champion', async () => {
        mockListKnockouts.mockResolvedValue(four);
        const view = renderProfile();
        await openKnockouts(view);
        expect(view.getByText('Cup One')).toBeTruthy();
        expect(view.getByText('Cup Two')).toBeTruthy();
        expect(view.getByText('Cup Three')).toBeTruthy();
        expect(view.queryByText('Cup Four')).toBeNull();
        expect(view.getByText('Host')).toBeTruthy(); // only k1 is hosted by p1
        expect(view.getByText(/doubles/i)).toBeTruthy();
        expect(view.getByText(/Arjun Mehta/)).toBeTruthy();
      });

      it('opens a knockout and the full list', async () => {
        mockListKnockouts.mockResolvedValue(four);
        const view = renderProfile();
        await openKnockouts(view);
        fireEvent.press(view.getByText('Cup Two'));
        expect(mockPush).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k2' } });
        fireEvent.press(view.getByLabelText('See all knockouts'));
        expect(mockPush).toHaveBeenCalledWith('/knockout');
      });

      // A cancelled knockout is no history worth a row; All knockouts keeps it.
      it('leaves cancelled knockouts to All knockouts', async () => {
        mockListKnockouts.mockResolvedValue([knockout({ _id: 'kc', name: 'Called Off', status: 'cancelled' }), four[0]]);
        const view = renderProfile();
        await openKnockouts(view);
        expect(view.queryByText('Called Off')).toBeNull();
        expect(view.getByText('Cup One')).toBeTruthy();
        expect(view.getByText(/1 cancelled knockout is left out here/i)).toBeTruthy();
        expect(view.getByLabelText('See all knockouts')).toBeTruthy();
      });

      it('loads again each time the tab is focused', async () => {
        mockListKnockouts.mockClear();
        mockListKnockouts.mockResolvedValue([]);
        const view = renderProfile();
        await openKnockouts(view);
        expect(view.queryByText('Cup One')).toBeNull();
        mockListKnockouts.mockResolvedValue(four);
        await act(async () => { mockFocus!(); });
        expect(await view.findByText('Cup One')).toBeTruthy();
        expect(mockListKnockouts).toHaveBeenCalledTimes(2);
      });

      it('has no All knockouts for 3 or fewer, and says so when there are none', async () => {
        mockListKnockouts.mockResolvedValue(four.slice(0, 3));
        const first = renderProfile();
        await openKnockouts(first);
        expect(first.getByText('Cup One')).toBeTruthy();
        expect(first.queryByLabelText('See all knockouts')).toBeNull();
        first.unmount();

        mockListKnockouts.mockResolvedValue([]);
        const second = renderProfile();
        await openKnockouts(second);
        expect(second.getByText(/knockouts you host or play in are listed here/i)).toBeTruthy();
      });
    });
  });

  describe('account', () => {
    it('lists Quick matches under Playing, where the orange card used to be', () => {
      const { getByLabelText } = renderProfile();
      fireEvent.press(getByLabelText('Quick matches'));
      expect(mockPush).toHaveBeenCalledWith('/quick');
    });

    it('keeps Log out', () => {
      const { getByLabelText } = renderProfile();
      expect(getByLabelText('Log out')).toBeTruthy();
    });
  });
});
