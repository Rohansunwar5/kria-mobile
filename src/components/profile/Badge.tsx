import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useIsFocused } from 'expo-router';
import { badgeFor, type Emblem, type Tier } from '@/lib/badges';
import { useHaloPulse } from '@/lib/motion';

// Fixed art, identical in both palettes: a badge is an object, not chrome, so
// these are deliberately not theme tokens (the same call as a seeded hue).
// Source: Kria Award Badges.dc.html. At profile-row size the design drops the
// orbit ring, sparks, facets and sweep — frame, emblem and halo only.
type StopDef = [offset: number, color: string, opacity?: number];

const TIER_STROKE: Record<Tier, StopDef[]> = {
  legendary: [[0, '#FFD37A'], [0.38, '#F97316'], [0.72, '#FA4C93'], [1, '#7A1E3C']],
  elite: [[0, '#FF8FC0'], [0.5, '#FA4C93'], [1, '#5E1533']],
  gold: [[0, '#FFD37A'], [0.48, '#F97316'], [1, '#6B2C07']],
  rare: [[0, '#7BF2B4'], [0.5, '#16C46A'], [1, '#0A4428']],
  steel: [[0, '#EDEDED'], [0.5, '#9A9A9A'], [1, '#3A3A3A']],
};

// The design's 44px row draws a halo for the top three tiers only.
const TIER_HALO: Partial<Record<Tier, StopDef[]>> = {
  legendary: [[0, '#F97316', 0.95], [0.6, '#FA4C93', 0.35], [1, '#FA4C93', 0]],
  elite: [[0, '#FA4C93', 0.9], [1, '#FA4C93', 0]],
  gold: [[0, '#F97316', 0.9], [1, '#F97316', 0]],
};

// 24×24 emblem strokes. A string strokes in the tier gradient; a tuple keeps
// the design's fixed accent colour.
type Stroke = string | [d: string, color: string];
const EMBLEM: Record<Emblem, Stroke[]> = {
  star: ['M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z', 'M12 8.5l1.2 2.3 2.3 1.2-2.3 1.2L12 15.5l-1.2-2.3L8.5 12l2.3-1.2z'],
  trophy: ['M6 4h12v4l-6 7-6-7z', 'M6 5.5H3v3l3 2M18 5.5h3v3l-3 2M12 15v4M8 20.5h8'],
  stumps: ['M7 8v13M12 8v13M17 8v13', ['M5.8 6.6h6.4M11.8 6.6h6.4', '#FF8FC0']],
  shield: ['M12 3l8 3v7l-8 8-8-8V6z', 'M9 12l2.5 2.5L16 10'],
  gavel: ['M12.5 2.5l9 9-3 3-9-9z', 'M10.5 8.5 3 16l2.5 2.5L13 11M13 21h8'],
  bat: ['M10 2.5h4v4h-4z', 'M8.5 6.5h7l-.5 10-3 5-3-5z', ['M12 8v12', '#FFD37A']],
  bracket: ['M3 6h4M3 11h4M7 6v5M7 8.5h5M3 15h4M3 20h4M7 15v5M7 17.5h5M12 8.5v9M12 13h9'],
  racket: ['M12 3l6 5-6 5-6-5z', 'M9 5.5h6M8.6 8.2h6.8M12 3v18M10 21h4'],
  shuttle: ['M9.5 3h5l1 4h-7z', 'M7.5 7 4 19l8 2 8-2L16.5 7z', 'M10 7 8.4 19M14 7l1.6 12M12 7v14'],
  flag: [['M6 3v18', '#7BF2B4'], 'M6 4h12l-2.5 4L18 12H6z'],
  medal: ['M8 3l2 5.5M16 3l-2 5.5', 'M8 9h8v8H8zM11 12h2v2h-2z'],
  target: ['M4 4h16v16H4zM8.5 8.5h7v7h-7zM11.3 11.3h1.4v1.4h-1.4z'],
};

// Gradient ids carry the tier: native scopes defs per <Svg>, but on Expo web
// every badge shares one DOM, and a shared id would paint them all alike.
// Same tier → identical defs, so those collisions are harmless.
const OUTER = 'M120 6 214 60v120l-94 54-94-54V60z';
const INNER = 'M120 22 200 68v104l-80 46-80-46V68z';

const stops = (s: StopDef[]) =>
  s.map(([offset, color, opacity = 1]) => (
    <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
  ));

/** One honour badge. Unknown or missing key → champion art. Decorative: the row carries the label. */
export function Badge({ badge, size = 44 }: { badge?: string; size?: number }) {
  const { tier, emblem } = badgeFor(badge);
  const halo = TIER_HALO[tier];
  const focused = useIsFocused();
  const pulse = useHaloPulse(!!halo && focused);
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + pulse.value * 0.48,
    transform: [{ scale: 0.94 + pulse.value * 0.12 }],
  }));

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {halo ? (
        <Animated.View style={[{ position: 'absolute', width: size, height: size }, haloStyle]}>
          <Svg width={size} height={size} viewBox="0 0 240 240">
            <Defs>
              <RadialGradient id={`badge-halo-${tier}`} cx="50%" cy="50%" r="50%">{stops(halo)}</RadialGradient>
            </Defs>
            <Circle cx={120} cy={120} r={98} fill={`url(#badge-halo-${tier})`} />
          </Svg>
        </Animated.View>
      ) : null}
      <Svg width={size} height={size} viewBox="0 0 240 240">
        <Defs>
          <LinearGradient id={`badge-stroke-${tier}`} x1="0" y1="0" x2="1" y2="1">{stops(TIER_STROKE[tier])}</LinearGradient>
          <LinearGradient id="badge-plate" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset={0} stopColor="#1E1E1E" />
            <Stop offset={1} stopColor="#0B0B0B" />
          </LinearGradient>
        </Defs>
        <Path d={OUTER} fill="url(#badge-plate)" stroke={`url(#badge-stroke-${tier})`} strokeWidth={5} />
        <Path d={INNER} fill="url(#badge-plate)" fillOpacity={0.65} stroke={`url(#badge-stroke-${tier})`} strokeWidth={1.5} strokeOpacity={0.5} />
        {/* = translate(120,118) scale(3.4) translate(-12,-12) from the design */}
        <G transform="translate(79.2 77.2) scale(3.4)" fill="none" strokeWidth={1.7} strokeLinecap="square" strokeLinejoin="miter">
          {EMBLEM[emblem].map((s, i) =>
            typeof s === 'string' ? (
              <Path key={i} d={s} stroke={`url(#badge-stroke-${tier})`} />
            ) : (
              <Path key={i} d={s[0]} stroke={s[1]} />
            )
          )}
        </G>
      </Svg>
    </View>
  );
}
