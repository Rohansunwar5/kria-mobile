import { View, Text, ActivityIndicator } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface Props {
  label: string;
  done: boolean;
}

export function ProgressStep({ label, done }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(300)} className="flex-row items-center gap-3 py-3">
      <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: done ? '#F97316' : '#1c1c1c' }}>
        {done ? (
          <Text className="font-montserrat text-sm font-bold text-white">✓</Text>
        ) : (
          <ActivityIndicator size="small" color="#888" />
        )}
      </View>
      <Text className={`font-montserrat text-base ${done ? 'text-white' : 'text-gray-500'}`}>{label}</Text>
    </Animated.View>
  );
}
