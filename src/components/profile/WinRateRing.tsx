import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Tap } from '@/components/ui/Tap';
import { colors, display, ease, font, motion } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const STROKE = 6;

/**
 * DESIGN §5.8: one ring per sport. Percentage only in the centre (no W-L
 * record), or "4/10" in text3 while a sport is short of a ranking. Fills
 * 0 → value in 620ms the first time it's shown.
 */
export function WinRateRing({ size = 80, fraction, label, muted, name, best, selected, onPress }: {
  size?: number;
  fraction: number;
  label: string;
  muted: boolean;
  name: string;
  best?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const r = (size - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(reduced ? fraction : 0);
  useEffect(() => {
    p.value = reduced ? fraction : withTiming(fraction, { duration: motion.launch, easing: ease.standard });
  }, [fraction, reduced, p]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, p.value))) }));

  return (
    <Tap scale={0.96} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={`${name}: ${label}${best ? ', best sport' : ''}`} onPress={onPress} style={s.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.lineStrong} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={size / 2} cy={size / 2} r={r} stroke={muted ? colors.text3 : colors.accent} strokeWidth={STROKE} fill="none"
            strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={arc} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, s.center]}>
          <Text style={[display(22), muted && { color: colors.text3 }]}>{label}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={[s.name, selected && { color: colors.text, fontFamily: font.semibold }]} numberOfLines={1}>{name}</Text>
        {best ? <Text style={s.best}>Best sport</Text> : null}
        <View style={[s.underline, selected && { backgroundColor: colors.accent }]} />
      </View>
    </Tap>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, width: 92 },
  center: { alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  best: { fontFamily: font.semibold, fontSize: 10.5, color: colors.accentInk },
  underline: { width: 24, height: 2, borderRadius: 1, marginTop: 4 },
});
