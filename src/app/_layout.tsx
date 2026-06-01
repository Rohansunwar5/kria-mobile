import '../global.css';
import { useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { useFonts, Oswald_500Medium } from '@expo-google-fonts/oswald';
import { Montserrat_400Regular } from '@expo-google-fonts/montserrat';
import { store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { bootstrapAuth, logout } from '@/store/slices/authSlice';
import { setUnauthorizedHandler } from '@/api/axios';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

setUnauthorizedHandler(() => {
  store.dispatch(logout());
});

const PUBLIC_ROOTS = ['(auth)', 'auction', 'bracket', 'live'];

function AuthGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const { bootstrapped, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  const ready = fontsLoaded && bootstrapped;

  useEffect(() => {
    if (!ready) return;
    const root = String(segments[0]);
    const isPublic = root !== 'undefined' && PUBLIC_ROOTS.includes(root);
    if (user) {
      if (root === 'undefined' || root === '(auth)') router.replace('/(tabs)/home');
    } else if (!isPublic) {
      router.replace('/(auth)/login');
    }
  }, [ready, user, segments, router]);

  const onLayout = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }} onLayout={onLayout}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tournament/[id]" />
        <Stack.Screen name="profile" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Oswald_500Medium, Montserrat_400Regular });
  return (
    <Provider store={store}>
      <AuthGate fontsLoaded={fontsLoaded} />
    </Provider>
  );
}
