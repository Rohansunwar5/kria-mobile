import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '@/constants/theme';
import type { Tone } from '@/lib/tournamentView';

export function StatusDot({ text, tone }: { text: string; tone: Tone }) {
  return (
    <View style={s.row}>
      <View style={[s.dot, { backgroundColor: colors[tone] }]} />
      <Text style={[s.text, { color: colors[tone] }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontFamily: font.medium, fontSize: 13 },
});
