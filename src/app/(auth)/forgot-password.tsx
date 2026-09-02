import { useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthInput } from '@/components/auth/AuthInput';
import { Btn, Hairlines, IconBtn, Lbl } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { Icon } from '@/components/icons';
import { requestPasswordReset } from '@/api/auth';

// Not drawn on the canvas on purpose: this is Login with only the email field.
export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <LinearGradient
        colors={['rgba(249,115,22,0.16)', 'rgba(11,11,11,0)']}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.25, y: 0.55 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Hairlines />
      <Ghost text="K" size={270} style={{ left: -44, top: 150 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <IconBtn icon="chevron-left" label="Go back" onPress={() => router.back()} />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 24, color: '#fff' }}>Kria</Text>
        <Lbl style={{ color: '#F97316', letterSpacing: 0.3 * 9, marginTop: 4 }}>Player</Lbl>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 44, lineHeight: 38, color: '#fff' }}>
            Reset your{'\n'}password.
          </Text>

          {sent ? (
            <View style={{ marginTop: 24, backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, padding: 13 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                <Icon name="check" size={14} color="#16C46A" strokeWidth={2.8} />
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.16 * 9, textTransform: 'uppercase', color: '#16C46A' }}>
                  Check your inbox
                </Text>
              </View>
              <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18, color: '#d4d4d4' }}>
                If an account exists for{' '}
                <Text style={{ fontFamily: 'SpaceMono_400Regular', color: '#fff' }}>{email}</Text>, reset instructions are on
                their way. Check spam if nothing lands in a minute.
              </Text>
            </View>
          ) : (
            <View style={{ paddingTop: 26 }}>
              <AuthInput
                label="Email"
                icon="mail"
                placeholder="you@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
              />
              {error ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="alert" size={13} color="#FF4438" strokeWidth={2.4} />
                  <Text style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#FF4438' }}>
                    {error}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 }}>
        {sent ? (
          <Btn label="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
        ) : (
          <Btn label="Send reset link" arrow busy={loading} disabled={!email} onPress={submit} style={{ marginBottom: 16 }} />
        )}
        {!sent ? (
          <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/login')} hitSlop={10} style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.12 * 9, color: '#7d7d7d' }}>
              BACK TO <Text style={{ color: '#F97316' }}>SIGN IN</Text>
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
