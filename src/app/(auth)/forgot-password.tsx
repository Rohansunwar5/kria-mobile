import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import API from '@/api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await API.post('/player/auth/forgot-password', { email });
      setSent(true);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const input = 'mb-3 rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-3 font-montserrat text-white';

  return (
    <View className="flex-1 justify-center bg-ink px-6">
      <Text className="mb-8 font-oswald text-3xl text-brand">Reset password</Text>
      {sent ? (
        <Text className="font-montserrat text-white">If an account exists for {email}, a reset link has been sent.</Text>
      ) : (
        <>
          <TextInput className={input} placeholder="Email" placeholderTextColor="#888" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          {error ? <Text className="mb-3 font-montserrat text-red-400">{error}</Text> : null}
          <Pressable className="mt-2 items-center rounded-lg bg-brand py-3" disabled={loading} onPress={submit}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-montserrat font-semibold text-white">Send reset link</Text>}
          </Pressable>
        </>
      )}
      <Link href="/(auth)/login" className="mt-6 text-center font-montserrat text-[#aaa]">Back to login</Link>
    </View>
  );
}
