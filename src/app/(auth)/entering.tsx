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
import { Ghost } from '@/components/states';
import { Hairlines, Kick } from '@/components/canvas';

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
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <Hairlines />
      <Ghost text="Kria" size={200} style={{ left: -30, bottom: 120 }} />
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Animated.View style={[logoStyle, { marginBottom: 34 }]}>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 44, lineHeight: 40, color: '#fff' }}>
            Kria
          </Text>
          <Kick style={{ letterSpacing: 0.3 * 9, marginTop: 6 }}>Getting your arena ready</Kick>
        </Animated.View>
        {STEPS.map((label, i) => (
          <ProgressStep key={label} label={label} done={i < done} />
        ))}
      </View>
    </SafeAreaView>
  );
}
