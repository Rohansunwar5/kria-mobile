import { View, Text, Pressable } from 'react-native';
import { Tie } from '@/api/teamLeague';
import { TeamLeagueEmpty } from '@/components/teamleague/TeamLeagueStates';

export function TieList({ ties, onSelect }: { ties: Tie[]; onSelect: (t: Tie) => void }) {
  if (ties.length === 0) return <TeamLeagueEmpty message="No ties scheduled yet." />;
  return (
    <View className="gap-2">
      {ties.map((tie) => {
        const completed = tie.status === 'completed';
        const win1 = tie.winnerId === tie.teams?.team1Id;
        const win2 = tie.winnerId === tie.teams?.team2Id;
        return (
          <Pressable key={tie._id} onPress={() => onSelect(tie)} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <View className="flex-row items-stretch">
              <View className={`flex-1 items-end justify-center px-4 py-3.5 ${win1 ? 'bg-emerald-500/5' : ''}`}>
                <Text className={`text-right font-montserrat text-sm font-semibold ${win1 ? 'font-bold text-emerald-300' : completed ? 'text-white/50' : 'text-white'}`} numberOfLines={2}>
                  {tie.teams?.team1Name}
                </Text>
              </View>
              <View className="min-w-[64px] items-center justify-center border-x border-white/5 px-3 py-3">
                {completed ? (
                  <Text className="font-montserrat text-[9px] font-bold uppercase tracking-widest text-emerald-400">Done</Text>
                ) : tie.completedCount !== undefined && (tie.subMatchCount ?? 0) > 0 ? (
                  <>
                    <Text className="font-montserrat text-[9px] font-bold uppercase tracking-widest text-gray-600">vs</Text>
                    <Text className="font-montserrat text-[9px] text-gray-600">{tie.completedCount}/{tie.subMatchCount}</Text>
                  </>
                ) : (
                  <Text className="font-montserrat text-[9px] font-bold uppercase tracking-widest text-gray-600">vs</Text>
                )}
              </View>
              <View className={`flex-1 items-start justify-center px-4 py-3.5 ${win2 ? 'bg-emerald-500/5' : ''}`}>
                <Text className={`font-montserrat text-sm font-semibold ${win2 ? 'font-bold text-emerald-300' : completed ? 'text-white/50' : 'text-white'}`} numberOfLines={2}>
                  {tie.teams?.team2Name}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
