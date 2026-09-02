import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ink }}>
      <View className="flex-1 bg-ink">{children}</View>
    </SafeAreaView>
  );
}
