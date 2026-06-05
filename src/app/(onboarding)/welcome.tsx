// src/app/(onboarding)/welcome.tsx
import { ImageBackground, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const HERO =
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80';

export default function Welcome() {
  const router = useRouter();
  return (
    <ImageBackground source={{ uri: HERO }} className="flex-1" style={{ backgroundColor: '#111111' }}>
      <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
        <SafeAreaView edges={['top', 'bottom']} className="flex-1 justify-end px-6 pb-10">
          <Text className="font-oswald text-5xl uppercase leading-[0.95] text-white">
            Play. Compete. Get Recognized.
          </Text>
          <Text className="mb-8 mt-4 font-montserrat text-base text-gray-300">
            Join tournaments, get drafted into teams, and build your player profile.
          </Text>
          <View className="gap-3">
            <OnboardingButton label="Get Started" onPress={() => router.push('/(onboarding)/sport')} />
            <OnboardingButton label="Sign In" variant="secondary" onPress={() => router.replace('/(auth)/login')} />
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}
