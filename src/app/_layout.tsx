import '../global.css';
import { useEffect, useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { isRunningInExpoGo } from 'expo';
import { Provider } from 'react-redux';
import { useFonts } from 'expo-font';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';
import { store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { bootstrapAuth, logout } from '@/store/slices/authSlice';
import { setUnauthorizedHandler } from '@/api/axios';
import { colors } from '@/constants/theme';
import { routeFor } from '@/lib/authRoute';
import { LaunchAnimation } from '@/components/LaunchAnimation';

SplashScreen.preventAutoHideAsync();
// No native fade: the overlay underneath is the same #0B0B0D, and a fade would veil
// the sprint's first frames. `fade` is read on iOS only; Android always fades, over
// `duration` (400ms by default). Expo Go ignores both and warns, so skip it there.
if (!isRunningInExpoGo()) SplashScreen.setOptions({ fade: false, duration: 0 });

setUnauthorizedHandler(() => {
  store.dispatch(logout());
});

const PUBLIC_ROOTS = ['(auth)', 'auction', 'bracket', 'live'];

function AuthGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const { bootstrapped, user } = useAppSelector((s) => s.auth);
  const pendingOnboarding = useAppSelector((s) => s.auth.pendingOnboarding);
  const [introDone, setIntroDone] = useState(false);
  const endIntro = useCallback(() => setIntroDone(true), []);

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  const ready = fontsLoaded && bootstrapped;

  const target = ready ? routeFor({ signedIn: !!user, pendingOnboarding, root: String(segments[0]), publicRoots: PUBLIC_ROOTS }) : null;
  useEffect(() => {
    if (target) router.replace(target);
  }, [target, segments, router]); // segments: re-check after every navigation
  // The first route is chosen once the gate has nothing left to replace.
  const routed = ready && !target;

  // The native splash and the launch overlay are both #0B0B0D: the splash holds
  // until fonts load, then hides once the overlay is laid out over the app.
  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={() => SplashScreen.hideAsync()}>
      {ready ? <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tournament/[id]" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="auction/[tournamentId]/[categoryId]" />
        <Stack.Screen name="live/index" />
        <Stack.Screen name="live/[matchId]" />
        <Stack.Screen name="quick/new" />
        <Stack.Screen name="quick/join" />
        <Stack.Screen name="quick/[id]" />
        <Stack.Screen name="knockout/[id]" />
        <Stack.Screen name="knockout/awards/[id]" />
        <Stack.Screen name="category/[categoryId]" />
        <Stack.Screen name="cricket/leaderboard/[categoryId]" />
        <Stack.Screen name="player/[playerId]" />
        <Stack.Screen name="matches/[playerId]" />
        <Stack.Screen name="tournament/[id]/announcements" />
        <Stack.Screen name="tournament/[id]/teams" />
        <Stack.Screen name="tournament/[id]/matches" />
        <Stack.Screen name="tournament/[id]/tie/[tieId]" />
      </Stack> : null}
      {!introDone ? <LaunchAnimation ready={routed} onDone={endIntro} /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // DESIGN.md §4.2. Names match `font` in constants/theme.ts.
    JetBrainsMono_600SemiBold,
    'Archivo-400': require('../../assets/fonts/Archivo-400.ttf'),
    'Archivo-500': require('../../assets/fonts/Archivo-500.ttf'),
    'Archivo-600': require('../../assets/fonts/Archivo-600.ttf'),
    'Archivo-700': require('../../assets/fonts/Archivo-700.ttf'),
    'ArchivoXC-800': require('../../assets/fonts/ArchivoExtraCondensed-800.ttf'),
  });
  return (
    <Provider store={store}>
      <AuthGate fontsLoaded={fontsLoaded} />
    </Provider>
  );
}
