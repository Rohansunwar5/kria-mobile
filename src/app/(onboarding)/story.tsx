// src/app/(onboarding)/story.tsx
import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '@/store/hooks';
import { setSport } from '@/store/slices/onboardingSlice';
import { StoryBeat, Beat } from '@/components/onboarding/StoryBeat';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const BEATS: Beat[] = [
  {
    source: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80',
    kicker: '01 — Your Game',
    headline: "This isn't just practice.",
    accent: 'practice.',
    subtext: 'Step onto the court as a real competitor — every match counts now.',
  },
  {
    source: 'https://images.unsplash.com/photo-1613918431703-aa50889e3be9?auto=format&fit=crop&w=900&q=80',
    kicker: '02 — The Arena',
    headline: 'Compete in real tournaments.',
    accent: 'tournaments.',
    subtext: 'Live drafts, auctions, and brackets — run the way the pros do it.',
  },
  {
    source: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=900&q=80',
    kicker: '03 — Your Legacy',
    headline: 'Get drafted. Get recognized.',
    accent: 'recognized.',
    subtext: 'Build a ranking and a record that follows your name.',
  },
];

export default function Story() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [active, setActive] = useState(0);

  // Badminton is the only live sport; default it so onboarding stays frictionless
  // now that the explicit sport-selection screen is gone.
  useEffect(() => {
    dispatch(setSport('badminton'));
  }, [dispatch]);

  const finish = () => router.push('/(onboarding)/card-preview');
  const isLast = active === BEATS.length - 1;

  const next = () => {
    if (isLast) finish();
    else setActive((a) => a + 1);
  };

  return (
    <View className="flex-1 bg-ink">
      {/* keyed so the beat remounts and replays its reveal on change */}
      <StoryBeat key={active} beat={BEATS[active]} beatKey={active} />

      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 px-6">
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-2">
            {BEATS.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: i <= active ? '#F97316' : 'rgba(255,255,255,0.22)',
                }}
              />
            ))}
          </View>
          <Pressable onPress={finish} className="ml-4" accessibilityRole="button" hitSlop={12}>
            <Text className="font-montserrat text-sm font-medium text-gray-300">Skip</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 px-6 pb-6">
        {active > 0 ? (
          <Pressable onPress={() => setActive((a) => a - 1)} className="mb-3 self-center" hitSlop={10} accessibilityRole="button">
            <Text className="font-montserrat text-sm text-gray-400">Back</Text>
          </Pressable>
        ) : null}
        <OnboardingButton label={isLast ? 'Claim your profile' : 'Continue'} onPress={next} />
      </SafeAreaView>
    </View>
  );
}
