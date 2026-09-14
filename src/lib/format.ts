export function computeAge(dateOfBirth?: string): number {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export interface FeeBreakdown {
  base: number;
  razorpayFee: number;
  platformFee: number;
  gst: number;
  convenienceFee: number;
  total: number;
}

export function feeBreakdown(base: number): FeeBreakdown {
  const razorpayFee = Math.round(base * 0.02 * 100) / 100;
  const platformFee = Math.round(base * 0.02 * 100) / 100;
  const gst = Math.round((razorpayFee + platformFee) * 0.18 * 100) / 100;
  const convenienceFee = Math.round((razorpayFee + platformFee + gst) * 100) / 100;
  const total = Math.round((base + convenienceFee) * 100) / 100;
  return { base, razorpayFee, platformFee, gst, convenienceFee, total };
}

export function formatDate(value?: string): string {
  if (!value) return 'TBD';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatShortDate(value?: string): string {
  if (!value) return 'TBD';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Turns a 0-1 win-rate fraction into a rounded percentage string, e.g. `92%`.
 * The server owns the number — it is never recomputed from won/decided here.
 *
 * Renders `0%`, never `NaN%`, for a zero `decided`, a non-finite `winRate`,
 * or a missing `winRate` — the union of edges the three call sites (Top
 * players, the PLAY portal's record card, and the career card) used to guard
 * inconsistently before this was one function.
 */
export function winPercent(winRate: number | undefined, decided?: number): string {
  if (decided === 0 || winRate === undefined || !Number.isFinite(winRate)) return '0%';
  return `${Math.round(winRate * 100)}%`;
}

/**
 * Rupees, compacted above 1000 into `k`, e.g. `₹24k`, `₹1.5k`, `₹850`.
 * A whole thousand drops the decimal (`₹1k`, not `₹1.0k`); any other
 * thousand keeps one decimal place.
 *
 * This was four verbatim copies (`PlayedForCard`, `CompletedSummary`,
 * `HistoryCard`, `profile/history.tsx`) before being pulled out here — the
 * same situation the `unwrap` helper docs already call out for a fourth
 * copy. `HistoryCard` additionally renders a falsy amount as `'—'`; that is
 * caller-specific (an unsold player has no price to show, not a zero one)
 * and stays at the call site rather than moving in here.
 */
export function formatMoney(n: number): string {
  return n >= 1000 ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `₹${n}`;
}
