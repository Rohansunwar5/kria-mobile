import { useState } from 'react';
import { View, Text, Pressable, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginUser, requestLoginOtp, verifyLoginOtp, clearError } from '@/store/slices/authSlice';
import { AuthInput } from '@/components/auth/AuthInput';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { MOTION } from '@/lib/motion';

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
          <Animated.Text
            entering={FadeInDown.duration(MOTION.enterMs)}
            className="mb-6 font-oswald text-4xl uppercase text-white"
          >
            Welcome back.
          </Animated.Text>

          <Animated.View entering={FadeInDown.duration(MOTION.enterMs).delay(MOTION.staggerMs)}>
            <AuthInput
              label="Email"
              placeholder="you@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => { setEmail(t); dispatch(clearError()); }}
            />
          </Animated.View>

          {mode === 'password' ? (
            <Animated.View entering={FadeInDown.duration(MOTION.enterMs).delay(MOTION.staggerMs * 2)}>
              <AuthInput
                label="Password"
                placeholder="Your password"
                secureToggle
                value={password}
                onChangeText={setPassword}
              />
            </Animated.View>
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

          {error ? <Text className="mb-3 font-montserrat text-red-400">{error}</Text> : null}

          <Animated.View entering={FadeInDown.duration(MOTION.enterMs).delay(MOTION.staggerMs * 3)}>
            <OnboardingButton label={ctaLabel} loading={isLoading} onPress={onCta} />
          </Animated.View>

          <Pressable
            className="mt-4 items-center"
            onPress={() => {
              setMode((m) => (m === 'password' ? 'otp' : 'password'));
              setOtpRequested(false);
              dispatch(clearError());
            }}
          >
            <Text className="font-montserrat text-brand">
              {mode === 'password' ? 'Log in with OTP instead' : 'Use password instead'}
            </Text>
          </Pressable>

          <View className="mt-6 flex-row justify-between">
            <Link href="/(auth)/forgot-password" className="font-montserrat text-[#aaa]">Forgot password?</Link>
            <Link href="/(auth)/register" className="font-montserrat text-[#aaa]">Create account</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
