export function currentBid(livePrice: number | undefined, basePrice: number | undefined): number {
  return livePrice && livePrice > 0 ? livePrice : (basePrice || 0);
}

export function bidProgress(current: number, basePrice: number, hardLimit: number): number {
  if (hardLimit <= basePrice) return 0;
  const pct = ((current - basePrice) / (hardLimit - basePrice)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function latestFirst<T>(arr: T[] | undefined | null, cap: number): T[] {
  if (!arr || arr.length === 0) return [];
  return [...arr].reverse().slice(0, cap);
}
