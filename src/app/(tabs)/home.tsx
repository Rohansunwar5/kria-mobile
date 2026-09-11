import { useEffect, useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { EventsPortal } from '@/components/home/EventsPortal';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hazard } from '@/components/canvas';
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

  const firstName = user?.firstName || 'Player';

  const open = (id: string) => router.push({ pathname: '/tournament/[id]', params: { id } });

  // Masthead renders from cached auth state, so it survives every load and
  // every error — the whole point of the Patterns sheet.
  const Masthead = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 12 }}>
        <Image source={require('../../../assets/images/logo.png')} resizeMode="contain" style={{ width: 40, height: 35 }} />
        <View>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 30, lineHeight: 36, color: '#fff' }}>
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

  return (
    <Screen>
      {Masthead}
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
    </Screen>
  );
}
