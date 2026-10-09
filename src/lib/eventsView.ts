import { formatShortDate } from '@/lib/format';
import { posterOrder } from '@/lib/homePortal';
import type { Tournament } from '@/store/slices/tournamentSlice';

// The Events tab's view logic: which tournament leads, how the rest group,
// and the date strip. Pure, so the screen only renders what these return.

const DAY = 24 * 60 * 60 * 1000;

export type SectionKey = 'live' | 'open' | 'next' | 'done';

const SECTION_ORDER: SectionKey[] = ['live', 'open', 'next', 'done'];

export const SECTION_TITLES: Record<SectionKey, string> = {
  live: 'Live now',
  open: 'Open for entry',
  next: 'Coming up',
  done: 'Finished',
};

/** Each status belongs to exactly one section, so a heading never lists a
 *  tournament its title does not describe. */
export function sectionOf(status: string): SectionKey {
  if (status === 'ongoing') return 'live';
  if (status === 'registration_open') return 'open';
  if (status === 'completed' || status === 'cancelled') return 'done';
  return 'next';
}

/** The big card: the open tournament whose entries close first. Nothing else
 *  is promoted — a live one has its own section. */
export function closingSoonest(tournaments: Tournament[]): Tournament | undefined {
  const first = posterOrder(tournaments)[0];
  return first?.status === 'registration_open' ? first : undefined;
}

/** Everything but the big card, by section, empty sections dropped. Open
 *  tournaments keep `posterOrder`'s closing-soonest order. */
export function eventSections(tournaments: Tournament[], featuredId?: string) {
  const ordered = posterOrder(tournaments).filter((t) => t._id !== featuredId);
  return SECTION_ORDER
    .map((key) => ({ key, title: SECTION_TITLES[key], data: ordered.filter((t) => sectionOf(t.status) === key) }))
    .filter((s) => s.data.length > 0);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A local calendar day as `YYYY-MM-DD`, which also sorts as a string. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whether the tournament runs on `day`, its first and last days included. */
export function coversDay(t: Pick<Tournament, 'startDate' | 'endDate'>, day: string): boolean {
  if (!t.startDate) return false;
  return dayKey(new Date(t.startDate)) <= day && day <= dayKey(new Date(t.endDate || t.startDate));
}

export interface StripDay {
  key: string;
  date: Date;
  /** Some tournament runs that day. */
  has: boolean;
  /** A live tournament runs that day. */
  live: boolean;
}

/** `count` days from today, each marked when a tournament runs on it.
 *  ponytail: a fixed three-week window, so anything later shows in the list
 *  but not on the strip. Page the strip if far-off events matter. */
export function dayStrip(tournaments: Tournament[], now = new Date(), count = 21): StripDay[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = dayKey(date);
    const on = tournaments.filter((t) => coversDay(t, key));
    return { key, date, has: on.length > 0, live: on.some((t) => t.status === 'ongoing') };
  });
}

/** "22 Oct", "22–23 Oct" or "30 Sept–2 Oct": the shortest range that stays
 *  unambiguous, so a card never cuts the end date off. */
export function dateRange(start?: string, end?: string): string {
  if (!start) return 'TBD';
  const s = new Date(start);
  const e = new Date(end || start);
  if (dayKey(s) === dayKey(e)) return formatShortDate(start);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) return `${s.getDate()}–${formatShortDate(end)}`;
  return `${formatShortDate(start)}–${formatShortDate(end)}`;
}

/** Which day of a running tournament today is, clamped to its own length. */
export function dayOfEvent(t: Pick<Tournament, 'startDate' | 'endDate'>, now = new Date()): { day: number; total: number } {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const start = startOf(new Date(t.startDate));
  const total = Math.max(1, Math.round((startOf(new Date(t.endDate || t.startDate)) - start) / DAY) + 1);
  const day = Math.round((startOf(now) - start) / DAY) + 1;
  return { day: Math.min(Math.max(day, 1), total), total };
}
