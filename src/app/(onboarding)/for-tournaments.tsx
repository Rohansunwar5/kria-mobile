import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font, radius } from '@/constants/theme';
import { useAppDispatch } from '@/store/hooks';
import { endOnboardingHandoff, updateProfile } from '@/store/slices/authSlice';
import { dobCheck } from '@/lib/authForms';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const dob = dobCheck(dd, mm, yyyy, new Date());
  const done = () => { dispatch(endOnboardingHandoff()); router.replace('/(tabs)/home'); };
  const save = async () => {
    if (inFlight.current || dob.state !== 'valid' || !gender) return;
    inFlight.current = true;
    setBusy(true);
    const res = await dispatch(updateProfile({ data: { dateOfBirth: dob.iso, gender } }));
    inFlight.current = false;
    if (!alive.current) return;
    if (updateProfile.fulfilled.match(res)) { done(); return; }
    setBusy(false);
    setError((res.payload as string) || 'Something went wrong');
  };

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
      style={[s.box, { flex }, dob.state === 'invalid' && s.boxErr]}
    />
  );

  return (
    <AuthScreen
      onBack={() => router.back()}
      label="Your profile · 2 of 2"
      right={<Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={done} hitSlop={8}><Text style={s.skip}>Skip</Text></Pressable>}
      footer={
        <View style={{ gap: 12 }}>
          {error ? <Text style={s.err}>{error}</Text> : null}
          <Button label="Save" busy={busy} disabled={dob.state !== 'valid' || !gender} onPress={save} />
          <Text style={s.note}>Skip for now, and you'll be asked again when you enter a tournament.</Text>
        </View>
      }
    >
      <Title sub="Organisers run categories by age and gender. These go on your entry automatically, so you never retype them.">Ready for tournaments?</Title>
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Date of birth</Text>
        <View style={s.row}>
          {box('DD', dd, setDd, 2, 1)}
          {box('MM', mm, setMm, 2, 1)}
          {box('YYYY', yyyy, setYyyy, 4, 1.6)}
        </View>
        <Text style={[s.note, dob.state === 'invalid' && { color: colors.error }]}>
          {dob.state === 'valid' ? `${dob.age} years old` : dob.state === 'invalid' ? "That date doesn't look right." : 'Used for age-group categories like U-17.'}
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Gender</Text>
        <Segmented fill options={GENDERS} value={gender as 'male' | 'female'} onChange={setGender} />
        <Text style={s.note}>Shown to organisers only, to place you in the right category.</Text>
      </View>
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  skip: { fontFamily: font.semibold, fontSize: 14, color: colors.text2, paddingRight: 12 },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  row: { flexDirection: 'row', gap: 10 },
  box: { height: 54, borderRadius: radius.input, backgroundColor: colors.surface1, paddingHorizontal: 16, color: colors.text, fontFamily: font.regular, fontSize: 15 },
  boxErr: { borderWidth: 1.5, borderColor: colors.error },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  err: { fontFamily: font.regular, fontSize: 13, color: colors.error },
});
