import API from './axios';

const unwrap = (res: any) => res?.data?.data?.data ?? res?.data?.data ?? null;

export interface PublicPlayer {
  _id: string;
  firstName: string;
  lastName: string;
  sport?: string;
  location?: string;
  profileImage?: string;
  titles: string[];
}

export interface PublicHistoryEntry {
  _id: string;
  status: string;
  profile?: { skillLevel?: string };
  stats?: { matchesPlayed?: number; matchesWon?: number; pointsContributed?: number };
  createdAt: string;
  tournament?: { _id: string; name: string; sport?: string };
  category?: { _id: string; name: string; gender?: string } | null;
  team?: { _id: string; name: string; primaryColor?: string } | null;
}

export interface Team {
  _id: string;
  name: string;
  tournamentId: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  budget?: number;
  initialBudget?: number;
  playersCount?: number;
  totalSpent?: number;
  whatsappGroupLink?: string;
}

export interface RosterPlayer {
  _id: string;
  profile: { firstName: string; lastName: string; gender?: string; skillLevel?: string };
  auctionData?: { soldPrice?: number };
  status: string;
  playerId?: string;
}

export interface Announcement {
  _id: string;
  tournamentId: string;
  title?: string;
  message: string;
  severity: 'info' | 'important' | 'schedule_change';
  pinned: boolean;
  authorName: string;
  authorRole: string;
  createdAt: string;
}

/** A missing player is a 404, not an exception the screen has to catch. */
export async function getPublicPlayer(
  playerId: string
): Promise<{ player: PublicPlayer; history: PublicHistoryEntry[] } | null> {
  try {
    const res = await API.get(`/player/auth/public/${playerId}`);
    return unwrap(res);
  } catch {
    return null;
  }
}

export async function getTeam(teamId: string): Promise<Team | null> {
  try {
    const res = await API.get(`/teams/${teamId}`);
    return unwrap(res);
  } catch {
    return null;
  }
}

export async function getTeamRoster(teamId: string): Promise<RosterPlayer[]> {
  const res = await API.get(`/registrations/teams/${teamId}/roster`);
  const payload = unwrap(res) ?? {};
  return Array.isArray(payload.players) ? payload.players : [];
}

/** Pinned notices first, then newest — the order the board is read in. */
export async function listAnnouncements(tournamentId: string): Promise<Announcement[]> {
  const res = await API.get(`/tournaments/${tournamentId}/announcements`);
  const list: Announcement[] = unwrap(res) ?? [];
  return [...list].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
