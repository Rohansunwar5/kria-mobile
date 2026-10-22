import { useCallback, useEffect, useRef, useState } from 'react';
import { acquireSocket, releaseSocket, socket } from '@/lib/socket';
import { getMatch, getLiveState, getScorecard, CricketMatch, LiveState, Scorecard } from '@/api/cricketMatch';
import { tallyKey } from '@/lib/cricketView';

interface CricketState {
  match: CricketMatch | null;
  live: LiveState | null;
  scorecard: Scorecard | null;
  loading: boolean;
  error: boolean;
}

export function useCricketMatchSocket(matchId?: string) {
  const [state, setState] = useState<CricketState>({
    match: null,
    live: null,
    scorecard: null,
    loading: true,
    error: false,
  });
  const [connected, setConnected] = useState(true);
  const lastTally = useRef<string>('');
  const ready = useRef<boolean>(false);

  const loadScorecard = useCallback(async (id: string) => {
    try {
      const sc = await getScorecard(id);
      setState((s) => ({ ...s, scorecard: sc }));
    } catch {
      // keep last scorecard
    }
  }, []);

  const reload = useCallback(async () => {
    if (!matchId) return;
    try {
      const [match, live] = await Promise.all([
        getMatch(matchId),
        getLiveState(matchId).catch(() => null),
      ]);
      lastTally.current = tallyKey(live);
      ready.current = true;
      setState((s) => ({ ...s, match, live, loading: false, error: false }));
      await loadScorecard(matchId);
    } catch {
      setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, [matchId, loadScorecard]);

  useEffect(() => {
    if (!matchId) return;
    let active = true;

    const onBall = (payload: any) => {
      const live = payload?.liveState;
      // The socket is shared by every mounted board, so only this match's balls count.
      if (!live || !active || String(payload.ball?.matchId) !== matchId) return;
      const key = tallyKey(live);
      setState((s) => ({ ...s, live }));
      // The result (winnerId, margin) lives on the match, which this payload does not carry.
      if (payload.matchEnded) {
        reload();
        return;
      }
      if (ready.current && key !== lastTally.current) {
        lastTally.current = key;
        loadScorecard(matchId);
      }
    };
    const join = () => socket.emit('join:match', { matchId });
    const onReconnect = () => { setConnected(true); join(); reload(); };
    const onDisconnect = () => setConnected(false);

    reload();
    acquireSocket();
    join();
    socket.on('ball:recorded', onBall);
    // An undo can reopen a completed match, so reload the whole thing.
    socket.on('ball:undone', reload);
    socket.on('connect', onReconnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);

    return () => {
      active = false;
      ready.current = false;
      socket.emit('leave:match', { matchId });
      socket.off('ball:recorded', onBall);
      socket.off('ball:undone', reload);
      socket.off('connect', onReconnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
      releaseSocket();
    };
  }, [matchId, reload, loadScorecard]);

  return { ...state, connected, reload };
}
