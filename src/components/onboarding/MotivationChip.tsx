import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function MotivationChip({ label, selected, onPress }: Props) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(selected ? 1.04 : 1, { damping: 16, stiffness: 240 }) }],
  }));

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <Animated.View
        style={style}
        className={`rounded-3xl border px-4 py-3 ${
          selected ? 'border-brand bg-brand/15' : 'border-white/15 bg-white/5'
        }`}
      >
        <Text className={`font-montserrat text-sm ${selected ? 'font-semibold text-white' : 'text-gray-300'}`}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
