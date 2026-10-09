import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/lib/nav';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Skeleton, ErrorBlock } from '@/components/states';
import { PlayerCard } from '@/components/profile/PlayerCard';
import { SportCards } from '@/components/profile/SportCards';
import { TrophyCabinet } from '@/components/profile/TrophyCabinet';
import { ProfileHistory } from '@/components/profile/ProfileHistory';
import { getPublicPlayer, type PublicPlayer, type PublicHistoryEntry } from '@/api/profileApi';
import { useCareer } from '@/lib/useCareer';
import { useTheme } from '@/lib/theme';

/**
 * Another player's profile: the same player card, sports, trophy cabinet and
 * history as your own, without your account rows or your knockouts.
 */
export default function PlayerProfile() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const router = useRouter();
  const theme = useTheme();

  const career = useCareer(playerId);
  const [data, setData] = useState<{ player: PublicPlayer; history: PublicHistoryEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    setData(await getPublicPlayer(playerId));
    setLoading(false);
    setRefreshing(false);
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  const Header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: theme.lineSoft }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => goBack(router)}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: theme.fill, borderWidth: 1.5, borderColor: theme.lineSoft, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={19} color={theme.text} strokeWidth={2.3} />
      </Pressable>
      <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, color: theme.text }}>Player</Text>
    </View>
  );

  if (loading) {
    return (
      <Screen>
        {Header}
        <Skeleton h={140} style={{ borderRadius: 0, borderWidth: 0 }} />
        <View style={{ padding: 16, gap: 10 }}>
          <Skeleton h={64} />
          <Skeleton h={64} />
        </View>
      </Screen>
    );
  }

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.brand} />;

  if (!data) {
    return (
      <Screen>
        {Header}
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16 }}>
          <ErrorBlock
            label="Player not found"
            message="This player profile is not available. They may have left the platform."
            onRetry={load}
          />
        </ScrollView>
      </Screen>
    );
  }

  const { player, history } = data;
  const name = `${player.firstName} ${player.lastName}`.trim();

  return (
    <Screen>
      {Header}
      <ScrollView refreshControl={refresh} contentContainerStyle={{ paddingBottom: 24 }}>
        <PlayerCard
          name={name}
          avatar={<InitialsAvatar name={name} logo={player.profileImage} size={84} />}
          location={player.location}
          profile={career.profile}
          loading={career.loading}
          recent={career.recent}
          honours={(player.honors?.length ?? 0) + (player.titles?.length ?? 0)}
          // Each history entry is one tournament entered.
          events={history.length}
        />

        <SportCards profile={career.profile} loading={career.loading} error={career.error} onRetry={career.reload} />

        <TrophyCabinet
          honors={player.honors}
          titles={player.titles}
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
          onAllMatches={() => router.push({ pathname: '/matches/[playerId]', params: { playerId } })}
          teams={history}
          onOpenTournament={(id) => router.push({ pathname: '/tournament/[id]', params: { id } })}
          teamsEmpty="No events yet. Tournament teams this player joins appear here."
        />
      </ScrollView>
    </Screen>
  );
}
