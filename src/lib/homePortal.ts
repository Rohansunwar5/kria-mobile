import type { QuickMatch } from '@/api/quickMatch';
import type { Tournament } from '@/store/slices/tournamentSlice';

export type Portal = 'events' | 'play';

/**
 * What the events side actually shows: drafts and deactivated tournaments are
 * the organiser's, not the player's. `EventsPortal` renders this set and the
 * home strip counts it, so it is defined once — two copies of the predicate
 * would drift and the strip would start claiming a number nobody can see.
 */
export function visibleTournaments(tournaments: Tournament[]): Tournament[] {
  return tournaments.filter((t) => t.status !== 'draft' && t.isActive !== false);
}

/**
 * How many tournaments are genuinely open for entry.
 *
 * `visibleTournaments` is a VISIBILITY predicate: it drops only the organiser's
 * drafts and deactivated events, and deliberately keeps `ongoing` and
 * `completed` because a discovery list should still show them. Counting that
 * set was wrong for a strip that says OPEN — a page of finished events reported
 * itself as open for entry. Only `registration_open` actually takes an entry,
 * so that is what the strip counts, still composed through the visibility
 * predicate so the draft/inactive exclusions cannot drift apart from it.
 */
export function openForEntryCount(tournaments: Tournament[]): number {
  return visibleTournaments(tournaments).filter((t) => t.status === 'registration_open').length;
}

/** Whether any of your quick matches is in progress. This is what puts the dot
 *  on the PLAY tab — the only unprompted reason to cross portals. */
export function hasLiveQuickMatch(matches: QuickMatch[]): boolean {
  return matches.some((m) => m.status === 'live');
}

/**
 * The one-line strip under the switch. It says what is behind the side you are
 * on, so the portal you are not looking at is never a mystery.
 */
export function portalStrip(
  portal: Portal,
  opts: { openCount: number; city: string; played: number; live: boolean },
): string {
  if (portal === 'play') {
    if (opts.live) return 'YOUR GAME · 1 LIVE NOW';
    if (opts.played === 0) return 'YOUR GAME · NOTHING PLAYED YET';
    return `YOUR GAME · ${opts.played} PLAYED`;
  }
  const where = opts.city === 'All' ? '' : ` IN ${opts.city.toUpperCase()}`;
  return `ORGANISER-HOSTED · ${opts.openCount} OPEN${where}`;
}
