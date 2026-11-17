import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ease, font, motion, radius } from '@/constants/theme';

/**
 * How far to raise the sheet for a keyboard of height `kb`. iOS reports the
 * keyboard including the home-indicator inset, which the sheet's bottom padding
 * already covers; Android reports it above the navigation bar.
 */
export function sheetLift(kb: number, insetBottom: number, os: string): number {
  return os === 'ios' ? Math.max(0, kb - insetBottom) : kb;
}

/** Tallest the sheet can be: from just under the status bar down to the keyboard. */
export function sheetMaxHeight(windowHeight: number, insetTop: number, lift: number): number {
  'worklet';
  return windowHeight - insetTop - 12 - lift;
}

/**
 * DESIGN §5.10 + Motion "Bottom sheet": opens in 320ms (enter curve) with the
 * scrim fading over 200ms, closes in 220ms (exit curve). Drag down or tap the
 * scrim to dismiss. Reduced motion: fade only. Rides up with the keyboard:
 * the Modal draws edge to edge, so Android's resize-for-keyboard never applies.
 */
export function BottomSheet({ open, onClose, title, subtitle, children }: {
  open: boolean;
  onClose: () => void;
  /** Optional: a sheet like the award detail leads with its own content. */
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(open);
  const height = useRef(0);
  const y = useSharedValue(1000);
  const fade = useSharedValue(0);
  const lift = useSharedValue(0);
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    if (!mounted) return;
    const ios = Platform.OS === 'ios';
    const move = (to: number, duration?: number) => {
      lift.value = withTiming(to, { duration: duration || motion.enter, easing: ease.standard });
    };
    const subs = [
      Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => move(sheetLift(e.endCoordinates.height, insets.bottom, Platform.OS), e.duration)),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', (e) => move(0, e?.duration)),
    ];
    return () => {
      subs.forEach((sub) => sub.remove());
      lift.value = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (open && mounted && height.current) {
      // Reopened mid-close: no new layout pass will come, so turn it around here.
      y.value = withTiming(0, { duration: reduced ? 0 : motion.slow, easing: ease.enter });
      fade.value = withTiming(1, { duration: 200, easing: ease.standard });
    } else if (open) {
      height.current = 0;
      setMounted(true);
    } else if (mounted) {
      const t = { duration: motion.enter, easing: ease.exit };
      fade.value = withTiming(0, t);
      y.value = withTiming(reduced ? 0 : height.current, t, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Runs once the sheet has a height to travel from.
  const enter = (h: number) => {
    if (!open || height.current) return;
    height.current = h;
    y.value = reduced ? 0 : h;
    y.value = withTiming(0, { duration: reduced ? 0 : motion.slow, easing: ease.enter });
    fade.value = withTiming(1, { duration: 200, easing: ease.standard });
  };

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        y.value = Math.max(0, g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) onCloseRef.current();
        else y.value = withTiming(0, { duration: motion.enter, easing: ease.standard });
      },
    }),
  ).current;

  const scrim = useAnimatedStyle(() => ({ opacity: fade.value }));
  const topInset = insets.top;
  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value - lift.value }],
    maxHeight: sheetMaxHeight(windowHeight, topInset, lift.value),
    opacity: reduced ? fade.value : 1,
  }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrim]}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        onLayout={(e) => enter(e.nativeEvent.layout.height)}
        style={[s.sheet, { paddingBottom: Math.max(38, insets.bottom + 16) }, sheet]}
      >
        <View style={s.grabber} />
        {title ? (
          <View style={s.head}>
            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
          </View>
        ) : null}
        {children}
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface1, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
    paddingTop: 10, paddingHorizontal: 20, gap: 14,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.ring },
  head: { paddingTop: 6, gap: 3 },
  title: { fontFamily: font.semibold, fontSize: 20, color: colors.text },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
});
