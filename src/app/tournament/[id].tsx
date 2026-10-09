import { useEffect, useState, type ReactNode } from 'react';
import { View, Text, Pressable, Share } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/lib/nav';
import { Screen } from '@/components/Screen';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTournament } from '@/store/slices/tournamentSlice';
import { fetchTournamentCategories, fetchMyRegistrations, type Category } from '@/store/slices/registrationSlice';
import { fetchTournamentTeams } from '@/store/slices/teamSlice';
import { TournamentHero, FactStrip, EntryClock } from '@/components/tournament/TournamentHero';
import { JumpBar, JUMP_BAR_HEIGHT } from '@/components/tournament/JumpBar';
import { ChampionsBlock, type Champion } from '@/components/tournament/ChampionsBlock';
import { CategoryCard } from '@/components/tournament/CategoryCard';
import { TeamsGrid } from '@/components/tournament/TeamsGrid';
import { AboutSection, AwardsList } from '@/components/tournament/AboutSection';
import { YourTeam } from '@/components/tournament/YourTeam';
import { LiveNowBanner } from '@/components/tournament/LiveNowBanner';
import { GroupHeading } from '@/components/explore/Browse';
import { Skeleton, ErrorBlock, EmptyState } from '@/components/states';
import { Icon } from '@/components/icons';
import { formatShortDate } from '@/lib/format';
import { dayOfEvent } from '@/lib/eventsView';
import { tournamentSports } from '@/lib/sports';
import { detailPhase, entryFrom, feeLabel } from '@/lib/tournamentDetail';
import { useCategoryExtras } from '@/lib/useCategoryExtras';
import { useTheme } from '@/lib/theme';

interface Section {
  key: string;
  /** The jump bar chip. */
  label: string;
  /** The section's own heading; omitted when the section draws its own. */
  heading?: string;
  count?: number;
  node: ReactNode;
}

/**
 * One page instead of five tabs, ordered by the tournament's stage: the result
 * leads once it is over, entry while it is open, play (your team, the draw)
 * the rest of the time. A sticky jump bar scrolls to each section.
 */
export default function TournamentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { currentTournament: tournament, isLoading, error } = useAppSelector((s) => s.tournament);
  const { categories, myRegistrations, isLoading: isRegLoading } = useAppSelector((s) => s.registration);
  const { teams } = useAppSelector((s) => s.team);
  const { user } = useAppSelector((s) => s.auth);
  const { finals, auctions } = useCategoryExtras(id, categories);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  // Each section's top within the scroll content, by section index.
  // ponytail: a section that disappears can leave a stale trailing offset;
  // the active index is clamped to the live section count where it is read.
  const offsets = useSharedValue<number[]>([]);
  const [active, setActive] = useState(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  useAnimatedReaction(
    () => {
      const y = scrollY.value + JUMP_BAR_HEIGHT + 12;
      let a = 0;
      for (let i = 0; i < offsets.value.length; i++) {
        const top = offsets.value[i];
        if (top !== undefined && y >= top) a = i;
      }
      return a;
    },
    (a, prev) => {
      if (prev !== null && a !== prev) runOnJS(setActive)(a);
    },
  );

  const load = () => {
    if (!id) return;
    dispatch(fetchTournament(id));
    dispatch(fetchTournamentCategories(id));
    dispatch(fetchTournamentTeams(id));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  useEffect(() => {
    if (user) dispatch(fetchMyRegistrations());
  }, [dispatch, user]);

  // First load with nothing cached. The hero geometry is held by skeletons so
  // nothing jumps when the name arrives.
  if (!tournament && isLoading) {
    return (
      <Screen>
        <Skeleton h={196} style={{ borderRadius: 0, borderWidth: 0 }} />
        <View style={{ padding: 16, gap: 10 }}>
          <Skeleton h={34} w={220} line />
          <Skeleton h={58} />
          <Skeleton h={110} />
        </View>
      </Screen>
    );
  }

  // No tournament at all — nothing to keep on screen, so this is the one place
  // a full-screen failure is honest.
  if (!tournament || !id) {
    return (
      <Screen>
        <View style={{ padding: 16, paddingTop: 60 }}>
          <ErrorBlock
            label="Tournament unavailable"
            message={error || 'This tournament could not be loaded. It may have been removed.'}
            onRetry={load}
          />
        </View>
      </Screen>
    );
  }

  const phase = detailPhase(tournament.status);
  const awards = tournament.awards ?? [];
  const registeredIn = (categoryId: string) => myRegistrations.some((r) => r.categoryId === categoryId);
  const entering = (cat: Category) => tournament.status === 'registration_open' && cat.status === 'registration';
  const openCategory = (cat: Category) => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    router.push({ pathname: '/category/[categoryId]', params: { categoryId: cat._id, tournamentId: id } });
  };
  const openAnnouncements = () => router.push({ pathname: '/tournament/[id]/announcements', params: { id } });

  const myAssignment = user
    ? myRegistrations.find((r) => r.tournamentId === id && (r.status === 'auctioned' || r.status === 'assigned') && r.teamId)
    : undefined;
  const myTeam = myAssignment ? teams.find((t) => t._id === myAssignment.teamId) : undefined;

  const champions: Champion[] = categories
    .filter((c) => finals[c._id])
    .map((c) => ({ categoryId: c._id, categoryName: c.name, result: finals[c._id] }));
  const championIds = new Set(champions.filter((c) => c.result.competitorType === 'team').map((c) => c.result.winner.id));
  // The sticky button offers the first category you can still enter.
  const nextEntry = phase === 'entry' ? categories.find((c) => entering(c) && !registeredIn(c._id)) : undefined;

  const stageCell =
    phase === 'result'
      ? { label: 'Awards', value: String(awards.length) }
      : phase === 'entry'
        ? { label: 'Entry', value: entryFrom(categories) ?? '—' }
        : tournament.status === 'ongoing'
          ? (() => {
            const { day, total } = dayOfEvent(tournament);
            return { label: 'Day', value: `${day}/${total}`, accent: true };
          })()
          : { label: 'Starts', value: formatShortDate(tournament.startDate) };

  const sections: Section[] = [];
  if (phase === 'result' && (champions.length > 0 || awards.length > 0)) {
    sections.push({
      key: 'result',
      label: 'Result',
      node: (
        <>
          {champions.length > 0 ? <GroupHeading label={champions.length > 1 ? 'Champions' : 'Champion'} /> : null}
          <ChampionsBlock champions={champions} />
          {awards.length > 0 ? <GroupHeading label="Awards" count={awards.length} /> : null}
          {awards.length > 0 ? <AwardsList awards={awards} /> : null}
        </>
      ),
    });
  }
  if (myTeam) {
    sections.push({ key: 'you', label: 'You', heading: 'Your team', node: <YourTeam team={myTeam} assignment={myAssignment} /> });
  }
  sections.push({
    key: 'categories',
    label: phase === 'entry' ? 'Enter' : 'Categories',
    heading: phase === 'entry' ? 'Pick a category' : 'Categories',
    count: categories.length,
    node:
      isRegLoading && categories.length === 0 ? (
        <View style={{ gap: 9 }}>
          <Skeleton h={92} />
          <Skeleton h={92} />
        </View>
      ) : categories.length === 0 ? (
        <EmptyState
          icon="tag"
          title="No categories yet"
          message="The organiser has not announced categories for this tournament. Entry opens once they do."
        />
      ) : (
        <View>
          {categories.map((cat) => (
            <CategoryCard
              key={cat._id}
              category={cat}
              tournamentId={id}
              auction={auctions[cat._id]}
              sport={tournament.sport}
              entering={entering(cat)}
              entered={registeredIn(cat._id)}
              onOpen={() => openCategory(cat)}
            />
          ))}
        </View>
      ),
  });
  if (teams.length > 0) {
    sections.push({
      key: 'teams',
      label: 'Teams',
      heading: 'Teams',
      count: teams.length,
      node: <TeamsGrid teams={teams} myTeamId={myTeam?._id} championIds={championIds} />,
    });
  }
  sections.push({
    key: 'about',
    label: 'About',
    heading: 'About',
    node: (
      <>
        <AboutSection tournament={tournament} onAnnouncements={openAnnouncements} />
        {phase !== 'result' && awards.length > 0 ? (
          <>
            <GroupHeading label="Awards" count={awards.length} />
            <AwardsList awards={awards} />
          </>
        ) : null}
      </>
    ),
  });

  const jump = (i: number) => {
    setActive(i);
    const top = offsets.value[i];
    if (top !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, top - JUMP_BAR_HEIGHT), animated: true });
  };

  const share = () =>
    Share.share({ message: `${tournament.name} on Kria — ${tournament.venue?.city || ''}`.trim() });

  return (
    <Screen>
      <Animated.ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: nextEntry ? 110 + insets.bottom : 32 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Hero, stage strip and live banner are one child so the jump bar stays at index 1. */}
        <View style={{ paddingBottom: 16 }}>
          <TournamentHero
            tournament={tournament}
            scrollY={scrollY}
            onBack={() => goBack(router)}
            onShare={share}
            onAnnouncements={openAnnouncements}
          />
          {phase === 'entry' ? <EntryClock tournament={tournament} /> : null}
          <FactStrip
            cells={[
              { label: 'Teams', value: String(teams.length || tournament.teamsCount || 0) },
              { label: 'Players', value: String(tournament.registeredPlayersCount ?? 0) },
              { label: 'Categories', value: String(categories.length) },
              stageCell,
            ]}
          />
          <View style={{ marginTop: 6 }}>
            <LiveNowBanner tournamentId={id} sports={tournamentSports(tournament)} />
          </View>
        </View>

        <JumpBar sections={sections} active={Math.min(active, sections.length - 1)} onJump={jump} onBack={() => goBack(router)} scrollY={scrollY} />

        {sections.map((s, i) => (
          <View
            key={s.key}
            onLayout={(e) => {
              const next = offsets.value.slice();
              next[i] = e.nativeEvent.layout.y;
              offsets.value = next;
            }}
            style={{ paddingHorizontal: 16 }}
          >
            {s.heading ? <GroupHeading label={s.heading} count={s.count} /> : null}
            {s.node}
          </View>
        ))}
      </Animated.ScrollView>

      {nextEntry ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 12 + insets.bottom,
            backgroundColor: theme.bg,
            borderTopWidth: 1.5,
            borderTopColor: theme.lineSoft,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Enter ${nextEntry.name}, ${feeLabel(nextEntry)}`}
            onPress={() => openCategory(nextEntry)}
            style={{ minHeight: 52, borderRadius: 5, backgroundColor: theme.brand, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}
          >
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, lineHeight: 22, color: theme.onBrand }}>Enter</Text>
            <Text
              numberOfLines={1}
              style={{ flex: 1, textAlign: 'right', fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.08 * 10, textTransform: 'uppercase', color: theme.onBrand }}
            >
              {`${nextEntry.name} · ${feeLabel(nextEntry)}`}
            </Text>
            <Icon name="arrow-right" size={16} color={theme.onBrand} strokeWidth={2.4} />
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}
