import { useState } from 'react';
import { ScrollView, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { GenderSegment } from '@/components/profile/GenderSegment';
import { DobField } from '@/components/profile/DobField';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile } from '@/store/slices/authSlice';

const input = 'rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-montserrat text-white';

export default function EditProfile() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isLoading, error } = useAppSelector((s) => s.auth);

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

  const save = async () => {
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
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <TextInput className={input} placeholder="First Name" placeholderTextColor="#666" value={form.firstName} onChangeText={set('firstName')} />
        <TextInput className={input} placeholder="Last Name" placeholderTextColor="#666" value={form.lastName} onChangeText={set('lastName')} />
        <TextInput className={input} placeholder="Phone" placeholderTextColor="#666" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} />
        <GenderSegment value={form.gender} onChange={set('gender')} />
        <DobField value={form.dateOfBirth} onChange={set('dateOfBirth')} />
        <TextInput className={input} placeholder="Sport (e.g. Badminton)" placeholderTextColor="#666" value={form.sport} onChangeText={set('sport')} />
        <TextInput className={input} placeholder="Location (e.g. Bangalore)" placeholderTextColor="#666" value={form.location} onChangeText={set('location')} />

        {!!error && <Text className="text-center font-montserrat text-sm text-red-400">{error}</Text>}

        <Pressable onPress={save} disabled={isLoading} className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 active:opacity-80">
          {isLoading && <ActivityIndicator color="#fff" />}
          <Text className="font-montserrat font-semibold text-white">Save</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
