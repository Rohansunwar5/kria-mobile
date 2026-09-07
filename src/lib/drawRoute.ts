import type { Category } from '@/store/slices/registrationSlice';

export type DrawKind = 'auction' | 'teamLeague' | 'bracket' | 'none';

/** `IAuctionStatus` on the server. Lives on the auction document, NOT the
 *  category — an organiser may never advance the category past 'auction', so
 *  this is the only thing that says whether bidding is still happening. */
export type AuctionState = 'not_started' | 'in_progress' | 'paused' | 'sold' | 'completed';

/** `label` is the row's sub-line, `short` the pill beside it — the two sit next
 *  to each other, so the pill must not repeat the sentence. */
const AUCTION_TAG: Record<AuctionState, { label: string; short: string; live: boolean }> = {
  not_started: { label: 'Auction not started', short: 'Soon', live: false },
  in_progress: { label: 'Auction live', short: 'Live', live: true },
  // 'sold' is the beat right after a hammer falls — still a running auction.
  sold: { label: 'Auction live', short: 'Live', live: true },
  paused: { label: 'Auction paused', short: 'Paused', live: false },
  completed: { label: 'Auction ended', short: 'Ended', live: false },
};

/** Unknown state reads as live: the row must not flicker while the status
 *  request is in flight. */
export function auctionTag(state?: AuctionState): { label: string; short: string; live: boolean } {
  return (state && AUCTION_TAG[state]) || AUCTION_TAG.in_progress;
}

/** Statuses at which a draw exists and is worth opening. Before this the
 *  category has no matches; `groups_configured`/`bracket_configured` mean the
 *  fixtures are generated but play has not started. */
const DRAWN = ['groups_configured', 'bracket_configured', 'ongoing', 'completed'];

/**
 * The Draw tab absorbs what used to be three tabs — auction, bracket and team
 * league. One category resolves to exactly one of them.
 *
 * A live auction wins over everything: a team-league category still auctions
 * its players before any tie is played.
 */
export function drawDestination(
  category: Category,
  tournamentId: string,
  auction?: AuctionState
): { kind: DrawKind; href: string } {
  const id = category._id;

  // A finished auction hands the row to the draw even though the category status
  // still says 'auction' — advancing it is a manual step organisers often skip.
  if (category.status === 'auction' && auction !== 'completed') {
    return { kind: 'auction', href: `/auction/${tournamentId}/${id}` };
  }
  if (category.status !== 'auction' && !DRAWN.includes(category.status)) {
    return { kind: 'none', href: '' };
  }
  return drawRow(category, tournamentId);
}

function drawRow(category: Category, tournamentId: string): { kind: DrawKind; href: string } {
  return category.bracketType === 'team_league'
    ? { kind: 'teamLeague', href: `/team-league/${tournamentId}/${category._id}` }
    : { kind: 'bracket', href: `/bracket/${tournamentId}/${category._id}` };
}

/**
 * Rows under the main one. The auction and the draw are not mutually exclusive:
 * an organiser can generate a bracket while bidding is still open, so whichever
 * of the two is not the main row goes here.
 */
export function drawSecondary(
  category: Category,
  tournamentId: string,
  auction?: AuctionState
): { label: string; href: string }[] {
  if (category.status !== 'auction') return [];

  if (auction === 'completed') {
    return [{ label: 'Auction result', href: `/auction/${tournamentId}/${category._id}` }];
  }
  const row = drawRow(category, tournamentId);
  return [{ label: row.kind === 'teamLeague' ? 'League table' : 'Bracket', href: row.href }];
}

export const DRAW_LABEL: Record<DrawKind, string> = {
  auction: 'Auction live',
  teamLeague: 'League table',
  bracket: 'Bracket',
  none: 'Not drawn yet',
};
