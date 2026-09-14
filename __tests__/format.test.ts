import { computeAge, feeBreakdown, winPercent } from '@/lib/format';

describe('computeAge', () => {
  it('returns 0 when no dob', () => {
    expect(computeAge(undefined)).toBe(0);
  });
  it('computes age from a past dob', () => {
    const d = new Date();
    const dob = new Date(d.getFullYear() - 30, d.getMonth(), d.getDate());
    expect(computeAge(dob.toISOString())).toBe(30);
  });
  it('subtracts a year when birthday has not occurred yet this year', () => {
    const d = new Date();
    const dob = new Date(d.getFullYear() - 25, d.getMonth() + 1, d.getDate());
    expect(computeAge(dob.toISOString())).toBe(24);
  });
});

describe('feeBreakdown', () => {
  it('matches the web fee formula for base 1000', () => {
    const b = feeBreakdown(1000);
    expect(b.razorpayFee).toBeCloseTo(20, 2);
    expect(b.platformFee).toBeCloseTo(20, 2);
    expect(b.gst).toBeCloseTo(7.2, 2);
    expect(b.convenienceFee).toBeCloseTo(47.2, 2);
    expect(b.total).toBeCloseTo(1047.2, 2);
  });
});

describe('winPercent', () => {
  it('rounds a 0-1 fraction to a whole-number percentage', () => {
    expect(winPercent(0.9, 24)).toBe('90%');
  });

  it('renders 0% for a zero decided, even if winRate is somehow non-zero', () => {
    expect(winPercent(0.5, 0)).toBe('0%');
  });

  it('renders 0% for a non-finite winRate', () => {
    expect(winPercent(NaN, 12)).toBe('0%');
    expect(winPercent(Infinity, 12)).toBe('0%');
  });

  it('renders 0% for a missing winRate', () => {
    expect(winPercent(undefined, 12)).toBe('0%');
  });

  it('renders 0% for a genuine 0 winRate with matches decided', () => {
    expect(winPercent(0, 12)).toBe('0%');
  });

  it('does not need decided to format an ordinary fraction', () => {
    expect(winPercent(0.5)).toBe('50%');
  });
});
