import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { resolveMatchSport } from '@/api/cricketMatch';
import { useCricketMatchSocket } from '@/lib/useCricketMatchSocket';
import { HeroScore } from '@/components/cricket/HeroScore';
import { AtTheCrease } from '@/components/cricket/AtTheCrease';
import { RecentOvers } from '@/components/cricket/RecentOvers';
import { ScorecardTabs } from '@/components/cricket/ScorecardTabs';
import { CricketError, NotStarted, UnsupportedSport } from '@/components/cricket/CricketStates';

function BackBar() {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-3 border-b border-white/10 px-4 py-3">
      <Pressable onPress={() => router.back()} className="rounded-full bg-white/10 px-3 py-1.5">
        <Text className="font-montserrat text-sm text-white">‹ Back</Text>
      </Pressable>
      <Text className="flex-1 font-oswald text-base font-bold uppercase text-white">Live</Text>
    </View>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#111111' }}>
      <View className="flex-1 bg-ink">{children}</View>
    </SafeAreaView>
  );
}

function CricketView({ matchId }: { matchId: string }) {
  const { match, live, scorecard, loading, error, reload } = useCricketMatchSocket(matchId);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />;

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#F97316" size="large" /></View>;
  }
  if (error || !match) {
    return <ScrollView refreshControl={refresh} contentContainerStyle={{ flexGrow: 1 }}><CricketError /></ScrollView>;
  }

  const completed = live?.matchStatus === 'completed' || match.status === 'completed';
  const currentInnings = (live?.currentInnings ?? 1) as 1 | 2;

  return (
    <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <HeroScore match={match} live={live} completed={completed} />
      {!live && !completed ? (
        <NotStarted />
      ) : (
        <>
          <AtTheCrease live={live} innings={currentInnings === 1 ? scorecard?.innings1 ?? null : scorecard?.innings2 ?? null} />
          <RecentOvers innings={currentInnings === 1 ? scorecard?.innings1 ?? null : scorecard?.innings2 ?? null} />
          <ScorecardTabs
            innings1={scorecard?.innings1 ?? null}
            innings2={scorecard?.innings2 ?? null}
            currentInnings={currentInnings}
            live={live}
          />
        </>
      )}
    </ScrollView>
  );
}

export default function LiveScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [sport, setSport] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [resolveErr, setResolveErr] = useState(false);

  useEffect(() => {
    let active = true;
    if (!matchId) return;
    setResolving(true);
    setResolveErr(false);
    resolveMatchSport(matchId)
      .then((s) => { if (active) { setSport(s); setResolving(false); } })
      .catch(() => { if (active) { setResolveErr(true); setResolving(false); } });
    return () => { active = false; };
  }, [matchId]);

  if (!matchId) return <Frame><BackBar /></Frame>;

  if (resolving) {
    return (
      <Frame>
        <BackBar />
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#F97316" size="large" /></View>
      </Frame>
    );
  }
  if (resolveErr) {
    return <Frame><BackBar /><CricketError /></Frame>;
  }
  if (sport !== 'cricket') {
    return <Frame><BackBar /><UnsupportedSport /></Frame>;
  }
  return <Frame><BackBar /><CricketView matchId={matchId} /></Frame>;
}
