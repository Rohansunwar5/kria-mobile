// src/app/(onboarding)/motivation.tsx
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleMotivation } from '@/store/slices/onboardingSlice';
import { MOTIVATIONS } from '@/lib/motivations';
import { MotivationChip } from '@/components/onboarding/MotivationChip';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { StepDots } from '@/components/onboarding/StepDots';

export default function Motivation() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const motivations = useAppSelector((s) => s.onboarding.motivations);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="py-4">
        <StepDots total={5} current={3} />
      </View>
      <Text className="mb-6 font-oswald text-4xl uppercase text-white">What excites you most?</Text>
      <ScrollView className="flex-1">
        <View className="flex-row flex-wrap gap-3">
          {MOTIVATIONS.map((m) => (
            <MotivationChip
              key={m.key}
              label={m.label}
              selected={motivations.includes(m.key)}
              onPress={() => dispatch(toggleMotivation(m.key))}
            />
          ))}
        </View>
      </ScrollView>
      <View className="py-4">
        <OnboardingButton
          label="Continue"
          disabled={motivations.length === 0}
          onPress={() => router.push('/(onboarding)/card-preview')}
        />
      </View>
    </SafeAreaView>
  );
}
