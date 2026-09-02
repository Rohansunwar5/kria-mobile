import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Chip } from '@/components/canvas';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Skeleton, ErrorBlock, EmptyState, Ghost } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { getCricketLeaderboard, SORTS, SORT_LABELS, type CricketPlayerStats, type LeaderboardSort } from '@/api/cricketStats';
import { sortMetric, sortColumns } from '@/lib/cricketSort';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

function initials(name?: string) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function CricketLeaderboard() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const { currentTournament } = useAppSelector((s) => s.tournament);
  const { categories, myRegistrations } = useAppSelector((s) => s.registration);

  const [sort, setSort] = useState<LeaderboardSort>('runs');
  const [rows, setRows] = useState<CricketPlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      setRows(await getCricketLeaderboard(categoryId, sort));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const category = categories.find((c) => c._id === categoryId);
  const myIds = new Set(myRegistrations.map((r) => r._id));
  const columns = sortColumns(sort);
  const [leader, ...rest] = rows;

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
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>Category charts</Text>
        <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
          {[currentTournament?.name, category?.name].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );

  // One chip per sort key the API accepts — no more, no fewer.
  const Sorts = (
    <View style={{ paddingVertical: 11, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16 }}>
        {SORTS.map((s) => (
          <Chip key={s} label={SORT_LABELS[s]} selected={sort === s} onPress={() => setSort(s)} />
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <Screen>
        {Header}
        {Sorts}
        <Skeleton h={74} style={{ borderRadius: 0, borderWidth: 0 }} />
        <View style={{ padding: 16, gap: 10 }}>
          <Skeleton h={180} />
        </View>
      </Screen>
    );
  }

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F97316" />;

  if (error) {
    return (
      <Screen>
        {Header}
        {Sorts}
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16 }}>
          <ErrorBlock label="Charts unavailable" message="These charts could not be loaded. Pull to retry." onRetry={load} />
        </ScrollView>
      </Screen>
    );
  }

  if (rows.length === 0) {
    return (
      <Screen>
        {Header}
        {Sorts}
        <ScrollView refreshControl={refresh} contentContainerStyle={{ flexGrow: 1 }}>
          <EmptyState
            icon="chart"
            title="Nothing charted yet"
            message="Charts fill in as matches are scored. Try another sort once play has started."
          />
        </ScrollView>
      </Screen>
    );
  }

  const top = sortMetric(sort, leader);

  return (
    <Screen>
      {Header}
      {Sorts}

      <View style={{ overflow: 'hidden' }}>
        <Ghost text={top.value} size={140} style={{ right: -12, top: -28 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F97316' }}>
          <View style={{ width: 46, height: 46, borderRadius: 4, backgroundColor: '#0B0B0B', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 17, color: '#F97316' }}>{initials(leader.playerName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.16 * 8, color: 'rgba(11,11,11,0.7)' }}>
              {top.headline.toUpperCase()}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 24, lineHeight: 22, color: '#0B0B0B', marginTop: 3 }}>
              {leader.playerName}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: 'rgba(11,11,11,0.72)', marginTop: 4 }}>
              {[leader.teamName, leader.batting?.highest ? `HS ${leader.batting.highest}` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 30, lineHeight: 26, color: '#0B0B0B' }}>{top.value}</Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.14 * 8, color: 'rgba(11,11,11,0.7)' }}>{top.unit}</Text>
          </View>
        </View>
      </View>

      <ScrollView refreshControl={refresh} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 7 }}>
          <Text style={{ ...LBL, width: 20 }}>#</Text>
          <Text style={{ ...LBL, flex: 1, letterSpacing: 0.12 * 9 }}>Player</Text>
          {columns.map((c) => (
            <Text key={c.label} style={{ ...LBL, width: 44, textAlign: 'right' }}>
              {c.label}
            </Text>
          ))}
        </View>

        <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
          {rest.map((r, i) => {
            const mine = myIds.has(r.registrationId);
            return (
              <View key={r.registrationId}>
                {i > 0 ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} /> : null}
                <Pressable
                  disabled={!mine || !currentTournament?._id}
                  accessibilityRole={mine ? 'button' : undefined}
                  accessibilityLabel={mine ? 'My tournament stats' : undefined}
                  onPress={() =>
                    router.push({
                      pathname: '/cricket/my-stats/[registrationId]',
                      params: { registrationId: r.registrationId, tournamentId: currentTournament?._id ?? '' },
                    })
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: mine ? 'rgba(250,76,147,0.10)' : 'transparent',
                    ...(mine ? { borderLeftWidth: 4, borderLeftColor: '#FA4C93' } : null),
                  }}
                >
                  <Text style={{ width: mine ? 16 : 20, fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#a3a3a3' }}>{i + 2}</Text>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <InitialsAvatar name={r.playerName} size={22} neutral={!mine} color="#FA4C93" />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: '#fff' }}>
                        {r.playerName}
                      </Text>
                      {r.teamName ? (
                        <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 2 }}>
                          {r.teamName}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {columns.map((c, ci) => (
                    <Text
                      key={c.label}
                      style={{
                        width: 44,
                        textAlign: 'right',
                        fontFamily: ci === 1 ? 'SpaceMono_700Bold' : 'SpaceMono_400Regular',
                        fontSize: 12,
                        color: ci === 1 ? '#fff' : '#a3a3a3',
                      }}
                    >
                      {c.value(r)}
                    </Text>
                  ))}
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
