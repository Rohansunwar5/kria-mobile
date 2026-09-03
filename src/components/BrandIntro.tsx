import { useEffect } from 'react';
import { Text, Image, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Hazard } from '@/components/canvas';

// One-time app-open brand reveal: ink screen, KRIA wordmark scales/fades in,
// a hazard bar sweeps across, holds briefly, then the whole overlay fades out
// and hands off to the app.
export function BrandIntro({ onDone }: { onDone: () => void }) {
  const logo = useSharedValue(0); // 0 → 1 logo reveal
  const sweep = useSharedValue(0); // 0 → 1 accent bar sweep
  const fade = useSharedValue(1); // overlay opacity (1 → 0 on exit)

  const { width } = Dimensions.get('window');

  useEffect(() => {
    logo.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    sweep.value = withDelay(450, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) }));
    // Hold, then fade the overlay out and notify the parent.
    fade.value = withDelay(
      1500,
      withTiming(0, { duration: 450, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
  }, [logo, sweep, fade, onDone]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: [
      { translateY: interpolate(logo.value, [0, 1], [16, 0], Extrapolation.CLAMP) },
      { scale: interpolate(logo.value, [0, 1], [0.92, 1], Extrapolation.CLAMP) },
    ],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    width: interpolate(sweep.value, [0, 1], [0, Math.min(160, width * 0.42)], Extrapolation.CLAMP),
    opacity: interpolate(sweep.value, [0, 0.2, 1], [0, 1, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0B0B0B', alignItems: 'center', justifyContent: 'center' },
        overlayStyle,
      ]}
    >
      <Animated.View style={logoStyle}>
        <Image
          source={require('../../assets/images/logo.png')}
          resizeMode="contain"
          style={{ width: 74, height: 65, alignSelf: 'center', marginBottom: 14 }}
        />
        <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 64, lineHeight: 58, letterSpacing: 0.01 * 64, color: '#FFFFFF', textTransform: 'uppercase' }}>
          Kria
        </Text>
        <Animated.View style={[{ height: 5, marginTop: 12, alignSelf: 'center', overflow: 'hidden' }, sweepStyle]}>
          <Hazard />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
