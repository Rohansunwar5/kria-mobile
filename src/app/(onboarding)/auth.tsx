// src/app/(onboarding)/auth.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '@/store/hooks';
import { beginOnboardingHandoff } from '@/store/slices/authSlice';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

function DisabledOption({ label }: { label: string }) {
  return (
    <View className="flex-row items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-4 opacity-50">
      <Text className="font-montserrat text-sm text-gray-400">{label}</Text>
      <Text className="ml-2 font-montserrat text-[10px] uppercase tracking-wide text-gray-600">Soon</Text>
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
      {/* Brand + headline block */}
      <View className="flex-1 justify-center">
        <Text className="mb-3 font-oswald uppercase text-brand" style={{ fontSize: 13, letterSpacing: 4 }}>
          One last step
        </Text>
        <Text className="font-oswald uppercase text-white" style={{ fontSize: 44, lineHeight: 48, paddingTop: 4 }}>
          Save your{'\n'}progress.
        </Text>
        <Text className="mt-4 max-w-[300px] font-montserrat text-base leading-6 text-gray-400">
          Create your account to lock in your player card and start competing.
        </Text>
      </View>

      {/* Actions pinned to the bottom */}
      <View className="pb-2">
        <OnboardingButton label="Continue with Email" onPress={continueWithEmail} />

        <View className="my-5 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-white/10" />
          <Text className="font-montserrat text-[11px] uppercase tracking-wide text-gray-500">or</Text>
          <View className="h-px flex-1 bg-white/10" />
        </View>

        <View className="gap-3">
          <DisabledOption label="Continue with Google" />
          <DisabledOption label="Continue with Apple" />
          <DisabledOption label="Continue with Phone" />
        </View>
      </View>
    </SafeAreaView>
  );
}
