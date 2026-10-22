import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTeamBrands, type TeamBrand } from '@/api/cricketMatch';
import { getTournament, getTournamentCategories } from '@/api/tournaments';
import { CricketBoard } from '@/components/live/CricketBoard';
import { TopBar } from '@/components/ui/Bars';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, font, radius, space } from '@/constants/theme';
import { roundTitle } from '@/lib/badmintonBoard';
import { cricketBoard, fromTournament } from '@/lib/cricketBoard';
import { goBack } from '@/lib/nav';
import { useCricketMatchSocket } from '@/lib/useCricketMatchSocket';

/** Mock 3c. Tournament cricket scoreboard, live over the socket. */
export function CricketLive({ matchId }: { matchId: string }) {
  const { match, live, scorecard, connected, loading, error, reload } = useCricketMatchSocket(matchId);
  const [tournament, setTournament] = useState('');
  const [category, setCategory] = useState<{ name: string; overs?: number } | null>(null);
  const [brands, setBrands] = useState<Record<string, TeamBrand>>({});

  const tournamentId = match?.tournamentId ? String(match.tournamentId) : '';
  const categoryId = match?.categoryId ? String(match.categoryId) : '';
  useEffect(() => {
    if (!tournamentId) return;
    let on = true;
    getTournament(tournamentId).then((t) => on && setTournament(t.name), () => undefined);
    getTournamentCategories(tournamentId).then(
      (c) => {
        const x = c.find((k) => k._id === categoryId);
        if (on && x) setCategory({ name: x.name, overs: x.cricketConfig?.overs });
      },
      () => undefined
    );
    getTeamBrands(tournamentId).then((b) => on && setBrands(b));
    return () => { on = false; };
  }, [tournamentId, categoryId]);

  const view = useMemo(
    () => (match ? cricketBoard(fromTournament(match, live, scorecard, brands, category?.overs)) : null),
    [match, live, scorecard, brands, category]
  );

  const back = () => goBack(router);
  if (!match || !view) {
    return (
      <SafeAreaView edges={['top']} style={s.screen}>
        <TopBar title="Live" onBack={back} />
        {error ? <InlineError what="Couldn't load this match." onRetry={reload} /> : null}
        {loading && !error ? <Skeleton style={s.skeleton} /> : null}
      </SafeAreaView>
    );
  }

  const title = match.bracketRound
    ? [roundTitle(match as Parameters<typeof roundTitle>[0]), category?.name].filter(Boolean).join(' · ')
    : `Match ${match.matchNumber ?? ''}`.trim();

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <TopBar
        title={title}
        sub={tournament || undefined}
        onBack={back}
        right={
          <View style={s.pill}>
            <View style={[s.dot, { backgroundColor: view.pillLive ? colors.accent : colors.text3 }]} />
            <Text style={s.pillText}>{view.pill}</Text>
          </View>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
        {error ? <InlineError what="Couldn't refresh this match." onRetry={reload} /> : null}
        {!connected ? <Text style={s.reconnect}>Reconnecting. Showing the last update.</Text> : null}
        <CricketBoard view={view} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  skeleton: { height: 220, marginHorizontal: space.gutter, marginTop: 8, borderRadius: 26 },
  body: { paddingHorizontal: space.gutter, paddingBottom: 40 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, borderRadius: radius.pill, backgroundColor: colors.surface1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: font.bold, fontSize: 12, color: colors.text },
  reconnect: { marginTop: 12, fontFamily: font.regular, fontSize: 12, color: colors.text3 },
});
