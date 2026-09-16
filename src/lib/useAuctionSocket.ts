import { useCallback, useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import {
  getAuctionStatus,
  getAuctionSoldLog,
  AuctionStatusResponse,
  AuctionSoldLog,
  AuctionPreAssigned,
} from '@/api/auction';

interface AuctionState {
  data: AuctionStatusResponse | null;
  soldLog: AuctionSoldLog[];
  preAssigned: AuctionPreAssigned[];
  totalRevenue: number;
  loading: boolean;
  error: string | null;
}

export function useAuctionSocket(tournamentId?: string, categoryId?: string) {
  const [state, setState] = useState<AuctionState>({
    data: null,
    soldLog: [],
    preAssigned: [],
    totalRevenue: 0,
    loading: true,
    error: null,
  });
  // Patterns.dc.html 04: a dropped socket dims the price and says how old it
  // is, rather than showing a wrong number as if it were current.
  const [connected, setConnected] = useState(socket.connected);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const load = useCallback(async () => {
    if (!tournamentId || !categoryId) return;
    try {
      const data = await getAuctionStatus(tournamentId, categoryId);
      setState((s) => ({ ...s, data, loading: false, error: null }));
      setLastUpdate(Date.now());
    } catch {
      setState((s) => ({ ...s, loading: false, error: 'Auction unavailable' }));
    }
  }, [tournamentId, categoryId]);

  useEffect(() => {
    if (!tournamentId || !categoryId) return;

    let active = true;
    const apply = (data: AuctionStatusResponse) => {
      if (!active) return;
      setState((s) => ({ ...s, data, loading: false, error: null }));
      setLastUpdate(Date.now());
    };
    const join = () => socket.emit('join:auction', { tournamentId, categoryId });
    const onReconnect = () => { setConnected(true); join(); load(); };
    const onDisconnect = () => setConnected(false);

    load();
    if (!socket.connected) socket.connect();
    join();
    socket.on('auction:update', apply);
    socket.on('connect', onReconnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      active = false;
      socket.emit('leave:auction', { tournamentId, categoryId });
      socket.off('auction:update', apply);
      socket.off('connect', onReconnect);
      socket.off('disconnect', onDisconnect);
      // Sole socket consumer in the app today, so disconnecting on unmount is safe.
      // If another feature (e.g. live bracket/scoreboard) starts sharing this singleton,
      // move connection lifecycle to an app-level owner instead of disconnecting here.
      socket.disconnect();
    };
  }, [tournamentId, categoryId, load]);

  // The socket payload carries `logsCount` but never the log rows themselves, so
  // the list has to be pulled again each time the hammer falls. Keyed on the
  // count rather than on every update, or a rising bid would refetch it too.
  // Waits for the first status so this fires exactly once per distinct count.
  const logsCount = state.data?.auction.logsCount;
  useEffect(() => {
    if (!tournamentId || !categoryId || logsCount === undefined) return;
    let active = true;
    getAuctionSoldLog(tournamentId, categoryId)
      .then((sold) => {
        if (!active) return;
        setState((s) => ({
          ...s,
          soldLog: sold.logs || [],
          preAssigned: sold.preAssigned || [],
          totalRevenue: sold.totalRevenue || 0,
        }));
      })
      .catch(() => {
        // Non-fatal: the live board is still correct, the history just stays put.
      });
    return () => { active = false; };
  }, [tournamentId, categoryId, logsCount]);

  return { ...state, connected, lastUpdate, reload: load };
}
