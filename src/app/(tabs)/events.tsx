import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { EventsPortal } from '@/components/home/EventsPortal';
import { FilterSheet } from '@/components/home/FilterSheet';
import { latestTournaments } from '@/api/tournaments';
import { visibleTournaments } from '@/lib/homePortal';
import { useTheme } from '@/lib/theme';
import { EMPTY_FILTERS, toQuery, type Filters } from '@/lib/tournamentFilters';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPublicTournaments, type Tournament } from '@/store/slices/tournamentSlice';
// The server's getAllTournamentsValidator caps `limit` at 100
// (server/src/middlewares/validators/tournament.validator.ts) — asking for
// more gets the whole request rejected. Real pagination is the correct
// long-term fix for showing more than this many events; until it exists,
// both the fetch below and the filter sheet's promised count read this same
// constant so the two can never drift apart the way they did when the sheet
// quoted the server's true total while the fetch silently capped at 20.
const TOURNAMENT_FETCH_LIMIT = 100;

// Two Filters are the same choice even when they are different objects — the
// sheet's toggle() always spreads a fresh object, so selecting a value and
// then unselecting it before Apply produces a value-identical but
// reference-different Filters. The load effect below keys off `filters`
// identity, so without this check that round trip would refetch for nothing
// and flash the stale-dim over a list that was never going to change.
function sameFilters(a: Filters, b: Filters): boolean {
  return a.sport === b.sport && a.city === b.city && a.status === b.status;
}

type FilterParams = { sport?: string; city?: string; status?: string; at?: string };

// Explore's sport tiles, city chips and "Open for entry" link open this tab
// pre-filtered. A param left out means that filter is off.
function fromParams(p: FilterParams): Filters {
  return {
    sport: p.sport ?? EMPTY_FILTERS.sport,
    city: p.city ?? EMPTY_FILTERS.city,
    status: p.status ?? EMPTY_FILTERS.status,
  };
}

/** Organiser-hosted tournaments. */
export default function EventsScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { publicTournaments, publicTotal, isLoading, error } = useAppSelector((s) => s.tournament);
  const params = useLocalSearchParams<FilterParams>();
  const [filters, setFilters] = useState<Filters>(() => fromParams(params));
  const [sheetOpen, setSheetOpen] = useState(false);

  // Keyed on `at`, the timestamp Explore stamps on every tap: the tab stays
  // mounted, so a second tap must re-apply its filter even when the params
  // are otherwise identical to the last ones.
  const [seenAt, setSeenAt] = useState(params.at);
  if (params.at !== seenAt) {
    setSeenAt(params.at);
    const next = fromParams(params);
    setFilters((prev) => (sameFilters(prev, next) ? prev : next));
  }

  // Every filter change funnels through here. Skipping a value-identical
  // update keeps the load effect's `filters` dependency on the same reference
  // so a no-op edit never refetches (see sameFilters above).
  const applyFilters = (next: Filters) => setFilters((prev) => (sameFilters(prev, next) ? prev : next));

  const load = () => dispatch(fetchPublicTournaments({ limit: TOURNAMENT_FETCH_LIMIT, ...toQuery(filters) }));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filters]);

  // A city that empties the list gets the same search without the city, so
  // the empty state still has something to tap. Stored with the filters it
  // answers, so a reply for an older filter set can never show under a newer one.
  const [elsewhere, setElsewhere] = useState<{ for: Filters; list: Tournament[] } | null>(null);
  const emptyInCity = !isLoading && filters.city !== EMPTY_FILTERS.city && visibleTournaments(publicTournaments).length === 0;
  useEffect(() => {
    if (!emptyInCity) return;
    latestTournaments(3, toQuery({ ...filters, city: EMPTY_FILTERS.city })).then(
      (list) => setElsewhere({ for: filters, list }),
      () => {},
    );
  }, [emptyInCity, filters]);

  return (
    <Screen>
      {/* Same masthead as Explore and Live. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: theme.lineSoft }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 23, lineHeight: 28, color: theme.text }}>
          Kria
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <EventsPortal
          tournaments={publicTournaments}
          isLoading={isLoading}
          error={error}
          filters={filters}
          elsewhere={elsewhere?.for === filters ? elsewhere.list : []}
          onFilters={applyFilters}
          onOpenFilters={() => setSheetOpen(true)}
          onOpen={(id) => router.push({ pathname: '/tournament/[id]', params: { id } })}
          onRetry={load}
        />
      </View>

      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        // This count reflects the filters currently applied, not the draft
        // being edited inside the sheet — the server is only asked on Apply.
        // Capped at TOURNAMENT_FETCH_LIMIT: `publicTotal` is the server's true
        // count, which can exceed what one fetch returns, and the button must
        // never promise more events than the list can show.
        resultCount={Math.min(publicTotal, TOURNAMENT_FETCH_LIMIT)}
        onApply={(f) => {
          applyFilters(f);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}
