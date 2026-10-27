import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font } from '@/constants/theme';
import { useAppDispatch } from '@/store/hooks';
import { registerUser } from '@/store/slices/authSlice';
import { emailOk, phoneDigits, phoneOk } from '@/lib/authForms';
import { AuthScreen, Title } from '@/components/signin/AuthScreen';
import { Field } from '@/components/signin/Field';
import { Button } from '@/components/ui/Button';

type Key = 'first' | 'last' | 'email' | 'phone';

export default function Register() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [v, setV] = useState({ first: '', last: '', email: '', phone: '' });
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const set = (k: Key) => (t: string) => { setV((p) => ({ ...p, [k]: k === 'phone' ? phoneDigits(t) : t })); setError(null); };
  const touch = (k: Key) => () => setTouched((p) => ({ ...p, [k]: true }));
  const show = (k: Key) => !!touched[k] || (k === 'phone' && !!v.phone);

  const email = v.email.trim();
  const left = 10 - v.phone.length;
  const err = {
    first: show('first') && !v.first.trim() ? 'Required' : undefined,
    last: show('last') && !v.last.trim() ? 'Required' : undefined,
    email: !show('email') ? undefined : !email ? 'Required' : !emailOk(email) ? 'Enter a valid email, like name@example.com' : undefined,
    phone: !show('phone') ? undefined : !v.phone ? 'Required' : left > 0 ? `${left} more digit${left === 1 ? '' : 's'}` : undefined,
  };
  const ready = !!v.first.trim() && !!v.last.trim() && emailOk(email) && phoneOk(v.phone);

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const res = await dispatch(registerUser({
      data: { firstName: v.first.trim(), lastName: v.last.trim(), email, phone: v.phone },
    }));
    inFlight.current = false;
    if (!alive.current) return;
    setBusy(false);
    if (registerUser.fulfilled.match(res)) router.push('/(auth)/verify-otp');
    else setError((res.payload as string) || 'Something went wrong');
  };

  return (
    <AuthScreen
      onBack={() => router.back()}
      right="1 of 3"
      step={1}
      footer={
        <View style={{ gap: 12 }}>
          {error ? (
            <View style={s.errRow}>
              <Text style={s.err}>{error}</Text>
              {/already registered/i.test(error) ? (
                <Pressable accessibilityRole="link" accessibilityLabel="Log in" hitSlop={10} onPress={() => router.push('/(auth)/login')}>
                  <Text style={s.link}>Log in</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <Button label="Send code to my email" busy={busy} disabled={!ready} onPress={submit} />
        </View>
      }
    >
      <Title>Who's playing?</Title>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="First name" value={v.first} onChangeText={set('first')} onBlur={touch('first')} error={err.first} autoComplete="given-name" textContentType="givenName" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Last name" value={v.last} onChangeText={set('last')} onBlur={touch('last')} error={err.last} autoComplete="family-name" textContentType="familyName" />
        </View>
      </View>
      <Field
        label="Email" helper="We'll send your code here." error={err.email}
        value={v.email} onChangeText={set('email')} onBlur={touch('email')}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
      />
      <Field
        label="Mobile number" helper="Organisers use this to reach you on match day." error={err.phone} prefix="+91"
        value={v.phone} onChangeText={set('phone')} onBlur={touch('phone')}
        keyboardType="number-pad" autoComplete="tel" textContentType="telephoneNumber"
      />
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  err: { fontFamily: font.regular, fontSize: 13, color: colors.error },
  link: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },
});
