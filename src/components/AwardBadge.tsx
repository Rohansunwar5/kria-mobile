import { useEffect, useId } from 'react';
import Animated, { Easing, cancelAnimation, useAnimatedProps, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors, font, metals, type Metal } from '@/constants/theme';
import { ICON_PATHS, type IconName } from '@/components/ui/iconPaths';

export type BadgeShape = 'coin' | 'rosette' | 'shield' | 'hex';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const GLOW: Record<Metal, string> = {
  bronze: 'rgba(226,167,125,0.32)', silver: 'rgba(227,231,236,0.26)', gold: 'rgba(240,213,146,0.34)',
  platinum: 'rgba(196,220,255,0.34)', locked: 'rgba(0,0,0,0)',
};
const SHIELD = [[0, 8], [50, 0], [100, 8], [100, 50], [97.5, 62], [91, 74], [81, 85], [67, 94], [50, 100], [33, 94], [19, 85], [9, 74], [2.5, 62], [0, 50]];
const HEX = [[50, 0], [93.3, 25], [93.3, 75], [50, 100], [6.7, 75], [6.7, 25]];
const ROSETTE = Array.from({ length: 40 }, (_, i) => {
  const a = (Math.PI * i) / 20 - Math.PI / 2;
  const r = i % 2 ? 45 : 50;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
});
const pts = (poly: number[][], x: number, y: number, w: number, h: number) => poly.map(([px, py]) => `${x + (px / 100) * w},${y + (py / 100) * h}`).join(' ');

/**
 * DESIGN §5.11 award badge, from AwardBadge.dc.html. Title = shield + laurel +
 * ribbon, honour = rosette, knockout = hexagon, milestone = coin; the metal
 * carries the tier. Below 64px it drops laurel, ribbon and sub-label. `shine`
 * is a 4.2s sweep for one badge per viewport, off under reduced motion.
 * `progress` (0–1) draws the ring around a locked badge.
 */
export function AwardBadge({ shape, metal, size, icon, glyph, sub, ribbon, laurel, shine, progress, count }: {
  shape: BadgeShape;
  metal: Metal;
  size: number;
  icon?: IconName;
  glyph?: string;
  sub?: string;
  ribbon?: string;
  laurel?: boolean;
  shine?: boolean;
  progress?: number;
  count?: number;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const M = metals[metal];
  const locked = metal === 'locked';
  const S = size;
  const small = S < 64;
  const showRibbon = !small && ribbon ? ribbon : '';
  const showLaurel = !small && !!laurel;
  const prog = locked && progress != null ? Math.max(0, Math.min(1, progress)) : null;
  const subText = S >= 96 && sub ? sub : '';
  const round = shape === 'coin' || shape === 'rosette';

  const md = showRibbon || showLaurel ? S * 0.72 : prog != null ? S * 0.84 : S;
  const mw = shape === 'shield' ? md * 0.86 : md;
  const mh = md;
  const mx = (S - mw) / 2;
  const my = showRibbon ? S * 0.03 : (S - mh) / 2;
  const b0 = shape === 'rosette' ? md * 0.1 : 0;
  const rimW = md * (small ? 0.1 : 0.075);
  const grooveW = Math.max(1, md * 0.016);
  const hair = md * 0.045;
  const hairW = Math.max(1, md * 0.009);
  const e = b0 + rimW + grooveW;
  const fi = small ? e : e + hair + hairW;

  /** The badge outline inset by `ins`, filled with `fill`. */
  const shapeAt = (ins: number, fill: string, key: string) => {
    const x = mx + ins, y = my + ins, w = mw - ins * 2, h = mh - ins * 2;
    if (round) return <Circle key={key} cx={x + w / 2} cy={y + h / 2} r={w / 2} fill={fill} />;
    return <Polygon key={key} points={pts(shape === 'shield' ? SHIELD : HEX, x, y, w, h)} fill={fill} />;
  };

  // Glyph area and type sizes, as the mock computes them.
  const fw = mw - fi * 2;
  const fh = (mh - fi * 2) * (shape === 'shield' ? 0.88 : 1);
  const gx = mx + fi + fw / 2;
  const gy = my + fi + fh / 2;
  const k = subText ? 0.8 : 1;
  const len = glyph?.length ?? 0;
  const textSize = fw * (len <= 2 ? 0.62 : len === 3 ? 0.46 : 0.36) * k;
  const iconSize = fw * (shape === 'hex' ? 0.56 : 0.6) * k;
  const subSize = Math.max(7, fw * 0.1);
  const gap = fw * 0.04;
  const main = glyph ? textSize * 0.69 : iconSize; // cap height of the condensed face
  const stackH = main + (subText ? gap + subSize * 0.72 : 0);
  const top = gy - stackH / 2;

  const t = Math.max(2, S * 0.03);
  const pipD = Math.max(18, S * 0.25);
  const n = count && count > 1 ? count : 0;

  return (
    <Svg width={S} height={S} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={M.hi} />
          <Stop offset="0.14" stopColor={M.light} />
          <Stop offset="0.32" stopColor={M.base} />
          <Stop offset="0.5" stopColor={M.dark} />
          <Stop offset="0.58" stopColor={M.deep} />
          <Stop offset="0.68" stopColor={M.dark} />
          <Stop offset="0.82" stopColor={M.base} />
          <Stop offset="1" stopColor={M.light} />
        </LinearGradient>
        <LinearGradient id={`${id}shade`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.24} />
        </LinearGradient>
        <LinearGradient id={`${id}groove`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={M.deep} />
          <Stop offset="1" stopColor={M.dark} />
        </LinearGradient>
        <LinearGradient id={`${id}hair`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={M.light} />
          <Stop offset="1" stopColor={M.dark} />
        </LinearGradient>
        <RadialGradient id={`${id}enamel`} cx="50%" cy="14%" rx="110%" ry="85%" fx="50%" fy="14%">
          <Stop offset="0" stopColor={M.enamel[0]} />
          <Stop offset="0.72" stopColor={M.enamel[1]} />
        </RadialGradient>
        <RadialGradient id={`${id}glow`} cx="50%" cy={shape === 'shield' ? '44%' : '50%'} r="58%">
          <Stop offset="0" stopColor={GLOW[metal]} />
          <Stop offset="1" stopColor={GLOW[metal]} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}gloss`} cx="28%" cy="0%" rx="120%" ry="70%" fx="28%" fy="0%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={locked ? 0.07 : 0.28} />
          <Stop offset="0.4" stopColor="#FFFFFF" stopOpacity={locked ? 0.02 : 0.05} />
          <Stop offset="0.56" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}ink`} x1="0" y1="0" x2="0" y2="1">
          {locked
            ? [<Stop key="a" offset="0" stopColor="#6E6E76" />, <Stop key="b" offset="1" stopColor="#44444C" />]
            : [<Stop key="a" offset="0" stopColor={M.hi} />, <Stop key="b" offset="0.36" stopColor={M.light} />, <Stop key="c" offset="0.66" stopColor={M.base} />, <Stop key="d" offset="1" stopColor={M.dark} />]}
        </LinearGradient>
        <LinearGradient id={`${id}leaf`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={M.hi} />
          <Stop offset="0.3" stopColor={M.light} />
          <Stop offset="0.65" stopColor={M.base} />
          <Stop offset="1" stopColor={M.dark} />
        </LinearGradient>
        <LinearGradient id={`${id}band`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={M.hi} />
          <Stop offset="0.3" stopColor={M.light} />
          <Stop offset="0.7" stopColor={M.base} />
          <Stop offset="1" stopColor={M.dark} />
        </LinearGradient>
        <LinearGradient id={`${id}tail`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={M.dark} />
          <Stop offset="1" stopColor={M.deep} />
        </LinearGradient>
        <LinearGradient id={`${id}shine`} x1="0" y1="0" x2="1" y2="0.27">
          <Stop offset="0.38" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.48" stopColor="#FFFFFF" stopOpacity={0.42} />
          <Stop offset="0.52" stopColor="#FFFFFF" stopOpacity={0.1} />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <ClipPath id={`${id}clip`}>{shapeAt(b0, '#000', 'clip')}</ClipPath>
      </Defs>

      {showLaurel ? <Laurel S={S} cy={my + mh * 0.5} R={md * 0.6} fill={`url(#${id}leaf)`} /> : null}

      {shape === 'rosette' ? (
        <>
          <Polygon points={pts(ROSETTE, mx, my, mw, mh)} fill={`url(#${id}rim)`} />
          <Circle cx={mx + mw / 2} cy={my + mh / 2} r={mw / 2 - (b0 - Math.max(1.2, md * 0.012))} fill={M.deep} />
        </>
      ) : null}
      {shapeAt(b0, `url(#${id}rim)`, 'rim')}
      {shapeAt(b0, `url(#${id}shade)`, 'shade')}
      {shapeAt(b0 + rimW, `url(#${id}groove)`, 'groove')}
      {shapeAt(e, `url(#${id}enamel)`, 'enamel')}
      {small ? null : shapeAt(e + hair, `url(#${id}hair)`, 'hair')}
      {small ? null : shapeAt(fi, `url(#${id}enamel)`, 'field')}
      {shapeAt(fi, `url(#${id}glow)`, 'glow')}

      {glyph ? (
        <SvgText x={gx} y={top + main} fill={`url(#${id}ink)`} fontFamily={font.display} fontSize={textSize} textAnchor="middle">{glyph}</SvgText>
      ) : icon ? (
        <G transform={`translate(${gx - iconSize / 2} ${top + iconSize}) scale(${iconSize / 960})`}>
          <Path d={(ICON_PATHS[icon] as Record<string, string>).f ?? ICON_PATHS[icon].o} fill={`url(#${id}ink)`} />
        </G>
      ) : null}
      {subText ? (
        <SvgText x={gx} y={top + main + gap + subSize * 0.72} fill={`url(#${id}ink)`} fontFamily={font.bold} fontSize={subSize} letterSpacing={subSize * 0.16} textAnchor="middle">{subText}</SvgText>
      ) : null}

      {shapeAt(b0, `url(#${id}gloss)`, 'gloss')}
      {shine && !locked ? <Shine clip={`url(#${id}clip)`} fill={`url(#${id}shine)`} x={mx} y={my} w={mw} h={mh} /> : null}

      {showRibbon ? (
        <Ribbon S={S} y={my + mh - S * 0.16 * 0.62} text={showRibbon} ink={M.deep} band={`url(#${id}band)`} tail={`url(#${id}tail)`} />
      ) : null}

      {prog != null ? (
        <>
          <Circle cx={S / 2} cy={S / 2} r={S / 2 - t / 2} stroke={colors.surface3} strokeWidth={t} fill="none" />
          <Circle
            cx={S / 2} cy={S / 2} r={S / 2 - t / 2} stroke={colors.text} strokeWidth={t} fill="none"
            strokeDasharray={`${Math.PI * (S - t) * prog} ${Math.PI * (S - t)}`} transform={`rotate(-90 ${S / 2} ${S / 2})`}
          />
        </>
      ) : null}

      {n ? (
        <G>
          <Circle cx={S - pipD * 0.92 + pipD / 2} cy={S * 0.03 + pipD / 2} r={pipD / 2 + Math.max(2, S * 0.02)} fill={colors.bg} />
          <Circle cx={S - pipD * 0.92 + pipD / 2} cy={S * 0.03 + pipD / 2} r={pipD / 2} fill={colors.text} />
          <SvgText x={S - pipD * 0.92 + pipD / 2} y={S * 0.03 + pipD / 2 + pipD * 0.15} fill={colors.bg} fontFamily={font.bold} fontSize={pipD * 0.42} textAnchor="middle">{`×${n}`}</SvgText>
        </G>
      ) : null}
    </Svg>
  );
}

function Laurel({ S, cy, R, fill }: { S: number; cy: number; R: number; fill: string }) {
  const cx = S / 2;
  return (
    <G>
      {[-1, 1].flatMap((side) =>
        Array.from({ length: 8 }, (_, i) => {
          const deg = side < 0 ? 108 + i * 15.5 : 72 - i * 15.5;
          const a = (deg * Math.PI) / 180;
          const h = S * 0.15 * (1 - i * 0.055);
          const x = cx + R * Math.cos(a);
          const y = cy + R * Math.sin(a);
          return <Ellipse key={`${side}${i}`} cx={x} cy={y} rx={(h * 0.46) / 2} ry={h / 2} fill={fill} transform={`rotate(${side < 0 ? deg + 158 : deg + 22} ${x} ${y})`} />;
        }),
      )}
    </G>
  );
}

function Ribbon({ S, y, text, ink, band, tail }: { S: number; y: number; text: string; ink: string; band: string; tail: string }) {
  const rh = S * 0.16;
  const rw = S * 0.92;
  const rx = (S - rw) / 2;
  const tw = rh * 1.15;
  const ty = y + rh * 0.34;
  const lx = rx - tw * 0.5;
  const rtx = rx + rw - tw * 0.5;
  return (
    <G>
      <Polygon points={`${lx},${ty} ${lx + tw},${ty} ${lx + tw},${ty + rh} ${lx},${ty + rh} ${lx + tw * 0.3},${ty + rh / 2}`} fill={tail} />
      <Polygon points={`${rtx},${ty} ${rtx + tw},${ty} ${rtx + tw * 0.7},${ty + rh / 2} ${rtx + tw},${ty + rh} ${rtx},${ty + rh}`} fill={tail} />
      <Rect x={rx} y={y} width={rw} height={rh} rx={rh * 0.12} fill={band} />
      <SvgText x={S / 2} y={y + rh / 2 + rh * 0.44 * 0.35} fill={ink} fontFamily={font.display} fontSize={rh * 0.44} letterSpacing={rh * 0.44 * 0.14} textAnchor="middle">{text}</SvgText>
    </G>
  );
}

/** One sweep across the face every 4.2s (45% moving, the rest resting). */
function Shine({ clip, fill, x, y, w, h }: { clip: string; fill: string; x: number; y: number; w: number; h: number }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    p.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4200 * 0.45, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(1, { duration: 4200 * 0.55 }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(p);
  }, [reduced, p]);
  const props = useAnimatedProps(() => ({ x: x - w * 1.3 + p.value * w * 2.6 }));
  if (reduced) return null;
  return (
    <G clipPath={clip}>
      <AnimatedRect animatedProps={props} y={y} width={w * 1.3} height={h} fill={fill} />
    </G>
  );
}
