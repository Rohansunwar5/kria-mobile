// src/app/(onboarding)/card-preview.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '@/store/hooks';
import { PlayerIDCard } from '@/components/onboarding/PlayerIDCard';
import { Btn, IconBtn, Kick } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { SPORT_LABELS } from '@/lib/sports';

export default function CardPreview() {
  const router = useRouter();
  const { fullName, sport, photoUri } = useAppSelector((s) => s.onboarding);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <IconBtn icon="chevron-left" label="Go back" onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.16 * 9, color: '#7d7d7d' }}>STEP 3 OF 4</Text>
      </View>

      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 20, overflow: 'hidden' }}>
        <Ghost text="ID" size={230} style={{ left: -34, top: 120 }} />

        <Kick style={{ letterSpacing: 0.3 * 9, paddingTop: 6 }}>Your player card</Kick>

        <View style={{ marginTop: 20 }}>
          <PlayerIDCard
            name={fullName || 'Your name'}
            sport={SPORT_LABELS[sport || ''] || 'Badminton'}
            photoUri={photoUri}
            variant="preview"
          />
        </View>

        <View style={{ alignItems: 'center', paddingTop: 24 }}>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 28, lineHeight: 25, color: '#fff', textAlign: 'center' }}>
            Let&apos;s make{'\n'}it yours.
          </Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: '#d4d4d4', marginTop: 10, maxWidth: 270, textAlign: 'center' }}>
            Create your account to claim the card and get your player number.
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 }}>
        <Btn label="Claim my card" arrow onPress={() => router.push('/(onboarding)/auth')} />
      </View>
    </SafeAreaView>
  );
}
