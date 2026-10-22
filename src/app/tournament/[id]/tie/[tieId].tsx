import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTieDetails, type TieDetail } from '@/api/teamLeague';
import { getTournamentTeams } from '@/api/tournaments';
import { Crest } from '@/components/tournament/Crest';
import { TopBar } from '@/components/ui/Bars';
import { InlineError } from '@/components/ui/InlineError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, display, font, radius, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { tieView } from '@/lib/standingsView';
import { useTournament } from '@/lib/useTournament';

/** Team-league tie (previewed): both teams and the tie score, then each sub-match. `group` names the title. */
export default function Tie() {
  const router = useRouter();
  const { id, tieId, group } = useLocalSearchParams<{ id: string; tieId: string; group?: string }>();
  const { data } = useTournament(id);
  const [detail, setDetail] = useState<TieDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const [logos, setLogos] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    let live = true;
    getTieDetails(tieId).then((d) => { if (live) { setDetail(d); setFailed(false); } }, () => live && setFailed(true));
    return () => { live = false; };
  }, [tieId, tick]);

  useEffect(() => {
    let live = true;
    getTournamentTeams(id).then((ts) => live && setLogos(Object.fromEntries(ts.map((t) => [t._id, t.logo]))), () => {});
    return () => { live = false; };
  }, [id]);

  const tie = detail?.tie;
  const v = detail?.tie ? tieView({ ...detail, tie: detail.tie }) : null;
  const myTeam = data?.mine.find((e) => e.teamId)?.teamId;
  const cat = data?.categories.find((c) => c._id === tie?.categoryId)?.name;

  const team = (teamId: string, name: string) => (
    <View style={s.team}>
      <Crest uri={logos[teamId]} name={name} size={56} />
      <Text style={[s.teamName, tie?.winnerId && tie.winnerId !== teamId && { color: colors.text2 }]} numberOfLines={2}>{name}</Text>
      <Text style={s.yours}>{teamId === myTeam ? 'Your team' : ' '}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      <TopBar title={group ? `${group} tie` : 'Tie'} sub={[cat, data?.tournament.name].filter(Boolean).join(' · ') || undefined} onBack={() => goBack(router)} />
      {failed ? <InlineError what="Couldn't load the tie." onRetry={() => setTick((n) => n + 1)} /> : null}
      <ScrollView contentContainerStyle={s.scroll}>
        {!tie || !v ? (
          failed ? null : (
            <View style={s.loading}>
              <Skeleton style={s.skelCard} />
              {[0, 1, 2].map((i) => <Skeleton key={i} style={s.skelRow} />)}
            </View>
          )
        ) : (
          <>
            <View style={s.card}>
              {team(tie.teams.team1Id, tie.teams.team1Name)}
              <View style={s.mid}>
                <Text style={display(64)}>{v.score}</Text>
                <Text style={s.status}>{v.status}</Text>
              </View>
              {team(tie.teams.team2Id, tie.teams.team2Name)}
            </View>
            <View style={s.section}>
              <SectionHeader title="Matches" />
              {v.subs.map((m) => (
                <View key={m.key} style={s.sub}>
                  <View style={s.subHead}>
                    <Text style={s.slot}>{m.slot}</Text>
                    <Text style={[s.slot, m.live && { color: colors.accent }]}>{m.status}</Text>
                  </View>
                  {m.sides.map((side, i) => (
                    <View key={i} style={s.side}>
                      <Text style={[s.name, side.won && s.won, side.lost && s.lost]} numberOfLines={1}>{side.name}</Text>
                      <View style={s.games}>
                        {side.games.map((g, k) => (
                          <Text key={k} style={[s.game, g.strong && s.gameWon]}>{g.v}</Text>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: 40 },
  card: { marginTop: 16, paddingVertical: 22, paddingHorizontal: 18, borderRadius: radius.cardLg, backgroundColor: colors.surface1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  team: { flex: 1, minWidth: 0, alignItems: 'center', gap: 8 },
  teamName: { fontFamily: font.semibold, fontSize: 13, color: colors.text, textAlign: 'center' },
  yours: { fontFamily: font.semibold, fontSize: 11, color: colors.accent },
  mid: { alignItems: 'center', gap: 6 },
  status: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  section: { paddingTop: 32 },
  sub: { gap: 6, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  subHead: { flexDirection: 'row', justifyContent: 'space-between' },
  slot: { fontFamily: font.semibold, fontSize: 11.5, color: colors.text4 },
  side: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, minWidth: 0, fontFamily: font.medium, fontSize: 14, color: colors.text },
  won: { fontFamily: font.semibold },
  lost: { color: colors.text4 },
  games: { flexDirection: 'row', gap: 8 },
  game: { width: 18, textAlign: 'right', fontFamily: font.regular, fontSize: 13, color: colors.text4, fontVariant: ['tabular-nums'] },
  gameWon: { fontFamily: font.semibold, color: colors.text },
  loading: { paddingTop: 16, gap: 12 },
  skelCard: { height: 170, borderRadius: radius.cardLg },
  skelRow: { height: 64, borderRadius: 12 },
});
