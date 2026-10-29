import { feeLines, paidAt, paymentLook, paymentsSummary, sortPayments } from '../src/lib/paymentsView';
import type { Invoice } from '../src/api/payment';

const inv = (o: Partial<Invoice> = {}): Invoice => ({ _id: 'i', amount: 100, status: 'paid', createdAt: '2026-10-01T00:00:00Z', ...o });

it('sums amounts without float noise', () => {
  expect(paymentsSummary([inv({ amount: 1047.2 }), inv({ amount: 523.6 })])).toEqual({ total: 1570.8, count: 2 });
});

it('sorts newest paid first, falling back to createdAt', () => {
  const a = inv({ _id: 'a', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z' });
  const b = inv({ _id: 'b', createdAt: '2026-10-03T00:00:00Z' });
  const c = inv({ _id: 'c', createdAt: '2026-09-01T00:00:00Z' });
  expect(paidAt(b)).toBe(b.createdAt);
  expect(sortPayments([c, b, a]).map((x) => x._id)).toEqual(['a', 'b', 'c']);
});

it('builds fee lines and omits missing numbers', () => {
  const full = inv({ amount: 1047.2, baseAmount: 1000, feeBreakdown: { razorpayFee: 20, platformFee: 20, gst: 7.2 } });
  expect(feeLines(full).map((l) => l.value)).toEqual(['₹1,000', '₹20', '₹20', '₹7.20', '₹1,047.20']);
  expect(feeLines(full)[4]).toMatchObject({ label: 'Total', total: true });
  expect(feeLines(inv({ amount: 1000, baseAmount: 1000 })).map((l) => l.label)).toEqual(['Entry fee', 'Total']);
  expect(feeLines(inv({ amount: 1000 })).map((l) => l.label)).toEqual(['Total']);
});

it('counts only paid money in the headline', () => {
  const list = [inv({ amount: 100 }), inv({ amount: 50, status: 'failed' }), inv({ amount: 70, status: 'created' }), inv({ amount: 30, status: 'refunded' })];
  expect(paymentsSummary(list)).toEqual({ total: 100, count: 1 });
});

it('offers a retry only where money can still land', () => {
  expect(paymentLook(inv({ status: 'paid' }))).toMatchObject({ label: 'Paid', retry: false });
  expect(paymentLook(inv({ status: 'failed' }))).toMatchObject({ label: 'Failed', retry: true });
  expect(paymentLook(inv({ status: 'created' }))).toMatchObject({ label: 'Not paid', retry: true });
  expect(paymentLook(inv({ status: 'refunded' }))).toMatchObject({ label: 'Refunded', retry: false });
});
