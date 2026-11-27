import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ease } from '@/constants/theme';
import { rollPlan, type RollCell } from '@/lib/rollPlan';

const DIGITS = '01234567890123456789'.split('');
const ROLL_MS = 520;

/**
 * A number that rolls from `from` to `to` (DESIGN v1.2 §9): each changed digit
 * is a 0–9 column moved on the UI thread; unchanged characters stay put.
 * `play` false renders the final value at rest. Reduced motion: a 160ms fade
 * to the final value. Screen readers hear only `to`.
 */
export function RollNumber({ from, to, style, delay = 0, play }: {
  from: string;
  to: string;
  style: StyleProp<TextStyle>;
  delay?: number;
  play: boolean;
}) {
  const reduced = useReducedMotion();
  const plan = rollPlan(from, to);
  const flat = StyleSheet.flatten(style) ?? {};
  const lh = flat.lineHeight ?? flat.fontSize ?? 16;
  // The system scales the glyphs (capped at 1.3) but not View heights, so the cell grows with them.
  const cell = lh * Math.min(useWindowDimensions().fontScale, 1.3);
  const rolling = play && !reduced && !!plan;

  if (!rolling || !plan) {
    return (
      <Animated.View accessible accessibilityLabel={to} entering={play && reduced ? FadeIn.duration(160) : undefined} style={s.row}>
        <Text style={style} maxFontSizeMultiplier={1.3}>{to}</Text>
      </Animated.View>
    );
  }
  return (
    <View accessible accessibilityLabel={to} style={s.row}>
      {plan.map((c, i) =>
        c.roll
          ? <Column key={i} cell={c} lh={lh} h={cell} style={style} delay={delay} />
          : <Text key={i} style={[style, { lineHeight: lh }]} maxFontSizeMultiplier={1.3}>{c.char}</Text>,
      )}
    </View>
  );
}

function Column({ cell, lh, h, style, delay }: { cell: RollCell; lh: number; h: number; style: StyleProp<TextStyle>; delay: number }) {
  const { start, end } = cell.roll!;
  const y = useSharedValue(-start * h);
  useEffect(() => {
    y.set(withDelay(delay, withTiming(-end * h, { duration: ROLL_MS, easing: ease.standard })));
  }, [y, delay, end, h]);
  const moving = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return (
    <View testID="roll-cell" style={{ height: h, overflow: 'hidden' }}>
      <Animated.View style={moving}>
        {DIGITS.map((d, i) => (
          <Text key={i} style={[style, { lineHeight: lh, height: h }]} maxFontSizeMultiplier={1.3}>{d}</Text>
        ))}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({ row: { flexDirection: 'row' } });
