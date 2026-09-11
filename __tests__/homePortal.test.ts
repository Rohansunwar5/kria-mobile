import { hasLiveQuickMatch, portalStrip, visibleTournaments } from '../src/lib/homePortal';
import type { QuickMatch } from '../src/api/quickMatch';
import type { Tournament } from '../src/store/slices/tournamentSlice';

const match = (status: QuickMatch['status']) => ({ status }) as QuickMatch;

const tournament = (over: Partial<Tournament>) => ({ _id: 't', status: 'registration_open', ...over }) as Tournament;

// EventsPortal renders this set and the home strip counts it. They used to hold
// a copy of the predicate each; this is the single definition both now call.
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

describe('hasLiveQuickMatch', () => {
  it('is true when any match is live', () => {
    expect(hasLiveQuickMatch([match('completed'), match('live')])).toBe(true);
  });

  it('is false for completed and cancelled matches only', () => {
    expect(hasLiveQuickMatch([match('completed'), match('cancelled')])).toBe(false);
  });

  it('is false for an empty list', () => {
    expect(hasLiveQuickMatch([])).toBe(false);
  });
});

describe('portalStrip', () => {
  it('names the city when one is filtered', () => {
    expect(portalStrip('events', { openCount: 3, city: 'Bangalore', played: 0, live: false }))
      .toBe('ORGANISER-HOSTED · 3 OPEN IN BANGALORE');
  });

  it('drops the city clause when the filter is All', () => {
    expect(portalStrip('events', { openCount: 3, city: 'All', played: 0, live: false }))
      .toBe('ORGANISER-HOSTED · 3 OPEN');
  });

  it('uses the singular for one event', () => {
    expect(portalStrip('events', { openCount: 1, city: 'All', played: 0, live: false }))
      .toBe('ORGANISER-HOSTED · 1 OPEN');
  });

  // A live match is the one thing worth crossing portals for unprompted, so it
  // outranks the career count in the strip.
  it('leads with the live match on the play side', () => {
    expect(portalStrip('play', { openCount: 0, city: 'All', played: 47, live: true }))
      .toBe('YOUR GAME · 1 LIVE NOW');
  });

  it('falls back to the career count when nothing is live', () => {
    expect(portalStrip('play', { openCount: 0, city: 'All', played: 47, live: false }))
      .toBe('YOUR GAME · 47 PLAYED');
  });

  it('says so plainly when nothing has been played', () => {
    expect(portalStrip('play', { openCount: 0, city: 'All', played: 0, live: false }))
      .toBe('YOUR GAME · NOTHING PLAYED YET');
  });
});
