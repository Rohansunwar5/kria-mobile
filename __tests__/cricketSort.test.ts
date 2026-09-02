import { sortMetric, sortColumns } from '../src/lib/cricketSort';
import type { CricketPlayerStats } from '../src/api/cricketStats';

const stats = (over: any = {}): CricketPlayerStats =>
  ({
    registrationId: 'r1',
    playerName: 'A. Kohli',
    teamName: 'Thunder Blazers',
    batting: { runs: 342, balls: 240, fours: 30, sixes: 12, outs: 6, highest: 88 },
    bowling: { legalBalls: 120, runsConceded: 180, wickets: 9, bestFigureWickets: 3, bestFigureRuns: 24 },
    computed: { strikeRate: 142.5, average: 57, overs: '20.0', economy: 9, bestFigures: '3/24' },
    ...over,
  }) as CricketPlayerStats;

describe('sortMetric', () => {
  it('headlines runs with the runs total', () => {
    expect(sortMetric('runs', stats())).toEqual({ value: '342', unit: 'RUNS', headline: 'Most runs' });
  });

  it('headlines wickets with the wicket count', () => {
    expect(sortMetric('wickets', stats())).toEqual({ value: '9', unit: 'WKTS', headline: 'Most wickets' });
  });

  it('headlines strike rate to one decimal', () => {
    expect(sortMetric('sr', stats())).toEqual({ value: '142.5', unit: 'SR', headline: 'Best strike rate' });
  });

  it('calls economy "best", because lower is better there', () => {
    expect(sortMetric('economy', stats())).toEqual({ value: '9.0', unit: 'ECON', headline: 'Best economy' });
  });

  it('headlines the highest individual score', () => {
    expect(sortMetric('highest', stats())).toEqual({ value: '88', unit: 'HIGH', headline: 'Highest score' });
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
    expect(inn.value(stats())).toBe('6');
    expect(runs.value(stats())).toBe('342');
    expect(sr.value(stats())).toBe('142.5');
  });
});
