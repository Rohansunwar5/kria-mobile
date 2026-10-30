import type { InningsScore, LiveItem } from '@/api/live';
import { feedRound, parseScoreline } from '@/lib/badmintonBoard';
import { timeAgo } from '@/lib/tournamentView';

export interface FeedRow {
  key: string; kind: 'tournament' | 'quick'; matchId: string; sport: string;
  meta: string;
  sides: [string, string];
  badminton?: { games: { a: number; b: number }[] };
  cricket?: { scores: [string | null, string | null]; chase: string | null };
  scoreline?: string;
  sub?: string;
  /** "Started 25 min ago" — the server sets the real start time when a match
   *  goes live (SERVER-GAPS #26). */
  started?: string;
}

const SPORT_NAMES: Record<string, string> = { cricket: 'Cricket', badminton: 'Badminton', table_tennis: 'Table tennis' };
export const sportLabel = (sport: string) => SPORT_NAMES[sport] ?? sport.charAt(0).toUpperCase() + sport.slice(1).replace(/_/g, ' ');

const innings = (i: InningsScore | null) => (i ? `${i.runs}/${i.wickets} (${i.overs}.${i.balls})` : null);

/** Every row is built from the feed alone: one request, however many matches are live (SERVER-GAPS #23, #25). */
export function feedRows(items: LiveItem[], now: Date = new Date()): { tournament: FeedRow[]; quick: FeedRow[] } {
  const out = { tournament: [] as FeedRow[], quick: [] as FeedRow[] };
  for (const it of items) {
    const sides = it.sides ?? ['', ''];
    const base = {
      key: `${it.kind}-${it.matchId}`, kind: it.kind, matchId: it.matchId, sport: it.sport, sides,
      started: it.startedAt ? `Started ${timeAgo(it.startedAt, now)}` : undefined,
    };
    if (it.kind === 'quick') {
      out.quick.push({ ...base, meta: sportLabel(it.sport), scoreline: it.scoreline });
      continue;
    }
    const row: FeedRow = {
      ...base,
      meta: [it.tournamentName, it.categoryName, feedRound(it.round, it.positionInRound)].filter(Boolean).join(' · '),
    };
    if (it.sport === 'badminton') {
      const games = parseScoreline(it.scoreline);
      row.badminton = { games };
      row.sub = [games.length ? `Game ${games.length}` : '', it.court ? `Court ${it.court}` : ''].filter(Boolean).join(' · ') || undefined;
    } else if (it.sport === 'cricket') {
      const c = it.cricket;
      row.cricket = {
        scores: [innings(c?.scores[0] ?? null), innings(c?.scores[1] ?? null)],
        chase: c?.chase ? `${sides[c.chase.side]} need ${c.chase.need} off ${c.chase.balls} balls` : null,
      };
    }
    out.tournament.push(row);
  }
  return out;
}
