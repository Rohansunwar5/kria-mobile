// src/app/(onboarding)/auth.tsx — the canvas calls this OnboardingAuth:
// "Who's on the card?". It captures the three things the ID card needs before
// the account exists, then hands off to register.
import { useState } from 'react';
import { View, Text, Image, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { beginOnboardingHandoff } from '@/store/slices/authSlice';
import { setProfileFields, setSport } from '@/store/slices/onboardingSlice';
import { AuthInput } from '@/components/auth/AuthInput';
import { Btn, Chip, Hazard, IconBtn, Kick, Lbl } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { Icon, type IconName } from '@/components/icons';

// Only badminton and cricket run the full auction, live scoring and standings.
const SPORTS: { value: string; label: string; icon: IconName }[] = [
  { value: 'badminton', label: 'Badminton', icon: 'shuttlecock' },
  { value: 'cricket', label: 'Cricket', icon: 'stumps' },
];

export default function OnboardingAuth() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const onboarding = useAppSelector((s) => s.onboarding);
  // Register needs firstName/lastName separately, so collect them separately.
  // The store still holds one `fullName` — split it back on the way in.
  const [firstIn, ...restIn] = onboarding.fullName.trim().split(/\s+/);
  const [first, setFirst] = useState(firstIn || '');
  const [last, setLast] = useState(restIn.join(' '));
  const [chosenSport, setChosenSport] = useState(onboarding.sport || 'badminton');
  const [photo, setPhoto] = useState<string | null>(onboarding.photoUri);

  // No account exists yet, so the file stays local; profile/edit uploads it
  // once there is a player to attach it to.
  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a picture to your card.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  };

  const ready = !!first.trim() && !!last.trim();

  const submit = () => {
    dispatch(setProfileFields({ fullName: `${first.trim()} ${last.trim()}`, photoUri: photo }));
    dispatch(setSport(chosenSport));
    dispatch(beginOnboardingHandoff());
    router.push('/(auth)/register');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        {/* Deep-linked straight here, there is nothing to pop — fall back to login. */}
        <IconBtn
          icon="chevron-left"
          label="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
        />
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/login')} hitSlop={10}>
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.14 * 9, color: '#7d7d7d' }}>
            HAVE AN ACCOUNT? <Text style={{ color: '#F97316' }}>SIGN IN</Text>
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          <Ghost text="Name" size={200} style={{ right: -40, bottom: 0 }} />

          <View style={{ paddingTop: 8 }}>
            {/* Step counter moved off the header row — the sign-in escape hatch lives there now. */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Kick style={{ letterSpacing: 0.26 * 9 }}>Almost there</Kick>
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.16 * 9, color: '#7d7d7d' }}>STEP 4 OF 4</Text>
            </View>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 40, lineHeight: 35, color: '#fff', marginTop: 12 }}>
              Who&apos;s on{'\n'}the card?
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 24 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Add a photo" onPress={pickPhoto}>
              {photo ? (
                <Image source={{ uri: photo }} style={{ width: 76, height: 76, borderRadius: 5 }} />
              ) : (
                <View
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 5,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: 'rgba(255,255,255,0.22)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="camera" size={26} color="#7d7d7d" strokeWidth={1.9} />
                </View>
              )}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>Add a photo</Text>
              <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, lineHeight: 15, color: '#737373', marginTop: 5 }}>
                Optional now — you can add it later from your profile.
              </Text>
              <View style={{ alignSelf: 'flex-start', marginTop: 9 }}>
                <Chip label={photo ? 'Change' : 'Choose'} onPress={pickPhoto} />
              </View>
            </View>
          </View>

          <View style={{ height: 5, marginTop: 20, overflow: 'hidden' }}>
            <Hazard />
          </View>

          <View style={{ paddingTop: 18 }}>
            <AuthInput label="First name" placeholder="First name" value={first} onChangeText={setFirst} />
            <AuthInput label="Last name" placeholder="Last name" value={last} onChangeText={setLast} />

            <Lbl style={{ marginBottom: 6 }}>Your sport</Lbl>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {SPORTS.map((s) => (
                <Chip
                  key={s.value}
                  label={s.label}
                  selected={chosenSport === s.value}
                  onPress={() => setChosenSport(s.value)}
                  icon={<Icon name={s.icon} size={15} color={chosenSport === s.value ? '#0B0B0B' : '#bdbdbd'} strokeWidth={2} />}
                  style={{ flex: 1, justifyContent: 'center', paddingVertical: 13 }}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}>
              <View style={{ marginTop: 2 }}>
                <Icon name="info" size={13} color="#7d7d7d" strokeWidth={2} />
              </View>
              <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, lineHeight: 16, color: '#737373' }}>
                Only badminton and cricket run the full auction, live scoring and standings today. More are coming.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 }}>
        <Btn label="Create my account" arrow disabled={!ready} onPress={submit} />
      </View>
    </SafeAreaView>
  );
}
