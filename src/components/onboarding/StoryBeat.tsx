import { useEffect } from 'react';
import { ImageBackground, View, Text, AccessibilityInfo } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MOTION } from '@/lib/motion';

export interface Beat {
  source: string;
  kicker: string;
  headline: string;
  accent: string; // word(s) within headline rendered in brand orange
  subtext: string;
}

interface Props {
  beat: Beat;
  // Changes whenever the active beat changes, used to retrigger the reveal.
  beatKey: number;
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

export function StoryBeat({ beat, beatKey }: Props) {
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

  // Retrigger the reveal each time the beat changes (crossfade in).
  useEffect(() => {
    enter.value = 0;
    enter.value = withTiming(1, { duration: MOTION.enterMs + 150 });
  }, [beatKey, enter]);

  const imageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0, 0.6], [0.4, 1], Extrapolation.CLAMP),
    transform: [{ scale: reduceMotion.value ? 1 : zoom.value }],
  }));

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
    <View style={{ flex: 1, backgroundColor: '#111111' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, imageStyle]}>
        <ImageBackground source={{ uri: beat.source }} style={{ flex: 1, backgroundColor: '#111111' }} />
      </Animated.View>

      {/* Cinematic scrim: subtle at top, near-solid ink at the bottom. */}
      <LinearGradient
        colors={['rgba(17,17,17,0.40)', 'rgba(17,17,17,0.15)', 'rgba(17,17,17,0.88)', '#111111']}
        locations={[0, 0.35, 0.72, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Type block. All visual styles are INLINE — NativeWind className is not
          reliably applied to Animated.* on web, which previously rendered the
          headline as small black text. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 200 }}>
        <Animated.Text
          style={[
            { fontFamily: 'Oswald_500Medium', fontSize: 13, letterSpacing: 4, color: '#F97316', textTransform: 'uppercase', marginBottom: 16 },
            kickerStyle,
          ]}
        >
          {beat.kicker}
        </Animated.Text>

        <Animated.View style={headlineStyle}>
          <Text
            style={{ fontFamily: 'Oswald_500Medium', fontSize: 52, lineHeight: 50, color: '#FFFFFF', textTransform: 'uppercase' }}
          >
            {segments(beat.headline, beat.accent).map((seg, i) => (
              <Text key={i} style={{ color: seg.accent ? '#F97316' : '#FFFFFF' }}>
                {seg.text}
              </Text>
            ))}
          </Text>
        </Animated.View>

        <Animated.Text
          style={[
            { fontFamily: 'Montserrat_400Regular', fontSize: 15, lineHeight: 23, color: '#D4D4D4', marginTop: 20, maxWidth: 320 },
            subtextStyle,
          ]}
        >
          {beat.subtext}
        </Animated.Text>
      </View>
    </View>
  );
}
