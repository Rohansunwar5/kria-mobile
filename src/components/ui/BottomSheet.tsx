import { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ease, font, motion, radius } from '@/constants/theme';

/**
 * DESIGN §5.10 + Motion "Bottom sheet": opens in 320ms (enter curve) with the
 * scrim fading over 200ms, closes in 220ms (exit curve). Drag down or tap the
 * scrim to dismiss. Reduced motion: fade only.
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
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: reduced ? fade.value : 1 }));

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
