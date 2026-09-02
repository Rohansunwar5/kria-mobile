import { useEffect, useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { registerUser, clearError } from '@/store/slices/authSlice';
import { AuthInput } from '@/components/auth/AuthInput';
import { Btn, Hazard, IconBtn } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { Icon } from '@/components/icons';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error, registrationStep } = useAppSelector((s) => s.auth);
  // Onboarding captures the name on its own screen; arriving straight from
  // login it is blank, so the field is always shown rather than branched.
  const onboardingName = useAppSelector((s) => s.onboarding.fullName);
  const [fullName, setFullName] = useState(onboardingName || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (registrationStep === 2) router.replace('/(auth)/verify-otp');
  }, [registrationStep, router]);

  const [firstName, ...restName] = fullName.trim().split(/\s+/);
  const lastName = restName.join(' ');
  const emailOk = EMAIL.test(email);
  const ready = !!firstName && !!lastName && emailOk && phone.replace(/\D/g, '').length >= 10 && agreed;

  const submit = () =>
    dispatch(registerUser({ data: { firstName, lastName, email, phone: phone.replace(/\s/g, '') } }));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <IconBtn icon="chevron-left" label="Go back" onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/login')} hitSlop={10}>
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.14 * 9, color: '#7d7d7d' }}>
            HAVE AN ACCOUNT? <Text style={{ color: '#F97316' }}>SIGN IN</Text>
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Ghost text="Join" size={210} style={{ right: -42, bottom: 130 }} />

          <View style={{ height: 5, width: 56, marginBottom: 16, overflow: 'hidden' }}>
            <Hazard />
          </View>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 42, lineHeight: 37, color: '#fff' }}>
            Create your{'\n'}account
          </Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: '#d4d4d4', marginTop: 12, maxWidth: 300 }}>
            We send a 6-digit code to verify it. No password yet — you set that next.
          </Text>

          <View style={{ paddingTop: 26 }}>
            <AuthInput label="Full name" icon="person" placeholder="Your name" value={fullName} onChangeText={setFullName} />

            <AuthInput
              label="Email"
              icon="mail"
              placeholder="you@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => { setEmail(t); dispatch(clearError()); }}
              right={emailOk ? <Icon name="check" size={16} color="#16C46A" strokeWidth={2.8} /> : undefined}
            />
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, color: '#7d7d7d', marginTop: -10, marginBottom: 14 }}>
              THIS IS WHERE RECEIPTS AND MATCH ALERTS GO
            </Text>

            <AuthInput
              label="Phone"
              placeholder="98450 12345"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              icon="phone"
            />

            {/* Consent, not a pre-ticked trap. */}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel="Agree to the terms and privacy policy"
              onPress={() => setAgreed((a) => !a)}
              hitSlop={8}
              style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start', minHeight: 44 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 3,
                  marginTop: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: agreed ? '#F97316' : 'transparent',
                  ...(agreed ? null : { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)' }),
                }}
              >
                {agreed ? <Icon name="check" size={13} color="#0B0B0B" strokeWidth={3.4} /> : null}
              </View>
              <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, lineHeight: 16, color: '#737373' }}>
                I agree to the <Text style={{ color: '#F97316' }}>terms</Text> and{' '}
                <Text style={{ color: '#F97316' }}>privacy policy</Text>. Organizers of tournaments you enter can see your
                name, city and record.
              </Text>
            </Pressable>

            {error ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Icon name="alert" size={13} color="#FF4438" strokeWidth={2.4} />
                <Text style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#FF4438' }}>
                  {error}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 }}>
        <Btn label="Send me a code" arrow busy={isLoading} disabled={!ready} onPress={submit} />
      </View>
    </SafeAreaView>
  );
}
