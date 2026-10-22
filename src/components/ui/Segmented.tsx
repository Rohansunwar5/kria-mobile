import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, ease, font, motion } from '@/constants/theme';

/**
 * DESIGN §5.10 + Motion "Segment slide": surface3 thumb slides in 220ms on a surface1 track.
 * `light` is the cricket pad's look (on a surface1 sheet): equal segments, a light thumb on a bg track.
 */
export function Segmented<T extends string>({ options, value, onChange, light }: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  light?: boolean;
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
    <View style={[s.track, light && s.lightTrack]} accessibilityRole="tablist">
      <Animated.View style={[s.thumb, light && s.lightThumb, thumb]} />
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
          style={[s.segment, light && s.lightSegment]}
        >
          <Text style={[s.label, { color: o.key === value ? (light ? colors.bg : colors.text) : light ? colors.navIdle : colors.text3 }]}>{o.label}</Text>
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
  lightTrack: { borderRadius: 14, backgroundColor: colors.bg },
  lightThumb: { borderRadius: 11, backgroundColor: colors.text },
  lightSegment: { flex: 1, minHeight: 40, paddingHorizontal: 4, alignItems: 'center' },
});
