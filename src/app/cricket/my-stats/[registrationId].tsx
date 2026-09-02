import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Skeleton, ErrorBlock, EmptyState, Ghost } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { getCricketPlayerStats, type CricketPlayerStats } from '@/api/cricketStats';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

function Cell({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 11,
        ...(last ? null : { borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.10)' }),
      }}
    >
      <Text style={LBL}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 21, color: '#fff', marginTop: 3 }}>
        {value}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 19, color: '#fff' }}>{title}</Text>
        <View style={{ flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.12)' }} />
      </View>
      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

const dash = (n: number | null | undefined, d = 0) => (n === null || n === undefined ? '—' : n.toFixed(d));

export default function CricketMyStats() {
  const { registrationId, tournamentId } = useLocalSearchParams<{ registrationId: string; tournamentId?: string }>();
  const router = useRouter();
  const { currentTournament } = useAppSelector((s) => s.tournament);
  const user = useAppSelector((s) => s.auth.user);

  const [stats, setStats] = useState<CricketPlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Stats are per-registration and scoped to one tournament — there is no
  // global player-stats endpoint.
  const tid = tournamentId || currentTournament?._id;

  const load = useCallback(async () => {
    if (!registrationId || !tid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setStats(await getCricketPlayerStats(registrationId, tid));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [registrationId, tid]);

  useEffect(() => {
    load();
  }, [load]);

  const name = stats?.playerName || (user ? `${user.firstName} ${user.lastName}`.trim() : 'You');

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
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>My tournament</Text>
        <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
          {currentTournament?.name || ' '}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <Screen>
        {Header}
        <Skeleton h={72} style={{ borderRadius: 0, borderWidth: 0 }} />
        <View style={{ padding: 16, gap: 14 }}>
          <Skeleton h={10} w={80} line />
          <Skeleton h={100} />
          <Skeleton h={10} w={80} line />
          <Skeleton h={100} />
        </View>
      </Screen>
    );
  }

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F97316" />;

  if (error || !tid) {
    return (
      <Screen>
        {Header}
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16 }}>
          <ErrorBlock
            label="Stats unavailable"
            message={tid ? 'Your stats could not be loaded. Pull to retry.' : 'This screen needs a tournament to scope your stats to.'}
            onRetry={tid ? load : undefined}
          />
        </ScrollView>
      </Screen>
    );
  }

  if (!stats) {
    return (
      <Screen>
        {Header}
        <ScrollView refreshControl={refresh} contentContainerStyle={{ flexGrow: 1 }}>
          <EmptyState
            icon="cricket-bat"
            title="Nothing recorded yet"
            message="Your batting, bowling and fielding for this tournament appear here once you have played a match."
          />
        </ScrollView>
      </Screen>
    );
  }

  const bat = stats.batting ?? ({} as CricketPlayerStats['batting']);
  const bowl = stats.bowling ?? ({} as CricketPlayerStats['bowling']);
  const field = stats.fielding ?? {};
  const c = stats.computed ?? ({} as CricketPlayerStats['computed']);

  return (
    <Screen>
      {Header}
      <ScrollView refreshControl={refresh} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ overflow: 'hidden' }}>
          <Ghost text={String(bat.runs ?? 0)} size={190} style={{ left: -24, top: 40 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F97316' }}>
            <View style={{ width: 44, height: 44, borderRadius: 4, backgroundColor: '#0B0B0B', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 16, color: '#F97316' }}>
                {name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 21, lineHeight: 19, color: '#0B0B0B' }}>
                {name}
              </Text>
              {stats.teamName ? (
                <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: 'rgba(11,11,11,0.72)', marginTop: 4 }}>
                  {stats.teamName}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 20, lineHeight: 18, color: '#0B0B0B' }}>{stats.matches ?? '—'}</Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.14 * 8, color: 'rgba(11,11,11,0.7)' }}>MATCHES</Text>
            </View>
          </View>
        </View>

        <Section title="Batting">
          <View style={{ flexDirection: 'row' }}>
            <Cell label="Runs" value={dash(bat.runs)} />
            <Cell label="Avg" value={dash(c.average, 1)} />
            <Cell label="SR" value={dash(c.strikeRate, 1)} last />
          </View>
          <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.10)' }} />
          <View style={{ flexDirection: 'row' }}>
            <Cell label="Balls" value={dash(bat.balls)} />
            <Cell label="4s" value={dash(bat.fours)} />
            <Cell label="6s" value={dash(bat.sixes)} />
            <Cell label="High" value={bat.highest ? dash(bat.highest) : '—'} last />
          </View>
        </Section>

        <Section title="Bowling">
          <View style={{ flexDirection: 'row' }}>
            <Cell label="Wkts" value={dash(bowl.wickets)} />
            <Cell label="Overs" value={c.overs ?? '0.0'} />
            <Cell label="Econ" value={dash(c.economy, 1)} last />
          </View>
          <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.10)' }} />
          <View style={{ flexDirection: 'row' }}>
            <Cell label="Runs" value={dash(bowl.runsConceded)} />
            <Cell label="Maidens" value={dash(bowl.maidens)} />
            <Cell label="Best" value={c.bestFigures ?? '—'} last />
          </View>
        </Section>

        <Section title="Fielding">
          <View style={{ flexDirection: 'row' }}>
            <Cell label="Catches" value={dash(field.catches)} />
            <Cell label="Run outs" value={dash(field.runOuts)} />
            <Cell label="Stumpings" value={dash(field.stumpings)} last />
          </View>
        </Section>
      </ScrollView>
    </Screen>
  );
}
