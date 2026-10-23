import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getRecentMatches, type RecentMatch } from '@/api/career';
import { RecentRow } from '@/components/profile/RecentRow';
import { SportChips } from '@/components/profile/SportChips';
import { TopBar } from '@/components/ui/Bars';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, display, font, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { groupByMonth, matchSports } from '@/lib/profileView';

const CAP = 50; // the server's cap, see getRecentMatches

export default function AllMatches() {
  const { playerId, name } = useLocalSearchParams<{ playerId: string; name?: string }>();
  const router = useRouter();
  const [matches, setMatches] = useState<RecentMatch[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sport, setSport] = useState<string | null>(null);
  const alive = useRef(true);
  const latest = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(() => {
    if (!playerId) return;
    const mine = ++latest.current;
    setFailed(false);
    getRecentMatches(playerId, CAP).then(
      (m) => { if (alive.current && mine === latest.current) setMatches(m); },
      () => { if (alive.current && mine === latest.current) setFailed(true); },
    );
  }, [playerId]);
  useEffect(() => { load(); }, [load]);

  const shown = matches && sport ? matches.filter((m) => m.sport === sport) : matches;
  const sports = matches ? matchSports(matches) : [];
  const now = new Date();

  return (
    <SafeAreaView style={s.screen}>
      <TopBar title="All matches" sub={name || undefined} onBack={() => goBack(router, '/(tabs)/profile')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {failed ? <InlineError what="Couldn't load matches." onRetry={load} /> : null}
        {!matches && !failed ? (
          <View style={{ gap: 14, padding: space.gutter }}>
            <Skeleton style={{ height: 60 }} />
            <Skeleton style={{ height: 60 }} />
            <Skeleton style={{ height: 60 }} />
          </View>
        ) : null}
        {matches && !matches.length ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Icon name="sports" size={30} color={colors.text4} /></View>
            <Text style={[display(26), { textAlign: 'center' }]}>No matches yet</Text>
            <Text style={s.emptyLine}>Matches you play are listed here.</Text>
          </View>
        ) : null}
        {sports.length > 1 ? <SportChips sports={sports} value={sport} onChange={setSport} /> : null}
        {shown ? groupByMonth(shown).map((g) => (
          <View key={g.month} style={s.group}>
            <Text style={s.month}>{g.month}</Text>
            {g.items.map((m) => <RecentRow key={m._id} match={m} now={now} />)}
          </View>
        )) : null}
        {matches?.length === CAP ? <Text style={s.cap}>Showing the 50 most recent matches.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  group: { paddingTop: 24, paddingHorizontal: space.gutter },
  month: { fontFamily: font.semibold, fontSize: 13, color: colors.text3, paddingBottom: 2 },
  cap: { paddingTop: 20, paddingHorizontal: space.gutter, fontFamily: font.regular, fontSize: 12, color: colors.text4 },
  empty: { paddingTop: 48, paddingHorizontal: 12, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
});
