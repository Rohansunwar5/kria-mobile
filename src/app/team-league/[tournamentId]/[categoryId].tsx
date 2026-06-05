import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { useTeamLeague } from '@/lib/useTeamLeague';
import { detectChampion } from '@/lib/teamLeagueView';
import { getTiesByGroup, getTieDetails, Group, Tie, SubMatch, Lineup } from '@/api/teamLeague';
import { StageSelector, ViewSegment, TLView } from '@/components/teamleague/TeamLeagueControls';
import { StandingsTable } from '@/components/teamleague/StandingsTable';
import { ChampionBanner, TeamLeagueEmpty, TeamLeagueError } from '@/components/teamleague/TeamLeagueStates';
import { GroupList } from '@/components/teamleague/GroupList';
import { TieList } from '@/components/teamleague/TieList';
import { TieDetail } from '@/components/teamleague/TieDetail';

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-white/10 px-4 py-3">
      <Pressable onPress={onBack} className="rounded-full bg-white/10 px-3 py-1.5">
        <Text className="font-montserrat text-sm text-white">‹ Back</Text>
      </Pressable>
      <Text className="flex-1 font-oswald text-base font-bold uppercase text-white">Team League</Text>
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

export default function TeamLeagueScreen() {
  const { categoryId } = useLocalSearchParams<{ tournamentId: string; categoryId: string }>();
  const router = useRouter();
  const { groups, standings, overall, overallChampion, stage, maxStage, setStage, loading, error, reload } = useTeamLeague(categoryId);
  const [view, setView] = useState<TLView>('overall');
  const [refreshing, setRefreshing] = useState(false);

  // Drill-down state (ties view).
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [ties, setTies] = useState<Tie[]>([]);
  const [tiesLoading, setTiesLoading] = useState(false);
  const [selectedTie, setSelectedTie] = useState<Tie | null>(null);
  const [tieDetail, setTieDetail] = useState<{ subMatches: SubMatch[]; lineups: Lineup[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Slot labels come from the category config already in the registration slice.
  const categories = useAppSelector((s) => s.registration.categories);
  const slots = categories.find((c) => c._id === categoryId)?.teamLeagueConfig?.subTeamSlots ?? [];

  const resetDrill = () => { setSelectedGroup(null); setSelectedTie(null); setTieDetail(null); };

  const openGroup = async (g: Group) => {
    setSelectedGroup(g);
    setSelectedTie(null);
    setTieDetail(null);
    setTiesLoading(true);
    try { setTies(await getTiesByGroup(g._id)); } catch { setTies([]); } finally { setTiesLoading(false); }
  };

  const openTie = async (t: Tie) => {
    setSelectedTie(t);
    setTieDetail(null);
    setDetailLoading(true);
    try {
      const d = await getTieDetails(t._id);
      setTieDetail({ subMatches: d.subMatches, lineups: d.lineups });
    } catch {
      setTieDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const changeView = (v: TLView) => { setView(v); resetDrill(); };
  const changeStage = (s: number) => { setStage(s); resetDrill(); };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    if (selectedTie) {
      try {
        const d = await getTieDetails(selectedTie._id);
        setTieDetail({ subMatches: d.subMatches, lineups: d.lineups });
      } catch { /* keep last */ }
    }
    setRefreshing(false);
  }, [reload, selectedTie]);

  const back = () => router.back();
  const refresh = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />;

  if (loading) {
    return (
      <Frame>
        <BackBar onBack={back} />
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#F97316" size="large" /></View>
      </Frame>
    );
  }
  if (error) {
    return (
      <Frame>
        <BackBar onBack={back} />
        <ScrollView refreshControl={refresh} contentContainerStyle={{ flexGrow: 1 }}><TeamLeagueError /></ScrollView>
      </Frame>
    );
  }

  const stageChampion = detectChampion(standings);

  return (
    <Frame>
      <BackBar onBack={back} />
      <StageSelector maxStage={maxStage} stage={stage} onSelect={changeStage} />
      <ViewSegment value={view} onChange={changeView} />
      <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {view === 'overall' && (
          overall.length === 0 ? (
            <TeamLeagueEmpty message="No standings data yet." />
          ) : (
            <>
              {overallChampion && <ChampionBanner teamName={overallChampion.teamName} />}
              <StandingsTable title="Overall Standings" subtitle="All stages combined" entries={overall} championTeamId={overallChampion?.teamId} />
            </>
          )
        )}

        {view === 'standings' && (
          standings.length === 0 ? (
            <TeamLeagueEmpty message="No standings data yet." />
          ) : (
            <>
              {stageChampion && <ChampionBanner teamName={stageChampion.teamName} />}
              {standings.map((gs) => (
                <StandingsTable key={gs.group._id} title={gs.group.groupName} subtitle={`${gs.completedTies}/${gs.totalTies} ties`} entries={gs.standings} />
              ))}
            </>
          )
        )}

        {view === 'ties' && (
          selectedTie && tieDetail ? (
            <TieDetail tie={selectedTie} subMatches={tieDetail.subMatches} lineups={tieDetail.lineups} slots={slots} onBack={() => { setSelectedTie(null); setTieDetail(null); }} />
          ) : selectedTie && detailLoading ? (
            <View className="py-10"><ActivityIndicator color="#F97316" /></View>
          ) : selectedGroup ? (
            <View className="gap-3">
              <Pressable onPress={() => { setSelectedGroup(null); setSelectedTie(null); }} className="self-start">
                <Text className="font-montserrat text-sm text-gray-400">‹ Groups · {selectedGroup.groupName}</Text>
              </Pressable>
              {tiesLoading ? <View className="py-10"><ActivityIndicator color="#F97316" /></View> : <TieList ties={ties} onSelect={openTie} />}
            </View>
          ) : (
            <GroupList groups={groups} standings={standings} onSelect={openGroup} />
          )
        )}
      </ScrollView>
    </Frame>
  );
}
