import { useEffect, useState } from 'react';
import { View, Text, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { registerUser, clearError } from '@/store/slices/authSlice';
import { AuthInput } from '@/components/auth/AuthInput';
import { CloseButton } from '@/components/auth/CloseButton';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const HERO = 'https://images.unsplash.com/photo-1613918431703-aa50889e3be9?auto=format&fit=crop&w=900&q=80';

export default function Register() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error, registrationStep } = useAppSelector((s) => s.auth);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (registrationStep === 2) router.replace('/(auth)/verify-otp');
  }, [registrationStep, router]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-ink">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 280 }} className="w-full justify-between">
          <ImageBackground source={{ uri: HERO }} className="absolute inset-0" style={{ backgroundColor: '#111111' }} />
          <LinearGradient
            colors={['rgba(17,17,17,0.55)', 'rgba(17,17,17,0.1)', 'rgba(17,17,17,0.85)', '#111111']}
            locations={[0, 0.4, 0.82, 1]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <SafeAreaView edges={['top']} className="px-6">
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="font-oswald text-3xl uppercase tracking-wide text-brand">Kria</Text>
              <CloseButton />
            </View>
          </SafeAreaView>
          <View className="px-6 pb-2">
            <Text className="font-oswald text-5xl uppercase leading-[0.92] text-white">Join the{'\n'}league.</Text>
            <Text className="mt-2 font-montserrat text-sm text-gray-300">Create your player account.</Text>
          </View>
        </View>

        <View className="px-6 pt-7">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <AuthInput label="First name" value={firstName} onChangeText={setFirstName} />
            </View>
            <View className="flex-1">
              <AuthInput label="Last name" value={lastName} onChangeText={setLastName} />
            </View>
          </View>
          <AuthInput
            label="Email"
            placeholder="you@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(t) => { setEmail(t); dispatch(clearError()); }}
          />
          <AuthInput label="Phone number" placeholder="Your number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

          {error ? (
            <Text className="mb-3 font-montserrat text-sm text-red-400">{error}</Text>
          ) : null}

          <OnboardingButton
            label="Continue"
            loading={isLoading}
            onPress={() => dispatch(registerUser({ data: { firstName, lastName, email, phone } }))}
          />

          <View className="mt-8 items-center border-t border-white/10 pt-5">
            <Link href="/(auth)/login" className="font-montserrat text-sm text-[#aaa]">
              Already have an account? <Text className="font-medium text-white">Log in</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
