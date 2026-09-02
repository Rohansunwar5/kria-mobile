import { useState } from 'react';
import { ScrollView, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AuthInput } from '@/components/auth/AuthInput';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { GenderSegment } from '@/components/profile/GenderSegment';
import { DobField } from '@/components/profile/DobField';
import { Btn, Chip, Hazard, Lbl, ScreenHeader } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { Icon, type IconName } from '@/components/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile } from '@/store/slices/authSlice';

// Only badminton and cricket are feature-complete, so this is a two-chip
// picker rather than the old free-text sport field.
const SPORTS: { value: string; label: string; icon: IconName }[] = [
  { value: 'badminton', label: 'Badminton', icon: 'shuttlecock' },
  { value: 'cricket', label: 'Cricket', icon: 'ball' },
];

function SectionTitle({ title, required }: { title: string; required?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 }}>
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, color: '#fff' }}>{title}</Text>
      <View style={{ flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.12)' }} />
      {required ? (
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.12 * 8, color: '#FA4C93' }}>REQUIRED</Text>
      ) : null}
    </View>
  );
}

export default function EditProfile() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isLoading, error } = useAppSelector((s) => s.auth);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    sport: user?.sport || '',
    location: user?.location || '',
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const complete = !!(form.firstName && form.lastName && form.phone && form.gender && form.dateOfBirth && form.location);

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      setFormError('First name, last name and phone are required.');
      return;
    }
    setFormError('');
    // Required fields always sent; optional fields omitted when blank so the
    // server's isISO8601()/optional() validators don't 400 on empty strings.
    const data: Record<string, string> = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
    };
    (['gender', 'dateOfBirth', 'sport', 'location'] as const).forEach((k) => {
      const val = form[k]?.trim();
      if (val) data[k] = val;
    });
    const result = await dispatch(updateProfile({ data }));
    if (updateProfile.fulfilled.match(result)) router.back();
  };

  return (
    <Screen>
      <ScreenHeader
        title="Edit profile"
        onBack={() => router.back()}
        right={<Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.12 * 9, color: '#7d7d7d' }}>PATCH</Text>}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <Ghost text="You" size={150} style={{ right: -32, bottom: 40 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 16 }}>
            <AvatarPicker name={`${form.firstName} ${form.lastName}`} imageUrl={user?.profileImage} size={72} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>Player photo</Text>
              <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, lineHeight: 15, color: '#737373', marginTop: 5 }}>
                Shown on your ID card and every roster you appear in.
              </Text>
            </View>
          </View>

          <View style={{ height: 5, marginTop: 16, overflow: 'hidden' }}>
            <Hazard />
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 15 }}>
            <SectionTitle title="Identity" required />

            <View style={{ flexDirection: 'row', gap: 9 }}>
              <View style={{ flex: 1 }}>
                <AuthInput label="First name" value={form.firstName} onChangeText={set('firstName')} />
              </View>
              <View style={{ flex: 1 }}>
                <AuthInput label="Last name" value={form.lastName} onChangeText={set('lastName')} />
              </View>
            </View>

            <AuthInput label="Phone" icon="phone" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} />
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
            <SectionTitle title="Playing details" />

            <Lbl style={{ marginBottom: 6 }}>Gender</Lbl>
            <View style={{ marginBottom: 14 }}>
              <GenderSegment value={form.gender} onChange={set('gender')} />
            </View>

            <View style={{ flexDirection: 'row', gap: 9 }}>
              <View style={{ flex: 1 }}>
                <Lbl style={{ marginBottom: 6 }}>Date of birth</Lbl>
                <DobField value={form.dateOfBirth} onChange={set('dateOfBirth')} />
              </View>
              <View style={{ flex: 1 }}>
                <AuthInput label="City" placeholder="Bangalore" value={form.location} onChangeText={set('location')} />
              </View>
            </View>

            <Lbl style={{ marginTop: 8, marginBottom: 6 }}>Sport</Lbl>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {SPORTS.map((s) => (
                <Chip
                  key={s.value}
                  label={s.label}
                  selected={form.sport === s.value}
                  onPress={() => set('sport')(form.sport === s.value ? '' : s.value)}
                  icon={<Icon name={s.icon} size={15} color={form.sport === s.value ? '#0B0B0B' : '#bdbdbd'} strokeWidth={2} />}
                  style={{ flex: 1, justifyContent: 'center', paddingVertical: 13 }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.12)', backgroundColor: '#101010', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
        {formError || error ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="alert" size={13} color="#FF4438" strokeWidth={2.6} />
            <Text style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#FF4438' }}>
              {formError || error}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name={complete ? 'check' : 'info'} size={13} color={complete ? '#16C46A' : '#7d7d7d'} strokeWidth={2.6} />
            <Text style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, color: complete ? '#16C46A' : '#7d7d7d' }}>
              {complete ? 'PROFILE COMPLETE — ID CARD ISSUED' : 'FILL EVERY FIELD TO COMPLETE YOUR ID CARD'}
            </Text>
          </View>
        )}
        <Btn label="Save changes" busy={isLoading} onPress={save} />
      </View>
    </Screen>
  );
}
