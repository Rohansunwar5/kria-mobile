import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTournament } from '@/store/slices/tournamentSlice';
import { fetchTournamentCategories, fetchMyRegistrations } from '@/store/slices/registrationSlice';
import { fetchTournamentTeams } from '@/store/slices/teamSlice';
import { formatDate } from '@/lib/format';
import { OverviewTab } from '@/components/tournament/OverviewTab';
import { AwardsTab } from '@/components/tournament/AwardsTab';
import { CategoriesTab } from '@/components/tournament/CategoriesTab';
import { PlayersTab } from '@/components/tournament/PlayersTab';
import { TeamsTab } from '@/components/tournament/TeamsTab';
import { AuctionTab } from '@/components/tournament/AuctionTab';

type TabKey = 'overview' | 'categories' | 'auction' | 'players' | 'teams' | 'awards';
const TABS: TabKey[] = ['overview', 'categories', 'auction', 'players', 'teams', 'awards'];

export default function TournamentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentTournament: tournament, isLoading, error } = useAppSelector((s) => s.tournament);
  const { categories, myRegistrations, isLoading: isRegLoading } = useAppSelector((s) => s.registration);
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
      <ScrollView stickyHeaderIndices={[1]}>
        {/* Hero */}
        <View className="relative h-64 w-full">
          {tournament.bannerImage ? (
            <Image source={{ uri: tournament.bannerImage }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full bg-[#1a1a1a]" />
          )}
          <View className="absolute left-4 top-2">
            <Pressable onPress={() => router.back()} className="rounded-full bg-black/50 px-3 py-2">
              <Text className="font-montserrat text-sm text-white">‹ Back</Text>
            </Pressable>
          </View>
          <View className="absolute bottom-0 left-0 right-0 gap-2 px-5 pb-4">
            <View className="flex-row gap-2">
              <StatusPill status={tournament.status} />
              <View className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1">
                <Text className="font-montserrat text-[10px] font-bold uppercase text-white">{tournament.sport}</Text>
              </View>
            </View>
            <Text className="font-oswald text-4xl font-extrabold uppercase text-white">{tournament.name}</Text>
            <Text className="font-montserrat text-sm text-gray-200">
              {tournament.venue?.name} · {tournament.venue?.city}
            </Text>
            <Text className="font-montserrat text-xs text-gray-400">
              {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}
            </Text>
          </View>
        </View>

        {/* Sticky tab bar */}
        <View className="border-b border-white/10 bg-ink">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
            {TABS.map((tab) => (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} className={`rounded-xl px-5 py-2 ${activeTab === tab ? 'bg-white/10' : ''}`}>
                <Text className={`font-montserrat text-sm capitalize ${activeTab === tab ? 'text-white' : 'text-gray-400'}`}>{tab}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <OverviewTab description={tournament.description} user={user} myTeam={myTeam} myTeamAssignment={myTeamAssignment} isTeamDataReady={isTeamDataReady} />
        )}
        {activeTab === 'categories' && id && (
          <CategoriesTab tournamentId={id} tournamentStatus={tournament.status} />
        )}
        {activeTab === 'auction' && id && (
          <AuctionTab tournamentId={id} categories={categories} />
        )}
        {activeTab === 'players' && <PlayersTab />}
        {activeTab === 'teams' && <TeamsTab myTeam={myTeam} />}
        {activeTab === 'awards' && <AwardsTab awards={tournament.awards || []} />}
      </ScrollView>
    </Screen>
  );
}
