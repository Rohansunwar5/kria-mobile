import API from './axios';
import { unwrap } from './unwrap';

export interface LeaderboardEntry {
  _id: string;
  playerName: string;
  teamId?: string;
  teamName?: string;
  matchesPlayed: number;
  matchesWon: number;
  totalPointsScored: number;
  totalPointsConceded?: number;
  pointDiff?: number;
  winPercentage?: number;
  rank?: number;
}

/** One team on a team category's league table, as the server ranks it. */
export interface TeamRow {
  teamId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
}

export interface PointsConfig { pointsForWin: number; pointsForLoss: number; pointsForDraw: number }

/**
 * A team category's league table. The server ranks it (points, then wins, then
 * fewer losses) and says which points scheme it used, so the app only renders.
 */
export async function getTeamTable(categoryId: string): Promise<{ rows: TeamRow[]; pointsConfig?: PointsConfig }> {
  const data = unwrap(await API.get(`/matches/leaderboard/${categoryId}`)) ?? {};
  return { rows: data.leaderboard ?? [], pointsConfig: data.pointsConfig };
}

/** One player (or doubles side) on a group's table, as the server ranks it. */
export interface GroupRow {
  registrationId: string;
  name: string;
  teamName?: string;
  played: number;
  won: number;
  lost: number;
  points: number;
}

export interface GroupTable { name: string; rows: GroupRow[] }

/**
 * Groups, then a knockout (SERVER-GAPS #12): each group's table, how many go
 * through from each, and the knockout's first round. `groups` is empty for a
 * category that has no group matches.
 */
export async function getGroupTables(categoryId: string): Promise<{ groups: GroupTable[]; qualify?: number; knockoutRound?: string }> {
  const data = unwrap(await API.get(`/matches/leaderboard/${categoryId}`)) ?? {};
  return { groups: data.groups ?? [], qualify: data.qualify, knockoutRound: data.knockoutRound };
}

export interface Board {
  /** Null for a plain category; a sub-match slot name for a team league. */
  label: string | null;
  entries: LeaderboardEntry[];
}

export interface CategoryLeaderboard {
  categoryName?: string;
  sportType?: string;
  boards: Board[];
}

/**
 * The endpoint answers in two shapes: a flat `leaderboard` for an ordinary
 * category, or one board per sub-match slot for a team league (Singles,
 * Doubles, Mixed run under a single categoryId and must not be merged into one
 * ranked list). Both are normalised to `boards` here so the screen has one shape.
 */
export async function getCategoryLeaderboard(categoryId: string): Promise<CategoryLeaderboard> {
  const res = await API.get(`/matches/leaderboard/${categoryId}`);
  const data = unwrap(res) ?? {};

  const boards: Board[] = Array.isArray(data.slots)
    ? data.slots.map((s: any) => ({
        label: s.label || `Slot ${s.slotNumber}`,
        entries: s.leaderboard ?? [],
      }))
    : [{ label: null, entries: data.leaderboard ?? [] }];

  return { categoryName: data.categoryName, sportType: data.sportType, boards };
}
