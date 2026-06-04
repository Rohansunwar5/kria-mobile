import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LiveMatchSummary } from '@/api/cricketMatch';

export function LiveMatchCard({ match }: { match: LiveMatchSummary }) {
  const router = useRouter();
  const live = match.cricketLiveState;
  const t1 = match.teams?.team1Name || 'Team 1';
  const t2 = match.teams?.team2Name || 'Team 2';
  const runs = live?.runs ?? 0;
  const wkts = live?.wickets ?? 0;
  const overs = `${live?.completedOvers ?? 0}.${live?.ballsInCurrentOver ?? 0}`;
  const need = live?.target != null ? `Target ${live.target} · Need ${Math.max(0, live.target - runs)}` : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/live/[matchId]', params: { matchId: match._id } })}
      className="overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/5 p-4 gap-2"
    >
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 font-montserrat text-sm font-bold text-white" numberOfLines={1}>{t1} vs {t2}</Text>
        <View className="flex-row items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5">
          <View className="h-1 w-1 rounded-full bg-red-500" />
          <Text className="font-montserrat text-[8px] font-bold uppercase tracking-widest text-red-400">Live</Text>
        </View>
      </View>
      <View className="flex-row items-baseline gap-2">
        <Text className="font-oswald text-3xl font-black text-white">{runs}/{wkts}</Text>
        <Text className="font-montserrat text-sm text-gray-400">({overs} ov)</Text>
      </View>
      {need && <Text className="font-montserrat text-xs text-gray-400">{need}</Text>}
      <Text className="font-montserrat text-[10px] font-bold uppercase tracking-widest text-red-400">Watch live →</Text>
    </Pressable>
  );
}
