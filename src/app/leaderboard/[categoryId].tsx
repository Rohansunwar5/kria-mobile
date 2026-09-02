import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Chip } from '@/components/canvas';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Skeleton, ErrorBlock, EmptyState, Ghost } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { getCategoryLeaderboard, type CategoryLeaderboard, type LeaderboardEntry } from '@/api/leaderboard';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

function record(e: LeaderboardEntry) {
  return [e.teamName, `${e.matchesWon}W ${Math.max(0, e.matchesPlayed - e.matchesWon)}L`].filter(Boolean).join(' · ');
}

/** First place, as a solid orange block rather than a podium graphic. */
function Leader({ e }: { e: LeaderboardEntry }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#F97316' }}>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 34, lineHeight: 30, color: '#0B0B0B' }}>1</Text>
      <View style={{ width: 44, height: 44, borderRadius: 4, backgroundColor: '#0B0B0B', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 16, color: '#F97316' }}>
          {e.playerName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 20, color: '#0B0B0B' }}>
          {e.playerName}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: 'rgba(11,11,11,0.7)', marginTop: 4 }}>
          {record(e)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 26, lineHeight: 24, color: '#0B0B0B' }}>{e.totalPointsScored}</Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.14 * 8, color: 'rgba(11,11,11,0.7)' }}>PTS</Text>
      </View>
    </View>
  );
}

function RunnerUp({ e, place }: { e: LeaderboardEntry; place: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 }}>
      <Text style={{ width: 34, fontFamily: 'SpaceMono_700Bold', fontSize: 20, color: '#a3a3a3' }}>{place}</Text>
      <InitialsAvatar name={e.playerName} size={34} neutral />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>
          {e.playerName}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 3 }}>
          {record(e)}
        </Text>
      </View>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 18, color: '#fff' }}>{e.totalPointsScored}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const { currentTournament } = useAppSelector((s) => s.tournament);
  const myRegistrations = useAppSelector((s) => s.registration.myRegistrations);

  const [data, setData] = useState<CategoryLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [board, setBoard] = useState(0);

  const load = useCallback(async () => {
    if (!categoryId) return;
    try {
      setData(await getCategoryLeaderboard(categoryId));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const myIds = new Set(myRegistrations.map((r) => r._id));
  const sub = [data?.categoryName, currentTournament?.name].filter(Boolean).join(' · ');

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
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>Standings</Text>
        {sub ? (
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (loading) {
    return (
      <Screen>
        {Header}
        <Skeleton h={70} style={{ borderRadius: 0, borderWidth: 0 }} />
        <View style={{ padding: 16, gap: 10 }}>
          <Skeleton h={56} />
          <Skeleton h={56} />
          <Skeleton h={180} />
        </View>
      </Screen>
    );
  }

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F97316" />;

  if (error || !data) {
    return (
      <Screen>
        {Header}
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16 }}>
          <ErrorBlock label="Standings unavailable" message="The table could not be loaded. Pull to retry." onRetry={load} />
        </ScrollView>
      </Screen>
    );
  }

  const active = data.boards[Math.min(board, data.boards.length - 1)] ?? { label: null, entries: [] };
  const entries = active.entries;
  const [first, second, third, ...rest] = entries;

  return (
    <Screen>
      {Header}

      {/* One board per sub-match slot, for team-league categories. */}
      {data.boards.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingVertical: 12 }}
          style={{ flexGrow: 0, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}
        >
          {data.boards.map((b, i) => (
            <Chip key={b.label ?? i} label={b.label ?? 'All'} selected={i === board} onPress={() => setBoard(i)} />
          ))}
        </ScrollView>
      ) : null}

      {entries.length === 0 ? (
        <ScrollView refreshControl={refresh} contentContainerStyle={{ flexGrow: 1 }}>
          <EmptyState
            icon="chart"
            title="No results yet"
            message="The table fills in as matches are played and results are recorded."
          />
        </ScrollView>
      ) : (
        <>
          <View style={{ overflow: 'hidden', borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
            <Ghost text="01" size={150} style={{ right: -16, top: -24 }} />
            {first ? <Leader e={first} /> : null}
            {second ? <RunnerUp e={second} place={2} /> : null}
            {third ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.08)' }} /> : null}
            {third ? <RunnerUp e={third} place={3} /> : null}
          </View>

          <ScrollView refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 }}>
            {rest.length ? (
              <>
                <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 7 }}>
                  <Text style={{ ...LBL, width: 22 }}>#</Text>
                  <Text style={{ ...LBL, flex: 1, letterSpacing: 0.12 * 9 }}>Player</Text>
                  <Text style={{ ...LBL, width: 28, textAlign: 'right' }}>P</Text>
                  <Text style={{ ...LBL, width: 28, textAlign: 'right' }}>W</Text>
                  <Text style={{ ...LBL, width: 34, textAlign: 'right' }}>Pts</Text>
                </View>
                <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
                  {rest.map((e, i) => {
                    const mine = myIds.has(e._id);
                    return (
                      <View key={e._id}>
                        {i > 0 ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} /> : null}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            backgroundColor: mine ? 'rgba(250,76,147,0.10)' : 'transparent',
                            ...(mine ? { borderLeftWidth: 4, borderLeftColor: '#FA4C93' } : null),
                          }}
                        >
                          <Text style={{ width: mine ? 18 : 22, fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#a3a3a3' }}>
                            {i + 4}
                          </Text>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                            <InitialsAvatar name={e.playerName} size={22} neutral={!mine} color="#FA4C93" />
                            <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: '#fff' }}>
                              {e.playerName}
                            </Text>
                            {mine ? (
                              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, color: '#FA4C93' }}>YOU</Text>
                            ) : null}
                          </View>
                          <Text style={{ width: 28, textAlign: 'right', fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#a3a3a3' }}>{e.matchesPlayed}</Text>
                          <Text style={{ width: 28, textAlign: 'right', fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#d4d4d4' }}>{e.matchesWon}</Text>
                          <Text style={{ width: 34, textAlign: 'right', fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: '#fff' }}>{e.totalPointsScored}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}
          </ScrollView>
        </>
      )}
    </Screen>
  );
}
