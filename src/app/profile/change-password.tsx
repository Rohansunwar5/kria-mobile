import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { goBack } from '@/lib/nav';
import { colors, font, radius, space } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { FooterBar, TopBar } from '@/components/ui/Bars';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { changePassword } from '@/api/settings';
import { mismatch, passwordFormReady, passwordRules, passwordScore, strengthLabel } from '@/lib/password';

function Field({ label, value, onChangeText, children }: { label: string; value: string; onChangeText: (t: string) => void; children?: React.ReactNode }) {
  const [focus, setFocus] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <View>
        <TextInput
          accessibilityLabel={label}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={[s.field, focus && { borderColor: colors.accent }]}
        />
        <Tap scale={0.95} accessibilityLabel={shown ? 'Hide password' : 'Show password'} onPress={() => setShown((v) => !v)} style={s.eye}>
          <Icon name={shown ? 'visibility_off' : 'visibility'} size={20} color={colors.text3} />
        </Tap>
      </View>
      {children}
    </View>
  );
}

export default function ChangePassword() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const ready = passwordFormReady({ current, next, confirm });
  const score = passwordScore(next);

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setNote(null);
    try {
      await changePassword(current, next);
      if (!alive.current) return;
      setCurrent('');
      setNext('');
      setConfirm('');
      setNote({ text: 'Password changed. Any other device is now signed out.', ok: true });
    } catch (e) {
      if (alive.current) setNote({ text: (e as Error).message || 'Could not change your password.', ok: false });
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <TopBar title="Change password" onBack={() => goBack(router, '/profile/settings')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Field label="Current password" value={current} onChangeText={setCurrent} />
          <Field label="New password" value={next} onChangeText={setNext}>
            <View style={s.strength}>
              <View style={s.bars}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[s.bar, { backgroundColor: i < score ? colors.accent : colors.lineStrong }]} />
                ))}
              </View>
              <Text style={s.word}>{next ? strengthLabel(score) : ''}</Text>
            </View>
            <View style={{ gap: 8, marginTop: 6 }}>
              {passwordRules(next).map((r) => (
                <View key={r.label} style={s.rule}>
                  <Icon name={r.met ? 'check_circle' : 'radio_button_unchecked'} variant={r.met ? 'f' : 'o'} size={18} color={r.met ? colors.accent : colors.text4} />
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: r.met ? colors.text2 : r.required ? colors.text3 : colors.text4 }}>{r.label}</Text>
                </View>
              ))}
            </View>
          </Field>
          <Field label="Confirm new password" value={confirm} onChangeText={setConfirm}>
            {mismatch(next, confirm) ? (
              <View style={s.rule}>
                <Icon name="error" size={16} color={colors.error} />
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.error }}>Doesn't match the new password</Text>
              </View>
            ) : null}
          </Field>
          {note ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: note.ok ? colors.text2 : colors.error }}>{note.text}</Text> : null}
        </ScrollView>
        <FooterBar>
          <Button label="Update password" busyLabel="Updating" busy={busy} disabled={!ready} onPress={submit} style={{ flex: 1 }} />
        </FooterBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 24, gap: 22 },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  field: { height: 52, paddingLeft: 16, paddingRight: 52, borderRadius: radius.input, backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.surface3, color: colors.text, fontFamily: font.regular, fontSize: 15 },
  eye: { position: 'absolute', right: 4, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  strength: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  bars: { flex: 1, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  word: { fontFamily: font.regular, fontSize: 12, color: colors.text2, minWidth: 72, textAlign: 'right' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
