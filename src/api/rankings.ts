import API from './axios';
import { unwrap } from './unwrap';

/**
 * One row of a sport's leaderboard, already ranked by the server.
 *
 * `winRate` is a 0-1 FRACTION, not a percentage — format it at render, never
 * recompute it here. `played` and `decided` differ whenever a no_result match
 * exists, same as the career profile. `profileImage` is an absent key, not
 * `null`, when the player has none — check with `player.profileImage`, not
 * `!== null`.
 */
export interface RankedPlayer {
  playerId: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  played: number;
  decided: number;
  won: number;
  winRate: number;
}

/**
 * Top players for one sport, readable by any authenticated player.
 *
 * `sport` is required by the server — there is no "all sports" ranking.
 * `limit` is left off the request unless given, so the server owns the
 * default page size and the two cannot drift. The server excludes anyone
 * below 10 decided matches, so a small sample never shows up here.
 *
 * Note the route carries no `/api/v1` prefix — this server mounts its router
 * unprefixed.
 */
export async function getTopPlayers(sport: string, limit?: number): Promise<RankedPlayer[]> {
  const res = await API.get('/player/rankings', {
    params: limit === undefined ? { sport } : { sport, limit },
  });
  // Null would crash every caller that maps over the result.
  return unwrap<RankedPlayer[] | null>(res) ?? [];
}
