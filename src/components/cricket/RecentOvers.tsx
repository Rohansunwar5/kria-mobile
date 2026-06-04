import { View, Text, ScrollView } from 'react-native';
import { InningsScorecard } from '@/api/cricketMatch';
import { recentBalls, BallKind } from '@/lib/cricketView';

const CHIP: Record<BallKind, string> = {
  six: 'border-emerald-400/50 bg-emerald-400/15 text-emerald-300',
  four: 'border-blue-400/50 bg-blue-400/15 text-blue-300',
  wicket: 'border-red-500/50 bg-red-500/15 text-red-300',
  extra: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  dot: 'border-white/10 bg-white/5 text-gray-500',
  run: 'border-white/15 bg-white/10 text-gray-200',
};

export function RecentOvers({ innings }: { innings: InningsScorecard | null }) {
  const balls = recentBalls(innings, 3);
  if (balls.length === 0) return null;
  return (
    <View className="rounded-2xl border border-white/10 bg-white/5 p-4 gap-2">
      <Text className="font-montserrat text-[10px] font-bold uppercase tracking-widest text-gray-500">Recent</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {balls.map((b, i) => {
          const [border, bg, text] = CHIP[b.kind].split(' ');
          return (
            <View key={i} className={`h-8 min-w-8 items-center justify-center rounded-full border px-2 ${border} ${bg}`}>
              <Text className={`font-oswald text-xs font-black ${text}`}>{b.label}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
