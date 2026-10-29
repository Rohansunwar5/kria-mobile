import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCategoryLeaderboard, getTeamTable, type LeaderboardEntry, type PointsConfig, type TeamRow } from '@/api/leaderboard';
import { getCategoryBracket, type Match } from '@/api/match';
import { getGroupStandings, getTiesByGroup, type GroupStandings, type Tie } from '@/api/teamLeague';
import { getTournamentTeams, type CategoryStatus, type TournamentCategory } from '@/api/tournaments';
import { Bracket } from '@/components/Bracket';
import { NextMatchCard } from '@/components/tournament/NextMatchCard';
import { ComingUpRows, ResultRows } from '@/components/tournament/ResultRows';
import { StandingsTable } from '@/components/tournament/StandingsTable';
import { TopBar } from '@/components/ui/Bars';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, radius, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { comingUp, emptyCopy, playerTable, resultRows, ruleLine, tableKind, teamLeagueTable, teamTable, tieRow } from '@/lib/standingsView';
import { bracketColumns, myNextMatch, nextMatchView, type Me } from '@/lib/tournamentBracket';
import { useTournament } from '@/lib/useTournament';

/** Knockout bracket, a league table (players or teams), or team-league groups. */
const viewOf = (c: TournamentCategory) => ((c.bracketType ?? 'knockout') === 'knockout' ? 'knockout' : tableKind(c));

/** Stage 1 (no stageNumber), then stages 2..5 until one has no groups. */
async function loadStages(categoryId: string) {
  const out = [await getGroupStandings(categoryId)];
  for (let n = 2; n <= 5 && out[out.length - 1].length; n++) {
    const next = await getGroupStandings(categoryId, n);
    if (!next.length) break;
    out.push(next);
  }
  return out;
}

export default function Matches() {
  const router = useRouter();
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();
  const { data, error, reload } = useTournament(id);
  const [matches, setMatches] = useState<Record<string, Match[] | undefined>>({});
  const [loaded, setLoaded] = useState(false);
  const [boards, setBoards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [teamTables, setTeamTables] = useState<Record<string, { rows: TeamRow[]; pointsConfig?: PointsConfig }>>({});
  const [stages, setStages] = useState<Record<string, GroupStandings[][]>>({});
  const [ties, setTies] = useState<Record<string, Tie[]>>({});
  const [logos, setLogos] = useState<Record<string, string | undefined>>({});
  // Failures keyed by what they belong to ("matches:{category}", "extras:{category}", "ties:{group}"),
  // so the banner only shows for the view on screen.
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  // Retry bumps this to re-run every load below; `data` changing (focus reload) does the same.
  const [tick, setTick] = useState(0);
  const [picked, setPicked] = useState<string>();
  const [stage, setStage] = useState(0);
  const [group, setGroup] = useState<string>();
  const flag = (k: string, v: boolean) => setFailed((f) => ({ ...f, [k]: v }));

  const chips = useMemo(() => data?.categories.filter((c) => c.status !== 'setup') ?? [], [data]);

  // Every chip's matches: they pick the opening category and feed each view. Cached ones stay on a failed refetch.
  useEffect(() => {
    if (!data) return;
    let live = true;
    Promise.all(chips.map((c) => getCategoryBracket(c._id).then((r) => r.matches ?? [], () => undefined))).then((lists) => {
      if (!live) return;
      setFailed((f) => ({ ...f, ...Object.fromEntries(chips.map((c, i) => [`matches:${c._id}`, !lists[i]])) }));
      setMatches((old) => Object.fromEntries(chips.map((c, i) => [c._id, lists[i] ?? old[c._id]])));
      setLoaded(true);
    });
    return () => { live = false; };
  }, [data, chips, tick]);

  const sel = chips.find((c) => c._id === (picked ?? category)) ?? (loaded ? chips.find((c) => matches[c._id]?.length) ?? chips[0] : undefined);
  const selId = sel?._id;
  const view = sel && viewOf(sel);
  const hasMatches = !!(selId && matches[selId]?.length);

  useEffect(() => {
    // No leaderboard call while the view is the empty state; team leagues may have groups before matches.
    if (!selId || !(view === 'teamLeague' || ((view === 'players' || view === 'teams') && hasMatches))) return;
    let live = true;
    const key = `extras:${selId}`;
    const fail = () => live && flag(key, true);
    if (view === 'players') {
      getCategoryLeaderboard(selId).then((r) => {
        if (!live) return;
        setBoards((o) => ({ ...o, [selId]: (r.boards.find((b) => b.label === null) ?? r.boards[0])?.entries ?? [] }));
        flag(key, false);
      }, fail);
    } else if (view === 'teams') {
      // The server ranks it by points; counting it here from matches ranked by wins and disagreed.
      getTeamTable(selId).then((r) => {
        if (!live) return;
        setTeamTables((o) => ({ ...o, [selId]: r }));
        flag(key, false);
      }, fail);
    } else {
      loadStages(selId).then((s) => {
        if (!live) return;
        setStages((o) => ({ ...o, [selId]: s }));
        flag(key, false);
      }, fail);
      getTournamentTeams(id).then((ts) => live && setLogos(Object.fromEntries(ts.map((t) => [t._id, t.logo]))), () => {});
    }
    return () => { live = false; };
  }, [selId, view, hasMatches, id, data, tick]);

  const stageList = (selId && stages[selId]) || [];
  const groups = stageList[stage] ?? stageList[0] ?? [];
  const g = groups.find((x) => x.group._id === group) ?? groups[0];
  const gid = g?.group._id;

  useEffect(() => {
    if (!gid) return;
    let live = true;
    getTiesByGroup(gid).then((t) => {
      if (!live) return;
      setTies((o) => ({ ...o, [gid]: t }));
      flag(`ties:${gid}`, false);
    }, () => live && flag(`ties:${gid}`, true));
    return () => { live = false; };
  }, [gid, data, tick]);

  const anyFailed = error || !!(selId && (failed[`matches:${selId}`] || failed[`extras:${selId}`])) || !!(gid && failed[`ties:${gid}`]);
  // A failed tournament load refetches through reload (new data re-runs every load); otherwise re-run the loads here.
  const retry = () => (error ? reload() : setTick((n) => n + 1));
  const ms = selId ? matches[selId] : undefined;
  // Scoped to the selected category, as 2a does: a player can be on different teams in different categories.
  const myEntries = data?.mine.filter((e) => e.categoryId === selId && e.status !== 'withdrawn') ?? [];
  const me: Me = { registrationIds: myEntries.map((e) => e._id), teamId: myEntries.find((e) => e.teamId)?.teamId };
  const loading = anyFailed ? null : <Loading />;
  const choose = (c: string) => { setPicked(c); setStage(0); setGroup(undefined); };

  function body() {
    if (!data) return loading;
    if (!sel) return chips.length ? loading : <Empty status="setup" />;
    if (!ms) return loading;
    if (view === 'teamLeague') {
      if (!stages[sel._id]) return loading;
      if (!ms.length && !stageList[0]?.length) return <Empty status={sel.status} />;
    } else if (!ms.length) return <Empty status={sel.status} />;

    return (
      <>
        {view === 'knockout' ? knockout(ms) : view === 'teamLeague' ? teamLeague(sel) : table(sel, ms, view!)}
        {sel.sport === 'cricket' ? (
          <Tap accessibilityRole="link" scale={0.99} onPress={() => router.push({ pathname: '/cricket/leaderboard/[categoryId]', params: { categoryId: sel._id, tournamentName: data?.tournament.name ?? '', categoryName: sel.name } })} style={s.link}>
            <Text style={s.linkText}>Player stats</Text>
            <Icon name="chevron_right" size={20} color={colors.disabled} />
          </Tap>
        ) : null}
      </>
    );
  }

  function knockout(list: Match[]) {
    const next = myNextMatch(list, me);
    return (
      <>
        {next ? <NextMatchCard v={nextMatchView(next, me, list)} /> : null}
        <View style={s.bracket}>
          <Bracket columns={bracketColumns(list, me)} onOpen={(matchId) => router.push({ pathname: '/live/[matchId]', params: { matchId } })} />
        </View>
        <View style={s.legend}>
          <View style={s.legendItem}><View style={s.mineKey} /><Text style={s.legendText}>Your matches</Text></View>
          <View style={s.legendItem}><View style={s.liveKey} /><Text style={s.legendText}>Live</Text></View>
        </View>
      </>
    );
  }

  function table(c: TournamentCategory, list: Match[], kind: 'players' | 'teams') {
    const entries = boards[c._id];
    const tt = teamTables[c._id];
    const rows = kind === 'teams' ? tt && teamTable(tt.rows, me.teamId) : entries && playerTable(entries, me.registrationIds);
    const results = resultRows(list);
    const upcoming = comingUp(list);
    return (
      <>
        <Text style={s.rule}>{ruleLine(c, kind, tt?.pointsConfig)}</Text>
        {!rows ? loading : rows.length ? (
          <StandingsTable rows={rows} head={kind === 'players' ? 'Player' : 'Team'} />
        ) : (
          <Text style={s.note}>The table fills in as matches finish.</Text>
        )}
        {results.length ? <View style={s.section}><SectionHeader title="Results" /><ResultRows rows={results} /></View> : null}
        {upcoming.length ? <View style={s.section}><SectionHeader title="Coming up" /><ComingUpRows rows={upcoming} /></View> : null}
      </>
    );
  }

  function teamLeague(c: TournamentCategory) {
    const list = gid ? ties[gid] : undefined;
    return (
      <>
        {stageList.length > 1 ? (
          <View style={s.seg}>
            <Segmented
              options={stageList.map((_, i) => ({ key: String(i), label: `Stage ${i + 1}` }))}
              value={String(stage)}
              onChange={(k) => { setStage(Number(k)); setGroup(undefined); }}
            />
          </View>
        ) : null}
        {groups.length > 1 && gid ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.segRow}>
            <Segmented options={groups.map((x) => ({ key: x.group._id, label: x.group.groupName }))} value={gid} onChange={setGroup} />
          </ScrollView>
        ) : null}
        <Text style={s.rule}>{ruleLine(c, 'teamLeague')}</Text>
        {g ? <StandingsTable rows={teamLeagueTable(g, me.teamId)} head="Team" topN={c.teamLeagueConfig?.topNPerGroup} crests={logos} /> : null}
        {g ? (
          <View style={s.section}>
            <SectionHeader title={`${g.group.groupName} ties`} />
            {!list ? loading : list.length === 0 ? <Text style={s.note}>No ties drawn yet.</Text> : list.map((t) => {
              const r = tieRow(t);
              return (
                <Tap
                  key={r.key}
                  scale={0.99}
                  accessibilityLabel={`${r.a} v ${r.b}, ${r.score}, ${r.status}. Open`}
                  onPress={() => router.push({ pathname: '/tournament/[id]/tie/[tieId]', params: { id, tieId: t._id, group: g.group.groupName } })}
                  style={s.tie}
                >
                  <View style={s.tieText}>
                    <Text style={s.tieName} numberOfLines={1}>{`${r.a} v ${r.b}`}</Text>
                    <Text style={[s.tieStatus, r.status === 'Live' && { color: colors.accent }]}>{r.status}</Text>
                  </View>
                  <Text style={s.tieScore}>{r.score}</Text>
                  <Icon name="chevron_right" size={20} color={colors.disabled} />
                </Tap>
              );
            })}
          </View>
        ) : null}
      </>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <TopBar title="Matches" sub={data?.tournament.name} onBack={() => goBack(router)} />
      {anyFailed ? <InlineError what="Couldn't load the matches." onRetry={retry} /> : null}
      <ScrollView contentContainerStyle={s.scroll}>
        {chips.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsWrap} contentContainerStyle={s.chips}>
            {chips.map((c) => {
              const on = c._id === selId;
              return (
                <Tap key={c._id} accessibilityState={{ selected: on }} onPress={() => choose(c._id)} style={[s.chip, on && { backgroundColor: colors.text }]}>
                  <Text style={[s.chipText, on && { color: colors.bg }]}>{c.name}</Text>
                </Tap>
              );
            })}
          </ScrollView>
        ) : null}
        {body()}
      </ScrollView>
    </SafeAreaView>
  );
}

function Empty({ status }: { status: CategoryStatus }) {
  const [title, line] = emptyCopy(status);
  return (
    <View style={s.empty}>
      <Icon name="account_tree" size={40} color={colors.text4} />
      <Text style={[display(26), s.center]}>{title}</Text>
      <Text style={s.emptyLine}>{line}</Text>
    </View>
  );
}

function Loading() {
  return (
    <View style={s.loading}>
      <Skeleton style={s.skelCard} />
      {[0, 1, 2].map((i) => <Skeleton key={i} style={s.skelRow} />)}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: 40 },
  chipsWrap: { marginHorizontal: -space.gutter },
  chips: { gap: 8, paddingTop: 8, paddingHorizontal: space.gutter },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface2 },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  bracket: { paddingTop: 22 },
  legend: { flexDirection: 'row', gap: 16, paddingTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontFamily: font.regular, fontSize: 11, color: colors.text3 },
  mineKey: { width: 10, height: 10, borderRadius: 3, borderWidth: 1.5, borderColor: colors.accent },
  liveKey: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  seg: { marginTop: 24, alignSelf: 'flex-start' },
  segRow: { marginTop: 24 },
  rule: { marginTop: 24, marginBottom: 2, fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  note: { paddingTop: 12, fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  section: { paddingTop: space.sectionGap, gap: 6 },
  tie: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  tieText: { flex: 1, minWidth: 0, gap: 2 },
  tieName: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  tieStatus: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  tieScore: { ...display(20) },
  link: { marginTop: space.sectionGap - 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  linkText: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  empty: { paddingTop: 90, paddingHorizontal: 16, alignItems: 'center', gap: 12 },
  center: { textAlign: 'center' },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
  loading: { paddingTop: 28, gap: 12 },
  skelCard: { height: 150, borderRadius: radius.cardLg - 2 },
  skelRow: { height: 44, borderRadius: 12 },
});
