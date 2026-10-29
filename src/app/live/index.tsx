import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '@/components/ui/Bars';
import { Icon, sportIcon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, space } from '@/constants/theme';
import type { FeedRow } from '@/lib/liveFeedView';
import { goBack } from '@/lib/nav';
import { useLiveNow } from '@/lib/useLiveNow';
import { useAppSelector } from '@/store/hooks';

/** Mock 3a. Every live match; pushed from Home. */
export default function LiveNow() {
  const user = useAppSelector((st) => st.auth.user);
  const { tournament, quick, count, loading, error, refresh } = useLiveNow();
  const open = (r: FeedRow) =>
    r.kind === 'tournament'
      ? router.push({ pathname: '/live/[matchId]', params: { matchId: r.matchId } })
      : user
        ? router.push({ pathname: '/quick/[id]', params: { id: r.matchId } })
        : router.push('/(auth)/login');

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <TopBar title="" onBack={() => goBack(router)} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.text3} />}
      >
        <View style={s.head}>
          <Text style={display(40)}>Live now</Text>
          {count ? <Text style={s.count}>{`${count} ${count === 1 ? 'match' : 'matches'}`}</Text> : null}
        </View>

        {error ? <InlineError what="Couldn't load live matches." onRetry={refresh} /> : null}
        {loading && !count ? <Skeleton style={{ height: 120, marginTop: 32, borderRadius: 12 }} /> : null}

        {tournament.length ? <Text style={s.section}>Tournaments</Text> : null}
        {tournament.map((r) => <TournamentRow key={r.key} r={r} onPress={() => open(r)} />)}

        {quick.length ? <Text style={[s.section, { paddingTop: 44 }]}>Quick matches</Text> : null}
        {quick.map((r) => (
          <Tap key={r.key} scale={0.99} onPress={() => open(r)} style={[s.card, { gap: 10 }]}>
            <View style={s.metaRow}>
              <View style={s.sport}>
                <Icon name={sportIcon(r.sport)} size={15} color={colors.text3} />
                <Text style={s.meta}>{r.meta}</Text>
              </View>
              <LiveDot />
            </View>
            <Text style={s.name}>{r.sides.filter(Boolean).join(' vs ')}</Text>
            {r.scoreline ? <Text style={s.scoreline}>{r.scoreline}</Text> : null}
            {r.started ? <Text style={s.sub}>{r.started}</Text> : null}
          </Tap>
        ))}

        {!loading && !error && !count ? (
          <View style={s.empty}>
            <Icon name="sensors" size={40} color={colors.text4} />
            <Text style={s.emptyTitle}>Nothing live right now</Text>
            <Text style={s.emptySub}>Live matches show up here as soon as they start.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function LiveDot() {
  return (
    <View style={s.live}>
      <View style={s.dot} />
      <Text style={s.liveText}>Live</Text>
    </View>
  );
}

function TournamentRow({ r, onPress }: { r: FeedRow; onPress: () => void }) {
  const games = r.badminton?.games ?? [];
  const cur = games[games.length - 1];
  const done = games.slice(0, -1);
  return (
    <Tap scale={0.99} onPress={onPress} style={[s.card, { gap: 12 }]}>
      <View style={s.metaRow}>
        <Text style={[s.meta, { flex: 1 }]} numberOfLines={1}>{r.meta}</Text>
        <LiveDot />
      </View>
      {[0, 1].map((i) => {
        const mine = (g: { a: number; b: number }) => (i ? g.b : g.a);
        const theirs = (g: { a: number; b: number }) => (i ? g.a : g.b);
        const trail = !!cur && mine(cur) < theirs(cur);
        return (
          <View key={i} style={s.side}>
            <Text style={[s.name, { flex: 1 }, trail ? { color: colors.text2 } : null]} numberOfLines={1}>{r.sides[i]}</Text>
            {done.map((g, k) => (
              <Text key={k} style={[s.done, mine(g) > theirs(g) ? s.won : null]}>{mine(g)}</Text>
            ))}
            {cur ? <Text style={[display(24), s.cur, trail ? { color: colors.text2 } : null]}>{mine(cur)}</Text> : null}
            {r.cricket ? <Text style={s.score}>{r.cricket.scores[i] ?? ''}</Text> : null}
          </View>
        );
      })}
      {r.cricket?.chase ? <Text style={s.sub}>{r.cricket.chase}</Text> : null}
      {r.sub ? <Text style={s.sub}>{r.sub}</Text> : null}
      {r.started ? <Text style={s.sub}>{r.started}</Text> : null}
    </Tap>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: space.gutter, paddingBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  count: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  section: { fontFamily: font.semibold, fontSize: 17, color: colors.text, paddingTop: 32, paddingBottom: 6 },
  card: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  sport: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  liveText: { fontFamily: font.bold, fontSize: 12, color: colors.accent },
  side: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: font.semibold, fontSize: 16, color: colors.text },
  done: { fontFamily: font.regular, fontSize: 14, color: colors.text4, width: 20, textAlign: 'right', fontVariant: ['tabular-nums'] },
  won: { fontFamily: font.bold, color: colors.text },
  cur: { width: 30, textAlign: 'right' },
  score: { fontFamily: font.regular, fontSize: 15, color: colors.text2, fontVariant: ['tabular-nums'] },
  scoreline: { fontFamily: font.regular, fontSize: 15, color: colors.text2, fontVariant: ['tabular-nums'] },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 64 },
  emptyTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  emptySub: { fontFamily: font.regular, fontSize: 14, color: colors.text3, textAlign: 'center' },
});
