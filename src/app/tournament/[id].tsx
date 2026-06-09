import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTournament } from '@/store/slices/tournamentSlice';
import { fetchTournamentCategories, fetchMyRegistrations } from '@/store/slices/registrationSlice';
import { fetchTournamentTeams } from '@/store/slices/teamSlice';
import { TournamentHero } from '@/components/tournament/TournamentHero';
import { DetailTabBar } from '@/components/tournament/DetailTabBar';
import { OverviewTab } from '@/components/tournament/OverviewTab';
import { AwardsTab } from '@/components/tournament/AwardsTab';
import { CategoriesTab } from '@/components/tournament/CategoriesTab';
import { PlayersTab } from '@/components/tournament/PlayersTab';
import { TeamsTab } from '@/components/tournament/TeamsTab';
import { AuctionTab } from '@/components/tournament/AuctionTab';
import { BracketTab } from '@/components/tournament/BracketTab';
import { TeamLeagueTab } from '@/components/tournament/TeamLeagueTab';
import { LiveNowBanner } from '@/components/tournament/LiveNowBanner';

type TabKey = 'overview' | 'categories' | 'auction' | 'bracket' | 'teamLeague' | 'players' | 'teams' | 'awards';

export default function TournamentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentTournament: tournament, isLoading, error } = useAppSelector((s) => s.tournament);
  const { categories, myRegistrations, isLoading: isRegLoading } = useAppSelector((s) => s.registration);
  const hasTeamLeague = categories.some((c) => c.bracketType === 'team_league');
  const TABS: TabKey[] = ['overview', 'categories', 'auction', 'bracket', ...(hasTeamLeague ? (['teamLeague'] as TabKey[]) : []), 'players', 'teams', 'awards'];
  const { teams, isLoading: isTeamsLoading } = useAppSelector((s) => s.team);
  const { user } = useAppSelector((s) => s.auth);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (id) {
      dispatch(fetchTournament(id));
      dispatch(fetchTournamentCategories(id));
      dispatch(fetchTournamentTeams(id));
    }
  }, [dispatch, id]);

  useEffect(() => { if (user) dispatch(fetchMyRegistrations()); }, [dispatch, user]);

  const myTeamAssignment = user
    ? myRegistrations.find((r) => r.tournamentId === id && (r.status === 'auctioned' || r.status === 'assigned') && r.teamId)
    : undefined;
  const myTeam = myTeamAssignment && teams.length > 0 ? teams.find((t) => t._id === myTeamAssignment.teamId) ?? null : null;
  const isTeamDataReady = !isRegLoading && !isTeamsLoading;

  if (isLoading || !tournament) {
    return <Screen><View className="flex-1 items-center justify-center"><ActivityIndicator color="#F97316" size="large" /></View></Screen>;
  }
  if (error) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-4 font-montserrat text-red-400">{error}</Text>
          <Pressable onPress={() => router.back()} className="rounded-full bg-white/10 px-6 py-2">
            <Text className="font-montserrat text-white">Go back</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero + Live-Now banner wrapped as one child so the sticky tab bar stays at index 1 */}
        <View>
          <TournamentHero tournament={tournament} onBack={() => router.back()} />
          {/* Live-Now banner (cricket only) */}
          {id && <LiveNowBanner tournamentId={id} sport={tournament.sport} />}
        </View>

        {/* Sticky tab bar */}
        <DetailTabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {/* Tab content */}
        {activeTab === 'overview' && (
          <OverviewTab tournament={tournament} user={user} myTeam={myTeam} myTeamAssignment={myTeamAssignment} isTeamDataReady={isTeamDataReady} />
        )}
        {activeTab === 'categories' && id && (
          <CategoriesTab tournamentId={id} tournamentStatus={tournament.status} />
        )}
        {activeTab === 'auction' && id && (
          <AuctionTab tournamentId={id} categories={categories} />
        )}
        {activeTab === 'bracket' && id && (
          <BracketTab tournamentId={id} categories={categories} />
        )}
        {activeTab === 'teamLeague' && id && (
          <TeamLeagueTab tournamentId={id} categories={categories} />
        )}
        {activeTab === 'players' && <PlayersTab />}
        {activeTab === 'teams' && <TeamsTab myTeam={myTeam} />}
        {activeTab === 'awards' && <AwardsTab awards={tournament.awards || []} />}
      </ScrollView>
    </Screen>
  );
}
