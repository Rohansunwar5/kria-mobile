import API from './axios';
import { unwrap } from './unwrap';
import type { QuickMatch } from './quickMatch';

export interface KnockoutPlayer { playerKey: string; playerId?: string; displayName: string }
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
  sport: 'badminton';
  format: 'singles' | 'doubles';
  matchConfig: { bestOf: 1 | 3 | 5; pointsToWin: 11 | 15 | 21 };
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

export interface CreateKnockoutBody {
  format: 'singles' | 'doubles';
  matchConfig: { bestOf: 1 | 3 | 5; pointsToWin: 11 | 15 | 21 };
  name?: string;
}

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
export async function joinQuickKnockout(code: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/join/${code.toUpperCase()}`));
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
export async function resolveQuickCode(code: string): Promise<QuickCode> {
  return unwrap(await API.get(`/quick-code/${code.toUpperCase()}`)) as QuickCode;
}
