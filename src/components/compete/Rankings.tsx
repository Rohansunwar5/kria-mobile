import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import type { SportSummary } from '@/api/career';
import { getTopPlayers, type RankedPlayer } from '@/api/rankings';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, space, spring } from '@/constants/theme';
import { nextRankLine, rankingRows, VISIBLE, type RankRow } from '@/lib/competeView';
import { haptics } from '@/lib/haptics';
import { RANK_MIN, sportName } from '@/lib/homeView';
import { initials } from '@/lib/matchCard';
import { EVENT_SPORTS } from '@/lib/eventsList';
import { enterStagger, staggerDelay } from '@/lib/motion';
import { RANKED_SPORTS } from '@/lib/sports';

/** After "See full rankings", the scroll lands before your row pops. */
const SCROLL_SETTLE_MS = 350;

/**
 * Compete › Rankings (mock 1b/4b, DESIGN §5.7). Win rate among players with
 * RANK_MIN+ decided matches, the server's top 50 per sport, cached there for 5 min.
 * `mine`: your career summaries, null until loaded.
 * Reward spec §9: a first load staggers in and your row pops once with the
 * wins you need to pass the player above; "See full rankings" scrolls to you
 * (via `onOwnRowLayout`, y within this component) and pops your row again.
 */
export function Rankings({ sport, onSport, meId, meName, mine, onPlay, onOwnRowLayout }: {
  sport: string;
  onSport: (sport: string) => void;
  meId: string;
  meName: string;
  mine: SportSummary[] | null;
  onPlay: () => void;
  onOwnRowLayout?: (y: number, height: number) => void;
}) {
  const [boards, setBoards] = useState<Record<string, RankedPlayer[] | null>>({});
  const [expanded, setExpanded] = useState(false);
  const [pop, setPop] = useState(0);
  // Your row pops once on a fresh load; expanding spends it, so a remount in the full list doesn't pop again.
  const [fresh, setFresh] = useState(false);
  const [wantScroll, setWantScroll] = useState(false);
  const [listY, setListY] = useState(0);
  const board = boards[sport];

  const fetchBoard = useCallback((sp: string) => {
    getTopPlayers(sp, 50).then(
      (list) => {
        setBoards((b) => ({ ...b, [sp]: list }));
        setFresh(true);
      },
      () => setBoards((b) => ({ ...b, [sp]: null })),
    );
  }, []);
  const retry = () => {
    setBoards((b) => {
      const { [sport]: _, ...rest } = b;
      return rest;
    });
    fetchBoard(sport);
  };
  useEffect(() => {
    if (!(sport in boards)) fetchBoard(sport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);
  // A sport switch collapses the list (React's "previous value" pattern, not an effect).
  const [shownSport, setShownSport] = useState(sport);
  if (sport !== shownSport) {
    setShownSport(sport);
    setExpanded(false);
    setWantScroll(false);
  }

  const me = mine?.find((s) => s.sport === sport);
  const name = sportName(sport).toLowerCase();
  const expand = () => {
    const next = !expanded;
    setExpanded(next);
    setFresh(false);
    if (!next) return setWantScroll(false);
    // In the top rows already: nothing moves, so no scroll; just the pop.
    const at = board ? board.findIndex((p) => p.playerId === meId) : -1;
    if (at >= 0 && at < VISIBLE) setPop((n) => n + 1);
    else setWantScroll(at >= 0);
  };
  const ownLayout = (y: number, h: number) => {
    if (!wantScroll) return;
    setWantScroll(false);
    onOwnRowLayout?.(listY + y, h);
    setTimeout(() => setPop((n) => n + 1), SCROLL_SETTLE_MS);
  };

  return (
    <View>
      <View style={s.tabs}>
        {RANKED_SPORTS.map((sp) => {
          const on = sp === sport;
          return (
            <Pressable key={sp} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onSport(sp)} style={s.tab}>
              <Text style={[s.tabText, { color: on ? colors.text : colors.navIdle }]}>{sportName(sp)}</Text>
              <View style={[s.underline, on && { backgroundColor: colors.accent }]} />
            </Pressable>
          );
        })}
      </View>
      <Text style={s.metric}>{`Win rate · min ${RANK_MIN} decided matches`}</Text>

      {board === undefined ? (
        <View style={s.list}>
          {Array.from({ length: VISIBLE }, (_, i) => (
            <View key={i} style={[s.row, s.divider]}>
              <Skeleton style={{ width: 24, height: 18, marginHorizontal: 5 }} />
              <Skeleton style={{ width: 44, height: 44, borderRadius: 22 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton style={{ width: '70%', height: 12 }} />
                <Skeleton style={{ width: '45%', height: 10 }} />
              </View>
              <Skeleton style={{ width: 52, height: 20 }} />
            </View>
          ))}
        </View>
      ) : board === null ? (
        <InlineError what="Couldn't load the rankings." onRetry={retry} />
      ) : board.length === 0 ? (
        <View style={s.empty}>
          <GhostRows meName={meName} />
          <Text style={[display(26), { textAlign: 'center' }]}>{`No one's ranked in ${name} yet`}</Text>
          <Text style={s.emptyLine}>
            {me && me.decided >= RANK_MIN
              ? "You've qualified. Rankings refresh every few minutes."
              : `The first player to ${RANK_MIN} decided matches opens this board. You're ${RANK_MIN - (me?.decided ?? 0)} away.`}
          </Text>
          {/* Table tennis has no tournaments, only quick matches. */}
          {EVENT_SPORTS.includes(sport)
            ? <Button variant="secondary" label={`Find a ${name} event`} onPress={() => router.push({ pathname: '/(tabs)/events', params: { sport } })} style={{ marginTop: 8, height: 48, paddingHorizontal: 20 }} />
            : <Button variant="secondary" label={`Play a ${name} match`} onPress={onPlay} style={{ marginTop: 8, height: 48, paddingHorizontal: 20 }} />}
        </View>
      ) : (
        <View onLayout={(e) => setListY(e.nativeEvent.layout.y)}>
          <Board
            board={board} meId={meId} meName={meName} me={mine ? me : null} expanded={expanded} onExpand={expand}
            onPlay={onPlay} line={nextRankLine(board, meId)} pop={pop} fresh={fresh} onOwnLayout={ownLayout}
          />
        </View>
      )}
    </View>
  );
}

function Board({ board, meId, meName, me, expanded, onExpand, onPlay, line, pop, fresh, onOwnLayout }: {
  board: RankedPlayer[];
  meId: string;
  meName: string;
  /** null while your career is still loading: no own row yet. */
  me: SportSummary | undefined | null;
  expanded: boolean;
  onExpand: () => void;
  onPlay: () => void;
  line: string | null;
  pop: number;
  fresh: boolean;
  onOwnLayout: (y: number, h: number) => void;
}) {
  const reduced = useReducedMotion();
  const { rows, own } = rankingRows(board, meId, meName, me ?? undefined, expanded);
  // Only the first page staggers; rows revealed by "See full rankings" just appear.
  const props = (r: RankRow, i: number) => ({
    r, onPlay, line: r.mine ? line : null, pop: r.mine ? pop : 0, popOnMount: r.mine && fresh && !expanded, onOwnLayout: r.mine ? onOwnLayout : undefined,
    entering: r.mine ? FadeIn.duration(160).delay(staggerDelay(VISIBLE)) : i < VISIBLE ? enterStagger(i, reduced) : undefined,
  });
  return (
    <View style={s.list}>
      {rows.map((r, i) => <Row key={r.key} {...props(r, i)} />)}
      {own && me !== null ? (
        <>
          <Text style={s.gap} accessibilityElementsHidden>···</Text>
          <Row {...props(own, VISIBLE)} />
        </>
      ) : null}
      {board.length > VISIBLE ? (
        <Pressable accessibilityRole="button" onPress={onExpand} style={s.more}>
          <Text style={s.moreText}>{expanded ? `Show top ${VISIBLE}` : 'See full rankings'}</Text>
        </Pressable>
      ) : null}
      <Text style={s.note}>{`Top ${expanded ? board.length : Math.min(VISIBLE, board.length)} of ${board.length} · refreshed every few minutes`}</Text>
    </View>
  );
}

function Row({ r, onPlay, line, pop, popOnMount, onOwnLayout, entering }: {
  r: RankRow;
  onPlay: () => void;
  line: string | null;
  pop: number;
  popOnMount: boolean;
  onOwnLayout?: (y: number, h: number) => void;
  entering?: ReturnType<typeof enterStagger>;
}) {
  const ink = r.mine ? colors.accentInk : colors.text;
  const scale = useSharedValue(1);
  // Your row pops (scale 1 → 1.03 → 1, with a selection tick): once on a fresh load after the
  // stagger, and again each time `pop` changes after mount (scroll-to-you). Never just for remounting.
  const mountedPop = useRef(pop);
  const popNow = useCallback((delay: number) => {
    scale.set(withDelay(delay, withSequence(withTiming(1.03, { duration: 150 }), withSpring(1, spring.snappy))));
    return setTimeout(haptics.select, delay);
  }, [scale]);
  useEffect(() => {
    if (!popOnMount) return;
    const t = popNow(staggerDelay(VISIBLE) + 20);
    return () => clearTimeout(t);
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (pop === mountedPop.current) return;
    const t = popNow(0);
    return () => clearTimeout(t);
  }, [pop, popNow]);
  const popping = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const open = () => {
    if (r.play) onPlay();
    else if (r.mine) router.push('/(tabs)/profile');
    else if (r.playerId) router.push(`/player/${r.playerId}`);
  };
  return (
    <Animated.View entering={entering} style={popping} onLayout={onOwnLayout ? (e) => onOwnLayout(e.nativeEvent.layout.y, e.nativeEvent.layout.height) : undefined}>
      <Tap
        scale={0.99}
        accessibilityLabel={`${r.rank === '—' ? 'Unranked' : `Rank ${r.rank}`}, ${r.name}, ${r.sub}${r.rate ? `, ${r.rate}` : ''}${line ? `. ${line}` : ''}`}
        onPress={open}
        style={[s.row, r.mine ? s.mine : s.divider]}
      >
        <Text style={[r.medal ? display(26) : display(20), s.rank, { color: r.mine ? colors.accentInk : r.medal ? colors[r.medal] : colors.text3 }]}>{r.rank}</Text>
        <View style={[s.avatar, r.medal && { borderWidth: 1.5, borderColor: colors[r.medal] }]}>
          {r.photo ? <Image source={{ uri: r.photo }} style={StyleSheet.absoluteFill} /> : <Text style={s.initials}>{r.initials}</Text>}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[s.name, { color: ink }]} numberOfLines={1}>{r.name}</Text>
          <Text style={s.sub}>{r.sub}</Text>
          {line ? <Text maxFontSizeMultiplier={1.3} style={s.line}>{line}</Text> : null}
        </View>
        {r.play ? <Text style={s.play}>Play</Text> : <Text style={[display(24), { color: ink }]}>{r.rate}</Text>}
      </Tap>
    </Animated.View>
  );
}

/** The empty board's preview: three placeholder rows, yours in the middle (DESIGN v1.2 §8). */
function GhostRows({ meName }: { meName: string }) {
  const reduced = useReducedMotion();
  return (
    <View style={s.ghosts}>
      {[62, 48, 55].map((w, i) => (
        <Animated.View key={i} testID="ghost-row" entering={enterStagger(i, reduced)} style={[s.row, i === 1 ? s.mine : s.divider]}>
          <Text style={[display(20), s.rank, { color: colors.text4 }]}>—</Text>
          <View style={s.avatar}>{i === 1 ? <Text style={[s.initials, { color: colors.accentInk }]}>{initials(meName)}</Text> : null}</View>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[s.bar, { width: `${w}%` }]} />
            <View style={[s.bar, { width: `${w - 22}%`, height: 8 }]} />
          </View>
          <View style={[s.bar, { width: 46, height: 16 }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 22, paddingTop: 22, paddingHorizontal: space.gutter, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { paddingBottom: 0 },
  tabText: { fontFamily: font.semibold, fontSize: 15, paddingBottom: 12 },
  underline: { height: 2, marginBottom: -1, borderRadius: 1 },
  metric: { fontFamily: font.regular, fontSize: 12, color: colors.text3, paddingTop: 16, paddingHorizontal: space.gutter },
  list: { paddingTop: 8, paddingHorizontal: 12, paddingBottom: 24, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 20, paddingHorizontal: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  mine: { backgroundColor: colors.accentTint, borderRadius: 14 },
  rank: { width: 34, textAlign: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  name: { fontFamily: font.semibold, fontSize: 15 },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3, fontVariant: ['tabular-nums'] },
  line: { fontFamily: font.regular, fontSize: 12.5, color: colors.text2, marginTop: 2 },
  play: { fontFamily: font.bold, fontSize: 14, color: colors.accentInk },
  gap: { paddingVertical: 10, textAlign: 'center', fontSize: 16, letterSpacing: 4.8, color: colors.ring },
  more: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 16, minHeight: 44 },
  moreText: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  note: { paddingTop: 4, textAlign: 'center', fontFamily: font.regular, fontSize: 12, color: colors.text4 },
  empty: { paddingTop: 28, paddingHorizontal: 32, alignItems: 'center', gap: 14 },
  ghosts: { alignSelf: 'stretch', marginHorizontal: -20, marginBottom: 14, gap: 2 },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.surface2 },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
});
