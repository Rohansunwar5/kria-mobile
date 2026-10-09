import { useState } from 'react';
import { View, Text, Pressable, ScrollView, SectionList } from 'react-native';
import { TournamentCard } from '@/components/TournamentCard';
import { FeaturedTournament } from '@/components/home/FeaturedTournament';
import { FilterButton, FilterChips } from '@/components/home/FilterBar';
import { CityChips, GroupHeading } from '@/components/explore/Browse';
import { Icon } from '@/components/icons';
import { Ghost, Skeleton, ErrorBlock } from '@/components/states';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { visibleTournaments } from '@/lib/homePortal';
import { closingSoonest, coversDay, dayStrip, eventSections, type SectionKey, type StripDay } from '@/lib/eventsView';
import { SPORT_ICON, SPORT_LABELS } from '@/lib/sports';
import { SPORTS, STATUS_TAG } from '@/lib/tournamentConstants';
import { appliedChips, appliedCount, clearOne, EMPTY_FILTERS, type Filters } from '@/lib/tournamentFilters';
import { useTheme } from '@/lib/theme';

const ALL = EMPTY_FILTERS.sport;

interface EventsPortalProps {
  tournaments: Tournament[];
  isLoading: boolean;
  error: string | null;
  filters: Filters;
  /** Same filters minus the city — shown only when a city emptied the list. */
  elsewhere: Tournament[];
  onFilters: (next: Filters) => void;
  onOpenFilters: () => void;
  onOpen: (id: string) => void;
  onRetry: () => void;
}

const sportLabel = (sport: string) => (sport === ALL ? 'All' : SPORT_LABELS[sport] ?? sport);

/** A strip day as "22 Oct", read in local time like the strip itself. */
function dayLabel(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Sport is the filter people change most, so it is one tap here; city and
 *  stage stay in the sheet. */
function SportSegment({ value, onChange }: { value: string; onChange: (sport: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', marginTop: 14, borderWidth: 1.5, borderColor: theme.line, borderRadius: 5, overflow: 'hidden' }}>
      {SPORTS.map((sport, i) => {
        const on = sport === value;
        const label = sportLabel(sport);
        const icon = SPORT_ICON[sport];
        return (
          <Pressable
            key={sport}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={sport === ALL ? 'Show all sports' : `Show ${label.toLowerCase()}`}
            onPress={() => onChange(sport)}
            style={{
              flex: sport === ALL ? 0.7 : 1,
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              ...(on ? { backgroundColor: theme.brand } : null),
              ...(i > 0 ? { borderLeftWidth: 1.5, borderLeftColor: theme.line } : null),
            }}
          >
            {icon ? <Icon name={icon} size={13} color={on ? theme.onBrand : theme.textMeta} /> : null}
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.08 * 10, textTransform: 'uppercase', color: on ? theme.onBrand : theme.textMeta }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Three weeks from today. A square marks a day with a tournament on, a
 *  round dot a live one (DESIGN.md: only live carries a dot). */
function DateStrip({ days, selected, onSelect }: { days: StripDay[]; selected: string | null; onSelect: (key: string) => void }) {
  const theme = useTheme();
  const month = (days.find((d) => d.key === selected) ?? days[0]).date.toLocaleDateString('en-GB', { month: 'long' });
  return (
    <View>
      <GroupHeading label={month} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
        {days.map((d, i) => {
          const on = d.key === selected;
          const top = i === 0
            ? 'Today'
            : d.date.toLocaleDateString('en-GB', d.date.getDate() === 1 ? { month: 'short' } : { weekday: 'short' });
          return (
            <Pressable
              key={d.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${d.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${d.has ? ', has events' : ''}`}
              onPress={() => onSelect(d.key)}
              style={{
                width: 44,
                height: 62,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: on ? theme.brand : i === 0 ? theme.keyline : theme.lineFaint,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                ...(on ? { backgroundColor: theme.brand } : null),
              }}
            >
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.1 * 8, textTransform: 'uppercase', color: on ? theme.onBrand : i === 0 ? theme.brandInk : theme.textFaint }}>
                {top}
              </Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 17, color: on ? theme.onBrand : d.has ? theme.text : theme.textMeta }}>
                {d.date.getDate()}
              </Text>
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: d.live ? 3 : 0,
                  ...(d.has ? { backgroundColor: on ? theme.onBrand : theme.brand } : null),
                }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** The list ran out: say so, and offer a city instead of blank space. */
function EndOfList({ city, onCity }: { city: string | null; onCity: (city: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: 14 }}>
      <GroupHeading label={city ? `That's everything in ${city}` : "That's everything, all cities"} />
      <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: theme.textMeta, marginBottom: 10 }}>
        New tournaments appear here as soon as organisers open entry. Or look in {city ? 'another' : 'one'} city:
      </Text>
      <CityChips label={null} exclude={city ?? undefined} onPick={onCity} />
    </View>
  );
}

/** Names exactly the filters that emptied the list and widens one at a time,
 *  so nothing it says blames a filter the user never set. */
function NothingHere({
  filters,
  day,
  elsewhere,
  onFilters,
  onDay,
  onOpen,
}: {
  filters: Filters;
  day: string | null;
  elsewhere: Tournament[];
  onFilters: (next: Filters) => void;
  onDay: (day: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();
  const city = filters.city !== ALL ? filters.city : null;
  const sport = filters.sport !== ALL ? sportLabel(filters.sport) : null;
  const stage = filters.status !== ALL ? STATUS_TAG[filters.status]?.label ?? filters.status : null;

  const widen: { label: string; run: () => void }[] = [];
  if (city) widen.push({ label: 'All cities', run: () => onFilters(clearOne(filters, 'city')) });
  if (sport) widen.push({ label: city ? `All sports in ${city}` : 'All sports', run: () => onFilters(clearOne(filters, 'sport')) });
  if (stage) widen.push({ label: 'Any stage', run: () => onFilters(clearOne(filters, 'status')) });
  if (day) widen.push({ label: 'Any date', run: () => onDay(null) });

  const title = widen.length === 0
    ? 'No events yet'
    : `No ${stage ? `${stage.toLowerCase()} ` : ''}${sport ? sport.toLowerCase() : 'events'}${city ? ` in ${city}` : ''}${day ? ` on ${dayLabel(day)}` : ''}`;

  return (
    <View>
      <View style={{ marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 28, overflow: 'hidden' }}>
        <Ghost text="0" size={210} style={{ right: -14, top: 0 }} />
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 31, color: theme.text }}>{title}</Text>
        <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: theme.textMeta, marginTop: 10, maxWidth: 290 }}>
          {widen.length ? 'Widen one filter to see what is on.' : 'New tournaments land here as organisers open entry. Check back soon.'}
        </Text>
        {widen.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {widen.map((w, i) => (
              <Pressable
                key={w.label}
                accessibilityRole="button"
                onPress={w.run}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: 14,
                  borderRadius: 5,
                  ...(i === 0 ? { backgroundColor: theme.brand } : { borderWidth: 1.5, borderColor: theme.keylineStrong }),
                }}
              >
                <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 18, color: i === 0 ? theme.onBrand : theme.text }}>
                  {w.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {city && elsewhere.length > 0 ? (
        <View style={{ marginTop: 14 }}>
          <GroupHeading label={`${sport ?? 'Events'} elsewhere`} />
          {elsewhere.map((t) => (
            <TournamentCard key={t._id} tournament={t} onPress={() => onOpen(t._id)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The Events tab body under the masthead: title and filters, the date strip,
 * the open event closing soonest, then every other tournament grouped by
 * what you can do with it. Presentational — every change leaves through a
 * prop, except the picked day, which only narrows what is already loaded.
 */
export function EventsPortal({
  tournaments,
  isLoading,
  error,
  filters,
  elsewhere,
  onFilters,
  onOpenFilters,
  onOpen,
  onRetry,
}: EventsPortalProps) {
  const theme = useTheme();
  const [day, setDay] = useState<string | null>(null);
  const visible = visibleTournaments(tournaments);
  const shown = day ? visible.filter((t) => coversDay(t, day)) : visible;
  const featured = closingSoonest(shown);
  const sections = eventSections(shown, featured?._id);
  const openCount = shown.filter((t) => t.status === 'registration_open').length;
  const city = filters.city !== ALL ? filters.city : null;
  const stale = isLoading && visible.length > 0;

  // Sport has the segment, so it gets no chip of its own.
  const chips = [
    ...appliedChips(filters).filter((c) => c.key !== 'sport'),
    ...(day ? [{ key: 'day', label: dayLabel(day) }] : []),
  ];
  const clearChip = (key: string) => (key === 'day' ? setDay(null) : onFilters(clearOne(filters, key as keyof Filters)));

  const Header = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingTop: 16 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 32, lineHeight: 39, color: theme.text }}>Events</Text>
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.08 * 10, textTransform: 'uppercase', color: theme.textMeta }}>
            {`${shown.length} ${shown.length === 1 ? 'tournament' : 'tournaments'}${city ? ` in ${city}` : ''}`}
            {openCount > 0 ? ' · ' : null}
            {openCount > 0 ? <Text style={{ fontFamily: 'SpaceMono_700Bold', color: theme.openInk }}>{`${openCount} open for entry`}</Text> : null}
          </Text>
        </View>
        <FilterButton count={appliedCount(filters)} onPress={onOpenFilters} />
      </View>

      <SportSegment value={filters.sport} onChange={(sport) => onFilters({ ...filters, sport })} />
      {chips.length > 0 ? (
        <View style={{ paddingTop: 10 }}>
          <FilterChips chips={chips} onClear={clearChip} />
        </View>
      ) : null}

      <DateStrip days={dayStrip(visible)} selected={day} onSelect={(key) => setDay(key === day ? null : key)} />

      {featured ? (
        <View>
          <GroupHeading label="Closing soonest" />
          <FeaturedTournament tournament={featured} onPress={() => onOpen(featured._id)} />
        </View>
      ) : null}
    </View>
  );

  // First load with nothing cached: skeleton shapes matching the real card
  // geometry, under a masthead that never blanks.
  if (isLoading && visible.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Skeleton h={38} w={140} line style={{ marginBottom: 14 }} />
        <Skeleton h={44} style={{ marginBottom: 16 }} />
        <Skeleton h={300} />
        <Skeleton h={110} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (error && visible.length === 0) {
    return (
      <View style={{ padding: 16 }}>
        <ErrorBlock
          label="Events unavailable"
          message="The tournament list did not load. Your profile and past entries still work."
          onRetry={onRetry}
        />
      </View>
    );
  }

  return (
    <SectionList
      testID="events-list"
      sections={sections}
      keyExtractor={(t) => t._id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={Header}
      renderSectionHeader={({ section }) => (
        <GroupHeading
          live={(section.key as SectionKey) === 'live'}
          label={section.title}
          count={featured && section.key === 'open' ? `${section.data.length} more` : section.data.length}
        />
      )}
      renderItem={({ item }) => <TournamentCard tournament={item} onPress={() => onOpen(item._id)} />}
      ListEmptyComponent={
        featured ? null : (
          <NothingHere filters={filters} day={day} elsewhere={elsewhere} onFilters={onFilters} onDay={setDay} onOpen={onOpen} />
        )
      }
      ListFooterComponent={shown.length > 0 ? <EndOfList city={city} onCity={(c) => onFilters({ ...filters, city: c })} /> : null}
      style={stale ? { opacity: 0.5 } : undefined}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
    />
  );
}
