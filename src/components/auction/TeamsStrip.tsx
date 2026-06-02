import { View, Text, ScrollView } from 'react-native';
import { AuctionTeam } from '@/api/auction';

function purse(n: number): string {
  return n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n.toLocaleString();
}

export function TeamsStrip({ teams }: { teams: AuctionTeam[] }) {
  if (teams.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="font-oswald text-[11px] uppercase tracking-widest text-gray-500">Teams</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {teams.map((team) => (
          <View key={team._id} className="w-40 rounded-xl border border-white/10 bg-white/5 p-3">
            <View className="mb-2 flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: team.primaryColor || '#F97316' }} />
              <Text className="flex-1 font-oswald text-sm font-bold uppercase text-white" numberOfLines={1}>
                {team.name}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-oswald text-[10px] uppercase tracking-wider text-gray-500">Purse</Text>
              <Text className="font-montserrat text-xs font-bold text-emerald-400">₹{purse(team.budget)}</Text>
            </View>
            <View className="mt-1 flex-row justify-between">
              <Text className="font-oswald text-[10px] uppercase tracking-wider text-gray-500">Players</Text>
              <Text className="font-montserrat text-xs font-bold text-white">{team.playersCount}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
