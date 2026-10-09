import type { Tournament } from '@/store/slices/tournamentSlice';

/**
 * What the events list actually shows: drafts and deactivated tournaments are
 * the organiser's, not the player's.
 */
export function visibleTournaments(tournaments: Tournament[]): Tournament[] {
  return tournaments.filter((t) => t.status !== 'draft' && t.isActive !== false);
}

/**
 * How many tournaments are genuinely open for entry. `visibleTournaments`
 * keeps `ongoing` and `completed` because a discovery list should show them,
 * but the strip says OPEN, and only `registration_open` takes an entry.
 */
export function openForEntryCount(tournaments: Tournament[]): number {
  return visibleTournaments(tournaments).filter((t) => t.status === 'registration_open').length;
}

/** The one-line strip above the events list. */
export function eventsStrip(openCount: number, city: string): string {
  const where = city === 'All' ? '' : ` IN ${city.toUpperCase()}`;
  return `ORGANISER-HOSTED · ${openCount} OPEN${where}`;
}
