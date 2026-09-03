import { useEffect } from 'react';
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// The motion tokens, spec'd in docs/design-canvas/motion/. Two curves only:
// out.cubic for anything that arrives or responds, inOut.cubic for anything
// that loops. No springs — overshoot fights hard edges and 1.5px borders.
export const DUR = {
  pressIn: 120,
  pressOut: 180,
  sweep: 260,
  reveal: 420,
  rise: 380,
  sweepPass: 1400,
  shimmerRest: 4100,
  ambient: 14000,
} as const;

export const OUT = Easing.out(Easing.cubic);
export const INOUT = Easing.inOut(Easing.cubic);

/** Card stagger: 70ms per row, first three rows only — past that the list drags. */
export function riseDelay(index: number) {
  return Math.min(Math.max(index, 0), 2) * 70;
}

function clamp01(n: number) {
  'worklet';
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Detail-hero parallax from scroll offset. Pure, so the curve is testable. */
export function heroParallax(y: number) {
  'worklet';
  return {
    artY: -y * 0.45,
    artScale: 1 + 0.06 * clamp01(y / 260),
    deepen: 0.55 * clamp01(y / 180),
    bar: clamp01((y - 110) / 70),
  };
}

// ponytail: module-level, so a card that scrolls out and back does not replay.
// Deliberately not persisted — a fresh app launch should reveal again.
const played = new Set<string>();

/**
 * Option A — land reveal. A hazard bar sweeps, an art cover wipes down behind
 * it, then the type rises. One-shot per tournament id, skipped under
 * reduce-motion (the seeded hue and the banner do the differentiating anyway).
 */
export function useLandReveal(id: string, index = 0) {
  const reduced = useReducedMotion();
  const skip = reduced || played.has(id);
  const rest = skip ? 1 : 0;
  const sweep = useSharedValue(rest);
  const wipe = useSharedValue(rest);
  const rise = useSharedValue(rest);
  const riseLate = useSharedValue(rest);

  useEffect(() => {
    if (skip) return;
    played.add(id);
    const d = riseDelay(index);
    sweep.value = withDelay(d, withTiming(1, { duration: DUR.sweep, easing: OUT }));
    wipe.value = withDelay(d + 60, withTiming(1, { duration: DUR.reveal, easing: OUT }));
    rise.value = withDelay(d + 120, withTiming(1, { duration: DUR.rise, easing: OUT }));
    riseLate.value = withDelay(d + 210, withTiming(1, { duration: DUR.rise, easing: OUT }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sweep, wipe, rise, riseLate };
}

/** The rise itself: 10px up into place, fading in. */
export function useRise(v: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * 10 }],
  }));
}

/** Option C — press response. Finger-down is faster than the release. */
export function usePress() {
  const press = useSharedValue(0);
  return {
    press,
    onPressIn: () => {
      press.value = withTiming(1, { duration: DUR.pressIn, easing: OUT });
    },
    onPressOut: () => {
      press.value = withTiming(0, { duration: DUR.pressOut, easing: OUT });
    },
  };
}

/**
 * Option B — Ken Burns drift. Reversing, so the 14s loop has no seam. Only
 * ever on a single large surface (featured card, detail hero), never in a list
 * row, and it stops the moment the screen loses focus.
 */
export function useDrift(active: boolean) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced || !active) {
      cancelAnimation(v);
      v.value = withTiming(0, { duration: DUR.pressOut, easing: OUT });
      return;
    }
    v.value = withRepeat(withTiming(1, { duration: DUR.ambient, easing: INOUT }), -1, true);
    return () => cancelAnimation(v);
  }, [active, reduced, v]);
  return v;
}

/**
 * Option E — seeded shimmer for banner-less grounds. A 1.4s pass then 4.1s of
 * rest, offset per row so no two grounds sweep together.
 */
export function useShimmer(active: boolean, index = 0) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced || !active) {
      cancelAnimation(v);
      v.value = 0;
      return;
    }
    v.value = withDelay(
      (index % 3) * 1200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: DUR.sweepPass, easing: INOUT }),
          withDelay(DUR.shimmerRest, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(v);
  }, [active, reduced, index, v]);
  return v;
}
