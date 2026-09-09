import API from './axios';

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
 * `next(response)` hands the whole SuccessResponse over as `data`, and it
 * carries its own `.data`, so the payload sits two levels down. Same shape
 * profileApi.ts already unwraps.
 */
function unwrap(res: unknown): unknown {
  const lvl1 = (res as { data?: unknown } | null)?.data;
  const lvl2 = (lvl1 as { data?: unknown } | null)?.data;
  const lvl3 = (lvl2 as { data?: unknown } | null)?.data;
  return lvl3 ?? lvl2 ?? null;
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
