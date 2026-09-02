import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';
import { Skeleton, ErrorBlock, EmptyState, StaleBanner } from '@/components/states';
import { resolveMatchSport } from '@/api/cricketMatch';
import { useCricketMatchSocket } from '@/lib/useCricketMatchSocket';
import { useBadmintonMatchSocket } from '@/lib/useBadmintonMatchSocket';
import { HeroScore } from '@/components/cricket/HeroScore';
import { AtTheCrease } from '@/components/cricket/AtTheCrease';
import { RecentOvers } from '@/components/cricket/RecentOvers';
import { ScorecardTabs } from '@/components/cricket/ScorecardTabs';
import { BadmintonScoreboard } from '@/components/badminton/BadmintonScoreboard';
import { GamesTable } from '@/components/badminton/GamesTable';
import { RallyLog } from '@/components/badminton/RallyLog';
import { currentGame } from '@/lib/badmintonLive';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

function Header({ title, sub, live }: { title: string; sub?: string; live?: boolean }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={19} color="#fff" strokeWidth={2.3} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 15, color: '#fff' }}>
          {title}
        </Text>
        {sub ? (
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      {live ? <Tag label="Live" variant="live" dot /> : null}
    </View>
  );
}

function BadmintonView({ matchId }: { matchId: string }) {
  const { match, log, loading, error, connected, lastUpdate, reload } = useBadmintonMatchSocket(matchId);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Only ticks while a rally log exists, so an idle scoreboard costs nothing.
  useEffect(() => {
    if (log.length === 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [log.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  if (loading && !match) {
    return (
      <>
        <Header title="Live" />
        <View style={{ gap: 0 }}>
          <Skeleton h={66} style={{ borderRadius: 0, borderWidth: 0 }} />
          <Skeleton h={66} style={{ borderRadius: 0, borderWidth: 0 }} />
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton h={10} w={60} line />
          <Skeleton h={90} />
        </View>
      </>
    );
  }

  if (error || !match) {
    return (
      <>
        <Header title="Live" />
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />} contentContainerStyle={{ padding: 16 }}>
          <ErrorBlock
            label="Scoreboard unavailable"
            message="This match could not be loaded. Pull to retry."
            onRetry={reload}
          />
        </ScrollView>
      </>
    );
  }

  const isLive = match.status === 'in_progress';
  // Whoever won the last rally serves. Unknown until a point arrives.
  const serving = log.length ? log[0].side : null;
  const court = match.schedule?.court ? `Court ${match.schedule.court}` : undefined;

  return (
    <>
      <Header title={match.bracketRound} sub={court} live={isLive} />
      {isLive && !connected ? <StaleBanner secondsAgo={Math.round((now - lastUpdate) / 1000)} /> : null}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
        contentContainerStyle={{ paddingBottom: 24 }}
        style={isLive && !connected ? { opacity: 0.5 } : undefined}
      >
        <BadmintonScoreboard match={match} serving={serving} />

        {currentGame(match) ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 16 }}>
            <View>
              <Text style={{ ...LBL, marginBottom: 8 }}>Games</Text>
              <GamesTable match={match} />
            </View>
            <RallyLog match={match} log={log} now={now} />
          </View>
        ) : (
          <EmptyState
            icon="shuttlecock"
            title="Not on court yet"
            message="The scoreboard goes live the moment the umpire starts scoring this match."
          />
        )}
      </ScrollView>
    </>
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
    return (
      <>
        <Header title="Live" />
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton h={150} />
          <Skeleton h={90} />
          <Skeleton h={120} />
        </View>
      </>
    );
  }
  if (error || !match) {
    return (
      <>
        <Header title="Live" />
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16 }}>
          <ErrorBlock label="Scoreboard unavailable" message="This match could not be loaded. Pull to retry." onRetry={reload} />
        </ScrollView>
      </>
    );
  }

  const completed = live?.matchStatus === 'completed' || match.status === 'completed';
  const currentInnings = (live?.currentInnings ?? 1) as 1 | 2;

  return (
    <>
      <Header
        title={`${match.teams?.team1Name || 'TBD'} v ${match.teams?.team2Name || 'TBD'}`}
        live={!completed}
      />
      <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16, gap: 12 }}>
        <HeroScore match={match} live={live} completed={completed} />
        {!live && !completed ? (
          <EmptyState
            icon="cricket-bat"
            title="Not started"
            message="The scoreboard goes live once the first ball is bowled."
          />
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
    </>
  );
}

export default function LiveScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [sport, setSport] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [resolveErr, setResolveErr] = useState(false);
  const reqId = useRef(0);

  const resolve = useCallback(async () => {
    if (!matchId) return;
    const myReq = ++reqId.current;
    setResolving(true);
    setResolveErr(false);
    try {
      const s = await resolveMatchSport(matchId);
      if (reqId.current === myReq) setSport(s);
    } catch {
      if (reqId.current === myReq) setResolveErr(true);
    } finally {
      if (reqId.current === myReq) setResolving(false);
    }
  }, [matchId]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  if (!matchId) return <Screen><Header title="Live" /></Screen>;

  if (resolving) {
    return (
      <Screen>
        <Header title="Live" />
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton h={150} />
          <Skeleton h={90} />
        </View>
      </Screen>
    );
  }

  if (resolveErr) {
    return (
      <Screen>
        <Header title="Live" />
        <View style={{ padding: 16 }}>
          <ErrorBlock label="Match unavailable" message="We could not work out which match this is." onRetry={resolve} />
        </View>
      </Screen>
    );
  }

  // Badminton and cricket are the two sports with live scoring implemented
  // end to end. Anything else has no scoreboard to show.
  if (sport === 'badminton') return <Screen><BadmintonView matchId={matchId} /></Screen>;
  if (sport === 'cricket') return <Screen><CricketView matchId={matchId} /></Screen>;

  return (
    <Screen>
      <Header title="Live" />
      <EmptyState
        icon="alert"
        title="No live scoring"
        message={`Live scoring is not available for ${sport || 'this sport'} yet. Check the draw for results once the match is done.`}
      />
    </Screen>
  );
}
