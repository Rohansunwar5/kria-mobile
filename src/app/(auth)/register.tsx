import { useEffect, useState } from 'react';
import { View, Text, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { registerUser, clearError } from '@/store/slices/authSlice';
import { AuthInput } from '@/components/auth/AuthInput';
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
    <View className="flex-1 bg-ink">
      <View className="h-56 w-full">
        <ImageBackground source={{ uri: HERO }} className="flex-1" style={{ backgroundColor: '#111111' }} />
        <LinearGradient
          colors={['transparent', 'rgba(17,17,17,0.7)', '#111111']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}
        />
        <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 px-6">
          <Text className="mt-4 font-oswald text-3xl uppercase text-brand">Kria</Text>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Text className="mb-6 font-oswald text-4xl uppercase text-white">Join the league.</Text>

          <AuthInput label="First name" value={firstName} onChangeText={setFirstName} />
          <AuthInput label="Last name" value={lastName} onChangeText={setLastName} />
          <AuthInput
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(t) => { setEmail(t); dispatch(clearError()); }}
          />
          <AuthInput label="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

          {error ? <Text className="mb-3 font-montserrat text-red-400">{error}</Text> : null}

          <OnboardingButton
            label="Continue"
            loading={isLoading}
            onPress={() => dispatch(registerUser({ data: { firstName, lastName, email, phone } }))}
          />

          <Link href="/(auth)/login" className="mt-6 text-center font-montserrat text-[#aaa]">
            Already have an account? Log in
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
