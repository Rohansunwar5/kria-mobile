import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { InningsScorecard, LiveState } from '@/api/cricketMatch';
import { dismissalLine } from '@/lib/cricketView';

type SubTab = 'batting' | 'bowling' | 'fow';
const SUBS: { key: SubTab; label: string }[] = [
  { key: 'batting', label: 'Batting' },
  { key: 'bowling', label: 'Bowling' },
  { key: 'fow', label: 'FoW' },
];

function HeaderRow({ cols }: { cols: string[] }) {
  return (
    <View className="flex-row border-b border-white/10 px-3 py-2">
      <Text className="flex-1 font-montserrat text-[9px] uppercase tracking-widest text-gray-600">{cols[0]}</Text>
      {cols.slice(1).map((c) => (
        <Text key={c} className="w-10 text-right font-montserrat text-[9px] uppercase tracking-widest text-gray-600">{c}</Text>
      ))}
    </View>
  );
}

function BattingTable({ innings, live }: { innings: InningsScorecard; live: LiveState | null }) {
  return (
    <View>
      <HeaderRow cols={['Batter', 'R', 'B', '4s', '6s', 'SR']} />
      {innings.battingCard.map((b) => {
        const isStriker = b.registrationId === live?.strikerId;
        const isActive = isStriker || b.registrationId === live?.nonStrikerId;
        return (
          <View key={b.registrationId} className={`flex-row items-start border-b border-white/5 px-3 py-2.5 ${isActive ? 'bg-brand/5' : ''}`}>
            <View className="flex-1 pr-2">
              <Text className={`font-montserrat text-[13px] font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`} numberOfLines={1}>
                {b.name}{isStriker ? <Text className="text-brand font-black"> ★</Text> : null}
              </Text>
              <Text className="font-montserrat text-[10px] text-gray-600" numberOfLines={1}>{dismissalLine(b.dismissal)}</Text>
            </View>
            <Text className="w-10 text-right font-oswald text-sm font-black text-white">{b.runs}</Text>
            <Text className="w-10 text-right font-montserrat text-xs text-gray-500">{b.ballsFaced}</Text>
            <Text className="w-10 text-right font-montserrat text-xs text-gray-400">{b.fours}</Text>
            <Text className="w-10 text-right font-montserrat text-xs text-gray-400">{b.sixes}</Text>
            <Text className="w-10 text-right font-montserrat text-xs text-gray-400">{b.strikeRate.toFixed(1)}</Text>
          </View>
        );
      })}
      <View className="flex-row justify-between px-3 py-2.5">
        <Text className="font-montserrat text-[11px] text-gray-500">Extras {innings.totals.extras.total}</Text>
        <Text className="font-montserrat text-[11px] text-gray-300">
          Total <Text className="font-oswald font-black text-white">{innings.totals.runs}/{innings.totals.wickets}</Text> ({innings.totals.overs} ov)
        </Text>
      </View>
    </View>
  );
}

function BowlingTable({ innings, live }: { innings: InningsScorecard; live: LiveState | null }) {
  return (
    <View>
      <HeaderRow cols={['Bowler', 'O', 'M', 'R', 'W', 'Econ']} />
      {innings.bowlingCard.map((b) => {
        const isActive = b.registrationId === live?.currentBowlerId;
        return (
          <View key={b.registrationId} className={`flex-row items-center border-b border-white/5 px-3 py-2.5 ${isActive ? 'bg-blue-500/5' : ''}`}>
            <Text className={`flex-1 pr-2 font-montserrat text-[13px] font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`} numberOfLines={1}>
              {b.name}{isActive ? <Text className="text-blue-400 font-black"> ★</Text> : null}
            </Text>
            <Text className="w-10 text-right font-montserrat text-xs text-gray-400">{b.overs}</Text>
            <Text className="w-10 text-right font-montserrat text-xs text-gray-500">{b.maidens}</Text>
            <Text className="w-10 text-right font-montserrat text-xs text-gray-400">{b.runs}</Text>
            <Text className="w-10 text-right font-oswald text-sm font-black text-white">{b.wickets}</Text>
            <Text className="w-10 text-right font-montserrat text-xs text-gray-400">{b.economy.toFixed(2)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function FallOfWickets({ innings }: { innings: InningsScorecard }) {
  if (innings.fallOfWickets.length === 0) {
    return <Text className="px-3 py-6 text-center font-montserrat text-sm text-gray-500">No wickets have fallen.</Text>;
  }
  return (
    <View>
      {innings.fallOfWickets.map((w) => (
        <View key={w.wicketNumber} className="flex-row items-center justify-between border-b border-white/5 px-3 py-2.5">
          <View className="flex-1 pr-2">
            <Text className="font-montserrat text-[13px] font-semibold text-gray-300" numberOfLines={1}>{w.batterName}</Text>
            <Text className="font-montserrat text-[10px] text-gray-600" numberOfLines={1}>{w.dismissalLine}</Text>
          </View>
          <Text className="font-oswald text-sm font-black text-white">{w.score}</Text>
          <Text className="ml-2 w-12 text-right font-montserrat text-xs text-gray-500">{w.overs} ov</Text>
        </View>
      ))}
    </View>
  );
}

export function ScorecardTabs({
  innings1, innings2, currentInnings, live,
}: {
  innings1: InningsScorecard | null;
  innings2: InningsScorecard | null;
  currentInnings: 1 | 2;
  live: LiveState | null;
}) {
  const hasTwo = !!innings1 && !!innings2;
  const [inningsOverride, setInningsOverride] = useState<1 | 2 | null>(null);
  const inningsView = inningsOverride ?? currentInnings;
  const [sub, setSub] = useState<SubTab>('batting');
  const innings = inningsView === 1 ? innings1 : innings2;
  if (!innings) return null;

  return (
    <View className="gap-3">
      {hasTwo && (
        <View className="flex-row gap-2">
          {[1, 2].map((n) => (
            <Pressable key={n} onPress={() => setInningsOverride(n as 1 | 2)} className={`rounded-lg px-3 py-1.5 ${inningsView === n ? 'bg-white/10' : ''}`}>
              <Text className={`font-montserrat text-xs ${inningsView === n ? 'text-white' : 'text-gray-500'}`}>Innings {n}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <View className="flex-row border-b border-white/10">
          {SUBS.map((s) => (
            <Pressable key={s.key} onPress={() => setSub(s.key)} className={`flex-1 items-center py-2.5 ${sub === s.key ? 'border-b-2 border-brand' : ''}`}>
              <Text className={`font-montserrat text-xs font-semibold ${sub === s.key ? 'text-brand' : 'text-gray-500'}`}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
        {sub === 'batting' && <BattingTable innings={innings} live={inningsView === currentInnings ? live : null} />}
        {sub === 'bowling' && <BowlingTable innings={innings} live={inningsView === currentInnings ? live : null} />}
        {sub === 'fow' && <FallOfWickets innings={innings} />}
      </View>
    </View>
  );
}
