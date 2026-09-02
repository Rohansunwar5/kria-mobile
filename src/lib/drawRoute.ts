import type { Category } from '@/store/slices/registrationSlice';

export type DrawKind = 'auction' | 'teamLeague' | 'bracket' | 'none';

/**
 * The Draw tab absorbs what used to be three tabs — auction, bracket and team
 * league. One category resolves to exactly one of them.
 *
 * A live auction wins over everything: a team-league category still auctions
 * its players before any tie is played.
 */
export function drawDestination(category: Category, tournamentId: string): { kind: DrawKind; href: string } {
  const id = category._id;

  if (category.status === 'auction_in_progress') {
    return { kind: 'auction', href: `/auction/${tournamentId}/${id}` };
  }
  if (category.status !== 'ongoing' && category.status !== 'completed') {
    return { kind: 'none', href: '' };
  }
  if (category.bracketType === 'team_league') {
    return { kind: 'teamLeague', href: `/team-league/${tournamentId}/${id}` };
  }
  return { kind: 'bracket', href: `/bracket/${tournamentId}/${id}` };
}

export const DRAW_LABEL: Record<DrawKind, string> = {
  auction: 'Auction live',
  teamLeague: 'League table',
  bracket: 'Bracket',
  none: 'Not drawn yet',
};
