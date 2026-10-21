import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, space } from '@/constants/theme';

/** DESIGN §8: what failed + Retry, above the content; cached data stays. */
export function InlineError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <View style={s.row}>
      <Text style={s.text}>{what}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={12}>
        <Text style={s.retry}>Retry</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { marginTop: 16, marginHorizontal: space.gutter, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  text: { flex: 1, fontFamily: font.regular, fontSize: 13, color: colors.error },
  retry: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
});
