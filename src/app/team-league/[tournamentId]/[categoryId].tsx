import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { useTeamLeague } from '@/lib/useTeamLeague';
import { detectChampion } from '@/lib/teamLeagueView';
import { getTiesByGroup, getTieDetails, Group, Tie, SubMatch, Lineup } from '@/api/teamLeague';
import { StageSelector, ViewSegment, TLView } from '@/components/teamleague/TeamLeagueControls';
import { StandingsTable } from '@/components/teamleague/StandingsTable';
import { ChampionBanner } from '@/components/teamleague/TeamLeagueStates';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Lbl } from '@/components/canvas';
import { Skeleton, ErrorBlock, EmptyState } from '@/components/states';
import { GroupList } from '@/components/teamleague/GroupList';
import { TieList } from '@/components/teamleague/TieList';
import { TieDetail } from '@/components/teamleague/TieDetail';

function Header({ onBack, sub }: { onBack: () => void; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={19} color="#fff" strokeWidth={2.3} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>Team league</Text>
        {sub ? (
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
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
  const category = categories.find((c) => c._id === categoryId);
  const slots = category?.teamLeagueConfig?.subTeamSlots ?? [];
  // Teams above this line advance out of the group.
  const topN = category?.teamLeagueConfig?.topNPerGroup;
  const sub = [category?.name, groups.length ? `${groups.length} groups` : null].filter(Boolean).join(' · ');
  const myRegistrations = useAppSelector((s) => s.registration.myRegistrations);
  const myTeamId = myRegistrations.find((r) => r.categoryId === categoryId)?.teamId;

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
      <Screen>
        <Header onBack={back} sub={sub} />
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton h={10} w={80} line />
          <Skeleton h={180} />
          <Skeleton h={180} />
        </View>
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen>
        <Header onBack={back} sub={sub} />
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16 }}>
          <ErrorBlock label="League unavailable" message="The league tables could not be loaded. Pull to retry." onRetry={reload} />
        </ScrollView>
      </Screen>
    );
  }

  const stageChampion = detectChampion(standings);

  return (
    <Screen>
      <Header onBack={back} sub={sub} />
      <StageSelector maxStage={maxStage} stage={stage} onSelect={changeStage} />
      <ViewSegment value={view} onChange={changeView} />
      <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {view === 'overall' && (
          overall.length === 0 ? (
            <EmptyState
              icon="chart"
              title="No table yet"
              message="Standings appear once the first ties are played."
            />
          ) : (
            <>
              {overallChampion && <ChampionBanner teamName={overallChampion.teamName} />}
              <StandingsTable title="Overall standings" subtitle="All stages" entries={overall} championTeamId={overallChampion?.teamId} myTeamId={myTeamId} />
            </>
          )
        )}

        {view === 'standings' && (
          standings.length === 0 ? (
            <EmptyState
              icon="chart"
              title="No table yet"
              message="Group standings appear once the first ties in this stage are played."
            />
          ) : (
            <>
              {stageChampion && <ChampionBanner teamName={stageChampion.teamName} />}
              {standings.map((gs) => (
                <StandingsTable
                  key={gs.group._id}
                  title={gs.group.groupName}
                  subtitle={`${gs.completedTies}/${gs.totalTies} ties`}
                  entries={gs.standings}
                  qualifyCount={topN}
                  myTeamId={myTeamId}
                />
              ))}
            </>
          )
        )}

        {view === 'ties' && (
          selectedTie && tieDetail ? (
            <TieDetail tie={selectedTie} subMatches={tieDetail.subMatches} lineups={tieDetail.lineups} slots={slots} onBack={() => { setSelectedTie(null); setTieDetail(null); }} />
          ) : selectedTie && detailLoading ? (
            <View style={{ gap: 10 }}><Skeleton h={70} /><Skeleton h={70} /></View>
          ) : selectedGroup ? (
            <View style={{ gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to groups"
                onPress={() => { setSelectedGroup(null); setSelectedTie(null); }}
                hitSlop={10}
                style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}
              >
                <Icon name="chevron-left" size={13} color="#7d7d7d" strokeWidth={2.4} />
                <Lbl style={{ letterSpacing: 0.12 * 9 }}>{`Groups · ${selectedGroup.groupName}`}</Lbl>
              </Pressable>
              {tiesLoading ? (
                <View style={{ gap: 10 }}><Skeleton h={64} /><Skeleton h={64} /></View>
              ) : (
                <TieList ties={ties} onSelect={openTie} />
              )}
            </View>
          ) : (
            <GroupList groups={groups} standings={standings} onSelect={openGroup} />
          )
        )}
      </ScrollView>
    </Screen>
  );
}
