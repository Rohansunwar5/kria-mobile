import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setPassword, clearError } from '@/store/slices/authSlice';

export default function SetPassword() {
  const dispatch = useAppDispatch();
  const { isLoading, error, registrationEmail } = useAppSelector((s) => s.auth);
  const [password, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');

  const submit = () => {
    if (password !== confirm) { setLocalError('Passwords do not match'); return; }
    setLocalError('');
    dispatch(setPassword({ data: { email: registrationEmail as string, password } }));
  };

  const input = 'mb-3 rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-3 font-montserrat text-white';

  return (
    <View className="flex-1 justify-center bg-ink px-6">
      <Text className="mb-8 font-oswald text-3xl text-brand">Set password</Text>
      <TextInput className={input} placeholder="Password" placeholderTextColor="#888" secureTextEntry value={password} onChangeText={(t) => { setPwd(t); dispatch(clearError()); }} />
      <TextInput className={input} placeholder="Confirm password" placeholderTextColor="#888" secureTextEntry value={confirm} onChangeText={setConfirm} />
      {(localError || error) ? <Text className="mb-3 font-montserrat text-red-400">{localError || error}</Text> : null}
      <Pressable className="mt-2 items-center rounded-lg bg-brand py-3" disabled={isLoading} onPress={submit}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text className="font-montserrat font-semibold text-white">Finish</Text>}
      </Pressable>
    </View>
  );
}
