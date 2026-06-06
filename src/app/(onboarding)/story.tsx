// src/app/(onboarding)/story.tsx
import { useEffect, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
  runOnUI,
} from 'react-native-reanimated';
import { useAppDispatch } from '@/store/hooks';
import { setSport } from '@/store/slices/onboardingSlice';
import { StoryBeat } from '@/components/onboarding/StoryBeat';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const BEATS = [
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

function ProgressSegment({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const fillStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { width: `${progress * 100}%` };
  });
  return (
    <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
      <Animated.View style={[{ height: 3, borderRadius: 2, backgroundColor: '#F97316' }, fillStyle]} />
    </View>
  );
}

export default function Story() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const [active, setActive] = useState(0);

  const scrollToIndex = (i: number) => {
    runOnUI(() => {
      'worklet';
      scrollTo(scrollRef, i * width, 0, true);
    })();
  };

  // Badminton is the only live sport; default it so onboarding stays frictionless
  // now that the explicit sport-selection screen is gone.
  useEffect(() => {
    dispatch(setSport('badminton'));
  }, [dispatch]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const finish = () => router.push('/(onboarding)/profile');

  return (
    <View className="flex-1 bg-ink">
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.x / width))}
        className="flex-1"
      >
        {BEATS.map((b, i) => (
          <StoryBeat
            key={i}
            source={b.source}
            kicker={b.kicker}
            headline={b.headline}
            accent={b.accent}
            subtext={b.subtext}
            index={i}
            active={active === i}
            scrollX={scrollX}
            width={width}
          />
        ))}
      </Animated.ScrollView>

      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 px-6">
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-2">
            {BEATS.map((_, i) => (
              <ProgressSegment key={i} index={i} scrollX={scrollX} width={width} />
            ))}
          </View>
          <Pressable onPress={finish} className="ml-4" accessibilityRole="button" hitSlop={12}>
            <Text className="font-montserrat text-sm font-medium text-gray-300">Skip</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 px-6 pb-6">
        <OnboardingButton
          label={active === BEATS.length - 1 ? 'Claim your profile' : 'Continue'}
          onPress={() => {
            if (active === BEATS.length - 1) finish();
            else scrollToIndex(active + 1);
          }}
        />
      </SafeAreaView>
    </View>
  );
}
