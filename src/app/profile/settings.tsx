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
import { useAppSelector } from '@/store/hooks';
import { sendContactMessage } from '@/api/settings';

export default function Settings() {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const [message, setMessage] = useState('');
  const [focus, setFocus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const submit = async () => {
    if (inFlight.current) return;
    setNote(null);
    const text = message.trim();
    if (text.length < 10) return setNote({ text: 'Tell us a little more so we can help.', ok: false });
    inFlight.current = true;
    setBusy(true);
    try {
      await sendContactMessage({ fullName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(), email: user?.email ?? '', message: text, phone: user?.phone });
      if (!alive.current) return;
      setMessage('');
      setNote({ text: "Sent. We'll reply by email.", ok: true });
    } catch (e) {
      if (alive.current) setNote({ text: (e as Error).message, ok: false });
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <TopBar title="Settings" onBack={() => goBack(router, '/(tabs)/profile')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Text style={s.h}>Account</Text>
          <View style={{ marginTop: 12 }}>
            <View style={s.row}>
              <Icon name="mail" size={22} color={colors.text3} />
              <View style={s.col}>
                <Text style={s.small}>Signed in as</Text>
                <Text style={s.strong}>{user?.email}</Text>
              </View>
            </View>
            <Tap scale={0.99} accessibilityLabel="Change password" onPress={() => router.push('/profile/change-password')} style={s.row}>
              <Icon name="lock" size={22} color={colors.text3} />
              <Text style={[s.strong, { flex: 1 }]}>Change password</Text>
              <Icon name="chevron_right" size={20} color={colors.disabled} />
            </Tap>
          </View>

          <Text style={[s.h, { marginTop: space.sectionGap }]}>Get help</Text>
          <Text style={[s.small, { marginTop: 4 }]}>Tell us what went wrong. We reply to {user?.email}.</Text>
          <Text style={s.label}>Message</Text>
          <TextInput
            accessibilityLabel="Message"
            multiline
            value={message}
            onChangeText={setMessage}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            placeholder="What happened, and where in the app?"
            placeholderTextColor={colors.text4}
            style={[s.field, focus && { borderColor: colors.accent }]}
          />
          <Text style={[s.small, { color: colors.text4 }]}>At least 10 characters</Text>
          {note ? <Text style={[s.small, { color: note.ok ? colors.text2 : colors.error, fontSize: 13 }]}>{note.text}</Text> : null}
        </ScrollView>
        <FooterBar>
          <Button variant="secondary" label="Send message" busyLabel="Sending" busy={busy} disabled={!message.trim()} onPress={submit} style={{ flex: 1 }} />
        </FooterBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: space.gutter, paddingTop: 20, paddingBottom: 24, gap: 0 },
  h: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.line },
  col: { flex: 1, gap: 2 },
  small: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  strong: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.text2, marginTop: space.headerToContent, marginBottom: 8 },
  field: { height: 132, textAlignVertical: 'top', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8, borderRadius: radius.input, backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.surface3, color: colors.text, fontFamily: font.regular, fontSize: 15 },
});
