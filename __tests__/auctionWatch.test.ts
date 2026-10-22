import { auctionPill, auctionSubline, onBlockLine, lastSale, bidRows, purseCards, tieBreakLine, myAuctionResult } from '@/lib/auctionWatch';

const live = (o: any = {}) => ({ status: 'in_progress', currentPlayerIndex: 17, totalPlayers: 32, unsoldCount: 3, rotationCount: 0, liveBid: { bidHistory: [], tiedTeams: [], tieBreakerActive: false, spinWinnerId: null, currentPrice: 0 }, ...o }) as any;
const teams = [
  { _id: 't1', name: 'Titans', logo: 'l1', budget: 18500, initialBudget: 100000, totalSpent: 81500, playersCount: 6 },
  { _id: 't2', name: 'Tigr', budget: 1, initialBudget: 0, totalSpent: 0, playersCount: 1 },
] as any;

test('auctionPill', () => {
  expect(auctionPill(null)).toBe('Starts soon');
  expect(auctionPill(live({ status: 'not_started' }))).toBe('Starts soon');
  expect(auctionPill(live())).toBe('Live');
  expect(auctionPill(live({ status: 'sold' }))).toBe('Live');
  expect(auctionPill(live({ status: 'paused' }))).toBe('Paused');
  expect(auctionPill(live({ status: 'completed' }))).toBe('Finished');
  expect(auctionPill(live({ liveBid: { tieBreakerActive: true } }))).toBe('Tie-breaker');
});

test('auctionSubline', () => {
  expect(auctionSubline(live())).toBe('Player 18 of 32 · 3 unsold');
  expect(auctionSubline(live({ currentPlayerIndex: 0, totalPlayers: 3, rotationCount: 1 }))).toBe('Unsold round 1 · Player 1 of 3');
});

test('onBlockLine', () => {
  expect(onBlockLine({ profile: { skillLevel: 'advanced', age: 29 }, auctionData: { basePrice: 2000 } } as any)).toBe('Advanced · 29 · Base price ₹2,000');
  expect(onBlockLine({ profile: { age: 29 }, auctionData: { basePrice: 2000 } } as any)).toBe('29 · Base price ₹2,000');
});

test('lastSale', () => {
  const log = [
    { playerName: 'A', teamName: 'X', finalPrice: 1, timestamp: '2026-01-01T00:00:00Z' },
    { playerName: 'B', teamName: 'Y', finalPrice: 5000, timestamp: '2026-01-02T00:00:00Z' },
  ] as any;
  const d = { auction: live({ lastSoldResult: { playerName: 'P', teamName: 'T', soldPrice: 14000 } }) } as any;
  expect(lastSale(d, log)).toEqual({ player: 'P', team: 'T', price: '₹14,000' });
  expect(lastSale({ auction: live() } as any, log)).toEqual({ player: 'B', team: 'Y', price: '₹5,000' });
  expect(lastSale({ auction: live() } as any, [])).toBeNull();
});

test('bidRows', () => {
  const hist = Array.from({ length: 7 }, (_, i) => ({ teamId: i % 2 ? 't2' : 't1', teamName: 'n', amount: 1000 * (i + 1), timestamp: `t${i}` }));
  const rows = bidRows(live({ liveBid: { bidHistory: hist } }), teams);
  expect(rows).toHaveLength(5);
  expect(rows[0]).toMatchObject({ amount: '₹7,000', newest: true, logo: 'l1', team: 'n' });
  expect(rows.slice(1).every((r) => !r.newest)).toBe(true);
  expect(rows[4].amount).toBe('₹3,000');
});

test('purseCards', () => {
  const c = purseCards(teams);
  expect(c[0]).toMatchObject({ left: '₹18,500', spentPct: 81.5, sub: '6 players · ₹81,500 spent', logo: 'l1' });
  expect(c[1].spentPct).toBe(0);
});

test('tieBreakLine', () => {
  const tie = (o: any = {}) => live({ liveBid: { tieBreakerActive: true, tiedTeams: ['t1', 't2'], spinWinnerId: null, ...o } });
  expect(tieBreakLine(tie(), teams)).toBe('Tied between Titans and Tigr. The organiser breaks the tie.');
  expect(tieBreakLine(tie({ spinWinnerId: 't2' }), teams)).toBe('Tigr won the tie-break.');
  expect(tieBreakLine(live(), teams)).toBeNull();
});

test('myAuctionResult', () => {
  const T = [{ _id: 'tm', name: 'Sunrise' }] as any;
  const e = (o: any = {}) => ({ _id: 'r1', status: 'approved', ...o }) as any;
  const d = (o: any = {}) => ({ auction: live(), currentPlayer: null, ...o }) as any;
  expect(myAuctionResult(undefined, d(), T)).toBeNull();
  expect(myAuctionResult(e({ status: 'assigned', teamId: 'tm', auctionData: { soldPrice: 16500 } }), d(), T)).toEqual({ title: 'You went to Sunrise', line: 'Sold for ₹16,500', teamId: 'tm' });
  expect(myAuctionResult(e({ status: 'auctioned', teamId: 'tm' }), d(), T)).toEqual({ title: 'You went to Sunrise', teamId: 'tm' });
  expect(myAuctionResult(e(), d({ unsold: [{ registrationId: 'r1' }] }), T)).toEqual({ title: "You're unsold this round" });
  expect(myAuctionResult(e(), d({ upcoming: [{ registrationId: 'r1', queueIndex: 20 }] }), T)).toEqual({ title: "You're up in 3" });
  expect(myAuctionResult(e(), d({ currentPlayer: { _id: 'r1' } }), T)).toEqual({ title: "You're on the block" });
  expect(myAuctionResult(e({ status: 'pending' }), d(), T)).toEqual({ title: "You're in the pool" });
  expect(myAuctionResult(e({ status: 'withdrawn' }), d(), T)).toBeNull();
  expect(myAuctionResult(e({ status: 'rejected' }), d(), T)).toBeNull();
});
