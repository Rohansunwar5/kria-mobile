import { StyleSheet, Text, View } from 'react-native';
import { colors, display, font, radius } from '@/constants/theme';
import type { nextMatchView } from '@/lib/tournamentBracket';

/** Mock 2e: my next match, pinned above the bracket. */
export function NextMatchCard({ v }: { v: ReturnType<typeof nextMatchView> }) {
  const [a, b] = v.sides;
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.title} numberOfLines={1}>{v.header}</Text>
        {v.court ? <Text style={s.meta}>{v.court}</Text> : null}
      </View>
      <View style={s.sides}>
        <View style={s.side}>
          <Text style={display(20)} numberOfLines={1}>{a.name}</Text>
          {a.sub ? <Text style={s.meta} numberOfLines={1}>{a.sub}</Text> : null}
        </View>
        <Text style={s.vs}>vs</Text>
        <View style={[s.side, s.right]}>
          <Text style={[display(20), s.rightText]} numberOfLines={1}>{b.name}</Text>
          {b.sub ? <Text style={[s.meta, s.rightText]} numberOfLines={1}>{b.sub}</Text> : null}
        </View>
      </View>
      {v.when ? <Text style={s.when}>{v.when}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginTop: 28, padding: 18, gap: 14, borderRadius: radius.cardLg - 2, backgroundColor: colors.surface1 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontFamily: font.semibold, fontSize: 12, color: colors.accent },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  sides: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  side: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end' },
  rightText: { textAlign: 'right' },
  vs: { fontFamily: font.semibold, fontSize: 13, color: colors.text4 },
  when: { fontFamily: font.regular, fontSize: 13, color: colors.text2 },
});
