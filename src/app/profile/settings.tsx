import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon, type IconName } from '@/components/icons';
import { AuthInput } from '@/components/auth/AuthInput';
import { ErrorBlock } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { sendContactMessage, registerFcmToken, unregisterFcmToken } from '@/api/settings';
import { getPushToken } from '@/lib/pushToken';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
      <Text style={{ ...LBL, marginBottom: 8 }}>{title}</Text>
      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function Row({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 11, minHeight: 52 }}
    >
      <Icon name={icon} size={17} color="#F97316" strokeWidth={1.9} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 14, lineHeight: 13, color: '#fff' }}>{title}</Text>
        {detail ? (
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 8, letterSpacing: 0.1 * 8, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={15} color="#7d7d7d" strokeWidth={2.6} />
    </Pressable>
  );
}

function Button({ label, onPress, busy, disabled }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  const off = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      style={{
        height: 46,
        borderRadius: 5,
        backgroundColor: off ? 'rgba(255,255,255,0.10)' : '#F97316',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, letterSpacing: 0.04 * 15, color: off ? '#7d7d7d' : '#0B0B0B' }}>
        {busy ? 'Working…' : label}
      </Text>
    </Pressable>
  );
}

function Note({ text, tone }: { text: string; tone: 'ok' | 'bad' }) {
  return (
    <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: tone === 'ok' ? '#16C46A' : '#FF4438', marginTop: 8 }}>
      {text}
    </Text>
  );
}

export default function Settings() {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);

  const [push, setPush] = useState(true);
  const [pushNote, setPushNote] = useState<string | null>(null);

  const [message, setMessage] = useState('');
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgNote, setMsgNote] = useState<{ text: string; tone: 'ok' | 'bad' } | null>(null);

  const togglePush = async (on: boolean) => {
    setPush(on);
    setPushNote(null);
    const token = await getPushToken();
    if (!token) {
      // No token means no permission or no device — say so instead of
      // pretending the switch did something.
      setPush(false);
      setPushNote('Allow notifications for this app in your device settings first.');
      return;
    }
    try {
      if (on) await registerFcmToken(token);
      else await unregisterFcmToken(token);
    } catch {
      setPush(!on);
      setPushNote('Could not reach the server. Try again in a moment.');
    }
  };

  const submitMessage = async () => {
    setMsgNote(null);
    if (message.trim().length < 10) {
      setMsgNote({ text: 'Tell us a little more so we can help.', tone: 'bad' });
      return;
    }
    setMsgBusy(true);
    try {
      await sendContactMessage({
        name: user ? `${user.firstName} ${user.lastName}`.trim() : 'Player',
        email: user?.email || '',
        phone: user?.phone,
        message: message.trim(),
      });
      setMessage('');
      setMsgNote({ text: 'Sent. We will reply by email.', tone: 'ok' });
    } catch (e: any) {
      setMsgNote({ text: e.message, tone: 'bad' });
    } finally {
      setMsgBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevron-left" size={19} color="#fff" strokeWidth={2.3} />
        </Pressable>
        <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, color: '#fff' }}>Settings</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Section title="Notifications">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 12, minHeight: 52 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: '#fff' }}>Match and auction alerts</Text>
                <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
                  Draw published · auction starting · your match
                </Text>
              </View>
              <Switch
                value={push}
                onValueChange={togglePush}
                trackColor={{ false: 'rgba(255,255,255,0.14)', true: '#F97316' }}
                thumbColor="#fff"
              />
            </View>
            {pushNote ? (
              <View style={{ paddingHorizontal: 13, paddingBottom: 12 }}>
                <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: '#FF4438' }}>{pushNote}</Text>
              </View>
            ) : null}
          </Section>

          {/* Security lives on its own screen — ChangePassword.dc.html has a
              strength meter and rule list that will not fit in a settings row. */}
          <Section title="Security">
            <Row
              icon="lock"
              title="Change password"
              detail="Other devices are signed out"
              onPress={() => router.push('/profile/change-password')}
            />
          </Section>

          <Section title="Get help">
            <View style={{ padding: 13 }}>
              <AuthInput
                label="What do you need?"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                placeholder="Tell us what went wrong"
              />
              <Button label="Send message" onPress={submitMessage} busy={msgBusy} disabled={!message.trim()} />
              {msgNote ? <Note text={msgNote.text} tone={msgNote.tone} /> : null}
            </View>
          </Section>

          {!user ? (
            <View style={{ padding: 16 }}>
              <ErrorBlock label="Not signed in" message="Sign in to change your password or contact support." />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
