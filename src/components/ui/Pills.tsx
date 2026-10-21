import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '@/constants/theme';
import { Icon, type IconName } from './Icon';

/** Pills that sit on event images: date (top-left), Auction live (bottom-left). */
export function ImagePill({ label, dot }: { label: string; dot?: boolean }) {
  return (
    <View style={s.image}>
      {dot ? <View style={s.dot} /> : null}
      <Text style={s.imageText}>{label}</Text>
    </View>
  );
}

/** Live = dot + word on the accent tint, never colour alone. */
export function LivePill() {
  return (
    <View style={[s.image, { backgroundColor: colors.accentTint, borderRadius: radius.pill }]}>
      <View style={s.dot} />
      <Text style={[s.imageText, { color: colors.accentInk }]}>Live</Text>
    </View>
  );
}

/** Format / sport chip (Up next card). */
export function Chip({ label, icon }: { label: string; icon?: IconName }) {
  return (
    <View style={s.chip}>
      {icon ? <Icon name={icon} size={15} /> : null}
      <Text style={s.chipText}>{label}</Text>
    </View>
  );
}

const RESULT = {
  W: [colors.accentTint, colors.accentInk],
  L: [colors.lossTint, colors.lossInk],
  T: [colors.tieTint, colors.tieInk],
  NR: [colors.surface2, colors.text3],
} as const;

/** Always the letter, never colour alone. */
export function ResultBadge({ result }: { result: keyof typeof RESULT }) {
  const [bg, fg] = RESULT[result];
  return (
    <View style={[s.result, { backgroundColor: bg }]}>
      <Text style={[s.resultText, { color: fg, fontSize: result === 'NR' ? 11 : 13 }]}>{result}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  image: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 9, borderRadius: radius.datePill, backgroundColor: colors.bg },
  imageText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.33, color: colors.text },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.surface3, flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipText: { fontFamily: font.semibold, fontSize: 12, color: colors.text },
  result: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  resultText: { fontFamily: font.bold },
});
