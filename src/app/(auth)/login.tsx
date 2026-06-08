import { useState } from 'react';
import { View, Text, Pressable, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginUser, requestLoginOtp, verifyLoginOtp, clearError } from '@/store/slices/authSlice';
import { AuthInput } from '@/components/auth/AuthInput';
import { CloseButton } from '@/components/auth/CloseButton';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

type Mode = 'password' | 'otp';

const HERO = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80';

export default function Login() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);

  const submitPassword = () => dispatch(loginUser({ data: { email, password } }));
  const requestOtp = async () => {
    const res = await dispatch(requestLoginOtp({ data: { email } }));
    if (requestLoginOtp.fulfilled.match(res)) setOtpRequested(true);
  };
  const submitOtp = () => dispatch(verifyLoginOtp({ data: { email, otp } }));

  const ctaLabel = mode === 'password' ? 'Log in' : otpRequested ? 'Verify OTP' : 'Send OTP';
  const onCta = mode === 'password' ? submitPassword : otpRequested ? submitOtp : requestOtp;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-ink">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: headline lives INSIDE the image over a deep gradient that melts into ink. */}
        <View style={{ height: 320 }} className="w-full justify-between">
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
            <Text className="font-oswald uppercase text-white" style={{ fontSize: 44, lineHeight: 48, paddingTop: 4 }}>Welcome{'\n'}back.</Text>
            <Text className="mt-2 font-montserrat text-sm text-gray-300">Pick up where you left off.</Text>
          </View>
        </View>

        {/* Form */}
        <View className="px-6 pt-7">
          <AuthInput
            label="Email"
            placeholder="you@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(t) => { setEmail(t); dispatch(clearError()); }}
          />

          {mode === 'password' ? (
            <AuthInput
              label="Password"
              placeholder="Your password"
              secureToggle
              value={password}
              onChangeText={setPassword}
            />
          ) : null}

          {mode === 'otp' && otpRequested ? (
            <AuthInput
              label="OTP"
              placeholder="6-digit code"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
          ) : null}

          {error ? (
            <Text className="mb-3 font-montserrat text-sm text-red-400">{error}</Text>
          ) : null}

          <OnboardingButton label={ctaLabel} loading={isLoading} onPress={onCta} />

          <Pressable
            className="mt-5 items-center"
            onPress={() => {
              setMode((m) => (m === 'password' ? 'otp' : 'password'));
              setOtpRequested(false);
              dispatch(clearError());
            }}
            hitSlop={8}
          >
            <Text className="font-montserrat text-sm font-medium text-brand">
              {mode === 'password' ? 'Log in with OTP instead' : 'Use password instead'}
            </Text>
          </Pressable>

          <View className="mt-8 flex-row justify-between border-t border-white/10 pt-5">
            <Link href="/(auth)/forgot-password" className="font-montserrat text-sm text-[#aaa]">Forgot password?</Link>
            <Link href="/(auth)/register" className="font-montserrat text-sm font-medium text-white">Create account</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
