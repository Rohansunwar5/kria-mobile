import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import PlayerHitRow from '@/components/explore/PlayerHitRow';
import EventHitRow from '@/components/explore/EventHitRow';
import { FilterSheet } from '@/components/home/FilterSheet';
import { EMPTY_FILTERS, appliedCount, type Filters } from '@/lib/tournamentFilters';
import { useExploreSearch } from '@/lib/useExploreSearch';
import { searchTournaments, type TournamentHit } from '@/api/tournaments';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme';

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.18 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const PROMPT = (theme: Palette) => ({
  fontFamily: 'SpaceGrotesk_400Regular' as const,
  fontSize: 13,
  lineHeight: 19,
  color: theme.textFaint,
  textAlign: 'center' as const,
});

function GroupHeading({ theme, label, count, right }: { theme: Palette; label: string; count: number; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 17, paddingBottom: 9 }}>
      <Text style={LBL(theme)}>{label}</Text>
      <View style={{ flex: 1, height: 1.5, backgroundColor: theme.lineFaint }} />
      <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: theme.textFaint }}>{count}</Text>
      {right}
    </View>
  );
}

/** The filter control lives on the Events heading and nowhere else — it
 *  filters events only, and putting it in the masthead would imply it
 *  filters people too. */
function EventsFilterControl({ theme, count, onPress }: { theme: Palette; count: number; onPress: () => void }) {
  const label = count === 0 ? 'Filter events' : `Filter events, ${count} applied`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={10}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: theme.keyline,
      }}
    >
      <Icon name="filter" size={11} color={theme.textBody} strokeWidth={2.2} />
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: theme.textBody }}>
        Filter
      </Text>
      {count > 0 ? (
        <View style={{ backgroundColor: theme.brand, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: theme.onBrand }}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * One field over both players and tournaments — the groups below do the
 * sorting, not a segmented control the user picks before typing.
 *
 * `useExploreSearch()` (Task 3) owns the debounced dual search and does not
 * take filters — it is a fixed interface, not something this screen extends.
 * Filters apply to the Events group only, so they are re-run here as a
 * direct, screen-owned call to `searchTournaments`, keyed off the sheet's
 * Apply button rather than every keystroke. `filteredEvents` overrides the
 * hook's own unfiltered tournament list only while a filtered search is in
 * effect; it resets whenever the query itself changes so a fresh query
 * starts from the hook's plain result until filters are re-applied against it.
 */
export default function ExploreScreen() {
  const theme = useTheme();
  const { query, setQuery, players, tournaments, loading, error } = useExploreSearch();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<TournamentHit[] | null>(null);
  const [filterBusy, setFilterBusy] = useState(false);

  useEffect(() => {
    setFilteredEvents(null);
  }, [query]);

  const events = filteredEvents ?? tournaments;

  async function applyFilters(next: Filters) {
    // FilterSheet's own docblock: the sheet's draft re-seeds from `filters`
    // every time `visible` turns true, and that is safe only because nothing
    // can change `filters` while the sheet stays open. Splitting this into
    // two updates (apply, then close on a later render) would let a change
    // land while the sheet still reads `visible: true`, stranding the draft
    // it had already re-seeded. Applying and closing here in one handler,
    // both fired before React's next render, keeps that invariant intact.
    setFilters(next);
    setSheetOpen(false);

    if (query.trim().length < 3) return;
    setFilterBusy(true);
    try {
      setFilteredEvents(await searchTournaments(query, next));
    } catch {
      // A failed re-filter leaves the previously shown events in place
      // rather than blanking a screen that was working a moment ago.
    } finally {
      setFilterBusy(false);
    }
  }

  const hasQuery = query.trim().length > 0;
  const hasResults = players.length > 0 || events.length > 0;
  const busy = loading || filterBusy;

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 13 }}>
        <View
          style={{
            height: 46,
            borderRadius: 5,
            backgroundColor: theme.fill,
            borderWidth: 1.5,
            borderColor: theme.keyline,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 13,
          }}
        >
          <Icon name="search" size={17} color={theme.textFaint} strokeWidth={1.9} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search players or events"
            placeholderTextColor={theme.textFaint}
            autoCorrect={false}
            style={{ flex: 1, fontSize: 14, color: theme.text }}
          />
          {query.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={10}>
              <Icon name="close" size={14} color={theme.textFaint} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? (
        <View style={{ paddingHorizontal: 26, paddingTop: 48, alignItems: 'center' }}>
          <Text style={PROMPT(theme)}>Could not search right now.</Text>
        </View>
      ) : busy ? (
        <View style={{ paddingTop: 48, alignItems: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      ) : !hasQuery ? (
        <View style={{ paddingHorizontal: 26, paddingTop: 48, alignItems: 'center' }}>
          <Text style={PROMPT(theme)}>Search for players or events.</Text>
        </View>
      ) : !hasResults ? (
        <View style={{ paddingHorizontal: 26, paddingTop: 48, alignItems: 'center' }}>
          <Text style={PROMPT(theme)}>Nothing matched that.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {players.length > 0 ? (
            <View>
              <GroupHeading theme={theme} label="Players" count={players.length} />
              <View style={{ borderRadius: 6, borderWidth: 1.5, borderColor: theme.line, overflow: 'hidden' }}>
                {players.map((hit, i) => (
                  <View key={hit._id}>
                    {i > 0 ? <View style={{ height: 1.5, backgroundColor: theme.lineFaint }} /> : null}
                    <PlayerHitRow hit={hit} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {events.length > 0 ? (
            <View>
              <GroupHeading
                theme={theme}
                label="Events"
                count={events.length}
                right={<EventsFilterControl theme={theme} count={appliedCount(filters)} onPress={() => setSheetOpen(true)} />}
              />
              {events.map((hit) => (
                <EventHitRow key={hit._id} hit={hit} />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* This is FilterSheet's SECOND mount site (Home is the first). Its own
          docblock says the re-seed-on-open invariant is the mounting screen's
          job, not the sheet's: nothing may change `filters` while `visible`
          is true, which is only guaranteed here because `applyFilters` sets
          filters and closes the sheet in one synchronous handler, matching
          Home's own onApply pairing. Splitting that into two updates would
          let this screen strand a stale draft with nothing to catch it. */}
      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        resultCount={events.length}
        onApply={applyFilters}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}
