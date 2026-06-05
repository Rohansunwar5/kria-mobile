// src/app/(onboarding)/card-preview.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '@/store/hooks';
import { PlayerIDCard } from '@/components/onboarding/PlayerIDCard';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const SPORT_LABELS: Record<string, string> = {
  badminton: 'Badminton',
  cricket: 'Cricket',
  football: 'Football',
  table_tennis: 'Table Tennis',
  tennis: 'Tennis',
  kabaddi: 'Kabaddi',
};

function titleCase(s?: string | null) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function CardPreview() {
  const router = useRouter();
  const { fullName, sport, level, photoUri } = useAppSelector((s) => s.onboarding);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <PlayerIDCard
          name={fullName || 'Your Name'}
          sport={SPORT_LABELS[sport || ''] || 'Badminton'}
          level={titleCase(level)}
          photoUri={photoUri}
          locked="preview"
        />
        <Text className="mt-8 text-center font-oswald text-2xl uppercase text-white">Let's change that.</Text>
      </View>
      <View className="py-4">
        <OnboardingButton label="Continue" onPress={() => router.push('/(onboarding)/auth')} />
      </View>
    </SafeAreaView>
  );
}
