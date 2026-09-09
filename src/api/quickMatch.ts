import API from './axios';

export interface QuickMatchSlot {
  slotId: string;
  playerId?: string;
  displayName: string;
}

export interface QuickMatchSide {
  sideId: string;
  name: string;
  slots: QuickMatchSlot[];
}

export interface QuickGameScore {
  gameNumber: number;
  side1Score: number;
  side2Score: number;
  winnerSideId?: string;
}

export interface QuickMatch {
  _id: string;
  hostId: string;
  sport: 'badminton' | 'cricket';
  joinCode: string;
  status: 'live' | 'completed' | 'cancelled';
  sides: QuickMatchSide[];
  outcome?: 'side1' | 'side2' | 'tied' | 'no_result';
  lockedAt?: string;
  createdAt: string;
  gameScores?: QuickGameScore[];
  /**
   * The one-level undo snapshot. **Absent** — not `[]` — when there is nothing
   * to undo: the schema declares `default: undefined` precisely because `[]` is
   * a legitimate snapshot (undoing the very first point of a match). Test its
   * presence, never its truthiness. See `canUndo` in `@/lib/quickMatchView`.
   */
  previousGameScores?: QuickGameScore[];
  matchConfig?: { bestOf: number; pointsToWin: number };
}

export interface CreateQuickMatchBody {
  sport: 'badminton';
  sides: { name: string; slots: { playerId?: string; displayName: string }[] }[];
  matchConfig?: { bestOf?: number; pointsToWin?: number };
}

/**
 * `next(response)` hands the whole SuccessResponse over as the body's `data`,
 * and it carries its own `.data`, so the payload sits two levels below the body
 * and three below the axios response. Same shape `career.ts` unwraps.
 */
function unwrap(res: unknown): unknown {
  const lvl1 = (res as { data?: unknown } | null)?.data;
  const lvl2 = (lvl1 as { data?: unknown } | null)?.data;
  const lvl3 = (lvl2 as { data?: unknown } | null)?.data;
  return lvl3 ?? lvl2 ?? null;
}

const asMatch = (res: unknown) => unwrap(res) as QuickMatch;

export async function createQuickMatch(input: CreateQuickMatchBody): Promise<QuickMatch> {
  return asMatch(await API.post('/quick-match', input));
}

export async function listMyQuickMatches(): Promise<QuickMatch[]> {
  const payload = unwrap(await API.get('/quick-match/mine')) as QuickMatch[] | null;
  // A player with no matches is a success with nothing in it, not an error —
  // callers render an empty state, they do not branch on null.
  return payload ?? [];
}

export async function getQuickMatch(id: string): Promise<QuickMatch> {
  return asMatch(await API.get(`/quick-match/${id}`));
}

/** Codes are stored uppercase and get read aloud, so normalise before sending. */
export async function getQuickMatchByCode(joinCode: string): Promise<QuickMatch> {
  return asMatch(await API.get(`/quick-match/by-code/${joinCode.toUpperCase()}`));
}

export async function claimQuickMatchSlot(joinCode: string, slotId: string): Promise<QuickMatch> {
  return asMatch(await API.post(`/quick-match/join/${joinCode.toUpperCase()}`, { slotId }));
}

/**
 * One point to a side. `delta` is always 1.
 *
 * The server also accepts `delta: -1`, but it cannot repair a mis-tapped match
 * point — `applyPoint` short-circuits once the match is decided and
 * `recordPoint` refuses a completed match outright. `undoQuickPoint` is the
 * correction path, so -1 is deliberately never sent.
 */
export async function recordQuickPoint(id: string, side: 1 | 2): Promise<QuickMatch> {
  return asMatch(await API.post(`/quick-match/${id}/badminton/point`, { side, delta: 1 }));
}

export async function undoQuickPoint(id: string): Promise<QuickMatch> {
  return asMatch(await API.post(`/quick-match/${id}/badminton/undo`));
}

export async function cancelQuickMatch(id: string): Promise<QuickMatch> {
  return asMatch(await API.post(`/quick-match/${id}/cancel`));
}

export async function removeQuickMatchPlayer(id: string, playerId: string): Promise<QuickMatch> {
  return asMatch(await API.delete(`/quick-match/${id}/players/${playerId}`));
}
