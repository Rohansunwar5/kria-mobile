import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { TournamentCard } from '@/components/TournamentCard';
import { FeaturedTournament } from '@/components/home/FeaturedTournament';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Tag } from '@/components/StatusPill';
import { Chip, Hazard } from '@/components/canvas';
import { Skeleton, EmptyState, ErrorBlock } from '@/components/states';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPublicTournaments } from '@/store/slices/tournamentSlice';
import { CITIES, SPORTS } from '@/lib/tournamentConstants';

const SPORT_CHIPS = SPORTS.filter((s) => s !== 'All');

export default function Home() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { publicTournaments, isLoading, error } = useAppSelector((s) => s.tournament);
  const user = useAppSelector((s) => s.auth.user);
  const [sport, setSport] = useState('All');
  const [city, setCity] = useState('All');
  const [cityOpen, setCityOpen] = useState(false);

  const load = () =>
    dispatch(
      fetchPublicTournaments({
        limit: 20,
        sport: sport !== 'All' ? sport : undefined,
        city: city !== 'All' ? city : undefined,
      })
    );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, sport, city]);

  const visible = publicTournaments.filter((t) => t.status !== 'draft' && t.isActive !== false);
  // Surface a live/registration-open tournament as the hero, else the first one.
  const featured =
    visible.find((t) => t.status === 'ongoing') ||
    visible.find((t) => t.status === 'registration_open') ||
    visible[0];
  const rest = featured ? visible.filter((t) => t._id !== featured._id) : visible;
  const filtersActive = sport !== 'All' || city !== 'All';
  const firstName = user?.firstName || 'Player';
  const stale = isLoading && visible.length > 0;

  const open = (id: string) => router.push({ pathname: '/tournament/[id]', params: { id } });

  // Masthead renders from cached auth state, so it survives every load and
  // every error — the whole point of the Patterns sheet.
  const Masthead = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 12 }}>
        <Image source={require('../../../assets/images/logo.png')} resizeMode="contain" style={{ width: 40, height: 35 }} />
        <View>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 30, lineHeight: 28, color: '#fff' }}>
            Kria
          </Text>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.26 * 9, textTransform: 'uppercase', color: '#F97316', marginTop: 3 }}>
            Player
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => router.push('/(tabs)/profile')}
          hitSlop={6}
        >
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={{ width: 38, height: 38, borderRadius: 4 }} />
          ) : (
            <InitialsAvatar name={firstName} size={38} />
          )}
        </Pressable>
      </View>
      <Hazard />
    </View>
  );

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
          <Chip key={s} label={s} selected={sport === s} onPress={() => setSport(sport === s ? 'All' : s)} />
        ))}
        <View style={{ flex: 1 }} />
        <Chip
          label={city === 'All' ? 'City' : city.slice(0, 3)}
          selected={city !== 'All'}
          onPress={() => setCityOpen((o) => !o)}
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
                setCity(c);
                setCityOpen(false);
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 20, color: '#fff' }}>
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
      <Screen>
        {Masthead}
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Skeleton h={10} w={88} line style={{ marginBottom: 10 }} />
          <Skeleton h={222} />
          <Skeleton h={13} w={150} line style={{ marginTop: 16, marginBottom: 10 }} />
          <Skeleton h={148} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {Masthead}
      {error && visible.length === 0 ? (
        <View style={{ padding: 16 }}>
          <ErrorBlock
            label="Events unavailable"
            message="The tournament list did not load. Your profile and past entries still work."
            onRetry={load}
          />
        </View>
      ) : (
        <FlatList
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
              onCta={filtersActive ? () => { setSport('All'); setCity('All'); } : undefined}
            />
          }
        />
      )}
    </Screen>
  );
}
