import { useCallback, useEffect, useState } from 'react';
import { getCareerProfile, getRecentMatches, type CareerProfile, type RecentMatch } from '@/api/career';

/**
 * Fetches one player's career profile and their recent-matches feed.
 *
 * Deliberately local state rather than a Redux slice: this is read-only data
 * the server already caches for 300s, scoped to whichever screen is showing
 * it. A slice would add a reducer, an action and a selector for a single GET.
 * Matches how player/[playerId].tsx already loads its profile.
 *
 * Both are loaded here rather than from a second hook — the two render
 * together on both host screens, and a near-copy of this file for one more GET
 * would be the duplication, not the saving.
 *
 * `allSettled`, not `all`: the two are independent requests behind independent
 * cards, so a failing feed must not blank a career record that loaded fine.
 * That is what the separate `error` and `recentError` flags are for.
 */
export function useCareer(playerId?: string) {
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [recent, setRecent] = useState<RecentMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [recentError, setRecentError] = useState(false);

  const load = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    setError(false);
    setRecentError(false);

    const [profileResult, recentResult] = await Promise.allSettled([
      getCareerProfile(playerId),
      getRecentMatches(playerId),
    ]);

    // The cards own the retry, so the hook only records that it failed.
    if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
    else setError(true);

    if (recentResult.status === 'fulfilled') setRecent(recentResult.value);
    else setRecentError(true);

    setLoading(false);
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, recent, loading, error, recentError, reload: load };
}
