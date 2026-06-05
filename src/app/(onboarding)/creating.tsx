// src/app/(onboarding)/creating.tsx
import { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile, uploadPlayerProfileImage, endOnboardingHandoff } from '@/store/slices/authSlice';
import { setOnboardingComplete } from '@/lib/onboardingStorage';
import { ProgressStep } from '@/components/onboarding/ProgressStep';

const STEPS = ['Profile Created', 'Skill Rating Set', 'Tournament Feed Ready', 'Rankings Enabled'];

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
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <Text className="mb-10 font-oswald text-4xl uppercase text-white">Setting up your profile</Text>
        {STEPS.map((label, i) => (
          <ProgressStep key={label} label={label} done={i < done} />
        ))}
      </View>
    </SafeAreaView>
  );
}
