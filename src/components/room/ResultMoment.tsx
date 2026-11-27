import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { AwardBadge } from '@/components/AwardBadge';
import { RollNumber } from '@/components/ui/RollNumber';
import { colors, display, ease, font, metals, spring } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { RANK_MIN, sportName } from '@/lib/homeView';
import type { MomentOutcome, ResultMoment } from '@/lib/resultMoment';

/** When each part of the result moment starts, ms after it appears (reward spec §7). */
export const BEATS = { head: 0, games: 120, tiles: 360, prog: 700, fill: 880, pop: 1100, mint: 1150, minted: 1670, credit: 1000, creditAfterMint: 1700 };
const COIN = 96;

/** A section that rises (or fades) in at `at` ms while animating; a skip lands it at once. */
export function Stage({ at, animate, skipped, rise = true, springy = false, style, children }: {
  at: number;
  animate: boolean;
  skipped: boolean;
  rise?: boolean;
  springy?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const v = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    v.set(withDelay(at, springy ? withSpring(1, spring.gentle) : withTiming(1, { duration: 220, easing: ease.enter })));
    return () => cancelAnimation(v);
  }, [animate, at, springy, v]);
  useEffect(() => {
    if (!skipped) return;
    cancelAnimation(v);
    v.set(1);
  }, [skipped, v]);
  const shown = useAnimatedStyle(() => ({ opacity: Math.min(1, v.get()), transform: rise ? [{ translateY: (1 - v.get()) * 8 }] : [] }));
  return <Animated.View style={[style, shown]}>{children}</Animated.View>;
}

const CHIP: Record<MomentOutcome, { text: string; label: string; bg: string; ink: string }> = {
  win: { text: 'W', label: 'Won', bg: colors.accentTint, ink: colors.accentInk },
  loss: { text: 'L', label: 'Lost', bg: colors.lossTint, ink: colors.lossInk },
  tie: { text: 'T', label: 'Tied', bg: colors.tieTint, ink: colors.tieInk },
  nr: { text: 'NR', label: 'No result', bg: colors.surface2, ink: colors.text3 },
};

/** The result letter (DESIGN §10: results are W/L letters, never colour alone). */
export function ResultChip({ outcome }: { outcome: MomentOutcome }) {
  const c = CHIP[outcome];
  return (
    <View accessible accessibilityLabel={c.label} style={[s.chip, { backgroundColor: c.bg }]}>
      <Text maxFontSizeMultiplier={1.3} style={[s.chipText, { color: c.ink }]}>{c.text}</Text>
    </View>
  );
}

const unitText = (unit: string, target: number) => (unit === 'ranked' ? 'to get ranked' : `to ${target} ${unit}`);
const mintTitle = (unit: string, target: number) => (unit === 'wins' ? `${target} wins` : `${target} ${unit} played`);

/** Tiles, the progress line (or the qualify line) and the inline mint, timed to BEATS. */
export function MomentSections({ m, animate, skipped }: { m: ResultMoment; animate: boolean; skipped: boolean }) {
  const rolling = animate && !skipped;
  const [sweep, setSweep] = useState(false);
  useEffect(() => {
    if (!animate || skipped) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (m.bar && m.bar.to >= m.bar.target) timers.push(setTimeout(haptics.tick, BEATS.pop));
    if (m.minted) {
      timers.push(setTimeout(() => {
        // A win already used the visit's one notification haptic.
        if (m.outcome === 'win') haptics.mint();
        else haptics.award();
        setSweep(true);
      }, BEATS.minted));
    }
    return () => timers.forEach(clearTimeout);
  }, [animate, skipped, m]);

  const unit = m.minted ? m.minted.id.split('-')[0] : '';
  return (
    <>
      <Stage at={BEATS.tiles} animate={animate} skipped={skipped} style={s.tiles}>
        <Tile first label="Win rate" sub={m.winRate.from !== '—' ? `was ${m.winRate.from}` : m.outcome === 'nr' ? 'no decided matches yet' : 'first decided match'}>
          <RollNumber from={m.winRate.from} to={m.winRate.to} style={s.big} delay={BEATS.tiles} play={rolling} />
        </Tile>
        <Tile label="Decided" sub={m.outcome === 'nr' ? 'No result: not counted' : '+1 this match'}>
          <RollNumber from={m.decided.from} to={m.decided.to} style={s.big} delay={BEATS.tiles} play={rolling} />
        </Tile>
        {m.next ? (
          <Tile label="Next" sub={unitText(m.next.unit, m.next.target)}>
            <Text maxFontSizeMultiplier={1.3} style={s.big}>{`${m.next.remaining} more`}</Text>
          </Tile>
        ) : null}
      </Stage>

      {m.qualified ? (
        <Stage at={BEATS.prog} animate={animate} skipped={skipped} rise={false}>
          <Text maxFontSizeMultiplier={1.3} style={s.qualify}>
            {`You've reached ${RANK_MIN} decided matches in ${sportName(m.sport).toLowerCase()}. You'll appear in the rankings within a few minutes.`}
          </Text>
        </Stage>
      ) : m.bar ? (
        <Stage at={BEATS.prog} animate={animate} skipped={skipped} rise={false} style={{ gap: 9 }}>
          <View style={s.barHead}>
            <Text maxFontSizeMultiplier={1.3} style={s.barLabel}>{m.bar.label}</Text>
            <View style={s.barCount}>
              <RollNumber from={String(m.bar.from)} to={String(m.bar.to)} style={s.barNum} delay={BEATS.fill} play={rolling} />
              <Text maxFontSizeMultiplier={1.3} style={s.barLabel}>{` of ${m.bar.target}`}</Text>
            </View>
          </View>
          <Bar from={m.bar.from / m.bar.target} to={m.bar.to / m.bar.target} animate={animate} skipped={skipped} />
        </Stage>
      ) : null}

      {m.minted ? (
        <Stage at={BEATS.mint} animate={animate} skipped={skipped} springy style={s.mint}>
          <MintCoin target={m.minted.target} sub={unit.toUpperCase()} animate={animate} skipped={skipped} sweep={sweep} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text maxFontSizeMultiplier={1.3} style={[s.mintLabel, { color: metals.silver.base }]}>Milestone · earned in this match</Text>
            <Text maxFontSizeMultiplier={1.3} style={display(28)}>{mintTitle(unit, m.minted.target)}</Text>
            {m.mintNext ? <Text maxFontSizeMultiplier={1.3} style={s.mintNext}>{`Next: ${m.mintNext}.`}</Text> : null}
          </View>
        </Stage>
      ) : null}
    </>
  );
}

function Tile({ label, sub, first, children }: { label: string; sub: string; first?: boolean; children: ReactNode }) {
  return (
    <View style={[s.tile, first && s.tileFirst]}>
      <Text maxFontSizeMultiplier={1.3} style={s.tileLabel}>{label}</Text>
      <View style={s.tileValue}>{children}</View>
      <Text maxFontSizeMultiplier={1.3} style={s.tileLabel}>{sub}</Text>
    </View>
  );
}

/** Fills from → to; reaching 100% clamps, then pops once (scaleY 1 → 1.5 → 1). */
function Bar({ from, to, animate, skipped }: { from: number; to: number; animate: boolean; skipped: boolean }) {
  const full = to >= 1;
  const f = useSharedValue(animate ? from : to);
  const sy = useSharedValue(1);
  useEffect(() => {
    if (!animate) return;
    f.set(withDelay(BEATS.fill, full ? withTiming(1, { duration: 220, easing: ease.standard }) : withSpring(to, spring.fill)));
    if (full) sy.set(withDelay(BEATS.pop, withSequence(withTiming(1.5, { duration: 120, easing: ease.standard }), withSpring(1, spring.snappy))));
    return () => {
      cancelAnimation(f);
      cancelAnimation(sy);
    };
  }, [animate, full, to, f, sy]);
  useEffect(() => {
    if (!skipped) return;
    cancelAnimation(f);
    cancelAnimation(sy);
    f.set(Math.min(1, to));
    sy.set(1);
  }, [skipped, to, f, sy]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.min(1, Math.max(0, f.get())) * 100}%` }));
  const pop = useAnimatedStyle(() => ({ transform: [{ scaleY: sy.get() }] }));
  return (
    <Animated.View style={[s.track, pop]}>
      <Animated.View style={[s.fill, fill]} />
    </Animated.View>
  );
}

/** The minted coin: earned silver fills bottom-up over the locked one (Home Milestone's technique), then one sweep. */
function MintCoin({ target, sub, animate, skipped, sweep }: { target: number; sub: string; animate: boolean; skipped: boolean; sweep: boolean }) {
  const h = useSharedValue(animate ? 0 : COIN);
  useEffect(() => {
    if (!animate) return;
    h.set(withDelay(BEATS.mint, withTiming(COIN, { duration: 520, easing: ease.standard })));
    return () => cancelAnimation(h);
  }, [animate, h]);
  useEffect(() => {
    if (!skipped) return;
    cancelAnimation(h);
    h.set(COIN);
  }, [skipped, h]);
  const clip = useAnimatedStyle(() => ({ height: h.get() }));
  const glyph = String(target);
  return (
    <View style={{ width: COIN, height: COIN }}>
      <AwardBadge shape="coin" metal="locked" size={COIN} glyph={glyph} sub={sub} />
      <Animated.View style={[s.clip, clip]}>
        <View style={s.anchor}>
          <AwardBadge shape="coin" metal="silver" size={COIN} glyph={glyph} sub={sub} shine={sweep && !skipped ? 1 : false} />
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { alignSelf: 'flex-start', minWidth: 32, height: 28, paddingHorizontal: 9, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: font.bold, fontSize: 14 },
  tiles: { flexDirection: 'row' },
  tile: { flex: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.lineStrong, gap: 8 },
  tileFirst: { paddingLeft: 0, borderLeftWidth: 0 },
  tileLabel: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  tileValue: { minHeight: 31 },
  big: display(34),
  qualify: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text2 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barCount: { flexDirection: 'row', alignItems: 'flex-end' },
  barLabel: { fontFamily: font.regular, fontSize: 13, color: colors.text2 },
  barNum: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.lineStrong, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.accent },
  mint: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  mintLabel: { fontFamily: font.semibold, fontSize: 12.5 },
  mintNext: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  clip: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  anchor: { position: 'absolute', left: 0, bottom: 0 },
});
