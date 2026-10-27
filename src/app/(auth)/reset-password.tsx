import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font } from '@/constants/theme';
import { requestPasswordReset, resetPassword } from '@/api/auth';
import { otpDigits } from '@/lib/authForms';
import { passwordOk, passwordRules } from '@/lib/password';
import { AuthScreen, Title } from '@/components/signin/AuthScreen';
import { CodeBoxes } from '@/components/signin/CodeBoxes';
import { PasswordField, RuleList } from '@/components/signin/PasswordField';
import { useResend } from '@/components/signin/useResend';
import { Button } from '@/components/ui/Button';

const messageOf = (e: any) => e?.response?.data?.message || e?.response?.data?.error || 'Something went wrong';

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email] = useState(params.email);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  const { left, canResend, restart } = useResend(30);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (!email) router.replace('/(auth)/forgot-password'); }, [email, router]);
  if (!email) return null;

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await resetPassword(email, code, pw);
      // Back to the Log in already in the stack (or replace when there is none), not a second one.
      if (alive.current) router.dismissTo({ pathname: '/(auth)/login', params: { reset: '1', email } });
    } catch (e) {
      if (alive.current) { setError(messageOf(e)); setCode(''); }
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const resend = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await requestPasswordReset(email);
      if (alive.current) { setCode(''); setError(null); restart(); }
    } catch {
      if (alive.current) setError("Couldn't resend the code. Try again.");
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <AuthScreen
      onBack={() => router.back()}
      footer={
        <View style={{ gap: 12 }}>
          {error ? <Text style={s.err}>{error}</Text> : null}
          <Button label="Reset password" busy={busy} disabled={code.length !== 6 || !passwordOk(pw)} onPress={submit} />
        </View>
      }
    >
      <Title sub={<>Enter the 6-digit code we sent to <Text style={s.email}>{email}</Text></>}>Set a new password</Title>
      <CodeBoxes value={code} onChange={(d) => { setCode(otpDigits(d)); setError(null); }} autoFocus />
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
      <PasswordField label="New password" value={pw} onChangeText={(t) => { setPw(t); setError(null); }} placeholder="At least 8 characters" isNew />
      <RuleList rules={passwordRules(pw)} />
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  email: { fontFamily: font.semibold, color: colors.text },
  statusText: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },
  err: { fontFamily: font.regular, fontSize: 13, color: colors.error },
});
