import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Matches from '../src/app/tournament/[id]/matches';

const mockPush = jest.fn();
let mockParams: Record<string, string> = { id: 't1' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));
const mockHook = jest.fn();
jest.mock('@/lib/useTournament', () => ({ useTournament: () => mockHook() }));
jest.mock('@/api/match', () => ({ getCategoryBracket: jest.fn() }));
jest.mock('@/api/leaderboard', () => ({ getCategoryLeaderboard: jest.fn() }));
jest.mock('@/api/teamLeague', () => ({ getGroupStandings: jest.fn(), getTiesByGroup: jest.fn() }));
jest.mock('@/api/tournaments', () => ({ getTournamentTeams: jest.fn() }));
/* eslint-disable @typescript-eslint/no-require-imports */
const { getCategoryBracket } = require('@/api/match');
const { getCategoryLeaderboard } = require('@/api/leaderboard');
const { getGroupStandings, getTiesByGroup } = require('@/api/teamLeague');
const { getTournamentTeams } = require('@/api/tournaments');
/* eslint-enable @typescript-eslint/no-require-imports */

const cat = (o: Record<string, unknown>) => ({ tournamentId: 't1', sport: 'badminton', matchType: 'singles', status: 'ongoing', registrationFee: 0, isPaidRegistration: false, ...o });
const P = (id: string, name: string, teamName = '') => ({ registrationId: id, name, teamId: '', teamName });
const TBD = P('TBD', 'TBD');
const m = (o: Record<string, unknown>) => ({ tournamentId: 't1', sportType: 'badminton', bracketRound: 'League', matchNumber: 1, roundNumber: 1, positionInRound: 0, teams: { team1Id: '', team2Id: '', team1Name: '', team2Name: '' }, status: 'scheduled', gameScores: [], ...o });
const cfg = { bestOf: 3, pointsToWin: 21 };

const sf1 = m({ _id: 'sf1', bracketRound: 'Semi-Final', player1: P('r1', 'Asha', 'Sunrise'), player2: P('r2', 'Bina', 'Tigers'), schedule: { date: '2026-10-20T12:00:00', time: '4:30 PM', court: '1' }, nextMatchId: 'f', nextMatchSlot: 'player1', matchConfig: cfg });
const sf2 = m({ _id: 'sf2', bracketRound: 'Semi-Final', positionInRound: 1, matchNumber: 2, player1: P('r3', 'Cara'), player2: P('r4', 'Dev'), status: 'in_progress', schedule: { court: '2' }, gameScores: [{ gameNumber: 1, team1Score: 21, team2Score: 15 }], nextMatchId: 'f', nextMatchSlot: 'player2', matchConfig: cfg });
const fin = m({ _id: 'f', bracketRound: 'Final', roundNumber: 2, matchNumber: 3, player1: TBD, player2: TBD, matchConfig: cfg });

let byCat: Record<string, unknown[]> = {};
function setup(categories: unknown[], mine: unknown[] = [{ _id: 'r1', categoryId: 'c1' }], extra: Record<string, unknown> = {}) {
  mockHook.mockReturnValue({ data: { tournament: { name: 'Arohance Open' }, categories, mine }, loading: false, error: false, reload: jest.fn(), ...extra });
  return render(<Matches />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 't1' };
  byCat = {};
  getCategoryBracket.mockImplementation(async (c: string) => ({ matches: byCat[c] ?? [], rounds: {}, competitorType: 'player' }));
  getCategoryLeaderboard.mockResolvedValue({ boards: [{ label: null, entries: [] }] });
  getGroupStandings.mockResolvedValue([]);
  getTiesByGroup.mockResolvedValue([]);
  getTournamentTeams.mockResolvedValue([]);
});

describe('Matches screen', () => {
  it('knockout shows my next match and the bracket', async () => {
    byCat = { c1: [fin, sf2, sf1] };
    setup([cat({ _id: 'c1', name: "Men's Singles", bracketType: 'knockout' })]);
    expect(await screen.findByText('Your next match · Semi-final 1')).toBeTruthy();
    expect(screen.getByText('Court 1')).toBeTruthy();
    expect(screen.getByText('Tue 20 Oct · 4:30 PM · Best of 3 to 21')).toBeTruthy();
    expect(screen.getByText('Semi-final')).toBeTruthy();
    expect(screen.getByText('SF 1 · 4:30 PM · Court 1')).toBeTruthy();
    expect(screen.getByText('SF 2 · Live · Court 2')).toBeTruthy();
    expect(screen.getByText('Winner of SF 1')).toBeTruthy();
    expect(screen.getByText('Winner of SF 2')).toBeTruthy();
    expect(screen.getByText('Your matches')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Cara vs Dev, live. Open'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/live/[matchId]', params: { matchId: 'sf2' } });
  });

  it('no matches yet explains when', async () => {
    setup([
      cat({ _id: 'c1', name: "Men's Singles", status: 'registration', bracketType: 'knockout' }),
      cat({ _id: 'c2', name: 'Club Team Event', status: 'auction', bracketType: 'team_league', matchType: 'team' }),
      cat({ _id: 'c3', name: 'Boys U-17', status: 'setup' }),
    ]);
    expect(await screen.findByText('Draw after entries close')).toBeTruthy();
    expect(screen.getByText('The organiser draws the matches once entries close.')).toBeTruthy();
    expect(screen.queryByText('Boys U-17')).toBeNull();
    fireEvent.press(screen.getByText('Club Team Event'));
    expect(await screen.findByText('Draw after the auction')).toBeTruthy();
    expect(screen.getByText('Matches appear once the auction is done.')).toBeTruthy();
  });

  it('drawn but empty says no matches yet', async () => {
    setup([cat({ _id: 'c1', name: "Men's Singles", status: 'bracket_configured', bracketType: 'knockout' })]);
    expect(await screen.findByText('No matches yet')).toBeTruthy();
    expect(screen.getByText('Matches appear here once the organiser schedules them.')).toBeTruthy();
  });

  it('player league shows the server table', async () => {
    byCat = {
      c1: [
        m({ _id: 'm1', player1: P('r1', 'Asha'), player2: P('r2', 'Bina'), status: 'completed', winnerId: 'r1', schedule: { court: '1' }, gameScores: [{ gameNumber: 1, team1Score: 21, team2Score: 15 }, { gameNumber: 2, team1Score: 21, team2Score: 18 }], matchConfig: cfg }),
        m({ _id: 'm2', matchNumber: 2, player1: P('r1', 'Asha'), player2: P('r3', 'Cara'), schedule: { time: '6:00 PM' }, matchConfig: cfg }),
      ],
    };
    getCategoryLeaderboard.mockResolvedValue({ boards: [{ label: null, entries: [
      { _id: 'r1', playerName: 'Asha', teamName: 'Sunrise', matchesPlayed: 1, matchesWon: 1, totalPointsScored: 42, rank: 1 },
      { _id: 'r2', playerName: 'Bina', teamName: 'Tigers', matchesPlayed: 1, matchesWon: 0, totalPointsScored: 33, rank: 2 },
    ] }] });
    setup([cat({ _id: 'c1', name: "Men's Singles", bracketType: 'league' })]);
    expect(await screen.findByText('Ranked by points scored, then point difference')).toBeTruthy();
    expect(await screen.findByLabelText('1. Asha (you), played 1, won 1, lost 0, 42 points')).toBeTruthy();
    expect(screen.getByLabelText('2. Bina, played 1, won 0, lost 1, 33 points')).toBeTruthy();
    expect(screen.getByText('Results')).toBeTruthy();
    expect(screen.getByText('Asha d. Bina')).toBeTruthy();
    expect(screen.getByText('21-15, 21-18')).toBeTruthy();
    expect(screen.getByText('Coming up')).toBeTruthy();
    expect(screen.getByText('Asha v Cara')).toBeTruthy();
    expect(getCategoryLeaderboard).toHaveBeenCalledWith('c1');
  });

  it('cricket league counts the table from matches', async () => {
    const tm = (id: string, a: string, b: string, winner: string) => m({
      _id: id, sportType: 'cricket', competitorType: 'team', status: 'completed', winnerId: winner, matchConfig: { maxOvers: 20 },
      teams: { team1Id: a, team2Id: b, team1Name: a, team2Name: b }, result: { team1Summary: '120/4', team2Summary: '98/9' },
    });
    byCat = { c1: [tm('m1', 'Lions', 'Tigers', 'Lions'), tm('m2', 'Lions', 'Bears', 'Lions')] };
    setup([cat({ _id: 'c1', name: 'Open T20', sport: 'cricket', matchType: 'team', bracketType: 'league' })], [{ _id: 'r1', categoryId: 'c1', teamId: 'Bears' }]);
    expect(await screen.findByText('Ranked by wins')).toBeTruthy();
    expect(screen.getByLabelText('1. Lions, played 2, won 2, lost 0, drawn 0')).toBeTruthy();
    expect(screen.getByLabelText('2. Bears (you), played 1, won 0, lost 1, drawn 0')).toBeTruthy();
    expect(screen.getByLabelText('3. Tigers, played 1, won 0, lost 1, drawn 0')).toBeTruthy();
    fireEvent.press(screen.getByText('Player stats'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/cricket/leaderboard/[categoryId]', params: { categoryId: 'c1', tournamentName: 'Arohance Open', categoryName: 'Open T20' } });
  });

  // Live cricket completes a tie with no winnerId and winReason 'by_score'.
  it('a tied cricket match reads tied with and counts drawn', async () => {
    byCat = { c1: [m({
      _id: 'm1', sportType: 'cricket', competitorType: 'team', status: 'completed', winReason: 'by_score', matchConfig: { maxOvers: 20 },
      teams: { team1Id: 'Lions', team2Id: 'Bears', team1Name: 'Lions', team2Name: 'Bears' }, result: { team1Summary: '150/8', team2Summary: '150/6' },
    })] };
    setup([cat({ _id: 'c1', name: 'Open T20', sport: 'cricket', matchType: 'team', bracketType: 'league' })], []);
    expect(await screen.findByText('Lions tied with Bears')).toBeTruthy();
    expect(screen.getByLabelText('1. Bears, played 1, won 0, lost 0, drawn 1')).toBeTruthy();
    expect(screen.queryByText('Lions d. Bears')).toBeNull();
  });

  // As 2a does: a player can be on different teams in different categories.
  it('my team is my entry in the selected category, not another one', async () => {
    const tm = m({
      _id: 'm1', sportType: 'cricket', competitorType: 'team', status: 'completed', winnerId: 'Lions', matchConfig: { maxOvers: 20 },
      teams: { team1Id: 'Lions', team2Id: 'Bears', team1Name: 'Lions', team2Name: 'Bears' }, result: { team1Summary: '120/4', team2Summary: '98/9' },
    });
    byCat = { c1: [tm] };
    setup([cat({ _id: 'c1', name: 'Open T20', sport: 'cricket', matchType: 'team', bracketType: 'league' })], [{ _id: 'r9', categoryId: 'c2', teamId: 'Bears' }]);
    expect(await screen.findByLabelText('2. Bears, played 1, won 0, lost 1, drawn 0')).toBeTruthy();
  });

  it('team league shows groups, the line and ties', async () => {
    const st = (gid: string, name: string, teams: [string, string, number][]) => ({
      group: { _id: gid, groupName: name }, completedTies: 1, totalTies: 3,
      standings: teams.map(([teamId, teamName, points]) => ({ teamId, teamName, played: 1, won: points ? 1 : 0, lost: points ? 0 : 1, drawn: 0, points, subMatchesWon: 0, subMatchesLost: 0 })),
    });
    getGroupStandings.mockImplementation(async (_c: string, stage?: number) => (stage ? [] : [
      st('gA', 'Group A', [['T1', 'Lions', 2], ['T2', 'Tigers', 0], ['T3', 'Bears', 0]]),
      st('gB', 'Group B', [['T4', 'Hawks', 2], ['T5', 'Wolves', 0]]),
    ]));
    getTiesByGroup.mockImplementation(async (g: string) => (g === 'gA'
      ? [{ _id: 'tie1', teams: { team1Id: 'T1', team1Name: 'Lions', team2Id: 'T2', team2Name: 'Tigers' }, status: 'completed', team1SubWins: 3, team2SubWins: 2, completedCount: 5, subMatchCount: 5 }]
      : [{ _id: 'tie2', teams: { team1Id: 'T4', team1Name: 'Hawks', team2Id: 'T5', team2Name: 'Wolves' }, status: 'scheduled', team1SubWins: 0, team2SubWins: 0, completedCount: 0, subMatchCount: 5 }]));
    setup([cat({ _id: 'c1', name: 'Club Team Event', matchType: 'team', bracketType: 'team_league', teamLeagueConfig: { topNPerGroup: 2, pointsForWin: 2, pointsForDraw: 1, pointsForLoss: 0 } })], [{ _id: 'r1', categoryId: 'c1', teamId: 'T2' }]);
    expect(await screen.findByText('Group A')).toBeTruthy();
    expect(screen.getByText('Group B')).toBeTruthy();
    expect(screen.queryByText('Stage 1')).toBeNull();
    expect(screen.getByText('Win 2 · Draw 1 · Loss 0 points')).toBeTruthy();
    expect(screen.getByText('Top 2 go through')).toBeTruthy();
    expect(screen.getByLabelText('2. Tigers (you), played 1, won 0, lost 1, drawn 0, 0 points')).toBeTruthy();
    expect(await screen.findByText('Group A ties')).toBeTruthy();
    expect(screen.getByText('Lions v Tigers')).toBeTruthy();
    fireEvent.press(screen.getByText('3–2'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/tournament/[id]/tie/[tieId]', params: { id: 't1', tieId: 'tie1', group: 'Group A' } });
    fireEvent.press(screen.getByText('Group B'));
    expect(await screen.findByText('Hawks v Wolves')).toBeTruthy();
    expect(screen.getByText('0 of 5 played')).toBeTruthy();
    expect(getGroupStandings).toHaveBeenCalledWith('c1');
    expect(getGroupStandings).toHaveBeenCalledWith('c1', 2);
  });

  it('team league shows a stage switch only with more than one stage', async () => {
    const st = (gid: string, name: string) => ({ group: { _id: gid, groupName: name }, completedTies: 0, totalTies: 0, standings: [] });
    getGroupStandings.mockImplementation(async (_c: string, stage?: number) => (!stage ? [st('gA', 'Group A')] : stage === 2 ? [st('k', 'Knockout')] : []));
    setup([cat({ _id: 'c1', name: 'Club Team Event', matchType: 'team', bracketType: 'team_league' })]);
    fireEvent.press(await screen.findByText('Stage 2'));
    expect(await screen.findByText('Knockout ties')).toBeTruthy();
    expect(getGroupStandings).toHaveBeenCalledWith('c1', 3);
  });

  it('category chips switch the view', async () => {
    byCat = { c1: [fin, sf2, sf1], c2: [m({ _id: 'm1', player1: P('r5', 'Esha'), player2: P('r6', 'Fay'), matchConfig: cfg })] };
    const cats = [
      cat({ _id: 'c0', name: "Women's Singles", status: 'registration', bracketType: 'knockout' }),
      cat({ _id: 'c1', name: "Men's Singles", bracketType: 'knockout' }),
      cat({ _id: 'c2', name: 'Mixed League', bracketType: 'league' }),
    ];
    const a = setup(cats);
    expect(await screen.findByText('Your matches')).toBeTruthy();
    fireEvent.press(screen.getByText('Mixed League'));
    expect(await screen.findByText('Ranked by points scored, then point difference')).toBeTruthy();
    expect(screen.queryByText('Your matches')).toBeNull();
    a.unmount();
    mockParams = { id: 't1', category: 'c2' };
    setup(cats);
    expect(await screen.findByText('Ranked by points scored, then point difference')).toBeTruthy();
  });

  it('a failed load offers a retry that reloads the matches', async () => {
    byCat = { c1: [fin, sf2, sf1] };
    getCategoryBracket.mockRejectedValueOnce(new Error('net'));
    setup([cat({ _id: 'c1', name: "Men's Singles", bracketType: 'knockout' })]);
    expect(await screen.findByText("Couldn't load the matches.")).toBeTruthy();
    fireEvent.press(screen.getByText('Retry'));
    expect(await screen.findByText('Your matches')).toBeTruthy();
    expect(screen.queryByText("Couldn't load the matches.")).toBeNull();
    expect(getCategoryBracket).toHaveBeenCalledTimes(2);
  });

  it('a failed tournament load retries through reload', async () => {
    const reload = jest.fn();
    setup([cat({ _id: 'c1', name: "Men's Singles", bracketType: 'knockout' })], [], { reload, error: true });
    fireEvent.press(await screen.findByText('Retry'));
    expect(reload).toHaveBeenCalled();
  });

  const league = [
    m({ _id: 'm1', player1: P('r1', 'Asha'), player2: P('r2', 'Bina'), status: 'completed', winnerId: 'r1', matchConfig: cfg }),
  ];
  const board = { boards: [{ label: null, entries: [{ _id: 'r1', playerName: 'Asha', matchesPlayed: 1, matchesWon: 1, totalPointsScored: 42, rank: 1 }] }] };
  const twoCats = [cat({ _id: 'c1', name: 'Mixed League', bracketType: 'league' }), cat({ _id: 'c2', name: "Men's Singles", bracketType: 'knockout' })];

  it('a leaderboard failure does not follow you to another category', async () => {
    byCat = { c1: league, c2: [fin, sf2, sf1] };
    getCategoryLeaderboard.mockRejectedValue(new Error('net'));
    setup(twoCats);
    expect(await screen.findByText("Couldn't load the matches.")).toBeTruthy();
    fireEvent.press(screen.getByText("Men's Singles"));
    expect(await screen.findByText('Your matches')).toBeTruthy();
    expect(screen.queryByText("Couldn't load the matches.")).toBeNull();
  });

  it('Retry reloads the leaderboard and clears the banner', async () => {
    byCat = { c1: league, c2: [fin, sf2, sf1] };
    getCategoryLeaderboard.mockRejectedValueOnce(new Error('net')).mockResolvedValue(board);
    setup(twoCats);
    fireEvent.press(await screen.findByText('Retry'));
    expect(await screen.findByLabelText('1. Asha (you), played 1, won 1, lost 0, 42 points')).toBeTruthy();
    expect(screen.queryByText("Couldn't load the matches.")).toBeNull();
    expect(getCategoryLeaderboard).toHaveBeenCalledTimes(2);
  });

  it('a ties failure stays with its group', async () => {
    const st = (gid: string, name: string) => ({ group: { _id: gid, groupName: name }, completedTies: 0, totalTies: 1, standings: [] });
    getGroupStandings.mockImplementation(async (_c: string, stage?: number) => (stage ? [] : [st('gA', 'Group A'), st('gB', 'Group B')]));
    getTiesByGroup.mockImplementation(async (g: string) => {
      if (g === 'gA') throw new Error('net');
      return [];
    });
    setup([cat({ _id: 'c1', name: 'Club Team Event', matchType: 'team', bracketType: 'team_league' })]);
    expect(await screen.findByText("Couldn't load the matches.")).toBeTruthy();
    fireEvent.press(screen.getByText('Group B'));
    expect(await screen.findByText('No ties drawn yet.')).toBeTruthy();
    expect(screen.queryByText("Couldn't load the matches.")).toBeNull();
  });
});
