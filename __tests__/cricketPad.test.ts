import type { Scorecard } from '@/api/cricketMatch';
import type { QuickMatch } from '@/api/quickMatch';
import { canUndoBall } from '@/lib/quickCricketView';
import {
  advance, ballFor, crease, EITHER_END_TYPES, EXTRAS_RUNS, FIELDER_TYPES, initialPad,
  nextPick, pickOptions, pickTitle, whoOptions, WICKETS, type PadState,
} from '@/lib/cricketPad';

// Ported from the logic cases of CricketScorePanel, CricketDismissedBatsman,
// CricketExtrasWicket and CricketPanelAffordances. Three batters so a filter
// that drops one still leaves a real choice; two bowlers so figures can differ.
const live = (liveState: Record<string, unknown> | undefined, over: Record<string, unknown> = {}): QuickMatch => ({
  _id: 'm1', hostId: 'host', sport: 'cricket', joinCode: 'ABC123', status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [
      { slotId: 'a1', displayName: 'Kohli' },
      { slotId: 'a2', displayName: 'Rahul' },
      { slotId: 'a3', displayName: 'Gill' },
    ] },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'Bumrah' }, { slotId: 'b2', displayName: 'Shami' }] },
  ],
  createdAt: '2026-09-10T00:00:00.000Z',
  cricketSetup: {
    toss: { winnerTeamId: 's1', decision: 'bat', recorded: true },
    lineupsSet: true,
    side1Lineup: [{ slotId: 'a1', name: 'Kohli' }, { slotId: 'a2', name: 'Rahul' }, { slotId: 'a3', name: 'Gill' }],
    side2Lineup: [{ slotId: 'b1', name: 'Bumrah' }, { slotId: 'b2', name: 'Shami' }],
  },
  liveState,
  ...over,
}) as unknown as QuickMatch;

const midInnings = {
  runs: 42, wickets: 3, completedOvers: 6, ballsInCurrentOver: 2,
  currentInnings: 1, matchStatus: 'innings1',
  battingTeamId: 's1', bowlingTeamId: 's2',
  strikerId: 'a1', nonStrikerId: 'a2', currentBowlerId: 'b1',
};
const firstBall = { matchStatus: 'awaiting_start', currentInnings: 1, runs: 0, wickets: 0, completedOvers: 0, ballsInCurrentOver: 0 };

const pad = (over: Partial<PadState> = {}): PadState => ({ ...initialPad, ...over });
const ids = (opts: { id: string }[]) => opts.map((o) => o.id);

/** Runs a list of actions from a fresh pad; returns the last result and every ball posted. */
const run = (m: QuickMatch, actions: Parameters<typeof advance>[2][], from = initialPad) => {
  let s = from;
  const balls = [];
  let last: ReturnType<typeof advance> = { pad: s };
  for (const a of actions) {
    last = advance(m, s, a);
    s = last.pad;
    if (last.ball) balls.push(last.ball);
  }
  return { pad: s, ball: last.ball, balls };
};

describe('nextPick', () => {
  it('asks striker, then non-striker, then bowler on the first ball', () => {
    const m = live(firstBall);
    expect(nextPick(m, pad())).toBe('striker');
    expect(nextPick(m, pad({ picks: { striker: 'a1' } }))).toBe('nonStriker');
    expect(nextPick(m, pad({ picks: { striker: 'a1', nonStriker: 'a2' } }))).toBe('bowler');
    expect(nextPick(m, pad({ picks: { striker: 'a1', nonStriker: 'a2', bowler: 'b1' } }))).toBeNull();
  });

  it('treats no liveState and the innings break as a first ball too', () => {
    expect(nextPick(live(undefined), pad())).toBe('striker');
    expect(nextPick(live({ ...midInnings, matchStatus: 'innings_break', strikerId: undefined, nonStrikerId: undefined, currentBowlerId: undefined }), pad())).toBe('striker');
  });

  it('needs nobody mid-innings', () => {
    expect(nextPick(live(midInnings), pad())).toBeNull();
  });

  it('asks for a batter after a wicket', () => {
    const m = live({ ...midInnings, nextBatsmanNeeded: true, strikerId: undefined });
    expect(nextPick(m, pad())).toBe('batter');
    expect(nextPick(m, pad({ picks: { batter: 'a3' } }))).toBeNull();
  });

  it('asks for a bowler at the end of an over', () => {
    const m = live({ ...midInnings, nextBowlerNeeded: true });
    expect(nextPick(m, pad())).toBe('bowler');
    expect(nextPick(m, pad({ picks: { bowler: 'b2' } }))).toBeNull();
  });

  it('asks for the batter, then the bowler, when both are needed', () => {
    const m = live({ ...midInnings, nextBatsmanNeeded: true, nextBowlerNeeded: true });
    expect(nextPick(m, pad())).toBe('batter');
    expect(nextPick(m, pad({ picks: { batter: 'a3' } }))).toBe('bowler');
    expect(nextPick(m, pad({ picks: { batter: 'a3', bowler: 'b2' } }))).toBeNull();
  });

  it('asks for both ends when a wicket left both empty, as the old pad did', () => {
    const m = live({ ...midInnings, nextBatsmanNeeded: true, strikerId: undefined, nonStrikerId: undefined });
    expect(nextPick(m, pad())).toBe('batter');
    expect(nextPick(m, pad({ picks: { batter: 'a3' } }))).toBe('nonStriker');
  });
});

describe('pickOptions', () => {
  it('leaves an out batter off the new-batter list, and keeps the other end off it', () => {
    // a1 is out; a2 holds the other end. Only Gill.
    const m = live({ ...midInnings, nextBatsmanNeeded: true, dismissedIds: ['a1'] });
    expect(pickOptions(m, pad(), 'batter')).toEqual([{ id: 'a3', name: 'Gill' }]);
  });

  it('leaves an out batter off the list when both ends are empty', () => {
    const m = live({ ...midInnings, strikerId: undefined, nonStrikerId: undefined, nextBatsmanNeeded: true, dismissedIds: ['a2'] });
    expect(ids(pickOptions(m, pad(), 'batter'))).toEqual(['a1', 'a3']);
    // Then the other end: not the one just picked, not the out one.
    expect(ids(pickOptions(m, pad({ picks: { batter: 'a1' } }), 'nonStriker'))).toEqual(['a3']);
  });

  it('offers everyone but the other end when the match carries no dismissed list', () => {
    // A match in flight before the field existed must keep scoring.
    const m = live({ ...midInnings, nextBatsmanNeeded: true });
    expect(ids(pickOptions(m, pad(), 'batter'))).toEqual(['a1', 'a3']);
  });

  it('keeps the surviving striker off the list when the non-striker end was emptied', () => {
    const m = live({ ...midInnings, nextBatsmanNeeded: true, nonStrikerId: undefined });
    expect(ids(pickOptions(m, pad(), 'batter'))).toEqual(['a2', 'a3']);
  });

  it('keeps the chosen striker off the opening non-striker list', () => {
    const m = live(firstBall);
    expect(ids(pickOptions(m, pad(), 'striker'))).toEqual(['a1', 'a2', 'a3']);
    expect(ids(pickOptions(m, pad({ picks: { striker: 'a1' } }), 'nonStriker'))).toEqual(['a2', 'a3']);
  });

  it('offers the bowling side, with figures from the current innings or "yet to bowl"', () => {
    const card = (inningsNumber: 1 | 2, bowlingCard: unknown[]) => ({ inningsNumber, bowlingCard });
    const scorecard = {
      innings1: card(1, [{ registrationId: 'b1', name: 'Bumrah', overs: '2', maidens: 0, runs: 14, wickets: 1, economy: 7 }]),
      innings2: card(2, [{ registrationId: 'b2', name: 'Shami', overs: '1.3', maidens: 1, runs: 4, wickets: 2, economy: 2.7 }]),
    } as unknown as Scorecard;
    const m = live({ ...midInnings, nextBowlerNeeded: true });
    expect(pickOptions(m, pad(), 'bowler', scorecard)).toEqual([
      { id: 'b1', name: 'Bumrah', figures: '2-0-14-1' },
      { id: 'b2', name: 'Shami', figures: 'yet to bowl' },
    ]);
    const second = live({ ...midInnings, currentInnings: 2, nextBowlerNeeded: true });
    expect(pickOptions(second, pad(), 'bowler', scorecard)).toEqual([
      { id: 'b1', name: 'Bumrah', figures: 'yet to bowl' },
      { id: 'b2', name: 'Shami', figures: '1.3-1-4-2' },
    ]);
  });

  it('gives no figures without a scorecard', () => {
    expect(pickOptions(live(midInnings), pad(), 'bowler', null)).toEqual([
      { id: 'b1', name: 'Bumrah' }, { id: 'b2', name: 'Shami' },
    ]);
  });

  it('offers only the bowling side as fielders', () => {
    expect(ids(pickOptions(live(midInnings), pad({ step: 'fielder', wicketType: 'caught' }), 'fielder'))).toEqual(['b1', 'b2']);
  });
});

describe('pickTitle', () => {
  const m = live(midInnings);
  it('names each pick per the spec', () => {
    expect(pickTitle(m, 'striker')).toBe('Opening batters');
    expect(pickTitle(m, 'nonStriker')).toBe('Opening batters');
    expect(pickTitle(m, 'batter')).toBe('Next batter');
    expect(pickTitle(m, 'bowler')).toBe("Over 7 · who's bowling?");
    expect(pickTitle(live(undefined), 'bowler')).toBe("Over 1 · who's bowling?");
    expect(pickTitle(m, 'fielder', 'caught')).toBe('Caught by');
    expect(pickTitle(m, 'fielder', 'run_out')).toBe('Run out by');
    expect(pickTitle(m, 'fielder', 'stumped')).toBe('Stumped by');
  });
});

describe('ballFor', () => {
  it('posts a plain 4 with the ids in liveState', () => {
    expect(ballFor(live(midInnings), pad(), { runs: 4 })).toEqual({
      batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 4,
    });
  });

  it('posts the first ball with the picked ids', () => {
    const s = pad({ picks: { striker: 'a2', nonStriker: 'a3', bowler: 'b2' } });
    expect(ballFor(live(firstBall), s, { runs: 1 })).toEqual({
      batsmanOnStrikeId: 'a2', nonStrikerId: 'a3', bowlerId: 'b2', runs: 1,
    });
  });

  it('posts the chosen batter and bowler rather than the stale ids', () => {
    const m = live({ ...midInnings, nextBatsmanNeeded: true, nextBowlerNeeded: true, strikerId: 'stale-striker', currentBowlerId: 'stale-bowler' });
    expect(ballFor(m, pad({ picks: { batter: 'a3', bowler: 'b2' } }), { runs: 4 })).toEqual({
      batsmanOnStrikeId: 'a3', nonStrikerId: 'a2', bowlerId: 'b2', runs: 4,
    });
  });

  it('puts a new batter at the end the engine emptied', () => {
    const nonStrikerOut = live({ ...midInnings, nextBatsmanNeeded: true, nonStrikerId: undefined });
    expect(ballFor(nonStrikerOut, pad({ picks: { batter: 'a3' } }), { runs: 4 })).toEqual({
      batsmanOnStrikeId: 'a1', nonStrikerId: 'a3', bowlerId: 'b1', runs: 4,
    });
    // A run completed before the run-out: the survivor crossed, so the striker end is empty.
    const crossed = live({ ...midInnings, nextBatsmanNeeded: true, strikerId: undefined, nonStrikerId: 'a1' });
    expect(crease(crossed, pad({ picks: { batter: 'a3' } }))).toEqual({ striker: 'a3', nonStriker: 'a1', bowler: 'b1' });
  });
});

describe('advance', () => {
  const m = live(midInnings);

  it('records a run key at once and starts the next ball afresh', () => {
    const s = pad({ picks: { bowler: 'b2' } });
    const r = advance(live({ ...midInnings, nextBowlerNeeded: true }), s, { type: 'runs', runs: 4 });
    expect(r.ball).toEqual({ batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b2', runs: 4 });
    expect(r.pad).toEqual(initialPad);
  });

  it('records an extra alone when "wicket too" is off', () => {
    const r = run(m, [{ type: 'open', step: 'extras' }, { type: 'extras', extras: 'leg_bye', runs: 1 }]);
    expect(r.ball).toEqual({ batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 0, extrasType: 'leg_bye', extrasRuns: 1 });
  });

  it('carries the extra into the wicket entry when "wicket too" is on', () => {
    const r = run(m, [
      { type: 'open', step: 'extras' }, { type: 'alsoWicket' },
      { type: 'extras', extras: 'wide', runs: 2 },
    ]);
    expect(r.ball).toBeUndefined();
    expect(r.pad).toMatchObject({ step: 'wicket', extras: { type: 'wide', runs: 2 } });

    const done = advance(m, r.pad, { type: 'wicket', wicket: 'bowled' });
    expect(done.ball).toEqual({
      batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 0,
      extrasType: 'wide', extrasRuns: 2, wicketType: 'bowled', dismissedPlayerId: 'a1',
    });
    // Forgotten once recorded, so the next wicket does not carry it.
    expect(done.pad).toEqual(initialPad);
    expect(advance(m, done.pad, { type: 'wicket', wicket: 'bowled' }).ball).not.toHaveProperty('extrasType');
  });

  it('carries the extra through a run out, asking who is out and then the fielder', () => {
    const r = run(m, [
      { type: 'open', step: 'extras' }, { type: 'alsoWicket' },
      { type: 'extras', extras: 'bye', runs: 1 },
      { type: 'wicket', wicket: 'run_out' },
      { type: 'who', id: 'a2' },
      { type: 'pick', role: 'fielder', id: 'b2' },
    ]);
    expect(r.balls).toHaveLength(1);
    expect(r.ball).toEqual({
      batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 0,
      extrasType: 'bye', extrasRuns: 1, wicketType: 'run_out', dismissedPlayerId: 'a2', fielderId: 'b2',
    });
  });

  it('asks which end on a run out, then the fielder', () => {
    let r = advance(m, pad({ step: 'wicket' }), { type: 'wicket', wicket: 'run_out' });
    expect(r.pad).toMatchObject({ step: 'who', wicketType: 'run_out' });
    expect(whoOptions(m, r.pad)).toEqual([{ id: 'a1', name: 'Kohli' }, { id: 'a2', name: 'Rahul' }]);
    r = advance(m, r.pad, { type: 'who', id: 'a2' });
    expect(r.pad).toMatchObject({ step: 'fielder', dismissed: 'a2' });
    expect(advance(m, r.pad, { type: 'pick', role: 'fielder', id: 'b1' }).ball)
      .toMatchObject({ wicketType: 'run_out', dismissedPlayerId: 'a2', fielderId: 'b1' });
  });

  it('records retired hurt at the chosen end with no fielder step', () => {
    const r = run(m, [{ type: 'open', step: 'wicket' }, { type: 'wicket', wicket: 'retired_hurt' }, { type: 'who', id: 'a2' }]);
    expect(r.ball).toEqual({ batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 0, wicketType: 'retired_hurt', dismissedPlayerId: 'a2' });
  });

  it('skips "who" on a catch and asks the fielder, dismissing the striker', () => {
    let r = advance(m, pad({ step: 'wicket' }), { type: 'wicket', wicket: 'caught' });
    expect(r.pad).toMatchObject({ step: 'fielder', wicketType: 'caught' });
    r = advance(m, r.pad, { type: 'pick', role: 'fielder', id: 'b1' });
    expect(r.ball).toEqual({ batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 0, wicketType: 'caught', dismissedPlayerId: 'a1', fielderId: 'b1' });
    expect(advance(m, pad({ step: 'wicket' }), { type: 'wicket', wicket: 'stumped' }).pad.step).toBe('fielder');
  });

  it.each(['bowled', 'lbw', 'hit_wicket'] as const)('records %s at once, dismissing the striker', (wicket) => {
    const r = advance(m, pad({ step: 'wicket' }), { type: 'wicket', wicket });
    expect(r.ball).toEqual({ batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 0, wicketType: wicket, dismissedPlayerId: 'a1' });
    expect(r.pad).toEqual(initialPad);
  });

  it('stores picks, staying on the pick sheet until nobody is needed', () => {
    const first = live(firstBall);
    const r = run(first, [
      { type: 'open', step: 'pick' },
      { type: 'pick', role: 'striker', id: 'a1' },
      { type: 'pick', role: 'nonStriker', id: 'a2' },
    ]);
    expect(r.pad).toMatchObject({ step: 'pick', picks: { striker: 'a1', nonStriker: 'a2' } });
    const done = advance(first, r.pad, { type: 'pick', role: 'bowler', id: 'b1' });
    expect(done.pad).toMatchObject({ step: 'keys', picks: { striker: 'a1', nonStriker: 'a2', bowler: 'b1' } });
    expect(done.ball).toBeUndefined();
  });

  it('never builds a ball with a missing id: it asks for the player instead', () => {
    // The old pad refused to post without all three ids; a key reached while a
    // player is still needed must not post a blank one.
    const r = advance(live({ ...midInnings, nextBowlerNeeded: true }), pad(), { type: 'runs', runs: 1 });
    expect(r).toEqual({ pad: pad({ step: 'pick' }) });
    expect(advance(live(firstBall), pad({ step: 'wicket' }), { type: 'wicket', wicket: 'bowled' }).ball).toBeUndefined();
    const fielder = pad({ step: 'fielder', wicketType: 'caught' });
    expect(advance(live({ ...midInnings, nextBatsmanNeeded: true, strikerId: undefined }), fielder, { type: 'pick', role: 'fielder', id: 'b1' }))
      .toEqual({ pad: { ...fielder, step: 'pick' } });
  });

  it('keeps picks when a sheet is closed', () => {
    const s = pad({ step: 'who', wicketType: 'run_out', picks: { bowler: 'b2' } });
    expect(advance(m, s, { type: 'close' }).pad).toEqual(pad({ picks: { bowler: 'b2' } }));
  });

  describe('back goes one step', () => {
    it('from extras or a plain wicket sheet to the keys', () => {
      expect(advance(m, pad({ step: 'extras', alsoWicket: true }), { type: 'back' }).pad).toEqual(initialPad);
      expect(advance(m, pad({ step: 'wicket' }), { type: 'back' }).pad).toEqual(initialPad);
    });

    it('from who is out to the wicket types', () => {
      expect(advance(m, pad({ step: 'who', wicketType: 'run_out' }), { type: 'back' }).pad).toMatchObject({ step: 'wicket', wicketType: undefined });
    });

    it('from the fielder to who is out on a run out, else to the wicket types', () => {
      expect(advance(m, pad({ step: 'fielder', wicketType: 'run_out', dismissed: 'a2' }), { type: 'back' }).pad)
        .toMatchObject({ step: 'who', wicketType: 'run_out', dismissed: undefined });
      expect(advance(m, pad({ step: 'fielder', wicketType: 'caught' }), { type: 'back' }).pad)
        .toMatchObject({ step: 'wicket', wicketType: undefined });
    });

    it('from a wicket armed in the extras flow to the extras sheet, keeping the extra chosen', () => {
      const s = pad({ step: 'wicket', alsoWicket: true, extras: { type: 'wide', runs: 2 } });
      expect(advance(m, s, { type: 'back' }).pad).toEqual({ ...s, step: 'extras' });
    });
  });
});

describe('constants and undo', () => {
  it('lists the seven wicket types with the preview hints', () => {
    expect(WICKETS.map((w) => [w.label, w.hint])).toEqual([
      ['Bowled', ''], ['Caught', 'then fielder'], ['LBW', ''], ['Run out', 'then batter'],
      ['Stumped', 'then keeper'], ['Hit wicket', ''], ['Retired hurt', 'then batter'],
    ]);
    expect(FIELDER_TYPES).toEqual(['caught', 'run_out', 'stumped']);
    expect(EITHER_END_TYPES).toEqual(['run_out', 'retired_hurt']);
  });

  it('never offers 0 runs for an extra', () => {
    expect(EXTRAS_RUNS).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('offers undo once play has started, and not before or after a cancel', () => {
    expect(canUndoBall(live(midInnings))).toBe(true);
    expect(canUndoBall(live({ ...midInnings, matchStatus: undefined }))).toBe(false);
    expect(canUndoBall(live(firstBall))).toBe(false);
    expect(canUndoBall(live(midInnings, { status: 'cancelled' }))).toBe(false);
  });
});
