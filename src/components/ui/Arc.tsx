import { useEffect } from 'react';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/** Motion "Arc": 16px in buttons, 20px at list ends; one turn per 750ms. A loader, so it may loop. */
export function Arc({ size = 16, color, track }: { size?: number; color: string; track: string }) {
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: reduced ? 1500 : 750, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(turn);
  }, [reduced, turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: track, borderTopColor: color }, spin]}
    />
  );
}
