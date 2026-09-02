import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from '@/lib/socket';
import { getBadmintonMatch, type BadmintonMatch, type GameScore } from '@/api/badmintonMatch';
import { rallyFrom, type Rally } from '@/lib/badmintonLive';

export interface LoggedRally extends Rally {
  at: number;
}

const MAX_LOG = 40;

export function useBadmintonMatchSocket(matchId?: string) {
  const [match, setMatch] = useState<BadmintonMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // The server keeps no point log, so we build one from score deltas while the
  // screen is open. It is explicitly "since you joined", never a full history.
  const [log, setLog] = useState<LoggedRally[]>([]);
  const prevGames = useRef<GameScore[]>([]);

  const apply = useCallback((next: BadmintonMatch, recordRally: boolean) => {
    const games = next.gameScores || [];
    if (recordRally) {
      const rally = rallyFrom(prevGames.current, games);
      if (rally) setLog((l) => [{ ...rally, at: Date.now() }, ...l].slice(0, MAX_LOG));
    }
    prevGames.current = games;
    setMatch(next);
    setLastUpdate(Date.now());
  }, []);

  const reload = useCallback(async () => {
    if (!matchId) return;
    try {
      const m = await getBadmintonMatch(matchId);
      if (!m) throw new Error('not found');
      // A reload is a resync, not a rally — never log points from it.
      apply(m, false);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [matchId, apply]);

  useEffect(() => {
    if (!matchId) return;
    let active = true;

    const onScore = (payload: any) => {
      const next: BadmintonMatch | undefined = payload?.match;
      if (!next || !active) return;
      apply(next, true);
    };
    const join = () => socket.emit('join:match', { matchId });
    const onConnect = () => {
      setConnected(true);
      join();
      reload();
    };
    const onDisconnect = () => setConnected(false);

    reload();
    if (!socket.connected) socket.connect();
    join();
    socket.on('score:update', onScore);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      active = false;
      socket.emit('leave:match', { matchId });
      socket.off('score:update', onScore);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      // Auction and live-scoreboard are separate full-screen routes and are
      // never mounted together, so each can own connect/disconnect safely.
      socket.disconnect();
    };
  }, [matchId, reload, apply]);

  return { match, log, loading, error, connected, lastUpdate, reload };
}
