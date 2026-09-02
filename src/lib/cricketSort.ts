import type { CricketPlayerStats, LeaderboardSort } from '@/api/cricketStats';

const DASH = '—';

const num = (n: number | null | undefined, decimals = 0): string =>
  n === null || n === undefined ? DASH : n.toFixed(decimals);

/**
 * The headline figure for whichever chart is showing. Economy is the odd one —
 * lower is better, so it is "best economy", never "most".
 */
export function sortMetric(
  sort: LeaderboardSort,
  s: CricketPlayerStats
): { value: string; unit: string; headline: string } {
  switch (sort) {
    case 'wickets':
      return { value: num(s.bowling?.wickets), unit: 'WKTS', headline: 'Most wickets' };
    case 'sr':
      return { value: num(s.computed?.strikeRate, 1), unit: 'SR', headline: 'Best strike rate' };
    case 'economy':
      return { value: num(s.computed?.economy, 1), unit: 'ECON', headline: 'Best economy' };
    case 'fours':
      return { value: num(s.batting?.fours), unit: '4s', headline: 'Most fours' };
    case 'sixes':
      return { value: num(s.batting?.sixes), unit: '6s', headline: 'Most sixes' };
    case 'highest':
      return { value: s.batting?.highest ? num(s.batting.highest) : DASH, unit: 'HIGH', headline: 'Highest score' };
    case 'runs':
    default:
      return { value: num(s.batting?.runs), unit: 'RUNS', headline: 'Most runs' };
  }
}

const BOWLING_SORTS: LeaderboardSort[] = ['wickets', 'economy'];

export interface Column {
  label: string;
  value: (s: CricketPlayerStats) => string;
}

/** The table swaps between batting and bowling columns to match the chart. */
export function sortColumns(sort: LeaderboardSort): Column[] {
  if (BOWLING_SORTS.includes(sort)) {
    return [
      { label: 'Ov', value: (s) => s.computed?.overs ?? '0.0' },
      { label: 'Wkts', value: (s) => num(s.bowling?.wickets) },
      { label: 'Econ', value: (s) => num(s.computed?.economy, 1) },
    ];
  }
  return [
    { label: 'Inn', value: (s) => num(s.matches ?? s.batting?.outs) },
    { label: 'Runs', value: (s) => num(s.batting?.runs) },
    { label: 'SR', value: (s) => num(s.computed?.strikeRate, 1) },
  ];
}
