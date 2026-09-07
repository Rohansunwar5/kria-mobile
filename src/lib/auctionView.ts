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

/** Compact money for the purse tiles: 31500 → "31.5k", 250000 → "2.5L". */
export function shortMoney(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** How much of a team's purse is left, and the colour that says so at a glance. */
export function purseHealth(budget: number, initialBudget: number): { ratio: number; color: string } {
  if (!initialBudget || initialBudget <= 0) return { ratio: 0, color: '#FF4438' };
  const ratio = Math.max(0, Math.min(1, budget / initialBudget));
  const color = ratio >= 0.75 ? '#16C46A' : ratio >= 0.25 ? '#F97316' : '#FF4438';
  return { ratio, color };
}

/**
 * What a team has spent at auction.
 *
 * A team document carries `budget` (what is left) and `initialBudget`; there is
 * no `totalSpent` field — that only exists on the auction status payload, which
 * the team screen does not fetch.
 */
export function teamSpent(team?: { budget?: number; initialBudget?: number }): number {
  return Math.max(0, (team?.initialBudget ?? 0) - (team?.budget ?? 0));
}
