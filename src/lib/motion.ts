// Shared animation tokens so every onboarding/auth animation shares one rhythm.
export const MOTION = {
  enterMs: 300,
  exitMs: 200,
  staggerMs: 80,
  spring: { damping: 18, stiffness: 220 },
} as const;
