import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { KnockoutFixture, QuickKnockout } from '@/api/quickKnockout';
import { colors, font, space } from '@/constants/theme';
import { myEntrant, roundLabel, slotName } from '@/lib/knockoutRoom';
import { bracketColumns, isPlayable } from '@/lib/quickKnockoutView';

const CARD = 200;
const GUTTER = 36;

/**
 * DESIGN §5.10 bracket: one column per round, scrolled sideways. Winner
 * bright, loser dimmed, your own fixture ringed in orange, an unfilled slot
 * named by where it comes from ("Winner of SF 1"). Columns share one height
 * and space their cards evenly, so each card sits level with the pair feeding it.
 */
export function Bracket({ k, meId, scores, onOpen }: {
  k: QuickKnockout;
  meId: string;
  /** Finished fixtures' scores, by fixture id. */
  scores: Record<string, [string, string]>;
  onOpen?: (matchId: string) => void;
}) {
  const mine = myEntrant(k, meId);
  const cols = bracketColumns(k);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.gutter }} contentContainerStyle={s.row}>
      {cols.map((col, ci) => (
        <View key={col.name} style={s.col}>
          <Text style={s.round}>{roundLabel(col.name)}</Text>
          <View style={s.cards}>
            {col.fixtures.map((f) => (
              <Fixture key={f.fixtureId} k={k} f={f} mine={!!mine && (f.entrantA === mine || f.entrantB === mine)} score={scores[f.fixtureId]} last={ci === cols.length - 1} onOpen={onOpen} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Fixture({ k, f, mine, score, last, onOpen }: {
  k: QuickKnockout;
  f: KnockoutFixture;
  mine: boolean;
  score?: [string, string];
  last: boolean;
  onOpen?: (matchId: string) => void;
}) {
  const live = k.status === 'live' && isPlayable(f);
  const a = slotName(k, f, 'A');
  const b = slotName(k, f, 'B');
  const row = (slot: { name: string; open: boolean }, id: string | undefined, sc?: string) => {
    const won = !!f.winnerEntrantId && f.winnerEntrantId === id;
    const lost = !!f.winnerEntrantId && !!id && f.winnerEntrantId !== id;
    return (
      <View style={s.line}>
        <Text numberOfLines={1} style={[s.name, won && { fontFamily: font.semibold }, (lost || slot.open) && { color: colors.text4 }]}>{slot.name}</Text>
        {sc ? <Text style={[s.score, lost && { color: colors.text4 }]}>{sc}</Text> : null}
      </View>
    );
  };
  const body = (
    <>
      {live ? (
        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>Live</Text>
        </View>
      ) : null}
      {row(a, f.entrantA, score?.[0])}
      {row(b, f.bye ? undefined : f.entrantB, score?.[1])}
      {last ? null : <View style={s.link} />}
    </>
  );
  const style = [s.card, mine && { borderColor: colors.accent }];
  return f.quickMatchId && onOpen ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`${a.name} vs ${b.name}${live ? ', live' : ''}. Open`} onPress={() => onOpen(f.quickMatchId!)} style={style}>
      {body}
    </Pressable>
  ) : (
    <View style={style} accessible accessibilityLabel={`${a.name} vs ${b.name}`}>{body}</View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', gap: GUTTER, paddingHorizontal: space.gutter, paddingTop: 4, paddingBottom: 8 },
  col: { width: CARD, gap: 14 },
  round: { fontFamily: font.semibold, fontSize: 12, color: colors.text3 },
  cards: { flex: 1, justifyContent: 'space-around', gap: 14 },
  card: { borderRadius: 16, backgroundColor: colors.surface1, paddingVertical: 10, paddingHorizontal: 12, gap: 6, borderWidth: 1.5, borderColor: 'transparent' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontFamily: font.regular, fontSize: 13.5, color: colors.text },
  score: { fontFamily: font.regular, fontSize: 12.5, color: colors.text2, fontVariant: ['tabular-nums'] },
  live: { position: 'absolute', top: -10, right: 10, zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.bg },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  liveText: { fontFamily: font.bold, fontSize: 10.5, color: colors.accentInk },
  link: { position: 'absolute', right: -GUTTER - 1.5, top: '50%', width: GUTTER, height: 1.5, backgroundColor: colors.bracketLine },
});
