import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLiveFeed, type LiveItem } from '@/api/live';

export function useLiveFeed() {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const epochRef = useRef(0);
  const isMountedRef = useRef(true);

  const load = useCallback(async () => {
    const epoch = ++epochRef.current;

    setLoading(true);
    try {
      const feed = await fetchLiveFeed();
      // Pull-to-refresh + 15s server cache makes out-of-order resolution likely.
      // A later request must always win regardless of response order. Stale rows
      // look identical to fresh ones, so the failure is invisible without this guard.
      if (epoch !== epochRef.current || !isMountedRef.current) return;

      setItems(feed.items);
      setTotal(feed.total);
      setError(null);
    } catch {
      if (epoch !== epochRef.current || !isMountedRef.current) return;

      // An empty evening and a dead server must not look the same on the
      // screen, so a failure clears the list AND sets an error rather than
      // leaving stale rows that claim to be live.
      setItems([]);
      setTotal(0);
      setError('Could not load live matches.');
    } finally {
      if (epoch === epochRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void load();
    return () => {
      isMountedRef.current = false;
      epochRef.current = 0;
    };
  }, [load]);

  return { items, total, loading, error, refresh: load };
}
