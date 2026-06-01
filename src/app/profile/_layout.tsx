import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: true, headerStyle: { backgroundColor: '#111111' }, headerTintColor: '#fff' }} />;
}
