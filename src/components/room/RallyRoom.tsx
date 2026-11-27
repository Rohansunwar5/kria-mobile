import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import type { QuickMatch } from '@/api/quickMatch';
import { FlipScore } from '@/components/FlipScore';
import { BEATS, MomentSections, ResultChip, Stage } from '@/components/room/ResultMoment';
import { Icon } from '@/components/ui/Icon';
import { colors, display, font } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { currentGame, gamesWon } from '@/lib/quickMatchView';
import type { ResultMoment } from '@/lib/resultMoment';
import { finishedGames, resultSummary, swipeDelta } from '@/lib/roomView';

/** Mock 1e, live: two swipe cards (host) or the same score read-only (everyone else). */
export function RallyLive({ match, host, busy, onPoint, onLock }: {
  match: QuickMatch;
  host: boolean;
  busy: boolean;
  onPoint: (side: 1 | 2, delta: 1 | -1) => void;
  /** Holds the page still while a finger is on a card, so a swipe never scrolls. */
  onLock: (locked: boolean) => void;
}) {
  const g = currentGame(match);
  const won = gamesWon(match);
  const done = finishedGames(match);
  const gameNo = g?.gameNumber ?? done.length + 1;
  // A game closing gets a Medium haptic (the haptic map's "game ends").
  const closed = useRef(done.length);
  useEffect(() => {
    if (done.length > closed.current) haptics.gameEnd();
    closed.current = done.length;
  }, [done.length]);
  return (
    <View style={{ gap: 18, paddingTop: 32 }}>
      <View style={s.meta}>
        <Text style={s.metaText}>{`Game ${gameNo} · first to ${match.matchConfig?.pointsToWin ?? 21}`}</Text>
        <Text style={s.metaText}>{`Games ${won.side1}–${won.side2}`}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([1, 2] as const).map((side) => (
          <SwipeScoreCard
            key={side}
            name={match.sides[side - 1]?.name ?? `Side ${side}`}
            value={(side === 1 ? g?.side1Score : g?.side2Score) ?? 0}
            enabled={host && !busy}
            showHint={host}
            onDelta={(d) => onPoint(side, d)}
            onLock={onLock}
          />
        ))}
      </View>
      <Games games={done} />
      <Text style={s.note}>{host ? 'Only the host scores.' : 'Only the host can score.'}</Text>
    </View>
  );
}

function SwipeScoreCard({ name, value, enabled, showHint, onDelta, onLock }: {
  name: string;
  value: number;
  enabled: boolean;
  showHint: boolean;
  onDelta: (delta: 1 | -1) => void;
  onLock: (locked: boolean) => void;
}) {
  // One responder for the card's life: a re-render mid-swipe must not swap it
  // out, or the release lands on a fresh gesture with no distance.
  const live = useRef({ value, enabled, onDelta, onLock });
  useLayoutEffect(() => {
    live.current = { value, enabled, onDelta, onLock };
  });
  // The handlers read `live` only during a gesture, never during render; the
  // compiler can't see through PanResponder's callbacks.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    const accept = (delta: 1 | -1) => {
      const c = live.current;
      if (!c.enabled || (delta < 0 && c.value === 0)) return;
      haptics.point();
      c.onDelta(delta);
    };
    return {
      accept,
      responder: PanResponder.create({
        onStartShouldSetPanResponder: () => live.current.enabled,
        onMoveShouldSetPanResponder: () => live.current.enabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => live.current.onLock(true),
        onPanResponderRelease: (_, gesture) => {
          live.current.onLock(false);
          const d = swipeDelta(gesture.dy);
          if (d) accept(d);
        },
        onPanResponderTerminate: () => live.current.onLock(false),
      }),
    };
  });

  return (
    <View
      {...pan.responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${name} score`}
      accessibilityValue={{ text: String(value) }}
      accessibilityActions={enabled ? [{ name: 'increment', label: 'Add a point' }, { name: 'decrement', label: 'Remove a point' }] : []}
      onAccessibilityAction={(e) => pan.accept(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={s.card}
    >
      <Text style={s.side} numberOfLines={1}>{name}</Text>
      <FlipScore value={value} />
      {showHint ? (
        <View style={s.hint}>
          <Icon name="swipe_vertical" size={20} color={colors.text3} />
          <Text style={s.hintText}>Up +1 · Down −1</Text>
        </View>
      ) : null}
    </View>
  );
}

function Games({ games, big }: { games: { n: number; score: string }[]; big?: boolean }) {
  return (
    <View>
      {games.map((g) => (
        <View key={g.n} style={[s.game, big && { paddingVertical: 14 }]}>
          <Text style={[s.gameText, big && { fontSize: 15 }, { color: colors.text3 }]}>{`Game ${g.n}`}</Text>
          <Text style={[s.gameText, big && { fontSize: 15 }, { fontFamily: font.semibold }]}>{g.score}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Mock 1e, completed. Rally matches only; cricket keeps its own summary.
 * With a `moment` (the viewer watched it finish, reward spec §7) it adds the
 * result letter, the tiles, the progress line and any inline mint, staged over
 * ~1.2s (2.4s with a mint); a tap anywhere lands everything at once. Reduced
 * motion: one 160ms fade, final values. A loss stages with plain fades.
 */
export function RallyDone({ match, moment, play = false }: { match: QuickMatch; moment?: ResultMoment | null; play?: boolean }) {
  const { headline, note } = resultSummary(match);
  const reduced = useReducedMotion();
  const m = moment ?? null;
  const animate = !!m && play && !reduced;
  const [skipped, setSkipped] = useState(false);
  useEffect(() => {
    if (!m || !play) return;
    if (m.outcome === 'win') haptics.win();
    else if (m.outcome === 'loss') haptics.loss();
  }, [m, play]);

  // One stable root (review #1): the moment arrives after the plain result is already on screen,
  // so the headline, games and credit stay put and only the new sections stage in.
  const fresh = m && play && reduced ? FadeIn.duration(160) : undefined;
  return (
    <Pressable accessible={false} disabled={!animate || skipped} onPress={() => setSkipped(true)} style={{ gap: 28, paddingTop: 32 }}>
      <View style={{ gap: 12 }}>
        {m ? (
          <Animated.View entering={fresh}>
            <Stage at={BEATS.head} animate={animate} skipped={skipped} springy={m.outcome !== 'loss'}><ResultChip outcome={m.outcome} /></Stage>
          </Animated.View>
        ) : null}
        <Text style={display(64)}>{headline}</Text>
      </View>
      <Games games={finishedGames(match)} big />
      {m ? <Animated.View entering={fresh} style={{ gap: 28 }}><MomentSections m={m} animate={animate} skipped={skipped} /></Animated.View> : null}
      <View style={s.credit}>
        <Icon name="trending_up" size={22} color={colors.accent} />
        <Text style={s.creditText}>{note}</Text>
      </View>
    </Pressable>
  );
}

export function Cancelled() {
  return (
    <View style={s.cancelled}>
      <Icon name="block" size={36} color={colors.text4} />
      <Text style={display(28)}>Match cancelled</Text>
      <Text style={s.cancelledText}>{"Players who claimed a spot see it as cancelled. Nothing was added to anyone's record."}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontFamily: font.regular, fontSize: 12, color: colors.text3, fontVariant: ['tabular-nums'] },
  card: { flex: 1, height: 300, borderRadius: 24, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  side: { fontFamily: font.semibold, fontSize: 13, color: colors.text2, paddingHorizontal: 12 },
  hint: { alignItems: 'center', gap: 2 },
  hintText: { fontFamily: font.regular, fontSize: 11.5, color: colors.text4 },
  game: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  gameText: { fontFamily: font.regular, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.text4, textAlign: 'center' },
  credit: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.surface1 },
  creditText: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.text2 },
  cancelled: { alignItems: 'center', gap: 12, paddingTop: 80, paddingHorizontal: 20 },
  cancelledText: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
});
