// Kria Motion.dc.html splash('B') (6b) and its reduced-motion variant (6c):
// when the timeline has settled, and how long the exit fade runs (ms).
export const LAUNCH_6B = { total: 1750, exit: 320 };
export const LAUNCH_6C = { total: 720, exit: 320 };

/** ms from the start when the exit begins: once the timeline is over and the app is ready. null while not ready. */
export function exitAt({ reduced, readyAt }: { reduced: boolean; readyAt: number | null }): number | null {
  return readyAt === null ? null : Math.max((reduced ? LAUNCH_6C : LAUNCH_6B).total, readyAt);
}
