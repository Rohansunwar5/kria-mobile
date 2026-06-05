export interface FeeBreakdown {
  base: number;
  razorpayFee: number;
  platformFee: number;
  gst: number;
  total: number;
}

export function feeBreakdown(baseAmount: number): FeeBreakdown {
  const razorpayFee = Math.round(baseAmount * 0.02);
  const platformFee = Math.round(baseAmount * 0.02);
  const gst = Math.round((razorpayFee + platformFee) * 0.18);
  return { base: baseAmount, razorpayFee, platformFee, gst, total: baseAmount + razorpayFee + platformFee + gst };
}

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  const isWhole = rupees % 1 === 0;
  const formatted = isWhole
    ? Math.floor(rupees).toLocaleString('en-IN')
    : rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // If locale didn't produce commas (for numbers >= 1000), use en-US as fallback
  const withCommas = (rupees >= 1000 && !formatted.includes(','))
    ? rupees.toLocaleString('en-US', {
        minimumFractionDigits: isWhole ? 0 : 2,
        maximumFractionDigits: isWhole ? 0 : 2,
      })
    : formatted;
  return '₹' + withCommas;
}
