import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecentMatches, type RecentMatch } from '@/api/career';
import { getPublicPlayer, type PublicHistoryEntry, type PublicPlayer } from '@/api/profileApi';
import { listMyQuickKnockouts, type QuickKnockout } from '@/api/quickKnockout';
import { Analytics, Identity, StatStrip, TournamentRows, useBoards } from '@/components/profile/ProfileSections';
import { TopBar } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, display, font, space } from '@/constants/theme';
import { buildAwards } from '@/lib/awardsView';
import { goBack } from '@/lib/nav';
import { allSports, bestRank } from '@/lib/profileView';
import { useCareer } from '@/lib/useCareer';
import { useAppSelector } from '@/store/hooks';

/** Another player's profile: your own Profile's sections without the parts that are only yours. */
export default function PlayerProfile() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const meId = useAppSelector((s) => s.auth.user?._id);
  const mine = !!playerId && playerId === meId;
  const id = mine ? undefined : playerId;
  const career = useCareer(id);
  const [data, setData] = useState<{ player: PublicPlayer; history: PublicHistoryEntry[] } | null | undefined>(undefined);
  const [knockouts, setKnockouts] = useState<QuickKnockout[]>([]);
  const [recent, setRecent] = useState<RecentMatch[] | null>(null);

  useEffect(() => {
    if (mine) router.replace('/(tabs)/profile');
  }, [mine]);

  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setData(undefined); setAttempt((n) => n + 1); }, []);

  useEffect(() => {
    if (!id) return;
    let live = true;
    getPublicPlayer(id).then((d) => { if (live) setData(d); });
    // Yours: a knockout win groups by sport only when your own /mine lists that knockout.
    listMyQuickKnockouts().then((k) => { if (live) setKnockouts(k); }, () => undefined);
    getRecentMatches(id, 50).then((r) => { if (live) setRecent(r); }, () => { if (live) setRecent([]); });
    return () => { live = false; };
  }, [id, attempt]);

  const played = useMemo(() => [...(career.profile?.sports ?? [])].filter((s) => s.played > 0).sort((a, b) => b.played - a.played), [career.profile]);
  const boards = useBoards(played);
  const totals = allSports(played);
  // Milestones stay off this screen: Analytics already shows that record.
  const awards = data ? buildAwards({ titles: data.player.titles ?? [], honors: data.player.honors ?? [], achievements: [], knockouts, totals: { played: totals.played, won: totals.won, sports: played.length } }) : null;

  if (mine) return <View style={s.screen} />;
  const back = () => goBack(router);

  if (data === null) {
    return (
      <SafeAreaView style={s.screen}>
        <TopBar title="" onBack={back} />
        <View style={s.empty}>
          <View style={s.emptyIcon}><Icon name="block" size={30} color={colors.text4} /></View>
          <Text style={[display(26), { textAlign: 'center' }]}>Player not found</Text>
          <Text style={s.emptyLine}>{"This profile isn't available."}</Text>
          <Button variant="secondary" label="Try again" onPress={retry} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          <Button variant="secondary" label="Back" onPress={back} style={{ alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <TopBar title="" onBack={back} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {data ? (
          <Identity firstName={data.player.firstName} lastName={data.player.lastName} image={data.player.profileImage} best={bestRank(played, boards, data.player._id)} awards={awards} />
        ) : (
          <View style={s.idSkeleton}>
            <Skeleton style={{ width: 128, height: 128, borderRadius: 64 }} />
            <View style={{ flex: 1, gap: 12 }}>
              <Skeleton style={{ width: '80%', height: 36 }} />
              <Skeleton style={{ width: '45%', height: 24 }} />
            </View>
          </View>
        )}

        {career.error && !career.profile ? <InlineError what="Couldn't load their record." onRetry={career.reload} /> : null}

        {data && career.profile ? <StatStrip played={totals.played} won={totals.won} tournaments={data.history.length} /> : null}

        {!career.profile && career.loading ? (
          <View style={[s.section, { gap: 14 }]}>
            <Skeleton style={{ width: '35%', height: 18 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} style={{ width: 80, height: 80, borderRadius: 40 }} />)}</View>
          </View>
        ) : null}

        {played.length && id ? (
          <Analytics
            played={played}
            bestSport={career.profile?.bestSport?.sport}
            playerId={id}
            who="they"
            boards={boards}
            recent={recent}
            onAll={() => router.push({ pathname: '/matches/[playerId]', params: { playerId: id, name: data ? [data.player.firstName, data.player.lastName].filter(Boolean).join(' ') : '' } })}
          />
        ) : career.profile ? (
          <View style={[s.section, { gap: 18 }]}>
            <SectionHeader title="Analytics" />
            <Text style={s.body}>No matches on record yet.</Text>
          </View>
        ) : null}

        {data?.history.length ? (
          <View style={s.section}>
            <SectionHeader title="Tournaments" />
            <View style={{ marginTop: 6 }}>
              <TournamentRows entries={data.history} />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  idSkeleton: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: space.gutter },
  section: { paddingTop: space.sectionGap, paddingHorizontal: space.gutter },
  body: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.text3 },
  empty: { paddingTop: 48, paddingHorizontal: space.gutter, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
});
