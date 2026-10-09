import type { QuickKnockout } from '@/api/quickKnockout';
import type { QuickMatch } from '@/api/quickMatch';
import { formatShortDate } from '@/lib/format';
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

/** A match in progress carries its knockout when it belongs to one, so the top
 *  card can say which knockout and round it is. */
export type InProgress =
  | { kind: 'match'; match: QuickMatch; knockout?: QuickKnockout }
  | { kind: 'knockout'; knockout: QuickKnockout };

/**
 * Whether scoring has begun: a point on the board, or for cricket a recorded
 * toss — from then on the scorer is working on this match.
 */
export function hasBegun(match: QuickMatch): boolean {
  if (match.sport === 'cricket') return Boolean(match.cricketSetup?.toss?.recorded);
  return (match.gameScores ?? []).some((g) => g.side1Score + g.side2Score > 0);
}

/**
 * Everything of yours still unfinished, most urgent first: anything being
 * played before anything still filling up, and at each stage a quick match
 * before a knockout, since the match is where a score is running. Home's hero
 * takes the first; the rest list under it, so nothing in progress drops off
 * home.
 *
 * A knockout creates every drawn match live at once, so for a knockout match
 * "live" only means "drawn". It joins in once scoring has begun, and while it
 * does it stands in for its knockout rather than listing beside it — the match
 * screen links back to the bracket.
 */
export function inProgress(matches: QuickMatch[], knockouts: QuickKnockout[]): InProgress[] {
  const shown = matches.filter((m) => !m.knockoutId || (m.status === 'live' && hasBegun(m)));
  const playing = new Set(shown.map((m) => m.knockoutId).filter(Boolean));
  const at = (status: 'live' | 'waiting'): InProgress[] => [
    ...shown
      .filter((m) => m.status === status)
      .map((match) => ({ kind: 'match' as const, match, knockout: knockouts.find((k) => k._id === match.knockoutId) })),
    ...knockouts
      .filter((k) => k.status === status && !playing.has(k._id))
      .map((knockout) => ({ kind: 'knockout' as const, knockout })),
  ];
  return [...at('live'), ...at('waiting')];
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * The last cell of a tournament poster: what happens next. While entries are
 * open that is the time left to enter, rounded DOWN so a poster never promises
 * more time than there is.
 */
export function posterCell(
  t: Pick<Tournament, 'status' | 'registrationDeadline' | 'startDate' | 'endDate'>,
  now = Date.now(),
): { label: string; value: string; urgent: boolean } {
  const left = Date.parse(t.registrationDeadline) - now;
  if (t.status === 'registration_open' && left > 0) {
    let value: string;
    if (left < HOUR) value = '< 1 hr';
    else if (left < DAY) {
      const h = Math.floor(left / HOUR);
      value = `${h} hr${h === 1 ? '' : 's'}`;
    } else {
      const d = Math.floor(left / DAY);
      value = `${d} day${d === 1 ? '' : 's'}`;
    }
    return { label: 'Entries close', value, urgent: true };
  }
  if (t.status === 'ongoing') return { label: 'Ends', value: formatShortDate(t.endDate), urgent: false };
  if (t.status === 'completed') return { label: 'Ended', value: formatShortDate(t.endDate), urgent: false };
  return { label: 'Starts', value: formatShortDate(t.startDate), urgent: false };
}

/** Home's poster order: open tournaments first, closing soonest first, then
 *  live ones, then the rest — each group otherwise in the server's order. */
export function posterOrder(tournaments: Tournament[]): Tournament[] {
  const group = (t: Tournament) => (t.status === 'registration_open' ? 0 : t.status === 'ongoing' ? 1 : 2);
  return [...tournaments].sort(
    (a, b) =>
      group(a) - group(b) ||
      (group(a) === 0 ? Date.parse(a.registrationDeadline) - Date.parse(b.registrationDeadline) : 0),
  );
}
