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
      return { value: num(s.bowling?.wickets), unit: 'wkts', headline: 'Most wickets' };
    case 'sr':
      return { value: num(s.computed?.strikeRate, 1), unit: 'SR', headline: 'Best strike rate' };
    case 'economy':
      return { value: num(s.computed?.economy, 1), unit: 'econ', headline: 'Best economy' };
    case 'fours':
      return { value: num(s.batting?.fours), unit: '4s', headline: 'Most fours' };
    case 'sixes':
      return { value: num(s.batting?.sixes), unit: '6s', headline: 'Most sixes' };
    case 'highest':
      return { value: s.batting?.highest ? num(s.batting.highest) : DASH, unit: 'high', headline: 'Highest score' };
    case 'runs':
    default:
      return { value: num(s.batting?.runs), unit: 'runs', headline: 'Most runs' };
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
    { label: 'Inn', value: (s) => num(s.batting?.innings) },
    { label: 'Runs', value: (s) => num(s.batting?.runs) },
    { label: 'SR', value: (s) => num(s.computed?.strikeRate, 1) },
  ];
}

export const matchesOf = (s: CricketPlayerStats): number => Math.max(s.batting?.matches ?? 0, s.bowling?.matches ?? 0);

/** The stats sheet: name, "<team> · N matches", and three groups of label/value cells. */
export function statsSheet(s: CricketPlayerStats) {
  const n = matchesOf(s);
  const matches = `${n} ${n === 1 ? 'match' : 'matches'}`;
  const c = (k: string, v: string) => ({ k, v });
  return {
    title: s.playerName ?? '',
    sub: s.teamName ? `${s.teamName} · ${matches}` : matches,
    groups: [
      {
        title: 'Batting' as const,
        cells: [
          c('Runs', num(s.batting?.runs)), c('Balls', num(s.batting?.balls)),
          c('Average', num(s.computed?.average, 1)), c('Strike rate', num(s.computed?.strikeRate, 1)),
          c('Highest', num(s.batting?.highest)), c('Fours', num(s.batting?.fours)), c('Sixes', num(s.batting?.sixes)),
        ],
      },
      {
        title: 'Bowling' as const,
        cells: [
          c('Overs', s.computed?.overs ?? DASH), c('Wickets', num(s.bowling?.wickets)), c('Runs', num(s.bowling?.runsConceded)),
          c('Economy', num(s.computed?.economy, 1)), c('Best', s.computed?.bestFigures ?? DASH),
        ],
      },
      {
        title: 'Fielding' as const,
        cells: [c('Catches', num(s.fielding?.catches)), c('Run outs', num(s.fielding?.runOuts)), c('Stumpings', num(s.fielding?.stumpings))],
      },
    ],
  };
}
