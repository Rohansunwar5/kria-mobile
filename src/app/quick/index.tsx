import { useCallback, useState } from 'react';
import { ScrollView, View, Text, Pressable, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Skeleton, EmptyState, ErrorBlock } from '@/components/states';
import { Tag } from '@/components/StatusPill';
import { listMyQuickMatches, type QuickMatch } from '@/api/quickMatch';
import { formatLabel, isHost, outcomeLabel, statusVariant } from '@/lib/quickMatchView';
import { useAppSelector } from '@/store/hooks';

const LBL = {
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: '#7d7d7d',
};

function MatchRow({ match, playerId }: { match: QuickMatch; playerId?: string }) {
  const result = outcomeLabel(match);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/quick/[id]', params: { id: match._id } })}
      style={{
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 6,
        backgroundColor: '#151515',
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Tag label={match.status} variant={statusVariant(match.status)} dot={match.status === 'live'} />
        <Text style={LBL}>{isHost(match, playerId) ? 'hosting' : 'playing'}</Text>
      </View>
      <Text
        style={{
          fontFamily: 'Anton_400Regular',
          textTransform: 'uppercase',
          fontSize: 18,
          color: '#fff',
          marginTop: 8,
        }}
      >
        {`${match.sides[0].name} v ${match.sides[1].name}`}
      </Text>
      <Text style={{ ...LBL, marginTop: 4 }}>{result ? `${formatLabel(match)} · ${result}` : formatLabel(match)}</Text>
    </Pressable>
  );
}

export default function QuickMatchesScreen() {
  const { user } = useAppSelector((s) => s.auth);
  const [matches, setMatches] = useState<QuickMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setMatches(await listMyQuickMatches());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 30, lineHeight: 36, color: '#fff' }}>
          Quick matches
        </Text>
        <Text style={{ ...LBL, color: '#F97316', marginTop: 3 }}>Play between tournaments</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Pressable
          onPress={() => router.push('/quick/new')}
          style={{ flex: 1, backgroundColor: '#F97316', borderRadius: 4, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.14 * 11, textTransform: 'uppercase', color: '#0B0B0B' }}>
            New match
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/quick/join')}
          style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.14 * 11, textTransform: 'uppercase', color: '#d4d4d4' }}>
            Join by code
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading && matches.length > 0} onRefresh={load} tintColor="#F97316" />}
      >
        {loading && matches.length === 0 ? (
          <View style={{ gap: 10 }}>
            <Skeleton h={92} />
            <Skeleton h={92} />
          </View>
        ) : null}

        {error && matches.length === 0 ? <ErrorBlock label="Quick matches" onRetry={load} /> : null}

        {!loading && !error && matches.length === 0 ? (
          <EmptyState
            title="No quick matches yet"
            message="Host a casual match, share the code, and it counts towards your career record."
            cta="New match"
            onCta={() => router.push('/quick/new')}
          />
        ) : null}

        {matches.map((match) => (
          <MatchRow key={match._id} match={match} playerId={user?._id} />
        ))}
      </ScrollView>
    </Screen>
  );
}
