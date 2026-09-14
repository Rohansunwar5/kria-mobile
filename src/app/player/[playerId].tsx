import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/lib/nav';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hairlines, Hazard } from '@/components/canvas';
import { Skeleton, ErrorBlock, EmptyState, Ghost } from '@/components/states';
import { hue } from '@/components/TournamentArt';
import { CareerCard } from '@/components/profile/CareerCard';
import { BestSportHero } from '@/components/profile/BestSportHero';
import { Achievements } from '@/components/profile/Achievements';
import { RecentMatches } from '@/components/profile/RecentMatches';
import { PlayedForCard } from '@/components/profile/PlayedForCard';
import { getPublicPlayer, type PublicPlayer, type PublicHistoryEntry } from '@/api/profileApi';
import { useCareer } from '@/lib/useCareer';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

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
        <View style={{ overflow: 'hidden', backgroundColor: `hsl(${hue(player._id)}, 44%, 13%)` }}>
          <Hairlines />
          <Ghost text={name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')} size={150} style={{ right: -26, top: -8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: 16, paddingTop: 12 }}>
            {player.profileImage ? (
              <Image source={{ uri: player.profileImage }} style={{ width: 76, height: 76, borderRadius: 4 }} />
            ) : (
              <InitialsAvatar name={name} size={76} />
            )}
            <View style={{ flex: 1, paddingBottom: 3 }}>
              <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 30, lineHeight: 36, color: theme.text }}>
                {name}
              </Text>
            </View>
          </View>
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: theme.textMeta, paddingHorizontal: 16, paddingTop: 12 }}>
            {[player.sport, player.location].filter(Boolean).join(' · ') || 'Kria player'}
          </Text>
          <View style={{ marginTop: 13 }}>
            <Hazard />
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <BestSportHero bestSport={career.profile?.bestSport ?? null} recent={career.recent ?? []} />

          <CareerCard
            profile={career.profile}
            loading={career.loading}
            error={career.error}
            onRetry={career.reload}
          />

          <Achievements
            achievements={career.profile?.achievements ?? []}
            loading={career.loading}
            error={career.error}
            onRetry={career.reload}
          />

          <RecentMatches
            matches={career.recent}
            loading={career.loading}
            error={career.recentError}
            onRetry={career.reload}
          />

          {player.titles.length ? (
            <View style={{ marginTop: 22 }}>
              <Text style={{ ...LBL(theme), letterSpacing: 0.18 * 9, marginBottom: 8 }}>Titles</Text>
              <View style={{ gap: 7 }}>
                {player.titles.map((t, i) => (
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

          <View style={{ marginTop: 22 }}>
            <Text style={{ ...LBL(theme), letterSpacing: 0.18 * 9, marginBottom: 8 }}>Played for</Text>
            {history.length === 0 ? (
              <EmptyState
                icon="trophy"
                title="No events yet"
                message="Tournaments this player has entered will appear here."
              />
            ) : (
              <View style={{ gap: 9 }}>
                {history.map((h) => (
                  <PlayedForCard
                    key={h._id}
                    entry={h}
                    onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: h.tournament!._id } })}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
