import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMatch, getMatchLive } from '@/api/cricketMatch';
import { fetchLiveFeed, type LiveItem } from '@/api/live';
import { feedRows, type CricketEnrich } from '@/lib/liveFeedView';

const EVERY = 30_000;

/** `scores: false` skips the per-row cricket reads (two each) for callers that only show the count. */
export function useLiveNow({ scores = true }: { scores?: boolean } = {}) {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [cricket, setCricket] = useState<CricketEnrich>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const refresh = useCallback(async () => {
    try {
      const feed = await fetchLiveFeed();
      const enrich: CricketEnrich = {};
      const wanted = scores ? feed.items.filter((i) => i.kind === 'tournament' && i.sport === 'cricket') : [];
      await Promise.all(wanted.map(async (i) => {
        const [live, match] = await Promise.all([
          getMatchLive(i.matchId).then((r) => r.liveState, () => null),
          getMatch(i.matchId).catch(() => null),
        ]);
        enrich[i.matchId] = { live, match };
      }));
      if (!alive.current) return;
      setItems(feed.items);
      setCricket(enrich);
      setError(false);
    } catch {
      if (alive.current) setError(true);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [scores]);

  useFocusEffect(useCallback(() => {
    refresh();
    const t = setInterval(refresh, EVERY);
    return () => clearInterval(t);
  }, [refresh]));

  const rows = useMemo(() => feedRows(items, cricket), [items, cricket]);
  return { ...rows, count: items.length, loading, error, refresh };
}
