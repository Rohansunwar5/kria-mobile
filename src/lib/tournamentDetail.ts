import type { Category } from '@/store/slices/registrationSlice';
import { drawDestination, drawSecondary, type AuctionState } from '@/lib/drawRoute';

// The tournament detail page's view logic. Pure, so the screen only lays out
// what these return.

/** Which part of the page leads: the result once it is over, entry while it is
 *  open, play (live matches, your team, the draw) the rest of the time. */
export type DetailPhase = 'result' | 'entry' | 'play';

export function detailPhase(status: string): DetailPhase {
  if (status === 'completed' || status === 'cancelled') return 'result';
  if (status === 'registration_open') return 'entry';
  return 'play';
}

/** The cheapest way in: "Free" when any category is, else the lowest fee. */
export function entryFrom(categories: Pick<Category, 'isPaidRegistration' | 'registrationFee'>[]): string | null {
  if (categories.length === 0) return null;
  if (categories.some((c) => !c.isPaidRegistration || !c.registrationFee)) return 'Free';
  return `₹${Math.min(...categories.map((c) => c.registrationFee)).toLocaleString('en-IN')}`;
}

export function feeLabel(c: Pick<Category, 'isPaidRegistration' | 'registrationFee'>): string {
  return c.isPaidRegistration && c.registrationFee ? `₹${c.registrationFee.toLocaleString('en-IN')}` : 'Free';
}

export interface CategoryLink {
  label: string;
  href: string;
  live: boolean;
}

/**
 * Every place a category leads, as buttons on its card — what the Draw and
 * Auction tabs used to split between them. The draw (bracket or league
 * table) comes first, then standings, then the auction. A live auction leads
 * instead. A finished auction always keeps its link, so who went where stays
 * reachable after the category moves on.
 */
export function categoryLinks(category: Category, tournamentId: string, auction?: AuctionState, sport?: string): CategoryLink[] {
  const auctionHref = `/auction/${tournamentId}/${category._id}`;
  const dest = drawDestination(category, tournamentId, auction);
  const links: CategoryLink[] = [];

  if (dest.kind === 'auction') {
    const live = auction === 'in_progress' || auction === 'sold' || auction === undefined;
    links.push({ label: live ? 'Auction live' : 'Auction', href: dest.href, live });
  } else if (dest.kind !== 'none') {
    links.push({ label: dest.kind === 'teamLeague' ? 'League' : 'Bracket', href: dest.href, live: false });
  }

  for (const s of drawSecondary(category, tournamentId, auction)) {
    links.push({ label: s.href === auctionHref ? 'Auction' : s.label === 'League table' ? 'League' : s.label, href: s.href, live: false });
  }

  if (dest.kind !== 'none') {
    const standings = (category.sport ?? sport) === 'cricket' ? `/cricket/leaderboard/${category._id}` : `/leaderboard/${category._id}`;
    links.push({ label: 'Standings', href: standings, live: false });
  }

  if (auction && !links.some((l) => l.href === auctionHref)) {
    links.push({ label: 'Auction', href: auctionHref, live: false });
  }
  return links;
}
