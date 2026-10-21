import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

/** Final-shape placeholder. Motion: a 1.4s left-to-right shimmer; static under reduced motion. */
export function Skeleton({ style }: { style: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (reduced || !w) return;
    x.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
  }, [reduced, w, x]);

  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: (x.value * 2 - 1) * w }] }));

  return (
    <View style={[s.base, style]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w && !reduced ? (
        <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
          <LinearGradient colors={[colors.skeleton, colors.skeletonHi, colors.skeleton]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({ base: { backgroundColor: colors.skeleton, overflow: 'hidden', borderRadius: 5 } });
