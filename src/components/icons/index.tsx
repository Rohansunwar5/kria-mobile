import Svg, { Path } from 'react-native-svg';

/**
 * Kria icon set.
 *
 * Drawn to the same rules as the type system so icons read as part of the
 * brand rather than a borrowed library:
 *
 *   - 24x24 grid, 2px stroke (scales proportionally with `size`)
 *   - square caps, mitred joins — no round terminals anywhere. This is the
 *     single biggest departure from Ionicons and what makes the set feel
 *     industrial/broadcast rather than friendly.
 *   - angular construction: chevron-shaped trophy bowl, straight-sided map
 *     pin, square inner details where a library would use a circle.
 *   - the sport glyphs (shuttlecock, bat, stumps, court, gavel, bracket) are
 *     the ones no generic set has, and carry most of the brand character.
 *
 * API mirrors Ionicons so migration is a find/replace:
 *   <Icon name="trophy" size={20} color="#F97316" />
 *   <Icon name="trophy" size={20} color="#F97316" filled />
 */

type IconDef = {
  paths: string[];
  /** Closed-shape icons that read correctly with `filled`. */
  solid?: boolean;
};

const ICONS: Record<string, IconDef> = {
  // ── Navigation & UI ───────────────────────────────────────────────────────
  'chevron-left': { paths: ['M15 5 L8 12 L15 19'] },
  'chevron-right': { paths: ['M9 5 L16 12 L9 19'] },
  'chevron-down': { paths: ['M5 9 L12 16 L19 9'] },
  'chevron-up': { paths: ['M5 15 L12 8 L19 15'] },
  'arrow-right': { paths: ['M3 12 H19', 'M13 6 L19 12 L13 18'] },
  'arrow-left': { paths: ['M21 12 H5', 'M11 6 L5 12 L11 18'] },
  close: { paths: ['M5 5 L19 19', 'M19 5 L5 19'] },
  check: { paths: ['M4 12.5 L9.5 18 L20 6'] },
  plus: { paths: ['M12 4 V20', 'M4 12 H20'] },
  minus: { paths: ['M4 12 H20'] },

  // Square handles instead of the usual round dots.
  filter: {
    paths: [
      'M3 7 H10', 'M14 7 H21', 'M10 5 H14 V9 H10 Z',
      'M3 17 H14', 'M18 17 H21', 'M14 15 H18 V19 H14 Z',
    ],
  },
  settings: {
    paths: [
      'M6 4 V20', 'M4 8 H8 V11 H4 Z',
      'M12 4 V20', 'M10 13 H14 V16 H10 Z',
      'M18 4 V20', 'M16 6 H20 V9 H16 Z',
    ],
  },
  refresh: { paths: ['M20.5 12 A8.5 8.5 0 1 1 17.8 5.8', 'M20.5 3.5 V9 H15'] },
  search: {
    paths: [
      'M10.5 4 A6.5 6.5 0 1 1 10.5 17 A6.5 6.5 0 1 1 10.5 4 Z',
      'M15.5 15.5 L20.5 20.5',
    ],
  },
  bell: { paths: ['M18.5 15 V10 A6.5 6.5 0 1 0 5.5 10 V15 L3.5 19 H20.5 Z', 'M9.5 21.5 H14.5'] },
  share: { paths: ['M12 16 V3', 'M7 8 L12 3 L17 8', 'M4.5 13 V20.5 H19.5 V13'] },
  logout: { paths: ['M15 17 L20 12 L15 7', 'M20 12 H10', 'M12 3.5 H4 V20.5 H12'] },
  message: { paths: ['M3.5 4.5 H20.5 V16.5 H9 L4 21 V16.5 H3.5 Z'] },
  lock: { paths: ['M5.5 11 H18.5 V20.5 H5.5 Z', 'M8.5 11 V7.5 A3.5 3.5 0 0 1 15.5 7.5 V11'] },
  card: { paths: ['M3 6 H21 V18 H3 Z', 'M3 10 H21'] },
  alert: { paths: ['M12 2.5 L21.5 20.5 H2.5 Z', 'M12 9 V14.5', 'M12 17.2 V17.9'] },
  info: {
    paths: [
      'M12 3.5 A8.5 8.5 0 1 1 12 20.5 A8.5 8.5 0 1 1 12 3.5 Z',
      'M12 11 V16.5', 'M12 7.4 V8.1',
    ],
  },
  help: {
    paths: [
      'M12 3.5 A8.5 8.5 0 1 1 12 20.5 A8.5 8.5 0 1 1 12 3.5 Z',
      'M9.4 9.6 A2.8 2.8 0 1 1 13.4 12.1 C12.5 12.7 12 13.3 12 14.4',
      'M12 16.8 V17.5',
    ],
  },
  eye: {
    paths: [
      'M2.5 12 C5 7.5 8.5 5.5 12 5.5 S19 7.5 21.5 12 C19 16.5 15.5 18.5 12 18.5 S5 16.5 2.5 12 Z',
      'M10 10 H14 V14 H10 Z',
    ],
  },

  // ── Sport & domain — the brand-carrying glyphs ────────────────────────────

  /** Angular chevron-bowl trophy, not the usual rounded cup. */
  trophy: {
    solid: true,
    paths: [
      'M6.5 3.5 H17.5 V8 L12 13.5 L6.5 8 Z',
      'M6.5 5.5 H3.5 V7.5 L6.5 9.5',
      'M17.5 5.5 H20.5 V7.5 L17.5 9.5',
      'M12 13.5 V17.5',
      'M8.5 17.5 H15.5 V20.5 H8.5 Z',
    ],
  },
  medal: {
    solid: true,
    paths: [
      'M12 9.5 A5 5 0 1 1 12 19.5 A5 5 0 1 1 12 9.5 Z',
      'M8 3 L10.5 10', 'M16 3 L13.5 10',
      'M10.5 13 H13.5 V16.5 H10.5 Z',
    ],
  },
  /** Badminton shuttlecock: flared feather skirt over a cork base. */
  shuttlecock: {
    solid: true,
    paths: [
      'M6.5 3.5 H17.5 L15 14.5 H9 Z',
      'M9 14.5 H15 L14.5 17.5 A2.5 2.5 0 0 1 9.5 17.5 Z',
      'M10.2 3.5 L11 14.5', 'M13.8 3.5 L13 14.5',
    ],
  },
  /** Cricket bat: angled blade with a spliced handle. */
  'cricket-bat': {
    paths: [
      'M8.5 20.5 L4 16 L12.5 7.5 L17 12 Z',
      'M14 6.5 L18.5 2',
      'M12.5 7.5 L14 6.5',
    ],
  },
  /** Cricket stumps with bails. */
  stumps: {
    paths: [
      'M7 8.5 V20.5', 'M12 8.5 V20.5', 'M17 8.5 V20.5',
      'M5.5 7 H11', 'M13 7 H18.5',
    ],
  },
  /** Cricket ball with seam. */
  ball: {
    solid: true,
    paths: [
      'M12 3.5 A8.5 8.5 0 1 1 12 20.5 A8.5 8.5 0 1 1 12 3.5 Z',
      'M8 5 C10.5 8.5 10.5 15.5 8 19',
      'M16 5 C13.5 8.5 13.5 15.5 16 19',
    ],
  },
  /** Auction gavel — the manual-assisted auction is the product's core. */
  gavel: {
    paths: [
      'M13 2.5 L19.5 9 L16.5 12 L10 5.5 Z',
      'M11 9.5 L5 15.5',
      'M3 21 H13',
    ],
  },
  /** Knockout bracket: two pairs merging into one. */
  bracket: {
    paths: [
      'M3 6 H8.5 V12 H14.5', 'M3 18 H8.5 V12', 'M14.5 12 H21',
      'M12.5 10 H16.5 V14 H12.5 Z',
    ],
  },
  /** Court with a net across the middle — badminton or tennis. */
  court: {
    paths: [
      'M3 4.5 H21 V19.5 H3 Z',
      'M3 12 H21',
      'M8 4.5 V19.5', 'M16 4.5 V19.5',
    ],
  },
  /** Team crest / shield. */
  shield: {
    solid: true,
    paths: ['M12 2.5 L20.5 5.5 V12 C20.5 17 16.5 20.3 12 21.5 C7.5 20.3 3.5 17 3.5 12 V5.5 Z'],
  },

  // ── Data & records ────────────────────────────────────────────────────────
  chart: {
    paths: [
      'M3 20.5 H21',
      'M4.5 20.5 V13.5 H8 V20.5', 'M10.25 20.5 V8 H13.75 V20.5', 'M16 20.5 V4 H19.5 V20.5',
    ],
  },
  calendar: { paths: ['M3.5 6 H20.5 V20.5 H3.5 Z', 'M8 3 V7.5', 'M16 3 V7.5', 'M3.5 11 H20.5'] },
  clock: {
    paths: [
      'M12 3.5 A8.5 8.5 0 1 1 12 20.5 A8.5 8.5 0 1 1 12 3.5 Z',
      'M12 7 V12 L16 14.5',
    ],
  },
  /** Straight-sided pin with a square core, not the usual teardrop + dot. */
  location: {
    solid: true,
    paths: ['M12 21.5 L5 12.5 A7.5 7.5 0 1 1 19 12.5 Z', 'M10 8 H14 V12 H10 Z'],
  },
  people: {
    paths: [
      'M9.5 4 A3.5 3.5 0 1 1 9.5 11 A3.5 3.5 0 1 1 9.5 4 Z',
      'M2.5 20.5 A7 7 0 0 1 16.5 20.5',
      'M16 4.5 A3.5 3.5 0 0 1 16 11.5',
      'M18 14 A6.5 6.5 0 0 1 21.5 20.5',
    ],
  },
  person: {
    solid: true,
    paths: [
      'M12 4 A3.8 3.8 0 1 1 12 11.6 A3.8 3.8 0 1 1 12 4 Z',
      'M4.5 20.5 A7.5 7.5 0 0 1 19.5 20.5',
    ],
  },
  'id-card': {
    paths: [
      'M3 5 H21 V19 H3 Z',
      'M9 8.5 A2.2 2.2 0 1 1 9 12.9 A2.2 2.2 0 1 1 9 8.5 Z',
      'M5.75 16.5 A3.25 3.25 0 0 1 12.25 16.5',
      'M15 10 H18.5', 'M15 14 H18.5',
    ],
  },
  receipt: {
    paths: [
      'M5 3 H19 V21 L16.2 19 L13.4 21 L10.6 19 L7.8 21 L5 19 Z',
      'M9 8.5 H15', 'M9 12.5 H13',
    ],
  },
  document: { paths: ['M5 3 H15 L19 7 V21 H5 Z', 'M14 3 V8 H19', 'M8 12 H16', 'M8 16 H13'] },
  /** Price tag with a square punch. */
  tag: {
    paths: ['M11 3 H20.5 V12.5 L11.5 21.5 L2.5 12.5 Z', 'M15.5 6.5 H18 V9 H15.5 Z'],
  },
  flame: {
    solid: true,
    paths: [
      'M12 21.5 A6.5 6.5 0 0 0 18.5 15 C18.5 9 12 2.5 12 2.5 S5.5 9 5.5 15 A6.5 6.5 0 0 0 12 21.5 Z',
      'M12 17.8 A2.6 2.6 0 0 0 14.6 15.2 C14.6 13.1 12 10.5 12 10.5 S9.4 13.1 9.4 15.2 A2.6 2.6 0 0 0 12 17.8 Z',
    ],
  },
  /** Live broadcast: a solid core with signal arcs. */
  live: {
    paths: [
      'M10 10 H14 V14 H10 Z',
      'M7.5 7.5 A6.4 6.4 0 0 0 7.5 16.5', 'M16.5 7.5 A6.4 6.4 0 0 1 16.5 16.5',
      'M4.5 4.5 A10.6 10.6 0 0 0 4.5 19.5', 'M19.5 4.5 A10.6 10.6 0 0 1 19.5 19.5',
    ],
  },
};

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** Raw geometry, exposed so tests (and any tooling) can inspect the path data. */
export const ICON_PATHS: Record<IconName, string[]> = Object.fromEntries(
  ICON_NAMES.map((n) => [n, ICONS[n].paths])
) as Record<IconName, string[]>;

/** Names whose closed shapes read correctly with `filled`. */
export const SOLID_CAPABLE = ICON_NAMES.filter((n) => ICONS[n].solid);

export function Icon({
  name,
  size = 20,
  color = '#FFFFFF',
  filled = false,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  /** Solid variant for active/selected states. Only meaningful on SOLID_CAPABLE names. */
  filled?: boolean;
  strokeWidth?: number;
}) {
  const def = ICONS[name];
  if (!def) return null;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {def.paths.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={filled ? 1.2 : strokeWidth}
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill={filled ? color : 'none'}
        />
      ))}
    </Svg>
  );
}
