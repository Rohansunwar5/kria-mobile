import { eventsStrip, openForEntryCount, visibleTournaments } from '../src/lib/homePortal';
import type { Tournament } from '../src/store/slices/tournamentSlice';

const tournament = (over: Partial<Tournament>) => ({ _id: 't', status: 'registration_open', ...over }) as Tournament;

describe('visibleTournaments', () => {
  it('hides an organiser draft', () => {
    expect(visibleTournaments([tournament({ status: 'draft' })])).toEqual([]);
  });

  it('hides a deactivated tournament', () => {
    expect(visibleTournaments([tournament({ isActive: false })])).toEqual([]);
  });

  // Older documents predate the flag, so only an explicit `false` hides one.
  it('keeps a tournament whose isActive was never set', () => {
    expect(visibleTournaments([tournament({})])).toHaveLength(1);
  });

  it('keeps every other status', () => {
    const all = [tournament({ _id: 'a', status: 'ongoing' }), tournament({ _id: 'b', status: 'completed' })];
    expect(visibleTournaments(all).map((t) => t._id)).toEqual(['a', 'b']);
  });
});


// The strip says OPEN. `visibleTournaments` deliberately keeps `ongoing` and
// `completed` — right for the list, wrong for that word — so the count is its
// own function rather than a `.length` on the visible set.
describe('openForEntryCount', () => {
  it('counts only the tournaments taking entries in a mixed list', () => {
    const all = [
      tournament({ _id: 'a', status: 'registration_open' }),
      tournament({ _id: 'b', status: 'ongoing' }),
      tournament({ _id: 'c', status: 'registration_open' }),
      tournament({ _id: 'd', status: 'completed' }),
    ];
    expect(openForEntryCount(all)).toBe(2);
  });

  // The bug this closes: a screenful of finished events used to report itself
  // as open for entry.
  it('is zero when everything has started or finished', () => {
    const all = [
      tournament({ _id: 'a', status: 'ongoing' }),
      tournament({ _id: 'b', status: 'completed' }),
      tournament({ _id: 'c', status: 'cancelled' }),
    ];
    expect(openForEntryCount(all)).toBe(0);
  });

  it('never counts an organiser draft', () => {
    expect(openForEntryCount([tournament({ status: 'draft' })])).toBe(0);
  });

  // Composed through visibleTournaments, so a deactivated tournament is out of
  // the count for the same reason it is out of the list.
  it('never counts a deactivated tournament', () => {
    const all = [
      tournament({ _id: 'a', status: 'registration_open', isActive: false }),
      tournament({ _id: 'b', status: 'registration_open' }),
    ];
    expect(openForEntryCount(all)).toBe(1);
  });

  it('is zero for an empty list', () => {
    expect(openForEntryCount([])).toBe(0);
  });
});

describe('eventsStrip', () => {
  it('names the city when one is filtered', () => {
    expect(eventsStrip(3, 'Bangalore')).toBe('ORGANISER-HOSTED · 3 OPEN IN BANGALORE');
  });

  it('drops the city clause when the filter is All', () => {
    expect(eventsStrip(3, 'All')).toBe('ORGANISER-HOSTED · 3 OPEN');
  });
});
