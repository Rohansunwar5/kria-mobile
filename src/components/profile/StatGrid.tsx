import { View, Text } from 'react-native';
import type { PlayerStats } from '@/store/slices/authSlice';

function Chip({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <View className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <Text className="font-oswald text-[10px] uppercase tracking-wider text-gray-500">{label}</Text>
      <Text className={`font-oswald text-xl font-bold ${accent ? 'text-brand' : 'text-white'}`}>{value}</Text>
    </View>
  );
}

export function StatGrid({ stats }: { stats: PlayerStats | null }) {
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <Chip label="Tournaments" value={stats?.totalTournaments ?? 0} />
        <Chip label="Matches" value={stats?.totalMatchesPlayed ?? 0} />
      </View>
      <View className="flex-row gap-3">
        <Chip label="Wins" value={stats?.totalMatchesWon ?? 0} />
        <Chip label="Points" value={stats?.totalPointsContributed ?? 0} />
      </View>
      {(stats?.highestBid ?? 0) > 0 && (
        <Chip label="Highest Bid" value={`₹${(stats?.highestBid ?? 0).toLocaleString()}`} accent />
      )}
    </View>
  );
}
