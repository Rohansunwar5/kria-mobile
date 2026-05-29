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
