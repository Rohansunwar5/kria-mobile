import { purseHealth, shortMoney } from '../src/lib/auctionView';

describe('shortMoney', () => {
  it('abbreviates thousands the way the scoreboard does', () => {
    expect(shortMoney(31500)).toBe('31.5k');
    expect(shortMoney(44000)).toBe('44.0k');
    expect(shortMoney(8500)).toBe('8.5k');
  });

  it('abbreviates lakhs above a hundred thousand', () => {
    expect(shortMoney(250000)).toBe('2.5L');
  });

  it('leaves small amounts alone', () => {
    expect(shortMoney(750)).toBe('750');
    expect(shortMoney(0)).toBe('0');
  });
});

describe('purseHealth', () => {
  it('reports the share of the purse still unspent', () => {
    expect(purseHealth(44000, 50000).ratio).toBeCloseTo(0.88);
  });

  it('greens a healthy purse, oranges a working one, reds a nearly spent one', () => {
    expect(purseHealth(44000, 50000).color).toBe('#16C46A');
    expect(purseHealth(31500, 50000).color).toBe('#F97316');
    expect(purseHealth(8500, 50000).color).toBe('#FF4438');
  });

  it('survives a team with no recorded starting budget', () => {
    const h = purseHealth(1000, 0);
    expect(h.ratio).toBe(0);
    expect(h.color).toBe('#FF4438');
  });

  it('never exceeds a full bar when a team is credited above its start', () => {
    expect(purseHealth(60000, 50000).ratio).toBe(1);
  });
});
