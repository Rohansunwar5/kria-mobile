// src/app/(onboarding)/profile.tsx
import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setProfileFields } from '@/store/slices/onboardingSlice';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { GenderSegment } from '@/components/profile/GenderSegment';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { StepDots } from '@/components/onboarding/StepDots';

export default function Profile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { fullName, age, gender, photoUri } = useAppSelector((s) => s.onboarding);
  const [name, setName] = useState(fullName);
  const [ageText, setAgeText] = useState(age ? String(age) : '');
  const [genderVal, setGenderVal] = useState(gender || '');

  const ageNum = parseInt(ageText, 10);
  const valid = name.trim().length > 0 && ageNum >= 5 && ageNum <= 99;

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;
    dispatch(setProfileFields({ photoUri: result.assets[0].uri }));
  };

  const onContinue = () => {
    dispatch(setProfileFields({ fullName: name.trim(), age: ageNum, gender: genderVal || null }));
    router.push('/(onboarding)/level');
  };

  const input = 'mb-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-montserrat text-white';

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="py-4">
        <StepDots total={5} current={1} />
      </View>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <Text className="mb-6 font-oswald text-4xl uppercase text-white">Tell us about yourself</Text>

        <Pressable onPress={pickPhoto} className="mb-6 self-center">
          <View className="h-28 w-28 items-center justify-center rounded-full border-2 border-brand bg-black">
            {photoUri ? (
              <Image source={{ uri: photoUri }} className="h-full w-full rounded-full" />
            ) : (
              <InitialsAvatar name={name} size={104} />
            )}
            <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
              <Text className="text-2xl">📷</Text>
            </View>
          </View>
        </Pressable>

        <TextInput className={input} placeholder="Full name" placeholderTextColor="#888" value={name} onChangeText={setName} />
        <TextInput className={input} placeholder="Age" placeholderTextColor="#888" keyboardType="number-pad" value={ageText} onChangeText={setAgeText} />
        <Text className="mb-2 mt-2 font-montserrat text-sm text-gray-400">Gender</Text>
        <GenderSegment value={genderVal} onChange={setGenderVal} />
      </ScrollView>
      <View className="py-4">
        <OnboardingButton label="Continue" disabled={!valid} onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}
