import { act, fireEvent, render, screen } from '@testing-library/react-native';
import LiveScreen from '../src/app/live/[matchId]';
import type { BadmintonMatch } from '@/api/badmintonMatch';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), canGoBack: () => true },
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ matchId: 'm1' }),
}));
let mockHook: Record<string, unknown> = {};
jest.mock('@/lib/useBadmintonLive', () => ({ useBadmintonLive: () => mockHook }));
jest.mock('@/api/cricketMatch', () => ({
  resolveMatchSport: jest.fn(async () => 'badminton'),
  getTeamBrands: jest.fn(async () => ({})),
}));
jest.mock('@/api/tournaments', () => ({
  getTournament: jest.fn(async () => ({ name: 'Arohance' })),
  getTournamentCategories: jest.fn(async () => [{ _id: 'c1', name: "Men's Singles" }]),
}));
const mockNext = jest.fn();
jest.mock('@/api/badmintonMatch', () => ({ getBadmintonMatch: (...a: unknown[]) => mockNext(...a) }));

const P = (id: string, name: string) => ({ registrationId: id, name });
const base: BadmintonMatch = {
  _id: 'm1', tournamentId: 't1', categoryId: 'c1', competitorType: 'player', bracketRound: 'QUARTER-FINAL', matchNumber: 4,
  positionInRound: 3, player1: P('a', 'Rohit Sharma'), player2: P('b', 'Karthik Rao'), schedule: { court: '2', time: '3:00 PM' },
  status: 'in_progress', matchConfig: { bestOf: 3, pointsToWin: 21 },
  gameScores: [{ gameNumber: 1, team1Score: 18, team2Score: 21, winnerId: 'b' }, { gameNumber: 2, team1Score: 20, team2Score: 19 }],
};
const set = (match: Partial<BadmintonMatch> | null, o: object = {}) => {
  mockHook = { match: match && { ...base, ...match }, connected: true, loading: false, error: false, reload: jest.fn(), ...o };
};
const renderIt = async () => {
  render(<LiveScreen />);
  await act(async () => {});
};

beforeEach(() => { mockPush.mockClear(); mockNext.mockReset(); mockNext.mockResolvedValue(null); });

it('live board', async () => {
  set({});
  await renderIt();
  expect(screen.getByText('Quarter-final 4')).toBeTruthy();
  expect(screen.getByText("Arohance · Men's Singles · Court 2")).toBeTruthy();
  expect(screen.getByText('Live')).toBeTruthy();
  expect(screen.getByText('Game 2 · Games 0–1')).toBeTruthy();
  expect(screen.getByText('Best of 3 · to 21')).toBeTruthy();
  expect(screen.getByText('Rohit Sharma')).toBeTruthy();
  expect(screen.getByText('Karthik Rao')).toBeTruthy();
  expect(screen.getByText('Game point · Sharma')).toBeTruthy();
  expect(screen.getByText('In play')).toBeTruthy();
});

it('completed board has no chip', async () => {
  set({ status: 'completed', winnerId: 'a', gameScores: [
    { gameNumber: 1, team1Score: 21, team2Score: 18, winnerId: 'a' }, { gameNumber: 2, team1Score: 19, team2Score: 21, winnerId: 'b' }, { gameNumber: 3, team1Score: 21, team2Score: 10, winnerId: 'a' }] });
  await renderIt();
  expect(screen.getByText('Completed')).toBeTruthy();
  expect(screen.getByText('Sharma won 2–1')).toBeTruthy();
  expect(screen.queryByText(/point/i)).toBeNull();
});

describe('next match', () => {
  const next = { _id: 'n1', bracketRound: 'SEMI-FINAL', positionInRound: 1, player1: P('x', "Rohan D'Souza"), player2: P('', ''), schedule: { time: '4:30 PM', court: '1' } };

  it('shows the other side and opens the bracket', async () => {
    set({ nextMatchId: 'n1', nextMatchSlot: 'player2' });
    mockNext.mockResolvedValue(next);
    await renderIt();
    expect(mockNext).toHaveBeenCalledWith('n1');
    expect(screen.getByText("Winner plays Rohan D'Souza")).toBeTruthy();
    expect(screen.getByText('Semi-final 2 · 4:30 PM · Court 1')).toBeTruthy();
    fireEvent.press(screen.getByText('Bracket'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/tournament/[id]/matches', params: { id: 't1', category: 'c1' } });
  });

  it('TBD other side', async () => {
    set({ nextMatchId: 'n1', nextMatchSlot: 'player1' });
    mockNext.mockResolvedValue({ ...next, player1: P('', ''), player2: P('', 'TBD') });
    await renderIt();
    expect(screen.getByText('Winner goes to Semi-final')).toBeTruthy();
  });

  it('no card without nextMatchId', async () => {
    set({});
    await renderIt();
    expect(screen.queryByText('Bracket')).toBeNull();
  });

  it('tie sub-match: tie title, no card', async () => {
    set({ nextMatchId: 'n1', tieId: 'tie1', teams: { team1Name: 'Tigers', team2Name: 'Lions' }, slotLabel: 'Singles 1' });
    mockNext.mockResolvedValue(next);
    await renderIt();
    expect(screen.getByText('Tigers vs Lions · Singles 1')).toBeTruthy();
    expect(mockNext).not.toHaveBeenCalled();
    expect(screen.queryByText('Bracket')).toBeNull();
  });
});

it('reconnecting note when disconnected', async () => {
  set({}, { connected: false });
  await renderIt();
  expect(screen.getByText('Reconnecting. Showing the last update.')).toBeTruthy();
});

it('error without data retries', async () => {
  const reload = jest.fn();
  set(null, { error: true, reload });
  await renderIt();
  fireEvent.press(screen.getByText('Retry'));
  expect(reload).toHaveBeenCalled();
});
