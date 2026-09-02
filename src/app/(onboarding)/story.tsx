// src/app/(onboarding)/story.tsx
import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch } from '@/store/hooks';
import { setSport } from '@/store/slices/onboardingSlice';
import { Btn, Hairlines, Kick } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { Icon, type IconName } from '@/components/icons';

interface Beat {
  kicker: string;
  headline: string;
  accent: string;
  body: string;
  bullets: { icon: IconName; text: string }[];
  wash: [string, string, string];
}

const BEATS: Beat[] = [
  {
    kicker: '01 — Your game',
    headline: "This isn't just\n",
    accent: 'practice.',
    body: 'Step onto the court as a registered competitor. Every match you play is recorded against your name.',
    bullets: [
      { icon: 'id-card', text: 'A player card with a real number' },
      { icon: 'court', text: 'Entries, draws and results in one place' },
      { icon: 'chart', text: 'A record that carries between tournaments' },
    ],
    wash: ['#3a2415', '#141414', '#0B0B0B'],
  },
  {
    kicker: '02 — The arena',
    headline: 'Compete in\nreal ',
    accent: 'tournaments.',
    body: 'Live drafts, auctions and brackets — run the way the pros do it, not a spreadsheet in a group chat.',
    bullets: [
      { icon: 'gavel', text: 'Teams bid for you in a live auction' },
      { icon: 'bracket', text: 'Brackets and standings update as results land' },
      { icon: 'live', text: 'Every match broadcast, point by point' },
    ],
    wash: ['#152331', '#141414', '#0B0B0B'],
  },
  {
    kicker: '03 — Your legacy',
    headline: 'Get drafted.\nGet ',
    accent: 'recognised.',
    body: 'Build a ranking and a record that follows your name from one season into the next.',
    bullets: [
      { icon: 'trophy', text: 'Titles and awards on your profile' },
      { icon: 'medal', text: 'Category leaderboards, per tournament' },
      { icon: 'people', text: 'Squads that can find you next season' },
    ],
    wash: ['#1c2a18', '#141414', '#0B0B0B'],
  },
];

export default function Story() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [active, setActive] = useState(0);
  const beat = BEATS[active];

  // Badminton is the fullest-featured sport; default it so onboarding stays
  // frictionless. The next screen lets the player change it.
  useEffect(() => {
    dispatch(setSport('badminton'));
  }, [dispatch]);

  const finish = () => router.push('/(onboarding)/card-preview');
  const isLast = active === BEATS.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0B' }}>
      <LinearGradient
        colors={beat.wash}
        locations={[0, 0.55, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Hairlines />
      <Ghost text={`0${active + 1}`} size={250} style={{ right: -46, top: 96 }} />
      <LinearGradient
        colors={['transparent', 'rgba(11,11,11,0.5)', '#0B0B0B']}
        locations={[0.1, 0.45, 0.84]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {/* Hard segments, not a rounded pill. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 6 }}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
            {BEATS.map((_, i) => (
              <View key={i} style={{ flex: 1, height: 4, backgroundColor: i <= active ? '#F97316' : 'rgba(255,255,255,0.18)' }} />
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Skip the intro" onPress={finish} hitSlop={12}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.14 * 9, color: '#a3a3a3' }}>SKIP</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ paddingHorizontal: 20 }}>
          <Kick style={{ letterSpacing: 0.26 * 9 }}>{beat.kicker}</Kick>
          <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 46, lineHeight: 41, color: '#fff', marginTop: 14 }}>
            {beat.headline}
            <Text style={{ color: '#F97316' }}>{beat.accent}</Text>
          </Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, lineHeight: 21, color: '#d4d4d4', marginTop: 14, maxWidth: 315 }}>
            {beat.body}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          {beat.bullets.map((b, i, all) => (
            <View key={b.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: i === all.length - 1 ? 0 : 10 }}>
              <Icon name={b.icon} size={17} color="#F97316" strokeWidth={2} />
              <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: '#d4d4d4' }}>{b.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 26 }}>
          <Btn label="Continue" arrow onPress={() => (isLast ? finish() : setActive((a) => a + 1))} />
          {active > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => setActive((a) => a - 1)} hitSlop={10} style={{ alignItems: 'center', marginTop: 14 }}>
              <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.14 * 9, color: '#7d7d7d' }}>BACK</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
