// src/app/(onboarding)/card-preview.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '@/store/hooks';
import { PlayerIDCard } from '@/components/onboarding/PlayerIDCard';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { SPORT_LABELS } from '@/lib/sports';

export default function CardPreview() {
  const router = useRouter();
  const { fullName, sport, photoUri } = useAppSelector((s) => s.onboarding);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <Text className="mb-8 text-center font-oswald uppercase text-brand" style={{ fontSize: 13, letterSpacing: 4 }}>
          Your Player Card
        </Text>
        <PlayerIDCard
          name={fullName || 'Your Name'}
          sport={SPORT_LABELS[sport || ''] || 'Badminton'}
          photoUri={photoUri}
          locked="preview"
        />
        <Text className="mt-8 text-center font-oswald uppercase text-white" style={{ fontSize: 24, lineHeight: 30, paddingTop: 2 }}>
          Let&apos;s make it yours.
        </Text>
        <Text className="mt-2 text-center font-montserrat text-sm text-gray-400">
          Create your account to claim it.
        </Text>
      </View>
      <View className="py-4">
        <OnboardingButton label="Continue" onPress={() => router.push('/(onboarding)/auth')} />
      </View>
    </SafeAreaView>
  );
}
