import type { Invoice } from '@/api/payment';
import { FEE_LABELS } from '@/components/tournament/EntryForm';
import { rupees } from '@/lib/format';

/** The moment it last moved — paid, failed or refunded. */
export const paidAt = (inv: Invoice): string => inv.updatedAt ?? inv.createdAt;

export const isPaid = (inv: Invoice): boolean => inv.status === 'paid';

/** A payment the player can still see through: the order exists but no money
 *  has landed. `created` is an order they walked away from. */
export type PaymentLook = { label: string; tone: 'paid' | 'open' | 'failed' | 'refunded'; retry: boolean };
export function paymentLook(inv: Invoice): PaymentLook {
  switch (inv.status) {
    case 'paid': return { label: 'Paid', tone: 'paid', retry: false };
    case 'failed': return { label: 'Failed', tone: 'failed', retry: true };
    case 'refunded': return { label: 'Refunded', tone: 'refunded', retry: false };
    default: return { label: 'Not paid', tone: 'open', retry: true };
  }
}

/** The headline is money actually spent, so unpaid and refunded rows are out. */
export function paymentsSummary(list: Invoice[]): { total: number; count: number } {
  const paid = list.filter(isPaid);
  const total = paid.reduce((sum, i) => sum + (i.amount || 0), 0);
  return { total: Math.round(total * 100) / 100, count: paid.length };
}

export const sortPayments = (list: Invoice[]): Invoice[] =>
  [...list].sort((a, b) => new Date(paidAt(b)).getTime() - new Date(paidAt(a)).getTime());

export function feeLines(inv: Invoice): { label: string; value: string; total?: true }[] {
  const f = inv.feeBreakdown;
  const parts: [string, number | undefined][] = [
    [FEE_LABELS[0], inv.baseAmount], [FEE_LABELS[1], f?.razorpayFee], [FEE_LABELS[2], f?.platformFee], [FEE_LABELS[3], f?.gst],
  ];
  const lines: { label: string; value: string; total?: true }[] = parts
    .filter((p): p is [string, number] => typeof p[1] === 'number')
    .map(([label, n]) => ({ label, value: rupees(n) }));
  lines.push({ label: FEE_LABELS[4], value: rupees(inv.amount), total: true });
  return lines;
}
