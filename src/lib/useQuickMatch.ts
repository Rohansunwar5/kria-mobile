import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  cancelQuickMatch,
  getQuickMatch,
  recordQuickPoint,
  removeQuickMatchPlayer,
  undoQuickPoint,
  type QuickMatch,
} from '@/api/quickMatch';

/**
 * One quick match, plus the host's actions over it.
 *
 * Local state rather than a Redux slice, matching `useCareer` and
 * `useTeamLeague`: a slice would add a reducer, actions and selectors for data
 * scoped to one screen.
 *
 * Every mutating endpoint returns the updated match, so each action sets state
 * from its own response — there is no refetch after a mutation and no window
 * where the screen shows a stale score.
 *
 * Liveness is refetch-on-focus plus the caller's pull-to-refresh. Quick matches
 * emit no socket events, and the host — the only person who can score — already
 * holds fresh state. `ponytail:` if a watching participant ever needs live
 * updates, the fix is server-side emits in the quick scoring services, not
 * polling here.
 */
export function useQuickMatch(id?: string) {
  const [match, setMatch] = useState<QuickMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      setMatch(await getQuickMatch(id));
    } catch {
      // The screen owns the retry, so the hook only records that it failed.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /** Runs one host action and adopts the match it returns. `busy` disables
   *  every control while it is in flight, so a double tap cannot score twice —
   *  there is no optimistic-concurrency guard on the server. */
  const run = useCallback(async (action: () => Promise<QuickMatch>) => {
    setBusy(true);
    try {
      setMatch(await action());
    } catch {
      // The server refused (a completed match, a spent snapshot). Re-read
      // rather than leaving the screen showing state the server rejected.
      await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  const point = useCallback((side: 1 | 2) => {
    if (!id) return;
    return run(() => recordQuickPoint(id, side));
  }, [id, run]);

  const undo = useCallback(() => {
    if (!id) return;
    return run(() => undoQuickPoint(id));
  }, [id, run]);

  const cancel = useCallback(() => {
    if (!id) return;
    return run(() => cancelQuickMatch(id));
  }, [id, run]);

  const removePlayer = useCallback((playerId: string) => {
    if (!id) return;
    return run(() => removeQuickMatchPlayer(id, playerId));
  }, [id, run]);

  return { match, loading, error, busy, reload: load, point, undo, cancel, removePlayer };
}
