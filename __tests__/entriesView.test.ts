import { entryRows, type EntryLookup } from '../src/lib/entriesView';
import type { MyEntry, TournamentCategory } from '../src/api/tournaments';

const entry = (o: Partial<MyEntry> = {}): MyEntry => ({ _id: 'e1', tournamentId: 't1', categoryId: 'c1', createdAt: '2026-10-01T00:00:00Z', status: 'pending', ...o });
const cat = { _id: 'c1', name: "Women's Singles", sport: 'badminton' } as TournamentCategory;
const look = (status?: string): Record<string, EntryLookup | null> => ({ t1: { tournament: { name: 'Smash Open', status, sport: 'cricket' }, categories: [cat] } });
const one = (e: MyEntry, l = look()) => { const r = entryRows([e], l); return r.active[0] ?? r.closed[0]; };

it('pending', () => {
  expect(one(entry())).toMatchObject({ status: 'Awaiting approval', tone: 'text2', canWithdraw: true });
  expect(entryRows([entry()], look()).active).toHaveLength(1);
});
it('approved', () => expect(one(entry({ status: 'approved' }))).toMatchObject({ status: 'Approved', tone: 'text', canWithdraw: true }));
it('auctioned with price, assigned without', () => {
  expect(one(entry({ status: 'auctioned', auctionData: { soldPrice: 12000 } }))).toMatchObject({ status: 'Drafted · sold ₹12,000', tone: 'accentInk', canWithdraw: false });
  expect(one(entry({ status: 'assigned' })).status).toBe('Drafted');
});
it('rejected and withdrawn are closed', () => {
  const r = entryRows([entry({ status: 'rejected' }), entry({ _id: 'e2', status: 'withdrawn' })], look());
  expect(r.active).toHaveLength(0);
  expect(r.closed.find((x) => x.id === 'e1')).toMatchObject({ status: 'Not accepted by the organiser', tone: 'lossInk' });
  expect(r.closed.find((x) => x.id === 'e2')).toMatchObject({ status: 'Withdrawn', tone: 'text4' });
});
it('finished tournaments close the entry', () => {
  const r = entryRows([entry({ status: 'approved' })], look('completed'));
  expect(r.closed[0]).toMatchObject({ status: 'Tournament completed', tone: 'text3', canWithdraw: false });
  expect(entryRows([entry({ status: 'approved' })], look('cancelled')).closed[0].status).toBe('Tournament cancelled');
});
it('lookup failed', () => {
  const r = entryRows([entry(), entry({ _id: 'e2', status: 'withdrawn' })], { t1: null });
  expect(r.active[0]).toMatchObject({ name: 'Tournament', sub: '', canWithdraw: true });
  expect(r.closed).toHaveLength(1);
});
it('sub uses category name and sport, falling back to the tournament sport', () => {
  expect(one(entry()).sub).toBe("Women's Singles · Badminton");
  const l = { t1: { tournament: { name: 'X', sport: 'cricket' }, categories: [{ ...cat, sport: undefined }] } };
  expect(one(entry(), l).sub).toBe("Women's Singles · Cricket");
});
it('newest first', () => {
  const r = entryRows([entry({ _id: 'a', createdAt: '2026-01-01' }), entry({ _id: 'b', createdAt: '2026-05-01' })], look());
  expect(r.active.map((x) => x.id)).toEqual(['b', 'a']);
});
