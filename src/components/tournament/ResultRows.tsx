import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '@/constants/theme';
import type { comingUp, resultRows } from '@/lib/standingsView';

/** Mock 2f results: "{winner} d. {loser}" (or "{a} drew with {b}", cricket "tied with"), meta, score on the right. */
export function ResultRows({ rows }: { rows: ReturnType<typeof resultRows> }) {
  return rows.map((r) => (
    <View key={r.key} style={s.row}>
      <View style={s.text}>
        <Text style={s.line} numberOfLines={1}>
          {r.winner}
          <Text style={s.joiner}>{r.tie ? ' tied with ' : r.draw ? ' drew with ' : ' d. '}</Text>
          <Text style={r.draw ? null : s.loser}>{r.loser}</Text>
        </Text>
        {r.meta ? <Text style={s.meta}>{r.meta}</Text> : null}
      </View>
      {r.score ? <Text style={s.score}>{r.score}</Text> : null}
    </View>
  ));
}

/** Scheduled matches: "{a} v {b}", date and time. */
export function ComingUpRows({ rows }: { rows: ReturnType<typeof comingUp> }) {
  return rows.map((r) => (
    <View key={r.key} style={s.row}>
      <View style={s.text}>
        <Text style={s.line} numberOfLines={1}>{`${r.a} v ${r.b}`}</Text>
        {r.meta ? <Text style={s.meta}>{r.meta}</Text> : null}
      </View>
    </View>
  ));
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  text: { flex: 1, minWidth: 0, gap: 2 },
  line: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  joiner: { fontFamily: font.regular, color: colors.text4 },
  loser: { fontFamily: font.medium, color: colors.text3 },
  meta: { fontFamily: font.regular, fontSize: 11, color: colors.text4 },
  score: { fontFamily: font.regular, fontSize: 13, color: colors.text2, fontVariant: ['tabular-nums'] },
});
