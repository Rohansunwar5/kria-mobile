import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { ease, motion, spring } from '@/constants/theme';

const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable with the Motion press: scale down in 100ms, spring back (snappy, DESIGN v1.2 §9). */
export function Tap({ style, scale = 0.96, onPressIn, onPressOut, ...rest }: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scale?: number;
}) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  const pressed = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        if (!reduced) s.set(withTiming(scale, { duration: motion.fast, easing: ease.standard }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withSpring(1, spring.snappy));
        onPressOut?.(e);
      }}
      style={[style, pressed]}
    />
  );
}
