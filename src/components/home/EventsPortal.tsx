import { View, Text, FlatList, Pressable, ScrollView } from 'react-native';
import { Icon } from '@/components/icons';
import { TournamentCard } from '@/components/TournamentCard';
import { FeaturedTournament } from '@/components/home/FeaturedTournament';
import { Tag } from '@/components/StatusPill';
import { Chip } from '@/components/canvas';
import { Skeleton, EmptyState, ErrorBlock } from '@/components/states';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { CITIES, SPORTS } from '@/lib/tournamentConstants';

const SPORT_CHIPS = SPORTS.filter((s) => s !== 'All');

interface EventsPortalProps {
  tournaments: Tournament[];
  isLoading: boolean;
  error: string | null;
  sport: string;
  city: string;
  cityOpen: boolean;
  onSport: (sport: string) => void;
  onCity: (city: string) => void;
  onToggleCity: () => void;
  onOpen: (id: string) => void;
  onRetry: () => void;
}

// Lifted verbatim out of app/(tabs)/home.tsx: the tournament-discovery body,
// unchanged. The masthead stays on the screen above it.
export function EventsPortal({
  tournaments,
  isLoading,
  error,
  sport,
  city,
  cityOpen,
  onSport,
  onCity,
  onToggleCity,
  onOpen,
  onRetry,
}: EventsPortalProps) {
  const visible = tournaments.filter((t) => t.status !== 'draft' && t.isActive !== false);
  // Surface a live/registration-open tournament as the hero, else the first one.
  const featured =
    visible.find((t) => t.status === 'ongoing') ||
    visible.find((t) => t.status === 'registration_open') ||
    visible[0];
  const rest = featured ? visible.filter((t) => t._id !== featured._id) : visible;
  const filtersActive = sport !== 'All' || city !== 'All';
  const stale = isLoading && visible.length > 0;

  const open = (id: string) => onOpen(id);

  const Header = (
    <View>
      {featured ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            {featured.status === 'ongoing' ? <Tag label="Live now" variant="live" dot /> : null}
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
              {featured.sport?.replace('_', ' ')}
            </Text>
          </View>
          <FeaturedTournament tournament={featured} onPress={() => open(featured._id)} />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingTop: 18 }}>
        {SPORT_CHIPS.map((s) => (
          <Chip key={s} label={s} selected={sport === s} onPress={() => onSport(sport === s ? 'All' : s)} />
        ))}
        <View style={{ flex: 1 }} />
        <Chip
          label={city === 'All' ? 'City' : city.slice(0, 3)}
          selected={city !== 'All'}
          onPress={() => onToggleCity()}
          icon={<Icon name="filter" size={12} color={city !== 'All' ? '#0B0B0B' : '#bdbdbd'} />}
        />
      </View>

      {cityOpen ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingTop: 10 }}
        >
          {CITIES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={city === c}
              onPress={() => {
                onCity(c);
                onToggleCity();
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 27, color: '#fff' }}>
          Open for entry
        </Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#F97316' }}>
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
              ? 'No tournaments match this sport and city. Clear the filters to see everything that is open.'
              : 'New tournaments land here as organisers open entry. Check back soon.'
          }
          cta={filtersActive ? 'Clear filters' : undefined}
          onCta={filtersActive ? () => { onSport('All'); onCity('All'); } : undefined}
        />
      }
    />
  );
}
