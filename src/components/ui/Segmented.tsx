import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, ease, font, motion } from '@/constants/theme';

/** DESIGN §5.10 + Motion "Segment slide": surface3 thumb slides in 220ms on a surface1 track. */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const reduced = useReducedMotion();
  const [boxes, setBoxes] = useState<Partial<Record<T, { x: number; width: number }>>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const box = boxes[value];

  useEffect(() => {
    if (!box) return;
    const first = w.value === 0;
    const t = { duration: first || reduced ? 0 : motion.enter, easing: ease.standard };
    x.value = withTiming(box.x, t);
    w.value = withTiming(box.width, t);
  }, [box, reduced, x, w]);
  const thumb = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));

  return (
    <View style={s.track} accessibilityRole="tablist">
      <Animated.View style={[s.thumb, thumb]} />
      {options.map((o) => (
        <Pressable
          key={o.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.key === value }}
          onLayout={(e) => {
            const { x: bx, width } = e.nativeEvent.layout;
            setBoxes((b) => ({ ...b, [o.key]: { x: bx, width } }));
          }}
          onPress={() => onChange(o.key)}
          style={s.segment}
        >
          <Text style={[s.label, { color: o.key === value ? colors.text : colors.text3 }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  track: { flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: colors.surface1 },
  thumb: { position: 'absolute', top: 3, bottom: 3, left: 0, borderRadius: 9, backgroundColor: colors.surface3 },
  segment: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  label: { fontFamily: font.semibold, fontSize: 13 },
});
