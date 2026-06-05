// src/app/(onboarding)/_layout.tsx
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#111111' } }}>
      <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
      <Stack.Screen name="creating" options={{ gestureEnabled: false }} />
      <Stack.Screen name="welcome-done" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
