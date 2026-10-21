import { Tabs } from 'expo-router';
import { TabBar } from '@/components/navigation/TabBar';
import { colors } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';

export default function TabsLayout() {
  const user = useAppSelector((s) => s.auth.user);
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const avatar = user ? { initials, photo: user.profileImage } : undefined;

  return (
    <Tabs
      // No scene `animation`: interrupted 'shift'/'fade' transitions left the
      // focused screen stuck at opacity 0 (2026-10-09).
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={(props) => <TabBar {...props} avatar={avatar} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="compete" options={{ title: 'Compete' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="awards" options={{ title: 'Awards' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
