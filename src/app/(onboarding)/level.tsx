// src/app/(onboarding)/level.tsx
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setLevel, SkillLevel } from '@/store/slices/onboardingSlice';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { StepDots } from '@/components/onboarding/StepDots';

const LEVELS: { key: SkillLevel; title: string; description: string }[] = [
  { key: 'beginner', title: 'Beginner', description: 'New to the sport, learning the basics.' },
  { key: 'intermediate', title: 'Intermediate', description: 'Play regularly, comfortable in rallies.' },
  { key: 'advanced', title: 'Advanced', description: 'Strong technique, compete locally.' },
  { key: 'competitive', title: 'Competitive', description: 'Tournament-level, chasing rankings.' },
];

export default function Level() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selected = useAppSelector((s) => s.onboarding.level);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="py-4">
        <StepDots total={5} current={2} />
      </View>
      <Text className="mb-6 font-oswald text-4xl uppercase text-white">What's your level?</Text>
      <ScrollView className="flex-1" contentContainerStyle={{ gap: 12 }}>
        {LEVELS.map((lv) => (
          <SelectableCard
            key={lv.key}
            title={lv.title}
            description={lv.description}
            selected={selected === lv.key}
            onPress={() => dispatch(setLevel(lv.key))}
          />
        ))}
      </ScrollView>
      <View className="py-4">
        <OnboardingButton label="Continue" disabled={!selected} onPress={() => router.push('/(onboarding)/motivation')} />
      </View>
    </SafeAreaView>
  );
}
