import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { type PlayerStats } from '@/store/slices/authSlice';
import registrationReducer, { type TournamentHistoryEntry } from '@/store/slices/registrationSlice';
import Profile from '../src/app/(tabs)/profile';
import type { CareerProfile, RecentMatch, SportSummary } from '@/api/career';
import type { Title } from '@/api/profileApi';

// Profile tab (mocks 1h, 4e): identity, checklist, win-rate rings per sport,
// per-sport detail, tournaments, account.

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a) },
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [cb]);
  },
  useScrollToTop: () => undefined,
}));
jest.mock('@/components/profile/usePhotoUpload', () => ({ usePhotoUpload: () => ({ pick: jest.fn(), busy: false }) }));
jest.mock('@/api/quickKnockout', () => ({ listMyQuickKnockouts: jest.fn(async () => []) }));
let mockRecord = { titles: [] as Title[], honors: [] as { title: string; badge: string }[] };
jest.mock('@/api/profileApi', () => ({ getPublicPlayer: jest.fn(async () => ({ player: mockRecord, history: [] })) }));
let mockRecent: RecentMatch[] = [];
jest.mock('@/api/career', () => ({ getRecentMatches: jest.fn(async () => mockRecent) }));
jest.mock('@/api/rankings', () => ({ getTopPlayers: jest.fn(async () => [{ playerId: 'p1', firstName: 'Rohan', lastName: 'Sunwar', played: 12, decided: 12, won: 8, winRate: 8 / 12 }]) }));
jest.mock('@/api/tournaments', () => ({ latestTournaments: jest.fn(async () => [{ _id: 'a' }, { _id: 'b' }]) }));
const mockLogout = jest.fn(() => ({ type: 'test/logout' }));
jest.mock('@/store/slices/authSlice', () => {
  const actual = jest.requireActual('@/store/slices/authSlice');
  return { ...actual, __esModule: true, default: actual.default, fetchPlayerStats: () => ({ type: 'auth/noop' }), logout: () => mockLogout() };
});
jest.mock('@/store/slices/registrationSlice', () => {
  const actual = jest.requireActual('@/store/slices/registrationSlice');
  return { ...actual, __esModule: true, default: actual.default, fetchPlayerTournamentHistory: () => ({ type: 'registration/noop' }) };
});
const mockUseCareer = jest.fn();
jest.mock('@/lib/useCareer', () => ({ useCareer: () => mockUseCareer() }));

const sport = (over: Partial<SportSummary>): SportSummary => ({ sport: 'badminton', played: 12, decided: 12, won: 8, lost: 4, tied: 0, noResult: 0, winRate: 8 / 12, ...over });
const career = (profile: Partial<CareerProfile> | null) => ({
  profile: profile && { sports: [], bestSport: null, achievements: [], ...profile },
  recent: mockRecent, loading: false, error: false, recentError: false, reload: jest.fn(),
});
const stats = { totalTournaments: 5 } as PlayerStats;
const INIT = { type: '@@preload' };
const renderProfile = (user: Record<string, unknown> = {}, history: TournamentHistoryEntry[] = []) =>
  render(
    <Provider
      store={configureStore({
        reducer: { auth: authReducer, registration: registrationReducer },
        preloadedState: {
          auth: { ...authReducer(undefined, INIT), playerStats: stats, user: { _id: 'p1', firstName: 'Rohan', lastName: 'Sunwar', email: 'rohan@kria.club', phone: '9', status: 'active', dateOfBirth: '2000-01-01', gender: 'male', sport: 'badminton', ...user } },
          registration: { ...registrationReducer(undefined, INIT), tournamentHistory: history },
        },
      })}
    >
      <Profile />
    </Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockRecord = { titles: [], honors: [] };
  mockRecent = [{ _id: 'r1', matchId: 'm1', sport: 'badminton', context: 'quick', result: 'won', playedAt: '2026-10-19T10:00:00Z', title: 'Smash Bros vs Net Gains', scoreline: '21-17' }];
});

it('shows who you are and opens settings and edit, without your email', () => {
  mockUseCareer.mockReturnValue(career({ sports: [sport({})] }));
  renderProfile();
  expect(screen.getByText('Rohan\nSunwar')).toBeTruthy();
  expect(screen.queryByText('rohan@kria.club')).toBeNull();
  fireEvent.press(screen.getByLabelText('Settings'));
  expect(mockPush).toHaveBeenCalledWith('/profile/settings');
  fireEvent.press(screen.getByLabelText('Edit profile'));
  expect(mockPush).toHaveBeenCalledWith('/profile/edit');
});

it('totals matches and wins from the career, tournaments from your entries, and shows your rank', async () => {
  mockUseCareer.mockReturnValue(career({ sports: [sport({}), sport({ sport: 'cricket', played: 3, decided: 3, won: 1, lost: 2, winRate: 1 / 3 })] }));
  renderProfile();
  expect(screen.getAllByText('15').length).toBe(2); // 12 + 3 played: the strip and All sports
  expect(screen.getAllByText('9').length).toBeGreaterThan(0); // 8 + 1 won
  expect(screen.getByText('5')).toBeTruthy();
  await waitFor(() => expect(screen.getByText('#1')).toBeTruthy());
});

it('rings each sport played, and a short sport shows its way to a ranking', () => {
  mockUseCareer.mockReturnValue(career({ sports: [sport({}), sport({ sport: 'cricket', played: 3, decided: 3, won: 1, lost: 2, winRate: 1 / 3 })], bestSport: sport({}) }));
  renderProfile();
  expect(screen.getByLabelText('All sports: 60%')).toBeTruthy();
  expect(screen.getByLabelText('Badminton: 67%, best sport')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Cricket: 3/10'));
  expect(screen.getByText('Not ranked yet')).toBeTruthy();
  expect(screen.getByText('3 of 10 decided matches. 7 more and you appear on the cricket board.')).toBeTruthy();
});

it('marks a tournament you won from your titles, and says where the others stand', async () => {
  mockRecord = { titles: [{ place: 'winner', categoryName: "Men's Doubles", tournamentName: 'Kria Smash Cup' }], honors: [] };
  mockUseCareer.mockReturnValue(career({ sports: [sport({})] }));
  const entry = (id: string, status: string, name: string, tStatus: string): TournamentHistoryEntry => ({
    _id: id, status, createdAt: '', category: { _id: 'c', name: "Men's Doubles", gender: 'male' },
    tournament: { _id: `t${id}`, name, sport: 'badminton', startDate: '', endDate: '', status: tStatus },
  });
  renderProfile({}, [entry('1', 'approved', 'Kria Smash Cup', 'completed'), entry('2', 'pending', 'HSR Open', 'registration_open')]);
  await waitFor(() => expect(screen.getByText('Winner')).toBeTruthy());
  expect(screen.getByText('Awaiting approval')).toBeTruthy();
  fireEvent.press(screen.getByLabelText("HSR Open, Men's Doubles · individual entry, Awaiting approval"));
  expect(mockPush).toHaveBeenCalledWith('/tournament/t2');
});

it('a new player gets the checklist, honest blanks, and the events open for entry', async () => {
  mockRecent = [];
  mockUseCareer.mockReturnValue(career({ sports: [] }));
  renderProfile({ dateOfBirth: undefined, gender: undefined });
  expect(screen.getByText('Complete your profile')).toBeTruthy();
  expect(screen.getByText('Win rate, form and results by sport fill in after your first match. Your rank appears at 10 decided matches.')).toBeTruthy();
  await waitFor(() => expect(screen.getByText('2 badminton events are open for entries')).toBeTruthy());
  expect(screen.getByText('Unranked')).toBeTruthy();
});

it('keeps entries, payments and log out', () => {
  mockUseCareer.mockReturnValue(career({ sports: [sport({})] }));
  renderProfile();
  fireEvent.press(screen.getByLabelText('My entries'));
  expect(mockPush).toHaveBeenCalledWith('/profile/registrations');
  fireEvent.press(screen.getByLabelText('Payments'));
  expect(mockPush).toHaveBeenCalledWith('/profile/invoices');
  fireEvent.press(screen.getByLabelText('Log out'));
  expect(mockLogout).toHaveBeenCalled();
});
