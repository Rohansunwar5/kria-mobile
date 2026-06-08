import { View, Text, Pressable, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { StatusPill } from '@/components/StatusPill';
import { formatShortDate } from '@/lib/format';

const FALLBACK = 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1200&auto=format&fit=crop';

export function FeaturedTournament({ tournament, onPress }: { tournament: Tournament; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="overflow-hidden rounded-3xl border border-white/10">
      <ImageBackground
        source={{ uri: tournament.bannerImage || FALLBACK }}
        style={{ height: 230, backgroundColor: '#161616' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.1)', 'rgba(17,17,17,0.95)']}
          locations={[0, 0.45, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <View className="flex-1 justify-between p-4">
          <View className="flex-row items-start justify-between">
            <StatusPill status={tournament.status} />
            <View className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1">
              <Text className="font-montserrat text-[10px] font-bold uppercase text-white/80">
                {tournament.sport?.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View>
            <Text numberOfLines={2} className="font-oswald uppercase text-white" style={{ fontSize: 26, lineHeight: 28, paddingTop: 2 }}>
              {tournament.name}
            </Text>
            <View className="mt-2 flex-row items-center gap-4">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="location-outline" size={14} color="#F97316" />
                <Text className="font-montserrat text-xs text-gray-200">{tournament.venue?.city || 'TBD'}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="calendar-outline" size={14} color="#F97316" />
                <Text className="font-montserrat text-xs text-gray-200">{formatShortDate(tournament.startDate)}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="people-outline" size={14} color="#F97316" />
                <Text className="font-montserrat text-xs text-gray-200">{tournament.registeredPlayersCount ?? 0}</Text>
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}
