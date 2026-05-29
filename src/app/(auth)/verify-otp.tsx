import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { verifyOtp, clearError } from '@/store/slices/authSlice';

export default function VerifyOtp() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error, registrationStep, registrationEmail } = useAppSelector((s) => s.auth);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (registrationStep === 3) router.replace('/(auth)/set-password');
  }, [registrationStep, router]);

  const input = 'mb-3 rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-3 font-montserrat text-white';

  return (
    <View className="flex-1 justify-center bg-ink px-6">
      <Text className="mb-2 font-oswald text-3xl text-brand">Verify email</Text>
      <Text className="mb-6 font-montserrat text-[#aaa]">Code sent to {registrationEmail}</Text>
      <TextInput className={input} placeholder="Enter OTP" placeholderTextColor="#888" keyboardType="number-pad" value={otp} onChangeText={(t) => { setOtp(t); dispatch(clearError()); }} />
      {error ? <Text className="mb-3 font-montserrat text-red-400">{error}</Text> : null}
      <Pressable className="mt-2 items-center rounded-lg bg-brand py-3" disabled={isLoading} onPress={() => dispatch(verifyOtp({ data: { email: registrationEmail as string, otp } }))}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text className="font-montserrat font-semibold text-white">Verify</Text>}
      </Pressable>
    </View>
  );
}
