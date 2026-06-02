import { useCallback, useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import {
  getAuctionStatus,
  getAuctionSoldLog,
  AuctionStatusResponse,
  AuctionSoldLog,
} from '@/api/auction';

interface AuctionState {
  data: AuctionStatusResponse | null;
  soldLog: AuctionSoldLog[];
  loading: boolean;
  error: string | null;
}

export function useAuctionSocket(tournamentId?: string, categoryId?: string) {
  const [state, setState] = useState<AuctionState>({
    data: null,
    soldLog: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    if (!tournamentId || !categoryId) return;
    try {
      const data = await getAuctionStatus(tournamentId, categoryId);
      setState((s) => ({ ...s, data, loading: false, error: null }));
    } catch {
      setState((s) => ({ ...s, loading: false, error: 'Auction unavailable' }));
    }
    try {
      const sold = await getAuctionSoldLog(tournamentId, categoryId);
      setState((s) => ({ ...s, soldLog: sold.logs || [] }));
    } catch {
      // non-fatal; sold log just stays as-is
    }
  }, [tournamentId, categoryId]);

  useEffect(() => {
    if (!tournamentId || !categoryId) return;

    let active = true;
    const apply = (data: AuctionStatusResponse) => {
      if (active) setState((s) => ({ ...s, data, loading: false, error: null }));
    };
    const join = () => socket.emit('join:auction', { tournamentId, categoryId });
    const onReconnect = () => { join(); load(); };

    load();
    if (!socket.connected) socket.connect();
    join();
    socket.on('auction:update', apply);
    socket.on('connect', onReconnect);

    return () => {
      active = false;
      socket.emit('leave:auction', { tournamentId, categoryId });
      socket.off('auction:update', apply);
      socket.off('connect', onReconnect);
      socket.disconnect();
    };
  }, [tournamentId, categoryId, load]);

  return { ...state, reload: load };
}
