import { useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginUser, requestLoginOtp, verifyLoginOtp, clearError } from '@/store/slices/authSlice';
import { AuthInput } from '@/components/auth/AuthInput';
import { Btn, Hairlines, Lbl } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { Icon } from '@/components/icons';

type Mode = 'password' | 'otp';

// The artboard's atmosphere is a radial glow at 78% 6%; RN has no radial
// gradient, so this is the nearest diagonal linear fade. Everything else —
// hairlines, the ghost K, the method switch — is drawn as designed.
function Method({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{ flex: 1, paddingVertical: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#F97316' : 'transparent' }}
    >
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 13, color: on ? '#0B0B0B' : '#7d7d7d' }}>{label}</Text>
    </Pressable>
  );
}

export default function Login() {
  const dispatch = useAppDispatch();
  const router = useRouter();
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

  const ctaLabel = mode === 'password' ? 'Sign in' : otpRequested ? 'Verify code' : 'Send me a code';
  const onCta = mode === 'password' ? submitPassword : otpRequested ? submitOtp : requestOtp;
  const canSubmit = mode === 'password' ? !!email && !!password : otpRequested ? otp.length === 6 : !!email;

  const switchMode = (next: Mode) => {
    setMode(next);
    setOtpRequested(false);
    dispatch(clearError());
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <LinearGradient
        colors={['rgba(249,115,22,0.16)', 'rgba(11,11,11,0)']}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.25, y: 0.55 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Hairlines />
      <Ghost text="K" size={270} style={{ left: -44, top: 150 }} />

      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 24, color: '#fff' }}>Kria</Text>
        <Lbl style={{ color: '#F97316', letterSpacing: 0.3 * 9, marginTop: 4 }}>Player</Lbl>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 44, lineHeight: 38, color: '#fff' }}>
            Welcome{'\n'}back.
          </Text>

          <View style={{ flexDirection: 'row', marginTop: 26, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 5, overflow: 'hidden' }}>
            <Method label="Password" on={mode === 'password'} onPress={() => switchMode('password')} />
            <View style={{ width: 1.5, backgroundColor: 'rgba(255,255,255,0.14)' }} />
            <Method label="Email code" on={mode === 'otp'} onPress={() => switchMode('otp')} />
          </View>

          <View style={{ paddingTop: 20 }}>
            <AuthInput
              label="Email"
              icon="mail"
              placeholder="you@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => { setEmail(t); dispatch(clearError()); }}
            />

            {mode === 'password' ? (
              <AuthInput
                label="Password"
                icon="lock"
                secureToggle
                autoCapitalize="none"
                value={password}
                onChangeText={(t) => { setPassword(t); dispatch(clearError()); }}
                labelRight={
                  <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/forgot-password')} hitSlop={12}>
                    <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, color: '#F97316' }}>FORGOT?</Text>
                  </Pressable>
                }
              />
            ) : null}

            {mode === 'otp' && otpRequested ? (
              <AuthInput
                label="Code"
                icon="lock"
                placeholder="6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(t) => { setOtp(t); dispatch(clearError()); }}
              />
            ) : null}

            {/* Failure stays scoped to the form, in the design's mono red. */}
            {error ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11 }}>
                <Icon name="alert" size={13} color="#FF4438" strokeWidth={2.4} />
                <Text style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#FF4438' }}>
                  {error}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 }}>
        <Btn label={ctaLabel} arrow busy={isLoading} disabled={!canSubmit} onPress={onCta} style={{ marginBottom: 16 }} />
        <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/register')} hitSlop={10} style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.12 * 9, color: '#7d7d7d' }}>
            NEW HERE? <Text style={{ color: '#F97316' }}>CREATE AN ACCOUNT</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
