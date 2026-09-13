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
  plus: ['M12 5.5 V18.5', 'M5.5 12 H18.5'],
  live: ['M3.5 12 H6.6 L8.9 6.4 L12.5 17.6 L14.8 12 H20.5'],
  user: ['M12 4.5 A3.9 3.9 0 1 1 12 12.3 A3.9 3.9 0 1 1 12 4.5 Z', 'M4.8 20 A7.2 7.2 0 0 1 19.2 20'],
} satisfies Record<string, NavIconDef>;

export type NavIconName = keyof typeof NAV_ICONS;

export const NAV_ICON_NAMES = Object.keys(NAV_ICONS) as NavIconName[];

export const NAV_ICON_PATHS: Record<NavIconName, string[]> = NAV_ICONS;

/** Stroke is authored on the 24 grid and scales with `size`, so a glyph keeps
 *  its weight rather than getting heavier as it grows. */
const GRID = 24;
const STROKE = 1.8;

export function NavIcon({
  name,
  size = 22,
  color,
  strokeWidth,
}: {
  name: NavIconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const width = strokeWidth ?? (STROKE * size) / GRID;
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
      {NAV_ICONS[name].map((d) => (
        <Path key={d} d={d} stroke={color} />
      ))}
    </Svg>
  );
}
