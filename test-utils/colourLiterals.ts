/**
 * The analyser behind `__tests__/colourLiterals.test.ts`.
 *
 * A ratchet, not a sweep: a file joins `MIGRATED` once its colour literals
 * become theme tokens, and from then on this fence stops them coming back.
 * The files not listed are the remaining backlog and are deliberately
 * unguarded — that is not the fence being broken, it is the fence not
 * having reached them yet.
 *
 * This lives outside `__tests__/` on purpose: jest's default testMatch treats
 * every `.ts` under that directory as a suite, so a helper there fails the run
 * with "must contain at least one test".
 */

/**
 * `MIGRATED` is the light-mode migration's progress bar, as repo-relative
 * paths. Append to it as a file's literals are replaced with tokens from
 * `useTheme()` — never remove an entry to make a failing file pass.
 */
export const MIGRATED: string[] = [
  'src/app/(tabs)/home.tsx',
  'src/components/home/EventsPortal.tsx',
  'src/components/home/PlayPortal.tsx',
  'src/components/home/PortalSwitch.tsx',
  'src/components/home/FilterBar.tsx',
  'src/components/home/FilterSheet.tsx',
  'src/components/navigation/FloatingTabBar.tsx',
  'src/components/icons/nav.tsx',
  'src/components/profile/Achievements.tsx',
  'src/components/home/TopPlayers.tsx',
  'src/components/profile/FormStrip.tsx',
  'src/components/profile/CareerCard.tsx',
  'src/components/profile/BestSportHero.tsx',
  'src/components/profile/PlayedForCard.tsx',
  'src/app/player/[playerId].tsx',
];

export interface ColourLiteralFinding {
  line: number;
  literal: string;
}

/**
 * A quoted string containing a hex colour (`#rgb`, `#rrggbb`, `#rrggbbaa`) or
 * an `rgb(...)`/`rgba(...)` function call. Deliberately excludes `hsl(...)`
 * (a seeded tournament hue is that tournament's identity, not a theme value)
 * and anything starting with `data:` (the grain/noise overlay is an asset
 * that happens to contain colour-ish text).
 *
 * The quote character is backreferenced so a single-quoted string can't be
 * "closed" early by a double quote inside it, and vice versa.
 */
const COLOUR_LITERAL = /(['"`])(?:(?!\1).)*?\1/g;

const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Anchored, because a colour literal is a WHOLE style value and never a
 * fragment of prose. Unanchored, this flagged `'the rgb(a) channel'` — and a
 * fence that cries wolf gets muted by the next person who trips it, which is
 * how three Anton violations shipped through a fence that looked green.
 *
 * The same rule applies to `HEX_COLOUR` above, which is why it is `^...$`: a
 * hex inside a longer string (`'1px solid #fff'`) is deliberately NOT flagged.
 * React Native styles take values, not CSS strings, so that shape does not
 * occur here; if it ever does, it wants its own rule rather than a loosening
 * of this one.
 */
const RGB_FUNCTION = /^rgba?\(/i;
const DATA_URI = /^data:/i;

/** True when the string content (without its surrounding quotes) is a colour literal. */
function isColourLiteral(content: string): boolean {
  if (DATA_URI.test(content)) return false;
  if (HEX_COLOUR.test(content)) return true;
  return RGB_FUNCTION.test(content);
}

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split('\n').length;
}

/** Every quoted colour literal in `src`, in source order. */
export function findColourLiterals(src: string): ColourLiteralFinding[] {
  const findings: ColourLiteralFinding[] = [];

  for (const match of src.matchAll(COLOUR_LITERAL)) {
    const literal = match[0];
    const content = literal.slice(1, -1);
    if (isColourLiteral(content)) {
      findings.push({ line: lineOf(src, match.index ?? 0), literal });
    }
  }

  return findings;
}
