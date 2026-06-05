import { View, Text, ScrollView } from 'react-native';
import { StandingEntry } from '@/api/teamLeague';

const COLS = ['P', 'W', 'L', 'D', 'SM+', 'SM-', 'Pts'];

export function StandingsTable({ title, subtitle, entries, championTeamId }: {
  title: string;
  subtitle?: string;
  entries: StandingEntry[];
  championTeamId?: string;
}) {
  return (
    <View className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <View className="flex-row items-center justify-between border-b border-white/10 bg-black/20 px-4 py-2.5">
        <Text className="font-oswald text-sm font-bold uppercase tracking-wider text-white" numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text className="font-montserrat text-[11px] text-gray-500">{subtitle}</Text>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row border-b border-white/10 px-3 py-2">
            <Text className="w-6 font-montserrat text-[9px] uppercase text-gray-600">#</Text>
            <Text className="w-32 font-montserrat text-[9px] uppercase text-gray-600">Team</Text>
            {COLS.map((h) => (
              <Text key={h} className={`w-10 text-center font-montserrat text-[9px] uppercase ${h === 'Pts' ? 'font-bold text-brand' : 'text-gray-600'}`}>{h}</Text>
            ))}
          </View>
          {entries.map((e, idx) => (
            <View key={e.teamId} className="flex-row items-center border-b border-white/5 px-3 py-2.5">
              <Text className="w-6 font-montserrat text-xs text-gray-500">{idx + 1}</Text>
              <View className="w-32 flex-row items-center gap-1 pr-1">
                <Text className="flex-1 font-montserrat text-[13px] font-semibold text-white" numberOfLines={1}>{e.teamName}</Text>
                {championTeamId === e.teamId && <Text className="text-xs">🏆</Text>}
              </View>
              <Text className="w-10 text-center font-montserrat text-xs text-gray-300">{e.played}</Text>
              <Text className="w-10 text-center font-montserrat text-xs text-emerald-400">{e.won}</Text>
              <Text className="w-10 text-center font-montserrat text-xs text-red-400">{e.lost}</Text>
              <Text className="w-10 text-center font-montserrat text-xs text-amber-400">{e.drawn}</Text>
              <Text className="w-10 text-center font-montserrat text-xs text-gray-300">{e.subMatchesWon}</Text>
              <Text className="w-10 text-center font-montserrat text-xs text-gray-300">{e.subMatchesLost}</Text>
              <Text className="w-10 text-center font-oswald text-sm font-black text-brand">{e.points}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
