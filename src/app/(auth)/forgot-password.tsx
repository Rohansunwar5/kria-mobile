import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font } from '@/constants/theme';
import { requestPasswordReset } from '@/api/auth';
import { emailOk } from '@/lib/authForms';
import { AuthScreen, Title } from '@/components/signin/AuthScreen';
import { Field } from '@/components/signin/Field';
import { Button } from '@/components/ui/Button';

export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [emailRaw, setEmail] = useState(params.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const email = emailRaw.trim();

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await requestPasswordReset(email);
      if (alive.current) router.push({ pathname: '/(auth)/reset-password', params: { email } });
    } catch (e: any) {
      if (alive.current) setError(e?.response?.data?.message || e?.response?.data?.error || 'Something went wrong');
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  };

  return (
    <AuthScreen
      onBack={() => router.back()}
      footer={
        <View style={{ gap: 12 }}>
          {error ? (
            <View style={s.errRow}>
              <Text style={s.err}>{error}</Text>
              {/not verified/i.test(error) ? (
                <Pressable accessibilityRole="link" accessibilityLabel="Create account" hitSlop={10} onPress={() => router.push('/(auth)/intro')}>
                  <Text style={s.link}>Create account</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <Button label="Email me a code" busy={busy} disabled={!emailOk(email)} onPress={submit} />
          <Pressable
            accessibilityRole="link" accessibilityLabel="Log in" style={s.remember}
            onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/(auth)/login', params: { email } }))}
          >
            <Text style={s.rememberText}>Remembered it? <Text style={s.rememberBold}>Log in</Text></Text>
          </Pressable>
        </View>
      }
    >
      <Title sub="We'll email you a 6-digit code to set a new one.">Forgot your password?</Title>
      <Field
        label="Email" value={emailRaw} onChangeText={(t) => { setEmail(t); setError(null); }}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
        placeholder="you@example.com"
      />
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  err: { fontFamily: font.regular, fontSize: 13, color: colors.error },
  link: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },
  remember: { height: 44, alignItems: 'center', justifyContent: 'center' },
  rememberText: { fontFamily: font.regular, fontSize: 14, color: colors.text2 },
  rememberBold: { fontFamily: font.semibold, color: colors.text },
});
