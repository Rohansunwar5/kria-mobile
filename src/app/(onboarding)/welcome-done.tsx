// src/app/(onboarding)/welcome-done.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { resetOnboarding } from '@/store/slices/onboardingSlice';
import { PlayerIDCard } from '@/components/onboarding/PlayerIDCard';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { SPORT_LABELS } from '@/lib/sports';

export default function WelcomeDone() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { fullName, sport } = useAppSelector((s) => s.onboarding);

  const explore = () => {
    dispatch(resetOnboarding());
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <Text className="font-oswald text-5xl uppercase leading-[0.95] text-white">Your journey starts today.</Text>
        <Text className="mb-8 mt-4 font-montserrat text-base text-gray-300">
          Join your first tournament and earn your first ranking.
        </Text>
        <PlayerIDCard
          name={fullName || 'Your Name'}
          sport={SPORT_LABELS[sport || ''] || 'Badminton'}
          locked="unranked"
        />
        <Text className="mt-6 text-center font-montserrat text-sm text-gray-400">
          Every champion starts unranked.
        </Text>
      </View>
      <View className="py-4">
        <OnboardingButton label="Explore Tournaments" onPress={explore} />
      </View>
    </SafeAreaView>
  );
}
