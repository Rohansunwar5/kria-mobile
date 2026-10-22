import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useScrollToTop } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { listMyQuickKnockouts, type QuickKnockout } from '@/api/quickKnockout';
import { listMyQuickMatches, type QuickMatch } from '@/api/quickMatch';
import { getTopPlayers, type RankedPlayer } from '@/api/rankings';
import { latestTournaments } from '@/api/tournaments';
import { EventCard } from '@/components/EventCard';
import { MatchCard } from '@/components/MatchCard';
import { LiveNowRow } from '@/components/home/LiveNowRow';
import { Milestone } from '@/components/home/Milestone';
import { Checklist, RankTrack, StartHeadline } from '@/components/home/NewPlayer';
import { RankHero } from '@/components/home/RankHero';
import { TAB_BAR_SPACE } from '@/components/navigation/TabBar';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { ResultBadge } from '@/components/ui/Pills';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, font, space } from '@/constants/theme';
import { inProgress } from '@/lib/homePortal';
import {
  checklist, greeting, nextMilestone, railTournaments, RANK_MIN, resultLetter, sportName, sportsByRecency, todayLabel, upNext,
} from '@/lib/homeView';
import { RANKED_SPORTS } from '@/lib/sports';
import { useCareer } from '@/lib/useCareer';
import { useAppSelector } from '@/store/hooks';
import type { Tournament } from '@/store/slices/tournamentSlice';

const logo = require('../../../assets/images/logo.png');

/** Mocks 1a (established) and 4a (new player). DESIGN §6 Home. */
export default function Home() {
  const user = useAppSelector((s) => s.auth.user);
  const meId = user?._id ?? '';
  const insets = useSafeAreaInsets();
  const career = useCareer(user?._id);
  const [matches, setMatches] = useState<QuickMatch[]>([]);
  const [knockouts, setKnockouts] = useState<QuickKnockout[]>([]);
  const [events, setEvents] = useState<{ list: Tournament[]; near: boolean } | null>(null);
  const [boards, setBoards] = useState<Record<string, RankedPlayer[] | null>>({});
  const scroll = useRef<ScrollView>(null);
  useScrollToTop(scroll);

  const city = user?.location?.trim();
  const load = useCallback(async () => {
    const [mine, kos, near] = await Promise.all([
      listMyQuickMatches({ liveKnockout: true }).catch(() => null),
      listMyQuickKnockouts().catch(() => null),
      latestTournaments(10, city ? { city } : {}).catch(() => null),
    ]);
    // Each list fails alone and keeps its last good value.
    if (mine) setMatches(mine);
    if (kos) setKnockouts(kos);
    let list = near && railTournaments(near);
    let isNear = !!city;
    if (city && list && !list.length) {
      // Nothing in their city: show what's on elsewhere rather than an empty rail.
      const all = await latestTournaments(10).catch(() => null);
      list = all && railTournaments(all);
      isNear = false;
    }
    if (list) setEvents({ list, near: isNear });
  }, [city]);

  // The career hook loads on mount; later focuses (back from a match) refresh it.
  const seen = useRef(false);
  const reloadCareer = career.reload;
  useFocusEffect(
    useCallback(() => {
      load();
      if (seen.current) reloadCareer();
      seen.current = true;
    }, [load, reloadCareer]),
  );

  const recent = career.recent ?? [];
  const played = useMemo(() => sportsByRecency(career.profile?.sports ?? [], career.recent ?? []), [career.profile, career.recent]);
  const rankable = played.filter((s) => s.decided >= RANK_MIN && RANKED_SPORTS.includes(s.sport)).map((s) => s.sport).join();
  useEffect(() => {
    for (const sport of rankable ? rankable.split(',') : []) {
      getTopPlayers(sport, 50).then(
        (board) => setBoards((b) => ({ ...b, [sport]: board })),
        () => setBoards((b) => ({ ...b, [sport]: null })),
      );
    }
  }, [rankable]);

  const now = new Date();
  const isNew = !!career.profile && played.length === 0;
  const next = inProgress(matches, knockouts)[0];
  const milestone = career.profile ? nextMilestone(career.profile.achievements) : null;
  const list = user ? checklist(user) : null;

  const join = <Button key="join" variant={isNew ? 'primary' : 'secondary'} icon="pin" label="Join with code" onPress={() => router.push({ pathname: '/(tabs)/compete', params: { seg: 'matches' } })} style={{ flex: isNew ? 1.3 : 1 }} />;
  const host = <Button key="host" variant={isNew ? 'secondary' : 'primary'} icon="add" label="Host a match" onPress={() => router.push('/quick/new')} style={{ flex: isNew ? 1 : 1.3 }} />;

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom }}>
        <View style={s.header}>
          <Image source={logo} resizeMode="contain" style={s.logo} accessibilityLabel="Kria" />
          <View style={{ gap: 1 }}>
            <Text style={s.date}>{todayLabel(now)}</Text>
            <Text style={s.hello}>{greeting(now, user?.firstName ?? 'there', isNew)}</Text>
          </View>
        </View>

        {career.error && !career.profile ? <InlineError what="Couldn't load your record." onRetry={career.reload} /> : null}

        {isNew ? (
          <StartHeadline />
        ) : played.length ? (
          <RankHero sports={played} boards={boards} meId={meId} recent={recent} />
        ) : career.loading ? (
          <View style={s.heroSkeleton}>
            <Skeleton style={{ width: 120, height: 40, alignSelf: 'flex-end', borderRadius: 12 }} />
            <Skeleton style={{ height: 110, borderRadius: 12 }} />
            <Skeleton style={{ height: 48, borderRadius: 8 }} />
          </View>
        ) : null}

        <View style={[s.actions, { paddingTop: isNew ? 24 : 20 }]}>{isNew ? [host, join] : [join, host]}</View>

        <LiveNowRow />

        {next ? (
          <Section title="Up next">
            <MatchCard v={upNext(next, meId)} />
          </Section>
        ) : null}

        {isNew && list ? (
          <>
            {/* Only for a sport the server can rank (SERVER-GAPS.md #3). */}
            {!user?.sport || RANKED_SPORTS.includes(user.sport) ? (
              <View style={s.section}>
                <RankTrack sport={user?.sport} decided={0} />
              </View>
            ) : null}
            <View style={s.section}>
              <Checklist {...list} />
            </View>
          </>
        ) : null}

        {events?.list.length ? (
          <View style={[s.section, { paddingHorizontal: 0, gap: space.headerToContent }]}>
            <View style={{ paddingHorizontal: space.gutter }}>
              <SectionHeader title={events.near ? 'Tournaments near you' : 'Tournaments'} link="All events" onLink={() => router.push('/(tabs)/events')} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={312} decelerationRate="fast" contentContainerStyle={s.rail}>
              {events.list.map((t) => <EventCard key={t._id} t={t} />)}
            </ScrollView>
          </View>
        ) : null}

        {!isNew && milestone ? (
          <Section title="Next milestone" link="Awards" onLink={() => router.push('/(tabs)/awards')}>
            <Milestone m={milestone} />
          </Section>
        ) : null}

        {!isNew && recent.length ? (
          <View style={[s.section, { gap: 4 }]}>
            <View style={{ paddingBottom: 10 }}>
              <SectionHeader title="Recent" link="All matches" onLink={() => router.push(`/matches/${meId}`)} />
            </View>
            {recent.slice(0, 3).map((r) => (
              <View key={r._id} style={s.recent}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={s.recentTitle} numberOfLines={1}>{r.title ?? `${sportName(r.sport)} match`}</Text>
                  <Text style={s.recentScore} numberOfLines={1}>{r.scoreline ?? 'Walkover'}</Text>
                </View>
                <ResultBadge result={resultLetter(r.result)} />
              </View>
            ))}
          </View>
        ) : null}
        {!isNew && career.recentError && !recent.length ? <InlineError what="Couldn't load recent matches." onRetry={career.reload} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, link, onLink, children }: {
  title: string;
  link?: string;
  onLink?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <SectionHeader title={title} link={link} onLink={onLink} />
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, paddingHorizontal: space.gutter },
  logo: { width: 40, height: 35 },
  date: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  hello: { fontFamily: font.semibold, fontSize: 16, color: colors.text },
  heroSkeleton: { paddingTop: 22, paddingHorizontal: space.gutter, gap: 12 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: space.gutter },
  section: { paddingTop: space.sectionGap, paddingHorizontal: space.gutter, gap: space.headerToContent },
  rail: { paddingHorizontal: space.gutter, gap: 12 },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  recentTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  recentScore: { fontFamily: font.regular, fontSize: 13, color: colors.text2, fontVariant: ['tabular-nums'] },
});
