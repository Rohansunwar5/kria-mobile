import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font, radius } from '@/constants/theme';
import { useAppDispatch } from '@/store/hooks';
import { loginUser, requestLoginOtp } from '@/store/slices/authSlice';
import { emailOk, loginErrorMessage } from '@/lib/authForms';
import { AuthScreen, Title } from '@/components/signin/AuthScreen';
import { Field } from '@/components/signin/Field';
import { PasswordField } from '@/components/signin/PasswordField';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';

type Mode = 'password' | 'code';
const MODES: { key: Mode; label: string }[] = [
  { key: 'password', label: 'Password' },
  { key: 'code', label: 'Email me a code' },
];

export default function Login() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; reset?: string }>();
  // Snapshot: the params belong to the arrival, not to later edits.
  const [afterReset, setAfterReset] = useState(params.reset === '1');
  const [mode, setMode] = useState<Mode>('password');
  const [emailRaw, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  // Reset password dismisses back to this screen with new params; it stays mounted, so arrive again.
  useEffect(() => {
    if (params.reset !== '1') return;
    setAfterReset(true); setMode('password'); setPassword(''); setError(null);
    if (params.email) setEmail(params.email);
  }, [params.reset, params.email]);

  const email = emailRaw.trim();
  const ready = emailOk(email) && (mode === 'code' || !!password);

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    if (mode === 'password') {
      // Success sets the user; the AuthGate takes the player out of (auth).
      const res = await dispatch(loginUser({ data: { email, password } }));
      inFlight.current = false;
      if (!alive.current) return;
      setBusy(false);
      if (!loginUser.fulfilled.match(res)) {
        setError(loginErrorMessage(res.meta.status, res.payload));
      }
    } else {
      const res = await dispatch(requestLoginOtp({ data: { email } }));
      inFlight.current = false;
      if (!alive.current) return;
      setBusy(false);
      if (requestLoginOtp.fulfilled.match(res)) router.push({ pathname: '/(auth)/login-code', params: { email } });
      else setError((res.payload as string) || 'Something went wrong');
    }
  };

  const switchTo = (m: Mode) => { setMode(m); setError(null); };

  return (
    <AuthScreen
      onBack={() => router.back()}
      footer={
        <View style={{ gap: 12 }}>
          {error ? (
            <View style={s.errRow}>
              <Text style={s.err}>{error}</Text>
              {mode === 'password' && /password not set/i.test(error) ? (
                <Pressable accessibilityRole="link" accessibilityLabel="Email me a code" hitSlop={10} onPress={() => switchTo('code')}>
                  <Text style={s.link}>Email me a code</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <Button label={mode === 'password' ? 'Log in' : 'Email me a code'} busy={busy} disabled={!ready} onPress={submit} />
          <Pressable accessibilityRole="link" accessibilityLabel="Create account" onPress={() => router.push('/(auth)/intro')} style={s.create}>
            <Text style={s.createText}>New to Kria? <Text style={s.createBold}>Create account</Text></Text>
          </Pressable>
        </View>
      }
    >
      <Title>Welcome back</Title>
      {afterReset ? (
        <View accessibilityRole="alert" style={s.card}>
          <Icon name="check_circle" variant="f" size={20} color={colors.accent} />
          <Text style={s.cardText}>Password changed. Log in with your new one.</Text>
        </View>
      ) : null}
      <Segmented fill options={MODES} value={mode} onChange={switchTo} />
      <Field
        label="Email" value={emailRaw} onChangeText={(t) => { setEmail(t); setError(null); }}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
        placeholder="you@example.com"
      />
      {mode === 'password' ? (
        <View>
          <PasswordField
            label="Password" value={password} onChangeText={(t) => { setPassword(t); setError(null); }}
            placeholder={afterReset ? 'Your new password' : undefined}
          />
          <Pressable
            accessibilityRole="link" accessibilityLabel="Forgot password" hitSlop={10} style={s.forgot}
            onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: { email } })}
          >
            <Text style={s.forgotText}>Forgot?</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={s.note}>We'll email a one-time code to this address. No password needed.</Text>
      )}
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.input, backgroundColor: colors.surface1 },
  cardText: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.text2 },
  note: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.text3 },
  forgot: { position: 'absolute', top: 0, right: 0 }, // sits on the Password label row
  forgotText: { fontFamily: font.medium, fontSize: 13, color: colors.text3 },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  err: { fontFamily: font.regular, fontSize: 13, color: colors.error },
  link: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },
  create: { height: 44, alignItems: 'center', justifyContent: 'center' },
  createText: { fontFamily: font.regular, fontSize: 14, color: colors.text2 },
  createBold: { fontFamily: font.semibold, color: colors.text },
});
