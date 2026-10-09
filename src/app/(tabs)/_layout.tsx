import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
import { useAppSelector } from '@/store/hooks';

export default function TabsLayout() {
  const user = useAppSelector((s) => s.auth.user);
  const avatar = user ? { name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'You', photo: user.profileImage } : undefined;

  return (
    <Tabs
      // No scene `animation` ('shift' / 'fade'). Those drive each tab screen's
      // opacity from 1 down to 0 on a native-driven value, and fast taps that
      // interrupt the transition left the focused screen stuck at opacity 0 —
      // a blank page showing the navigator's own #F2F2F2 ground (2026-10-09).
      // Without one, the navigator just attaches and detaches screens.
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} avatar={avatar} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
    </Tabs>
  );
}
