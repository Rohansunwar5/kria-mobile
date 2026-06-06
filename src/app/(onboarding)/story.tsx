// src/app/(onboarding)/story.tsx
import { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { StoryBeat } from '@/components/onboarding/StoryBeat';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const BEATS = [
  {
    source: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80',
    headline: "You're not just playing anymore.",
    subtext: 'Step onto the court as a real competitor.',
  },
  {
    source: 'https://images.unsplash.com/photo-1613918431703-aa50889e3be9?auto=format&fit=crop&w=900&q=80',
    headline: 'Compete in real tournaments.',
    subtext: 'Live drafts, auctions, and brackets — the way the pros do it.',
  },
  {
    source: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=900&q=80',
    headline: 'Get drafted. Get ranked. Get recognized.',
    subtext: 'Build a record that follows your name.',
  },
];

function ProgressSegment({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity: 0.3 + 0.7 * progress };
  });
  return (
    <Animated.View
      style={[{ flex: 1, height: 3, borderRadius: 2, backgroundColor: '#F97316' }, style]}
    />
  );
}

export default function Story() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const [active, setActive] = useState(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const goSetup = () => router.push('/(onboarding)/setup');

  return (
    <View className="flex-1 bg-ink">
      <Animated.ScrollView
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
            headline={b.headline}
            subtext={b.subtext}
            index={i}
            active={active === i}
            scrollX={scrollX}
            width={width}
          />
        ))}
      </Animated.ScrollView>

      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 px-6">
        <View className="mt-2 flex-row items-center gap-1.5">
          {BEATS.map((_, i) => (
            <ProgressSegment key={i} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>
        <Pressable onPress={goSetup} className="mt-3 self-end" accessibilityRole="button" hitSlop={12}>
          <Text className="font-montserrat text-sm text-gray-300">Skip</Text>
        </Pressable>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 px-6 pb-6">
        {active === BEATS.length - 1 ? (
          <OnboardingButton label="Let's set you up" onPress={goSetup} />
        ) : null}
      </SafeAreaView>
    </View>
  );
}
