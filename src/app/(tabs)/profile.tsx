import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { router, useFocusEffect, useScrollToTop } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRecentMatches, type RecentMatch } from '@/api/career';
import { getPublicPlayer, type Title } from '@/api/profileApi';
import { listMyQuickKnockouts, type QuickKnockout } from '@/api/quickKnockout';
import { latestTournaments } from '@/api/tournaments';
import { Checklist } from '@/components/home/NewPlayer';
import { TAB_BAR_SPACE } from '@/components/navigation/TabBar';
import { usePhotoUpload } from '@/components/profile/usePhotoUpload';
import { Analytics, Identity, Stat, StatStrip, TournamentRows, useBoards } from '@/components/profile/ProfileSections';
import { IconButton } from '@/components/ui/Bars';
import { Icon, type IconName } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, font, space } from '@/constants/theme';
import { buildAwards } from '@/lib/awardsView';
import type { Honor } from '@/lib/badges';
import { checklist, RANK_MIN, sportName } from '@/lib/homeView';
import { allSports, bestRank } from '@/lib/profileView';
import { useCareer } from '@/lib/useCareer';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPlayerStats, logout } from '@/store/slices/authSlice';
import { fetchPlayerTournamentHistory } from '@/store/slices/registrationSlice';

/** Profile tab (mocks 1h, 4e; DESIGN §5.8 and §6 Profile). */
export default function Profile() {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { user, playerStats } = useAppSelector((s) => s.auth);
  const { tournamentHistory } = useAppSelector((s) => s.registration);
  const meId = user?._id ?? '';
  const career = useCareer(user?._id);
  const photo = usePhotoUpload();
  const [record, setRecord] = useState<{ titles: Title[]; honors: Honor[] } | null>(null);
  const [knockouts, setKnockouts] = useState<QuickKnockout[]>([]);
  const [recent, setRecent] = useState<RecentMatch[] | null>(null);
  const [openNearby, setOpenNearby] = useState<number | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  useScrollToTop(scroll);

  const seen = useRef(false);
  const reloadCareer = career.reload;
  useFocusEffect(
    useCallback(() => {
      if (!meId) return;
      dispatch(fetchPlayerStats());
      dispatch(fetchPlayerTournamentHistory());
      getPublicPlayer(meId).then((p) => p && setRecord({ titles: p.player.titles ?? [], honors: p.player.honors ?? [] }));
      listMyQuickKnockouts().then(setKnockouts, () => undefined);
      // The newest 50 (the server's cap), split by sport here: its sport filter takes registry sports only.
      getRecentMatches(meId, 50).then(setRecent, () => setRecent((r) => r ?? []));
      if (seen.current) reloadCareer();
      seen.current = true;
    }, [meId, dispatch, reloadCareer]),
  );

  const played = useMemo(() => [...(career.profile?.sports ?? [])].filter((s) => s.played > 0).sort((a, b) => b.played - a.played), [career.profile]);
  const isNew = !!career.profile && played.length === 0;
  const boards = useBoards(played);

  // A new player sees how many events they could enter right now.
  const city = user?.location?.trim();
  useEffect(() => {
    if (!isNew) return;
    latestTournaments(100, { status: 'registration_open', ...(user?.sport ? { sport: user.sport } : {}), ...(city ? { city } : {}) }).then(
      (l) => setOpenNearby(l.length),
      () => setOpenNearby(null),
    );
  }, [isNew, user?.sport, city]);

  const best = bestRank(played, boards, meId);
  const list = user ? checklist(user) : null;
  const totals = allSports(played);
  const awards = record && career.profile
    ? buildAwards({ titles: record.titles, honors: record.honors, achievements: career.profile.achievements, knockouts, totals: { played: totals.played, won: totals.won, sports: played.filter((x) => x.played > 0).length } })
    : null;

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + 12 }}>
        <View style={s.topRow}>
          <IconButton icon="settings" label="Settings" onPress={() => router.push('/profile/settings')} />
        </View>

        <Identity
          firstName={user?.firstName}
          lastName={user?.lastName}
          image={user?.profileImage}
          best={best}
          awards={awards}
          photo={photo}
          onEdit={() => router.push('/profile/edit')}
          onHonours={() => router.push('/(tabs)/awards')}
        />

        {career.error && !career.profile ? <InlineError what="Couldn't load your record." onRetry={career.reload} /> : null}

        {list && (isNew || !list.ready) ? (
          <View style={s.section}>
            <Checklist {...list} title="Complete your profile" bar />
          </View>
        ) : null}

        {!isNew && career.profile ? (
          <StatStrip played={totals.played} won={totals.won} tournaments={playerStats ? playerStats.totalTournaments : null} />
        ) : null}

        {!career.profile && career.loading ? (
          <View style={[s.section, { gap: 14 }]}>
            <Skeleton style={{ width: '35%', height: 18 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} style={{ width: 80, height: 80, borderRadius: 40 }} />)}</View>
          </View>
        ) : null}

        {isNew ? (
          <View style={[s.section, { gap: 18 }]}>
            <SectionHeader title="Analytics" />
            <View style={s.strip0}>
              <Stat value="—" label="Win rate" faint />
              <Stat value="—" label="Rank" divider faint />
              <Stat value="0" label="Played" divider />
            </View>
            <Text style={s.body}>{`Win rate, form and results by sport fill in after your first match. Your rank appears at ${RANK_MIN} decided matches.`}</Text>
          </View>
        ) : played.length ? (
          <Analytics played={played} bestSport={career.profile?.bestSport?.sport} playerId={meId} boards={boards} recent={recent} onAll={() => router.push(`/matches/${meId}`)} />
        ) : null}

        <View style={s.section}>
          <SectionHeader title="Tournaments" link={tournamentHistory.length > 5 ? 'All' : undefined} onLink={() => router.push('/profile/history')} />
          <View style={{ marginTop: 6 }}>
            {tournamentHistory.length ? (
              <TournamentRows entries={tournamentHistory.slice(0, 5)} />
            ) : (
              <Tap scale={0.99} accessibilityLabel="Find a tournament" onPress={() => router.push({ pathname: '/(tabs)/events', params: user?.sport ? { sport: user.sport } : {} })} style={s.tRow}>
                <Icon name="stadium" size={22} color={colors.text3} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.tName}>None yet</Text>
                  <Text style={s.tSub}>
                    {openNearby
                      ? `${openNearby} ${user?.sport ? `${sportName(user.sport).toLowerCase()} ` : ''}${openNearby === 1 ? 'event is' : 'events are'} open for entries${city ? ' near you' : ''}`
                      : 'Find an event to enter'}
                  </Text>
                </View>
                <Icon name="chevron_right" size={20} color={colors.disabled} />
              </Tap>
            )}
          </View>
        </View>

        <View style={s.section}>
          <SectionHeader title="Account" />
          <View style={{ marginTop: 6 }}>
            <AccountRow icon="assignment" label="My entries" onPress={() => router.push('/profile/registrations')} />
            <AccountRow icon="receipt_long" label="Payments" onPress={() => router.push('/profile/invoices')} />
            <AccountRow icon="logout" label="Log out" danger onPress={() => dispatch(logout())} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountRow({ icon, label, danger, onPress }: { icon: IconName; label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Tap scale={0.99} accessibilityLabel={label} onPress={onPress} style={s.tRow}>
      <Icon name={icon} size={22} color={danger ? colors.error : colors.text3} />
      <Text style={[s.tName, { flex: 1 }, danger && { color: colors.error }]}>{label}</Text>
      {danger ? null : <Icon name="chevron_right" size={20} color={colors.disabled} />}
    </Tap>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 6, paddingHorizontal: 12 },
  section: { paddingTop: space.sectionGap, paddingHorizontal: space.gutter },
  strip0: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.surface2 },
  body: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.text3 },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.line },
  tName: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  tSub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
});
