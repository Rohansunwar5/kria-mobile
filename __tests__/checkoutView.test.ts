import { feeBreakdown, formatINR } from '@/lib/checkoutView';

describe('checkoutView helpers', () => {
  it('feeBreakdown returns all zeros for zero base', () => {
    expect(feeBreakdown(0)).toEqual({ base: 0, razorpayFee: 0, platformFee: 0, gst: 0, total: 0 });
  });

  it('feeBreakdown computes correct fees for 10000 paise (₹100 base)', () => {
    const b = feeBreakdown(10000);
    expect(b.base).toBe(10000);
    expect(b.razorpayFee).toBe(200);   // 10000 × 0.02
    expect(b.platformFee).toBe(200);   // 10000 × 0.02
    expect(b.gst).toBe(72);            // (200 + 200) × 0.18
    expect(b.total).toBe(10472);       // 10000 + 200 + 200 + 72
  });

  it('feeBreakdown rounds fractional paise to nearest integer', () => {
    const b = feeBreakdown(333);   // 333 × 0.02 = 6.66 → 7
    expect(b.razorpayFee).toBe(7);
    expect(b.platformFee).toBe(7);
    expect(b.gst).toBe(Math.round((7 + 7) * 0.18));
  });

  it('formatINR formats whole rupees without decimals', () => {
    expect(formatINR(100000)).toBe('₹1,000');
    expect(formatINR(50000)).toBe('₹500');
  });

  it('formatINR formats fractional rupees with 2 decimals', () => {
    expect(formatINR(10050)).toBe('₹100.50');
    expect(formatINR(101)).toBe('₹1.01');
  });
});
