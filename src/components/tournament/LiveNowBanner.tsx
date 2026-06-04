import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { getTournamentMatches, LiveMatchSummary } from '@/api/cricketMatch';
import { LiveMatchCard } from '@/components/cricket/LiveMatchCard';

export function LiveNowBanner({ tournamentId, sport }: { tournamentId: string; sport?: string }) {
  const [matches, setMatches] = useState<LiveMatchSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (sport && sport !== 'cricket') { setLoaded(true); return; }
    let active = true;
    const load = async () => {
      try {
        const list = await getTournamentMatches(tournamentId);
        if (active) setMatches(list.filter((m) => m.status === 'in_progress'));
      } catch {
        if (active) setMatches([]);
      } finally {
        if (active) setLoaded(true);
      }
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, [tournamentId, sport]);

  if (!loaded || matches.length === 0) return null;

  return (
    <View className="gap-3 px-4 pt-4">
      <View className="flex-row items-center gap-2">
        <View className="h-1.5 w-1.5 rounded-full bg-red-500" />
        <Text className="font-montserrat text-[10px] font-bold uppercase tracking-widest text-red-400">Live now</Text>
      </View>
      {matches.map((m) => <LiveMatchCard key={m._id} match={m} />)}
    </View>
  );
}
