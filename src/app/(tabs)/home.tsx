import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { EventsPortal } from '@/components/home/EventsPortal';
import { PlayPortal } from '@/components/home/PlayPortal';
import { PortalSwitch } from '@/components/home/PortalSwitch';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { listMyQuickMatches, type QuickMatch } from '@/api/quickMatch';
import { hasLiveQuickMatch, portalStrip, visibleTournaments, type Portal } from '@/lib/homePortal';
import { useCareer } from '@/lib/useCareer';
import { colors } from '@/lib/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPublicTournaments } from '@/store/slices/tournamentSlice';

export default function Home() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { publicTournaments, isLoading, error } = useAppSelector((s) => s.tournament);
  const user = useAppSelector((s) => s.auth.user);
  const [sport, setSport] = useState('All');
  const [city, setCity] = useState('All');
  const [cityOpen, setCityOpen] = useState(false);
  const [portal, setPortal] = useState<Portal>('events');
  const [matches, setMatches] = useState<QuickMatch[]>([]);

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

  const career = useCareer(user?._id);

  // Loaded on every focus regardless of which portal is showing: the live dot
  // on the PLAY tab is the one reason to cross over unprompted, so it has to be
  // right *before* you look at it.
  const loadMatches = useCallback(async () => {
    try {
      setMatches(await listMyQuickMatches());
    } catch {
      // A failed list leaves the dot as it was. The portal owns the retry.
    }
  }, []);

  useFocusEffect(useCallback(() => { loadMatches(); }, [loadMatches]));

  const firstName = user?.firstName || 'Player';

  const open = (id: string) => router.push({ pathname: '/tournament/[id]', params: { id } });

  const isPlay = portal === 'play';
  const accent = isPlay ? colors.auction : colors.brand;

  // The strip counts what the user can see, not what the response carried —
  // the same set EventsPortal renders, through the same predicate.
  const openCount = visibleTournaments(publicTournaments).length;
  const played = career.profile?.sports.reduce((n, s) => n + s.played, 0) ?? 0;
  const live = hasLiveQuickMatch(matches);

  // Masthead renders from cached auth state, so it survives every load and
  // every error — the whole point of the Patterns sheet.
  const Masthead = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 }}>
        <Image source={require('../../../assets/images/logo.png')} resizeMode="contain" style={{ width: 33, height: 29 }} />
        {/* The canvas draws Kria at 23/21. That is a CSS line box; on iOS the
            line box is compressed to lineHeight and the caps are shaved, which
            is what __tests__/antonLeading.test.ts fences at 1.188em. 23px needs
            27.3px, so the leading is 28 and the size is the design's. */}
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 23, lineHeight: 28, color: '#fff' }}>
          Kria
        </Text>
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

      {/* The hazard rule now belongs only to an art edge. Under the masthead a
          plain hairline carries a short tab in the live portal's accent. */}
      <View style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.10)' }}>
        <View style={{ position: 'absolute', left: 16, top: 0, width: 54, height: 2, backgroundColor: accent }} />
      </View>
    </View>
  );

  return (
    <Screen>
      {Masthead}

      <PortalSwitch portal={portal} live={live} onChange={setPortal} />

      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 9,
          letterSpacing: 0.14 * 9,
          textTransform: 'uppercase',
          color: isPlay ? colors.auction : '#7d7d7d',
          paddingHorizontal: 17,
          paddingTop: 9,
        }}
      >
        {portalStrip(portal, { openCount, city, played, live })}
      </Text>

      {/* Self-scrolling siblings: PlayPortal owns a ScrollView and EventsPortal
          a FlatList, so they are swapped, never nested in an outer scroller. */}
      <View style={{ flex: 1 }}>
        {isPlay ? (
          <PlayPortal
            profile={career.profile}
            recent={career.recent}
            matches={matches}
            playerId={user?._id}
            loading={career.loading}
            onRetry={career.reload}
          />
        ) : (
          <EventsPortal
            tournaments={publicTournaments}
            isLoading={isLoading}
            error={error}
            sport={sport}
            city={city}
            cityOpen={cityOpen}
            onSport={setSport}
            onCity={setCity}
            onToggleCity={() => setCityOpen((o) => !o)}
            onOpen={open}
            onRetry={load}
          />
        )}
      </View>
    </Screen>
  );
}
