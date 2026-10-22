import type { LiveItem } from '@/api/live';
import type { CricketMatch, LiveState } from '@/api/cricketMatch';
import { feedRound, parseScoreline } from '@/lib/badmintonBoard';
import { ballsRemaining } from '@/lib/cricketView';

export interface FeedRow {
  key: string; kind: 'tournament' | 'quick'; matchId: string; sport: string;
  meta: string;
  sides: [string, string];
  badminton?: { games: { a: number; b: number }[] };
  cricket?: { scores: [string | null, string | null]; chase: string | null };
  scoreline?: string;
  sub?: string;
}

export type CricketEnrich = Record<string, { live: LiveState | null; match: CricketMatch | null }>;

const SPORT_NAMES: Record<string, string> = { cricket: 'Cricket', badminton: 'Badminton', table_tennis: 'Table tennis' };
export const sportLabel = (sport: string) => SPORT_NAMES[sport] ?? sport.charAt(0).toUpperCase() + sport.slice(1).replace(/_/g, ' ');

const innings = (r: { runs: number; wickets: number; completedOvers: number; ballsInCurrentOver: number }) =>
  `${r.runs}/${r.wickets} (${r.completedOvers}.${r.ballsInCurrentOver})`;

function cricketOf(e: CricketEnrich[string] | undefined) {
  const live = e?.live, match = e?.match;
  const scores: [string | null, string | null] = [null, null];
  if (!live || !match) return { scores, chase: null };
  const bat = live.battingTeamId === match.teams.team2Id ? 1 : 0;
  scores[bat] = innings(live);
  if (live.currentInnings === 2 && live.innings1Summary) scores[1 - bat] = innings(live.innings1Summary);
  const need = live.currentInnings === 2 && live.target != null ? live.target - live.runs : null;
  const balls = ballsRemaining(live, match.matchConfig?.maxOvers);
  const name = bat ? match.teams.team2Name : match.teams.team1Name;
  const chase = need != null && need > 0 && balls != null ? `${name} need ${need} off ${balls} balls` : null;
  return { scores, chase };
}

export function feedRows(items: LiveItem[], cricket: CricketEnrich): { tournament: FeedRow[]; quick: FeedRow[] } {
  const out = { tournament: [] as FeedRow[], quick: [] as FeedRow[] };
  for (const it of items) {
    const [a = '', b = ''] = (it.title ?? '').split(' vs ');
    const base = { key: `${it.kind}-${it.matchId}`, kind: it.kind, matchId: it.matchId, sport: it.sport, sides: [a, b] as [string, string] };
    if (it.kind === 'quick') {
      out.quick.push({ ...base, meta: sportLabel(it.sport), scoreline: it.scoreline });
      continue;
    }
    const row: FeedRow = {
      ...base,
      meta: [it.tournamentName, it.categoryName, feedRound(it.round)].filter(Boolean).join(' · '),
    };
    if (it.sport === 'badminton') {
      const games = parseScoreline(it.scoreline);
      row.badminton = { games };
      if (games.length) row.sub = `Game ${games.length}`;
    } else if (it.sport === 'cricket') row.cricket = cricketOf(cricket[it.matchId]);
    out.tournament.push(row);
  }
  return out;
}
