// src/app/(onboarding)/card-preview.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '@/store/hooks';
import { PlayerIDCard } from '@/components/onboarding/PlayerIDCard';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { StepDots } from '@/components/onboarding/StepDots';
import { SPORT_LABELS } from '@/lib/sports';

export default function CardPreview() {
  const router = useRouter();
  const { fullName, sport, photoUri } = useAppSelector((s) => s.onboarding);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="py-4">
        <StepDots total={2} current={1} />
      </View>
      <View className="flex-1 justify-center">
        <PlayerIDCard
          name={fullName || 'Your Name'}
          sport={SPORT_LABELS[sport || ''] || 'Badminton'}
          photoUri={photoUri}
          locked="preview"
        />
        <Text className="mt-8 text-center font-oswald text-2xl uppercase text-white">{"Let's change that."}</Text>
      </View>
      <View className="py-4">
        <OnboardingButton label="Continue" onPress={() => router.push('/(onboarding)/auth')} />
      </View>
    </SafeAreaView>
  );
}
