import { eventsStrip, hasBegun, inProgress, openForEntryCount, posterCell, posterOrder, visibleTournaments } from '../src/lib/homePortal';
import { formatShortDate } from '../src/lib/format';
import type { QuickKnockout } from '../src/api/quickKnockout';
import type { QuickMatch } from '../src/api/quickMatch';
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

describe('inProgress', () => {
  const m = (_id: string, status: QuickMatch['status']) => ({ _id, status }) as QuickMatch;
  const k = (_id: string, status: QuickKnockout['status']) => ({ _id, status }) as QuickKnockout;

  // Being played beats filling up; at each stage the match, where a score is
  // running, beats the knockout. Finished ones are not in progress at all.
  it('orders by urgency and drops anything finished', () => {
    const order = inProgress(
      [m('m-wait', 'waiting'), m('m-live', 'live'), m('m-done', 'completed')],
      [k('k-live', 'live'), k('k-wait', 'waiting'), k('k-off', 'cancelled')],
    ).map((i) => (i.kind === 'match' ? i.match._id : i.knockout._id));

    expect(order).toEqual(['m-live', 'k-live', 'm-wait', 'k-wait']);
  });

  // A knockout creates every drawn match live at once; for one of those, live
  // only means drawn.
  describe('knockout matches', () => {
    const ko = { _id: 'k1', status: 'live', name: 'Re testing' } as QuickKnockout;
    const drawn = { _id: 'km', status: 'live', sport: 'badminton', knockoutId: 'k1', gameScores: [{ gameNumber: 1, side1Score: 0, side2Score: 0 }] } as QuickMatch;
    const begun = { ...drawn, gameScores: [{ gameNumber: 1, side1Score: 3, side2Score: 1 }] } as QuickMatch;

    it('leaves a drawn match to its knockout until scoring begins', () => {
      expect(inProgress([drawn], [ko]).map((i) => i.kind)).toEqual(['knockout']);
    });

    it('lets a begun match stand in for its knockout, carrying it for the label', () => {
      const items = inProgress([begun], [ko]);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ kind: 'match', match: { _id: 'km' }, knockout: { name: 'Re testing' } });
    });
  });
});

describe('hasBegun', () => {
  it('needs a point on the board for badminton', () => {
    expect(hasBegun({ sport: 'badminton', gameScores: [{ gameNumber: 1, side1Score: 0, side2Score: 0 }] } as QuickMatch)).toBe(false);
    expect(hasBegun({ sport: 'badminton', gameScores: [{ gameNumber: 1, side1Score: 0, side2Score: 1 }] } as QuickMatch)).toBe(true);
  });

  it('starts cricket at the recorded toss', () => {
    const setup = (recorded: boolean) => ({ toss: { recorded }, lineupsSet: false, side1Lineup: [], side2Lineup: [] }) as QuickMatch['cricketSetup'];
    expect(hasBegun({ sport: 'cricket', cricketSetup: setup(false) } as QuickMatch)).toBe(false);
    expect(hasBegun({ sport: 'cricket', cricketSetup: setup(true) } as QuickMatch)).toBe(true);
  });
});

describe('posterCell', () => {
  const NOW = Date.parse('2026-10-09T10:00:00.000Z');
  const HOUR = 3_600_000;
  const t = (over: Partial<Tournament>) =>
    ({ status: 'registration_open', startDate: '2026-10-18T00:00:00.000Z', endDate: '2026-10-20T00:00:00.000Z', registrationDeadline: '', ...over }) as Tournament;
  const closesIn = (ms: number) => posterCell(t({ registrationDeadline: new Date(NOW + ms).toISOString() }), NOW);

  // Rounded down: 5.9 days left is "5 days", never a sixth day nobody has.
  it('counts whole days left to enter, rounded down', () => {
    expect(closesIn(5.9 * 24 * HOUR)).toEqual({ label: 'Entries close', value: '5 days', urgent: true });
    expect(closesIn(1.5 * 24 * HOUR).value).toBe('1 day');
  });

  it('drops to hours inside the last day, and never rounds an hour up', () => {
    expect(closesIn(5.5 * HOUR).value).toBe('5 hrs');
    expect(closesIn(1.2 * HOUR).value).toBe('1 hr');
    expect(closesIn(0.5 * HOUR).value).toBe('< 1 hr');
  });

  // The status can lag the deadline; a passed deadline is not a countdown.
  it('falls back to the start date once the deadline has passed', () => {
    const cell = closesIn(-HOUR);
    expect(cell).toEqual({ label: 'Starts', value: formatShortDate('2026-10-18T00:00:00.000Z'), urgent: false });
  });

  it('shows the end date for a live or finished tournament', () => {
    expect(posterCell(t({ status: 'ongoing' }), NOW).label).toBe('Ends');
    expect(posterCell(t({ status: 'completed' }), NOW).label).toBe('Ended');
    expect(posterCell(t({ status: 'ongoing' }), NOW).value).toBe(formatShortDate('2026-10-20T00:00:00.000Z'));
  });
});

describe('posterOrder', () => {
  it('puts open tournaments first, soonest deadline first, then live, then the rest', () => {
    const order = posterOrder([
      tournament({ _id: 'live', status: 'ongoing' }),
      tournament({ _id: 'open-late', registrationDeadline: '2026-10-18T00:00:00.000Z' }),
      tournament({ _id: 'done', status: 'completed' }),
      tournament({ _id: 'open-soon', registrationDeadline: '2026-10-14T00:00:00.000Z' }),
    ]).map((x) => x._id);

    expect(order).toEqual(['open-soon', 'open-late', 'live', 'done']);
  });
});
