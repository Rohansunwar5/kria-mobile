// src/app/(onboarding)/creating.tsx
import { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile, uploadPlayerProfileImage, endOnboardingHandoff } from '@/store/slices/authSlice';
import { setOnboardingComplete } from '@/lib/onboardingStorage';
import { ProgressStep } from '@/components/onboarding/ProgressStep';
import { Ghost } from '@/components/states';
import { Hairlines, Kick } from '@/components/canvas';

const STEPS = ['Profile Created', 'Player Profile Ready', 'Tournament Feed Ready', 'Rankings Enabled'];

function ageToDob(age: number | null): string | undefined {
  if (!age) return undefined;
  const year = new Date().getFullYear() - age;
  return `${year}-01-01`;
}

export default function Creating() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const onboarding = useAppSelector((s) => s.onboarding);
  const [done, setDone] = useState(0);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Best-effort: persist the fields the backend supports. Never blocks the flow.
    const persist = async () => {
      try {
        await dispatch(
          updateProfile({
            data: {
              gender: onboarding.gender || undefined,
              dateOfBirth: ageToDob(onboarding.age),
              sport: onboarding.sport || undefined,
            },
          })
        ).unwrap();
      } catch {
        // ignore — onboarding still completes
      }
      // The photo was picked before the account existed, so this is the first
      // chance to attach it. Also best-effort.
      if (onboarding.photoUri) {
        try {
          await dispatch(
            uploadPlayerProfileImage({ uri: onboarding.photoUri, name: 'avatar.jpg', type: 'image/jpeg' })
          ).unwrap();
        } catch {
          // ignore
        }
      }
    };
    persist();
    setOnboardingComplete().catch(() => {});
  }, [dispatch, onboarding]);

  // Animate the checklist, then advance.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setDone(i + 1), 500 * (i + 1)));
    });
    timers.push(
      setTimeout(() => {
        dispatch(endOnboardingHandoff());
        router.replace('/(onboarding)/welcome-done');
      }, 500 * STEPS.length + 700)
    );
    return () => timers.forEach(clearTimeout);
  }, [dispatch, router]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <Hairlines />
      <Ghost text="Card" size={200} style={{ right: -34, bottom: 130 }} />
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Kick style={{ letterSpacing: 0.26 * 9 }}>Almost there</Kick>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 40, lineHeight: 35, color: '#fff', marginTop: 12, marginBottom: 28 }}>
          Cutting your{'\n'}player card
        </Text>
        {STEPS.map((label, i) => (
          <ProgressStep key={label} label={label} done={i < done} />
        ))}
      </View>
    </SafeAreaView>
  );
}
