// src/app/(onboarding)/setup.tsx
import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSport } from '@/store/slices/onboardingSlice';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const SPORTS = [
  { key: 'badminton', label: 'Badminton', active: true },
  { key: 'cricket', label: 'Cricket', active: false },
  { key: 'football', label: 'Football', active: false },
  { key: 'table_tennis', label: 'Table Tennis', active: false },
  { key: 'tennis', label: 'Tennis', active: false },
  { key: 'kabaddi', label: 'Kabaddi', active: false },
];

export default function Setup() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selected = useAppSelector((s) => s.onboarding.sport);

  // Default to badminton (the only active sport) so this screen is zero-friction.
  useEffect(() => {
    if (!selected) dispatch(setSport('badminton'));
  }, [selected, dispatch]);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <Text className="mb-2 font-oswald text-4xl uppercase text-white">Lock in your game.</Text>
        <Text className="mb-8 font-montserrat text-base text-gray-400">
          Badminton is live now — more sports are on the way.
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {SPORTS.map((sp) => {
            const isSel = selected === sp.key;
            return (
              <Pressable
                key={sp.key}
                disabled={!sp.active}
                onPress={() => dispatch(setSport(sp.key))}
                accessibilityRole="button"
                className={`rounded-2xl border px-5 py-3 ${
                  isSel ? 'border-brand bg-brand/10' : 'border-white/10 bg-white/5'
                } ${!sp.active ? 'opacity-50' : ''}`}
              >
                <Text className="font-oswald text-base uppercase text-white">{sp.label}</Text>
                {!sp.active ? (
                  <Text className="font-montserrat text-[10px] uppercase tracking-wide text-gray-400">Soon</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View className="py-4">
        <OnboardingButton label="Continue" disabled={!selected} onPress={() => router.push('/(onboarding)/profile')} />
      </View>
    </SafeAreaView>
  );
}
