import { View } from 'react-native';

interface Props {
  total: number;
  current: number; // 0-based
}

export function StepDots({ total, current }: Props) {
  return (
    <View className="flex-row items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className="h-1.5 rounded-full"
          style={{ width: i === current ? 18 : 6, backgroundColor: i === current ? '#F97316' : '#333' }}
        />
      ))}
    </View>
  );
}
