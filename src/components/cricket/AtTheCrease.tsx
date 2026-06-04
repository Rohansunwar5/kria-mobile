import { View, Text } from 'react-native';
import { LiveState, InningsScorecard } from '@/api/cricketMatch';

function batterLine(innings: InningsScorecard | null, id?: string): string {
  const b = innings?.battingCard.find((x) => x.registrationId === id);
  if (!b) return '—';
  return `${b.name} ${b.runs}(${b.ballsFaced})`;
}

function bowlerLine(innings: InningsScorecard | null, id?: string): string {
  const b = innings?.bowlingCard.find((x) => x.registrationId === id);
  if (!b) return '—';
  return `${b.name} ${b.overs}-${b.maidens}-${b.runs}-${b.wickets}`;
}

export function AtTheCrease({ live, innings }: { live: LiveState | null; innings: InningsScorecard | null }) {
  if (!live) return null;
  const e = live.extras;
  return (
    <View className="rounded-2xl border border-white/10 bg-white/5 p-4 gap-3">
      <Text className="font-montserrat text-[10px] font-bold uppercase tracking-widest text-gray-500">At the crease</Text>
      <View className="gap-1.5">
        <Text className="font-montserrat text-sm text-white">
          <Text className="text-brand font-bold">★ </Text>{batterLine(innings, live.strikerId)}
        </Text>
        <Text className="font-montserrat text-sm text-gray-300">{batterLine(innings, live.nonStrikerId)}</Text>
      </View>
      <View className="h-px bg-white/5" />
      <Text className="font-montserrat text-sm text-gray-300">
        <Text className="text-[10px] uppercase tracking-widest text-blue-400">Bowling  </Text>
        {bowlerLine(innings, live.currentBowlerId)}
      </Text>
      {e && (
        <Text className="font-montserrat text-[11px] text-gray-500">
          Extras  wd {e.wides} · nb {e.noBalls} · b {e.byes} · lb {e.legByes}
        </Text>
      )}
    </View>
  );
}
