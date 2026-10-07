import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { acquireSocket, releaseSocket, socket } from '@/lib/socket';
import {
  cancelQuickMatch,
  getQuickMatch,
  recordQuickBall,
  recordQuickLineup,
  recordQuickPoint,
  recordQuickToss,
  startQuickMatch,
  removeQuickMatchPlayer,
  undoQuickBall,
  undoQuickPoint,
  type BallEntry,
  type QuickCricketLineupEntry,
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
 * Liveness: the server pushes every saved change to the match room as
 * `quick:update` (QuickMatchService._broadcast), so a joined player or a
 * spectator sees each point as the host scores it. Focus and pull-to-refresh
 * still re-read, and a reconnect re-reads too, because whatever was pushed
 * while the connection was down is gone.
 */
export function useQuickMatch(id?: string) {
  const [match, setMatch] = useState<QuickMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  // Why the last action was refused ('' when it was not). A refused undo
  // otherwise looks like a button that does nothing.
  const [problem, setProblem] = useState('');

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

  useEffect(() => {
    if (!id) return;
    const onUpdate = (payload?: { match?: QuickMatch }) => {
      const next = payload?.match;
      if (!next || next._id !== id) return;
      // The push never carries the join code (any socket can join a match
      // room), so the host keeps the one their own read returned.
      setMatch((prev) => ({ ...next, joinCode: prev?.joinCode ?? next.joinCode }));
    };
    const join = () => socket.emit('join:match', { matchId: id });
    const onConnect = () => {
      join();
      load();
    };

    acquireSocket();
    join();
    socket.on('quick:update', onUpdate);
    socket.on('connect', onConnect);

    return () => {
      socket.emit('leave:match', { matchId: id });
      socket.off('quick:update', onUpdate);
      socket.off('connect', onConnect);
      releaseSocket();
    };
  }, [id, load]);

  /** Runs one host action and adopts the match it returns. `busy` disables
   *  every control while it is in flight, so a double tap cannot score twice —
   *  there is no optimistic-concurrency guard on the server. */
  const run = useCallback(async (action: () => Promise<QuickMatch>) => {
    setBusy(true);
    setProblem('');
    try {
      setMatch(await action());
    } catch (err) {
      // The server refused (a completed match, a spent snapshot). Say why,
      // and re-read rather than leaving the screen showing state the server rejected.
      setProblem((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Something went wrong. Please try again.');
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

  const start = useCallback(() => {
    if (!id) return;
    return run(() => startQuickMatch(id));
  }, [id, run]);

  const cancel = useCallback(() => {
    if (!id) return;
    return run(() => cancelQuickMatch(id));
  }, [id, run]);

  const removePlayer = useCallback((playerId: string) => {
    if (!id) return;
    return run(() => removeQuickMatchPlayer(id, playerId));
  }, [id, run]);

  const toss = useCallback((input: { winnerSideId: string; decision: 'bat' | 'bowl' }) => {
    if (!id) return;
    return run(() => recordQuickToss(id, input));
  }, [id, run]);

  const lineup = useCallback((input: { sideId: string; players: QuickCricketLineupEntry[] }) => {
    if (!id) return;
    return run(() => recordQuickLineup(id, input));
  }, [id, run]);

  const ball = useCallback((entry: BallEntry) => {
    if (!id) return;
    return run(() => recordQuickBall(id, entry));
  }, [id, run]);

  const undoBall = useCallback(() => {
    if (!id) return;
    return run(() => undoQuickBall(id));
  }, [id, run]);

  return {
    match, loading, error, busy, problem, reload: load,
    point, undo, start, cancel, removePlayer,
    toss, lineup, ball, undoBall,
  };
}
