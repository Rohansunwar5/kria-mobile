import { Fragment, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { colors, ease, font, space } from '@/constants/theme';
import { bracketLayout, CARD_W, GUTTER, highlightSegments, type BracketCard, type BracketColumn, type BracketRow, type Seg } from '@/lib/bracket';

/** Champion path (reward spec §10): one round every 240ms, its three segments 40ms each. */
const ROUND_MS = 240;
const SEG_MS = 40;

// Fixed card heights, so a card never drifts with its content (mock 2e: 92).
const HEADED_H = 92;
const PLAIN_H = 65;
const LINE = 1.5;

/**
 * DESIGN §5.10 bracket: one column per round, scrolled sideways. Winner
 * bright, loser dimmed, your own card ringed in orange, an unfilled slot
 * named by where it comes from ("Winner of SF 1"). Cards sit where
 * `bracketLayout` puts them, each later card on the midpoint of its feeders,
 * joined by 1.5px connectors.
 * Data-neutral: the knockout room and official tournaments each map their own into columns.
 */
export function Bracket({ columns, onOpen, highlight }: {
  columns: BracketColumn[];
  onOpen?: (id: string) => void;
  /** The champion's cards; `play` draws their path once, following it sideways, then calls `onDone`. */
  highlight?: { ids: string[]; play: boolean; onDone?: () => void };
}) {
  const headed = columns.some((col) => col.cards.some((c) => c.header !== undefined));
  const cardH = headed ? HEADED_H : PLAIN_H;
  const { tops, links, width, height } = bracketLayout(columns, cardH);
  const reduced = useReducedMotion();
  const segs = highlight ? highlightSegments(columns, cardH, highlight.ids) : [];
  const play = !!highlight?.play;
  const scroller = useRef<ScrollViewInstance>(null);
  const [viewW, setViewW] = useState(0);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (!play) return;
    // Before each round draws, bring the card it runs into on screen.
    const timers = segs.map((sg, i) => setTimeout(() => {
      const right = space.gutter + (sg.round + 1) * (CARD_W + GUTTER) + CARD_W + space.gutter;
      scroller.current?.scrollTo({ x: Math.max(0, right - viewW), animated: !reduced });
    }, i * ROUND_MS));
    timers.push(setTimeout(() => {
      setLit(true);
      highlight?.onDone?.();
    }, segs.length * ROUND_MS + SEG_MS * 3));
    return () => timers.forEach(clearTimeout);
    // Plays once when `play` turns on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);
  const lastId = highlight?.ids[highlight.ids.length - 1];
  return (
    <ScrollView ref={scroller} onLayout={(e) => setViewW(e.nativeEvent.layout.width)} horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.gutter }} contentContainerStyle={s.row}>
      <View style={{ width, gap: 14 }}>
        <View style={s.titles}>
          {columns.map((col) => <Text key={col.title} style={s.round}>{col.title}</Text>)}
        </View>
        <View style={{ height }}>
          {links.map((l, i) => (
            <Fragment key={i}>
              {l.y2 > l.y1 ? (
                <View style={[s.join, { left: l.x, top: l.y1 - LINE / 2, height: l.y2 - l.y1 + LINE }]} />
              ) : (
                <View style={[s.wire, { left: l.x, top: l.y1 - LINE / 2, width: GUTTER / 2 }]} />
              )}
              <View style={[s.wire, { left: l.x + GUTTER / 2, top: l.yMid - LINE / 2, width: GUTTER / 2 }]} />
            </Fragment>
          ))}
          {segs.map((sg, i) => <PathSeg key={sg.round} seg={sg} at={i * ROUND_MS} play={play} reduced={reduced} />)}
          {columns.map((col, ci) => col.cards.map((c, j) => (
            <Card key={c.id} c={c} headed={headed} champion={lit && c.id === lastId} at={{ left: ci * (CARD_W + GUTTER), top: tops[ci][j], height: cardH }} onOpen={onOpen} />
          )))}
        </View>
      </View>
    </ScrollView>
  );
}

function Line({ r, headed, champion }: { r: BracketRow; headed: boolean; champion?: boolean }) {
  // Headed (tournament) cards: a won game is bright, the rest dim. Headerless (knockout room): score text2, dim on the lost row.
  const scoreColor = (strong: boolean) => (headed ? (strong ? colors.text : colors.text4) : strong ? colors.text2 : colors.text4);
  return (
    <View style={[s.line, { height: headed ? 26 : 18 }]}>
      <View style={s.nameBox}>
        <Text numberOfLines={1} style={[s.name, headed && s.nameHeaded, r.won && { fontFamily: font.semibold }, (r.lost || r.open) && { color: colors.text4 }, champion && r.won && { color: colors.accentInk }]}>{r.name}</Text>
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

function Card({ c, headed, at, onOpen, champion }: { c: BracketCard; headed: boolean; at: ViewStyle; onOpen?: (id: string) => void; champion?: boolean }) {
  const body = (
    <>
      {headed ? (
        <View style={s.head}>
          {c.live ? <View style={s.liveDot} /> : null}
          <Text numberOfLines={1} style={[s.headText, c.live && { color: colors.accentInk }]}>{c.header ?? ''}</Text>
        </View>
      ) : c.live ? (
        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>Live</Text>
        </View>
      ) : null}
      <Line r={c.rows[0]} headed={headed} champion={champion} />
      <Line r={c.rows[1]} headed={headed} champion={champion} />
    </>
  );
  const style = [s.card, headed ? s.cardHeaded : s.cardPlain, at, c.mine && { borderColor: colors.accent }];
  const names = `${c.rows[0].name} vs ${c.rows[1].name}`;
  return c.openId && onOpen ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`${names}${c.live ? ', live' : ''}. Open`} onPress={() => onOpen(c.openId!)} style={style}>
      {body}
    </Pressable>
  ) : (
    <View style={style} accessible accessibilityLabel={names}>{body}</View>
  );
}

/** One round of the champion's path: stub, run, wire, each growing from the champion's side. Reduced motion: a fade. */
function PathSeg({ seg, at, play, reduced }: { seg: { stub: Seg; run: Seg; wire: Seg }; at: number; play: boolean; reduced: boolean }) {
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    const grow = (v: SharedValue<number>, after: number) =>
      v.set(reduced ? withTiming(1, { duration: 160 }) : withDelay(at + after, withTiming(1, { duration: SEG_MS, easing: ease.enter })));
    grow(a, 0);
    grow(b, SEG_MS);
    grow(c, SEG_MS * 2);
  }, [play, reduced, at, a, b, c]);
  // The run grows from the champion's card: down from a top card, up from a bottom one.
  const fromBottom = seg.stub.top > seg.run.top;
  const stub = useAnimatedStyle(() => (reduced ? { opacity: a.get() } : { transform: [{ scaleX: a.get() }] }));
  const run = useAnimatedStyle(() => (reduced ? { opacity: b.get() } : { transform: [{ scaleY: b.get() }] }));
  const wire = useAnimatedStyle(() => (reduced ? { opacity: c.get() } : { transform: [{ scaleX: c.get() }] }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[s.path, seg.stub, { transformOrigin: 'left' }, stub]} />
      <Animated.View pointerEvents="none" style={[s.path, seg.run, { transformOrigin: fromBottom ? 'bottom' : 'top' }, run]} />
      <Animated.View pointerEvents="none" style={[s.path, seg.wire, { transformOrigin: 'left' }, wire]} />
    </>
  );
}

const s = StyleSheet.create({
  path: { position: 'absolute', zIndex: 1, backgroundColor: colors.accent },
  row: { paddingHorizontal: space.gutter, paddingTop: 4, paddingBottom: 8 },
  titles: { flexDirection: 'row', gap: GUTTER },
  round: { width: CARD_W, fontFamily: font.semibold, fontSize: 12, color: colors.text3 },
  // Heights add up to the fixed card height: border 3 + padding + lines + gaps.
  card: { position: 'absolute', width: CARD_W, borderRadius: 16, backgroundColor: colors.surface1, paddingHorizontal: 12, borderWidth: LINE, borderColor: 'transparent' },
  cardHeaded: { paddingVertical: 8, gap: 4 }, // 3 + 16 + 13 + 4 + 26 + 4 + 26 = 92
  cardPlain: { paddingVertical: 10, gap: 6 }, // 3 + 20 + 18 + 6 + 18 = 65
  head: { height: 13, flexDirection: 'row', alignItems: 'center', gap: 5 },
  headText: { flex: 1, fontFamily: font.semibold, fontSize: 10.5, lineHeight: 13, color: colors.text3 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameBox: { flex: 1, justifyContent: 'center' },
  name: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 18, color: colors.text },
  nameHeaded: { fontSize: 13, lineHeight: 15 },
  sub: { fontFamily: font.regular, fontSize: 10, lineHeight: 11, color: colors.text4 },
  scores: { flexDirection: 'row', gap: 6 },
  score: { fontFamily: font.regular, fontSize: 12.5, color: colors.text2, fontVariant: ['tabular-nums'] },
  live: { position: 'absolute', top: -10, right: 10, zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.bg },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  liveText: { fontFamily: font.bold, fontSize: 10.5, color: colors.accentInk },
  // Mock 2e connector: the pair joined by a rounded bracket, then a wire into the next card.
  join: { position: 'absolute', width: GUTTER / 2, borderColor: colors.bracketLine, borderTopWidth: LINE, borderRightWidth: LINE, borderBottomWidth: LINE, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  wire: { position: 'absolute', height: LINE, backgroundColor: colors.bracketLine },
});
