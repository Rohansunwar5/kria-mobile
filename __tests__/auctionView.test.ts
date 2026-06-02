import { currentBid, bidProgress, latestFirst } from '@/lib/auctionView';

describe('auctionView helpers', () => {
  it('currentBid prefers liveBid.currentPrice', () => {
    expect(currentBid(1500, 1000)).toBe(1500);
  });

  it('currentBid falls back to basePrice when no live price', () => {
    expect(currentBid(0, 1000)).toBe(1000);
  });

  it('bidProgress is 0 when hardLimit not above basePrice', () => {
    expect(bidProgress(1200, 1000, 0)).toBe(0);
    expect(bidProgress(1200, 1000, 1000)).toBe(0);
  });

  it('bidProgress scales between base and hardLimit, clamped to 100', () => {
    expect(bidProgress(1500, 1000, 2000)).toBe(50);
    expect(bidProgress(3000, 1000, 2000)).toBe(100);
  });

  it('latestFirst reverses without mutating and caps length', () => {
    const arr = [1, 2, 3, 4];
    expect(latestFirst(arr, 2)).toEqual([4, 3]);
    expect(arr).toEqual([1, 2, 3, 4]);
  });

  it('latestFirst returns [] for nullish input', () => {
    expect(latestFirst(undefined, 5)).toEqual([]);
  });
});
