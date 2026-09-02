import { useEffect, useState } from 'react';
import { View, ScrollView, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTournament } from '@/store/slices/tournamentSlice';
import { fetchTournamentCategories, fetchMyRegistrations } from '@/store/slices/registrationSlice';
import { fetchTournamentTeams } from '@/store/slices/teamSlice';
import { TournamentHero } from '@/components/tournament/TournamentHero';
import { DetailTabBar } from '@/components/tournament/DetailTabBar';
import { OverviewTab } from '@/components/tournament/OverviewTab';
import { DrawTab } from '@/components/tournament/DrawTab';
import { TeamsTab } from '@/components/tournament/TeamsTab';
import { InfoTab } from '@/components/tournament/InfoTab';
import { LiveNowBanner } from '@/components/tournament/LiveNowBanner';
import { Skeleton, ErrorBlock } from '@/components/states';

// Eight tabs collapsed to four. Draw absorbs auction + bracket + team league,
// Info absorbs awards, Players folds into Teams.
const TABS = ['overview', 'draw', 'teams', 'info'] as const;
type TabKey = (typeof TABS)[number];

const LABELS: Record<TabKey, string> = {
  overview: 'Overview',
  draw: 'Draw',
  teams: 'Teams',
  info: 'Info',
};

export default function TournamentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentTournament: tournament, isLoading, error } = useAppSelector((s) => s.tournament);
  const { categories, myRegistrations, isLoading: isRegLoading } = useAppSelector((s) => s.registration);
  const { teams, isLoading: isTeamsLoading } = useAppSelector((s) => s.team);
  const { user } = useAppSelector((s) => s.auth);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const load = () => {
    if (!id) return;
    dispatch(fetchTournament(id));
    dispatch(fetchTournamentCategories(id));
    dispatch(fetchTournamentTeams(id));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  useEffect(() => {
    if (user) dispatch(fetchMyRegistrations());
  }, [dispatch, user]);

  const myTeamAssignment = user
    ? myRegistrations.find((r) => r.tournamentId === id && (r.status === 'auctioned' || r.status === 'assigned') && r.teamId)
    : undefined;
  const myTeam = myTeamAssignment && teams.length > 0 ? teams.find((t) => t._id === myTeamAssignment.teamId) ?? null : null;
  const isTeamDataReady = !isRegLoading && !isTeamsLoading;

  // First load with nothing cached. The hero geometry is held by skeletons so
  // the tab bar does not jump when the name arrives.
  if (!tournament && isLoading) {
    return (
      <Screen>
        <Skeleton h={262} style={{ borderRadius: 0, borderWidth: 0 }} />
        <View style={{ padding: 16, gap: 7 }}>
          <Skeleton h={62} />
          <Skeleton h={62} />
        </View>
      </Screen>
    );
  }

  // No tournament at all — nothing to keep on screen, so this is the one place
  // a full-screen failure is honest.
  if (!tournament) {
    return (
      <Screen>
        <View style={{ padding: 16, paddingTop: 60 }}>
          <ErrorBlock
            label="Tournament unavailable"
            message={error || 'This tournament could not be loaded. It may have been removed.'}
            onRetry={load}
          />
        </View>
      </Screen>
    );
  }

  const share = () =>
    Share.share({ message: `${tournament.name} on Kria — ${tournament.venue?.city || ''}`.trim() });

  return (
    <Screen>
      <ScrollView stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero + live banner are one child so the sticky tab bar stays at index 1 */}
        <View>
          <TournamentHero
            tournament={tournament}
            categoryCount={categories.length}
            onBack={() => router.back()}
            onShare={share}
            onAnnouncements={() => router.push({ pathname: '/tournament/[id]/announcements', params: { id } })}
          />
          {id ? <LiveNowBanner tournamentId={id} sport={tournament.sport} /> : null}
        </View>

        <DetailTabBar tabs={TABS} active={activeTab} onChange={setActiveTab} labels={LABELS} />

        {/* A failed sub-resource is scoped to its own tab — the hero, tabs and
            back button stay usable. */}
        {activeTab === 'overview' && id ? (
          <OverviewTab
            tournamentId={id}
            tournamentStatus={tournament.status}
            categories={categories}
            myRegistrations={myRegistrations}
            myTeam={myTeam}
            myTeamAssignment={myTeamAssignment}
            isTeamDataReady={isTeamDataReady}
            isLoading={isRegLoading}
            user={user}
          />
        ) : null}

        {activeTab === 'draw' && id ? (
          <DrawTab tournamentId={id} categories={categories} isLoading={isRegLoading} sport={tournament.sport} />
        ) : null}

        {activeTab === 'teams' ? <TeamsTab myTeam={myTeam} /> : null}

        {activeTab === 'info' ? <InfoTab tournament={tournament} awards={tournament.awards || []} /> : null}
      </ScrollView>
    </Screen>
  );
}
