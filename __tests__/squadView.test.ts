import { squad, teamStats, pickTeam } from '@/lib/squadView';

const cats = [{ _id: 'c1', name: "Men's Singles" }, { _id: 'c2', name: 'Mixed Doubles' }] as any;
const r = (o: any) => ({ _id: 'x', profile: { firstName: 'A', lastName: 'B' }, status: 'assigned', categoryId: 'c1', ...o });

test('squad groups by playerId, sorts, flags me', () => {
  const rows = squad([
    r({ _id: 'r1', playerId: 'p1', auctionData: { soldPrice: 16500 }, profile: { firstName: 'Ravi', lastName: 'K' } }),
    r({ _id: 'r2', playerId: 'p1', categoryId: 'c2', auctionData: { soldPrice: 4000 }, profile: { firstName: 'Ravi', lastName: 'K' } }),
    r({ _id: 'r3', playerId: 'p2', role: 'icon', profile: { firstName: 'Ico', lastName: 'N' } }),
    r({ _id: 'r4', playerId: 'p3', role: 'captain', profile: { firstName: 'Cap', lastName: 'T' } }),
    r({ _id: 'r5', categoryId: 'zz', auctionData: { soldPrice: 99 }, profile: { firstName: 'No', lastName: 'Id' } }),
  ], cats, 'p1');
  expect(rows.map((x) => x.name)).toEqual(['Cap T', 'Ico N', 'Ravi K', 'No Id']);
  expect(rows[2]).toMatchObject({ key: 'p1', categories: "Men's Singles · Mixed Doubles", price: 20500, me: true, initials: 'RK' });
  expect(rows[0].role).toBe('captain');
  expect(rows[1].price).toBe(0);
  expect(rows[3]).toMatchObject({ key: 'r5', playerId: undefined, me: false, categories: '' });
});

test('teamStats', () => {
  expect(teamStats({ budget: 18500, initialBudget: 100000 } as any, [{}, {}] as any)).toEqual({ players: 2, spent: 81500, left: 18500 });
});

test('pickTeam', () => {
  const t = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }] as any;
  expect(pickTeam(t, 'c', 'b')).toBe('c');
  expect(pickTeam(t, undefined, 'b')).toBe('b');
  expect(pickTeam(t)).toBe('a');
  expect(pickTeam(t, 'zz', 'b')).toBe('b');
  expect(pickTeam(t, 'zz', 'qq')).toBe('a');
  expect(pickTeam([])).toBeUndefined();
});
