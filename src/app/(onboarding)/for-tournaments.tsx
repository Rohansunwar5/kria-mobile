import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font, radius } from '@/constants/theme';
import { useAppDispatch } from '@/store/hooks';
import { endOnboardingHandoff, logout, updateProfile } from '@/store/slices/authSlice';
import { deleteAccount } from '@/api/settings';
import { dobCheck, MIN_AGE } from '@/lib/authForms';
import { GUARDIAN_HINT, GUARDIAN_LABEL } from '@/lib/profileForm';
import { Toggle } from '@/components/ui/Toggle';
import { AuthScreen, Title } from '@/components/signin/AuthScreen';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';

const GENDERS = [{ key: 'male' as const, label: 'Male' }, { key: 'female' as const, label: 'Female' }];

export default function ForTournaments() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const dob = dobCheck(dd, mm, yyyy, new Date());
  const minor = dob.state === 'valid' && dob.age < 18;
  // The date of birth can't be skipped (LAUNCH-AUDIT H26, your call); gender stays optional.
  const ready = dob.state === 'valid' && (!minor || consent);
  const done = () => { dispatch(endOnboardingHandoff()); router.replace('/(tabs)/home'); };
  const save = async () => {
    if (inFlight.current || dob.state !== 'valid' || !ready) return;
    inFlight.current = true;
    setBusy(true);
    const res = await dispatch(updateProfile({ data: { dateOfBirth: dob.iso, ...(gender ? { gender } : {}), ...(minor ? { guardianConsent: true } : {}) } }));
    inFlight.current = false;
    if (!alive.current) return;
    if (updateProfile.fulfilled.match(res)) { done(); return; }
    setBusy(false);
    setError((res.payload as string) || 'Something went wrong');
  };

  // Under 13 can't finish signing up; their details shouldn't stay behind either.
  const removeAccount = () => Alert.alert('Delete this account?', 'Your name, email and phone are removed from Kria.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteAccount();
          await dispatch(logout());
        } catch (e) {
          if (alive.current) setError((e as Error).message);
        }
      },
    },
  ]);

  const box = (label: string, value: string, set: (t: string) => void, max: number, flex: number) => (
    <TextInput
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={colors.text4}
      selectionColor={colors.accent}
      keyboardType="number-pad"
      maxLength={max}
      value={value}
      onChangeText={(t) => { set(t.replace(/\D/g, '').slice(0, max)); setError(null); }}
      style={[s.box, { flex }, (dob.state === 'invalid' || dob.state === 'tooYoung') && s.boxErr]}
    />
  );

  return (
    <AuthScreen
      onBack={() => router.back()}
      label="Your profile · 2 of 2"
      footer={
        <View style={{ gap: 12 }}>
          {error ? <Text style={s.err}>{error}</Text> : null}
          <Button label="Save" busy={busy} disabled={!ready} onPress={save} />
          {dob.state === 'tooYoung' ? <Button label="Delete this account" variant="secondary" onPress={removeAccount} /> : null}
        </View>
      }
    >
      <Title sub="Kria is for players 13 and over. Organisers also run categories by age and gender, and these go on your entry automatically.">Ready for tournaments?</Title>
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Date of birth</Text>
        <View style={s.row}>
          {box('DD', dd, setDd, 2, 1)}
          {box('MM', mm, setMm, 2, 1)}
          {box('YYYY', yyyy, setYyyy, 4, 1.6)}
        </View>
        <Text style={[s.note, (dob.state === 'invalid' || dob.state === 'tooYoung') && { color: colors.error }]}>
          {dob.state === 'valid' ? `${dob.age} years old`
            : dob.state === 'invalid' ? "That date doesn't look right."
              : dob.state === 'tooYoung' ? `Kria is for players ${MIN_AGE} and over.`
                : 'Used for age-group categories like U-17.'}
        </Text>
        {minor ? <Toggle label={GUARDIAN_LABEL} hint={GUARDIAN_HINT} value={consent} onChange={setConsent} /> : null}
      </View>
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Gender</Text>
        <Segmented fill options={GENDERS} value={gender as 'male' | 'female'} onChange={setGender} />
        <Text style={s.note}>Optional. Shown to organisers only, to place you in the right category.</Text>
      </View>
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  row: { flexDirection: 'row', gap: 10 },
  box: { height: 54, borderRadius: radius.input, backgroundColor: colors.surface1, paddingHorizontal: 16, color: colors.text, fontFamily: font.regular, fontSize: 15 },
  boxErr: { borderWidth: 1.5, borderColor: colors.error },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  err: { fontFamily: font.regular, fontSize: 13, color: colors.error },
});
