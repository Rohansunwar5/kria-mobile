export function formatShortDate(value?: string): string {
  if (!value) return 'TBD';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Rupees for display: whole amounts without decimals, otherwise exactly two, Indian grouping. */
export function rupees(n: number): string {
  const frac = Number.isInteger(n) ? 0 : 2;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}
