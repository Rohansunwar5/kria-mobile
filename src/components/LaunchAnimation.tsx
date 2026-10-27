import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type WithTimingConfig,
} from 'react-native-reanimated';
import { MARK_BALL, MARK_VIEWBOX, MarkBall, MarkBody } from '@/components/KriaMark';
import { colors, display, ease, font } from '@/constants/theme';
import { LAUNCH_6B, LAUNCH_6C, exitAt } from '@/lib/launchTiming';

// Kria Motion.dc.html splash('B'). Offsets are px in the 112×98 mark box.
const W = 112;
const H = (W * MARK_VIEWBOX.h) / MARK_VIEWBOX.w;
const BALL_ORIGIN = `${(MARK_BALL.cx / MARK_VIEWBOX.w) * 100}% ${(MARK_BALL.cy / MARK_VIEWBOX.h) * 100}%`;
const LINES = [
  { top: 40, left: -150, width: 140 },
  { top: 54, left: -120, width: 110 },
  { top: 68, left: -160, width: 150 },
  { top: 82, left: -100, width: 90 },
];
const runner = Easing.bezier(0.16, 0.9, 0.3, 1);
const wipe = Easing.bezier(0.65, 0, 0.35, 1);
const easeOut = Easing.bezier(0, 0, 0.58, 1); // CSS ease-out
const arcIn = Easing.bezier(0.25, 0, 0.6, 0.5);
const arcOut = Easing.bezier(0.3, 0.5, 0.6, 1);
const BALL_MS = 640;

// Reanimated's default (ReduceMotion.System) snaps every animation to its end when
// the system setting is on, which is exactly when 6c runs. 6c is the reduced-motion
// design, so everything here opts out.
const NEVER = ReduceMotion.Never;
const timing = (value: number, duration: number, easing: WithTimingConfig['easing']) =>
  withTiming(value, { duration, easing, reduceMotion: NEVER });
/** 0→1 over `duration` after `delay`; keyframes are interpolated over the eased progress, as WAAPI does. */
const play = (duration: number, easing: WithTimingConfig['easing'], delay = 0) =>
  withDelay(delay, timing(1, duration, easing), NEVER);

function SpeedLine({ i }: { i: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = play(560, easeOut, i * 30); }, [i, p]);
  const style = useAnimatedStyle(() => {
    const at = (to: number[]) => interpolate(p.value, [0, 0.5, 1], to);
    return { opacity: at([0, 0.9, 0]), transform: [{ translateX: at([-140, 0, 12]) }, { scaleX: at([0.2, 1, 0]) }] };
  });
  return <Animated.View style={[s.line, LINES[i], style]} />;
}

/**
 * The launch: 6b "Sprint and catch", or 6c's quiet fade under reduced motion.
 * Holds its final frame until `ready`, then fades out and calls `onDone`.
 */
export function LaunchAnimation({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const reduced = useReducedMotion();
  const body = useSharedValue(0);
  const ball = useSharedValue(0);
  const mark = useSharedValue(0); // 6b: the catch; 6c: the wipe-in
  const word = useSharedValue(0); // 6b: the wipe; 6c: the fade
  const tag = useSharedValue(0);
  const out = useSharedValue(0);
  const start = useRef(0);
  const readyAt = useRef<number | null>(null);
  const [wordW, setWordW] = useState(0);

  useEffect(() => {
    start.current = Date.now();
    if (reduced) {
      mark.value = play(420, wipe);
      word.value = play(300, ease.standard, 220);
      tag.value = play(300, ease.standard, 320);
      return;
    }
    body.value = play(580, runner);
    // Per-keyframe easings: the progress runs to each keyframe's offset in turn.
    ball.value = withDelay(360, withSequence(
      NEVER,
      timing(0.55, BALL_MS * 0.55, arcIn),
      timing(0.86, BALL_MS * 0.31, arcOut),
      timing(1, BALL_MS * 0.14, easeOut),
    ), NEVER);
    mark.value = play(280, easeOut, 920);
    word.value = play(460, wipe, 1080);
    tag.value = play(400, ease.standard, 1350);
  }, [reduced, body, ball, mark, word, tag]);

  // Readiness latches: once seen, a later `ready=false` doesn't cancel the exit.
  useEffect(() => {
    if (ready) readyAt.current ??= Date.now() - start.current;
    const at = exitAt({ reduced, readyAt: readyAt.current });
    if (at === null) return;
    const { exit } = reduced ? LAUNCH_6C : LAUNCH_6B;
    let done: ReturnType<typeof setTimeout> | undefined;
    const fade = setTimeout(() => {
      out.value = timing(1, exit, ease.exit);
      // Counted from the fade's own start, so a late JS tick can't cut the fade short.
      done = setTimeout(onDone, exit);
    }, Math.max(0, at - (Date.now() - start.current)));
    return () => { clearTimeout(fade); clearTimeout(done); };
  }, [ready, reduced, onDone, out]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: 1 - out.value,
    transform: [{ scale: reduced ? 1 : 1 + 0.03 * out.value }],
  }));
  const markStyle = useAnimatedStyle(() => {
    if (reduced) return { width: mark.value * W, opacity: mark.value };
    const at = (to: number[]) => interpolate(mark.value, [0, 0.4, 1], to);
    return { transform: [{ translateY: at([0, 3, 0]) }, { scaleX: at([1, 1.03, 1]) }, { scaleY: at([1, 0.96, 1]) }] };
  });
  const bodyStyle = useAnimatedStyle(() => {
    const at = (to: number[]) => interpolate(body.value, [0, 0.62, 1], to);
    return { opacity: at([0, 1, 1]), transform: [{ translateX: at([-240, 8, 0]) }, { skewX: `${at([-22, 4, 0])}deg` }] };
  });
  const ballStyle = useAnimatedStyle(() => {
    const at = (to: number[]) => interpolate(ball.value, [0, 0.55, 0.86, 1], to);
    return { transform: [{ translateX: at([170, 46, 0, 0]) }, { translateY: at([-210, -74, 0, 0]) }, { rotate: `${at([-180, 140, 350, 360])}deg` }] };
  });
  // The wipe clips the measured word from the right; until it's measured the word stays hidden.
  const wordStyle = useAnimatedStyle(() => ({
    opacity: reduced ? word.value : wordW ? 1 : 0,
    width: !wordW ? ('auto' as const) : reduced ? wordW : word.value * wordW,
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value }));

  return (
    <Animated.View style={[s.wrap, wrapStyle]}>
      <View style={s.box}>
        <Animated.View style={[s.box, reduced ? s.clip : null, markStyle]}>
          {reduced ? null : LINES.map((_, i) => <SpeedLine key={i} i={i} />)}
          <Animated.View style={[s.part, reduced ? null : bodyStyle]}><MarkBody width={W} /></Animated.View>
          <Animated.View style={[s.part, s.ball, reduced ? null : ballStyle]}><MarkBall width={W} /></Animated.View>
        </Animated.View>
      </View>
      <View style={s.type}>
        <View style={wordW ? { width: wordW } : null}>
          <Animated.View style={[s.clip, wordStyle]}>
            <Text
              numberOfLines={1}
              accessibilityLabel="Kria"
              onLayout={(e) => setWordW(Math.ceil(e.nativeEvent.layout.width))}
              style={[s.word, wordW ? { width: wordW } : null]}
            >
              KRIA
            </Text>
          </Animated.View>
        </View>
        <Animated.Text style={[s.tag, tagStyle]}>Your sporting career, in your pocket.</Animated.Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 26 },
  box: { width: W, height: H },
  clip: { overflow: 'hidden' },
  part: { position: 'absolute', left: 0, top: 0, width: W, height: H },
  ball: { transformOrigin: BALL_ORIGIN },
  line: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: colors.accent, transformOrigin: '100% 50%' },
  type: { alignItems: 'center', gap: 10 },
  word: { ...display(46), letterSpacing: 46 * 0.16, paddingLeft: 46 * 0.16 },
  tag: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
});
