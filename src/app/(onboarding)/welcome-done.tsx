// src/app/(onboarding)/welcome-done.tsx
import { View, Text, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { resetOnboarding } from '@/store/slices/onboardingSlice';
import { PlayerIDCard } from '@/components/onboarding/PlayerIDCard';
import { Btn, Hairlines } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { Icon } from '@/components/icons';
import { SPORT_LABELS } from '@/lib/sports';

// ponytail: the server has no player-number field, so the card shows the tail
// of the player id. Swap in a real number if one is ever issued server-side.
function playerNumber(id?: string) {
  if (!id) return undefined;
  return `KRIA·${id.slice(-4).toUpperCase()}`;
}

function issuedOn(value?: string) {
  return new Date(value || Date.now())
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    .toUpperCase()
    .replace(/,/g, '');
}

export default function WelcomeDone() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { fullName, sport, photoUri } = useAppSelector((s) => s.onboarding);
  const user = useAppSelector((s) => s.auth.user);

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || fullName || 'Your name';
  const firstName = name.split(/\s+/)[0];
  const number = playerNumber(user?._id);

  const explore = () => {
    dispatch(resetOnboarding());
    router.replace('/(tabs)/home');
  };

  const share = () =>
    Share.share({
      message: `${name} — Kria player ${number ?? ''}. ${SPORT_LABELS[sport || ''] || 'Badminton'}.`.trim(),
    });

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <LinearGradient
        colors={['rgba(249,115,22,0.22)', 'rgba(11,11,11,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.68 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Hairlines />
      <Ghost text="In" size={250} color="rgba(249,115,22,0.11)" style={{ left: -40, bottom: 150 }} />

      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14 }}>
            <Icon name="check" size={15} color="#16C46A" strokeWidth={2.8} />
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, color: '#16C46A' }}>CARD ISSUED</Text>
          </View>

          <View style={{ marginTop: 18 }}>
            <PlayerIDCard
              name={name}
              sport={SPORT_LABELS[sport || user?.sport || ''] || 'Badminton'}
              city={user?.location}
              photoUri={user?.profileImage || photoUri}
              variant="issued"
              playerNo={number}
              issuedOn={issuedOn(user?.createdAt)}
            />
          </View>

          <View style={{ alignItems: 'center', paddingTop: 24 }}>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 32, lineHeight: 28, color: '#fff', textAlign: 'center' }}>
              You&apos;re in,{'\n'}{firstName}.
            </Text>
            <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: '#d4d4d4', marginTop: 11, maxWidth: 280, textAlign: 'center' }}>
              Your card is live. Find a tournament that is open for entry and put it to work.
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 }}>
          <Btn label="Enter the arena" arrow onPress={explore} style={{ marginBottom: 9 }} />
          <Btn label="Share my card" variant="ghost" height={46} onPress={share} />
        </View>
      </SafeAreaView>
    </View>
  );
}
