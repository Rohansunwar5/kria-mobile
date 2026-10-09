import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PlayPortal } from '@/components/home/PlayPortal';
import { listMyQuickKnockouts, type QuickKnockout } from '@/api/quickKnockout';
import { listMyQuickMatches, type QuickMatch } from '@/api/quickMatch';
import { latestTournaments } from '@/api/tournaments';
import { useCareer } from '@/lib/useCareer';
import { useLiveFeed } from '@/lib/useLiveFeed';
import { useAppSelector } from '@/store/hooks';
import type { Tournament } from '@/store/slices/tournamentSlice';

export default function Home() {
  const user = useAppSelector((s) => s.auth.user);
  const [matches, setMatches] = useState<QuickMatch[]>([]);
  const [knockouts, setKnockouts] = useState<QuickKnockout[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const career = useCareer(user?._id);
  const liveFeed = useLiveFeed();
  const refreshLive = liveFeed.refresh;

  // Loaded on every focus: live matches go stale while you are on another tab.
  const load = useCallback(async () => {
    // Side by side, each failing on its own: a failed list leaves the last good
    // one in place and never takes the others down with it.
    const [mine, knockoutsNow, latest] = await Promise.all([
      listMyQuickMatches().catch(() => null),
      listMyQuickKnockouts().catch(() => []),
      latestTournaments().catch(() => null),
    ]);
    if (mine) setMatches(mine);
    setKnockouts(knockoutsNow);
    if (latest) setTournaments(latest);
  }, []);

  useFocusEffect(useCallback(() => { load(); refreshLive(); }, [load, refreshLive]));

  return (
    <Screen>
      <PlayPortal
        profile={career.profile}
        liveFeed={liveFeed.items}
        tournaments={tournaments}
        recent={career.recent}
        matches={matches}
        knockouts={knockouts}
        playerId={user?._id}
        loading={career.loading}
        error={career.error}
        recentError={career.recentError}
        onRetry={career.reload}
      />
    </Screen>
  );
}
