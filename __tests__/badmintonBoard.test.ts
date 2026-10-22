import { badmintonBoard, feedRound, parseScoreline, rallyConfig, roundTitle, wouldWin } from '@/lib/badmintonBoard';
import type { BadmintonMatch } from '@/api/badmintonMatch';

const c = { bestOf: 3, pointsToWin: 21, cap: 30 };
const g = (n: number, a: number, b: number, w?: string) => ({ gameNumber: n, team1Score: a, team2Score: b, winnerId: w });
const mk = (gameScores: BadmintonMatch['gameScores'], extra: Partial<BadmintonMatch> = {}): BadmintonMatch => ({
  _id: 'm', tournamentId: 't', categoryId: 'c', competitorType: 'player', bracketRound: 'Final', matchNumber: 1,
  player1: { registrationId: 'r1', name: 'Asha Kulkarni' }, player2: { registrationId: 'r2', name: 'Ben Rao' },
  status: 'in_progress', gameScores, ...extra,
});

describe('rallyConfig / wouldWin', () => {
  it('defaults and overrides', () => {
    expect(rallyConfig({})).toEqual(c);
    expect(rallyConfig({ matchConfig: { bestOf: 5, pointsToWin: 11 } })).toEqual({ bestOf: 5, pointsToWin: 11, cap: 30 });
  });
  it('rule', () => {
    expect(wouldWin(20, 18, c)).toBe(true);
    expect(wouldWin(20, 19, c)).toBe(true);
    expect(wouldWin(20, 20, c)).toBe(false);
    expect(wouldWin(21, 20, c)).toBe(true);
    expect(wouldWin(28, 28, c)).toBe(false);
    expect(wouldWin(29, 29, c)).toBe(true);
    const s = { ...c, pointsToWin: 11 };
    expect(wouldWin(10, 8, s)).toBe(true);
    expect(wouldWin(10, 10, s)).toBe(false);
  });
});

describe('badmintonBoard', () => {
  it('game point / match point / none', () => {
    expect(badmintonBoard(mk([g(1, 20, 19)])).chip).toBe('Game point · Kulkarni');
    expect(badmintonBoard(mk([g(1, 21, 10, 'r1'), g(2, 20, 15)])).chip).toBe('Match point · Kulkarni');
    expect(badmintonBoard(mk([g(1, 20, 20)])).chip).toBeNull();
  });
  it('29-29', () => {
    expect(badmintonBoard(mk([g(1, 29, 29)])).chip).toBe('Next point wins the game');
    expect(badmintonBoard(mk([g(1, 21, 5, 'r1'), g(2, 29, 29)])).chip).toBe('Next point wins the match');
  });
  it('best of 1', () => {
    expect(badmintonBoard(mk([g(1, 20, 10)], { matchConfig: { bestOf: 1 } })).chip).toBe('Match point · Kulkarni');
  });
  it('completed', () => {
    const v = badmintonBoard(mk([g(1, 21, 10, 'r1'), g(2, 15, 21, 'r2'), g(3, 21, 18, 'r1')], { status: 'completed', winnerId: 'r1' }));
    expect(v.chip).toBeNull();
    expect(v.over).toBe(true);
    expect(v.rows.map((r) => r.points)).toEqual([null, null]);
    expect(v.top).toBe('Kulkarni won 2–1');
    expect(v.rows[1].lost).toBe(true);
    expect(v.rows[0].lost).toBe(false);
  });
  it('mid-match', () => {
    const v = badmintonBoard(mk([g(1, 18, 21, 'r2'), g(2, 5, 3)]));
    expect(v.top).toBe('Game 2 · Games 0–1');
    expect(v.format).toBe('Best of 3 · to 21');
    expect(v.rows[0].done).toEqual([{ v: 18, won: false }]);
    expect(v.rows[1].done).toEqual([{ v: 21, won: true }]);
    expect(v.rows[0].leading).toBe(true);
    expect(v.games[1]).toMatchObject({ n: 2, live: true, winner: 'In play' });
    expect(v.games[0].winner).toBe('Rao');
  });
  it('scheduled', () => {
    const v = badmintonBoard(mk([], { status: 'scheduled' }));
    expect(v.top).toBe('Game 1 · Games 0–0');
    expect(v.chip).toBeNull();
  });
  it('team match', () => {
    const v = badmintonBoard(mk([g(1, 21, 10, 'a'), g(2, 3, 2)], {
      player1: undefined, player2: undefined, competitorType: 'team',
      teams: { team1Id: 'a', team2Id: 'b', team1Name: 'Red Lions', team2Name: 'Blue Hawks' },
    }));
    expect(v.rows[0].name).toBe('Red Lions');
    expect(v.top).toBe('Game 2 · Games 1–0');
  });
});

describe('roundTitle / feedRound / parseScoreline', () => {
  it('roundTitle', () => {
    expect(roundTitle({ bracketRound: 'Quarter-Final', positionInRound: 3 })).toBe('Quarter-final 4');
    expect(roundTitle({ bracketRound: 'Final' })).toBe('Final');
    expect(roundTitle({ bracketRound: 'League' })).toBe('League');
    const teams = { team1Name: 'A', team2Name: 'B' };
    expect(roundTitle({ bracketRound: 'S1-T3', tieId: 't', teams, slotLabel: "Men's singles 1" })).toBe("A vs B · Men's singles 1");
    expect(roundTitle({ bracketRound: 'S1-T3', tieId: 't', teams, subMatchSlotNumber: 2 })).toBe('A vs B · Match 2');
  });
  it('feedRound', () => {
    expect(feedRound('Semi-Final')).toBe('Semi-final');
    expect(feedRound('S1-GroupA-T3')).toBe('Team league');
    expect(feedRound(undefined)).toBeUndefined();
  });
  it('parseScoreline', () => {
    expect(parseScoreline('21-15, 4-3')).toEqual([{ a: 21, b: 15 }, { a: 4, b: 3 }]);
    expect(parseScoreline('')).toEqual([]);
    expect(parseScoreline('abc')).toEqual([]);
  });
});
