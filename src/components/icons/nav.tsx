import Svg, { Path } from 'react-native-svg';

/**
 * The bottom-nav icon set — the app's SECOND icon language.
 *
 * `src/components/icons/index.tsx` is the industrial set: 2px stroke, square
 * caps, mitred joins. It is right on a scoreboard and on a status tag. At 22px
 * inside a floating bar it read spiky rather than precise, and the nav is chrome
 * you see on every screen, so it should recede.
 *
 * These five are 1.8 stroke with ROUND caps and joins. DESIGN.md §4 fixes the
 * boundary bluntly: nav is soft, everything else is industrial. A round terminal
 * in content is a bug, not a style choice — and that is why this is its own
 * module rather than five more entries in the main set, where the two would
 * silently mix.
 */
type NavIconDef = string[];

const NAV_ICONS = {
  home: ['M3.8 10.4 L12 4.2 L20.2 10.4 V18.5 A1.7 1.7 0 0 1 18.5 20.2 H5.5 A1.7 1.7 0 0 1 3.8 18.5 Z'],
  search: ['M11 4.7 A6.3 6.3 0 1 1 11 17.3 A6.3 6.3 0 1 1 11 4.7 Z', 'M15.6 15.6 L20 20'],
  create: ['M7 3.5 H17 A3.5 3.5 0 0 1 20.5 7 V17 A3.5 3.5 0 0 1 17 20.5 H7 A3.5 3.5 0 0 1 3.5 17 V7 A3.5 3.5 0 0 1 7 3.5 Z', 'M12 8 V16', 'M8 12 H16'],
  calendar: ['M5.5 6 H18.5 A2 2 0 0 1 20.5 8 V18 A2 2 0 0 1 18.5 20 H5.5 A2 2 0 0 1 3.5 18 V8 A2 2 0 0 1 5.5 6 Z', 'M3.5 10.5 H20.5', 'M8 3.8 V7.6', 'M16 3.8 V7.6'],
  user: ['M12 4.5 A3.9 3.9 0 1 1 12 12.3 A3.9 3.9 0 1 1 12 4.5 Z', 'M4.8 20 A7.2 7.2 0 0 1 19.2 20'],
} satisfies Record<string, NavIconDef>;

export type NavIconName = keyof typeof NAV_ICONS;

export const NAV_ICON_NAMES = Object.keys(NAV_ICONS) as NavIconName[];

export const NAV_ICON_PATHS: Record<NavIconName, string[]> = NAV_ICONS;

/**
 * The active state, Instagram-style: a closed glyph fills in solid. `cut` is
 * drawn over the fill in the ground colour so a detail (the door, the
 * calendar's band) survives it. A glyph with no closed shape to fill (search)
 * goes heavier instead.
 */
const ACTIVE: Partial<Record<NavIconName, { fill?: string[]; cut?: string[]; stroke?: number }>> = {
  home: { fill: [NAV_ICONS.home[0]], cut: ['M9.8 20.2 V15.2 H14.2 V20.2'] },
  calendar: { fill: [NAV_ICONS.calendar[0]], cut: ['M3.5 10.5 H20.5'] },
  user: { fill: [NAV_ICONS.user[0], 'M4.8 20 A7.2 7.2 0 0 1 19.2 20 Z'] },
  search: { stroke: 2.7 },
};

/** Stroke is authored on the 24 grid and scales with `size`, so a glyph keeps
 *  its weight rather than getting heavier as it grows. */
const GRID = 24;
const STROKE = 1.8;

export function NavIcon({
  name,
  size = 22,
  color,
  strokeWidth,
  active,
  ground,
}: {
  name: NavIconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  /** Draw the filled, selected form. */
  active?: boolean;
  /** The colour behind the icon, for the details cut into a filled glyph. */
  ground?: string;
}) {
  const on = active ? ACTIVE[name] : undefined;
  const width = strokeWidth ?? ((on?.stroke ?? STROKE) * size) / GRID;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
      fill="none"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {on?.fill?.map((d) => (
        <Path key={`fill-${d}`} d={d} fill={color} />
      ))}
      {NAV_ICONS[name].map((d) => (
        <Path key={d} d={d} stroke={color} />
      ))}
      {ground ? on?.cut?.map((d) => <Path key={`cut-${d}`} d={d} stroke={ground} />) : null}
    </Svg>
  );
}
