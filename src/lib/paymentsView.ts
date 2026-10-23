import type { Invoice } from '@/api/payment';
import { FEE_LABELS } from '@/components/tournament/EntryForm';
import { rupees } from '@/lib/format';

/** The moment it became paid; only paid payments are listed. */
export const paidAt = (inv: Invoice): string => inv.updatedAt ?? inv.createdAt;

export function paymentsSummary(list: Invoice[]): { total: number; count: number } {
  const total = list.reduce((sum, i) => sum + (i.amount || 0), 0);
  return { total: Math.round(total * 100) / 100, count: list.length };
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
