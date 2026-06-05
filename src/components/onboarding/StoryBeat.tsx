import { useEffect } from 'react';
import { ImageBackground, View, Text, AccessibilityInfo } from 'react-native';
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
  headline: string;
  subtext: string;
  index: number;
  active: boolean;
  scrollX: SharedValue<number>;
  width: number;
}

export function StoryBeat({ source, headline, subtext, index, active, scrollX, width }: Props) {
  const enter = useSharedValue(0);
  const zoom = useSharedValue(1);
  const reduceMotion = useSharedValue(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      reduceMotion.value = on;
      if (!on) {
        zoom.value = withRepeat(withTiming(1.08, { duration: 6000 }), -1, true);
      }
    });
  }, [reduceMotion, zoom]);

  useEffect(() => {
    enter.value = active ? withTiming(1, { duration: MOTION.enterMs }) : 0;
  }, [active, enter]);

  const imageStyle = useAnimatedStyle(() => {
    const parallax = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [width * 0.15, 0, -width * 0.15],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: reduceMotion.value ? 0 : parallax },
        { scale: reduceMotion.value ? 1 : zoom.value },
      ],
    };
  });

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [24, 0]) }],
  }));

  const subtextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0.4, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(enter.value, [0, 1], [16, 0]) }],
  }));

  return (
    <View style={{ width }} className="flex-1">
      <Animated.View style={[{ flex: 1 }, imageStyle]}>
        <ImageBackground source={{ uri: source }} className="flex-1" style={{ backgroundColor: '#111111' }} />
      </Animated.View>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(17,17,17,0.95)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' }}
      />
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-40">
        <Animated.Text style={headlineStyle} className="font-oswald text-5xl uppercase leading-[0.95] text-white">
          {headline}
        </Animated.Text>
        <Animated.Text style={subtextStyle} className="mt-4 font-montserrat text-base text-gray-300">
          {subtext}
        </Animated.Text>
      </View>
    </View>
  );
}
