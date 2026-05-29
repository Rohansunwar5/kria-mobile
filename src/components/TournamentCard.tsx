import { View, Text, Pressable, Image } from 'react-native';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { StatusPill } from './StatusPill';
import { formatShortDate } from '@/lib/format';

const FALLBACK = 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1200&auto=format&fit=crop';

export function TournamentCard({ tournament, onPress }: { tournament: Tournament; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="mb-4 overflow-hidden rounded-3xl border border-white/10 bg-[#161616]">
      <View className="relative h-44 w-full">
        <Image source={{ uri: tournament.bannerImage || FALLBACK }} className="h-full w-full" resizeMode="cover" />
        <View className="absolute left-3 right-3 top-3 flex-row items-start justify-between">
          <StatusPill status={tournament.status} />
          <View className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1">
            <Text className="font-montserrat text-[10px] font-bold uppercase text-white/70">
              {tournament.sport?.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <Text numberOfLines={2} className="font-oswald text-2xl font-bold text-white">{tournament.name}</Text>
          <Text className="mt-1 font-montserrat text-xs text-gray-200">{tournament.venue?.city || 'TBD'}</Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between px-4 py-3">
        <View>
          <Text className="font-montserrat text-xs text-gray-400">
            {tournament.registeredPlayersCount ?? 0} players · {tournament.teamsCount ?? 0}/{tournament.settings?.maxTeams || '∞'} teams
          </Text>
          <Text className="mt-1 font-montserrat text-xs text-gray-500">
            {formatShortDate(tournament.startDate)} – {formatShortDate(tournament.endDate)}
          </Text>
        </View>
        <Text className="font-montserrat text-xs text-brand">View →</Text>
      </View>
    </Pressable>
  );
}
