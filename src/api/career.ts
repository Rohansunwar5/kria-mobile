import API from './axios';
import { unwrap } from './unwrap';

/**
 * Per-sport career figures, exactly as the server computes them.
 *
 * `winRate` is a 0-1 FRACTION, not a percentage — format it at render, never
 * recompute it here. `played` and `decided` differ whenever a no_result match
 * exists: those are stored and counted as played, but excluded from the win
 * rate. Treating the two as interchangeable misreports both.
 */
export interface SportSummary {
  sport: string;
  played: number;
  decided: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  winRate: number;
}

export interface CareerProfile {
  sports: SportSummary[];
  /**
   * The server names this only when a sport has at least 10 decided matches
   * (highest win rate, ties broken by volume). Below that it sends null and
   * NO badge should be shown. That rule lives on the server alone — do not
   * re-implement it here, or the two copies will drift.
   */
  bestSport: SportSummary | null;
}

/**
 * Career profile for one player. Readable by any authenticated player, so it
 * serves both your own profile and an opponent's.
 *
 * Note the route carries no `/api/v1` prefix — this server mounts its router
 * unprefixed.
 */
export async function getCareerProfile(playerId: string): Promise<CareerProfile> {
  const res = await API.get(`/player/career/${playerId}`);
  const payload = unwrap(res) as Partial<CareerProfile> | null;

  // A player who has never played is a success with nothing in it, not an
  // error — callers render an empty state, they do not branch on null.
  return {
    sports: payload?.sports ?? [],
    bestSport: payload?.bestSport ?? null,
  };
}

/**
 * One row of the profile feed. Everything the participation ledger knows about
 * a played match — and no more. There is deliberately no opponent and no
 * score: the ledger records neither, and the server projects away the unused
 * `detail` field rather than send an always-null column.
 */
export interface RecentMatch {
  _id: string;
  matchId: string;
  sport: string;
  context: 'tournament' | 'quick';
  result: 'won' | 'lost' | 'tied' | 'no_result';
  /** ISO 8601 — the server serialises a Date. */
  playedAt: string;
  /**
   * "Alpha vs Bravo". Absent when the match document could not be read — it
   * was deleted, or its sport has no feed summariser yet — so every reader
   * must have a fallback. The ledger outlives the matches it describes.
   */
  title?: string;
  /** "21-15, 21-18" or "150/6 (20.0) vs 151/4 (19.2)". Absent for a walkover. */
  scoreline?: string;
}

/**
 * The player's most recent matches, newest first, blending tournament and
 * quick play exactly as the career figures do. Readable for any player, so it
 * serves an opponent's profile as well as your own.
 *
 * `limit` is left off the request unless given, so the server owns the default
 * feed length and the two cannot drift.
 */
export async function getRecentMatches(playerId: string, limit?: number): Promise<RecentMatch[]> {
  const res = await API.get(
    `/player/career/${playerId}/recent`,
    limit === undefined ? undefined : { params: { limit } },
  );
  // Null would crash every caller that maps over the result.
  return unwrap<RecentMatch[] | null>(res) ?? [];
}
