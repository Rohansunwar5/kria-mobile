import { View, Text } from 'react-native';
import { Standing } from '@/lib/bracketView';

export function StandingsTable({ standings, competitorType }: { standings: Standing[]; competitorType: 'player' | 'team' }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <View className="flex-row border-b border-white/10 px-4 py-3">
        <Text className="w-6 font-oswald text-[10px] uppercase tracking-widest text-gray-500">#</Text>
        <Text className="flex-1 font-oswald text-[10px] uppercase tracking-widest text-gray-500">
          {competitorType === 'player' ? 'Player' : 'Team'}
        </Text>
        <Text className="w-8 text-center font-oswald text-[10px] uppercase tracking-widest text-gray-500">P</Text>
        <Text className="w-8 text-center font-oswald text-[10px] uppercase tracking-widest text-gray-500">W</Text>
        <Text className="w-8 text-center font-oswald text-[10px] uppercase tracking-widest text-gray-500">L</Text>
        <Text className="w-10 text-center font-oswald text-[10px] uppercase tracking-widest text-gray-500">Pts</Text>
      </View>
      {standings.map((s, i) => (
        <View key={s.id || i} className="flex-row items-center border-b border-white/5 px-4 py-3">
          <Text className="w-6 font-montserrat text-xs font-bold text-gray-500">{i + 1}</Text>
          <View className="flex-1">
            <Text className="font-montserrat text-sm font-semibold text-white" numberOfLines={1}>{s.name}</Text>
            {competitorType === 'player' && !!s.teamName && (
              <Text className="font-montserrat text-[10px] text-brand/60" numberOfLines={1}>{s.teamName}</Text>
            )}
          </View>
          <Text className="w-8 text-center font-montserrat text-xs text-gray-400">{s.played}</Text>
          <Text className="w-8 text-center font-montserrat text-xs font-bold text-emerald-400">{s.won}</Text>
          <Text className="w-8 text-center font-montserrat text-xs text-red-400">{s.lost}</Text>
          <Text className="w-10 text-center font-montserrat text-xs font-bold text-brand">{s.points}</Text>
        </View>
      ))}
    </View>
  );
}
