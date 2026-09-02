import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { verifyOtp, clearError } from '@/store/slices/authSlice';
import { Btn, Chip, Hazard, IconBtn, Lbl } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { Icon } from '@/components/icons';
import { resendOtp } from '@/api/auth';

const LEN = 6;

/** Six hard cells with one invisible input behind them — the OS keyboard and
 *  SMS autofill both need a single field, and per-cell inputs fight both. */
function OtpCells({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.split('');

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Enter the 6-digit code" onPress={() => input.current?.focus()}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Array.from({ length: LEN }, (_, i) => {
          const active = focused && i === Math.min(value.length, LEN - 1);
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 58,
                borderRadius: 5,
                borderWidth: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? 'rgba(249,115,22,0.10)' : 'rgba(255,255,255,0.06)',
                borderColor: active ? '#F97316' : 'rgba(255,255,255,0.14)',
              }}
            >
              {digits[i] ? (
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 24, color: '#fff' }}>{digits[i]}</Text>
              ) : active ? (
                <View style={{ width: 1.5, height: 26, backgroundColor: '#F97316' }} />
              ) : null}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, LEN))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={LEN}
        // Off-screen rather than opacity:0 — Android still shows a caret at 0.
        style={{ position: 'absolute', top: 0, left: -9999, width: 1, height: 1 }}
      />
    </Pressable>
  );
}

export default function VerifyOtp() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error, registrationStep, registrationEmail } = useAppSelector((s) => s.auth);
  const [otp, setOtp] = useState('');
  const [left, setLeft] = useState(30);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (registrationStep === 3) router.replace('/(auth)/set-password');
  }, [registrationStep, router]);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const submit = () => dispatch(verifyOtp({ data: { email: registrationEmail as string, otp } }));

  const resend = async () => {
    setResending(true);
    try {
      await resendOtp(registrationEmail as string);
      setResent(true);
      setOtp('');
      setLeft(30);
    } catch {
      // Leave the countdown expired so the button stays available.
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <IconBtn icon="chevron-left" label="Go back" onPress={() => router.back()} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Ghost text="6" size={230} style={{ right: -30, bottom: 170 }} />

          <View style={{ height: 5, width: 56, marginBottom: 16, overflow: 'hidden' }}>
            <Hazard />
          </View>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 42, lineHeight: 37, color: '#fff' }}>
            Check your{'\n'}inbox
          </Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: '#d4d4d4', marginTop: 12, maxWidth: 300 }}>
            We sent a 6-digit code to{' '}
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#fff' }}>{registrationEmail}</Text>. It
            expires in 10 minutes.
          </Text>

          <View style={{ paddingTop: 28 }}>
            <OtpCells value={otp} onChange={(v) => { setOtp(v); dispatch(clearError()); }} />
          </View>

          {/* A real countdown, gating the real POST /resend-otp. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 20, minHeight: 44 }}>
            <Icon name="clock" size={15} color="#7d7d7d" strokeWidth={2} />
            {left > 0 ? (
              <Text style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.1 * 10, color: '#a3a3a3' }}>
                RESEND AVAILABLE IN <Text style={{ color: '#F97316' }}>{`0:${String(left).padStart(2, '0')}`}</Text>
              </Text>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Resend code" disabled={resending} onPress={resend} hitSlop={10} style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.1 * 10, color: '#F97316' }}>
                  {resending ? 'SENDING…' : 'RESEND CODE'}
                </Text>
              </Pressable>
            )}
          </View>
          {resent ? (
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, color: '#16C46A', marginTop: 8 }}>
              NEW CODE SENT
            </Text>
          ) : null}

          {error ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <Icon name="alert" size={13} color="#FF4438" strokeWidth={2.4} />
              <Text style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#FF4438' }}>
                {error}
              </Text>
            </View>
          ) : null}

          <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, padding: 13, marginTop: 24 }}>
            <Lbl style={{ marginBottom: 9 }}>Not arriving?</Lbl>
            <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18, color: '#d4d4d4' }}>
              Check spam, and confirm the address above is right. You can go back and change it — nothing is created until
              the code is verified.
            </Text>
            <View style={{ alignSelf: 'flex-start', marginTop: 11 }}>
              <Chip label="Change email" onPress={() => router.back()} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 }}>
        <Btn label="Verify" busy={isLoading} disabled={otp.length !== LEN} onPress={submit} />
      </View>
    </SafeAreaView>
  );
}
