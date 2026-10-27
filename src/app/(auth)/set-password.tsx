import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { beginOnboardingHandoff, endOnboardingHandoff, setPassword } from '@/store/slices/authSlice';
import { passwordOk, passwordRules } from '@/lib/password';
import { AuthScreen, Title } from '@/components/signin/AuthScreen';
import { PasswordField, RuleList } from '@/components/signin/PasswordField';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function SetPassword() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  // Snapshot: a successful setPassword clears the store's email while the AuthGate is navigating away.
  const [email] = useState(useAppSelector((s) => s.auth.registrationEmail));
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (!email) router.replace('/(auth)/register'); }, [email, router]);
  if (!email) return null;

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    // The AuthGate reacts the moment the user is set, so the handoff flag must already be up.
    dispatch(beginOnboardingHandoff());
    const res = await dispatch(setPassword({ data: { email, password: pw } }));
    inFlight.current = false;
    if (setPassword.fulfilled.match(res)) return;
    dispatch(endOnboardingHandoff());
    if (!alive.current) return;
    setBusy(false);
    setError((res.payload as string) || 'Something went wrong');
  };

  return (
    <AuthScreen
      onBack={() => router.back()}
      right="3 of 3"
      step={3}
      footer={
        <View style={{ gap: 12 }}>
          {error ? <Text style={s.err}>{error}</Text> : null}
          <Button label="Create my account" busy={busy} disabled={!passwordOk(pw)} onPress={submit} />
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        <View style={s.verified}>
          <Icon name="verified" variant="f" size={18} color={colors.accent} />
          <Text style={s.verifiedText}>Email verified</Text>
        </View>
        <Title>Lock it in</Title>
      </View>
      <PasswordField label="Password" value={pw} onChangeText={(t) => { setPw(t); setError(null); }} isNew />
      <RuleList rules={passwordRules(pw)} />
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedText: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  err: { fontFamily: font.regular, fontSize: 13, color: colors.error },
});
