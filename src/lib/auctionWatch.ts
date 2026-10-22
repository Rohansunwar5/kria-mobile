import type { AuctionStatus, AuctionStatusResponse, AuctionPlayer, AuctionTeam, AuctionSoldLog } from '@/api/auction';
import type { MyEntry, TournamentTeam } from '@/api/tournaments';
import { rupees } from '@/lib/format';

export type AuctionPill = 'Live' | 'Paused' | 'Tie-breaker' | 'Starts soon' | 'Finished';

export function auctionPill(a: AuctionStatus | null): AuctionPill {
  if (!a) return 'Starts soon';
  if (a.liveBid?.tieBreakerActive) return 'Tie-breaker';
  switch (a.status) {
    case 'in_progress':
    case 'sold': return 'Live';
    case 'paused': return 'Paused';
    case 'completed': return 'Finished';
    default: return 'Starts soon';
  }
}

export function auctionSubline(a: AuctionStatus): string {
  const player = `Player ${a.currentPlayerIndex + 1} of ${a.totalPlayers}`;
  return a.rotationCount > 0 ? `Unsold round ${a.rotationCount} · ${player}` : `${player} · ${a.unsoldCount} unsold`;
}

export function onBlockLine(p: AuctionPlayer): string {
  const { skillLevel, age } = p.profile;
  const skill = skillLevel ? skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1) : null;
  return [skill, age, `Base price ${rupees(p.auctionData.basePrice)}`].filter((x) => x != null && x !== '').join(' · ');
}

export function lastSale(d: AuctionStatusResponse, soldLog: AuctionSoldLog[]) {
  const r = d.auction.lastSoldResult;
  if (r) return { player: r.playerName, team: r.teamName, price: rupees(r.soldPrice) };
  if (!soldLog.length) return null;
  const n = soldLog.reduce((a, b) => (Date.parse(b.timestamp) > Date.parse(a.timestamp) ? b : a));
  return { player: n.playerName, team: n.teamName, price: rupees(n.finalPrice) };
}

export function bidRows(a: AuctionStatus, teams: AuctionTeam[]) {
  return a.liveBid.bidHistory.slice(-5).reverse().map((b, i) => ({
    key: `${b.timestamp}-${b.teamId}-${b.amount}`,
    team: b.teamName,
    logo: teams.find((t) => t._id === b.teamId)?.logo,
    amount: rupees(b.amount),
    newest: i === 0,
  }));
}

export function purseCards(teams: AuctionTeam[]) {
  return teams.map((t) => ({
    key: t._id,
    name: t.name,
    logo: t.logo,
    left: rupees(t.budget),
    spentPct: t.initialBudget > 0 ? (t.totalSpent * 100) / t.initialBudget : 0,
    sub: `${t.playersCount} ${t.playersCount === 1 ? 'player' : 'players'} · ${rupees(t.totalSpent)} spent`,
  }));
}

export function tieBreakLine(a: AuctionStatus, teams: AuctionTeam[]): string | null {
  const { tieBreakerActive, tiedTeams, spinWinnerId } = a.liveBid;
  const name = (id: string) => teams.find((t) => t._id === id)?.name ?? 'A team';
  if (spinWinnerId) return `${name(spinWinnerId)} won the tie-break.`;
  if (!tieBreakerActive || !tiedTeams?.length) return null;
  const names = tiedTeams.map(name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `Tied between ${list}. The organiser breaks the tie.`;
}

export function myAuctionResult(
  entry: MyEntry | undefined,
  d: AuctionStatusResponse,
  teams: TournamentTeam[],
): { title: string; line?: string; teamId?: string } | null {
  if (!entry || entry.status === 'withdrawn' || entry.status === 'rejected') return null;
  if ((entry.status === 'auctioned' || entry.status === 'assigned') && entry.teamId) {
    const sold = entry.auctionData?.soldPrice;
    const name = teams.find((t) => t._id === entry.teamId)?.name ?? 'a team';
    return { title: `You went to ${name}`, ...(sold ? { line: `Sold for ${rupees(sold)}` } : {}), teamId: entry.teamId };
  }
  if (d.currentPlayer?._id === entry._id) return { title: "You're on the block" };
  if (d.unsold?.some((u) => u.registrationId === entry._id)) return { title: "You're unsold this round" };
  const up = d.upcoming?.find((u) => u.registrationId === entry._id);
  if (up) return { title: `You're up in ${up.queueIndex - d.auction.currentPlayerIndex}` };
  return { title: "You're in the pool" };
}
