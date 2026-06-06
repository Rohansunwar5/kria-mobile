import { useEffect } from 'react';
import { ImageBackground, View, AccessibilityInfo } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MOTION } from '@/lib/motion';

interface Props {
  source: string;
  kicker: string;
  headline: string;
  // Word(s) within `headline` to render in the brand accent color.
  accent: string;
  subtext: string;
  index: number;
  active: boolean;
  scrollX: SharedValue<number>;
  width: number;
}

// Splits a headline into segments, marking the accent run so it can be colored.
function segments(headline: string, accent: string): { text: string; accent: boolean }[] {
  const i = headline.toLowerCase().indexOf(accent.toLowerCase());
  if (i < 0) return [{ text: headline, accent: false }];
  return [
    { text: headline.slice(0, i), accent: false },
    { text: headline.slice(i, i + accent.length), accent: true },
    { text: headline.slice(i + accent.length), accent: false },
  ].filter((s) => s.text.length > 0);
}

export function StoryBeat({ source, kicker, headline, accent, subtext, index, active, scrollX, width }: Props) {
  const enter = useSharedValue(0);
  const zoom = useSharedValue(1);
  const reduceMotion = useSharedValue(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      reduceMotion.value = on;
      if (!on) {
        zoom.value = withRepeat(withTiming(1.12, { duration: 7000 }), -1, true);
      }
    });
  }, [reduceMotion, zoom]);

  useEffect(() => {
    enter.value = active ? withTiming(1, { duration: MOTION.enterMs + 150 }) : 0;
  }, [active, enter]);

  const imageStyle = useAnimatedStyle(() => {
    const parallax = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [width * 0.2, 0, -width * 0.2],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: reduceMotion.value ? 0 : parallax },
        { scale: reduceMotion.value ? 1 : zoom.value },
      ],
    };
  });

  // Staggered reveal: kicker first, then headline, then subtext.
  const kickerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0, 0.5], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(enter.value, [0, 1], [20, 0], Extrapolation.CLAMP) }],
  }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0.15, 0.65], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(enter.value, [0.15, 1], [34, 0], Extrapolation.CLAMP) }],
  }));
  const subtextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(enter.value, [0.5, 1], [18, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={{ width }} className="flex-1">
      <Animated.View style={[{ flex: 1 }, imageStyle]}>
        <ImageBackground source={{ uri: source }} className="flex-1" style={{ backgroundColor: '#111111' }} />
      </Animated.View>

      {/* Full-height cinematic scrim: subtle at top, near-solid ink at the bottom. */}
      <LinearGradient
        colors={['rgba(17,17,17,0.35)', 'rgba(17,17,17,0.15)', 'rgba(17,17,17,0.85)', '#111111']}
        locations={[0, 0.35, 0.72, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Type block lifted into the lower-middle so the headline dominates. */}
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-48">
        <Animated.Text
          style={kickerStyle}
          className="mb-4 font-oswald text-sm uppercase tracking-[4px] text-brand"
        >
          {kicker}
        </Animated.Text>

        <Animated.Text
          style={headlineStyle}
          className="font-oswald text-6xl uppercase leading-[0.92] text-white"
        >
          {segments(headline, accent).map((seg, i) => (
            <Animated.Text key={i} className={seg.accent ? 'text-brand' : 'text-white'}>
              {seg.text}
            </Animated.Text>
          ))}
        </Animated.Text>

        <Animated.Text
          style={subtextStyle}
          className="mt-5 max-w-[300px] font-montserrat text-base leading-6 text-gray-300"
        >
          {subtext}
        </Animated.Text>
      </View>
    </View>
  );
}
