import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { colors, ease, font, motion } from '@/constants/theme';
import { clampView, coverScale, cropRect, zoomAbout } from '@/lib/photoCrop';
import { getPhotoDraft } from '@/lib/photoDraft';
import { useAppDispatch } from '@/store/hooks';
import { uploadPlayerProfileImage } from '@/store/slices/authSlice';

const RESIST = 0.35;
const INSET = 48;
const FALLBACK = 'Could not update your photo. Try again.';

/** Frame a new profile photo in a circle, then crop it to 512 and upload it from the store. */
export default function PhotoCrop() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const reduce = useReducedMotion();
  const [draft] = useState(getPhotoDraft);
  const img = { width: draft?.width ?? 1, height: draft?.height ?? 1 };
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  // Opened without a photo (e.g. after a reload): nothing to frame.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!draft) router.back(); }, []);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const [busy, setBusy] = useState(false);
  const d = stage ? Math.min(stage.w, stage.h) - INSET : 0;

  const s = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const intro = useSharedValue(reduce ? 1 : 1.12);
  const shown = useSharedValue(0);
  const ringIn = useSharedValue(reduce ? 1 : 0);
  const grid = useSharedValue(0);
  const dim = useSharedValue({ d: 0, cx: 0, cy: 0 });

  useEffect(() => {
    if (!stage || !d) return;
    dim.value = { d, cx: stage.w / 2, cy: stage.h / 2 };
    s.value = coverScale(img, d);
    x.value = 0;
    y.value = 0;
    intro.value = withTiming(1, { duration: 600, easing: ease.enter });
    shown.value = withTiming(1, { duration: 260, easing: ease.standard });
    ringIn.value = withDelay(120, withTiming(1, { duration: 420, easing: ease.enter }));
    // Once per layout: the photo's size never changes on this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage?.w, stage?.h]);

  const settle = () => {
    'worklet';
    const v = clampView({ s: s.value, x: x.value, y: y.value }, img, dim.value.d);
    const cfg = { duration: 340, easing: ease.standard };
    s.value = withTiming(v.s, cfg);
    x.value = withTiming(v.x, cfg);
    y.value = withTiming(v.y, cfg);
    grid.value = withDelay(200, withTiming(0, { duration: motion.slow }));
  };
  const showGrid = () => {
    'worklet';
    grid.value = withTiming(1, { duration: motion.fast });
  };

  const pan = usePanGesture({
    // Android pans follow the last finger down; averaging keeps a pinch from dragging toward it.
    averageTouches: true,
    onBegin: showGrid,
    onUpdate: (e) => {
      // Past the edge the photo moves at a third of the finger's speed, then springs back.
      const lim = clampView({ s: s.value, x: x.value, y: y.value }, img, dim.value.d);
      x.value += Math.abs(x.value - lim.x) > 0.5 ? e.changeX * RESIST : e.changeX;
      y.value += Math.abs(y.value - lim.y) > 0.5 ? e.changeY * RESIST : e.changeY;
    },
    onFinalize: settle,
  });
  const pinch = usePinchGesture({
    onBegin: showGrid,
    onUpdate: (e) => {
      const { d: dd, cx, cy } = dim.value;
      const min = coverScale(img, dd);
      let ratio = e.scaleChange;
      const next = s.value * ratio;
      if (next < min || next > min * 4) ratio = 1 + (ratio - 1) * RESIST;
      const v = zoomAbout({ s: s.value, x: x.value, y: y.value }, e.focalX - cx, e.focalY - cy, ratio);
      s.value = v.s;
      x.value = v.x;
      y.value = v.y;
    },
    onFinalize: settle,
  });
  const gestures = useSimultaneousGestures(pan, pinch);

  const photoStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: s.value * intro.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.7 * ringIn.value, transform: [{ scale: 0.9 + 0.1 * ringIn.value }] }));
  const gridStyle = useAnimatedStyle(() => ({ opacity: grid.value }));

  const use = async () => {
    if (busy || !d || !draft) return;
    setBusy(true);
    try {
      const rect = cropRect(clampView({ s: s.value, x: x.value, y: y.value }, img, d), img, d);
      const out = await manipulateAsync(draft.uri, [{ crop: rect }, { resize: { width: 512, height: 512 } }], { compress: 0.8, format: SaveFormat.JPEG });
      if (!alive.current) return; // backed out while cropping: they don't want this photo
      router.back();
      dispatch(uploadPlayerProfileImage({ uri: out.uri, name: 'avatar.jpg', type: 'image/jpeg' })).unwrap().then(
        () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); },
        (m: unknown) => Alert.alert('Upload failed', typeof m === 'string' && m ? m : FALLBACK),
      );
    } catch (e: any) {
      setBusy(false);
      Alert.alert('Upload failed', e?.message || FALLBACK);
    }
  };

  const cx = stage ? stage.w / 2 : 0;
  const cy = stage ? stage.h / 2 : 0;
  const r = d / 2;
  return (
    <SafeAreaView style={s_.screen} edges={['top', 'bottom']}>
      <View style={s_.top}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => router.back()} hitSlop={8} style={s_.cancel}>
          <Text style={s_.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={s_.title}>Frame your photo</Text>
        <View style={s_.cancel} />
      </View>
      <GestureDetector gesture={gestures}>
        <View testID="crop-stage" style={s_.stage} onLayout={(e) => setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {draft && stage && d > 0 ? (
            <>
              <Animated.Image
                source={{ uri: draft.uri }}
                style={[{ position: 'absolute', width: img.width, height: img.height, left: cx - img.width / 2, top: cy - img.height / 2 }, photoStyle]}
              />
              <Svg pointerEvents="none" width={stage.w} height={stage.h} style={StyleSheet.absoluteFill}>
                <Path
                  fill={colors.scrim}
                  fillRule="evenodd"
                  d={`M0 0H${stage.w}V${stage.h}H0Z M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`}
                />
              </Svg>
              <Animated.View pointerEvents="none" style={[s_.ring, { left: cx - r, top: cy - r, width: d, height: d, borderRadius: r }, ringStyle]}>
                <Animated.View style={[StyleSheet.absoluteFill, gridStyle]}>
                  <View style={[s_.line, { left: '33.33%', top: 0, bottom: 0, width: 1 }]} />
                  <View style={[s_.line, { left: '66.66%', top: 0, bottom: 0, width: 1 }]} />
                  <View style={[s_.line, { top: '33.33%', left: 0, right: 0, height: 1 }]} />
                  <View style={[s_.line, { top: '66.66%', left: 0, right: 0, height: 1 }]} />
                </Animated.View>
              </Animated.View>
            </>
          ) : null}
        </View>
      </GestureDetector>
      <View style={s_.bottom}>
        <Text style={s_.hint}>Drag to move · Pinch to zoom</Text>
        <Button label="Use photo" busy={busy} onPress={use} />
      </View>
    </SafeAreaView>
  );
}

const s_ = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.shadow },
  top: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  cancel: { minWidth: 72, height: 44, justifyContent: 'center', paddingHorizontal: 12 },
  cancelText: { fontFamily: font.semibold, fontSize: 15, color: colors.text2 },
  title: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  stage: { flex: 1, overflow: 'hidden' },
  ring: { position: 'absolute', overflow: 'hidden', borderWidth: 1.5, borderColor: colors.text },
  line: { position: 'absolute', backgroundColor: colors.text, opacity: 0.38 },
  bottom: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18, gap: 14 },
  hint: { textAlign: 'center', fontFamily: font.regular, fontSize: 13, color: colors.text3 },
});
