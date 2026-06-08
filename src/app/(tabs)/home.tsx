import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Modal, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { TournamentCard } from '@/components/TournamentCard';
import { FeaturedTournament } from '@/components/home/FeaturedTournament';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPublicTournaments } from '@/store/slices/tournamentSlice';
import { CITIES, SPORTS } from '@/lib/tournamentConstants';

export default function Home() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { publicTournaments, isLoading } = useAppSelector((s) => s.tournament);
  const user = useAppSelector((s) => s.auth.user);
  const [sport, setSport] = useState('All');
  const [city, setCity] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchPublicTournaments({
      limit: 20,
      sport: sport !== 'All' ? sport : undefined,
      city: city !== 'All' ? city : undefined,
    }));
  }, [dispatch, sport, city]);

  const visible = publicTournaments.filter((t) => t.status !== 'draft' && t.isActive !== false);
  // Surface a live/registration-open tournament as the hero, else the first one.
  const featured =
    visible.find((t) => t.status === 'ongoing') ||
    visible.find((t) => t.status === 'registration_open') ||
    visible[0];
  const rest = featured ? visible.filter((t) => t._id !== featured._id) : visible;
  const filtersActive = sport !== 'All' || city !== 'All';
  const firstName = user?.firstName || 'Player';

  const open = (id: string) => router.push({ pathname: '/tournament/[id]', params: { id } });

  const Header = (
    <View>
      {/* Greeting */}
      <View className="flex-row items-center justify-between px-5 pb-5 pt-1">
        <View className="flex-1">
          <Text className="font-montserrat text-sm text-gray-400">Welcome back,</Text>
          <Text className="font-oswald uppercase text-white" style={{ fontSize: 28, lineHeight: 32, paddingTop: 2 }}>
            {firstName}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityLabel="Profile">
          <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-brand bg-black">
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} className="h-full w-full" />
            ) : (
              <InitialsAvatar name={firstName} size={40} />
            )}
          </View>
        </Pressable>
      </View>

      {/* Featured hero */}
      {featured ? (
        <View className="px-5">
          <View className="mb-2 flex-row items-center gap-2">
            <Ionicons name="flame" size={15} color="#F97316" />
            <Text className="font-oswald text-xs uppercase tracking-[3px] text-brand">Featured</Text>
          </View>
          <FeaturedTournament tournament={featured} onPress={() => open(featured._id)} />
        </View>
      ) : null}

      {/* Section header + filter */}
      <View className="flex-row items-center justify-between px-5 pb-3 pt-6">
        <Text className="font-oswald text-xl uppercase text-white">Browse tournaments</Text>
        <Pressable
          onPress={() => setFilterOpen(true)}
          className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${filtersActive ? 'border-brand bg-brand/15' : 'border-white/15'}`}
        >
          <Ionicons name="options-outline" size={15} color={filtersActive ? '#F97316' : '#fff'} />
          <Text className={`font-montserrat text-xs ${filtersActive ? 'text-brand' : 'text-white'}`}>
            {filtersActive ? `${city} · ${sport}` : 'Filter'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Screen>
      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#F97316" size="large" /></View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(t) => t._id}
          ListHeaderComponent={Header}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
          renderItem={({ item }) => <TournamentCard tournament={item} onPress={() => open(item._id)} />}
          ListEmptyComponent={
            <View className="mt-16 items-center px-8">
              <Ionicons name="trophy-outline" size={48} color="#3a3a3a" />
              <Text className="mt-4 text-center font-oswald text-lg uppercase text-white">No tournaments yet</Text>
              <Text className="mt-1 text-center font-montserrat text-sm text-gray-500">
                {filtersActive ? 'Try clearing your filters.' : 'Check back soon for new tournaments.'}
              </Text>
              {filtersActive ? (
                <Pressable onPress={() => { setSport('All'); setCity('All'); }} className="mt-4 rounded-full bg-brand px-5 py-2.5">
                  <Text className="font-montserrat text-sm font-semibold text-white">Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setFilterOpen(false)}>
          <Pressable className="rounded-t-3xl border-t border-white/10 bg-ink p-6" onPress={(e) => e.stopPropagation()}>
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="font-oswald text-2xl uppercase text-white">Filters</Text>
              <Pressable onPress={() => setFilterOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#888" />
              </Pressable>
            </View>

            <Text className="mb-2 font-montserrat text-xs uppercase tracking-widest text-gray-400">Where</Text>
            <View className="mb-6 flex-row flex-wrap gap-2">
              {CITIES.map((c) => (
                <Pressable key={c} onPress={() => setCity(c)} className={`rounded-full border px-4 py-2 ${city === c ? 'border-brand bg-brand' : 'border-white/15'}`}>
                  <Text className={`font-montserrat text-sm ${city === c ? 'text-white' : 'text-gray-300'}`}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 font-montserrat text-xs uppercase tracking-widest text-gray-400">Sport</Text>
            <View className="mb-8 flex-row flex-wrap gap-2">
              {SPORTS.map((s) => (
                <Pressable key={s} onPress={() => setSport(s)} className={`rounded-full border px-4 py-2 ${sport === s ? 'border-brand bg-brand' : 'border-white/15'}`}>
                  <Text className={`font-montserrat text-sm capitalize ${sport === s ? 'text-white' : 'text-gray-300'}`}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => setFilterOpen(false)} className="items-center rounded-xl bg-brand py-3.5">
              <Text className="font-montserrat font-semibold text-white">Show results</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
