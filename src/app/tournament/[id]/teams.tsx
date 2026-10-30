import { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTournamentTeams, type TournamentTeam } from '@/api/tournaments';
import { getTeamRoster, type RosterPlayer } from '@/api/profileApi';
import { Crest } from '@/components/tournament/Crest';
import { Squad } from '@/components/tournament/Squad';
import { TopBar } from '@/components/ui/Bars';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, radius, space } from '@/constants/theme';
import { teamShort } from '@/lib/tournamentView';
import { rupees } from '@/lib/format';
import { goBack } from '@/lib/nav';
import { pickTeam, squad, teamStats } from '@/lib/squadView';
import { useTournament } from '@/lib/useTournament';
import { useAppSelector } from '@/store/hooks';

export default function Teams() {
  const router = useRouter();
  const { id, team } = useLocalSearchParams<{ id: string; team?: string }>();
  const meId = useAppSelector((s) => s.auth.user?._id);
  const { data } = useTournament(id);
  const [teams, setTeams] = useState<TournamentTeam[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const [picked, setPicked] = useState<string | undefined>();
  const [roster, setRoster] = useState<RosterPlayer[] | null>(null);
  const [rosterFailed, setRosterFailed] = useState(false);

  useEffect(() => {
    let live = true;
    getTournamentTeams(id).then((v) => { if (live) { setTeams(v); setFailed(false); } }, () => live && setFailed(true));
    return () => { live = false; };
  }, [id, tick]);

  const myTeamId = data?.mine.find((m) => m.teamId)?.teamId;
  const selId = teams ? pickTeam(teams, picked ?? team, myTeamId) : undefined;
  const sel = teams?.find((t) => t._id === selId);

  // Retry (tick) re-runs this too.
  useEffect(() => {
    if (!selId) return;
    let live = true;
    setRoster(null);
    setRosterFailed(false);
    getTeamRoster(selId).then((v) => live && setRoster(v), () => live && setRosterFailed(true));
    return () => { live = false; };
  }, [selId, tick]);

  const rows = useMemo(() => (roster && data ? squad(roster, data.categories, meId) : []), [roster, data, meId]);
  const mine = !!sel && sel._id === myTeamId;
  const stats = sel ? teamStats(sel, rows) : null;

  return (
    <SafeAreaView style={s.root}>
      <TopBar title="Teams" sub={data?.tournament.name} onBack={() => goBack(router)} />
      {failed ? <InlineError what="Couldn't load the teams." onRetry={() => setTick((n) => n + 1)} /> : null}
      {rosterFailed ? <InlineError what="Couldn't load the squad." onRetry={() => setTick((n) => n + 1)} /> : null}
      <ScrollView contentContainerStyle={s.scroll}>
        {!teams && !failed ? <Skeleton style={s.skel} /> : null}
        {teams && teams.length === 0 ? <Text style={s.emptyLine}>No teams yet</Text> : null}
        {teams && teams.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.crests}>
            {teams.map((t) => {
              const on = t._id === selId;
              return (
                <Tap key={t._id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setPicked(t._id)} style={[s.crestBtn, on && { backgroundColor: colors.surface2 }]}>
                  <View style={[s.ring, on && { borderColor: colors.accent }]}>
                    <Crest uri={t.logo} name={t.name} size={48} />
                  </View>
                  <Text style={[s.crestName, on && { color: colors.text }]} numberOfLines={1}>{teamShort(t)}</Text>
                </Tap>
              );
            })}
          </ScrollView>
        ) : null}

        {sel && stats ? (
          <>
            <View style={s.head}>
              {mine ? <Text style={s.mine}>Your team</Text> : null}
              <Text style={display(36)}>{sel.name}</Text>
              {sel.owner?.name ? <Text style={s.owner}>Owner {sel.owner.name}</Text> : null}
            </View>
            <View style={s.stats}>
              {[
                [roster ? String(stats.players) : '—', 'Players'],
                [rupees(stats.spent), 'Spent'],
                [rupees(stats.left), 'Purse left'],
              ].map(([v, l], i) => (
                <View key={l} style={[s.stat, i > 0 && s.statDiv]}>
                  <Text style={display(24)}>{v}</Text>
                  <Text style={s.statLabel}>{l}</Text>
                </View>
              ))}
            </View>
            {mine && sel.whatsappGroupLink ? (
              <View style={s.wa}>
                <Icon name="forum" size={22} color={colors.text2} />
                <View style={s.waText}>
                  <Text style={s.waTitle}>Team WhatsApp group</Text>
                  <Text style={s.waSub}>Only visible to {sel.name} players</Text>
                </View>
                <Tap accessibilityRole="link" onPress={() => Linking.openURL(sel.whatsappGroupLink!)} style={s.join}>
                  <Text style={s.joinText}>Join</Text>
                </Tap>
              </View>
            ) : null}
            <View style={s.squad}>
              <SectionHeader title="Squad" />
              {roster === null ? (
                rosterFailed ? null : <Skeleton style={s.skel} />
              ) : rows.length === 0 ? (
                <View style={s.empty}>
                  <Text style={s.emptyTitle}>No players yet</Text>
                  <Text style={s.emptyLine}>Players join teams at the auction.</Text>
                </View>
              ) : (
                <Squad rows={rows} onPress={(r) => r.playerId && router.push({ pathname: '/player/[playerId]', params: { playerId: r.playerId } })} />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: 40 },
  skel: { height: 120, marginTop: 20, borderRadius: radius.card },
  crests: { gap: 10, paddingTop: 8, paddingBottom: 4 },
  crestBtn: { width: 72, alignItems: 'center', gap: 8, paddingVertical: 10, borderRadius: 18 },
  ring: { borderRadius: 26, borderWidth: 2, borderColor: 'transparent' },
  crestName: { width: 72, textAlign: 'center', fontFamily: font.semibold, fontSize: 11, color: colors.text3 },
  head: { paddingTop: 28, gap: 8 },
  mine: { fontFamily: font.semibold, fontSize: 12, color: colors.accent },
  owner: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  stats: { flexDirection: 'row', marginTop: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  stat: { flex: 1, paddingVertical: 14, gap: 3 },
  statDiv: { paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: colors.line },
  statLabel: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  wa: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.surface1 },
  waText: { flex: 1, gap: 2 },
  waTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  waSub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  join: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.text },
  joinText: { fontFamily: font.bold, fontSize: 13, color: colors.bg },
  squad: { paddingTop: space.sectionGap, gap: 12 },
  empty: { paddingTop: 12, gap: 6 },
  emptyTitle: { ...display(20) },
  emptyLine: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
});
