import { useRef, useState } from 'react';
import { Linking, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { setTournamentSaved, type TournamentCategory } from '@/api/tournaments';
import { AnnouncementCard } from '@/components/tournament/AnnouncementCard';
import { CategoryRows } from '@/components/tournament/CategoryRows';
import { Crest } from '@/components/tournament/Crest';
import { FactsGrid } from '@/components/tournament/FactsGrid';
import { Results } from '@/components/tournament/Results';
import { StatusDot } from '@/components/tournament/StatusDot';
import { FooterBar, IconButton } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { liveRound, meFrom, myNextMatch, nextMatchLabel } from '@/lib/tournamentBracket';
import {
  deadlinePassed, directionsUrl, effectiveStage, facts, footerCta, liveAuctionCategory, overviewTabs, statusLine, teamShort,
  type CtaGo, type TabKey,
} from '@/lib/tournamentView';
import { useOverviewExtras, useTournament } from '@/lib/useTournament';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSavedTournaments } from '@/store/slices/authSlice';

const TAB_LABEL: Record<TabKey, string> = { matches: 'Matches', auction: 'Auction', teams: 'Teams' };

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAppSelector((s) => s.auth.user);
  const loggedIn = !!user;
  const dispatch = useAppDispatch();
  const { data, loading, error, reload } = useTournament(id);
  const { teams, announcements, auctions, matches } = useOverviewExtras(id, data?.categories);
  const scroll = useRef<ScrollViewInstance>(null);
  const [categoriesY, setCategoriesY] = useState(0);
  const bannerH = Math.round((width * 9) / 16);

  // Bookmark (SERVER-GAPS #15): flips at once, then settles to the server's list; a failure puts it back.
  const savedList = user?.savedTournaments ?? [];
  const saved = savedList.includes(id);
  const toggleSaved = () => {
    const before = savedList;
    dispatch(setSavedTournaments(saved ? before.filter((x) => x !== id) : [...before, id]));
    setTournamentSaved(id, !saved).then((list) => dispatch(setSavedTournaments(list)), () => dispatch(setSavedTournaments(before)));
  };

  const back = (
    <>
      <View style={[s.back, { top: insets.top + 10 }]}>
        <IconButton icon="arrow_back" label="Back" onPress={() => goBack(nav)} />
      </View>
      {loggedIn ? (
        <View style={[s.back, s.save, { top: insets.top + 10 }]}>
          <IconButton icon="bookmark" filled={saved} label={saved ? 'Remove from saved' : 'Save this event'} onPress={toggleSaved} />
        </View>
      ) : null}
    </>
  );

  if (!data) {
    return (
      <View style={s.root}>
        {loading && !error ? (
          <View style={{ gap: 14 }}>
            <Skeleton style={{ height: bannerH, borderRadius: 0 }} />
            <View style={{ padding: space.gutter, gap: 14 }}>
              <Skeleton style={{ height: 14, width: 180 }} />
              <Skeleton style={{ height: 38, width: '80%' }} />
              <Skeleton style={{ height: 120 }} />
            </View>
          </View>
        ) : (
          <View style={{ paddingTop: insets.top + 60 }}>
            <InlineError what="Couldn't load this tournament." onRetry={reload} />
          </View>
        )}
        {back}
      </View>
    );
  }

  const { tournament: t, categories, mine } = data;
  const now = new Date();
  const allMatches = Object.values(matches).flat();
  const liveCat = liveAuctionCategory(categories, auctions);
  const stage = effectiveStage({
    status: t.status, categories, auctions, liveMatch: allMatches.some((m) => m.status === 'in_progress'), registrationDeadline: t.registrationDeadline, now,
  });
  const status = statusLine(stage, t, {
    auctionCategory: liveCat?.name, auctionPaused: !!liveCat && auctions[liveCat._id] === 'paused', liveRound: liveRound(allMatches),
  });
  const liveRounds = Object.fromEntries(categories.map((c) => [c._id, liveRound(matches[c._id] ?? [])]));

  const auctionCat = liveCat ?? categories.find((c) => auctions[c._id] !== undefined);
  const tabs = overviewTabs(stage, {
    matches: allMatches.length > 0,
    auction: !!auctionCat,
    teams: (t.teamsCount ?? 0) > 0,
  });

  let next: { categoryId: string; label: string } | undefined;
  for (const c of categories) {
    const entries = mine.filter((e) => e.categoryId === c._id && e.status !== 'withdrawn');
    const me = meFrom(entries);
    const m = myNextMatch(matches[c._id] ?? [], me);
    if (m) { next = { categoryId: c._id, label: nextMatchLabel(m) }; break; }
  }
  const cta = footerCta({ stage, categories, mine, loggedIn, auctions, next });

  const openCategory = (categoryId: string) => nav.push({ pathname: '/category/[categoryId]', params: { categoryId, tournamentId: id } });
  const openMatches = (category?: string) => nav.push({ pathname: '/tournament/[id]/matches', params: category ? { id, category } : { id } });
  const openAuction = (categoryId: string) => nav.push({ pathname: '/auction/[tournamentId]/[categoryId]', params: { tournamentId: id, categoryId } });
  const openTeams = (team?: string) => nav.push({ pathname: '/tournament/[id]/teams', params: team ? { id, team } : { id } });
  const openTabs: Record<TabKey, () => void> = {
    matches: () => openMatches(),
    teams: () => openTeams(),
    auction: () => auctionCat && openAuction(auctionCat._id),
  };
  const go = (g: CtaGo) => {
    switch (g.to) {
      case 'login': return nav.push('/(auth)/login');
      case 'category': return openCategory(g.categoryId);
      case 'categories': return scroll.current?.scrollTo({ y: categoriesY, animated: true });
      case 'auction': return openAuction(g.categoryId);
      case 'matches': return openMatches(g.categoryId);
    }
  };

  const addr = [t.venue.name, t.venue.address, t.venue.city].filter(Boolean).join(', ');
  const first = announcements[0];

  return (
    <View style={s.root}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {t.bannerImage ? (
          <Image source={{ uri: t.bannerImage }} resizeMode="cover" accessibilityIgnoresInvertColors style={{ width, height: bannerH }} />
        ) : (
          <View style={{ width, height: bannerH, backgroundColor: colors.surface1 }} />
        )}
        {error ? <InlineError what="Couldn't refresh this tournament." onRetry={reload} /> : null}

        <View style={s.head}>
          <StatusDot text={status.text} tone={status.tone} />
          <Text style={display(38)}>{t.name}</Text>
          {t.organizer ? (
            <View style={s.org}>
              {t.organizer.logo ? (
                <Image source={{ uri: t.organizer.logo }} accessibilityIgnoresInvertColors style={s.orgLogo} />
              ) : null}
              <Text style={s.orgText} numberOfLines={1}>{`Organised by ${t.organizer.name}`}</Text>
              {t.organizer.verified ? <Icon name="verified" variant="f" size={15} color={colors.accentInk} /> : null}
            </View>
          ) : null}
        </View>
        <View style={s.facts}><FactsGrid items={facts(t, categories.length, now)} /></View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabs}>
          <View accessible accessibilityRole="tab" accessibilityState={{ selected: true }} style={[s.tab, s.tabOn]}><Text style={s.tabText}>Overview</Text></View>
          {tabs.map((k) => (
            <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: false }} onPress={openTabs[k]} style={s.tab}>
              <Text style={[s.tabText, { color: colors.navIdle }]}>{TAB_LABEL[k]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {first ? (
          <View style={s.block}>
            <AnnouncementCard a={first} now={now} />
            {announcements.length > 1 ? (
              <Pressable accessibilityRole="link" hitSlop={12} onPress={() => nav.push({ pathname: '/tournament/[id]/announcements', params: { id } })}>
                <Text style={s.link}>All updates</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={s.section} onLayout={(e) => setCategoriesY(e.nativeEvent.layout.y)}>
          <View style={s.sectionHead}><SectionHeader title="Categories" meta={String(categories.length)} /></View>
          <CategoryRows
            categories={categories} auctions={auctions} liveRounds={liveRounds} pastDeadline={deadlinePassed(t.registrationDeadline, now)}
            onOpen={(c: TournamentCategory) => openCategory(c._id)}
          />
        </View>

        {teams.length ? (
          <View style={s.section}>
            <View style={s.sectionHeadGap}>
              <SectionHeader title="Teams" link="Squads" onLink={() => openTeams()} />
            </View>
            <View style={s.crests}>
              {teams.map((tm) => (
                <Tap key={tm._id} accessibilityLabel={tm.name} scale={0.97} style={s.crest} onPress={() => openTeams(tm._id)}>
                  <Crest uri={tm.logo} name={tm.name} size={56} />
                  <Text style={s.crestName} numberOfLines={1}>{teamShort(tm)}</Text>
                </Tap>
              ))}
            </View>
          </View>
        ) : null}

        {stage === 'completed' ? (
          <Results categories={categories} matches={matches} awards={t.awards ?? []} onTable={(c) => openMatches(c._id)} />
        ) : null}

        <View style={[s.section, { gap: 18 }]}>
          <SectionHeader title="About" />
          {t.description ? <Text style={s.about}>{t.description}</Text> : null}
          <View style={s.addr}>
            <Icon name="location_on" size={18} color={colors.text2} />
            <Text style={s.addrText}>{addr}</Text>
            <Pressable accessibilityRole="link" hitSlop={12} onPress={() => Linking.openURL(directionsUrl(t.venue))}>
              <Text style={s.directions}>Directions</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      {back}
      {cta ? (
        <FooterBar>
          <Button label={cta.label} variant={cta.variant} icon={stage === 'completed' ? 'emoji_events' : undefined} onPress={() => go(cta.go)} style={{ flex: 1 }} />
        </FooterBar>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  save: { left: undefined, right: 12 },
  back: { position: 'absolute', left: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  head: { paddingTop: 24, paddingHorizontal: space.gutter, gap: 12 },
  org: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: -2 },
  orgLogo: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface2 },
  orgText: { flexShrink: 1, fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  facts: { marginTop: 28, marginHorizontal: space.gutter, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.surface2 },
  // The tabs grew to the 44px touch target (DESIGN §10) upward; the smaller margin keeps the labels where they were.
  tabsScroll: { marginTop: 20, borderBottomWidth: 1, borderBottomColor: colors.line, flexGrow: 0 },
  tabs: { paddingHorizontal: space.gutter, gap: 20 },
  tab: { minHeight: 44, justifyContent: 'flex-end', paddingBottom: 12 },
  tabOn: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  block: { paddingTop: 28, paddingHorizontal: space.gutter, gap: 12 },
  link: { fontFamily: font.semibold, fontSize: 13, color: colors.text2, alignSelf: 'flex-end' },
  section: { paddingTop: space.sectionGap, paddingHorizontal: space.gutter },
  sectionHead: { paddingBottom: 12 },
  sectionHeadGap: { paddingBottom: space.headerToContent },
  crests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  crest: { width: '23%', alignItems: 'center', gap: 8 },
  crestName: { fontFamily: font.semibold, fontSize: 11, color: colors.text, textAlign: 'center' },
  about: { fontFamily: font.regular, fontSize: 14, lineHeight: 22, color: colors.text2 },
  addr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  addrText: { flex: 1, fontFamily: font.regular, fontSize: 13, color: colors.text2 },
  directions: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },
});
