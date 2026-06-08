import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PlayerStats } from '@/store/slices/authSlice';

type IoniconName = keyof typeof Ionicons.glyphMap;

function Chip({ icon, label, value, accent }: { icon: IoniconName; label: string; value: string | number; accent?: boolean }) {
  return (
    <View className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <View className="mb-2 h-8 w-8 items-center justify-center rounded-full bg-brand/15">
        <Ionicons name={icon} size={16} color="#F97316" />
      </View>
      <Text className={`font-oswald text-2xl ${accent ? 'text-brand' : 'text-white'}`}>{value}</Text>
      <Text className="font-montserrat text-[10px] uppercase tracking-wider text-gray-500">{label}</Text>
    </View>
  );
}

export function StatGrid({ stats }: { stats: PlayerStats | null }) {
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <Chip icon="trophy-outline" label="Tournaments" value={stats?.totalTournaments ?? 0} />
        <Chip icon="tennisball-outline" label="Matches" value={stats?.totalMatchesPlayed ?? 0} />
      </View>
      <View className="flex-row gap-3">
        <Chip icon="ribbon-outline" label="Wins" value={stats?.totalMatchesWon ?? 0} />
        <Chip icon="flash-outline" label="Points" value={stats?.totalPointsContributed ?? 0} />
      </View>
      {(stats?.highestBid ?? 0) > 0 && (
        <Chip icon="cash-outline" label="Highest Bid" value={`₹${(stats?.highestBid ?? 0).toLocaleString()}`} accent />
      )}
    </View>
  );
}
