import {
  ballsRemaining,
  projectedScore,
  strikeRate,
  tossLine,
  matchStateNote,
  manhattanBars,
  wormSeries,
  runDistribution,
  matchSummary,
  yetToBat,
} from '@/lib/cricketView';
import type { CricketMatch, InningsScorecard, OverSummary } from '@/api/cricketMatch';

const over = (overNumber: number, labels: string[], wickets = 0): OverSummary => ({
  overNumber,
  runs: labels.reduce((s, l) => s + (Number(l) || 0), 0),
  wickets,
  balls: labels.map((label) => ({ label, runs: Number(label) || 0, isWicket: label === 'W' })),
});

function innings(partial: Partial<InningsScorecard> = {}): InningsScorecard {
  return {
    inningsNumber: 1,
    battingTeamId: 't1',
    battingTeamName: 'Titans',
    bowlingTeamId: 't2',
    bowlingTeamName: 'Willow',
    totals: { runs: 0, wickets: 0, overs: '0.0', extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 } },
    battingCard: [],
    bowlingCard: [],
    oversTimeline: [],
    currentPartnership: null,
    fallOfWickets: [],
    partnerships: [],
    ...partial,
  };
}

describe('balls remaining and projection', () => {
  it('counts down from the over limit', () => {
    // 12 overs = 72 balls, 15 bowled
    expect(ballsRemaining({ completedOvers: 2, ballsInCurrentOver: 3 }, 12)).toBe(57);
    expect(ballsRemaining({ completedOvers: 12, ballsInCurrentOver: 0 }, 12)).toBe(0);
  });

  it('has nothing to say without an over limit', () => {
    expect(ballsRemaining({ completedOvers: 2, ballsInCurrentOver: 0 }, undefined)).toBeNull();
    expect(projectedScore({ runs: 20, completedOvers: 2, ballsInCurrentOver: 0 }, undefined)).toBeNull();
  });

  it('projects at the current rate', () => {
    // 14 off 2 overs = CRR 7.00, 10 overs left → 14 + 70 = 84
    expect(projectedScore({ runs: 14, completedOvers: 2, ballsInCurrentOver: 0 }, 12)).toBe(84);
  });

  it('does not project once the overs are gone or before a ball', () => {
    expect(projectedScore({ runs: 100, completedOvers: 12, ballsInCurrentOver: 0 }, 12)).toBeNull();
    expect(projectedScore({ runs: 0, completedOvers: 0, ballsInCurrentOver: 0 }, 12)).toBeNull();
  });
});

describe('strikeRate', () => {
  it('is runs per hundred balls, one decimal', () => {
    expect(strikeRate(6, 5)).toBe(120);
    expect(strikeRate(7, 7)).toBe(100);
    expect(strikeRate(1, 3)).toBe(33.3);
  });

  it('is zero rather than Infinity off no balls', () => {
    expect(strikeRate(0, 0)).toBe(0);
  });
});

describe('tossLine', () => {
  const teams = { team1Id: 't1', team2Id: 't2', team1Name: 'Titans', team2Name: 'Willow' };

  it('names the winner and the decision', () => {
    expect(
      tossLine({ teams, cricketSetup: { toss: { winnerTeamId: 't2', decision: 'bowl', recorded: true } } } as CricketMatch)
    ).toBe('Willow chose to bowl first');
  });

  it('stays silent until the toss is recorded', () => {
    expect(tossLine({ teams, cricketSetup: { toss: { winnerTeamId: 't1', decision: 'bat' } } } as CricketMatch)).toBeNull();
    expect(tossLine({ teams, cricketSetup: {} } as CricketMatch)).toBeNull();
    expect(tossLine(null)).toBeNull();
  });
});

describe('matchStateNote', () => {
  it('explains an innings break rather than showing a frozen score', () => {
    expect(matchStateNote({ matchStatus: 'innings_break' })?.title).toBe('Innings break');
  });

  it('explains a stopped scoreboard', () => {
    expect(matchStateNote({ matchStatus: 'innings1', nextBatsmanNeeded: true })?.title).toBe('New batter coming in');
    expect(matchStateNote({ matchStatus: 'innings1', nextBowlerNeeded: true })?.title).toBe('End of over');
  });

  it('says nothing while play is under way', () => {
    expect(matchStateNote({ matchStatus: 'innings1' })).toBeNull();
    expect(matchStateNote(null)).toBeNull();
  });
});

describe('manhattanBars', () => {
  it('pads unbowled overs out to the limit and keeps them empty', () => {
    const { bars, peak } = manhattanBars(innings({ oversTimeline: [over(1, ['1', '1', '4', '0', '0', '2'])] }), 4);
    expect(bars).toHaveLength(4);
    expect(peak).toBe(8);
    expect(bars[0]).toMatchObject({ overNumber: 1, runs: 8, empty: false, ratio: 1 });
    expect(bars[3]).toMatchObject({ overNumber: 4, empty: true, ratio: 0 });
  });

  it('gives a scoreless over a visible floor, not zero height', () => {
    const { bars } = manhattanBars(
      innings({ oversTimeline: [over(1, ['0', '0', '0', '0', '0', '0']), over(2, ['6', '6', '6', '0', '0', '0'])] })
    );
    expect(bars[0].empty).toBe(false);
    expect(bars[0].ratio).toBe(0.06);
  });

  it('has no bars without a timeline', () => {
    expect(manhattanBars(null).bars).toEqual([]);
    expect(manhattanBars(innings()).bars).toEqual([]);
  });
});

describe('wormSeries', () => {
  it('accumulates runs by over end from 0/0', () => {
    const { series, maxX, maxY } = wormSeries(
      innings({ oversTimeline: [over(1, ['4', '2']), over(2, ['6', '1'])] }),
      null,
      12
    );
    expect(series).toHaveLength(1);
    expect(series[0].points).toEqual([{ x: 0, y: 0 }, { x: 1, y: 6 }, { x: 2, y: 13 }]);
    expect(series[0].finalRuns).toBe(13);
    expect(maxX).toBe(12);
    expect(maxY).toBe(13);
  });

  it('carries both innings so a chase reads against the target', () => {
    const { series } = wormSeries(
      innings({ oversTimeline: [over(1, ['4'])] }),
      innings({ inningsNumber: 2, battingTeamName: 'Willow', oversTimeline: [over(1, ['6'])] }),
      null as unknown as number
    );
    expect(series.map((s) => s.teamName)).toEqual(['Titans', 'Willow']);
  });

  it('is empty with no innings at all', () => {
    expect(wormSeries(null, null).series).toEqual([]);
  });
});

describe('runDistribution', () => {
  it('buckets every ball and shares add to one', () => {
    const { rows, totalBalls } = runDistribution(
      innings({ oversTimeline: [over(1, ['0', '1', '4', '6', 'W', 'wd'])] })
    );
    expect(totalBalls).toBe(6);
    const by = Object.fromEntries(rows.map((r) => [r.label, r.count]));
    expect(by).toMatchObject({ Dots: 1, Singles: 1, Fours: 1, Sixes: 1, Wickets: 1, Extras: 1 });
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1);
  });

  it('has no rows before a ball is bowled', () => {
    expect(runDistribution(innings()).rows).toEqual([]);
  });
});

describe('matchSummary', () => {
  const bat = (name: string, runs: number, ballsFaced: number) => ({
    registrationId: name, name, runs, ballsFaced, fours: 0, sixes: 0, strikeRate: 0,
  });
  const bowl = (name: string, wickets: number, runs: number) => ({
    registrationId: name, name, overs: '4.0', maidens: 0, runs, wickets, economy: 0,
  });

  it('picks the top score, breaking ties on fewer balls', () => {
    const sc = {
      innings1: innings({ battingCard: [bat('Slow', 50, 45), bat('Quick', 50, 30)] }),
      innings2: null,
    };
    expect(matchSummary(sc)!.topBat!.name).toBe('Quick');
  });

  it('picks the best bowling, breaking ties on fewer runs', () => {
    const sc = {
      innings1: innings({ bowlingCard: [bowl('Loose', 3, 40), bowl('Tight', 3, 22)] }),
      innings2: null,
    };
    expect(matchSummary(sc)!.topBowl!.name).toBe('Tight');
  });

  it('picks the biggest stand across both innings and tags its team', () => {
    const stand = (runs: number) => ({
      wicketNumber: 1, batter1Id: 'a', batter1Name: 'A', batter2Id: 'b', batter2Name: 'B', runs, balls: 20, unbroken: false,
    });
    const sc = {
      innings1: innings({ partnerships: [stand(30)] }),
      innings2: innings({ inningsNumber: 2, battingTeamName: 'Willow', partnerships: [stand(70)] }),
    };
    const best = matchSummary(sc)!.bestPartnership!;
    expect(best.runs).toBe(70);
    expect(best.teamName).toBe('Willow');
  });

  it('is null with no innings', () => {
    expect(matchSummary(null)).toBeNull();
    expect(matchSummary({ innings1: null, innings2: null })).toBeNull();
  });
});

describe('yetToBat', () => {
  const lineup = {
    lineupSet: true,
    startingXI: [
      { registrationId: 'r1', name: 'One' },
      { registrationId: 'r2', name: 'Two' },
      { registrationId: 'r3', name: 'Three' },
    ],
  };

  it('lists the XI minus anyone who has already batted', () => {
    const card = innings({
      battingCard: [{ registrationId: 'r1', name: 'One', runs: 7, ballsFaced: 7, fours: 1, sixes: 0, strikeRate: 100 }],
    });
    expect(yetToBat(lineup, card)).toEqual(['Two', 'Three']);
  });

  it('is empty until a lineup is recorded', () => {
    expect(yetToBat({ ...lineup, lineupSet: false }, innings())).toEqual([]);
    expect(yetToBat(undefined, innings())).toEqual([]);
  });
});
