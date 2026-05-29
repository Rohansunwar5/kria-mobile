import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { registerUser, clearError } from '@/store/slices/authSlice';

export default function Register() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error, registrationStep } = useAppSelector((s) => s.auth);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (registrationStep === 2) router.replace('/(auth)/verify-otp');
  }, [registrationStep, router]);

  const input = 'mb-3 rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-3 font-montserrat text-white';

  return (
    <View className="flex-1 justify-center bg-ink px-6">
      <Text className="mb-8 font-oswald text-3xl text-brand">Create account</Text>
      <TextInput className={input} placeholder="First name" placeholderTextColor="#888" value={firstName} onChangeText={setFirstName} />
      <TextInput className={input} placeholder="Last name" placeholderTextColor="#888" value={lastName} onChangeText={setLastName} />
      <TextInput className={input} placeholder="Email" placeholderTextColor="#888" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={(t) => { setEmail(t); dispatch(clearError()); }} />
      <TextInput className={input} placeholder="Phone number" placeholderTextColor="#888" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      {error ? <Text className="mb-3 font-montserrat text-red-400">{error}</Text> : null}
      <Pressable className="mt-2 items-center rounded-lg bg-brand py-3" disabled={isLoading} onPress={() => dispatch(registerUser({ data: { firstName, lastName, email, phone } }))}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text className="font-montserrat font-semibold text-white">Continue</Text>}
      </Pressable>
      <Link href="/(auth)/login" className="mt-6 text-center font-montserrat text-[#aaa]">Already have an account? Log in</Link>
    </View>
  );
}
