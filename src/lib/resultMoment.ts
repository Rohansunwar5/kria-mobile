import type { Achievement, CareerProfile } from '@/api/career';
import type { QuickMatch } from '@/api/quickMatch';
import { RANK_MIN } from '@/lib/homeView';

export type MomentOutcome = 'win' | 'loss' | 'tie' | 'nr';
export type MomentUnit = 'ranked' | 'matches' | 'wins' | 'sports';
/** A progress line, in counts (the bar's fraction is from/target → to/target). */
export interface MomentBar { label: string; from: number; to: number; target: number }
export interface ResultMoment {
  outcome: MomentOutcome;
  sport: string;
  /** "58.3%"; "—" when there were no decided matches before. */
  winRate: { from: string; to: string };
  decided: { from: string; to: string };
  /** The Next tile: the nearest goal after this match. */
  next: { remaining: number; unit: MomentUnit; target: number } | null;
  /** The progress line: the minted milestone filling to 100%, else the next goal; null when the qualify line replaces it. */
  bar: MomentBar | null;
  /** This match took the sport to RANK_MIN decided. */
  qualified: boolean;
  minted: Achievement | null;
  /** The next higher target of the minted kind ("Next: 100."). */
  mintNext: number | null;
}

const pct = (won: number, decided: number) => (decided ? `${((won / decided) * 100).toFixed(1)}%` : '—');
const unitOf = (a: Achievement) => a.id.split('-')[0] as MomentUnit;

/** Which side (0 or 1) holds a claimed slot for this player; null for spectators and guests. */
export function viewerSide(match: QuickMatch, meId: string): 0 | 1 | null {
  if (!meId) return null;
  const i = match.sides.findIndex((s) => s.slots.some((slot) => slot.playerId === meId));
  return i === 0 || i === 1 ? i : null;
}

/**
 * The match-result moment (reward spec §7), from the career fetched when the
 * room opened (`before`) and after completion (`after`). Null unless the two
 * differ by exactly this match — so a stale or out-of-order read never shows a
 * number the server didn't count.
 */
export function buildResultMoment(before: CareerProfile, after: CareerProfile, match: QuickMatch, meId: string): ResultMoment | null {
  const side = viewerSide(match, meId);
  if (side === null) return null;
  const b = before.sports.find((s) => s.sport === match.sport) ?? { decided: 0, won: 0 };
  const a = after.sports.find((s) => s.sport === match.sport);
  if (!a) return null;

  const o = match.outcome;
  const decidedThis = o === 'side1' || o === 'side2' || o === 'tied';
  const youWon = o === (side === 0 ? 'side1' : 'side2');
  if (a.decided !== b.decided + (decidedThis ? 1 : 0) || a.won !== b.won + (youWon ? 1 : 0)) return null;
  const outcome: MomentOutcome = !decidedThis ? 'nr' : o === 'tied' ? 'tie' : youWon ? 'win' : 'loss';

  const was = (x: Achievement) => before.achievements.find((y) => y.id === x.id);
  const minted = after.achievements.find((x) => x.earned && !was(x)?.earned) ?? null;
  const mintNext = minted
    ? Math.min(...after.achievements.filter((x) => unitOf(x) === unitOf(minted) && x.target > minted.target).map((x) => x.target))
    : Infinity;

  // The nearest unearned goal; ties keep server order.
  const goal = after.achievements
    .filter((x) => !x.earned)
    .reduce<Achievement | null>((best, x) => (!best || x.target - x.progress < best.target - best.progress ? x : best), null);
  const unranked = a.decided < RANK_MIN;
  const qualified = b.decided < RANK_MIN && !unranked;
  const next = unranked
    ? { remaining: RANK_MIN - a.decided, unit: 'ranked' as const, target: RANK_MIN }
    : goal ? { remaining: goal.target - goal.progress, unit: unitOf(goal), target: goal.target } : null;

  const barFor = (x: Achievement): MomentBar => ({ label: x.label, from: was(x)?.progress ?? 0, to: x.progress, target: x.target });
  const bar = minted
    ? barFor(minted)
    : qualified ? null
      : unranked ? { label: 'Decided matches', from: b.decided, to: a.decided, target: RANK_MIN }
        : goal ? barFor(goal) : null;

  return {
    outcome,
    sport: match.sport,
    winRate: { from: pct(b.won, b.decided), to: pct(a.won, a.decided) },
    decided: { from: String(b.decided), to: String(a.decided) },
    next,
    bar,
    qualified,
    minted,
    mintNext: Number.isFinite(mintNext) ? mintNext : null,
  };
}
