import { View, Image, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Hazard } from './canvas';
import { useDrift, useShimmer } from '@/lib/motion';

const LOGO = require('../../assets/images/logo.png');

// ponytail: hash → hue, so two banner-less tournaments never share a ground.
// Deterministic from the id, so the same tournament keeps its colour everywhere.
export function hue(seed: string) {
  let h = 7;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

const fill = { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 };

/** Tournament art strip. The organiser's banner when there is one, otherwise a
 *  seeded duotone ground carrying the Kria mark — either way each tournament
 *  reads as its own thing. Bottom edge fades into the surface behind it.
 *
 *  `wipe`/`sweep` drive the land reveal (A), `press` the press response (C);
 *  all three rest inert when the caller passes nothing. `drift` opts a large
 *  surface into Ken Burns (B) — banners only, never a list row. `shimmer` opts
 *  a banner-less ground into the 115° sweep (E). Both idle only while the
 *  screen has focus. */
export function TournamentArt({
  uri,
  seed,
  height,
  fadeTo = '#151515',
  wipe,
  sweep,
  press,
  drift,
  shimmer,
  index = 0,
}: {
  uri?: string;
  seed: string;
  height: number;
  fadeTo?: string;
  wipe?: SharedValue<number>;
  sweep?: SharedValue<number>;
  press?: SharedValue<number>;
  drift?: boolean;
  shimmer?: boolean;
  index?: number;
}) {
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const restOpen = useSharedValue(1);
  const restClosed = useSharedValue(0);
  const w = wipe ?? restOpen;
  const s = sweep ?? restOpen;
  const p = press ?? restClosed;
  const kb = useDrift(!!drift && !!uri && focused);
  const shim = useShimmer(!!shimmer && !uri && focused, index);

  // The cover sits over the art and slides down out of the strip, so the art
  // wipes in from the top. Transform only — never the strip's height.
  const coverStyle = useAnimatedStyle(() => ({ transform: [{ translateY: w.value * height }] }));
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: s.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: p.value }));

  const artStyle = useAnimatedStyle(() => {
    const d = kb.value;
    return {
      transform: [
        { translateX: -d * width * 0.022 },
        { translateY: -d * height * 0.014 },
        { scale: (1 + p.value * 0.035) * (1 + d * 0.09) },
      ],
    };
  });

  // One skewed gradient band, not a 200-view hairline field — same 115° axis,
  // a fraction of the cost in a list.
  const bandStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shim.value, [0, 1], [-width * 0.7, width]) },
      { skewX: '-25deg' },
    ],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shim.value, [0, 0.5, 1], [0.3, 0.4, 0.3]),
  }));

  return (
    <View style={{ height, backgroundColor: `hsl(${hue(seed)}, 44%, 13%)`, overflow: 'hidden' }}>
      <Animated.View style={[fill, { alignItems: 'center', justifyContent: 'center' }, artStyle]}>
        {uri ? (
          <Image source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        ) : (
          <Animated.Image
            source={LOGO}
            resizeMode="contain"
            style={[{ width: height * 0.62, height: height * 0.62 }, markStyle]}
          />
        )}
      </Animated.View>

      {shimmer && !uri ? (
        <Animated.View
          style={[
            { position: 'absolute', top: -height * 0.4, bottom: -height * 0.4, width: width * 0.6 },
            bandStyle,
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.07)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}

      <Animated.View style={[fill, { backgroundColor: 'rgba(249,115,22,0.16)' }, scrimStyle]} pointerEvents="none" />

      <LinearGradient
        colors={['transparent', fadeTo]}
        locations={[0.3, 1]}
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.round(height * 0.6) }}
      />

      <Animated.View
        style={[
          { position: 'absolute', left: 0, right: 0, bottom: 0, transformOrigin: 'left' },
          sweepStyle,
        ]}
        pointerEvents="none"
      >
        <Hazard />
      </Animated.View>

      <Animated.View style={[fill, { backgroundColor: fadeTo }, coverStyle]} pointerEvents="none" />
    </View>
  );
}
