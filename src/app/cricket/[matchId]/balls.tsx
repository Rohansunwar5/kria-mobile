import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Chip } from '@/components/canvas';
import { Skeleton, ErrorBlock, EmptyState, Ghost } from '@/components/states';
import { getInningsBalls } from '@/api/cricketStats';
import { getScorecard, type Scorecard } from '@/api/cricketMatch';
import { groupIntoOvers, type DisplayBall, type BallKind } from '@/lib/cricketBalls';

const SQUARE: Record<BallKind, { bg: string; fg: string; border?: string }> = {
  wicket: { bg: '#FF4438', fg: '#2A0703' },
  four: { bg: '#16C46A', fg: '#06240F' },
  six: { bg: '#FA4C93', fg: '#240614' },
  extra: { bg: 'rgba(255,255,255,0.07)', fg: '#F97316', border: 'rgba(255,255,255,0.12)' },
  dot: { bg: 'rgba(255,255,255,0.07)', fg: '#7d7d7d', border: 'rgba(255,255,255,0.12)' },
  runs: { bg: 'rgba(255,255,255,0.07)', fg: '#d4d4d4', border: 'rgba(255,255,255,0.12)' },
};

function BallRow({ b }: { b: DisplayBall }) {
  const skin = SQUARE[b.label.kind];
  const wicket = b.label.kind === 'wicket';

  const detail = [
    b.label.kind === 'dot' ? 'Dot' : `${b.totalRuns} run${b.totalRuns === 1 ? '' : 's'}`,
    `${b.score.runs}/${b.score.wickets}`,
  ].join(' · ');

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 11,
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderBottomWidth: 1.5,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        backgroundColor: wicket ? 'rgba(255,68,56,0.07)' : 'transparent',
      }}
    >
      <Text style={{ width: 34, paddingTop: 3, fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#7d7d7d' }}>
        {b.overNumber - 1}.{b.deliveryNumber}
      </Text>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 4,
          backgroundColor: skin.bg,
          alignItems: 'center',
          justifyContent: 'center',
          ...(skin.border ? { borderWidth: 1.5, borderColor: skin.border } : null),
        }}
      >
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: b.label.text.length > 1 ? 10 : 12, color: skin.fg }}>
          {b.label.text}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        {wicket ? (
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 14, color: '#FF4438' }}>
            Wicket
          </Text>
        ) : null}
        {b.commentary ? (
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: '#fff', marginTop: wicket ? 5 : 0 }}>
            {b.commentary}
          </Text>
        ) : null}
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.06 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 3 }}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

export default function CricketBalls() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const [innings, setInnings] = useState<1 | 2>(1);
  const [balls, setBalls] = useState<Awaited<ReturnType<typeof getInningsBalls>>>([]);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const [b, sc] = await Promise.all([
        getInningsBalls(matchId, innings),
        // Names for the over headers; the balls payload carries ids only.
        getScorecard(matchId).catch(() => null),
      ]);
      setBalls(b);
      if (sc) setScorecard(sc);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [matchId, innings]);

  useEffect(() => {
    load();
  }, [load]);

  const card = innings === 1 ? scorecard?.innings1 : scorecard?.innings2;
  const nameById: Record<string, string> = {};
  for (const inn of [scorecard?.innings1, scorecard?.innings2]) {
    inn?.battingCard?.forEach((p) => { nameById[p.registrationId] = p.name; });
    inn?.bowlingCard?.forEach((p) => { nameById[p.registrationId] = p.name; });
  }
  const overs = groupIntoOvers(balls, nameById);

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
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>Ball by ball</Text>
        <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
          {card?.battingTeamName ? `${card.battingTeamName} innings` : `Innings ${innings}`}
        </Text>
      </View>
    </View>
  );

  const Switch = (
    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Chip label="Innings 1" selected={innings === 1} onPress={() => setInnings(1)} />
      <Chip label="Innings 2" selected={innings === 2} onPress={() => setInnings(2)} />
    </View>
  );

  if (loading) {
    return (
      <Screen>
        {Header}
        {Switch}
        <View style={{ padding: 16, gap: 10 }}>
          <Skeleton h={34} />
          <Skeleton h={62} />
          <Skeleton h={62} />
          <Skeleton h={62} />
        </View>
      </Screen>
    );
  }

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F97316" />;

  if (error) {
    return (
      <Screen>
        {Header}
        {Switch}
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16 }}>
          <ErrorBlock label="Balls unavailable" message="This innings could not be loaded. Pull to retry." onRetry={load} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      {Header}
      {Switch}
      <ScrollView refreshControl={refresh} contentContainerStyle={{ paddingBottom: 24 }}>
        <Ghost text="OVER" size={130} style={{ right: -34, top: 200 }} />
        {overs.length === 0 ? (
          <EmptyState
            icon="cricket-bat"
            title="No balls yet"
            message={`Nothing has been bowled in innings ${innings}. Deliveries appear here as the scorer records them.`}
          />
        ) : (
          overs.map((over) => (
            <View key={over.overNumber}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F97316' }}>
                <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, color: '#0B0B0B' }}>
                  Over {over.overNumber}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.1 * 10, textTransform: 'uppercase', color: '#0B0B0B' }}>
                  {[over.bowlerName, `${over.runs} runs`, over.wickets ? `${over.wickets} w` : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {over.balls.map((b) => (
                <BallRow key={b._id} b={b} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
