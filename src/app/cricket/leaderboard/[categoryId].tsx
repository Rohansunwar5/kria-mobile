import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getCricketLeaderboard, SORTS, SORT_LABELS, type CricketPlayerStats, type LeaderboardSort } from '@/api/cricketStats';
import { getMyEntries } from '@/api/tournaments';
import { Button } from '@/components/ui/Button';
import { TopBar } from '@/components/ui/Bars';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, radius, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { sortColumns, sortMetric, statsSheet } from '@/lib/cricketSort';

const RANK = [colors.gold, colors.silver, colors.bronze];

export default function CricketLeaderboard() {
  const router = useRouter();
  const { categoryId, tournamentName, categoryName } = useLocalSearchParams<{ categoryId: string; tournamentName?: string; categoryName?: string }>();
  const [sort, setSort] = useState<LeaderboardSort>('runs');
  const [rows, setRows] = useState<CricketPlayerStats[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<CricketPlayerStats | null>(null);
  const alive = useRef(true);
  const latest = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async (by: LeaderboardSort) => {
    const n = ++latest.current;
    setFailed(false);
    setRows(null);
    try {
      const r = await getCricketLeaderboard(categoryId, by);
      if (alive.current && n === latest.current) setRows(r);
    } catch {
      if (alive.current && n === latest.current) setFailed(true);
    }
  }, [categoryId]);
  useEffect(() => { load(sort); }, [load, sort]);

  // Marking your own rows is a nicety: a failed lookup just leaves none marked.
  useEffect(() => {
    getMyEntries().then((e) => { if (alive.current) setMine(new Set(e.map((x) => x._id))); }, () => undefined);
  }, []);

  const columns = sortColumns(sort);
  const leader = rows?.[0];
  const top = leader && sortMetric(sort, leader);
  const sheet = sel && statsSheet(sel);
  const sub = [tournamentName, categoryName].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={s.screen}>
      <TopBar title="Player stats" sub={sub || undefined} onBack={() => goBack(router)} />
      <ScrollView contentContainerStyle={s.body}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {SORTS.map((k) => {
            const on = k === sort;
            return (
              <Pressable key={k} accessibilityRole="button" accessibilityLabel={SORT_LABELS[k]} accessibilityState={{ selected: on }} onPress={() => setSort(k)} style={[s.chip, { backgroundColor: on ? colors.text : colors.surface1 }]}>
                <Text style={[s.chipText, { color: on ? colors.bg : colors.text2 }]}>{SORT_LABELS[k]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {failed ? <InlineError what="Couldn't load player stats." onRetry={() => load(sort)} /> : null}
        {!rows && !failed ? (
          <View style={s.pad}><Skeleton style={{ height: 150, borderRadius: radius.cardLg }} /><Skeleton style={{ height: 56 }} /><Skeleton style={{ height: 56 }} /></View>
        ) : null}
        {rows && !rows.length ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Icon name="leaderboard" size={30} color={colors.text4} /></View>
            <Text style={[display(26), { textAlign: 'center' }]}>Nothing recorded yet</Text>
            <Text style={s.emptyLine}>Stats fill in as matches are scored.</Text>
          </View>
        ) : null}
        {rows && leader && top ? (
          <View style={s.pad}>
            <Tap accessibilityLabel={`${leader.playerName ?? 'Player'}, ${top.headline}`} onPress={() => setSel(leader)} style={s.card}>
              <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <Text style={s.headline}>{top.headline}</Text>
                <Text numberOfLines={2} style={display(28)}>{leader.playerName}</Text>
                <Text numberOfLines={1} style={s.sub}>{[leader.teamName, leader.batting?.highest ? `HS ${leader.batting.highest}` : undefined].filter(Boolean).join(' · ')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={display(56)}>{top.value}</Text>
                <Text style={s.sub}>{top.unit}</Text>
              </View>
            </Tap>
            <View style={s.headRow}>
              <Text style={[s.th, { width: 28 }]}>#</Text>
              <Text style={[s.th, { flex: 1 }]}>Player</Text>
              {columns.map((c) => <Text key={c.label} style={[s.th, s.col]}>{c.label}</Text>)}
            </View>
            {rows.map((r, i) => {
              const you = mine.has(r.registrationId);
              const ink = you ? colors.accentInk : colors.text;
              return (
                <Tap key={r.registrationId} accessibilityLabel={`${i + 1}. ${r.playerName ?? 'Player'}${you ? ' (you)' : ''}`} onPress={() => setSel(r)} style={[s.row, you && { backgroundColor: colors.accentTint }]}>
                  <Text style={[s.rank, { color: you ? colors.accentInk : RANK[i] ?? colors.text3 }]}>{i + 1}</Text>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text numberOfLines={1} style={[s.name, { color: ink }]}>{r.playerName}</Text>
                    {r.teamName ? <Text numberOfLines={1} style={s.sub}>{r.teamName}</Text> : null}
                  </View>
                  {columns.map((c, ci) => <Text key={c.label} style={[s.col, s.cell, { color: ci === 1 ? ink : you ? colors.accentInk : colors.text2 }]}>{c.value(r)}</Text>)}
                </Tap>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
      <BottomSheet open={!!sel} onClose={() => setSel(null)}>
        {sheet ? (
          <View style={{ gap: 18 }}>
            <View style={{ gap: 6 }}>
              <Text style={display(30)}>{sheet.title}</Text>
              <Text style={s.sub}>{sheet.sub}</Text>
            </View>
            {sheet.groups.map((g) => (
              <View key={g.title} style={{ gap: 10 }}>
                <Text style={s.group}>{g.title}</Text>
                <View style={s.grid}>
                  {g.cells.map((c) => (
                    <View key={c.k} style={s.gridCell}>
                      <Text style={[s.gridV, c.v === '—' && { color: colors.text4 }]}>{c.v}</Text>
                      <Text style={s.sub}>{c.k}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <Button label="Done" onPress={() => setSel(null)} />
          </View>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingBottom: 32 },
  chips: { flexDirection: 'row', gap: 8, paddingTop: 18, paddingHorizontal: space.gutter },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
  chipText: { fontFamily: font.semibold, fontSize: 13 },
  pad: { paddingHorizontal: space.gutter, paddingTop: space.headerToContent, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderRadius: radius.cardLg, backgroundColor: colors.surface1 },
  headline: { fontFamily: font.semibold, fontSize: 12, color: colors.accentInk },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  th: { fontFamily: font.semibold, fontSize: 12, color: colors.text3 },
  col: { width: 52, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  rank: { width: 28, fontFamily: font.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
  name: { fontFamily: font.semibold, fontSize: 14 },
  cell: { fontFamily: font.semibold, fontSize: 14, fontVariant: ['tabular-nums'] },
  empty: { paddingTop: 48, paddingHorizontal: 12, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
  group: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  gridCell: { width: '25%', gap: 2 },
  gridV: { fontFamily: font.semibold, fontSize: 18, color: colors.text, fontVariant: ['tabular-nums'] },
});
