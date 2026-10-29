import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { TournamentRows } from '@/components/profile/ProfileSections';
import { SportChips } from '@/components/profile/SportChips';
import { TopBar } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, display, font, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { groupByYear, historySports, historyStrip, recordLine } from '@/lib/profileView';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPlayerTournamentHistory } from '@/store/slices/registrationSlice';

export default function History() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { tournamentHistory, historyLoading, error } = useAppSelector((s) => s.registration);
  const [sport, setSport] = useState<string | null>(null);

  // The slice keeps only the latest response, so a late or unmounted reply can't land twice.
  const load = useCallback(() => { dispatch(fetchPlayerTournamentHistory()); }, [dispatch]);
  useFocusEffect(load);

  const sports = historySports(tournamentHistory);
  const shown = sport ? tournamentHistory.filter((e) => e.tournament?.sport === sport) : tournamentHistory;
  const strip = historyStrip(tournamentHistory);
  const loading = historyLoading && tournamentHistory.length === 0;

  return (
    <SafeAreaView style={s.screen}>
      <TopBar title="Tournaments" onBack={() => goBack(router, '/(tabs)/profile')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {tournamentHistory.length ? (
          <>
            <View style={s.strip}>
              {([['Entered', strip.entered], ['Matches', strip.matches], ['Won', strip.won]] as const).map(([label, n], i) => (
                <View key={label} style={[s.stat, i > 0 && s.statDivider]}>
                  <Text style={display(32)}>{n}</Text>
                  <Text style={s.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
            {sports.length > 1 ? <SportChips sports={sports} value={sport} onChange={setSport} /> : null}
          </>
        ) : null}

        {error && !tournamentHistory.length ? <InlineError what="Couldn't load your tournaments." onRetry={load} /> : null}
        {loading ? (
          <View style={{ gap: 14, padding: space.gutter }}>
            <Skeleton style={{ height: 60 }} />
            <Skeleton style={{ height: 60 }} />
            <Skeleton style={{ height: 60 }} />
          </View>
        ) : null}
        {!loading && !error && !tournamentHistory.length ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Icon name="stadium" size={30} color={colors.text4} /></View>
            <Text style={[display(26), { textAlign: 'center' }]}>No tournaments yet</Text>
            <Text style={s.emptyLine}>Tournaments you enter show up here with your record.</Text>
            <Button variant="secondary" label="Find an event" onPress={() => router.push('/(tabs)/events')} style={{ marginTop: 8, height: 48, paddingHorizontal: 20 }} />
          </View>
        ) : null}

        {groupByYear(shown).map((g) => (
          <View key={g.year} style={s.group}>
            <Text style={s.year}>{g.year}</Text>
            <TournamentRows entries={g.items} extra={recordLine} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  strip: { marginTop: 12, marginHorizontal: space.gutter, flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.surface2 },
  stat: { flex: 1, paddingVertical: 16, gap: 3 },
  statDivider: { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: colors.surface2 },
  statLabel: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  group: { paddingTop: 26, paddingHorizontal: space.gutter },
  year: { fontFamily: font.semibold, fontSize: 13, color: colors.text3, fontVariant: ['tabular-nums'], paddingBottom: 4 },
  empty: { paddingTop: 48, paddingHorizontal: 12, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
});
