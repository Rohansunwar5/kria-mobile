import { useCallback, useEffect, useRef, useState } from 'react';
import { searchPlayers, type PlayerHit } from '@/api/playerSearch';
import { searchTournaments, type TournamentHit } from '@/api/tournaments';
import { EMPTY_FILTERS, type Filters } from '@/lib/tournamentFilters';

// The server 422s below this, so firing at all would only ever fail.
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

/**
 * Filters are an INPUT to this hook, not a second fetch layered on top of it
 * by the screen. They used to live that way — the screen held its own
 * `filteredEvents` and called `searchTournaments` directly, bypassing the
 * epoch guard below entirely. That let a stale filtered response overwrite a
 * newer query (final-review I2) and let the two states drift so a filter
 * could still be "applied" over a list it no longer shaped (I4). Routing
 * filters through the same epoch-guarded `search()` as the query itself
 * removes the second source of truth: `tournaments` is always exactly what
 * the current `query` + `filters` pair produced, or is still in flight to
 * become.
 *
 * Query and filters share that one guarded `search()`, but NOT the same
 * timing. A query edit is a keystroke — still debounced. A filter change
 * (`setFilters`) is a deliberate Apply/Reset tap, and fires immediately:
 * routing it through the query's own debounce (an earlier version of this
 * fix did exactly that) made a button press wait out a keystroke delay it
 * was never subject to, and left a transient window where the badge already
 * showed the new count while the visible list was still the old one — the
 * same mismatch I4 targeted, just momentary instead of permanent.
 * `filtersRef` lets the debounced query effect (which only re-arms on
 * `query`) always read whichever filters are CURRENTLY applied when its
 * timer fires, without needing `filters` in its own dependency array —
 * that's what keeps a filter change from re-arming a second, redundant wait.
 */
export function useExploreSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const [players, setPlayers] = useState<PlayerHit[]>([]);
  const [tournaments, setTournaments] = useState<TournamentHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const epochRef = useRef(0);
  const isMountedRef = useRef(true);
  const filtersRef = useRef<Filters>(EMPTY_FILTERS);

  const search = useCallback(async (q: string, f: Filters) => {
    const epoch = ++epochRef.current;

    if (q.trim().length < MIN_QUERY_LENGTH) {
      setPlayers([]);
      setTournaments([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Cleared here, synchronously, and not just in the branches below: a
    // previous failure must not keep reading as current for the whole
    // debounce-plus-in-flight window of a retry the user has already typed.
    // This is about the START of a request, not the commit of its result, so
    // it is deliberately unguarded by the epoch check below — this call IS
    // the current epoch at the moment it runs.
    setError(null);
    try {
      const [playerHits, tournamentHits] = await Promise.all([searchPlayers(q), searchTournaments(q, f)]);
      // A short query resolving slowly after a longer one is routine with a
      // debounced search. Without this guard the user would see results for
      // text (or filters) they have already replaced. Filters flow through
      // this exact same guard as just another argument to `search` — there
      // is no second, unguarded fetch for them to bypass it through.
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
    };
  }, []);

  // Clearing the search box reads as "start over". The screen's own
  // `!hasQuery` branch already hides the whole results block — badge
  // included — at exactly this boundary, so a filter that survived past it
  // would be invisible and would silently reapply to whatever is typed
  // next. Reset at the fully-empty query rather than the 3-character search
  // floor: below the floor but above empty, the Events group (and the
  // filter control on it) stays visible per the I3 fix, so nothing is
  // hidden there and nothing needs resetting.
  useEffect(() => {
    if (query.trim().length === 0) {
      filtersRef.current = EMPTY_FILTERS;
      setFiltersState(EMPTY_FILTERS);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => { void search(query, filtersRef.current); }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, search]);

  // A deliberate Apply/Reset tap, unlike a query edit, must not wait out the
  // debounce above — it fires `search` immediately, through the same
  // epoch-guarded path, so the race protection is unchanged and only the
  // delay differs by trigger.
  const setFilters = useCallback((next: Filters) => {
    filtersRef.current = next;
    setFiltersState(next);
    void search(query, next);
  }, [query, search]);

  return { query, setQuery, filters, setFilters, players, tournaments, loading, error };
}
