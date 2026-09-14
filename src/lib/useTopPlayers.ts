import { useCallback, useEffect, useRef, useState } from 'react';
import { getTopPlayers, type RankedPlayer } from '@/api/rankings';

/**
 * Fetches the top-players leaderboard for one sport.
 *
 * Deliberately local state rather than a Redux slice: this is read-only data
 * scoped to whichever screen is showing it, same reasoning as `useCareer` —
 * a slice would add a reducer, an action and a selector for a single GET.
 *
 * Reloads whenever `sport` changes, so a tab switch on the leaderboard screen
 * refetches without the caller having to call `reload` itself.
 *
 * Also clears `players` the instant `sport` changes (before the new list
 * arrives) so the previous sport's rows never render for a moment under the
 * new sport's chip. A manual `reload()` of the SAME sport is deliberately
 * left alone — clearing there would make an ordinary pull-to-refresh flash
 * the list empty, which nothing asked for.
 */
export function useTopPlayers(sport: string) {
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const prevSport = useRef(sport);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      setPlayers(await getTopPlayers(sport));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [sport]);

  useEffect(() => {
    if (prevSport.current !== sport) {
      prevSport.current = sport;
      setPlayers([]);
    }
    load();
  }, [load, sport]);

  return { players, loading, error, reload: load };
}
