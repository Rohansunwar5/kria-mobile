import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { colors, font, motion } from '@/constants/theme';

const W = 120;
const H = 140;
const OUT = Easing.bezier(0.5, 0, 1, 1);
const IN = Easing.bezier(0, 0, 0.3, 1.4);

/**
 * DESIGN §5.9 flip-calendar score. A split card: +1 folds the top half down,
 * −1 folds the bottom half up, 170ms per half. Reduced motion: instant swap.
 */
export function FlipScore({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [pair, setPair] = useState({ cur: value, prev: value });
  const last = useRef(value);
  const first = useSharedValue(1);
  const second = useSharedValue(1);

  useEffect(() => {
    if (value === last.current) return;
    const prev = last.current;
    last.current = value;
    if (reduced) {
      setPair({ cur: value, prev: value });
      return;
    }
    setPair({ cur: value, prev });
    first.value = 0;
    second.value = 0;
    first.value = withTiming(1, { duration: motion.flipHalf, easing: OUT });
    second.value = withDelay(motion.flipHalf, withTiming(1, { duration: motion.flipHalf, easing: IN }, (done) => {
      if (done) runOnJS(setPair)({ cur: value, prev: value });
    }));
  }, [value, reduced, first, second]);

  const { cur, prev } = pair;
  const flipping = cur !== prev;
  const up = cur >= prev;
  return (
    <View style={s.card} accessible accessibilityLabel={String(cur)}>
      <Half n={up ? cur : prev} top />
      <Half n={up ? prev : cur} />
      {flipping ? (
        <>
          {/* Up: the old top folds away, then the new bottom unfolds. Down: the mirror. */}
          <Flap n={prev} top={up} progress={first} folding />
          <Flap n={cur} top={!up} progress={second} />
        </>
      ) : null}
      <View style={s.seam} />
    </View>
  );
}

function Half({ n, top }: { n: number; top?: boolean }) {
  return (
    <View style={[s.half, top ? s.top : s.bottom]}>
      <Text style={[s.digit, { top: top ? 0 : -H / 2 }]}>{n}</Text>
    </View>
  );
}

function Flap({ n, top, progress, folding }: { n: number; top: boolean; progress: SharedValue<number>; folding?: boolean }) {
  const sign = top ? -1 : 1;
  const style = useAnimatedStyle(() => ({
    transform: [{ perspective: 420 }, { rotateX: `${sign * 90 * (folding ? progress.value : 1 - progress.value)}deg` }],
  }));
  return (
    <Animated.View style={[s.half, top ? s.top : s.bottom, s.flap, { transformOrigin: top ? '50% 100%' : '50% 0%' }, style]}>
      <Text style={[s.digit, { top: top ? 0 : -H / 2 }]}>{n}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    width: W, height: H, borderRadius: 16,
    shadowColor: colors.shadow, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  half: { position: 'absolute', left: 0, right: 0, height: H / 2, overflow: 'hidden', backfaceVisibility: 'hidden' },
  top: { top: 0, backgroundColor: colors.flipTop, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  bottom: { top: H / 2, backgroundColor: colors.surface2, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  flap: { zIndex: 2 },
  digit: {
    position: 'absolute', left: 0, right: 0, height: H, lineHeight: H, textAlign: 'center', textAlignVertical: 'center',
    fontFamily: font.display, fontSize: 104, includeFontPadding: false, fontVariant: ['tabular-nums'], color: colors.text,
  },
  seam: { position: 'absolute', left: 0, right: 0, top: H / 2 - 1, height: 2, backgroundColor: colors.bg, zIndex: 3 },
});
