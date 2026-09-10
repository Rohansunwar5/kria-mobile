import {
  battingSideId,
  bowlingSideId,
  canUndoBall,
  chaseLine,
  cricketOutcomeLabel,
  isFirstBallOfInnings,
  lineupFromSlots,
  oversText,
  scoreLine,
  setupStage,
  whoIsNeeded,
} from '@/lib/quickCricketView';
import type { QuickMatch } from '@/api/quickMatch';

const base = (over: Record<string, unknown> = {}): QuickMatch => ({
  _id: 'm1',
  hostId: 'h1',
  sport: 'cricket',
  joinCode: 'ABC123',
  status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', displayName: 'A1' }] },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'B1' }] },
  ],
  createdAt: '2026-09-10T00:00:00.000Z',
  cricketSetup: { toss: { recorded: false }, lineupsSet: false, side1Lineup: [], side2Lineup: [] },
  ...over,
}) as QuickMatch;

const tossed = (over: Record<string, unknown> = {}) => base({
  cricketSetup: {
    toss: { winnerTeamId: 's1', decision: 'bat', recorded: true },
    lineupsSet: false, side1Lineup: [], side2Lineup: [],
  },
  ...over,
});

const ready = (liveState?: Record<string, unknown>) => base({
  cricketSetup: {
    toss: { winnerTeamId: 's1', decision: 'bat', recorded: true },
    lineupsSet: true,
    side1Lineup: [{ slotId: 'a1', name: 'A1' }],
    side2Lineup: [{ slotId: 'b1', name: 'B1' }],
  },
  ...(liveState ? { liveState } : {}),
});

describe('setupStage', () => {
  it('needs the toss first', () => {
    expect(setupStage(base())).toBe('needs_toss');
  });

  it('needs lineups once the toss is recorded', () => {
    expect(setupStage(tossed())).toBe('needs_lineups');
  });

  it('is ready once both lineups are set', () => {
    expect(setupStage(ready())).toBe('ready');
  });
});

describe('oversText', () => {
  it('joins completed overs and balls in the current over', () => {
    expect(oversText(6, 2)).toBe('6.2');
  });

  it('renders a completed over as x.0, not bare x', () => {
    expect(oversText(6, 0)).toBe('6.0');
  });

  it('treats absent values as zero', () => {
    expect(oversText(undefined, undefined)).toBe('0.0');
  });
});

describe('scoreLine', () => {
  it('is null before the first ball', () => {
    expect(scoreLine(ready())).toBeNull();
  });

  it('renders runs, wickets and overs', () => {
    expect(scoreLine(ready({ runs: 42, wickets: 3, completedOvers: 6, ballsInCurrentOver: 2 })))
      .toBe('42/3 (6.2)');
  });
});

describe('chaseLine', () => {
  it('is null during the first innings', () => {
    expect(chaseLine(ready({ currentInnings: 1, runs: 10, target: undefined }))).toBeNull();
  });

  it('states runs still required in the second innings', () => {
    expect(chaseLine(ready({ currentInnings: 2, runs: 40, target: 61 })))
      .toBe('Needs 21 to win');
  });

  it('does not go negative once the target is passed', () => {
    expect(chaseLine(ready({ currentInnings: 2, runs: 61, target: 61 })))
      .toBe('Needs 0 to win');
  });
});

describe('whoIsNeeded', () => {
  it('is null when the engine wants nothing', () => {
    expect(whoIsNeeded(ready({ runs: 1 }))).toBeNull();
  });

  it('reports a batsman', () => {
    expect(whoIsNeeded(ready({ nextBatsmanNeeded: true }))).toBe('batsman');
  });

  it('reports a bowler', () => {
    expect(whoIsNeeded(ready({ nextBowlerNeeded: true }))).toBe('bowler');
  });

  // The end of an over that also took a wicket. Both must be collected, or
  // the next ball is posted with a stale id.
  it('reports both when the engine wants both', () => {
    expect(whoIsNeeded(ready({ nextBatsmanNeeded: true, nextBowlerNeeded: true }))).toBe('both');
  });
});

describe('isFirstBallOfInnings', () => {
  it('is true with no liveState at all', () => {
    expect(isFirstBallOfInnings(ready())).toBe(true);
  });

  it('is true while awaiting the start', () => {
    expect(isFirstBallOfInnings(ready({ matchStatus: 'awaiting_start' }))).toBe(true);
  });

  it('is true at the innings break', () => {
    expect(isFirstBallOfInnings(ready({ matchStatus: 'innings_break' }))).toBe(true);
  });

  it('is false mid-innings', () => {
    expect(isFirstBallOfInnings(ready({ matchStatus: 'innings1' }))).toBe(false);
  });
});

// The career-credit rule of spec §2 — the reason the lineup is shaped this way.
describe('lineupFromSlots', () => {
  it('carries each slot playerId through, so participation rows are written', () => {
    const side = {
      sideId: 's1',
      name: 'Reds',
      slots: [
        { slotId: 'a1', playerId: 'p1', displayName: 'Kohli' },
        { slotId: 'a2', playerId: 'p2', displayName: 'Rahul' },
      ],
    };

    expect(lineupFromSlots(side)).toEqual([
      { slotId: 'a1', playerId: 'p1', name: 'Kohli' },
      { slotId: 'a2', playerId: 'p2', name: 'Rahul' },
    ]);
  });

  it('keeps a placeholder slot playerless rather than inventing one', () => {
    const side = { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', displayName: 'Guest' }] };

    const [entry] = lineupFromSlots(side);
    expect(entry).toEqual({ slotId: 'a1', name: 'Guest' });
    expect('playerId' in entry).toBe(false);
  });

  it('preserves slot order, which is the batting order', () => {
    const side = {
      sideId: 's1',
      name: 'Reds',
      slots: [
        { slotId: 'a3', displayName: 'Third' },
        { slotId: 'a1', displayName: 'First' },
      ],
    };

    expect(lineupFromSlots(side).map((e) => e.slotId)).toEqual(['a3', 'a1']);
  });
});

describe('battingSideId', () => {
  it('reads liveState once play has started', () => {
    expect(battingSideId(ready({ battingTeamId: 's2' }))).toBe('s2');
  });

  it('falls back to the toss before the first ball — bat means the winner bats', () => {
    expect(battingSideId(tossed())).toBe('s1');
  });

  it('falls back to the other side when the toss winner chose to bowl', () => {
    const m = base({
      cricketSetup: {
        toss: { winnerTeamId: 's1', decision: 'bowl', recorded: true },
        lineupsSet: true, side1Lineup: [], side2Lineup: [],
      },
    });
    expect(battingSideId(m)).toBe('s2');
  });

  it('is null before the toss', () => {
    expect(battingSideId(base())).toBeNull();
  });
});

describe('bowlingSideId', () => {
  it('reads liveState once play has started', () => {
    expect(bowlingSideId(ready({ battingTeamId: 's2', bowlingTeamId: 's1' }))).toBe('s1');
  });

  it('is the side that is not batting, before the first ball', () => {
    expect(bowlingSideId(tossed())).toBe('s2');
  });

  it('is null before the toss', () => {
    expect(bowlingSideId(base())).toBeNull();
  });
});

describe('canUndoBall', () => {
  it('is false before any ball', () => {
    expect(canUndoBall(ready())).toBe(false);
  });

  it('is true once play has started', () => {
    expect(canUndoBall(ready({ matchStatus: 'innings1', runs: 1 }))).toBe(true);
  });

  it('is false on a cancelled match — the server refuses it outright', () => {
    const cancelled = { ...ready({ matchStatus: 'innings1' }), status: 'cancelled' } as QuickMatch;
    expect(canUndoBall(cancelled)).toBe(false);
  });
});

describe('cricketOutcomeLabel', () => {
  it('is null while live', () => {
    expect(cricketOutcomeLabel(ready())).toBeNull();
  });

  it('names the winning side', () => {
    const m = { ...ready(), status: 'completed', outcome: 'side1' } as QuickMatch;
    expect(cricketOutcomeLabel(m)).toBe('Reds won');
  });

  it('reports a tie', () => {
    const m = { ...ready(), status: 'completed', outcome: 'tied' } as QuickMatch;
    expect(cricketOutcomeLabel(m)).toBe('Tied');
  });

  it('reports a cancelled match', () => {
    const m = { ...ready(), status: 'cancelled' } as QuickMatch;
    expect(cricketOutcomeLabel(m)).toBe('Cancelled');
  });
});
