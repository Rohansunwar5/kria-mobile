import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Hairlines, Hazard } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { CareerCard } from '@/components/profile/CareerCard';
import { BestSportHero } from '@/components/profile/BestSportHero';
import { RecentMatches } from '@/components/profile/RecentMatches';
import { PlayedForCard } from '@/components/profile/PlayedForCard';
import { KnockoutRow } from '@/components/knockout/KnockoutRow';
import { MenuRow } from '@/components/profile/MenuRow';
import { HonorsList } from '@/components/profile/HonorsList';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPlayerStats, logout } from '@/store/slices/authSlice';
import { fetchPlayerTournamentHistory } from '@/store/slices/registrationSlice';
import { listMyQuickKnockouts, type QuickKnockout } from '@/api/quickKnockout';
import { useCareer } from '@/lib/useCareer';
import { groupMenu } from '@/lib/profileMenu';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';

const LBL = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });

function StatCell({ label, value, accent, last }: { label: string; value: string; accent?: boolean; last?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 11,
        ...(last ? null : { borderRightWidth: 1.5, borderRightColor: theme.lineSoft }),
      }}
    >
      <Text style={{ ...LBL(theme), letterSpacing: 0.1 * 9 }}>{label}</Text>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 22, color: accent ? theme.brand : theme.text, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

export default function Profile() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, playerStats } = useAppSelector((s) => s.auth);
  // Authenticated tournament history — the only place `auctionData.soldPrice`
  // is available (the public profile's payload omits it by whitelist). This
  // is the same query src/app/profile/history.tsx already runs for this same
  // player: one TournamentRegistration.find scoped to playerId, plus three
  // batched lookups for tournaments/categories/teams. Not otherwise loaded
  // by this screen, so it needs its own dispatch here.
  const { tournamentHistory } = useAppSelector((s) => s.registration);
  const career = useCareer(user?._id);
  const theme = useTheme();
  const [knockouts, setKnockouts] = useState<QuickKnockout[]>([]);

  // A failed load just leaves the section hidden; the list screen has the retry.
  useFocusEffect(useCallback(() => {
    listMyQuickKnockouts().then(setKnockouts, () => {});
  }, []));

  useEffect(() => {
    dispatch(fetchPlayerStats());
    dispatch(fetchPlayerTournamentHistory());
  }, [dispatch]);

  const name = user ? `${user.firstName} ${user.lastName}`.trim() : 'Player';

  const meta = [user?.email, user?.location].filter(Boolean).join(' · ').toUpperCase();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Identity slab */}
        <View style={{ overflow: 'hidden' }}>
          <Hairlines />
          <Ghost
            text={name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}
            size={150}
            style={{ right: -26, top: -8 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: 16, paddingTop: 10 }}>
            <AvatarPicker name={name} imageUrl={user?.profileImage} size={76} />
            <View style={{ flex: 1, paddingBottom: 3 }}>
              <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 30, lineHeight: 36, color: theme.text }}>
                {name}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              onPress={() => router.push('/profile/edit')}
              hitSlop={8}
              style={{ width: 38, height: 38, borderRadius: 4, marginBottom: 4, backgroundColor: theme.fill, borderWidth: 1.5, borderColor: theme.lineSoft, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="settings" size={17} color={theme.text} strokeWidth={1.9} />
            </Pressable>
          </View>
          {meta ? (
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, color: theme.textMeta, paddingHorizontal: 16, paddingTop: 12 }}>
              {meta}
            </Text>
          ) : null}
          <View style={{ marginTop: 13 }}>
            <Hazard />
          </View>
        </View>

        {/* Tournament count: the one figure the career ledger genuinely does
            not know — a quick match has no TournamentRegistration. Everything
            else this strip used to show (Matches/Wins/Rate) duplicated the
            career table below with a tournament-only number; removed. */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: theme.lineSoft }}>
          <StatCell label="Events" value={String(playerStats?.totalTournaments ?? 0)} last />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <BestSportHero bestSport={career.profile?.bestSport ?? null} recent={career.recent ?? []} />

          <CareerCard
            profile={career.profile}
            loading={career.loading}
            error={career.error}
            onRetry={career.reload}
            // BestSportHero directly above already carries this fact — the
            // same call player/[playerId].tsx makes, and the reason the prop
            // exists (see CareerCard's showBestSportBadge doc comment).
            showBestSportBadge={false}
          />

          <RecentMatches
            matches={career.recent}
            loading={career.loading}
            error={career.recentError}
            onRetry={career.reload}
            onSeeAll={() => router.push({ pathname: '/matches/[playerId]', params: { playerId: user?._id ?? '' } })}
          />

          {knockouts.length ? (
            <View style={{ marginTop: 22, marginBottom: 6 }}>
              <Text style={{ ...LBL(theme), letterSpacing: 0.18 * 9, marginBottom: 10 }}>Knockouts</Text>
              <View style={{ gap: 9 }}>
                {knockouts.slice(0, 3).map((k) => (
                  <KnockoutRow key={k._id} knockout={k} viewerId={user?._id} onPress={() => router.push({ pathname: '/knockout/[id]', params: { id: k._id } })} />
                ))}
              </View>
              {knockouts.length > 3 ? (
                <Pressable accessibilityRole="button" accessibilityLabel="See all knockouts" onPress={() => router.push('/knockout')} hitSlop={8} style={{ alignSelf: 'flex-start', paddingVertical: 10 }}>
                  <Text style={{ ...LBL(theme), color: theme.text }}>See all</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Pressable
            onPress={() => router.push('/quick')}
            style={{
              marginHorizontal: 20,
              marginBottom: 18,
              borderWidth: 1.5,
              borderColor: theme.brand,
              borderRadius: 6,
              padding: 14,
            }}
          >
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: theme.brand }}>
              Between tournaments
            </Text>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 20, color: theme.text, marginTop: 4 }}>
              Quick matches
            </Text>
          </Pressable>

          <HonorsList label="Honors" honors={user?.honors} titles={user?.titles} style={{ marginBottom: 16 }} />

          {tournamentHistory.length ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ ...LBL(theme), marginBottom: 8 }}>Played for</Text>
              <View style={{ gap: 9 }}>
                {tournamentHistory.map((e) => (
                  <PlayedForCard
                    key={e._id}
                    entry={e}
                    soldPrice={e.auctionData?.soldPrice}
                    onPress={() => router.push(`/tournament/${e.tournament!._id}`)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Grouped, not a flat list of eight rows */}
          {groupMenu().map((group) => (
            <View key={group.title} style={{ marginBottom: 14 }}>
              <Text style={{ ...LBL(theme), marginBottom: 8 }}>{group.title}</Text>
              <View style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.line, borderRadius: 6, overflow: 'hidden' }}>
                {group.items.map((item, i) => (
                  <MenuRow
                    key={item.label}
                    label={item.label}
                    icon={item.icon}
                    first={i === 0}
                    onPress={() => router.push(item.href as any)}
                  />
                ))}
              </View>
            </View>
          ))}

          <View style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.failLine, borderRadius: 6, overflow: 'hidden' }}>
            <MenuRow label="Log out" icon="logout" danger first onPress={() => dispatch(logout())} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
