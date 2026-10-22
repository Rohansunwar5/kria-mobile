import { useCallback, useEffect, useState } from 'react';
import { getBadmintonMatch, type BadmintonMatch } from '@/api/badmintonMatch';
import { acquireSocket, releaseSocket, socket } from '@/lib/socket';

/** Tournament badminton match: fetched once, then replaced by each `score:update`; reloaded on reconnect. */
export function useBadmintonLive(matchId: string) {
  const [match, setMatch] = useState<BadmintonMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Assume connected until told otherwise: a fresh open would flash "Reconnecting" before the first connect.
  const [connected, setConnected] = useState(true);

  const reload = useCallback(async () => {
    try {
      const m = await getBadmintonMatch(matchId);
      if (!m) throw new Error('not found');
      setMatch(m);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    const join = () => socket.emit('join:match', { matchId });
    // One socket serves every mounted board (Bracket → another match stacks a second), so check whose score it is.
    const onScore = (p: { match?: BadmintonMatch }) => {
      if (p?.match && String(p.match._id) === matchId) setMatch(p.match);
    };
    const onConnect = () => {
      setConnected(true);
      join();
      reload();
    };
    const onDisconnect = () => setConnected(false);
    reload();
    acquireSocket();
    join();
    socket.on('score:update', onScore);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);
    return () => {
      socket.emit('leave:match', { matchId });
      socket.off('score:update', onScore);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
      releaseSocket();
    };
  }, [matchId, reload]);

  return { match, connected, loading, error, reload };
}
