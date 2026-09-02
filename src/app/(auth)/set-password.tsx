import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setPassword, clearError } from '@/store/slices/authSlice';
import { AuthInput } from '@/components/auth/AuthInput';
import { PasswordRuleList, PasswordStrength, passwordRules } from '@/components/auth/PasswordRules';
import { Btn, ScreenHeader } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { Icon } from '@/components/icons';

// Not drawn on the canvas on purpose: this is ChangePassword minus the
// current-password field.
export default function SetPassword() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error, registrationEmail } = useAppSelector((s) => s.auth);
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');

  const rulesOk = passwordRules(pwd).every((r) => r.met);
  const mismatch = confirm.length > 0 && confirm !== pwd;
  const ready = rulesOk && !!confirm && !mismatch;

  const submit = () => dispatch(setPassword({ data: { email: registrationEmail as string, password: pwd } }));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <ScreenHeader title="Set a password" onBack={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <Ghost text="Key" size={170} style={{ left: -20, bottom: 40 }} />

          <View style={{ paddingTop: 20 }}>
            <View style={{ width: 52, height: 52, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="lock" size={24} color="#F97316" strokeWidth={2} />
            </View>
            <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: '#d4d4d4', marginTop: 13, maxWidth: 300 }}>
              Your email is verified. Pick a password and you are in — this is the last step.
            </Text>
          </View>

          <View style={{ paddingTop: 20 }}>
            <AuthInput
              label="Password"
              icon="lock"
              secureToggle
              autoCapitalize="none"
              value={pwd}
              onChangeText={(t) => { setPwd(t); dispatch(clearError()); }}
            />
            <PasswordStrength password={pwd} />
            <PasswordRuleList password={pwd} />

            <View style={{ marginTop: 16 }}>
              <AuthInput
                label="Confirm password"
                icon="lock"
                secureToggle
                autoCapitalize="none"
                value={confirm}
                onChangeText={setConfirm}
                error={mismatch ? 'Passwords do not match' : undefined}
              />
            </View>

            {error ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="alert" size={13} color="#FF4438" strokeWidth={2.4} />
                <Text style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#FF4438' }}>
                  {error}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.12)', backgroundColor: '#101010', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
        <Btn label="Finish" busy={isLoading} disabled={!ready} onPress={submit} />
      </View>
    </SafeAreaView>
  );
}
