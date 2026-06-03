import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getCategoryBracket, BracketResponse } from '@/api/match';
import { visibleRounds, leagueStandings } from '@/lib/bracketView';
import { MatchCard } from '@/components/bracket/MatchCard';
import { RoundSelector } from '@/components/bracket/RoundSelector';
import { StandingsTable } from '@/components/bracket/StandingsTable';
import { FixturesList } from '@/components/bracket/FixturesList';
import { BracketEmpty, TeamLeagueNotice } from '@/components/bracket/BracketNotices';

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-white/10 px-4 py-3">
      <Pressable onPress={onBack} className="rounded-full bg-white/10 px-3 py-1.5">
        <Text className="font-montserrat text-sm text-white">‹ Back</Text>
      </Pressable>
      <Text className="flex-1 font-oswald text-base font-bold uppercase text-white">Bracket</Text>
    </View>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#111111' }}>
      <View className="flex-1 bg-ink">{children}</View>
    </SafeAreaView>
  );
}

export default function BracketScreen() {
  const { categoryId, type } = useLocalSearchParams<{ tournamentId: string; categoryId: string; type?: string }>();
  const router = useRouter();
  const [data, setData] = useState<BracketResponse | null>(null);
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

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };
  const back = () => router.back();

  if (loading) {
    return (
      <Frame>
        <BackBar onBack={back} />
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#F97316" size="large" /></View>
      </Frame>
    );
  }

  if (type === 'team_league') {
    return <Frame><BackBar onBack={back} /><TeamLeagueNotice /></Frame>;
  }

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />;

  if (error || !data || data.matches.length === 0) {
    return (
      <Frame>
        <BackBar onBack={back} />
        <ScrollView refreshControl={refresh} contentContainerStyle={{ flexGrow: 1 }}>
          <BracketEmpty />
        </ScrollView>
      </Frame>
    );
  }

  if (type === 'league') {
    return (
      <Frame>
        <BackBar onBack={back} />
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16, gap: 16 }}>
          <StandingsTable standings={leagueStandings(data.matches, data.competitorType)} competitorType={data.competitorType} />
          <FixturesList matches={data.matches} competitorType={data.competitorType} />
        </ScrollView>
      </Frame>
    );
  }

  // knockout (default for knockout / round_robin / group_knockout / hybrid / absent)
  const vis = visibleRounds(data.rounds);
  const roundNames = vis.map((r) => r.name);
  const current = activeRound && roundNames.includes(activeRound) ? activeRound : roundNames[0];
  const round = vis.find((r) => r.name === current);

  return (
    <Frame>
      <BackBar onBack={back} />
      <RoundSelector rounds={roundNames} active={current} onSelect={setActiveRound} />
      <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {round && (
          <>
            <Text className="font-oswald text-sm uppercase tracking-widest text-gray-500">
              {round.name} · {round.matches.length} match{round.matches.length !== 1 ? 'es' : ''}
            </Text>
            {round.matches.map((m) => <MatchCard key={m._id} match={m} competitorType={data.competitorType} />)}
          </>
        )}
      </ScrollView>
    </Frame>
  );
}
