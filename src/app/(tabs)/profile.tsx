import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { PlayerCard } from '@/components/profile/PlayerCard';
import { SportCards } from '@/components/profile/SportCards';
import { TrophyCabinet } from '@/components/profile/TrophyCabinet';
import { ProfileHistory } from '@/components/profile/ProfileHistory';
import { MenuRow } from '@/components/profile/MenuRow';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPlayerStats, logout } from '@/store/slices/authSlice';
import { fetchPlayerTournamentHistory } from '@/store/slices/registrationSlice';
import { listMyQuickKnockouts, type QuickKnockout } from '@/api/quickKnockout';
import { useCareer } from '@/lib/useCareer';
import { groupMenu } from '@/lib/profileMenu';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';

const LBL = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });

/**
 * The You tab, read like a player card: who you are and your numbers, how you
 * play each sport, what you have won, your history, then your account.
 * Designed in docs/profile-redesign.html; other players' profiles use the same
 * sections without the account part.
 */
export default function Profile() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, playerStats } = useAppSelector((s) => s.auth);
  // Authenticated tournament history — the only place `auctionData.soldPrice`
  // is available (the public profile's payload omits it by whitelist). This
  // is the same query src/app/profile/history.tsx already runs for this same
  // player. Not otherwise loaded by this screen, so it needs its own dispatch.
  const { tournamentHistory } = useAppSelector((s) => s.registration);
  const career = useCareer(user?._id);
  const theme = useTheme();
  const [knockouts, setKnockouts] = useState<QuickKnockout[]>([]);

  // A failed load just leaves the list empty; the list screen has the retry.
  useFocusEffect(useCallback(() => {
    listMyQuickKnockouts().then(setKnockouts, () => {});
  }, []));

  useEffect(() => {
    dispatch(fetchPlayerStats());
    dispatch(fetchPlayerTournamentHistory());
  }, [dispatch]);

  const name = user ? `${user.firstName} ${user.lastName}`.trim() : 'Player';

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <PlayerCard
          name={name}
          avatar={<AvatarPicker name={name} imageUrl={user?.profileImage} size={84} />}
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              onPress={() => router.push('/profile/settings')}
              hitSlop={8}
              style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: theme.fill, borderWidth: 1.5, borderColor: theme.lineSoft, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="settings" size={17} color={theme.text} strokeWidth={1.9} />
            </Pressable>
          }
          location={user?.location}
          profile={career.profile}
          loading={career.loading}
          recent={career.recent}
          honours={(user?.honors?.length ?? 0) + (user?.titles?.length ?? 0)}
          // Tournaments entered — the one figure the career ledger does not
          // know, since a quick match has no TournamentRegistration.
          events={playerStats?.totalTournaments ?? 0}
        />

        <SportCards
          profile={career.profile}
          loading={career.loading}
          error={career.error}
          onRetry={career.reload}
          emptyAction={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Host a match"
              onPress={() => router.push('/quick/host')}
              style={{ alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 18, borderRadius: 5, backgroundColor: theme.auction, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Icon name="plus" size={16} color={theme.onAuction} strokeWidth={2.4} />
              <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 19, color: theme.onAuction }}>Host a match</Text>
            </Pressable>
          }
        />

        <TrophyCabinet
          honors={user?.honors}
          titles={user?.titles}
          achievements={career.profile?.achievements ?? []}
          loading={career.loading}
          error={career.error}
          onRetry={career.reload}
        />

        <ProfileHistory
          recent={career.recent}
          loading={career.loading}
          error={career.recentError}
          onRetry={career.reload}
          onAllMatches={() => router.push({ pathname: '/matches/[playerId]', params: { playerId: user?._id ?? '' } })}
          knockouts={knockouts}
          viewerId={user?._id}
          onOpenKnockout={(id) => router.push({ pathname: '/knockout/[id]', params: { id } })}
          onAllKnockouts={() => router.push('/knockout')}
          teams={tournamentHistory}
          onOpenTournament={(id) => router.push(`/tournament/${id}`)}
          teamsEmpty="Teams you play for in organiser tournaments land here, with what the auction paid for you."
        />

        <View style={{ paddingHorizontal: 16, paddingTop: 26 }}>
          {/* Grouped, not a flat list of rows */}
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
