import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hairlines, Hazard } from '@/components/canvas';
import { Skeleton, ErrorBlock, EmptyState, Ghost } from '@/components/states';
import { Tag } from '@/components/StatusPill';
import { getPublicPlayer, type PublicPlayer, type PublicHistoryEntry } from '@/api/profileApi';
import { formatShortDate } from '@/lib/format';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

function StatCell({ label, value, accent, last }: { label: string; value: string; accent?: boolean; last?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 11,
        ...(last ? null : { borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.12)' }),
      }}
    >
      <Text style={LBL}>{label}</Text>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 22, color: accent ? '#F97316' : '#fff', marginTop: 2 }}>{value}</Text>
    </View>
  );
}

export default function PlayerProfile() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const router = useRouter();

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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={19} color="#fff" strokeWidth={2.3} />
      </Pressable>
      <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, color: '#fff' }}>Player</Text>
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

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F97316" />;

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
  // The public payload strips PII; totals are what is left to show.
  const played = history.reduce((s, h) => s + (h.stats?.matchesPlayed ?? 0), 0);
  const won = history.reduce((s, h) => s + (h.stats?.matchesWon ?? 0), 0);
  const rate = played > 0 ? `${Math.round((won / played) * 100)}%` : '—';

  return (
    <Screen>
      {Header}
      <ScrollView refreshControl={refresh} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ overflow: 'hidden' }}>
          <Hairlines />
          <Ghost text={name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')} size={150} style={{ right: -26, top: -8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: 16, paddingTop: 12 }}>
            {player.profileImage ? (
              <Image source={{ uri: player.profileImage }} style={{ width: 76, height: 76, borderRadius: 4 }} />
            ) : (
              <InitialsAvatar name={name} size={76} />
            )}
            <View style={{ flex: 1, paddingBottom: 3 }}>
              <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 30, lineHeight: 26, color: '#fff' }}>
                {name}
              </Text>
            </View>
          </View>
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#a3a3a3', paddingHorizontal: 16, paddingTop: 12 }}>
            {[player.sport, player.location].filter(Boolean).join(' · ') || 'Kria player'}
          </Text>
          <View style={{ marginTop: 13 }}>
            <Hazard />
          </View>
        </View>

        <View style={{ flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
          <StatCell label="Events" value={String(history.length)} />
          <StatCell label="Matches" value={String(played)} />
          <StatCell label="Wins" value={String(won)} accent />
          <StatCell label="Rate" value={rate} last />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {player.titles.length ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ ...LBL, letterSpacing: 0.18 * 9, marginBottom: 8 }}>Honors</Text>
              <View style={{ gap: 7 }}>
                {player.titles.map((t, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: '#F97316', borderRadius: 6 }}>
                    <Icon name="trophy" size={17} color="#0B0B0B" strokeWidth={2.2} />
                    <Text numberOfLines={2} style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 14, color: '#0B0B0B' }}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <Text style={{ ...LBL, letterSpacing: 0.18 * 9, marginBottom: 8 }}>Played</Text>
          {history.length === 0 ? (
            <EmptyState
              icon="trophy"
              title="No events yet"
              message="Tournaments this player has entered will appear here."
            />
          ) : (
            <View style={{ gap: 7 }}>
              {history.map((h) => (
                <Pressable
                  key={h._id}
                  accessibilityRole={h.tournament?._id ? 'button' : undefined}
                  accessibilityLabel={h.tournament?.name || 'Tournament'}
                  disabled={!h.tournament?._id}
                  onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: h.tournament!._id } })}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 13,
                    paddingVertical: 11,
                    backgroundColor: '#151515',
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.14)',
                    borderLeftWidth: 4,
                    borderLeftColor: h.team?.primaryColor || 'rgba(255,255,255,0.14)',
                    borderRadius: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 15, color: '#fff' }}>
                      {h.tournament?.name || 'Tournament'}
                    </Text>
                    {h.team ? <Tag label={h.team.name} variant="up" /> : null}
                  </View>
                  <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 5 }}>
                    {[
                      h.category?.name,
                      h.stats?.matchesPlayed ? `${h.stats.matchesWon ?? 0}W of ${h.stats.matchesPlayed}` : null,
                      formatShortDate(h.createdAt),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
