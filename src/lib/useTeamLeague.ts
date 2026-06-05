import { useCallback, useEffect, useState } from 'react';
import { getGroups, getGroupStandings, Group, GroupStandings, StandingEntry } from '@/api/teamLeague';
import { aggregateOverall, detectChampion, OverallEntry } from '@/lib/teamLeagueView';

export function useTeamLeague(categoryId?: string) {
  const [stage, setStage] = useState(1);
  const [maxStage, setMaxStage] = useState(1);
  const [groups, setGroups] = useState<Group[]>([]);
  const [standings, setStandings] = useState<GroupStandings[]>([]);
  const [overall, setOverall] = useState<OverallEntry[]>([]);
  const [overallChampion, setOverallChampion] = useState<StandingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Discover max stage: probe stages 1..5 in parallel (mobile optimization over the
  // web's sequential loop — Render cold starts make serial round-trips slow).
  useEffect(() => {
    if (!categoryId) return;
    let active = true;
    (async () => {
      const probes = await Promise.all(
        [1, 2, 3, 4, 5].map((s) => getGroups(categoryId, s).then((g) => g.length > 0).catch(() => false)),
      );
      let max = 1;
      for (let i = 0; i < probes.length; i++) {
        if (probes[i]) max = i + 1; else break;
      }
      if (active) setMaxStage(max);
    })();
    return () => { active = false; };
  }, [categoryId]);

  const loadStage = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const [g, s] = await Promise.all([
        getGroups(categoryId, stage),
        getGroupStandings(categoryId, stage),
      ]);
      setGroups(g);
      setStandings(s);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [categoryId, stage]);

  const loadOverall = useCallback(async () => {
    if (!categoryId) return;
    const perStage = await Promise.all(
      Array.from({ length: maxStage }, (_, i) => getGroupStandings(categoryId, i + 1).catch(() => [] as GroupStandings[])),
    );
    setOverall(aggregateOverall(perStage));
    setOverallChampion(detectChampion(perStage[maxStage - 1] || []));
  }, [categoryId, maxStage]);

  useEffect(() => { loadStage(); }, [loadStage]);
  useEffect(() => { loadOverall(); }, [loadOverall]);

  const reload = useCallback(async () => {
    await Promise.all([loadStage(), loadOverall()]);
  }, [loadStage, loadOverall]);

  return { groups, standings, overall, overallChampion, stage, maxStage, setStage, loading, error, reload };
}
