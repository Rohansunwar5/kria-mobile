import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AwardBadge } from '@/components/AwardBadge';
import { AwardBadgeFor } from '@/components/awards/AwardGrid';
import { Stage } from '@/components/room/ResultMoment';
import { Button } from '@/components/ui/Button';
import { colors, display, ease, font, metals, spring } from '@/constants/theme';
import type { Award } from '@/lib/awardsView';
import { haptics } from '@/lib/haptics';

const S = 168;
const SIDE = 84;
/** Reward spec C4 timeline, ms after the overlay opens. */
export const REVEAL_BEATS = { badge: 80, fill: 300, minted: 820, text: 900, sides: 1300, buttons: 1600 };

/**
 * The full-screen award reveal (reward spec C4, Milestone tier): the locked
 * badge lands, its earned metal fills bottom-up, then one sweep and one radial
 * burst at 820ms with the award haptic. A tap anywhere lands it at once;
 * Back closes like Done. `onMinted` fires once — at the mint, or on skip or
 * close if earlier — and is where the caller marks the award seen.
 * Reduced motion: one 160ms fade, no scale, fill, sweep, burst or side tiers.
 */
export function AwardReveal({ award, line, onSeeAward, onDone, onMinted }: {
  award: Award;
  /** Overrides `award.reveal.line` (the knockout screen adds the win count). */
  line?: string;
  onSeeAward: () => void;
  onDone: () => void;
  onMinted: () => void;
}) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [skipped, setSkipped] = useState(false);
  const [sweep, setSweep] = useState(false);
  const animate = !reduced && !skipped;
  // The buttons take taps only once they can be seen: at their beat, on a skip, or at once under reduced motion.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), REVEAL_BEATS.buttons);
    return () => clearTimeout(t);
  }, []);
  const live = reduced || skipped || shown;

  // The caller's callback may change identity each render; the mint timer must not restart.
  const latest = useRef(onMinted);
  useLayoutEffect(() => {
    latest.current = onMinted;
  });
  const minted = useRef(false);
  const mint = useCallback(() => {
    if (minted.current) return;
    minted.current = true;
    haptics.award();
    latest.current();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      mint();
      setSweep(true);
    }, REVEAL_BEATS.minted);
    return () => clearTimeout(t);
  }, [mint]);

  const skip = () => {
    setSkipped(true);
    mint();
  };
  const dismiss = () => {
    mint();
    onDone();
  };
  const see = () => {
    mint();
    onSeeAward();
  };

  const r = award.reveal;
  const text = [r?.label, r?.title, line ?? r?.line].map((x) => x ?? '');
  const sides = award.family === 'milestone' ? { prev: r?.prevTarget, next: r?.nextTarget } : {};

  return (
    <Modal transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss}>
      <Animated.View entering={reduced ? FadeIn.duration(160) : undefined} style={StyleSheet.absoluteFill}>
        <Scrim animate={animate} />
        <Pressable testID="reveal-skip" accessible={false} onPress={skip} style={StyleSheet.absoluteFill} />
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 96, paddingBottom: insets.bottom + 24 }]}>
          <View pointerEvents="none" style={s.stage}>
            {sides.prev ? <SideTier side={-1} animate={animate} skipped={skipped}><AwardBadge shape="coin" metal="silver" size={SIDE} glyph={String(sides.prev)} sub={award.sub} /></SideTier> : null}
            <Mint award={award} animate={animate} skipped={skipped} sweep={sweep && animate} />
            {sides.next ? <SideTier side={1} animate={animate} skipped={skipped}><AwardBadge shape="coin" metal="locked" size={SIDE} glyph={String(sides.next)} sub={award.sub} /></SideTier> : null}
          </View>
          <View pointerEvents="none" style={s.copy}>
            <Stage at={REVEAL_BEATS.text} animate={animate} skipped={skipped} springy>
              <Text maxFontSizeMultiplier={1.3} style={[s.label, { color: metals[award.metal].base }]}>{text[0]}</Text>
            </Stage>
            <Stage at={REVEAL_BEATS.text + 60} animate={animate} skipped={skipped} springy>
              <Text maxFontSizeMultiplier={1.3} style={[display(40), s.center]}>{text[1]}</Text>
            </Stage>
            {text[2] ? (
              <Stage at={REVEAL_BEATS.text + 120} animate={animate} skipped={skipped} springy>
                <Text maxFontSizeMultiplier={1.3} style={s.line}>{text[2]}</Text>
              </Stage>
            ) : null}
          </View>
          <Stage at={REVEAL_BEATS.buttons} animate={animate} skipped={skipped} rise={false} style={[s.buttons, !live && { pointerEvents: 'none' }]}>
            <Button label="See award" onPress={see} />
            <Pressable accessibilityRole="button" onPress={dismiss} style={s.done}>
              <Text maxFontSizeMultiplier={1.3} style={s.doneText}>Done</Text>
            </Pressable>
          </Stage>
        </View>
      </Animated.View>
    </Modal>
  );
}

function Scrim({ animate }: { animate: boolean }) {
  const o = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) o.set(withTiming(1, { duration: 160, easing: ease.standard }));
  }, [animate, o]);
  const shown = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.scrim, shown]} />;
}

/** The locked badge lands (bouncy), its earned metal fills bottom-up, then one sweep and the burst. */
function Mint({ award, animate, skipped, sweep }: { award: Award; animate: boolean; skipped: boolean; sweep: boolean }) {
  const land = useSharedValue(animate ? 0 : 1);
  const h = useSharedValue(animate ? 0 : S);
  const burst = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    land.set(withDelay(REVEAL_BEATS.badge, withSpring(1, spring.bouncy)));
    h.set(withDelay(REVEAL_BEATS.fill, withTiming(S, { duration: 520, easing: ease.standard })));
    burst.set(withDelay(REVEAL_BEATS.minted, withTiming(1, { duration: 320, easing: ease.enter })));
    return () => {
      cancelAnimation(land);
      cancelAnimation(h);
      cancelAnimation(burst);
    };
    // Starts once; a skip lands it below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!skipped) return;
    cancelAnimation(land);
    cancelAnimation(h);
    cancelAnimation(burst);
    land.set(1);
    h.set(S);
    burst.set(0);
  }, [skipped, land, h, burst]);
  const landing = useAnimatedStyle(() => ({ opacity: Math.min(1, land.get() * 3), transform: [{ scale: 0.6 + 0.4 * land.get() }] }));
  const clip = useAnimatedStyle(() => ({ height: h.get() }));
  const ray = metals[award.metal].light;
  return (
    <View style={{ width: S, height: S }}>
      {Array.from({ length: 8 }, (_, i) => <Ray key={i} angle={i * 45} p={burst} color={ray} />)}
      <Animated.View style={[StyleSheet.absoluteFill, landing]}>
        <AwardBadgeFor award={{ ...award, metal: 'locked', count: undefined, progress: undefined }} size={S} />
        <Animated.View style={[s.clip, clip]}>
          <View style={s.anchor}><AwardBadgeFor award={{ ...award, progress: undefined }} size={S} shine={sweep ? 1 : false} /></View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** One of the burst's 8 strokes: out from radius 92 to 126, brightest at 35% of its 320ms. */
function Ray({ angle, p, color }: { angle: number; p: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const t = p.get();
    const rising = t < 0.35;
    const k = rising ? t / 0.35 : (t - 0.35) / 0.65;
    return {
      opacity: t === 0 ? 0 : rising ? k : 1 - k,
      transform: [{ rotate: `${angle}deg` }, { translateY: -(92 + 34 * t) }, { scaleY: rising ? 0.3 + 0.7 * k : 1 - 0.6 * k }],
    };
  });
  return <Animated.View style={[s.ray, { backgroundColor: color }, style]} />;
}

/** The previous earned tier (left) or the next locked one (right), slid in and dimmed. */
function SideTier({ side, animate, skipped, children }: { side: -1 | 1; animate: boolean; skipped: boolean; children: React.ReactNode }) {
  const v = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) v.set(withDelay(REVEAL_BEATS.sides, withSpring(1, spring.gentle)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!skipped) return;
    cancelAnimation(v);
    v.set(1);
  }, [skipped, v]);
  const style = useAnimatedStyle(() => ({ opacity: 0.55 * Math.min(1, v.get()), transform: [{ translateX: side * 24 * (1 - v.get()) }] }));
  return <Animated.View style={[s.side, side < 0 ? { left: 12 } : { right: 12 }, style]}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  scrim: { backgroundColor: colors.revealScrim },
  stage: { height: S + 40, alignItems: 'center', justifyContent: 'center' },
  side: { position: 'absolute', top: (S + 40 - SIDE) / 2 },
  clip: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  anchor: { position: 'absolute', left: 0, bottom: 0 },
  ray: { position: 'absolute', left: S / 2 - 1.5, top: S / 2 - 8, width: 3, height: 16, borderRadius: 2 },
  copy: { paddingTop: 28, paddingHorizontal: 28, alignItems: 'center', gap: 10 },
  label: { fontFamily: font.semibold, fontSize: 13, textAlign: 'center' },
  center: { textAlign: 'center' },
  line: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.text3, textAlign: 'center' },
  buttons: { marginTop: 'auto', paddingHorizontal: 20, gap: 4 },
  done: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
});
