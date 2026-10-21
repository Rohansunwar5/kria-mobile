import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '@/constants/theme';

/**
 * Section title (17/650) with optional right-hand text: `link` + `onLink` make
 * it tappable, `meta` is plain (a count, a note). The 18 below it belongs to the caller's gap.
 */
export function SectionHeader({ title, link, onLink, meta }: { title: string; link?: string; onLink?: () => void; meta?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.title}>{title}</Text>
      {link && onLink ? (
        <Pressable accessibilityRole="link" onPress={onLink} hitSlop={12}>
          <Text style={s.link}>{link}</Text>
        </Pressable>
      ) : meta ? (
        <Text style={s.meta}>{meta}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  link: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.text3, fontVariant: ['tabular-nums'] },
});
