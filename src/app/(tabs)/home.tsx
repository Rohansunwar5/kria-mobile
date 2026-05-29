import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { TournamentCard } from '@/components/TournamentCard';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPublicTournaments } from '@/store/slices/tournamentSlice';
import { CITIES, SPORTS } from '@/lib/tournamentConstants';

export default function Home() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { publicTournaments, isLoading } = useAppSelector((s) => s.tournament);
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

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <Text className="font-oswald text-3xl font-bold text-brand">Tournaments</Text>
        <Pressable onPress={() => setFilterOpen(true)} className="rounded-full border border-white/15 px-4 py-2">
          <Text className="font-montserrat text-xs text-white">{city} · {sport}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#F97316" size="large" /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(t) => t._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TournamentCard tournament={item} onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: item._id } })} />
          )}
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Text className="font-montserrat text-gray-400">No tournaments available right now.</Text>
            </View>
          }
        />
      )}

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="rounded-t-3xl border-t border-white/10 bg-ink p-6">
            <Text className="mb-4 font-oswald text-2xl font-bold text-white">Filters</Text>

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

            <Pressable onPress={() => setFilterOpen(false)} className="items-center rounded-xl bg-brand py-3">
              <Text className="font-montserrat font-semibold text-white">Show results</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
