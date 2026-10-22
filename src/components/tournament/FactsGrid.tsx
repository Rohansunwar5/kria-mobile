import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '@/constants/theme';

/** Two-column facts with hairlines between cells (mocks 2a/2b). */
export function FactsGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={s.grid}>
      {items.map((it, i) => (
        <View key={it.label} style={[s.cell, i % 2 === 0 && s.left, i >= 2 && s.below]}>
          <Text style={s.label}>{it.label}</Text>
          <Text style={s.value}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', paddingVertical: 14, paddingHorizontal: 16, gap: 4 },
  left: { borderRightWidth: 1, borderRightColor: colors.lineStrong, paddingLeft: 0 },
  below: { borderTopWidth: 1, borderTopColor: colors.lineStrong },
  label: { fontFamily: font.medium, fontSize: 12, color: colors.text3 },
  value: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
});
