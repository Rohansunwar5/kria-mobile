import { useEffect } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { StatGrid } from '@/components/profile/StatGrid';
import { MenuRow } from '@/components/profile/MenuRow';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPlayerStats, logout } from '@/store/slices/authSlice';

export default function Profile() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, playerStats } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(fetchPlayerStats());
  }, [dispatch]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <AvatarPicker name={user ? `${user.firstName} ${user.lastName}` : undefined} imageUrl={user?.profileImage} />

        <View className="items-center">
          <Text className="font-oswald text-2xl font-bold text-white">
            {user ? `${user.firstName} ${user.lastName}` : 'Player'}
          </Text>
          <Text className="font-montserrat text-sm text-gray-400">{user?.email}</Text>
          {!!user?.location && <Text className="font-montserrat text-xs text-gray-500">📍 {user.location}</Text>}
        </View>

        <StatGrid stats={playerStats} />

        {!!user?.titles?.length && (
          <View className="gap-2">
            <Text className="font-oswald text-xs uppercase tracking-wider text-gray-400">Honors & Titles</Text>
            {user.titles.map((t, i) => (
              <View key={i} className="rounded-xl border border-brand/30 bg-brand/10 p-3">
                <Text className="font-montserrat text-sm font-semibold text-white">🏆 {t}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="gap-2.5">
          <MenuRow label="Edit Profile" onPress={() => router.push('/profile/edit')} />
          <MenuRow label="My Registrations" onPress={() => router.push('/profile/registrations')} />
          <MenuRow label="Tournament History" onPress={() => router.push('/profile/history')} />
          <MenuRow label="Invoices" onPress={() => router.push('/profile/invoices')} />
          <MenuRow label="Find Tournaments" onPress={() => router.push('/(tabs)/home')} />
          <MenuRow label="Log out" danger onPress={() => dispatch(logout())} />
        </View>
      </ScrollView>
    </Screen>
  );
}
