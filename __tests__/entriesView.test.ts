import { entryRows } from '../src/lib/entriesView';
import type { MyEntry } from '../src/api/tournaments';

const T = { _id: 't1', name: 'Smash Open', sport: 'cricket' } as NonNullable<MyEntry['tournament']>;
const C = { _id: 'c1', name: "Women's Singles", sport: 'badminton' } as NonNullable<MyEntry['category']>;

const entry = (o: Partial<MyEntry> = {}): MyEntry => ({
  _id: 'e1', tournamentId: 't1', categoryId: 'c1', createdAt: '2026-10-01T00:00:00Z', status: 'pending',
  tournament: T, category: C, ...o,
});
const one = (e: MyEntry) => { const r = entryRows([e]); return r.active[0] ?? r.closed[0]; };

it('pending', () => {
  expect(one(entry())).toMatchObject({ status: 'Awaiting approval', tone: 'text2', canWithdraw: true });
  expect(entryRows([entry()]).active).toHaveLength(1);
});
it('approved', () => expect(one(entry({ status: 'approved' }))).toMatchObject({ status: 'Approved', tone: 'text', canWithdraw: true }));
it('auctioned with price, assigned without', () => {
  expect(one(entry({ status: 'auctioned', auctionData: { soldPrice: 12000 } }))).toMatchObject({ status: 'Drafted · sold ₹12,000', tone: 'accentInk', canWithdraw: false });
  expect(one(entry({ status: 'assigned' })).status).toBe('Drafted');
});
it('rejected and withdrawn are closed', () => {
  const r = entryRows([entry({ status: 'rejected' }), entry({ _id: 'e2', status: 'withdrawn' })]);
  expect(r.active).toHaveLength(0);
  expect(r.closed.find((x) => x.id === 'e1')).toMatchObject({ status: 'Not accepted by the organiser', tone: 'lossInk' });
  expect(r.closed.find((x) => x.id === 'e2')).toMatchObject({ status: 'Withdrawn', tone: 'text4' });
});
it('finished tournaments close the entry', () => {
  const r = entryRows([entry({ status: 'approved', tournament: { ...T, status: 'completed' } })]);
  expect(r.closed[0]).toMatchObject({ status: 'Tournament completed', tone: 'text3', canWithdraw: false });
  expect(entryRows([entry({ status: 'approved', tournament: { ...T, status: 'cancelled' } })]).closed[0].status).toBe('Tournament cancelled');
});
it('an entry the server could not name still lists', () => {
  const r = entryRows([entry({ tournament: null, category: null }), entry({ _id: 'e2', status: 'withdrawn', tournament: null, category: null })]);
  expect(r.active[0]).toMatchObject({ name: 'Tournament', sub: '', canWithdraw: true });
  expect(r.closed).toHaveLength(1);
});
it('sub uses category name and sport, falling back to the tournament sport', () => {
  expect(one(entry()).sub).toBe("Women's Singles · Badminton");
  expect(one(entry({ category: { ...C, sport: undefined } })).sub).toBe("Women's Singles · Cricket");
});
it('says what was paid, or what is still owed', () => {
  expect(one(entry({ payment: { status: 'paid', amount: 628.32 } })).money).toBe('Paid ₹628.32');
  expect(one(entry({ category: { ...C, isPaidRegistration: true, registrationFee: 600 } })).money).toBe('₹600 to pay');
  // A free category owes nothing, and a withdrawn entry is not chased for money.
  expect(one(entry()).money).toBeUndefined();
  expect(one(entry({ status: 'withdrawn', category: { ...C, isPaidRegistration: true, registrationFee: 600 } })).money).toBeUndefined();
});
it('newest first', () => {
  const r = entryRows([entry({ _id: 'a', createdAt: '2026-01-01' }), entry({ _id: 'b', createdAt: '2026-05-01' })]);
  expect(r.active.map((x) => x.id)).toEqual(['b', 'a']);
});
it('names a doubles partner', () => {
  expect(one(entry({ status: 'assigned', partner: { registrationId: 'e9', name: 'Priya Nair' } })).partner).toBe('Partner: Priya Nair');
  expect(one(entry()).partner).toBeUndefined();
});
