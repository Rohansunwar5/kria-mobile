/**
 * Tie-breaker wheel maths, kept out of the component so it can be tested.
 *
 * The server picks the winner (`spinWinnerId`) and stamps `spinStartedAt`; every
 * screen watching the auction then animates to that same result. The wheel is
 * decoration over a decision already made — it must never pick a winner itself.
 */

/** Animation length, and the window in which a late joiner still sees the spin. */
export const SPIN_DURATION_MS = 4500;

/** Which segment sits under the top pointer once the wheel has turned `angle`. */
export function pointerLandsOn(angle: number, teamCount: number): number {
  if (teamCount < 2) return 0;
  const segment = 360 / teamCount;
  const underPointer = (360 - (angle % 360)) % 360;
  return Math.floor(underPointer / segment);
}

/** Total clockwise rotation that parks `winnerIndex` under the top pointer. */
export function spinTargetAngle(winnerIndex: number, teamCount: number, fullSpins: number): number {
  if (teamCount < 2 || winnerIndex < 0 || winnerIndex >= teamCount) return 0;
  const segment = 360 / teamCount;
  const segmentCenter = winnerIndex * segment + segment / 2;
  return fullSpins * 360 + (360 - segmentCenter);
}

export type SpinPhase = 'idle' | 'spinning' | 'done';

/**
 * Open the screen mid-spin and you see it spin; open it a minute later and you
 * see the result without a pointless 4.5s wait.
 */
export function spinPhase(
  spinStartedAt: string | null | undefined,
  spinWinnerId: string | null | undefined,
  now: number,
): SpinPhase {
  if (!spinWinnerId) return 'idle';
  if (!spinStartedAt) return 'done';
  const elapsed = now - new Date(spinStartedAt).getTime();
  return elapsed < SPIN_DURATION_MS ? 'spinning' : 'done';
}
