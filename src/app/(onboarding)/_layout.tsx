// src/app/(onboarding)/_layout.tsx
import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="your-game" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
