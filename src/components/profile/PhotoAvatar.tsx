import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Icon } from '@/components/ui/Icon';
import { colors, ease, font, motion } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const GAP = 10;
const STROKE = 3;

/**
 * Your own avatar. While a new photo uploads it shows the new framing dimmed,
 * with a ring for progress (bytes sent fill 80%, the server's save the rest).
 * On success the ring closes and fades and the photo settles; on failure the
 * ring turns red and the old photo comes back.
 */
export function PhotoAvatar({ size, image, initials, onPress }: {
  size: number;
  image?: string;
  initials: string;
  onPress: () => void;
}) {
  const upload = useAppSelector((st) => st.auth.photoUpload);
  const reduce = useReducedMotion();
  const uploading = !!upload;
  const progress = upload?.progress ?? 0;
  const [failed, setFailed] = useState(false);
  const startImage = useRef(image);
  const wasUploading = useRef(uploading);

  const arc = useSharedValue(0);
  const ring = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const dim = useSharedValue(uploading ? 1 : 0);
  const face = useSharedValue(1);
  const badge = useSharedValue(uploading ? 0 : 1);

  useEffect(() => {
    const slow = { duration: motion.slow, easing: ease.standard };
    if (uploading && !wasUploading.current) {
      startImage.current = image;
      setFailed(false);
      arc.value = 0;
      ringScale.value = 1;
      ring.value = withTiming(1, { duration: motion.base });
      dim.value = withTiming(1, { duration: motion.base });
      badge.value = withTiming(0, { duration: motion.enter, easing: ease.enter });
    } else if (!uploading && wasUploading.current) {
      dim.value = withTiming(0, slow);
      badge.value = withTiming(1, { duration: motion.enter, easing: ease.enter });
      if (image !== startImage.current) {
        arc.value = withTiming(1, { duration: motion.base });
        ring.value = withDelay(motion.base, withTiming(0, slow));
        if (!reduce) {
          ringScale.value = withDelay(motion.base, withTiming(1.1, slow));
          face.value = withSequence(
            withTiming(0.95, { duration: 120, easing: ease.standard }),
            withTiming(1.035, { duration: 180, easing: ease.standard }),
            withTiming(1, { duration: 160, easing: ease.standard }),
          );
        }
      } else {
        setFailed(true);
        ring.value = withDelay(260, withTiming(0, slow));
      }
    }
    wasUploading.current = uploading;
  }, [uploading, image, reduce, arc, ring, ringScale, dim, face, badge]);

  useEffect(() => {
    if (!uploading) return;
    arc.value = progress < 1
      ? withTiming(progress * 0.8, { duration: motion.base, easing: ease.standard })
      : withTiming(0.95, { duration: 1500, easing: ease.standard });
  }, [uploading, progress, arc]);

  const box = size + GAP * 2;
  const r = box / 2 - STROKE;
  const circumference = 2 * Math.PI * r;
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - arc.value) }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value, transform: [{ rotate: '-90deg' }, { scale: ringScale.value }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ scale: face.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badge.value }] }));

  const big = size >= 100;
  const shown = upload?.uri ?? image;
  const label = uploading ? 'Uploading photo' : image ? 'Change profile photo' : 'Add a profile photo';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: uploading, busy: uploading }}
      disabled={uploading}
      onPress={onPress}
      style={{ width: size, height: size }}
    >
      <Animated.View style={[s.face, { borderRadius: size / 2 }, faceStyle]}>
        {shown
          ? <Image testID="avatar-photo" source={{ uri: shown }} style={StyleSheet.absoluteFill} />
          : <Text style={[s.ini, { fontSize: big ? 30 : 24 }]}>{initials}</Text>}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.dim, dimStyle]} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -GAP, top: -GAP, width: box, height: box }, ringStyle]}>
        <Svg width={box} height={box}>
          <Circle cx={box / 2} cy={box / 2} r={r} stroke={colors.surface3} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={box / 2} cy={box / 2} r={r} fill="none"
            stroke={failed ? colors.loss : colors.accent} strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={circumference} animatedProps={arcProps}
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[s.badge, big ? s.badgeBig : s.badgeSmall, badgeStyle]}>
        <Icon name="photo_camera" size={big ? 18 : 16} color={colors.bg} />
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  face: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  ini: { fontFamily: font.bold, color: colors.text },
  dim: { backgroundColor: colors.scrim },
  badge: { position: 'absolute', backgroundColor: colors.text, borderWidth: 3, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  badgeBig: { right: 0, bottom: 2, width: 30, height: 30, borderRadius: 15 },
  badgeSmall: { right: -2, bottom: 0, width: 28, height: 28, borderRadius: 14 },
});
