import type { QuickCricketLineupEntry, QuickMatch, QuickMatchSide } from '@/api/quickMatch';

/**
 * Pure derivations for a quick cricket match. No React, no I/O — the same
 * shape as `quickMatchView.ts`, which is what let 3a's logic be tested without
 * rendering anything.
 */

/** The server's own gate order: toss, then both lineups, then scoring. */
export function setupStage(match: QuickMatch): 'needs_toss' | 'needs_lineups' | 'ready' {
  if (!match.cricketSetup?.toss?.recorded) return 'needs_toss';
  if (!match.cricketSetup?.lineupsSet) return 'needs_lineups';
  return 'ready';
}

/** `6.2`. One place, because three surfaces render it. */
export function oversText(completedOvers?: number, ballsInCurrentOver?: number): string {
  return `${completedOvers ?? 0}.${ballsInCurrentOver ?? 0}`;
}

/** `42/3 (6.2)`, or null before the first ball. */
export function scoreLine(match: QuickMatch): string | null {
  const s = match.liveState;
  if (!s || s.runs === undefined) return null;
  return `${s.runs}/${s.wickets ?? 0} (${oversText(s.completedOvers, s.ballsInCurrentOver)})`;
}

/** Runs still required, second innings only. */
export function chaseLine(match: QuickMatch): string | null {
  const s = match.liveState;
  if (!s || s.currentInnings !== 2 || s.target === undefined) return null;
  // Never negative: once the target is passed the match is over anyway, and a
  // negative "needs" reads as a bug to the host.
  const needed = Math.max(0, s.target - (s.runs ?? 0));
  return `Needs ${needed} to win`;
}

/**
 * Who the engine is waiting for. Both can be true at once — the end of an over
 * that also took a wicket — and collecting only one would post the next ball
 * with a stale id.
 */
export function whoIsNeeded(match: QuickMatch): 'batsman' | 'bowler' | 'both' | null {
  const s = match.liveState;
  if (!s) return null;
  if (s.nextBatsmanNeeded && s.nextBowlerNeeded) return 'both';
  if (s.nextBatsmanNeeded) return 'batsman';
  if (s.nextBowlerNeeded) return 'bowler';
  return null;
}

/**
 * True when the next delivery seeds the innings state rather than continuing
 * it. `recordBall` derives the opening state from that ball's own ids via
 * `initLiveState` / `startInnings2`, so the striker, non-striker and bowler
 * must all be collected for it.
 */
export function isFirstBallOfInnings(match: QuickMatch): boolean {
  const status = match.liveState?.matchStatus;
  return !match.liveState || status === 'awaiting_start' || status === 'innings_break';
}

/**
 * The batting order for one side, DERIVED FROM ITS SLOTS.
 *
 * This is the whole reason the lineup screen cannot accept typed-in names.
 * `recordLineup` stores whatever it is given and never reads `sides[].slots`,
 * while career credit reads `sides[].slots[].playerId` and nothing else. A
 * lineup built from fresh names therefore scores perfectly and credits NOBODY,
 * silently. Mapping here — and only here — keeps engine ids and career credit
 * in agreement by construction.
 *
 * A placeholder slot has no `playerId`, and the key is left absent rather than
 * set to undefined so the posted body matches the server's optional field.
 */
export function lineupFromSlots(side: QuickMatchSide): QuickCricketLineupEntry[] {
  return side.slots.map((slot) => (
    slot.playerId
      ? { slotId: slot.slotId, playerId: slot.playerId, name: slot.displayName }
      : { slotId: slot.slotId, name: slot.displayName }
  ));
}

/** Which side is batting: liveState once play starts, else the toss. */
export function battingSideId(match: QuickMatch): string | null {
  const fromState = match.liveState?.battingTeamId;
  if (fromState) return fromState;

  const toss = match.cricketSetup?.toss;
  if (!toss?.recorded || !toss.winnerTeamId || !toss.decision) return null;

  const [side1, side2] = match.sides;
  const other = toss.winnerTeamId === side1.sideId ? side2.sideId : side1.sideId;
  return toss.decision === 'bat' ? toss.winnerTeamId : other;
}

/**
 * Which side is bowling. Needed by the score panel for the bowler and fielder
 * choices, so it is derived here rather than inverted at each call site.
 */
export function bowlingSideId(match: QuickMatch): string | null {
  const fromState = match.liveState?.bowlingTeamId;
  if (fromState) return fromState;

  const batting = battingSideId(match);
  if (!batting) return null;

  const [side1, side2] = match.sides;
  return batting === side1.sideId ? side2.sideId : side1.sideId;
}

/**
 * Whether an undo is worth offering. The server refuses a cancelled match
 * outright, and there is nothing to undo before the first delivery.
 */
export function canUndoBall(match: QuickMatch): boolean {
  if (match.status === 'cancelled') return false;
  const status = match.liveState?.matchStatus;
  return Boolean(status) && status !== 'awaiting_start';
}

/** Completion text, or null while the match is still live. */
export function cricketOutcomeLabel(match: QuickMatch): string | null {
  if (match.status === 'cancelled') return 'Cancelled';
  if (match.status !== 'completed') return null;

  const [side1, side2] = match.sides;
  if (match.outcome === 'side1') return `${side1.name} won`;
  if (match.outcome === 'side2') return `${side2.name} won`;
  if (match.outcome === 'tied') return 'Tied';
  // A quick cricket match can end tied with no winner; `no_result` is not
  // written by any path today but the branch keeps the return total.
  return 'No result';
}
