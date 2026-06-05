import { Pressable, View, Text } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Props {
  title: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  badge?: string;
  onPress?: () => void;
}

export function SelectableCard({ title, description, selected, disabled, badge, onPress }: Props) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(selected ? 1.02 : 1, { damping: 18, stiffness: 220 }) }],
  }));

  return (
    <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button">
      <Animated.View
        style={style}
        className={`rounded-3xl border p-5 ${
          selected ? 'border-brand bg-brand/10' : 'border-white/10 bg-white/5'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-oswald text-xl uppercase text-white">{title}</Text>
          {badge ? (
            <Text className="font-montserrat text-[10px] uppercase tracking-wide text-gray-400">{badge}</Text>
          ) : null}
        </View>
        {description ? (
          <Text className="mt-1 font-montserrat text-sm text-gray-400">{description}</Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
