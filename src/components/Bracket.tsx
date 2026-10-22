import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font, space } from '@/constants/theme';
import type { BracketCard, BracketColumn, BracketRow } from '@/lib/bracket';

const CARD = 200;
const GUTTER = 36;

/**
 * DESIGN §5.10 bracket: one column per round, scrolled sideways. Winner
 * bright, loser dimmed, your own card ringed in orange, an unfilled slot
 * named by where it comes from ("Winner of SF 1"). Columns share one height
 * and space their cards evenly, so each card sits level with the pair feeding it.
 * Data-neutral: the knockout room and official tournaments each map their own into columns.
 */
export function Bracket({ columns, onOpen }: { columns: BracketColumn[]; onOpen?: (id: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.gutter }} contentContainerStyle={s.row}>
      {columns.map((col, ci) => (
        <View key={col.title} style={s.col}>
          <Text style={s.round}>{col.title}</Text>
          <View style={s.cards}>
            {col.cards.map((c) => (
              <Card key={c.id} c={c} last={ci === columns.length - 1} onOpen={onOpen} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Line({ r, headed }: { r: BracketRow; headed: boolean }) {
  // Headed (tournament) cards: a won game is bright, the rest dim. Headerless (knockout room): score text2, dim on the lost row.
  const scoreColor = (strong: boolean) => (headed ? (strong ? colors.text : colors.text4) : strong ? colors.text2 : colors.text4);
  return (
    <View style={s.line}>
      <View style={s.nameBox}>
        <Text numberOfLines={1} style={[s.name, r.won && { fontFamily: font.semibold }, (r.lost || r.open) && { color: colors.text4 }]}>{r.name}</Text>
        {r.sub ? <Text numberOfLines={1} style={s.sub}>{r.sub}</Text> : null}
      </View>
      {r.scores.length ? (
        <View style={s.scores}>
          {r.scores.map((sc, i) => (
            <Text key={i} style={[s.score, { color: scoreColor(sc.strong) }, headed && sc.strong && { fontFamily: font.semibold }]}>{sc.v}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Card({ c, last, onOpen }: { c: BracketCard; last: boolean; onOpen?: (id: string) => void }) {
  const headed = c.header !== undefined;
  const body = (
    <>
      {headed ? (
        <View style={s.head}>
          {c.live ? <View style={s.liveDot} /> : null}
          <Text numberOfLines={1} style={[s.headText, c.live && { color: colors.accentInk }]}>{c.header}</Text>
        </View>
      ) : c.live ? (
        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>Live</Text>
        </View>
      ) : null}
      <Line r={c.rows[0]} headed={headed} />
      <Line r={c.rows[1]} headed={headed} />
      {last ? null : <View style={s.link} />}
    </>
  );
  const style = [s.card, c.mine && { borderColor: colors.accent }];
  const names = `${c.rows[0].name} vs ${c.rows[1].name}`;
  return c.openId && onOpen ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`${names}${c.live ? ', live' : ''}. Open`} onPress={() => onOpen(c.openId!)} style={style}>
      {body}
    </Pressable>
  ) : (
    <View style={style} accessible accessibilityLabel={names}>{body}</View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', gap: GUTTER, paddingHorizontal: space.gutter, paddingTop: 4, paddingBottom: 8 },
  col: { width: CARD, gap: 14 },
  round: { fontFamily: font.semibold, fontSize: 12, color: colors.text3 },
  cards: { flex: 1, justifyContent: 'space-around', gap: 14 },
  card: { borderRadius: 16, backgroundColor: colors.surface1, paddingVertical: 10, paddingHorizontal: 12, gap: 6, borderWidth: 1.5, borderColor: 'transparent' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headText: { flex: 1, fontFamily: font.semibold, fontSize: 11, color: colors.text3 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameBox: { flex: 1 },
  name: { fontFamily: font.regular, fontSize: 13.5, color: colors.text },
  sub: { fontFamily: font.regular, fontSize: 11, color: colors.text3 },
  scores: { flexDirection: 'row', gap: 6 },
  score: { fontFamily: font.regular, fontSize: 12.5, color: colors.text2, fontVariant: ['tabular-nums'] },
  live: { position: 'absolute', top: -10, right: 10, zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.bg },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  liveText: { fontFamily: font.bold, fontSize: 10.5, color: colors.accentInk },
  link: { position: 'absolute', right: -GUTTER - 1.5, top: '50%', width: GUTTER, height: 1.5, backgroundColor: colors.bracketLine },
});
