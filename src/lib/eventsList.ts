import type { Tournament } from '@/store/slices/tournamentSlice';
import { datePill } from '@/lib/homeView';

/**
 * Sports a tournament can be created for: the server's sport registry
 * (`assertSportsRegistered`). Narrower than RANKED_SPORTS, since table tennis
 * is played only as quick matches.
 */
export const EVENT_SPORTS = ['badminton', 'cricket'];

/** The stages GET /tournament filters on (exact match, one at a time). */
export const EVENT_STATUSES = [
  { value: 'registration_open', label: 'Registration open' },
  { value: 'auction_in_progress', label: 'Auction live' },
  { value: 'ongoing', label: 'Happening now' },
  { value: 'completed', label: 'Completed' },
];

export type EventFilters = { sport: string; status: string; city: string };
export const NO_FILTERS: EventFilters = { sport: '', status: '', city: '' };

/** Only the set filters, as query params; `q` is sent from 3 characters. `saved` narrows to the player's bookmarks. */
export function eventQuery(f: EventFilters, q = '', saved = false) {
  const out: Record<string, string> = {};
  if (f.sport) out.sport = f.sport;
  if (f.status) out.status = f.status;
  if (f.city) out.city = f.city;
  if (q.trim().length >= 3) out.q = q.trim();
  if (saved) out.saved = 'true';
  return out;
}

const UPCOMING = ['registration_open', 'registration_closed', 'auction_in_progress'];
const byStart = (a: Tournament, b: Tournament) => a.startDate.localeCompare(b.startDate);

/**
 * DESIGN §6 Events: featured = the most relevant open event with a banner
 * (open for entry, then auction, then running). Happening now and Coming up
 * get cards, soonest first; past events collapse to rows, newest first.
 */
export function groupEvents(list: Tournament[]) {
  const withBanner = (statuses: string[]) => list.filter((t) => t.bannerImage && statuses.includes(t.status)).sort(byStart)[0];
  const featured = withBanner(['registration_open']) ?? withBanner(['auction_in_progress']) ?? withBanner(['ongoing']) ?? null;
  const rest = list.filter((t) => t !== featured);
  return {
    featured,
    now: rest.filter((t) => t.status === 'ongoing').sort(byStart),
    upcoming: rest.filter((t) => UPCOMING.includes(t.status)).sort(byStart),
    past: rest.filter((t) => t.status === 'completed' || t.status === 'cancelled').sort((a, b) => byStart(b, a)),
  };
}

/** "26 OCT – 2 NOV", or one date for a one-day event. */
export function dateSpan(start: string, end?: string) {
  const a = datePill(start);
  const b = end ? datePill(end) : a;
  return a === b ? a : `${a} – ${b}`;
}

export function featuredCta(status: string) {
  if (status === 'registration_open') return 'View categories';
  if (status === 'auction_in_progress') return 'Follow the auction';
  if (status === 'ongoing') return 'Follow it live';
  return 'View event';
}

/** The line under a filter option (mock 1f), from GET /tournament/facets. */
export function facetLine(count?: number) {
  if (!count) return 'No events right now';
  return `${count} ${count === 1 ? 'event' : 'events'}`;
}
