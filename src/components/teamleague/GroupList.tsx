import { View, Text, Pressable } from 'react-native';
import { Group, GroupStandings } from '@/api/teamLeague';
import { TeamLeagueEmpty } from '@/components/teamleague/TeamLeagueStates';

export function GroupList({ groups, standings, onSelect }: {
  groups: Group[];
  standings: GroupStandings[];
  onSelect: (g: Group) => void;
}) {
  if (groups.length === 0) return <TeamLeagueEmpty message="No groups configured yet." />;
  return (
    <View className="gap-3">
      {groups.map((g) => {
        const gs = standings.find((s) => s.group._id === g._id);
        const done = gs?.completedTies ?? 0;
        const total = gs?.totalTies ?? 0;
        const pct = total > 0 ? (done / total) * 100 : 0;
        const allDone = total > 0 && done === total;
        return (
          <Pressable key={g._id} onPress={() => onSelect(g)} className="gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-oswald text-base font-bold uppercase tracking-wide text-white" numberOfLines={1}>{g.groupName}</Text>
              <Text className="font-montserrat text-base text-gray-600">›</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="font-montserrat text-xs text-gray-500">{g.teamIds?.length ?? 0} teams</Text>
              <Text className={`font-montserrat text-xs ${allDone ? 'font-semibold text-emerald-400' : 'text-gray-500'}`}>
                {total > 0 ? `${done} / ${total} ties` : 'No ties yet'}
              </Text>
            </View>
            {total > 0 && (
              <View className="h-1 overflow-hidden rounded-full bg-white/10">
                <View className={`h-full rounded-full ${allDone ? 'bg-emerald-500/70' : 'bg-brand/60'}`} style={{ width: `${pct}%` }} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
