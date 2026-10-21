import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { AwardBadge } from '@/components/AwardBadge';
import { colors, display, ease, font, motion } from '@/constants/theme';
import type { Milestone as MilestoneView } from '@/lib/homeView';

const SIZE = 96;

/**
 * Next milestone (mock 1a): the minted silver coin fills up over the locked
 * one to the progress so far. Motion "Progress fill": 520ms, once per mount.
 */
export function Milestone({ m }: { m: MilestoneView }) {
  const reduced = useReducedMotion();
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = reduced ? m.fraction * SIZE : withDelay(400, withTiming(m.fraction * SIZE, { duration: motion.fill, easing: ease.standard }));
  }, [m.fraction, reduced, h]);
  const fill = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <View style={s.row} accessible accessibilityLabel={`${m.label}, ${m.percent} done. ${m.hint}`}>
      <View style={{ width: SIZE, height: SIZE }}>
        <AwardBadge shape="coin" metal="locked" size={SIZE} glyph={m.glyph} sub={m.sub} />
        <Animated.View style={[s.fill, fill]}>
          <View style={s.anchor}><AwardBadge shape="coin" metal="silver" size={SIZE} glyph={m.glyph} sub={m.sub} /></View>
        </Animated.View>
      </View>
      <View style={s.text}>
        <Text style={s.label}>{m.label}</Text>
        <Text style={display(34)}>{m.percent}</Text>
        <Text style={s.hint}>{m.hint}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  anchor: { position: 'absolute', left: 0, bottom: 0 },
  text: { flex: 1, gap: 6 },
  label: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
});
