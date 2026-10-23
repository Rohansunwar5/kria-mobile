import { sortMetric, sortColumns, statsSheet, matchesOf } from '../src/lib/cricketSort';
import type { CricketPlayerStats } from '../src/api/cricketStats';

const stats = (over: any = {}): CricketPlayerStats =>
  ({
    registrationId: 'r1',
    playerName: 'A. Kohli',
    teamName: 'Thunder Blazers',
    batting: { matches: 8, innings: 4, runs: 342, balls: 240, fours: 30, sixes: 12, outs: 6, highest: 88 },
    bowling: { matches: 8, innings: 4, legalBalls: 120, runsConceded: 180, wickets: 9, bestFigureWickets: 3, bestFigureRuns: 24 },
    computed: { strikeRate: 142.5, average: 57, overs: '20.0', economy: 9, bestFigures: '3/24' },
    ...over,
  }) as CricketPlayerStats;

describe('sortMetric', () => {
  it('headlines runs with the runs total', () => {
    expect(sortMetric('runs', stats())).toEqual({ value: '342', unit: 'runs', headline: 'Most runs' });
  });

  it('headlines wickets with the wicket count', () => {
    expect(sortMetric('wickets', stats())).toEqual({ value: '9', unit: 'wkts', headline: 'Most wickets' });
  });

  it('headlines strike rate to one decimal', () => {
    expect(sortMetric('sr', stats())).toEqual({ value: '142.5', unit: 'SR', headline: 'Best strike rate' });
  });

  it('calls economy "best", because lower is better there', () => {
    expect(sortMetric('economy', stats())).toEqual({ value: '9.0', unit: 'econ', headline: 'Best economy' });
  });

  it('headlines the highest individual score', () => {
    expect(sortMetric('highest', stats())).toEqual({ value: '88', unit: 'high', headline: 'Highest score' });
  });

  it('headlines boundary counts', () => {
    expect(sortMetric('fours', stats()).value).toBe('30');
    expect(sortMetric('sixes', stats()).value).toBe('12');
  });

  it('shows a dash rather than NaN when the metric was never recorded', () => {
    const blank = stats({ computed: { strikeRate: null, average: null, overs: '0.0', economy: null, bestFigures: null } });
    expect(sortMetric('sr', blank).value).toBe('—');
    expect(sortMetric('economy', blank).value).toBe('—');
  });

  it('shows a dash for a batter with no recorded highest score', () => {
    expect(sortMetric('highest', stats({ batting: { runs: 0, balls: 0, fours: 0, sixes: 0, outs: 0 } })).value).toBe('—');
  });
});

describe('sortColumns', () => {
  it('shows batting columns for a batting sort', () => {
    expect(sortColumns('runs').map((c) => c.label)).toEqual(['Inn', 'Runs', 'SR']);
  });

  it('swaps to bowling columns for a bowling sort', () => {
    expect(sortColumns('wickets').map((c) => c.label)).toEqual(['Ov', 'Wkts', 'Econ']);
    expect(sortColumns('economy').map((c) => c.label)).toEqual(['Ov', 'Wkts', 'Econ']);
  });

  it('reads a column value off a player row', () => {
    const [inn, runs, sr] = sortColumns('runs');
    expect(inn.value(stats())).toBe('4');
    expect(runs.value(stats())).toBe('342');
    expect(sr.value(stats())).toBe('142.5');
  });
});

describe('matchesOf', () => {
  it('takes the larger of batting and bowling matches, 0 when absent', () => {
    expect(matchesOf(stats({ batting: { matches: 5 }, bowling: { matches: 3 } }))).toBe(5);
    expect(matchesOf(stats({ batting: { matches: 2 }, bowling: { matches: 3 } }))).toBe(3);
    expect(matchesOf(stats({ batting: undefined, bowling: undefined }))).toBe(0);
  });
});

describe('statsSheet', () => {
  it('lays out 7 batting, 5 bowling and 3 fielding cells with no Maidens', () => {
    const sh = statsSheet(stats({ fielding: { catches: 4, runOuts: 1, stumpings: 0 } }));
    expect(sh.title).toBe('A. Kohli');
    expect(sh.sub).toBe('Thunder Blazers · 8 matches');
    expect(sh.groups.map((g) => [g.title, g.cells.length])).toEqual([['Batting', 7], ['Bowling', 5], ['Fielding', 3]]);
    const all = sh.groups.flatMap((g) => g.cells);
    expect(all.map((c) => c.k)).not.toContain('Maidens');
    expect(sh.groups[0].cells).toEqual([
      { k: 'Runs', v: '342' }, { k: 'Balls', v: '240' }, { k: 'Average', v: '57.0' }, { k: 'Strike rate', v: '142.5' },
      { k: 'Highest', v: '88' }, { k: 'Fours', v: '30' }, { k: 'Sixes', v: '12' },
    ]);
    expect(sh.groups[1].cells.map((c) => c.v)).toEqual(['20.0', '9', '180', '9.0', '3/24']);
    expect(sh.groups[2].cells.map((c) => c.v)).toEqual(['4', '1', '0']);
  });
  it('shows dashes for null and missing values; singular match; no team', () => {
    const sh = statsSheet(stats({ teamName: undefined, batting: { matches: 1 }, bowling: { matches: 0 }, fielding: undefined, computed: { strikeRate: null, average: null, overs: '0.0', economy: null, bestFigures: null } }));
    expect(sh.sub).toBe('1 match');
    expect(sh.groups[1].cells.find((c) => c.k === 'Economy')?.v).toBe('—');
    expect(sh.groups[2].cells.map((c) => c.v)).toEqual(['—', '—', '—']);
  });
});
