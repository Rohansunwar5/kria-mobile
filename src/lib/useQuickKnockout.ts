import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { acquireSocket, releaseSocket, socket } from '@/lib/socket';
import {
  addKnockoutPlayer, cancelQuickKnockout, drawQuickKnockout, getQuickKnockout, grantKnockoutAward,
  pairKnockoutPlayers, removeKnockoutPlayer, startQuickKnockout, unpairKnockoutPlayers, type QuickKnockout,
} from '@/api/quickKnockout';

const serverMessage = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Something went wrong. Please try again.';

/**
 * One quick knockout plus the host's actions, live. Same shape as
 * useQuickMatch: each action adopts the knockout its endpoint returns, and the
 * server pushes every save as `knockout:update` (QuickKnockoutService.persist).
 */
export function useQuickKnockout(id?: string) {
  const [knockout, setKnockout] = useState<QuickKnockout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      setKnockout(await getQuickKnockout(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!id) return;
    const onUpdate = (payload?: { knockout?: QuickKnockout }) => {
      const next = payload?.knockout;
      if (!next || next._id !== id) return;
      // The push never carries the code; keep the one our own read returned.
      setKnockout((prev) => ({ ...next, joinCode: prev?.joinCode ?? next.joinCode }));
    };
    const join = () => socket.emit('join:match', { matchId: id });
    const onConnect = () => { join(); load(); };

    acquireSocket();
    join();
    socket.on('knockout:update', onUpdate);
    socket.on('connect', onConnect);
    return () => {
      socket.emit('leave:match', { matchId: id });
      socket.off('knockout:update', onUpdate);
      socket.off('connect', onConnect);
      releaseSocket();
    };
  }, [id, load]);

  const run = useCallback(async (action: () => Promise<QuickKnockout>) => {
    setBusy(true);
    setProblem('');
    try {
      const next = await action();
      setKnockout((prev) => ({ ...next, joinCode: next.joinCode ?? prev?.joinCode }));
    } catch (err) {
      setProblem(serverMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const withId = useCallback(
    (fn: (knockoutId: string) => Promise<QuickKnockout>) => (id ? run(() => fn(id)) : Promise.resolve()),
    [id, run],
  );

  return {
    knockout, loading, error, busy, problem, reload: load,
    addGuest: (displayName: string) => withId((k) => addKnockoutPlayer(k, { displayName })),
    addPlayer: (playerId: string) => withId((k) => addKnockoutPlayer(k, { playerId })),
    removePlayer: (playerKey: string) => withId((k) => removeKnockoutPlayer(k, playerKey)),
    pair: (a: string, b: string) => withId((k) => pairKnockoutPlayers(k, [a, b])),
    unpair: (pairId: string) => withId((k) => unpairKnockoutPlayers(k, pairId)),
    draw: () => withId(drawQuickKnockout),
    start: () => withId(startQuickKnockout),
    cancel: () => withId(cancelQuickKnockout),
    award: (playerId: string, badge: string) => withId((k) => grantKnockoutAward(k, { playerId, badge })),
  };
}
