import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AuthInput } from '@/components/auth/AuthInput';
import { PasswordRuleList, PasswordStrength, passwordRules } from '@/components/auth/PasswordRules';
import { Btn, ScreenHeader } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { Icon } from '@/components/icons';
import { changePassword } from '@/api/settings';

export default function ChangePassword() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'bad' } | null>(null);

  const rulesOk = passwordRules(next).every((r) => r.met);
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = !!current && rulesOk && !!confirm && !mismatch;

  const submit = async () => {
    setBusy(true);
    setNote(null);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setNote({ text: 'Password changed.', tone: 'ok' });
    } catch (e: any) {
      setNote({ text: e.message || 'Could not change your password.', tone: 'bad' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Change password" onBack={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <Ghost text="Key" size={170} style={{ left: -20, bottom: 30 }} />

          <View style={{ paddingTop: 20 }}>
            <View style={{ width: 52, height: 52, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="lock" size={24} color="#F97316" strokeWidth={2} />
            </View>
            {/* The artboard says "last changed 4 months ago"; the profile
                payload carries no password timestamp, so this states what the
                change actually does instead of inventing a date. */}
            <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: '#d4d4d4', marginTop: 13, maxWidth: 300 }}>
              You stay signed in on this device. Other devices are signed out and will need the new password.
            </Text>
          </View>

          <View style={{ paddingTop: 20 }}>
            <AuthInput label="Current password" icon="lock" secureToggle autoCapitalize="none" value={current} onChangeText={setCurrent} />

            <AuthInput label="New password" icon="lock" secureToggle autoCapitalize="none" value={next} onChangeText={setNext} />
            <PasswordStrength password={next} />
            <PasswordRuleList password={next} />

            <View style={{ marginTop: 16 }}>
              <AuthInput
                label="Confirm new password"
                icon="lock"
                secureToggle
                autoCapitalize="none"
                value={confirm}
                onChangeText={setConfirm}
                error={mismatch ? 'Passwords do not match' : undefined}
              />
            </View>

            {note ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name={note.tone === 'ok' ? 'check' : 'alert'} size={13} color={note.tone === 'ok' ? '#16C46A' : '#FF4438'} strokeWidth={2.6} />
                <Text style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: note.tone === 'ok' ? '#16C46A' : '#FF4438' }}>
                  {note.text}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.12)', backgroundColor: '#101010', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
        <Btn label="Update password" busy={busy} disabled={!ready} onPress={submit} />
      </View>
    </Screen>
  );
}
