import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { goBack } from '@/lib/nav';
import { colors, font, radius, space } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Arc } from '@/components/ui/Arc';
import { FooterBar, TopBar } from '@/components/ui/Bars';
import { Icon, sportIcon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { usePhotoUpload } from '@/components/profile/usePhotoUpload';
import { DobField } from '@/components/profile/DobField';
import { EVENT_SPORTS } from '@/lib/eventsList';
import { sportName } from '@/lib/homeView';
import { profileUpdate, readinessLine, type ProfileFormValues } from '@/lib/profileForm';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile } from '@/store/slices/authSlice';

function Field({ label, value, onChangeText, keyboardType }: { label: string; value: string; onChangeText: (t: string) => void; keyboardType?: 'phone-pad' }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={s.group}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholderTextColor={colors.text4}
        style={[s.field, focus && { borderColor: colors.accent }]}
      />
    </View>
  );
}

const initials = (a: string, b: string) => `${a[0] ?? ''}${b[0] ?? ''}`.toUpperCase();

export default function EditProfile() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((st) => st.auth.user);
  const error = useAppSelector((st) => st.auth.error);
  const photo = usePhotoUpload();
  const before = useRef({ sport: user?.sport, location: user?.location });
  const [form, setForm] = useState<ProfileFormValues>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    // Stored as an ISO instant; the picker works in the YYYY-MM-DD day.
    dateOfBirth: user?.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
    location: user?.location || '',
    sport: user?.sport || '',
  });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const set = (k: keyof ProfileFormValues) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (inFlight.current) return;
    const r = profileUpdate(form, before.current);
    if (!r.ok) { setFormError(r.error); return; }
    setFormError('');
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await dispatch(updateProfile({ data: r.data }));
      if (alive.current && updateProfile.fulfilled.match(result)) goBack(router, '/(tabs)/profile');
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const message = formError || error;
  return (
    <SafeAreaView style={s.screen}>
      <TopBar title="Edit profile" onBack={() => goBack(router, '/(tabs)/profile')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <View style={s.photoRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" disabled={photo.busy} onPress={photo.pick} style={s.photo}>
              {user?.profileImage ? <Image source={{ uri: user.profileImage }} style={[StyleSheet.absoluteFill, { borderRadius: 40 }]} /> : <Text style={s.photoIni}>{initials(form.firstName, form.lastName)}</Text>}
              <View style={s.badge}>{photo.busy ? <Arc size={16} color={colors.bg} track={colors.onAccentTrack} /> : <Icon name="photo_camera" size={16} color={colors.bg} />}</View>
            </Pressable>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.photoTitle}>Profile photo</Text>
              <Text style={s.hint2}>Optional. Organisers and teammates see it.</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="First name" value={form.firstName} onChangeText={set('firstName')} /></View>
            <View style={{ flex: 1 }}><Field label="Last name" value={form.lastName} onChangeText={set('lastName')} /></View>
          </View>
          <Field label="Phone" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} />

          <View style={s.group}>
            <Text style={s.label}>Email</Text>
            <View style={s.readonly}>
              <Text style={s.readonlyText} numberOfLines={1}>{user?.email ?? ''}</Text>
              <Icon name="lock" size={18} color={colors.text4} />
            </View>
            <Text style={s.hint}>You sign in with this. Only you see it.</Text>
          </View>

          <View style={s.group}>
            <Text style={s.label}>Gender</Text>
            <Segmented fill options={[{ key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }]} value={form.gender as 'male' | 'female'} onChange={set('gender')} />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[s.group, { flex: 1 }]}>
              <Text style={s.label}>Date of birth</Text>
              <DobField value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </View>
            <View style={{ flex: 1 }}><Field label="City" value={form.location} onChangeText={set('location')} /></View>
          </View>

          <View style={s.group}>
            <Text style={s.label}>Main sport</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {EVENT_SPORTS.map((sp) => {
                const on = form.sport === sp;
                return (
                  <Pressable key={sp} accessibilityRole="button" accessibilityLabel={sportName(sp)} accessibilityState={{ selected: on }} onPress={() => set('sport')(on ? '' : sp)} style={[s.chip, { backgroundColor: on ? colors.text : colors.surface1 }]}>
                    <Icon name={sportIcon(sp)} size={18} color={on ? colors.bg : colors.text2} />
                    <Text style={[s.chipText, { color: on ? colors.bg : colors.text2 }]}>{sportName(sp)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={s.hint}>Events and Home open on this sport.</Text>
          </View>
        </ScrollView>
        <FooterBar>
          <View style={{ flex: 1, gap: 10 }}>
            <View style={s.info}>
              <Icon name={message ? 'error' : 'info'} size={16} color={message ? colors.error : colors.text3} />
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, color: message ? colors.error : colors.text3 }}>{message || readinessLine(form)}</Text>
            </View>
            <Button label="Save" busyLabel="Saving" busy={busy} onPress={save} />
          </View>
        </FooterBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: space.gutter, paddingTop: 8, paddingBottom: 24, gap: 18 },
  group: { gap: 8 },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  field: { height: 52, paddingHorizontal: 16, borderRadius: radius.input, backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.surface3, color: colors.text, fontFamily: font.regular, fontSize: 15 },
  readonly: { height: 52, paddingHorizontal: 16, borderRadius: radius.input, borderWidth: 1, borderColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 10 },
  readonlyText: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.text3 },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.text4 },
  hint2: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.text3 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photo: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  photoIni: { fontFamily: font.bold, fontSize: 24, color: colors.text },
  photoTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  badge: { position: 'absolute', right: -2, bottom: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.text, borderWidth: 3, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
  chipText: { fontFamily: font.semibold, fontSize: 13 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
