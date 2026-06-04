import { View, Text } from 'react-native';
import { CricketMatch, LiveState } from '@/api/cricketMatch';
import { oversDisplay, currentRunRate, requiredRunRate, chaseLine } from '@/lib/cricketView';
import { LiveBadge } from '@/components/auction/LiveBadge';

export function HeroScore({ match, live, completed }: { match: CricketMatch; live: LiveState | null; completed: boolean }) {
  const maxOvers = match.matchConfig?.maxOvers;
  const team1 = match.teams?.team1Name || 'Team 1';
  const team2 = match.teams?.team2Name || 'Team 2';
  const winnerName = String(match.winnerId) === String(match.teams?.team1Id) ? team1
    : String(match.winnerId) === String(match.teams?.team2Id) ? team2 : null;

  const crr = currentRunRate(live);
  const rrr = requiredRunRate(live, maxOvers);
  const chase = chaseLine(live, maxOvers);

  return (
    <View className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <View className="flex-row items-center justify-between border-b border-white/5 bg-black/20 px-4 py-2.5">
        <Text className="flex-1 font-montserrat text-xs font-bold uppercase tracking-widest text-gray-400" numberOfLines={1}>
          {team1} <Text className="text-brand">vs</Text> {team2}
        </Text>
        {completed ? (
          <View className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1">
            <Text className="font-oswald text-xs font-bold uppercase tracking-wider text-emerald-400">Full Time</Text>
          </View>
        ) : live ? (
          <LiveBadge />
        ) : null}
      </View>

      <View className="p-5 gap-3">
        {live ? (
          <>
            <View className="flex-row items-end justify-between">
              <Text className="font-oswald text-6xl font-black leading-none text-white">
                {live.runs}<Text className="text-brand">/</Text><Text className="text-4xl">{live.wickets}</Text>
              </Text>
              <View className="items-end">
                <Text className="font-montserrat text-xs uppercase tracking-widest text-gray-500">
                  Innings {live.currentInnings}
                </Text>
                <Text className="font-oswald text-lg font-bold text-gray-300">{oversDisplay(live)} ov</Text>
              </View>
            </View>

            {chase && (
              <Text className="font-montserrat text-sm font-semibold text-brand">{chase}</Text>
            )}

            <View className="flex-row gap-6">
              <View>
                <Text className="font-montserrat text-[10px] uppercase tracking-widest text-gray-500">CRR</Text>
                <Text className="font-oswald text-xl font-bold text-white">{crr.toFixed(2)}</Text>
              </View>
              {rrr != null && (
                <View>
                  <Text className="font-montserrat text-[10px] uppercase tracking-widest text-gray-500">RRR</Text>
                  <Text className="font-oswald text-xl font-bold text-white">{rrr.toFixed(2)}</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <Text className="py-6 text-center font-oswald text-xl font-bold text-gray-500">Match not started</Text>
        )}

        {completed && (
          <View className="mt-1 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
            <Text className="font-montserrat text-sm font-bold text-emerald-400">
              {winnerName ? `${winnerName} won` : 'Match complete'}
              {match.result?.marginOfVictory ? ` · ${match.result.marginOfVictory}` : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
