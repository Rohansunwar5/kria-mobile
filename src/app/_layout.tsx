import '../global.css';
import { useEffect, useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { useFonts, Oswald_500Medium } from '@expo-google-fonts/oswald';
import { Montserrat_400Regular } from '@expo-google-fonts/montserrat';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { bootstrapAuth, logout } from '@/store/slices/authSlice';
import { setUnauthorizedHandler } from '@/api/axios';
import { colors } from '@/lib/theme';
import { getOnboardingComplete } from '@/lib/onboardingStorage';
import { BrandIntro } from '@/components/BrandIntro';

SplashScreen.preventAutoHideAsync();

setUnauthorizedHandler(() => {
  store.dispatch(logout());
});

const PUBLIC_ROOTS = ['(auth)', '(onboarding)', 'auction', 'bracket', 'live'];

function AuthGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const { bootstrapped, user } = useAppSelector((s) => s.auth);
  const pendingOnboarding = useAppSelector((s) => s.auth.pendingOnboarding);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    getOnboardingComplete().then(setOnboardingDone);
  }, []);

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  const ready = fontsLoaded && bootstrapped && onboardingDone !== null;

  useEffect(() => {
    if (!ready) return;
    const root = String(segments[0]);
    const isPublic = root !== 'undefined' && PUBLIC_ROOTS.includes(root);

    if (user) {
      if (pendingOnboarding) {
        // Just signed up via onboarding: move from (auth) into the creating screen,
        // and stay within (onboarding) until creating/welcome-done clear the flag.
        if (root === '(onboarding)') return;
        router.replace('/(onboarding)/creating');
        return;
      }
      // A returning user who just authenticated: send them through the branded
      // "entering" transition, which then lands on home. The transition screen
      // and home itself must not be redirected.
      if (root === '(auth)') {
        const screen = String(segments[1]);
        if (screen !== 'entering') {
          router.replace('/(auth)/entering');
        }
        return;
      }
      // Fresh launch with a valid session and no route yet → straight to home.
      if (root === 'undefined') {
        router.replace('/(tabs)/home');
      }
    } else if (!isPublic) {
      router.replace(onboardingDone ? '/(auth)/login' : '/(onboarding)/welcome');
    }
  }, [ready, user, segments, router, pendingOnboarding, onboardingDone]);

  const onLayout = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }} onLayout={onLayout}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tournament/[id]" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="auction/[tournamentId]/[categoryId]" />
        <Stack.Screen name="bracket/[tournamentId]/[categoryId]" />
        <Stack.Screen name="live/[matchId]" />
        <Stack.Screen name="team-league/[tournamentId]/[categoryId]" />
        <Stack.Screen name="checkout/[tournamentId]/[categoryId]" />
      </Stack>
      {!introDone ? <BrandIntro onDone={() => setIntroDone(true)} /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    // ponytail: v1 faces stay loaded until the last screen is migrated, then drop them.
    Oswald_500Medium,
    Montserrat_400Regular,
  });
  return (
    <Provider store={store}>
      <AuthGate fontsLoaded={fontsLoaded} />
    </Provider>
  );
}
