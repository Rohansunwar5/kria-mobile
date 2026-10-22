import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getMyEntries, getTournament, getTournamentCategories, getTournamentTeams,
  type CategoryStatus, type MyEntry, type TournamentCategory, type TournamentDetail, type TournamentTeam,
} from '@/api/tournaments';
import { listAnnouncements, type Announcement } from '@/api/profileApi';
import { getAuctionStatus } from '@/api/auction';
import { getCategoryBracket, type Match } from '@/api/match';
import type { AuctionState } from '@/lib/tournamentView';
import { useAppSelector } from '@/store/hooks';

export interface TournamentBase { tournament: TournamentDetail; categories: TournamentCategory[]; mine: MyEntry[] }

export function useTournament(id: string) {
  const userId = useAppSelector((s) => s.auth.user?._id);
  const [data, setData] = useState<TournamentBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(() => {
    let live = true;
    (async () => {
      try {
        const [tournament, categories, entries] = await Promise.all([
          getTournament(id), getTournamentCategories(id), userId ? getMyEntries() : Promise.resolve<MyEntry[]>([]),
        ]);
        if (!live) return;
        setData({ tournament, categories, mine: entries.filter((e) => e.tournamentId === id) });
        setError(false);
      } catch {
        if (live) setError(true);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
    // tick re-runs the load for reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId, tick]);

  useFocusEffect(load);
  return { data, loading, error, reload: useCallback(() => setTick((n) => n + 1), []) };
}

export interface OverviewExtras {
  teams: TournamentTeam[]; announcements: Announcement[];
  auctions: Record<string, AuctionState | undefined>; matches: Record<string, Match[]>;
}

const AUCTION_ON: CategoryStatus[] = ['auction', 'groups_configured', 'bracket_configured', 'ongoing', 'completed'];
const DRAWN: CategoryStatus[] = ['groups_configured', 'bracket_configured', 'ongoing', 'completed'];
const EMPTY: OverviewExtras = { teams: [], announcements: [], auctions: {}, matches: {} };

export function useOverviewExtras(id: string, categories: TournamentCategory[] | undefined): OverviewExtras {
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auctions, setAuctions] = useState(EMPTY.auctions);
  const [matches, setMatches] = useState(EMPTY.matches);

  useEffect(() => {
    let live = true;
    getTournamentTeams(id).then((v) => live && setTeams(v), () => {});
    listAnnouncements(id).then((v) => live && setAnnouncements(v), () => {});
    return () => { live = false; };
  }, [id]);

  useEffect(() => {
    if (!categories) return;
    let live = true;
    const pick = (on: CategoryStatus[]) => categories.filter((c) => on.includes(c.status));
    Promise.all(pick(AUCTION_ON).map(async (c) => {
      const state = await getAuctionStatus(id, c._id).then((r) => r.auction.status, () => undefined);
      return [c._id, state] as const;
    })).then((rows) => live && setAuctions(Object.fromEntries(rows)));
    Promise.all(pick(DRAWN).map(async (c) => {
      const list = await getCategoryBracket(c._id).then((r) => r.matches, () => undefined);
      return [c._id, list] as const;
    })).then((rows) => live && setMatches(Object.fromEntries(rows.filter(([, l]) => l) as [string, Match[]][])));
    return () => { live = false; };
  }, [id, categories]);

  return { teams, announcements, auctions, matches };
}
