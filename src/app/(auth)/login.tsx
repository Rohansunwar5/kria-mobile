import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginUser, requestLoginOtp, verifyLoginOtp, clearError } from '@/store/slices/authSlice';

type Mode = 'password' | 'otp';

export default function Login() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);

  const submitPassword = () => dispatch(loginUser({ data: { email, password } }));
  const requestOtp = async () => {
    const res = await dispatch(requestLoginOtp({ data: { email } }));
    if (requestLoginOtp.fulfilled.match(res)) setOtpRequested(true);
  };
  const submitOtp = () => dispatch(verifyLoginOtp({ data: { email, otp } }));

  const input = 'mb-3 rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-3 font-montserrat text-white';

  return (
    <View className="flex-1 justify-center bg-ink px-6">
      <Text className="mb-8 font-oswald text-4xl text-brand">Kria</Text>

      <TextInput
        className={input}
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={(t) => { setEmail(t); dispatch(clearError()); }}
      />

      {mode === 'password' && (
        <TextInput
          className={input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      )}

      {mode === 'otp' && otpRequested && (
        <TextInput
          className={input}
          placeholder="Enter OTP"
          placeholderTextColor="#888"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
        />
      )}

      {error ? <Text className="mb-3 font-montserrat text-red-400">{error}</Text> : null}

      <Pressable
        className="mt-2 items-center rounded-lg bg-brand py-3"
        disabled={isLoading}
        onPress={mode === 'password' ? submitPassword : otpRequested ? submitOtp : requestOtp}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-montserrat font-semibold text-white">
            {mode === 'password' ? 'Log in' : otpRequested ? 'Verify OTP' : 'Send OTP'}
          </Text>
        )}
      </Pressable>

      <Pressable
        className="mt-4 items-center"
        onPress={() => {
          setMode((m) => (m === 'password' ? 'otp' : 'password'));
          setOtpRequested(false);
          dispatch(clearError());
        }}
      >
        <Text className="font-montserrat text-brand">
          {mode === 'password' ? 'Log in with OTP instead' : 'Use password instead'}
        </Text>
      </Pressable>

      <View className="mt-6 flex-row justify-between">
        <Link href="/(auth)/forgot-password" className="font-montserrat text-[#aaa]">Forgot password?</Link>
        <Link href="/(auth)/register" className="font-montserrat text-[#aaa]">Create account</Link>
      </View>
    </View>
  );
}
