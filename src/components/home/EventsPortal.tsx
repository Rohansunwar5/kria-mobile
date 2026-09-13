import { View, Text, FlatList, Pressable } from 'react-native';
import { TournamentCard } from '@/components/TournamentCard';
import { FeaturedTournament } from '@/components/home/FeaturedTournament';
import { Tag } from '@/components/StatusPill';
import { FilterBar } from '@/components/home/FilterBar';
import { Skeleton, EmptyState, ErrorBlock } from '@/components/states';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { visibleTournaments } from '@/lib/homePortal';
import { appliedChips, appliedCount, type Filters } from '@/lib/tournamentFilters';
import { useTheme } from '@/lib/theme';

interface EventsPortalProps {
  tournaments: Tournament[];
  isLoading: boolean;
  error: string | null;
  filters: Filters;
  onClearFilter: (key: keyof Filters) => void;
  onOpenFilters: () => void;
  onOpen: (id: string) => void;
  onRetry: () => void;
}

// The tournament-discovery body, lifted out of app/(tabs)/home.tsx. It is that
// body unchanged except for one removal: the "Between tournaments / Quick
// matches" CTA is gone, because the PLAY portal and the nav's Host button are
// the ways to a quick match now. The masthead stays on the screen above it, and
// every navigation leaves through `onOpen` — this component is presentational.
export function EventsPortal({
  tournaments,
  isLoading,
  error,
  filters,
  onClearFilter,
  onOpenFilters,
  onOpen,
  onRetry,
}: EventsPortalProps) {
  const theme = useTheme();
  const visible = visibleTournaments(tournaments);
  // Surface a live/registration-open tournament as the hero. There is
  // deliberately no further fallback (e.g. visible[0]): those are the only
  // two statuses that warrant a hero card, and a stage filter (Ended,
  // Auction) can leave `visible` with nothing that qualifies. Promoting
  // whatever came first used to put a finished tournament in the headline
  // spot as though it were live. When nothing qualifies, `featured` stays
  // undefined and `rest` below falls back to every visible tournament, so
  // they all still render — just as list rows instead of one hero plus rows.
  const featured =
    visible.find((t) => t.status === 'ongoing') ||
    visible.find((t) => t.status === 'registration_open');
  const rest = featured ? visible.filter((t) => t._id !== featured._id) : visible;
  const filtersActive = appliedCount(filters) > 0;
  const stale = isLoading && visible.length > 0;

  const open = (id: string) => onOpen(id);

  const Header = (
    <View>
      {featured ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            {featured.status === 'ongoing' ? <Tag label="Live now" variant="live" dot /> : null}
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: theme.textFaint }}>
              {featured.sport?.replace('_', ' ')}
            </Text>
          </View>
          <FeaturedTournament tournament={featured} onPress={() => open(featured._id)} />
        </View>
      ) : null}

      <FilterBar filters={filters} onClear={onClearFilter} onOpen={onOpenFilters} />

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 27, color: theme.text }}>
          Open for entry
        </Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: theme.brand }}>
          {String(rest.length).padStart(2, '0')}
        </Text>
      </View>
    </View>
  );

  // First load with nothing cached: skeleton shapes matching the real card
  // geometry, under a masthead that never blanks.
  if (isLoading && visible.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Skeleton h={10} w={88} line style={{ marginBottom: 10 }} />
        <Skeleton h={222} />
        <Skeleton h={13} w={150} line style={{ marginTop: 16, marginBottom: 10 }} />
        <Skeleton h={148} />
      </View>
    );
  }

  return error && visible.length === 0 ? (
    <View style={{ padding: 16 }}>
      <ErrorBlock
        label="Events unavailable"
        message="The tournament list did not load. Your profile and past entries still work."
        onRetry={onRetry}
      />
    </View>
  ) : (
    <FlatList
      testID="events-list"
      data={rest}
      keyExtractor={(t) => t._id}
      ListHeaderComponent={Header}
      style={stale ? { opacity: 0.5 } : undefined}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
      renderItem={({ item, index }) => (
        <TournamentCard tournament={item} index={index + 1} onPress={() => open(item._id)} />
      )}
      ListEmptyComponent={
        <EmptyState
          ghost="0"
          icon="trophy"
          title={filtersActive ? 'Nothing matches' : 'No events yet'}
          message={
            filtersActive
              // Generic on purpose: filtersActive fires on sport, city or
              // stage alone or in any combination, so naming specific
              // filters here (as this once did with "sport and city") can
              // name ones the user never touched.
              ? 'No tournaments match these filters. Clear them to see everything that is open.'
              : 'New tournaments land here as organisers open entry. Check back soon.'
          }
          cta={filtersActive ? 'Clear filters' : undefined}
          onCta={filtersActive ? () => appliedChips(filters).forEach((chip) => onClearFilter(chip.key)) : undefined}
        />
      }
    />
  );
}
