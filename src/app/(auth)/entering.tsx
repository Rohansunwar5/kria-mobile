// src/app/(auth)/entering.tsx
// A short branded transition shown after a returning user logs in, before
// handing off to the app home. Gives login a premium "setting things up" beat
// instead of a hard jump.
import { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { ProgressStep } from '@/components/onboarding/ProgressStep';

const STEPS = ['Signing you in', 'Loading your tournaments', 'Syncing your player profile'];

export default function Entering() {
  const router = useRouter();
  const [done, setDone] = useState(0);
  const ran = useRef(false);
  const logo = useSharedValue(0);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    logo.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });

    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setDone(i + 1), 450 * (i + 1)));
    });
    timers.push(
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 450 * STEPS.length + 600)
    );
    return () => timers.forEach(clearTimeout);
  }, [router, logo]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: [{ translateY: withDelay(0, withTiming((1 - logo.value) * 12)) }],
  }));

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <Animated.View style={logoStyle} className="mb-12 items-center">
          <Text className="font-oswald uppercase text-brand" style={{ fontSize: 44, letterSpacing: 4, paddingTop: 4 }}>
            Kria
          </Text>
          <Text className="mt-2 font-montserrat text-sm text-gray-400">Getting your arena ready…</Text>
        </Animated.View>
        {STEPS.map((label, i) => (
          <ProgressStep key={label} label={label} done={i < done} />
        ))}
      </View>
    </SafeAreaView>
  );
}
