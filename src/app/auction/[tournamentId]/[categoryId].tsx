import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '@/components/ui/Bars';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AuctionBoard } from '@/components/tournament/AuctionBoard';
import { AuctionFinished } from '@/components/tournament/AuctionFinished';
import { colors, display, font, space } from '@/constants/theme';
import { getTournamentTeams, type TournamentTeam } from '@/api/tournaments';
import { auctionPill, auctionSubline, myAuctionResult } from '@/lib/auctionWatch';
import { goBack } from '@/lib/nav';
import { useAuctionSocket } from '@/lib/useAuctionSocket';
import { useTournament } from '@/lib/useTournament';

export default function Auction() {
  const { tournamentId, categoryId } = useLocalSearchParams<{ tournamentId: string; categoryId: string }>();
  const router = useRouter();
  const { data, soldLog, preAssigned, totalRevenue, connected, loading } = useAuctionSocket(tournamentId, categoryId);
  const { data: base } = useTournament(tournamentId);
  const entry = base?.mine.find((e) => e.categoryId === categoryId);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const wantTeams = !!entry?.teamId;
  useEffect(() => {
    if (wantTeams) getTournamentTeams(tournamentId).then(setTeams, () => {});
  }, [wantTeams, tournamentId]);

  const live = data && data.auction.status !== 'not_started' ? data : null;
  const finished = live?.auction.status === 'completed';
  const result = live ? myAuctionResult(entry, live, teams, soldLog) : null;
  const onResult = (team: string) => router.push({ pathname: '/tournament/[id]/teams', params: { id: tournamentId, team } });
  const pill = auctionPill(live?.auction ?? null);
  const category = data?.category?.name ?? base?.categories.find((c) => c._id === categoryId)?.name;
  const dot = pill === 'Live' ? colors.accent : finished ? colors.text3 : colors.text2;

  return (
    <SafeAreaView style={s.root}>
      <TopBar
        title={category ? `Auction · ${category}` : 'Auction'}
        sub={live ? (finished ? base?.tournament.name : auctionSubline(live.auction)) : undefined}
        onBack={() => goBack(router)}
        right={live ? (
          <View testID="auction-pill" style={s.pill}>
            <View style={[s.dot, { backgroundColor: dot }]} />
            <Text style={s.pillText}>{pill}</Text>
          </View>
        ) : undefined}
      />
      {live ? (
        <>
          <ScrollView contentContainerStyle={s.scroll}>
            {!connected ? <Text style={s.recon}>Reconnecting. Showing the last update.</Text> : null}
            {finished ? (
              <AuctionFinished data={live} soldLog={soldLog} preAssigned={preAssigned} totalRevenue={totalRevenue} result={result} onResult={onResult} />
            ) : (
              <AuctionBoard data={live} soldLog={soldLog} result={result} onResult={onResult} />
            )}
          </ScrollView>
        </>
      ) : loading && !data ? (
        <View style={s.scroll}>
          <Skeleton style={s.skStrip} />
          <Skeleton style={s.skPhoto} />
          <Skeleton style={s.skCard} />
          <Skeleton style={s.skCard} />
        </View>
      ) : (
        <View style={s.empty}>
          <Icon name="gavel" size={44} color={colors.text4} />
          <Text style={display(28)}>The auction hasn't started</Text>
          <Text style={s.emptyLine}>It starts when the organiser opens bidding. This screen updates live.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: 40 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: font.bold, fontSize: 12, color: colors.text },
  skStrip: { height: 40, marginTop: 8, borderRadius: 14 },
  skPhoto: { width: 104, height: 104, borderRadius: 52, alignSelf: 'center', marginTop: 32 },
  skCard: { height: 150, marginTop: 28, borderRadius: 24 },
  recon: { fontFamily: font.regular, fontSize: 12, color: colors.text3, paddingTop: 8 },
  empty: { padding: 26, paddingTop: 60, gap: 14 },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.text2 },
});
