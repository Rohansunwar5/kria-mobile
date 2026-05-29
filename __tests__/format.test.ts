import { computeAge, feeBreakdown } from '@/lib/format';

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
