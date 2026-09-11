import API from './axios';
import type { LiveState } from './cricketMatch';
import { unwrap } from './unwrap';

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
  matchConfig?: {
    bestOf?: number;
    pointsToWin?: number;
    maxOvers?: number;
    maxOversPerBowler?: number;
    playersPerTeam?: number;
  };
  /** Cricket only. */
  cricketSetup?: QuickCricketSetup;
  /** Cricket only. The engine's state, shaped exactly as the tournament path's. */
  liveState?: LiveState;
  /** Cricket only. Written at completion. */
  inningsScores?: QuickInningsScore[];
}

export type WicketType =
  | 'bowled' | 'caught' | 'lbw' | 'run_out' | 'stumped' | 'hit_wicket' | 'retired_hurt';

export interface QuickCricketLineupEntry {
  slotId: string;
  playerId?: string;
  name?: string;
}

export interface QuickCricketSetup {
  /** Engine-facing name; holds a sideId, not a team id. */
  toss: { winnerTeamId?: string; decision?: 'bat' | 'bowl'; recorded: boolean };
  lineupsSet: boolean;
  side1Lineup: QuickCricketLineupEntry[];
  side2Lineup: QuickCricketLineupEntry[];
}

export interface QuickInningsScore {
  inningsNumber: number;
  battingSideId: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  /**
   * Whether the innings ended on wickets rather than overs. The server has
   * always written it; mobile used to drop it. `playersPerTeam - 1` wickets on
   * a match carrying `honoursSquadSize`, a hard-coded 10 on one that predates
   * that field.
   */
  isAllOut: boolean;
}

export interface BallEntry {
  batsmanOnStrikeId: string;
  nonStrikerId: string;
  bowlerId: string;
  runs: number;
  extrasType?: 'wide' | 'no_ball' | 'bye' | 'leg_bye';
  extrasRuns?: number;
  wicketType?: WicketType;
  dismissedPlayerId?: string;
  fielderId?: string;
}

export interface CreateQuickMatchBody {
  sport: 'badminton' | 'cricket';
  sides: { name: string; slots: { playerId?: string; displayName: string }[] }[];
  /**
   * Mirrors `createQuickMatchValidator`. The badminton pair are closed sets, so
   * a wrong value is a compile error instead of a 422. The cricket three are
   * ranges the validator enforces at runtime — `maxOvers` and
   * `maxOversPerBowler` 1-50, `playersPerTeam` 2-11 — and a union of those is
   * noise, so they stay `number`.
   */
  matchConfig?: {
    bestOf?: 1 | 3 | 5;
    pointsToWin?: 11 | 15 | 21;
    maxOvers?: number;
    maxOversPerBowler?: number;
    playersPerTeam?: number;
  };
}

const asMatch = (res: unknown) => unwrap(res) as QuickMatch;

export async function createQuickMatch(input: CreateQuickMatchBody): Promise<QuickMatch> {
  return asMatch(await API.post('/quick-match', input));
}

export async function listMyQuickMatches(): Promise<QuickMatch[]> {
  const payload = unwrap(await API.get('/quick-match/mine')) as QuickMatch[] | null;
  // A player with no matches is a success with nothing in it, not an error —
  // callers render an empty state, they do not branch on null.
  //
  // Both sports. The list screen renders each by sport — the filter that used
  // to sit here is what kept quick cricket unreachable from the app.
  return (payload ?? []) as QuickMatch[];
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

export async function recordQuickToss(
  id: string,
  input: { winnerSideId: string; decision: 'bat' | 'bowl' },
): Promise<QuickMatch> {
  return asMatch(await API.post(`/quick-match/${id}/cricket/toss`, input));
}

export async function recordQuickLineup(
  id: string,
  input: { sideId: string; players: QuickCricketLineupEntry[] },
): Promise<QuickMatch> {
  return asMatch(await API.post(`/quick-match/${id}/cricket/lineup`, input));
}

export async function recordQuickBall(id: string, ball: BallEntry): Promise<QuickMatch> {
  return asMatch(await API.post(`/quick-match/${id}/cricket/ball`, ball));
}

export async function undoQuickBall(id: string): Promise<QuickMatch> {
  return asMatch(await API.post(`/quick-match/${id}/cricket/undo`));
}
