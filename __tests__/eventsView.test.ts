import { closingSoonest, coversDay, dateRange, dayOfEvent, dayStrip, eventSections } from '../src/lib/eventsView';
import type { Tournament } from '../src/store/slices/tournamentSlice';

const t = (over: Partial<Tournament>): Tournament => ({
  _id: 't',
  name: 'Kria Smash Cup',
  sport: 'badminton',
  status: 'registration_open',
  startDate: '2026-10-22T06:00:00.000Z',
  endDate: '2026-10-23T06:00:00.000Z',
  registrationDeadline: '2026-10-20T06:00:00.000Z',
  ...over,
}) as Tournament;

describe('eventsView', () => {
  // The old screen titled every non-featured tournament "Open for entry",
  // finished ones included. Each section must hold only its own statuses.
  it('features the open event closing soonest and sections the rest by status', () => {
    const list = [
      t({ _id: 'done', status: 'completed' }),
      t({ _id: 'late', registrationDeadline: '2026-10-25T00:00:00.000Z' }),
      t({ _id: 'live', status: 'ongoing' }),
      t({ _id: 'soon', registrationDeadline: '2026-10-12T00:00:00.000Z' }),
      t({ _id: 'auction', status: 'auction_in_progress' }),
    ];

    const featured = closingSoonest(list);
    expect(featured?._id).toBe('soon');

    const sections = eventSections(list, featured?._id);
    expect(sections.map((s) => [s.key, s.data.map((x) => x._id)])).toEqual([
      ['live', ['live']],
      ['open', ['late']],
      ['next', ['auction']],
      ['done', ['done']],
    ]);
  });

  it('promotes nothing when no event is open for entry', () => {
    expect(closingSoonest([t({ status: 'ongoing' }), t({ status: 'completed' })])).toBeUndefined();
  });

  it('marks the strip days a tournament runs on, first and last included', () => {
    const now = new Date(2026, 9, 21);
    const strip = dayStrip([t({}), t({ _id: 'l', status: 'ongoing', startDate: '2026-10-20T06:00:00.000Z', endDate: '2026-10-21T06:00:00.000Z' })], now, 4);
    expect(strip.map((d) => [d.key, d.has, d.live])).toEqual([
      ['2026-10-21', true, true],
      ['2026-10-22', true, false],
      ['2026-10-23', true, false],
      ['2026-10-24', false, false],
    ]);
    expect(coversDay(t({}), '2026-10-24')).toBe(false);
  });

  it('writes the shortest range that keeps the end date', () => {
    expect(dateRange('2026-10-22T06:00:00.000Z', '2026-10-23T06:00:00.000Z')).toMatch(/^22–23 Oct/);
    expect(dateRange('2026-09-30T06:00:00.000Z', '2026-10-02T06:00:00.000Z')).toMatch(/^30 Sept?–2 Oct/);
    expect(dateRange('2026-10-22T06:00:00.000Z', '2026-10-22T09:00:00.000Z')).toMatch(/^22 Oct/);
    expect(dateRange(undefined, undefined)).toBe('TBD');
  });

  it('counts the day of a running event, clamped to its length', () => {
    const live = t({ startDate: '2026-10-08T06:00:00.000Z', endDate: '2026-10-10T06:00:00.000Z' });
    expect(dayOfEvent(live, new Date(2026, 9, 9, 18))).toEqual({ day: 2, total: 3 });
    expect(dayOfEvent(live, new Date(2026, 9, 14))).toEqual({ day: 3, total: 3 });
  });
});
