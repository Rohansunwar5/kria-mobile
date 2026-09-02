import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { getTournamentMatches, LiveMatchSummary } from '@/api/cricketMatch';
import { LiveMatchCard } from '@/components/cricket/LiveMatchCard';
import { Lbl } from '@/components/canvas';

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
    <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#F97316' }} />
        <Lbl style={{ color: '#F97316', letterSpacing: 0.22 * 9 }}>Live now</Lbl>
      </View>
      {matches.map((m) => <LiveMatchCard key={m._id} match={m} />)}
    </View>
  );
}
