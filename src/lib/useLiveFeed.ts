import { useCallback, useEffect, useState } from 'react';
import { fetchLiveFeed, type LiveItem } from '@/api/live';

export function useLiveFeed() {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const feed = await fetchLiveFeed();
      setItems(feed.items);
      setTotal(feed.total);
      setError(null);
    } catch {
      // An empty evening and a dead server must not look the same on the
      // screen, so a failure clears the list AND sets an error rather than
      // leaving stale rows that claim to be live.
      setItems([]);
      setTotal(0);
      setError('Could not load live matches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { items, total, loading, error, refresh: load };
}
