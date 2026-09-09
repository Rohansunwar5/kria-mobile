import type { QuickGameScore, QuickMatch, QuickMatchSlot } from '@/api/quickMatch';
import type { TagVariant } from '@/components/StatusPill';

export function isHost(match: QuickMatch, playerId?: string): boolean {
  return Boolean(playerId) && String(match.hostId) === String(playerId);
}

/**
 * Whether the one-level undo is armed.
 *
 * Tests the snapshot's PRESENCE, not its truthiness. `previousGameScores` is
 * declared `default: undefined` on the server so that "nothing to undo" and
 * "undo back to 0-0" are distinguishable — `[]` is a real snapshot, the one the
 * first point of a match is undone to. A truthiness check would disable the
 * button exactly when it is needed most.
 */
export function canUndo(match: QuickMatch): boolean {
  return match.previousGameScores !== undefined;
}

/** Games decided so far, per side. The game in progress has no winner and is
 *  not counted. */
export function gamesWon(match: QuickMatch): { side1: number; side2: number } {
  const [side1, side2] = match.sides;
  const games = match.gameScores ?? [];
  return {
    side1: games.filter((g) => g.winnerSideId === side1?.sideId).length,
    side2: games.filter((g) => g.winnerSideId === side2?.sideId).length,
  };
}

/** The game being played, or null when the match has not started or every game
 *  is decided. */
export function currentGame(match: QuickMatch): QuickGameScore | null {
  const games = match.gameScores ?? [];
  const live = games.filter((g) => !g.winnerSideId);
  return live.length > 0 ? live[live.length - 1] : null;
}

/** Unclaimed slots across both sides — the ones a join code can fill. */
export function freeSlots(match: QuickMatch): QuickMatchSlot[] {
  return match.sides.flatMap((side) => side.slots).filter((slot) => !slot.playerId);
}

export function statusVariant(status: QuickMatch['status']): TagVariant {
  if (status === 'live') return 'live';
  if (status === 'cancelled') return 'fail';
  return 'end';
}

export function formatLabel(match: QuickMatch): string {
  const bestOf = match.matchConfig?.bestOf ?? 3;
  const pointsToWin = match.matchConfig?.pointsToWin ?? 21;
  const games = bestOf === 1 ? 'Single game' : `Best of ${bestOf}`;
  return `${games} · to ${pointsToWin}`;
}

/**
 * The result, read from the stored `outcome`.
 *
 * Never re-derived from the scores: the server records the outcome explicitly at
 * the moment it is known, and that is the value career stats were written from.
 */
export function outcomeLabel(match: QuickMatch): string | null {
  if (match.status !== 'completed' || !match.outcome) return null;
  if (match.outcome === 'side1') return `${match.sides[0]?.name} won`;
  if (match.outcome === 'side2') return `${match.sides[1]?.name} won`;
  if (match.outcome === 'tied') return 'Tied';
  return 'No result';
}
