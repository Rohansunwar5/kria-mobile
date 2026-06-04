import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from '@/lib/socket';
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
      if (!live || !active) return;
      const key = tallyKey(live);
      setState((s) => ({ ...s, live }));
      if (ready.current && key !== lastTally.current) {
        lastTally.current = key;
        loadScorecard(matchId);
      }
    };
    const join = () => socket.emit('join:match', { matchId });
    const onReconnect = () => { join(); reload(); };

    reload();
    if (!socket.connected) socket.connect();
    join();
    socket.on('ball:recorded', onBall);
    socket.on('connect', onReconnect);

    return () => {
      active = false;
      ready.current = false;
      socket.emit('leave:match', { matchId });
      socket.off('ball:recorded', onBall);
      socket.off('connect', onReconnect);
      // The auction and live-scoreboard routes are never mounted simultaneously
      // (separate full-screen routes), so each can own connect/disconnect safely.
      socket.disconnect();
    };
  }, [matchId, reload, loadScorecard]);

  return { ...state, reload };
}
