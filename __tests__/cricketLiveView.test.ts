import { ballsRemaining, strikeRate, manhattanBars } from '@/lib/cricketView';
import type { InningsScorecard, OverSummary } from '@/api/cricketMatch';

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

describe('balls remaining', () => {
  it('counts down from the over limit', () => {
    // 12 overs = 72 balls, 15 bowled
    expect(ballsRemaining({ completedOvers: 2, ballsInCurrentOver: 3 }, 12)).toBe(57);
    expect(ballsRemaining({ completedOvers: 12, ballsInCurrentOver: 0 }, 12)).toBe(0);
  });

  it('has nothing to say without an over limit', () => {
    expect(ballsRemaining({ completedOvers: 2, ballsInCurrentOver: 0 }, undefined)).toBeNull();
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

