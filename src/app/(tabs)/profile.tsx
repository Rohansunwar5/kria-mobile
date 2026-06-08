import { useEffect } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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

  const name = user ? `${user.firstName} ${user.lastName}` : 'Player';

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Banner header behind the avatar */}
        <View className="relative items-center pb-2 pt-4">
          <LinearGradient
            colors={['rgba(249,115,22,0.18)', 'transparent']}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120 }}
          />
          <AvatarPicker name={name} imageUrl={user?.profileImage} />
          <Text className="mt-3 font-oswald uppercase text-white" style={{ fontSize: 26, lineHeight: 30, paddingTop: 2 }}>
            {name}
          </Text>
          <Text className="font-montserrat text-sm text-gray-400">{user?.email}</Text>
          {!!user?.location && (
            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="location-outline" size={13} color="#9a9a9a" />
              <Text className="font-montserrat text-xs text-gray-500">{user.location}</Text>
            </View>
          )}
        </View>

        <View className="gap-5 px-5 pt-4">
          <StatGrid stats={playerStats} />

          {!!user?.titles?.length && (
            <View className="gap-2">
              <Text className="font-oswald text-xs uppercase tracking-wider text-gray-400">Honors &amp; Titles</Text>
              {user.titles.map((t, i) => (
                <View key={i} className="flex-row items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 p-3">
                  <Ionicons name="trophy" size={16} color="#F97316" />
                  <Text className="font-montserrat text-sm font-semibold text-white">{t}</Text>
                </View>
              ))}
            </View>
          )}

          <View className="gap-2.5">
            <MenuRow icon="create-outline" label="Edit Profile" onPress={() => router.push('/profile/edit')} />
            <MenuRow icon="clipboard-outline" label="My Registrations" onPress={() => router.push('/profile/registrations')} />
            <MenuRow icon="time-outline" label="Tournament History" onPress={() => router.push('/profile/history')} />
            <MenuRow icon="receipt-outline" label="Invoices" onPress={() => router.push('/profile/invoices')} />
            <MenuRow icon="search-outline" label="Find Tournaments" onPress={() => router.push('/(tabs)/home')} />
            <MenuRow icon="log-out-outline" label="Log out" danger onPress={() => dispatch(logout())} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
