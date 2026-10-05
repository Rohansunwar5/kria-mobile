import { View, StyleSheet } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import { useIsFocused } from 'expo-router';
import { badgeFor, type Emblem, type Tier } from '@/lib/badges';
import { useBadgeLoop } from '@/lib/motion';

// Fixed art, identical in both palettes: a badge is an object, not chrome, so
// these are deliberately not theme tokens (the same call as a seeded hue).
// Source: Kria Award Badges.dc.html.
type StopDef = [offset: number, color: string, opacity?: number];

const TIER_STROKE: Record<Tier, StopDef[]> = {
  legendary: [[0, '#FFD37A'], [0.38, '#F97316'], [0.72, '#FA4C93'], [1, '#7A1E3C']],
  elite: [[0, '#FF8FC0'], [0.5, '#FA4C93'], [1, '#5E1533']],
  gold: [[0, '#FFD37A'], [0.48, '#F97316'], [1, '#6B2C07']],
  rare: [[0, '#7BF2B4'], [0.5, '#16C46A'], [1, '#0A4428']],
  steel: [[0, '#EDEDED'], [0.5, '#9A9A9A'], [1, '#3A3A3A']],
};

/**
 * Motion per tier, as the design's CSS periods (ms). Rarer = more motion — the
 * rarity hierarchy is the point (user call, 2026-10-05, overriding DESIGN.md
 * §6's one-idle-animation rule for this component). Steel stays still.
 */
const TIER_FX: Record<Tier, { aura?: number; ring?: number; sparks?: number; sweep?: number; double?: true; twinkle?: true }> = {
  legendary: { aura: 3200, ring: 22000, sparks: 15000, sweep: 3400, double: true, twinkle: true },
  elite: { aura: 3400, ring: 20000, sweep: 4200 },
  gold: { aura: 3500, sweep: 4400 },
  rare: { aura: 4200 },
  steel: {},
};

// The aura is drawn past the badge box (AURA_SPAN × size) behind the frame.
// The hexagon covers its middle, so the stops keep it strong out to where the
// hexagon ends (~0.56 of the radius) and fade from there.
const AURA_SPAN = 1.4;
const AURA: Partial<Record<Tier, StopDef[]>> = {
  legendary: [[0, '#F97316', 0.95], [0.6, '#FA4C93', 0.6], [1, '#FA4C93', 0]],
  elite: [[0, '#FA4C93', 0.9], [0.6, '#FA4C93', 0.5], [1, '#FA4C93', 0]],
  gold: [[0, '#F97316', 0.9], [0.6, '#F97316', 0.45], [1, '#F97316', 0]],
  rare: [[0, '#16C46A', 0.8], [0.6, '#16C46A', 0.4], [1, '#16C46A', 0]],
};

// Glow inside the face, over the plate, so every tier reads lit from within.
const INNER_GLOW: Record<Tier, string> = {
  legendary: '#FA4C93', elite: '#FA4C93', gold: '#F97316', rare: '#16C46A', steel: '#C9C9C9',
};

const RING: Partial<Record<Tier, [color: string, dash: string]>> = {
  legendary: ['#FA4C93', '3 13'],
  elite: ['#FF8FC0', '4 12'],
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

const OUTER = 'M120 6 214 60v120l-94 54-94-54V60z';
const INNER = 'M120 22 200 68v104l-80 46-80-46V68z';
const SPARK = 'M0-9 7 0 0 9-7 0z';
const SPARKS_AT = [[120, 6], [219, 177], [21, 177]] as const;
// [x, y, scale, period, delay] — the design's three legendary twinkles.
const TWINKLES = [[196, 44, 0.5, 1900, 0], [44, 196, 0.42, 2400, 500], [206, 150, 0.36, 2100, 900]] as const;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Every layer is positioned. Web paints positioned elements above unpositioned
// ones regardless of source order (that is how the old halo ended up over the
// plate on web and under it on native); all-positioned, both platforms paint
// in source order: back to front as written below.
const fill = StyleSheet.absoluteFill;

const stops = (s: StopDef[]) =>
  s.map(([offset, color, opacity = 1]) => (
    <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
  ));

const Art = ({ size, children }: { size: number; children: React.ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 240 240">{children}</Svg>
);

function Aura({ tier, size, period, on }: { tier: Tier; size: number; period: number; on: boolean }) {
  const v = useBadgeLoop('pulse', on, period);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + v.value * 0.45,
    transform: [{ scale: 0.94 + v.value * 0.12 }],
  }));
  const span = size * AURA_SPAN;
  const inset = (size - span) / 2;
  return (
    <Animated.View testID="badge-aura" style={[{ position: 'absolute', left: inset, top: inset, width: span, height: span }, style]}>
      <Art size={span}>
        <Defs>
          <RadialGradient id={`badge-aura-${tier}`} cx="50%" cy="50%" r="50%">{stops(AURA[tier]!)}</RadialGradient>
        </Defs>
        <Circle cx={120} cy={120} r={120} fill={`url(#badge-aura-${tier})`} />
      </Art>
    </Animated.View>
  );
}

function Spinner({ testID, size, period, on, reverse, children }: { testID: string; size: number; period: number; on: boolean; reverse?: boolean; children: React.ReactNode }) {
  const v = useBadgeLoop('spin', on, period);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${(reverse ? -360 : 360) * v.value}deg` }] }));
  return (
    <Animated.View testID={testID} style={[fill, style]}>
      <Art size={size}>{children}</Art>
    </Animated.View>
  );
}

function Sweep({ size, period, double, on }: { size: number; period: number; double?: boolean; on: boolean }) {
  const a = useBadgeLoop('sweep', on, period);
  const b = useBadgeLoop('sweep', on && !!double, period, 220);
  // The design's band travels translateX(-170 → 300) from x = -40.
  const pa = useAnimatedProps(() => ({ x: -210 + a.value * 470 }));
  const pb = useAnimatedProps(() => ({ x: -210 + b.value * 470 }));
  return (
    <View testID="badge-sweep" style={fill}>
      <Art size={size}>
        <Defs>
          <ClipPath id="badge-clip"><Path d={OUTER} /></ClipPath>
          <LinearGradient id="badge-shine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset={0.5} stopColor="#FFFFFF" stopOpacity={0.55} />
            <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <G clipPath="url(#badge-clip)">
          {/* skewX(-9.46°) = the design's band leaning 40 units over its 240 height */}
          <G transform="skewX(-9.46)">
            <AnimatedRect x={-210} y={0} width={60} height={240} fill="url(#badge-shine)" animatedProps={pa} />
            {double ? <AnimatedRect x={-210} y={0} width={44} height={240} fill="url(#badge-shine)" opacity={0.5} animatedProps={pb} /> : null}
          </G>
        </G>
      </Art>
    </View>
  );
}

function Twinkle({ size, x, y, scale, period, delay, on }: { size: number; x: number; y: number; scale: number; period: number; delay: number; on: boolean }) {
  const v = useBadgeLoop('pulse', on, period, delay);
  const style = useAnimatedStyle(() => ({ opacity: 0.15 + v.value * 0.85 }));
  return (
    <Animated.View testID="badge-twinkle" style={[fill, style]}>
      <Art size={size}>
        <Path d={SPARK} transform={`translate(${x} ${y}) scale(${scale})`} fill="#FFD37A" />
      </Art>
    </Animated.View>
  );
}

/** One honour badge. Unknown or missing key → champion art. Decorative: the row carries the label. */
export function Badge({ badge, size = 44 }: { badge?: string; size?: number }) {
  const { tier, emblem } = badgeFor(badge);
  const fx = TIER_FX[tier];
  const on = useIsFocused();
  const ring = RING[tier];

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {fx.aura ? <Aura tier={tier} size={size} period={fx.aura} on={on} /> : null}
      {ring && fx.ring ? (
        <Spinner testID="badge-ring" size={size} period={fx.ring} on={on}>
          <Circle cx={120} cy={120} r={114} fill="none" stroke={ring[0]} strokeWidth={2} strokeDasharray={ring[1]} strokeOpacity={0.85} />
        </Spinner>
      ) : null}
      {fx.sparks ? (
        <Spinner testID="badge-sparks" size={size} period={fx.sparks} on={on} reverse>
          {SPARKS_AT.map(([x, y]) => (
            <Path key={`${x},${y}`} d={SPARK} transform={`translate(${x} ${y})`} fill="#F97316" />
          ))}
        </Spinner>
      ) : null}
      <View testID="badge-frame" style={fill}>
        <Art size={size}>
          {/* Gradient ids carry the tier: native scopes defs per <Svg>, but on
              Expo web every badge shares one DOM, and a shared id would paint
              them all alike. Same tier → identical defs, so those collide harmlessly. */}
          <Defs>
            <LinearGradient id={`badge-stroke-${tier}`} x1="0" y1="0" x2="1" y2="1">{stops(TIER_STROKE[tier])}</LinearGradient>
            <LinearGradient id="badge-plate" x1="0" y1="0" x2="0.6" y2="1">
              <Stop offset={0} stopColor="#1E1E1E" />
              <Stop offset={1} stopColor="#0B0B0B" />
            </LinearGradient>
            <RadialGradient id={`badge-inner-${tier}`} cx="50%" cy="50%" r="50%">
              <Stop offset={0} stopColor={INNER_GLOW[tier]} stopOpacity={0.45} />
              <Stop offset={1} stopColor={INNER_GLOW[tier]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Path d={OUTER} fill="url(#badge-plate)" stroke={`url(#badge-stroke-${tier})`} strokeWidth={5} />
          <Path d={INNER} fill="url(#badge-plate)" fillOpacity={0.65} stroke={`url(#badge-stroke-${tier})`} strokeWidth={1.5} strokeOpacity={0.5} />
          <Path d={INNER} fill={`url(#badge-inner-${tier})`} />
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
        </Art>
      </View>
      {fx.sweep ? <Sweep size={size} period={fx.sweep} double={fx.double} on={on} /> : null}
      {fx.twinkle
        ? TWINKLES.map(([x, y, scale, period, delay]) => (
            <Twinkle key={`${x},${y}`} size={size} x={x} y={y} scale={scale} period={period} delay={delay} on={on} />
          ))
        : null}
    </View>
  );
}
