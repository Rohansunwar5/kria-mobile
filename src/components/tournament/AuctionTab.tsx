import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Category } from '@/store/slices/registrationSlice';

function statusConfig(status: Category['status']) {
  if (status === 'auction_in_progress') return { label: 'Live Now', cls: 'border-red-500/20 bg-red-500/10 text-red-400', live: true };
  if (status === 'ongoing' || status === 'completed') return { label: 'Completed', cls: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400', live: false };
  return { label: 'Upcoming', cls: 'border-white/10 bg-white/5 text-gray-400', live: false };
}

export function AuctionTab({ tournamentId, categories }: { tournamentId: string; categories: Category[] }) {
  const router = useRouter();

  if (categories.length === 0) {
    return (
      <View className="m-4 items-center rounded-2xl border border-white/10 bg-white/5 p-8">
        <Text className="text-center font-montserrat text-gray-400">No categories announced for this tournament yet.</Text>
      </View>
    );
  }

  return (
    <View className="gap-3 p-4">
      <Text className="font-oswald text-xl font-bold uppercase text-white">Auction</Text>
      {categories.map((cat) => {
        const cfg = statusConfig(cat.status);
        return (
          <View key={cat._id} className="flex-row items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <View className="flex-1 flex-row items-center gap-2">
              <Text className="font-oswald text-lg font-bold uppercase text-white" numberOfLines={1}>{cat.name}</Text>
              <View className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 ${cfg.cls}`}>
                {cfg.live && <View className="h-1.5 w-1.5 rounded-full bg-red-400" />}
                <Text className={`font-montserrat text-[10px] font-bold uppercase ${cfg.cls.split(' ').pop()}`}>{cfg.label}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push(`/auction/${tournamentId}/${cat._id}`)}
              className="rounded-xl bg-brand px-4 py-2"
            >
              <Text className="font-montserrat text-xs font-bold uppercase text-white">Watch Live</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
