import type { RosterPlayer } from '@/api/profileApi';
import type { TournamentCategory, TournamentTeam } from '@/api/tournaments';
import { initials } from '@/lib/matchCard';

export interface SquadRow {
  key: string;
  playerId?: string;
  name: string;
  initials: string;
  categories: string;
  price: number;
  role?: 'captain' | 'icon';
  me: boolean;
}

/** One row per person: the roster has one entry per registration. */
export function squad(roster: RosterPlayer[], categories: TournamentCategory[], meId?: string): SquadRow[] {
  const byKey = new Map<string, SquadRow>();
  for (const r of roster) {
    const key = r.playerId ?? r._id;
    const cat = categories.find((c) => c._id === r.categoryId)?.name;
    const price = r.auctionData?.soldPrice ?? 0;
    const role = r.role === 'captain' || r.role === 'icon' ? r.role : undefined;
    const row = byKey.get(key);
    if (!row) {
      const name = `${r.profile.firstName} ${r.profile.lastName}`.trim();
      byKey.set(key, { key, playerId: r.playerId, name, initials: initials(name), categories: cat ?? '', price, role, me: !!meId && r.playerId === meId });
      continue;
    }
    row.price += price;
    if (cat) row.categories = row.categories ? `${row.categories} · ${cat}` : cat;
    if (role === 'captain' || (role && row.role !== 'captain')) row.role = role;
  }
  const rank = (x: SquadRow) => (x.role === 'captain' ? 0 : x.role === 'icon' ? 1 : 2);
  return [...byKey.values()].sort((a, b) => rank(a) - rank(b) || b.price - a.price || a.name.localeCompare(b.name));
}

export function teamStats(team: TournamentTeam, rows: SquadRow[]) {
  return { players: rows.length, spent: team.initialBudget - team.budget, left: team.budget };
}

export function pickTeam(teams: TournamentTeam[], param?: string, myTeamId?: string): string | undefined {
  const has = (id?: string) => !!id && teams.some((t) => t._id === id);
  if (has(param)) return param;
  if (has(myTeamId)) return myTeamId;
  return teams[0]?._id;
}
