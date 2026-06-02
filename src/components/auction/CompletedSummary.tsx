import { View, Text, ScrollView } from 'react-native';
import { AuctionTeam } from '@/api/auction';

interface Props {
  tournamentName: string;
  categoryName: string;
  teams: AuctionTeam[];
}

export function CompletedSummary({ tournamentName, categoryName, teams }: Props) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View className="items-center gap-1">
        <Text className="font-oswald text-[11px] uppercase tracking-[0.3em] text-brand">Final Results</Text>
        <Text className="text-center font-oswald text-3xl font-extrabold uppercase text-white">Auction Complete</Text>
        <Text className="font-montserrat text-sm text-gray-500">{tournamentName} — {categoryName}</Text>
      </View>
      {teams.map((team) => (
        <View key={team._id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <View className="h-1" style={{ backgroundColor: team.primaryColor || '#F97316' }} />
          <View className="gap-2 p-4">
            <Text className="font-oswald text-lg font-bold uppercase text-white">{team.name}</Text>
            <View className="flex-row justify-between border-t border-white/10 pt-2">
              <Text className="font-montserrat text-sm text-gray-500">Total Spent</Text>
              <Text className="font-montserrat text-sm font-bold text-brand">₹{team.totalSpent.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-montserrat text-sm text-gray-500">Budget Left</Text>
              <Text className="font-montserrat text-sm font-bold text-emerald-400">₹{team.budget.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-montserrat text-sm text-gray-500">Players</Text>
              <Text className="font-montserrat text-sm font-bold text-white">{team.playersCount}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
