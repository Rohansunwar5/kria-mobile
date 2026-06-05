// src/app/(onboarding)/auth.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '@/store/hooks';
import { beginOnboardingHandoff } from '@/store/slices/authSlice';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

function DisabledOption({ label }: { label: string }) {
  return (
    <View className="flex-row items-center justify-center rounded-3xl border border-white/10 bg-white/5 py-4 opacity-50">
      <Text className="font-montserrat text-base text-gray-400">{label}</Text>
      <Text className="ml-2 font-montserrat text-[10px] uppercase tracking-wide text-gray-600">Coming soon</Text>
    </View>
  );
}

export default function OnboardingAuth() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const continueWithEmail = () => {
    dispatch(beginOnboardingHandoff());
    router.push('/(auth)/register');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <Text className="mb-2 font-oswald text-4xl uppercase text-white">Save your progress</Text>
        <Text className="mb-10 font-montserrat text-base text-gray-400">
          Create your account to lock in your player profile.
        </Text>
        <View className="gap-3">
          <OnboardingButton label="Continue with Email" onPress={continueWithEmail} />
          <DisabledOption label="Continue with Google" />
          <DisabledOption label="Continue with Apple" />
          <DisabledOption label="Continue with Phone Number" />
        </View>
      </View>
    </SafeAreaView>
  );
}
