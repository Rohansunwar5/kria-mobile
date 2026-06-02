import { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';

export function LiveBadge({ paused }: { paused?: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (paused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [paused, opacity]);

  if (paused) {
    return (
      <View className="flex-row items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1">
        <Text className="font-oswald text-xs font-bold uppercase tracking-wider text-amber-400">Paused</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-2">
      <Animated.View style={{ opacity }} className="h-2.5 w-2.5 rounded-full bg-red-500" />
      <Text className="font-oswald text-sm font-bold uppercase tracking-wider text-red-500">Live</Text>
    </View>
  );
}
