import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { verifyOtp } from '@/store/slices/authSlice';
import { resendOtp } from '@/api/auth';
import { otpDigits } from '@/lib/authForms';
import { AuthScreen, Title } from '@/components/signin/AuthScreen';
import { CodeBoxes } from '@/components/signin/CodeBoxes';
import { useResend } from '@/components/signin/useResend';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function VerifyOtp() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  // Snapshot: Set password clears the store's email on success, which must not bounce this screen.
  const [email] = useState(useAppSelector((s) => s.auth.registrationEmail));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  const { left, canResend, restart } = useResend(30);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (!email) router.replace('/(auth)/register'); }, [email, router]);
  if (!email) return null;

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const res = await dispatch(verifyOtp({ data: { email, otp: code } }));
    inFlight.current = false;
    if (!alive.current) return;
    setBusy(false);
    if (verifyOtp.fulfilled.match(res)) router.push('/(auth)/set-password');
    else { setError((res.payload as string) || 'Something went wrong'); setCode(''); }
  };

  const resend = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await resendOtp(email);
      if (alive.current) { setCode(''); setError(null); restart(); }
    } catch {
      if (alive.current) setError("Couldn't resend the code. Try again.");
    } finally {
      inFlight.current = false;
    }
  };

  const more = 6 - code.length;
  return (
    <AuthScreen
      onBack={() => router.back()}
      right="2 of 3"
      step={2}
      footer={
        <View style={{ gap: 12 }}>
          {error ? <Text style={s.err}>{error}</Text> : null}
          <Button label="Verify" busy={busy} disabled={code.length !== 6} onPress={submit} />
        </View>
      }
    >
      <Title sub={<>We sent a 6-digit code to <Text style={s.email}>{email}</Text></>}>Check your inbox</Title>
      <CodeBoxes value={code} onChange={(d) => { setCode(otpDigits(d)); setError(null); }} autoFocus />
      <View style={s.status}>
        <Icon name={more > 0 ? 'mail' : 'check_circle'} size={18} color={colors.text3} variant={more > 0 ? 'o' : 'f'} />
        <Text style={s.statusText}>{more > 0 ? `${more} more digit${more === 1 ? '' : 's'}` : 'Code looks complete. Tap Verify.'}</Text>
      </View>
      <View style={s.resend}>
        <Text style={s.statusText}>Didn't get it? Check spam.</Text>
        {canResend ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Resend code" hitSlop={10} onPress={resend}>
            <Text style={s.link}>Resend code</Text>
          </Pressable>
        ) : (
          <Text style={s.statusText}>{`Resend in 0:${String(left).padStart(2, '0')}`}</Text>
        )}
      </View>
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  email: { fontFamily: font.semibold, color: colors.text },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },
  err: { fontFamily: font.regular, fontSize: 13, color: colors.error },
});
