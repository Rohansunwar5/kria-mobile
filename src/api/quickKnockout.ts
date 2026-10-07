import API from './axios';
import { unwrap } from './unwrap';
import type { QuickMatch } from './quickMatch';

export interface KnockoutPlayer {
  playerKey: string;
  playerId?: string;
  displayName: string;
  /** Cricket: absent = Any team. */
  teamId?: string;
  /** Cricket: placed by the draw, so a reshuffle deals them again. */
  drawn?: boolean;
}
export interface KnockoutTeam { teamId: string; name: string }
export interface KnockoutPair { pairId: string; playerKeys: [string, string]; byHost: boolean }
export interface KnockoutEntrant { entrantId: string; playerKeys: string[] }
export interface KnockoutFixture {
  fixtureId: string;
  round: number;
  position: number;
  entrantA?: string;
  entrantB?: string;
  bye: boolean;
  quickMatchId?: string;
  winnerEntrantId?: string;
}
export interface KnockoutAward { playerId: string; badge: string; title: string }

export interface QuickKnockout {
  _id: string;
  hostId: string;
  /** Withheld by the server from anyone not in the knockout. */
  joinCode?: string;
  name: string;
  sport: 'badminton' | 'cricket';
  format: 'singles' | 'doubles' | 'teams';
  matchConfig: { bestOf?: 1 | 3 | 5; pointsToWin?: 11 | 15 | 21; maxOvers?: number; playersPerTeam?: number };
  /** Cricket only. */
  teams?: KnockoutTeam[];
  status: 'waiting' | 'live' | 'completed' | 'cancelled';
  players: KnockoutPlayer[];
  pairs: KnockoutPair[];
  entrants: KnockoutEntrant[];
  fixtures: KnockoutFixture[];
  roundNames: string[];
  championEntrantId?: string;
  awardsEligible?: boolean;
  awards: KnockoutAward[];
  createdAt: string;
}

export type QuickCode = { kind: 'match'; data: QuickMatch } | { kind: 'knockout'; data: QuickKnockout };

export type CreateKnockoutBody =
  | { sport?: 'badminton'; format: 'singles' | 'doubles'; matchConfig: { bestOf: 1 | 3 | 5; pointsToWin: 11 | 15 | 21 }; name?: string }
  | { sport: 'cricket'; matchConfig: { maxOvers: number; playersPerTeam: number }; teamCount: number; name?: string };

const asKnockout = (res: unknown) => unwrap(res) as QuickKnockout;

export async function createQuickKnockout(body: CreateKnockoutBody): Promise<QuickKnockout> {
  return asKnockout(await API.post('/quick-knockout', body));
}
export async function getQuickKnockout(id: string): Promise<QuickKnockout> {
  return asKnockout(await API.get(`/quick-knockout/${id}`));
}
export async function listMyQuickKnockouts(): Promise<QuickKnockout[]> {
  return (unwrap(await API.get('/quick-knockout/mine')) as QuickKnockout[] | null) ?? [];
}
/** No team is Any team — the draw places them. */
export async function joinQuickKnockout(code: string, teamId?: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/join/${code.toUpperCase()}`, teamId ? { teamId } : undefined));
}
export async function claimKnockoutGuest(code: string, playerKey: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/join/${code.toUpperCase()}/claim`, { playerKey }));
}
export async function addKnockoutPlayer(id: string, body: { displayName: string } | { playerId: string }): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/players`, body));
}
export async function removeKnockoutPlayer(id: string, playerKey: string): Promise<QuickKnockout> {
  return asKnockout(await API.delete(`/quick-knockout/${id}/players/${playerKey}`));
}
export async function pairKnockoutPlayers(id: string, playerKeys: [string, string]): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/pairs`, { playerKeys }));
}
export async function unpairKnockoutPlayers(id: string, pairId: string): Promise<QuickKnockout> {
  return asKnockout(await API.delete(`/quick-knockout/${id}/pairs/${pairId}`));
}
export async function drawQuickKnockout(id: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/draw`));
}
export async function startQuickKnockout(id: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/start`));
}
export async function cancelQuickKnockout(id: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/cancel`));
}
export async function grantKnockoutAward(id: string, body: { playerId: string; badge: string }): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/awards`, body));
}
export async function moveKnockoutPlayer(id: string, playerKey: string, teamId: string | null): Promise<QuickKnockout> {
  return asKnockout(await API.patch(`/quick-knockout/${id}/players/${playerKey}`, { teamId }));
}
export async function addKnockoutTeam(id: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/teams`));
}
export async function removeKnockoutTeam(id: string, teamId: string): Promise<QuickKnockout> {
  return asKnockout(await API.delete(`/quick-knockout/${id}/teams/${teamId}`));
}
export async function renameKnockoutTeam(id: string, teamId: string, name: string): Promise<QuickKnockout> {
  return asKnockout(await API.patch(`/quick-knockout/${id}/teams/${teamId}`, { name }));
}
export async function settleKnockoutTie(id: string, body: { fixtureId: string; entrantId: string }): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/tie`, body));
}
export async function resolveQuickCode(code: string): Promise<QuickCode> {
  return unwrap(await API.get(`/quick-code/${code.toUpperCase()}`)) as QuickCode;
}
