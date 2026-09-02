import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import API from '@/api/axios';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Skeleton, ErrorBlock, EmptyState, Ghost } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { getCategoryBracket, BracketResponse } from '@/api/match';
import { visibleRounds, leagueStandings, categorySport, getCompetitors } from '@/lib/bracketView';
import { MatchCard } from '@/components/bracket/MatchCard';
import { RoundSelector } from '@/components/bracket/RoundSelector';
import { StandingsTable } from '@/components/bracket/StandingsTable';
import { FixturesList } from '@/components/bracket/FixturesList';

function Header({ sub }: { sub?: string }) {
  const router = useRouter();
  return (
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
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>The draw</Text>
        {sub ? (
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function BracketScreen() {
  const { tournamentId, categoryId, type } = useLocalSearchParams<{ tournamentId: string; categoryId: string; type?: string }>();
  const router = useRouter();
  const { categories, myRegistrations } = useAppSelector((s) => s.registration);
  const [data, setData] = useState<BracketResponse | null>(null);
  const [logoById, setLogoById] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRound, setActiveRound] = useState('');

  const load = useCallback(async () => {
    if (!categoryId) return;
    try {
      const res = await getCategoryBracket(categoryId);
      setData(res);
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

  // Team logos live on the team records, not on the bracket payload — fetch them
  // once and build an id → logo map for the match cards. Best-effort.
  useEffect(() => {
    if (!tournamentId) return;
    let active = true;
    (async () => {
      try {
        const res = await API.get(`/tournaments/${tournamentId}/teams`);
        const teams = (res.data?.data?.data || res.data?.data || []) as { _id: string; logo?: string }[];
        if (!active) return;
        const map: Record<string, string | undefined> = {};
        teams.forEach((t) => {
          map[t._id] = t.logo;
        });
        setLogoById(map);
      } catch {
        // logos are optional; ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [tournamentId]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };
  const refresh = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />;
  const category = categories.find((c) => c._id === categoryId);
  const sub = [category?.name, category?.bracketType?.replace('_', ' ')].filter(Boolean).join(' · ');

  if (loading) {
    return (
      <Screen>
        <Header sub={sub} />
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton h={132} />
          <Skeleton h={132} />
        </View>
      </Screen>
    );
  }

  if (type === 'team_league') {
    return (
      <Screen>
        <Header sub={sub} />
        <EmptyState
          icon="bracket"
          title="Played as a league"
          message="This category runs as group stages and ties rather than a knockout draw."
          cta="Open the league table"
          onCta={() =>
            router.replace({ pathname: '/team-league/[tournamentId]/[categoryId]', params: { tournamentId, categoryId } })
          }
        />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <Header sub={sub} />
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16 }}>
          <ErrorBlock label="Draw unavailable" message="The draw could not be loaded. Pull to retry." onRetry={load} />
        </ScrollView>
      </Screen>
    );
  }

  if (data.matches.length === 0) {
    return (
      <Screen>
        <Header sub={sub} />
        <ScrollView refreshControl={refresh} contentContainerStyle={{ flexGrow: 1 }}>
          <EmptyState
            icon="bracket"
            title="Not drawn yet"
            message="The draw is published once entry closes — and after the auction, for categories that have one."
          />
        </ScrollView>
      </Screen>
    );
  }

  const sport = categorySport(data.matches);
  // Registration ids the signed-in player holds, so their own match stands out.
  const mine = new Set(myRegistrations.map((r) => r._id));
  const isMine = (m: (typeof data.matches)[number]) => {
    const { c1, c2 } = getCompetitors(m, data.competitorType);
    return mine.has(c1.id) || mine.has(c2.id);
  };

  if (type === 'league') {
    return (
      <Screen>
        <Header sub={sub} />
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16, gap: 16 }}>
          <StandingsTable standings={leagueStandings(data.matches, data.competitorType)} competitorType={data.competitorType} />
          <FixturesList matches={data.matches} competitorType={data.competitorType} />
        </ScrollView>
      </Screen>
    );
  }

  const vis = visibleRounds(data.rounds);
  const roundNames = vis.map((r) => r.name);
  const current = activeRound && roundNames.includes(activeRound) ? activeRound : roundNames[0];
  const round = vis.find((r) => r.name === current);

  return (
    <Screen>
      <Header sub={sub} />
      <RoundSelector rounds={roundNames} active={current} onSelect={setActiveRound} />
      <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Ghost text={current || ''} size={120} style={{ right: -30, top: 120 }} />
        {round?.matches.map((m) => (
          <View key={m._id}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginBottom: 8 }}>
              {round.name} · Match {m.matchNumber}
            </Text>
            <MatchCard
              match={m}
              competitorType={data.competitorType}
              logoById={logoById}
              sport={sport}
              isMine={isMine(m)}
            />
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
