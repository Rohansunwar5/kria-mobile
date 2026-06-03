import { View, Text } from 'react-native';
import { Match } from '@/api/match';
import { getCompetitors } from '@/lib/bracketView';

export function FixturesList({ matches, competitorType }: { matches: Match[]; competitorType: 'player' | 'team' }) {
  return (
    <View className="gap-3">
      <Text className="font-oswald text-lg font-bold uppercase text-white">All Fixtures</Text>
      {matches.map((m) => {
        const { c1, c2 } = getCompetitors(m, competitorType);
        const done = m.status === 'completed';
        return (
          <View key={m._id} className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <Text
              className={`flex-1 text-right font-montserrat text-sm font-semibold ${m.winnerId === c1.id ? 'text-emerald-400' : 'text-white'}`}
              numberOfLines={1}
            >
              {c1.name}
            </Text>
            <View className="px-3">
              {done ? (
                <Text className="rounded bg-white/5 px-2 py-1 font-montserrat text-xs font-bold text-gray-400">
                  {c1.score ?? '-'} : {c2.score ?? '-'}
                </Text>
              ) : (
                <Text className="font-montserrat text-[10px] font-bold uppercase text-gray-600">vs</Text>
              )}
            </View>
            <Text
              className={`flex-1 font-montserrat text-sm font-semibold ${m.winnerId === c2.id ? 'text-emerald-400' : 'text-white'}`}
              numberOfLines={1}
            >
              {c2.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
