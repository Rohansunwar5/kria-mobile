// src/app/(onboarding)/sport.tsx
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSport } from '@/store/slices/onboardingSlice';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { StepDots } from '@/components/onboarding/StepDots';

const SPORTS = [
  { key: 'badminton', label: 'Badminton', active: true },
  { key: 'cricket', label: 'Cricket', active: false },
  { key: 'football', label: 'Football', active: false },
  { key: 'table_tennis', label: 'Table Tennis', active: false },
  { key: 'tennis', label: 'Tennis', active: false },
  { key: 'kabaddi', label: 'Kabaddi', active: false },
];

export default function Sport() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selected = useAppSelector((s) => s.onboarding.sport);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="py-4">
        <StepDots total={5} current={0} />
      </View>
      <Text className="mb-6 font-oswald text-4xl uppercase text-white">What sport do you play?</Text>
      <ScrollView className="flex-1" contentContainerStyle={{ gap: 12 }}>
        {SPORTS.map((sp) => (
          <SelectableCard
            key={sp.key}
            title={sp.label}
            selected={selected === sp.key}
            disabled={!sp.active}
            badge={sp.active ? undefined : 'Coming Soon'}
            onPress={() => dispatch(setSport(sp.key))}
          />
        ))}
      </ScrollView>
      <View className="py-4">
        <OnboardingButton label="Continue" disabled={!selected} onPress={() => router.push('/(onboarding)/profile')} />
      </View>
    </SafeAreaView>
  );
}
