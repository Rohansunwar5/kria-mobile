import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Match } from '@/api/match';
import { Competitor, getCompetitors } from '@/lib/bracketView';
import { TeamLogo } from '@/components/TeamLogo';

function statusBadge(match: Match, hasTBD: boolean) {
  const done = match.status === 'completed' || match.status === 'walkover';
  if (match.status === 'in_progress') return { label: 'Live', cls: 'border-red-500/30 bg-red-500/10', textCls: 'text-red-400', live: true };
  if (done) return { label: 'Completed', cls: 'border-emerald-400/20 bg-emerald-400/10', textCls: 'text-emerald-400', live: false };
  if (hasTBD) return { label: 'Pending', cls: 'border-white/10 bg-white/5', textCls: 'text-gray-500', live: false };
  return { label: 'Upcoming', cls: 'border-brand/20 bg-brand/10', textCls: 'text-brand', live: false };
}

function CompetitorRow({ c, competitorType }: { c: Competitor; competitorType: 'player' | 'team' }) {
  const dim = c.isTBD || c.isBye;
  return (
    <View className={`relative flex-row items-center gap-2.5 px-3 py-2.5 ${c.isWinner ? 'bg-emerald-500/5' : ''} ${dim ? 'opacity-30' : ''}`}>
      {c.isWinner && <View className="absolute inset-y-0 left-0 w-[3px] bg-emerald-400" />}
      {!dim ? <TeamLogo name={c.name} logo={c.logo} size={26} /> : null}
      <View className="flex-1">
        <Text
          className={`font-montserrat text-[13px] font-semibold ${c.isWinner ? 'text-emerald-400' : dim ? 'italic text-gray-600' : 'text-white/90'}`}
          numberOfLines={1}
        >
          {c.name}
        </Text>
        {competitorType === 'player' && !!c.teamName && !dim && (
          <Text className="font-montserrat text-[10px] text-brand/60" numberOfLines={1}>{c.teamName}</Text>
        )}
      </View>
      {c.score !== null && c.score !== undefined && (
        <Text className={`font-oswald text-base font-black ${c.isWinner ? 'text-emerald-400' : 'text-gray-600'}`}>{c.score}</Text>
      )}
    </View>
  );
}

export function MatchCard({
  match,
  competitorType,
  logoById,
}: {
  match: Match;
  competitorType: 'player' | 'team';
  logoById?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const { c1, c2 } = getCompetitors(match, competitorType, logoById);
  const badge = statusBadge(match, c1.isTBD || c2.isTBD);
  // Per-game chips render only for badminton (cricket matches carry no gameScores).
  const chips = (match.gameScores || [])
    .filter((g) => g.team1Score > 0 || g.team2Score > 0)
    .sort((a, b) => a.gameNumber - b.gameNumber)
    .map((g) => `${g.team1Score}-${g.team2Score}`);

  // Only cricket matches that are in progress have a live scoreboard to open.
  const tappable = match.sportType === 'cricket' && match.status === 'in_progress';

  const body = (
    <>
      <View className="flex-row items-center justify-between border-b border-white/5 bg-black/20 px-3 py-1.5">
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="font-mono text-[9px] tracking-widest text-gray-600">M{match.matchNumber}</Text>
          {chips.length > 0 && <Text className="font-montserrat text-[9px] text-gray-500" numberOfLines={1}>{chips.join(' · ')}</Text>}
        </View>
        <View className={`flex-row items-center gap-1 rounded-full border px-2 py-0.5 ${badge.cls}`}>
          {badge.live && <View className="h-1 w-1 rounded-full bg-red-500" />}
          <Text className={`font-montserrat text-[8px] font-bold uppercase tracking-widest ${badge.textCls}`}>{badge.label}</Text>
        </View>
      </View>
      <CompetitorRow c={c1} competitorType={competitorType} />
      <View className="h-px bg-white/5" />
      <CompetitorRow c={c2} competitorType={competitorType} />
      {tappable && (
        <View className="flex-row items-center justify-center gap-2 border-t border-red-500/20 bg-red-500/10 px-3 py-2.5">
          <View className="h-1.5 w-1.5 rounded-full bg-red-500" />
          <Text className="font-montserrat text-xs font-bold uppercase tracking-widest text-red-400">Watch live scoresheet</Text>
          <Ionicons name="arrow-forward" size={13} color="#f87171" />
        </View>
      )}
    </>
  );

  const containerCls = `overflow-hidden rounded-xl border ${badge.live ? 'border-red-500/40' : 'border-white/10'} bg-white/5`;

  if (tappable) {
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/live/[matchId]', params: { matchId: match._id } })}
        className={containerCls}
      >
        {body}
      </Pressable>
    );
  }
  return <View className={containerCls}>{body}</View>;
}
