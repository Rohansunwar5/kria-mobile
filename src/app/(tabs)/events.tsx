import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { EventsPortal } from '@/components/home/EventsPortal';
import { FilterSheet } from '@/components/home/FilterSheet';
import { eventsStrip, openForEntryCount } from '@/lib/homePortal';
import { useTheme } from '@/lib/theme';
import { EMPTY_FILTERS, clearOne, toQuery, type Filters } from '@/lib/tournamentFilters';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPublicTournaments } from '@/store/slices/tournamentSlice';

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

/** Organiser-hosted tournaments. */
export default function EventsScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { publicTournaments, publicTotal, isLoading, error } = useAppSelector((s) => s.tournament);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = () => dispatch(fetchPublicTournaments({ limit: TOURNAMENT_FETCH_LIMIT, ...toQuery(filters) }));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filters]);

  return (
    <Screen>
      {/* Same masthead as Explore and Live. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: theme.lineSoft }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 23, lineHeight: 28, color: theme.text }}>
          Kria
        </Text>
      </View>

      {/* The strip says OPEN, so it counts what is actually open for entry —
          not every visible tournament. */}
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 9,
          letterSpacing: 0.14 * 9,
          textTransform: 'uppercase',
          color: theme.textFaint,
          paddingHorizontal: 17,
          paddingTop: 9,
        }}
      >
        {eventsStrip(openForEntryCount(publicTournaments), filters.city)}
      </Text>

      <View style={{ flex: 1 }}>
        <EventsPortal
          tournaments={publicTournaments}
          isLoading={isLoading}
          error={error}
          filters={filters}
          onClearFilter={(key) => setFilters((f) => clearOne(f, key))}
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
          // Skip the update when nothing changed, so the load effect's
          // `filters` dependency keeps its reference and never refetches for
          // a no-op edit (see sameFilters above).
          setFilters((prev) => (sameFilters(prev, f) ? prev : f));
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}
