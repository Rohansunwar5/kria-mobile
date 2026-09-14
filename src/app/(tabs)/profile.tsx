import { useEffect } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Hairlines, Hazard } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { CareerCard } from '@/components/profile/CareerCard';
import { BestSportHero } from '@/components/profile/BestSportHero';
import { RecentMatches } from '@/components/profile/RecentMatches';
import { PlayedForCard } from '@/components/profile/PlayedForCard';
import { MenuRow } from '@/components/profile/MenuRow';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPlayerStats, logout } from '@/store/slices/authSlice';
import { fetchPlayerTournamentHistory } from '@/store/slices/registrationSlice';
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
          />

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

          {user?.titles?.length ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ ...LBL(theme), marginBottom: 8 }}>Honors</Text>
              <View style={{ gap: 7 }}>
                {user.titles.map((t, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: theme.brand, borderRadius: 6 }}>
                    <Icon name="trophy" size={17} color={theme.onBrand} strokeWidth={2.2} />
                    <Text numberOfLines={2} style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 18, color: theme.onBrand }}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

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
