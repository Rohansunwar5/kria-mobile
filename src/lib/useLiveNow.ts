import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchLiveFeed, type LiveItem } from '@/api/live';
import { feedRows } from '@/lib/liveFeedView';

const EVERY = 30_000;

/** The live feed, refreshed on focus and every 30 s while focused. One request: rows need nothing else. */
export function useLiveNow() {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const refresh = useCallback(async () => {
    try {
      const feed = await fetchLiveFeed();
      if (!alive.current) return;
      setItems(feed.items);
      setError(false);
    } catch {
      if (alive.current) setError(true);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    refresh();
    const t = setInterval(refresh, EVERY);
    return () => clearInterval(t);
  }, [refresh]));

  // Re-derived on every refresh, which is what keeps "Started …" current.
  const rows = useMemo(() => feedRows(items, new Date()), [items]);
  return { ...rows, count: items.length, loading, error, refresh };
}
