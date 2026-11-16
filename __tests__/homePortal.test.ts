import { hasBegun, inProgress, visibleTournaments } from '../src/lib/homePortal';
import type { QuickKnockout } from '../src/api/quickKnockout';
import type { QuickMatch } from '../src/api/quickMatch';
import type { Tournament } from '../src/api/tournaments';

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
