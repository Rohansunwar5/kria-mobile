import { useCallback, useEffect, useState } from 'react';
import { getCareerProfile, type CareerProfile } from '@/api/career';

/**
 * Fetches one player's career profile.
 *
 * Deliberately local state rather than a Redux slice: this is read-only data
 * the server already caches for 300s, scoped to whichever screen is showing
 * it. A slice would add a reducer, an action and a selector for a single GET.
 * Matches how player/[playerId].tsx already loads its profile.
 */
export function useCareer(playerId?: string) {
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    setError(false);
    try {
      setProfile(await getCareerProfile(playerId));
    } catch {
      // The card owns the retry, so the hook only records that it failed.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, loading, error, reload: load };
}
