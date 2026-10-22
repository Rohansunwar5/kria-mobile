import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { goBack } from '@/lib/nav';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';
import { Skeleton, ErrorBlock, EmptyState, StaleBanner } from '@/components/states';
import { getTeamBrands, type TeamBrand } from '@/api/cricketMatch';
import { useCricketMatchSocket } from '@/lib/useCricketMatchSocket';
import { Chip } from '@/components/canvas';
import { HeroScore } from '@/components/cricket/HeroScore';
import { AtTheCrease } from '@/components/cricket/AtTheCrease';
import { RecentOvers } from '@/components/cricket/RecentOvers';
import { ScorecardTabs } from '@/components/cricket/ScorecardTabs';
import {
  TossLine,
  MatchStateBanner,
  PartnershipCard,
  RunRatePanel,
  Innings1Panel,
  OversTimeline,
  Lineups,
} from '@/components/cricket/LivePanels';
import { ManhattanChart, WormChart, RunDistribution } from '@/components/cricket/CricketCharts';
import { MatchSummaryPanel } from '@/components/cricket/MatchSummaryPanel';

export function Header({ title, sub, live }: { title: string; sub?: string; live?: boolean }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => goBack(router)}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={19} color="#fff" strokeWidth={2.3} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 20, color: '#fff' }}>
          {title}
        </Text>
        {sub ? (
          <Text numberOfLines={1} style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      {live ? <Tag label="Live" variant="live" dot /> : null}
    </View>
  );
}

type CricketSection = 'live' | 'card' | 'charts' | 'squads' | 'summary';

export function CricketView({ matchId }: { matchId: string }) {
  const { match, live, scorecard, loading, error, reload } = useCricketMatchSocket(matchId);
  const [refreshing, setRefreshing] = useState(false);
  const [brands, setBrands] = useState<Record<string, TeamBrand>>({});
  const [section, setSection] = useState<CricketSection | null>(null);

  // Team colours, so squad squares and the hero band carry the right kit.
  // Non-critical — an empty map just means the neutral treatment.
  const tournamentId = match?.tournamentId ? String(match.tournamentId) : '';
  useEffect(() => {
    if (!tournamentId) return;
    let active = true;
    getTeamBrands(tournamentId).then((b) => { if (active) setBrands(b); });
    return () => { active = false; };
  }, [tournamentId]);

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
  const inningsCard = (currentInnings === 1 ? scorecard?.innings1 : scorecard?.innings2) ?? null;
  const maxOvers = match.matchConfig?.maxOvers;
  const hasCard = !!(scorecard?.innings1 || scorecard?.innings2);
  const hasSquads = !!(match.cricketSetup?.team1Lineup?.lineupSet || match.cricketSetup?.team2Lineup?.lineupSet);

  // There is a lot of data here. Sections keep each screenful legible instead
  // of one endless scroll; a finished match opens on its summary.
  const sections: { key: CricketSection; label: string }[] = [
    ...(completed ? [{ key: 'summary' as const, label: 'Summary' }] : []),
    ...(!completed ? [{ key: 'live' as const, label: 'Live' }] : []),
    ...(hasCard ? [{ key: 'card' as const, label: 'Scorecard' }] : []),
    ...(hasCard ? [{ key: 'charts' as const, label: 'Charts' }] : []),
    ...(hasSquads ? [{ key: 'squads' as const, label: 'Squads' }] : []),
  ];
  const active = section && sections.some((s) => s.key === section) ? section : sections[0]?.key;

  const round = [match.bracketRound, match.matchNumber ? `Match ${match.matchNumber}` : null, maxOvers ? `${maxOvers} ov` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Header
        title={`${match.teams?.team1Name || 'TBD'} v ${match.teams?.team2Name || 'TBD'}`}
        sub={round || undefined}
        live={!completed && !!live}
      />
      <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}>
        <TossLine match={match} />
        <HeroScore match={match} live={live} innings={inningsCard} completed={completed} brands={brands} />
        <MatchStateBanner live={live} />

        {sections.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {sections.map((s) => (
              <Chip key={s.key} label={s.label} selected={active === s.key} onPress={() => setSection(s.key)} />
            ))}
          </ScrollView>
        ) : null}

        {!live && !completed ? (
          <EmptyState
            icon="cricket-bat"
            title="Not started"
            message="The scoreboard goes live once the first ball is bowled."
          />
        ) : null}

        {active === 'live' ? (
          <>
            <AtTheCrease live={live} innings={inningsCard} />
            <PartnershipCard partnership={inningsCard?.currentPartnership ?? null} />
            <RunRatePanel live={live} maxOvers={maxOvers} />
            <Innings1Panel innings1={scorecard?.innings1 ?? null} live={live} />
            <RecentOvers innings={inningsCard} matchId={matchId} />
            <OversTimeline innings={inningsCard} />
          </>
        ) : null}

        {active === 'card' ? (
          <ScorecardTabs
            innings1={scorecard?.innings1 ?? null}
            innings2={scorecard?.innings2 ?? null}
            currentInnings={currentInnings}
            live={live}
          />
        ) : null}

        {active === 'charts' ? (
          <>
            <ManhattanChart innings={inningsCard ?? scorecard?.innings1 ?? null} maxOvers={maxOvers} />
            <WormChart innings1={scorecard?.innings1 ?? null} innings2={scorecard?.innings2 ?? null} maxOvers={maxOvers} />
            <RunDistribution innings={inningsCard ?? scorecard?.innings1 ?? null} />
          </>
        ) : null}

        {active === 'squads' ? <Lineups match={match} currentInnings={inningsCard} /> : null}

        {active === 'summary' ? <MatchSummaryPanel match={match} scorecard={scorecard} brands={brands} /> : null}
      </ScrollView>
    </>
  );
}
