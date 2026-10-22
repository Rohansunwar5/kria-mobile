import { cricketBoard, fromQuick, fromTournament, BoardInput } from '@/lib/cricketBoard';
import type { LiveState, Scorecard, InningsScorecard, CricketMatch } from '@/api/cricketMatch';
import type { QuickMatch } from '@/api/quickMatch';

const A = { id: 'tA', name: 'Rawnat' };
const B = { id: 'tB', name: 'Hegde XI' };

const ball = (label: string, runs = 0, isWicket = false) => ({ label, runs, isWicket });
const over = (overNumber: number, balls: ReturnType<typeof ball>[]) => ({
  overNumber,
  runs: balls.reduce((s, b) => s + b.runs, 0),
  wickets: balls.filter((b) => b.isWicket).length,
  balls,
});

const inn1: InningsScorecard = {
  inningsNumber: 1, battingTeamId: 'tB', battingTeamName: 'Hegde XI', bowlingTeamId: 'tA', bowlingTeamName: 'Rawnat',
  totals: { runs: 118, wickets: 6, overs: '10.0', extras: { wides: 5, noBalls: 1, byes: 0, legByes: 1, total: 7 } },
  battingCard: [], bowlingCard: [], currentPartnership: null, fallOfWickets: [], partnerships: [],
  oversTimeline: [over(1, [ball('4', 4), ball('0')]), over(2, [ball('6', 6), ball('W', 0, true)])],
};
const inn2: InningsScorecard = {
  inningsNumber: 2, battingTeamId: 'tA', battingTeamName: 'Rawnat', bowlingTeamId: 'tB', bowlingTeamName: 'Hegde XI',
  totals: { runs: 87, wickets: 3, overs: '6.2', extras: { wides: 4, noBalls: 0, byes: 0, legByes: 2, total: 6 } },
  battingCard: [
    { registrationId: 'p1', name: 'Kulkarni', runs: 22, ballsFaced: 15, fours: 2, sixes: 1, strikeRate: 0, dismissal: { type: 'caught', fielderName: 'Hegde', bowlerName: 'Pillai' } },
    { registrationId: 'p2', name: 'Kumar', runs: 31, ballsFaced: 20, fours: 3, sixes: 0, strikeRate: 0, dismissal: { type: 'retired_hurt' } },
    { registrationId: 'p3', name: 'Gowda', runs: 12, ballsFaced: 9, fours: 1, sixes: 0, strikeRate: 0 },
    { registrationId: 'p4', name: 'Nair', runs: 5, ballsFaced: 4, fours: 0, sixes: 0, strikeRate: 0 },
  ],
  bowlingCard: [{ registrationId: 'b1', name: 'Pillai', overs: '2.0', maidens: 0, runs: 15, wickets: 1, economy: 7.5 }],
  oversTimeline: [
    over(1, [ball('0'), ball('1', 1)]),
    over(2, [ball('1', 1), ball('6', 6), ball('0'), ball('2', 2), ball('W', 0, true), ball('1', 1)]),
    over(3, [ball('4', 4), ball('wd+1', 1), ball('1', 1)]),
  ],
  currentPartnership: { strikerId: 'p3', strikerName: 'Gowda', nonStrikerId: 'p4', nonStrikerName: 'Nair', runs: 18, balls: 8 },
  fallOfWickets: [
    { wicketNumber: 1, score: 22, overs: '1.5', batterId: 'p1', batterName: 'Kulkarni', dismissalLine: 'c Hegde b Pillai', partnershipRuns: 22, partnershipBalls: 11 },
    { wicketNumber: 2, score: 58, overs: '4.6', batterId: 'p2', batterName: 'Kumar', dismissalLine: 'b X', partnershipRuns: 36, partnershipBalls: 20 },
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
const base: BoardInput = {
  sides: [A, B], live: live2, scorecard: sc, maxOvers: 10, completed: false, result: null,
  toss: { winnerId: 'tA', decision: 'bowl' }, squads: [['a1'], ['b1']],
};
const view = (o: Partial<BoardInput> = {}) => cricketBoard({ ...base, ...o });

describe('hero', () => {
  it('second innings chase', () => {
    const v = view();
    expect(v.hero.line).toEqual({ kind: 'chase', need: 32, balls: 22, req: '8.73', cur: '13.74' });
    expect(v.pill).toBe('2nd innings');
    expect(v.pillLive).toBe(true);
    expect(v.hero.rows[0]).toEqual({ side: A, score: '87/3', big: true });
    expect(v.hero.overs).toEqual(['(6.2)', '(10.0)']);
    expect(v.hero.rows[1]).toEqual({ side: B, score: '118/6', big: false });
    expect(v.defaultTab).toBe('live');
  });
  it('first innings', () => {
    const v = view({ live: { ...live2, currentInnings: 1, target: undefined, innings1Summary: undefined, matchStatus: 'innings1', battingTeamId: 'tB' } });
    expect(v.pill).toBe('1st innings');
    expect(v.hero.rows[0].score).toBeNull();
    expect(v.hero.line).toEqual({ kind: 'text', text: 'Rawnat yet to bat' });
  });
  it('innings break', () => {
    const v = view({ live: { ...live2, runs: 0, wickets: 0, completedOvers: 0, ballsInCurrentOver: 0, matchStatus: 'innings_break' } });
    expect(v.pill).toBe('Innings break');
    expect(v.hero.line).toEqual({ kind: 'text', text: 'Innings break · Target 119' });
  });
  it('completed', () => {
    const v = view({ completed: true, result: 'Rawnat won by 7 wickets', live: { ...live2, matchStatus: 'completed' } });
    expect(v.pill).toBe('Completed');
    expect(v.pillLive).toBe(false);
    expect(v.hero.line).toEqual({ kind: 'text', text: 'Rawnat won by 7 wickets' });
    expect(v.defaultTab).toBe('card');
  });
  it('completed with no live state reads the scorecard', () => {
    const v = view({ live: null, completed: true, result: 'r' });
    expect(v.hero.rows).toEqual([{ side: A, score: '87/3', big: true }, { side: B, score: '118/6', big: false }]);
    expect(v.hero.overs).toEqual(['(6.2)', '(10.0)']);
  });
  it('chase never goes negative', () => {
    expect(view({ live: { ...live2, runs: 120 } }).hero.line).toBeNull();
    expect(view({ live: { ...live2, runs: 120 }, result: 'x', completed: true }).hero.line).toEqual({ kind: 'text', text: 'x' });
  });
  it('no balls left with runs still needed', () => {
    expect(view({ live: { ...live2, completedOvers: 10, ballsInCurrentOver: 0 } }).hero.line).toBeNull();
  });
});

describe('live tab', () => {
  const l = view().live!;
  it('batters, bowler', () => {
    expect(l.batters[0]).toEqual({ name: 'Gowda', striker: true, r: 12, b: 9, f: 1, s: 0, sr: '133.3' });
    expect(l.batters[1].striker).toBe(false);
    expect(l.bowler).toEqual({ name: 'Pillai', o: '2.0', m: 0, r: 15, w: 1, e: '7.50' });
    expect(l.partnership).toBe('Partnership 18 (8)');
  });
  it('overs', () => {
    expect(l.thisOver).toEqual({ chips: [{ label: '4', kind: 'boundary' }, { label: 'wd+1', kind: 'extra' }, { label: '1', kind: 'run' }], empty: 3, runs: 6 });
    expect(l.lastOver).toBe('1 6 0 2 W 1 · 10 runs');
    expect(l.toss).toBe('Rawnat won the toss and chose to bowl');
  });
  it('W is a wicket chip', () => {
    const v = view({ scorecard: { innings1: inn1, innings2: { ...inn2, oversTimeline: inn2.oversTimeline.slice(0, 2) } } });
    expect(v.live!.thisOver!.chips[4]).toEqual({ label: 'W', kind: 'wicket' });
  });
  it('lastOver null with one over', () => {
    expect(view({ scorecard: { innings1: inn1, innings2: { ...inn2, oversTimeline: [inn2.oversTimeline[0]] } } }).live!.lastOver).toBeNull();
  });
});

describe('scorecard tab', () => {
  const v = view();
  it('batting rows', () => {
    const b = v.innings[1].batting;
    expect(b[0]).toMatchObject({ how: 'c Hegde b Pillai', notOut: false, sr: '146.7' });
    expect(b[1]).toMatchObject({ how: 'retired hurt', notOut: false });
    expect(b[2]).toMatchObject({ how: 'not out', notOut: true });
  });
  it('totals, fow, labels', () => {
    expect(v.innings[1].extras).toBe('Extras 6 (wd 4, lb 2)');
    expect(v.innings[1].total).toBe('87/3 (6.2)');
    expect(v.innings[1].fow).toBe('1-22 Kulkarni (1.5) · 2-58 Kumar (4.6)');
    expect(v.innings[1].label).toBe('Rawnat 87/3');
    expect(v.innings[0].label).toBe('Hegde XI 118/6');
    expect(v.innings[1].bowling[0]).toEqual({ name: 'Pillai', o: '2.0', r: 15, w: 1, e: '7.50' });
  });
  it('skips null innings', () => {
    expect(view({ scorecard: { innings1: inn1, innings2: null } }).innings).toHaveLength(1);
  });
});

describe('overs tab', () => {
  const o = view().overs;
  it('paired bars', () => {
    expect(o.max).toBe(10);
    expect(o.bars).toHaveLength(10);
    expect(view({ maxOvers: 20 }).overs.max).toBe(10);
    expect(view({ maxOvers: 20 }).overs.bars).toHaveLength(20);
    expect(o.bars[0]).toEqual({ n: 1, a: 4, b: 1, wicketB: false, current: false });
    expect(o.bars[1]).toMatchObject({ a: 6, b: 10, wicketB: true });
    expect(o.bars[2]).toMatchObject({ b: 6, current: true });
    expect(o.bars[5]).toMatchObject({ a: 0, b: null });
  });
  it('list newest first', () => {
    expect(o.list.map((x) => `${x.innings}:${x.n}`)).toEqual(['2:3', '2:2', '2:1', '1:2', '1:1']);
    expect(o.list[0].runs).toBe(6);
    expect(view({ live: { ...live2, currentInnings: 1 } }).overs.list[0].innings).toBe(1);
  });
});

describe('waiting', () => {
  it('no toss', () => {
    const v = view({ live: null, toss: null });
    expect(v.waiting).toEqual({ line: 'Waiting for the toss', toss: null, squads: [['a1'], ['b1']] });
    expect(v.pill).toBe('Not started');
    expect(v.live).toBeNull();
  });
  it('toss set', () => {
    expect(view({ live: { ...live2, matchStatus: 'awaiting_start' } }).waiting!.line).toBe('Waiting for the first ball');
    expect(view({ live: { ...live2, matchStatus: 'awaiting_start' } }).waiting!.toss).toBe('Rawnat won the toss and chose to bowl');
  });
});

describe('adapters', () => {
  const tm = {
    _id: 'm1', tournamentId: 't', status: 'live',
    teams: { team1Id: 'tA', team2Id: 'tB', team1Name: 'Rawnat', team2Name: 'Hegde XI' },
    matchConfig: { maxOvers: 10 },
    cricketSetup: {
      toss: { winnerTeamId: 'tA', decision: 'bowl', recorded: true },
      team1Lineup: { teamId: 'tA', lineupSet: true, reserves: [], startingXI: [{ registrationId: 'r1', name: 'a1' }] },
      team2Lineup: { teamId: 'tB', lineupSet: true, reserves: [], startingXI: [{ registrationId: 'r2', name: 'b1' }] },
    },
  } as CricketMatch;
  const qm = {
    _id: 'q', sport: 'cricket', status: 'live',
    sides: [
      { sideId: 'tA', name: 'Rawnat', slots: [{ slotId: 's1', displayName: 'a1' }] },
      { sideId: 'tB', name: 'Hegde XI', slots: [{ slotId: 's2', displayName: 'b1' }] },
    ],
    matchConfig: { maxOvers: 10 },
    cricketSetup: { toss: { winnerTeamId: 'tA', decision: 'bowl', recorded: true }, lineupsSet: true, side1Lineup: [], side2Lineup: [] },
    liveState: live2,
  } as unknown as QuickMatch;

  it('tournament', () => {
    const i = fromTournament(tm, live2, sc, { tA: { name: 'Rawnat', logo: 'x.png' } });
    expect(i.sides[0]).toEqual({ id: 'tA', name: 'Rawnat', crest: 'x.png' });
    expect(i.maxOvers).toBe(10);
    expect(i.squads).toEqual([['a1'], ['b1']]);
    expect(i.result).toBeNull();
    expect(fromTournament({ ...tm, matchConfig: undefined }, null, null, {}, 5).maxOvers).toBe(5);
    expect(fromTournament({ ...tm, matchConfig: undefined }, null, null, {}).maxOvers).toBe(20);
    const done = { ...tm, status: 'completed', winnerId: 'tA', result: { marginOfVictory: 'by 7 wickets' } };
    expect(fromTournament(done, live2, sc, {}).result).toBe('Rawnat won by 7 wickets');
    expect(fromTournament({ ...done, winnerId: undefined, result: { marginOfVictory: 'match tied' } }, live2, sc, {}).result).toBe('Match tied');
  });
  it('quick', () => {
    const i = fromQuick(qm, sc);
    expect(i.sides.map((s) => s.id)).toEqual(['tA', 'tB']);
    expect(i.squads).toEqual([['a1'], ['b1']]);
    expect(i.result).toBeNull();
    expect(fromQuick({ ...qm, status: 'completed', outcome: 'side1' }, sc).result).toBe('Rawnat won');
    expect(fromQuick({ ...qm, status: 'completed', outcome: 'tied' }, sc).result).toBe('Match tied');
    expect(fromQuick({ ...qm, status: 'completed', outcome: 'tied', tieWinnerSideId: 'tB' }, sc).result).toBe('Match tied · Hegde XI went through');
  });
  it('both give the same view', () => {
    const a = cricketBoard(fromTournament(tm, live2, sc, {}));
    const b = cricketBoard(fromQuick(qm, sc));
    expect(b).toEqual(a);
  });
});
