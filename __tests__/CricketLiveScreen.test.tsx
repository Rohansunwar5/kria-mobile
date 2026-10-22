import { act, fireEvent, render, screen } from '@testing-library/react-native';
import LiveScreen from '../src/app/live/[matchId]';
import type { CricketMatch, InningsScorecard, LiveState, Scorecard } from '@/api/cricketMatch';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ matchId: 'm1' }),
}));
let mockHook: Record<string, unknown> = {};
jest.mock('@/lib/useCricketMatchSocket', () => ({ useCricketMatchSocket: () => mockHook }));
jest.mock('@/api/cricketMatch', () => ({
  resolveMatchSport: jest.fn(async () => 'cricket'),
  getTeamBrands: jest.fn(async () => ({})),
}));
jest.mock('@/api/tournaments', () => ({
  getTournament: jest.fn(async () => ({ name: 'Koramangala T10' })),
  getTournamentCategories: jest.fn(async () => [{ _id: 'c1', name: 'Open', cricketConfig: { overs: 10 } }]),
}));

const ball = (label: string, runs = 0, isWicket = false) => ({ label, runs, isWicket });
const over = (overNumber: number, balls: ReturnType<typeof ball>[]) => ({
  overNumber, runs: balls.reduce((s, b) => s + b.runs, 0), wickets: balls.filter((b) => b.isWicket).length, balls,
});
const inn1: InningsScorecard = {
  inningsNumber: 1, battingTeamId: 'tB', battingTeamName: 'Hegde XI', bowlingTeamId: 'tA', bowlingTeamName: 'Rawnat',
  totals: { runs: 118, wickets: 6, overs: '10.0', extras: { wides: 5, noBalls: 1, byes: 0, legByes: 1, total: 7 } },
  battingCard: [], bowlingCard: [], currentPartnership: null, fallOfWickets: [], partnerships: [],
  oversTimeline: [over(1, [ball('4', 4), ball('0')])],
};
const inn2: InningsScorecard = {
  inningsNumber: 2, battingTeamId: 'tA', battingTeamName: 'Rawnat', bowlingTeamId: 'tB', bowlingTeamName: 'Hegde XI',
  totals: { runs: 87, wickets: 3, overs: '6.2', extras: { wides: 4, noBalls: 0, byes: 0, legByes: 2, total: 6 } },
  battingCard: [
    { registrationId: 'p1', name: 'Kulkarni', runs: 22, ballsFaced: 15, fours: 2, sixes: 1, strikeRate: 0, dismissal: { type: 'caught', fielderName: 'Hegde', bowlerName: 'Pillai' } },
    { registrationId: 'p3', name: 'Gowda', runs: 12, ballsFaced: 9, fours: 1, sixes: 0, strikeRate: 0 },
    { registrationId: 'p4', name: 'Nair', runs: 5, ballsFaced: 4, fours: 0, sixes: 0, strikeRate: 0 },
  ],
  bowlingCard: [{ registrationId: 'b1', name: 'Pillai', overs: '2.0', maidens: 0, runs: 15, wickets: 1, economy: 7.5 }],
  oversTimeline: [
    over(6, [ball('1', 1), ball('0')]),
    over(7, [ball('4', 4), ball('wd+1', 1), ball('1', 1)]),
  ],
  currentPartnership: { strikerId: 'p3', strikerName: 'Gowda', nonStrikerId: 'p4', nonStrikerName: 'Nair', runs: 18, balls: 8 },
  fallOfWickets: [
    { wicketNumber: 1, score: 22, overs: '1.5', batterId: 'p1', batterName: 'Kulkarni', dismissalLine: 'c Hegde b Pillai', partnershipRuns: 22, partnershipBalls: 11 },
  ],
  partnerships: [],
};
const sc: Scorecard = { innings1: inn1, innings2: inn2 };
const live2: LiveState = {
  runs: 87, wickets: 3, completedOvers: 6, ballsInCurrentOver: 2, currentInnings: 2, target: 119,
  battingTeamId: 'tA', bowlingTeamId: 'tB', strikerId: 'p3', nonStrikerId: 'p4', currentBowlerId: 'b1',
  matchStatus: 'innings2',
  innings1Summary: { runs: 118, wickets: 6, completedOvers: 10, ballsInCurrentOver: 0 },
};
const match: CricketMatch = {
  _id: 'm1', tournamentId: 't1', categoryId: 'c1', bracketRound: 'LEAGUE', matchNumber: 6, status: 'in_progress',
  teams: { team1Id: 'tA', team2Id: 'tB', team1Name: 'Rawnat', team2Name: 'Hegde XI' },
  cricketSetup: { toss: { winnerTeamId: 'tA', decision: 'bowl', recorded: true } },
  matchConfig: { maxOvers: 10 },
};
const set = (o: Record<string, unknown> = {}) => {
  mockHook = { match, live: live2, scorecard: sc, connected: true, loading: false, error: false, reload: jest.fn(), ...o };
};
const renderIt = async () => {
  render(<LiveScreen />);
  await act(async () => {});
};

it('live tab', async () => {
  set();
  await renderIt();
  expect(screen.getByText('League · Open')).toBeTruthy();
  expect(screen.getByText('Koramangala T10')).toBeTruthy();
  expect(screen.getByText('2nd innings')).toBeTruthy();
  expect(screen.getByText('32')).toBeTruthy();
  expect(screen.getByText('off 22')).toBeTruthy();
  expect(screen.getByText('8.73')).toBeTruthy();
  expect(screen.getByText('13.74')).toBeTruthy();
  expect(screen.getByText('Gowda*')).toBeTruthy();
  expect(screen.getByText('Partnership 18 (8)')).toBeTruthy();
  expect(screen.getByText('Pillai')).toBeTruthy();
  expect(screen.getByText('This over')).toBeTruthy();
  expect(screen.getByText('6 runs')).toBeTruthy();
  expect(screen.getByText('Rawnat won the toss and chose to bowl')).toBeTruthy();
});

it('scorecard tab', async () => {
  set();
  await renderIt();
  fireEvent.press(screen.getByText('Scorecard'));
  expect(screen.getByText('Rawnat 87/3')).toBeTruthy();
  expect(screen.getByText('Hegde XI 118/6')).toBeTruthy();
  expect(screen.getByText('c Hegde b Pillai')).toBeTruthy();
  expect(screen.getAllByText('not out').length).toBe(2);
  expect(screen.getByText('Extras 6 (wd 4, lb 2)')).toBeTruthy();
  expect(screen.getByText('Fall of wickets')).toBeTruthy();
});

it('overs tab', async () => {
  set();
  await renderIt();
  fireEvent.press(screen.getByText('Overs'));
  expect(screen.getByText('Runs per over')).toBeTruthy();
  expect(screen.getByText('Over 7')).toBeTruthy();
});

it('innings break', async () => {
  set({ live: { ...live2, runs: 0, wickets: 0, completedOvers: 0, ballsInCurrentOver: 0, matchStatus: 'innings_break' } });
  await renderIt();
  expect(screen.getByText('Innings break')).toBeTruthy();
  expect(screen.getByText('Innings break · Target 119')).toBeTruthy();
});

it('completed opens on the scorecard with the result', async () => {
  set({ match: { ...match, status: 'completed', winnerId: 'tB', result: { marginOfVictory: 'by 31 runs' } }, live: { ...live2, matchStatus: 'completed' } });
  await renderIt();
  expect(screen.getByText('Hegde XI won by 31 runs')).toBeTruthy();
  expect(screen.getByText('Fall of wickets')).toBeTruthy();
});

it('disconnected', async () => {
  set({ connected: false });
  await renderIt();
  expect(screen.getByText('Reconnecting. Showing the last update.')).toBeTruthy();
});
