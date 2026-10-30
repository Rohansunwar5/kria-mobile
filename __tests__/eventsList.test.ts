import { dateSpan, eventQuery, facetLine, groupEvents, NO_FILTERS } from '../src/lib/eventsList';

const t = (id: string, status: string, startDate: string, over: Record<string, unknown> = {}) =>
  ({ _id: id, status, startDate, endDate: startDate, venue: { name: 'Court', city: 'Bengaluru' }, ...over }) as never;

it('features the soonest open event that has a banner, never one without', () => {
  const list = [
    t('a', 'registration_open', '2026-11-20'),
    t('b', 'registration_open', '2026-11-10', { bannerImage: 'b.png' }),
    t('c', 'registration_open', '2026-11-01'),
    t('d', 'auction_in_progress', '2026-10-30', { bannerImage: 'd.png' }),
  ];
  const g = groupEvents(list);
  expect((g.featured as { _id: string } | null)?._id).toBe('b');
  expect(g.upcoming.map((x: { _id: string }) => x._id)).toEqual(['d', 'c', 'a']);
  expect(groupEvents([t('a', 'registration_open', '2026-11-20')]).featured).toBeNull();
});

it('splits running, upcoming and past, past newest first', () => {
  const g = groupEvents([t('p1', 'completed', '2026-09-01'), t('n', 'ongoing', '2026-10-20'), t('p2', 'cancelled', '2026-09-20')]);
  expect(g.now.map((x: { _id: string }) => x._id)).toEqual(['n']);
  expect(g.past.map((x: { _id: string }) => x._id)).toEqual(['p2', 'p1']);
});

it('sends only the filters that are set, and search from 3 characters', () => {
  expect(eventQuery({ ...NO_FILTERS, sport: 'cricket' }, 'hs')).toEqual({ sport: 'cricket' });
  expect(eventQuery(NO_FILTERS, ' hsr ')).toEqual({ q: 'hsr' });
});

it('spans multi-day events and keeps one date for a single day', () => {
  expect(dateSpan('2026-10-26T10:00:00', '2026-11-02T10:00:00')).toBe('26 OCT – 2 NOV');
  expect(dateSpan('2026-10-20T10:00:00', '2026-10-20T18:00:00')).toBe('20 OCT');
});

// SERVER-GAPS #15: the Saved chip narrows the list to the player's bookmarks.
it('asks for saved events only when the chip is on', () => {
  expect(eventQuery(NO_FILTERS, '', true)).toEqual({ saved: 'true' });
  expect(eventQuery(NO_FILTERS, '', false)).toEqual({});
});

// SERVER-GAPS #7: each filter option says how many events it would show.
it('counts events under a filter option', () => {
  expect(facetLine(3)).toBe('3 events');
  expect(facetLine(1)).toBe('1 event');
  expect(facetLine(0)).toBe('No events right now');
  expect(facetLine(undefined)).toBe('No events right now');
});
