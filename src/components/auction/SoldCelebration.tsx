import { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';

interface Props {
  playerName: string;
  teamName: string;
  teamColor?: string;
  soldPrice: number;
}

export function SoldCelebration({ playerName, teamName, teamColor, soldPrice }: Props) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [scale, opacity]);

  return (
    <View className="flex-1 items-center justify-center bg-ink px-8">
      <Animated.View style={{ transform: [{ scale }], opacity }} className="items-center gap-4">
        <Text className="font-oswald text-xs uppercase tracking-[0.3em] text-gray-500">Sold To</Text>
        <Text
          className="text-center font-oswald text-5xl font-extrabold uppercase"
          style={{ color: teamColor || '#F97316' }}
        >
          {teamName}
        </Text>
        <View className="h-1 w-16 rounded-full bg-brand" />
        <Text className="text-center font-oswald text-2xl font-bold uppercase text-gray-200">{playerName}</Text>
        <View className="mt-2 rounded-full border-2 border-emerald-400/30 bg-emerald-400/10 px-8 py-3">
          <Text className="font-oswald text-4xl font-extrabold text-emerald-400">₹{soldPrice.toLocaleString()}</Text>
        </View>
      </Animated.View>
    </View>
  );
}
