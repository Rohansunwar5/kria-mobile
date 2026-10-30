import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import TournamentDetail from '../src/app/tournament/[id]';
import { setTournamentSaved } from '@/api/tournaments';

jest.mock('@/api/tournaments', () => ({ ...jest.requireActual('@/api/tournaments'), setTournamentSaved: jest.fn() }));

// 2a Tournament: the screen follows the effective stage (status line, tabs, footer CTA).

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 't1' }),
  useRouter: () => ({ push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), canGoBack: () => true }),
  router: { push: (...a: unknown[]) => mockPush(...a) },
}));

let mockBase: Record<string, unknown> = {};
let mockExtras: Record<string, unknown> = {};
jest.mock('@/lib/useTournament', () => ({
  useTournament: () => mockBase,
  useOverviewExtras: () => mockExtras,
}));

const tournament = (over: Record<string, unknown> = {}) => ({
  _id: 't1', name: 'Arohance Open', sport: 'badminton', status: 'registration_open',
  startDate: '2026-10-20T06:00:00.000Z', endDate: '2026-10-20T08:00:00.000Z', registrationDeadline: '2099-10-17T06:00:00.000Z',
  venue: { name: 'Tiger Stadium', address: 'Koramangala', city: 'Bengaluru' }, description: 'A one-day event.', ...over,
});
const category = (over: Record<string, unknown> = {}) => ({
  _id: 'c1', tournamentId: 't1', name: "Men's Singles", status: 'registration', matchType: 'singles', bracketType: 'knockout',
  registrationFee: 600, isPaidRegistration: true, ...over,
});
const base = (t = tournament(), categories: unknown[] = [category()], mine: unknown[] = []) => ({
  data: { tournament: t, categories, mine }, loading: false, error: false, reload: jest.fn(),
});
const extras = (over: Record<string, unknown> = {}) => ({ teams: [], announcements: [], auctions: {}, matches: {}, ...over });

const renderScreen = (user: Record<string, unknown> | null = { _id: 'u1' }) =>
  render(
    <Provider store={configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, { type: '@@init' }), user } as never } })}>
      <TournamentDetail />
    </Provider>,
  );

beforeEach(() => { mockPush.mockClear(); mockBase = base(); mockExtras = extras(); });

describe('2a Tournament', () => {
  it('registration stage shows the open status, facts, categories and Register', () => {
    renderScreen(null);
    expect(screen.getByText('Registration open · closes Sat 17 Oct')).toBeTruthy();
    expect(screen.getByText('Tiger Stadium')).toBeTruthy();
    expect(screen.getByText("Men's Singles")).toBeTruthy();
    expect(screen.getByText('₹600')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Register · from ₹600'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('logged in with one open category, Register opens the category', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Register · from ₹600'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/category/[categoryId]', params: { categoryId: 'c1', tournamentId: 't1' } });
  });

  it('a live category auction overrides a closed tournament', () => {
    mockBase = base(tournament({ status: 'registration_closed' }), [category({ status: 'auction' })]);
    mockExtras = extras({ auctions: { c1: 'in_progress' } });
    renderScreen();
    expect(screen.getByText("Team auction live · Men's Singles")).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Watch the auction'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/auction/[tournamentId]/[categoryId]', params: { tournamentId: 't1', categoryId: 'c1' } });
  });

  // 2b's entryBlocker closes entries at the deadline; 2a must agree.
  it('a past deadline reads closed, with no Register', () => {
    mockBase = base(tournament({ registrationDeadline: '2020-10-17T06:00:00.000Z' }));
    renderScreen();
    expect(screen.getByText(/^Registration closed · starts /)).toBeTruthy();
    expect(screen.getByText('Registration closed')).toBeTruthy();
    expect(screen.queryByText('Registration open')).toBeNull();
    expect(screen.queryByLabelText(/^Register/)).toBeNull();
  });

  it('a team auction with no category live says it starts soon', () => {
    mockBase = base(tournament({ status: 'auction_in_progress' }), [category({ status: 'auction' })]);
    mockExtras = extras({ auctions: { c1: 'not_started' } });
    renderScreen();
    expect(screen.getByText('Team auction · starts soon')).toBeTruthy();
    expect(screen.queryByText(/Team auction live/)).toBeNull();
  });

  it('the tab row is tabs at least 44 tall, Overview selected', () => {
    mockBase = base(tournament({ teamsCount: 4 }));
    renderScreen();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.props.accessibilityState?.selected)).toEqual([true, false]);
    expect(within(tabs[0]).getByText('Overview')).toBeTruthy();
    expect(within(tabs[1]).getByText('Teams')).toBeTruthy();
    for (const t of tabs) expect(StyleSheet.flatten(t.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('the pinned update shows with All updates when there are more', () => {
    const a = (id: string, over = {}) => ({ _id: id, title: 'Courts moved', message: 'Hall B', severity: 'important', pinned: true, authorName: 'Org', createdAt: new Date().toISOString(), ...over });
    mockExtras = extras({ announcements: [a('a1'), a('a2', { title: 'Other' })] });
    renderScreen();
    expect(screen.getByText('Pinned · Important')).toBeTruthy();
    expect(screen.getByText('Courts moved')).toBeTruthy();
    fireEvent.press(screen.getByText('All updates'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/tournament/[id]/announcements', params: { id: 't1' } });
  });

  it('tabs show only with data', () => {
    renderScreen();
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.queryByText('Teams')).toBeNull();
    expect(screen.queryByText('Matches')).toBeNull();
  });

  it('a Teams tab appears with teams and opens the teams screen', () => {
    mockBase = base(tournament({ teamsCount: 4 }));
    renderScreen();
    fireEvent.press(screen.getByText('Teams'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/tournament/[id]/teams', params: { id: 't1' } });
  });

  it('no mock-only elements', () => {
    renderScreen();
    expect(screen.queryByText(/Organised by/)).toBeNull();
    // Share waits for a public link to share (SERVER-GAPS #15).
    expect(screen.queryByLabelText(/Share/)).toBeNull();
  });

  // SERVER-GAPS #15: the banner's bookmark, for a logged-in player.
  it('saves the event, and takes it back off', async () => {
    (setTournamentSaved as jest.Mock).mockImplementation(async (_id: string, saved: boolean) => (saved ? ['t1'] : []));
    renderScreen({ _id: 'u1', savedTournaments: [] });
    fireEvent.press(screen.getByLabelText('Save this event'));
    expect(setTournamentSaved).toHaveBeenLastCalledWith('t1', true);
    fireEvent.press(await screen.findByLabelText('Remove from saved'));
    expect(setTournamentSaved).toHaveBeenLastCalledWith('t1', false);
    expect(await screen.findByLabelText('Save this event')).toBeTruthy();
  });

  it('offers no bookmark when logged out', () => {
    renderScreen(null);
    expect(screen.queryByLabelText('Save this event')).toBeNull();
  });

  it('completed shows champions and awards (after preview)', () => {
    const final = {
      _id: 'm1', tournamentId: 't1', categoryId: 'c1', bracketRound: 'Final', matchNumber: 1, status: 'completed', winnerId: 'r1',
      player1: { registrationId: 'r1', name: 'Asha Rao', teamName: 'Falcons' }, player2: { registrationId: 'r2', name: 'Bela Das' },
      teams: {}, gameScores: [{ team1Score: 21, team2Score: 15 }, { team1Score: 21, team2Score: 18 }],
    };
    mockBase = base(
      tournament({ status: 'completed', awards: [{ title: 'Player of the tournament', player: { firstName: 'Asha', lastName: 'Rao' } }] }),
      [category({ status: 'completed' }), category({ _id: 'c2', name: 'Mixed League', status: 'completed', bracketType: 'league' })],
    );
    mockExtras = extras({ matches: { c1: [final] } });
    renderScreen();
    expect(screen.getByText('Champions')).toBeTruthy();
    expect(screen.getAllByText('Asha Rao')).toHaveLength(2); // champion and award recipient
    expect(screen.getByText('Falcons · won the final 21-15, 21-18')).toBeTruthy();
    expect(screen.getByText('Final table')).toBeTruthy();
    fireEvent.press(screen.getByText('Final table'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/tournament/[id]/matches', params: { id: 't1', category: 'c2' } });
    expect(screen.getByText('Player of the tournament')).toBeTruthy();
    expect(screen.getByLabelText('See results')).toBeTruthy();
  });

  it('completed without awards hides the Awards section', () => {
    mockBase = base(tournament({ status: 'completed' }), [category({ status: 'completed', bracketType: 'league' })]);
    renderScreen();
    expect(screen.queryByText('Awards')).toBeNull();
  });

  it('logged out it renders without my entries', () => {
    mockBase = { ...base(), data: { ...base().data, mine: [] } };
    renderScreen(null);
    expect(screen.getByText('Arohance Open')).toBeTruthy();
  });

  it('shows an error with Retry', () => {
    const reload = jest.fn();
    mockBase = { data: null, loading: false, error: true, reload };
    renderScreen();
    fireEvent.press(screen.getByText('Retry'));
    expect(reload).toHaveBeenCalled();
  });
});
