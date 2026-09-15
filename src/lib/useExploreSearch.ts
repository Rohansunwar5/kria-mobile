import { useCallback, useEffect, useRef, useState } from 'react';
import { searchPlayers, type PlayerHit } from '@/api/playerSearch';
import { searchTournaments, type TournamentHit } from '@/api/tournaments';

// The server 422s below this, so firing at all would only ever fail.
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

export function useExploreSearch() {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<PlayerHit[]>([]);
  const [tournaments, setTournaments] = useState<TournamentHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const epochRef = useRef(0);
  const isMountedRef = useRef(true);

  const search = useCallback(async (q: string) => {
    const epoch = ++epochRef.current;

    if (q.trim().length < MIN_QUERY_LENGTH) {
      setPlayers([]);
      setTournaments([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [playerHits, tournamentHits] = await Promise.all([searchPlayers(q), searchTournaments(q)]);
      // A short query resolving slowly after a longer one is routine with a
      // debounced search. Without this guard the user would see results for
      // text they have already replaced.
      if (epoch !== epochRef.current || !isMountedRef.current) return;

      setPlayers(playerHits);
      setTournaments(tournamentHits);
      setError(null);
    } catch {
      if (epoch !== epochRef.current || !isMountedRef.current) return;

      // An empty result and a failed request must not look the same, so a
      // failure clears both lists AND sets an error rather than leaving
      // stale rows that claim to be current.
      setPlayers([]);
      setTournaments([]);
      setError('Could not load results.');
    } finally {
      if (epoch === epochRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      epochRef.current = 0;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void search(query); }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, search]);

  return { query, setQuery, players, tournaments, loading, error };
}
