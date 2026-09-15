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
 *
 * EXCEPTION, dated 2026-09-15: eight entries were removed here —
 * `src/app/(tabs)/home.tsx`, `src/components/home/PlayPortal.tsx`,
 * `src/components/home/PortalSwitch.tsx`, `src/components/home/FilterBar.tsx`,
 * `src/components/home/FilterSheet.tsx`,
 * `src/components/navigation/FloatingTabBar.tsx`,
 * `src/components/home/TopPlayers.tsx` and `src/components/profile/FormStrip.tsx`.
 * They were never actually migrated: every one of them still reads the
 * legacy hardcoded `colors` object from `src/lib/theme.ts` (`colors.white`,
 * `colors.brand`, ...), which is a dark-only palette with no light
 * counterpart. The quoted-literal check above could not see that — it only
 * matches string literals, and `colors.white` is a property access, not a
 * string — so `MIGRATED` was asserting something false about these eight
 * files. This is the one case where removing an entry is correct instead of
 * "making a failing file pass": the files were never migrated, the assertion
 * was wrong, not the fence. They go back in only when a real migration batch
 * replaces their `colors.*` usage with `useTheme()` tokens.
 */
export const MIGRATED: string[] = [
  'src/components/home/EventsPortal.tsx',
  'src/components/icons/nav.tsx',
  'src/components/profile/Achievements.tsx',
  'src/components/profile/CareerCard.tsx',
  'src/components/profile/BestSportHero.tsx',
  'src/components/profile/PlayedForCard.tsx',
  'src/app/player/[playerId].tsx',
  'src/app/(tabs)/profile.tsx',
  'src/app/profile/settings.tsx',
  'src/components/settings/AppearanceSection.tsx',
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

/**
 * The legacy hardcoded palette in `src/lib/theme.ts` (`ink`, `panel`,
 * `panel2`, `brand`, `auction`, `open`, `fail`, `line`, `white`) — a dark-only
 * object kept around because 8 files still import it. Member access on it
 * (`colors.white`) is invisible to `findColourLiterals` above: the match
 * target there is a quoted string, and `colors.white` is a property chain,
 * not a string.
 */
const LEGACY_COLOR_KEYS = ['ink', 'panel2', 'panel', 'brand', 'auction', 'open', 'fail', 'line', 'white'] as const;

const LEGACY_COLORS_MEMBER = new RegExp(`\\bcolors\\.(?:${LEGACY_COLOR_KEYS.join('|')})\\b`, 'g');

/**
 * NativeWind colour classnames — the third channel, and a string, but one
 * whose *content* is a utility name (`bg-ink`) rather than a colour value, so
 * `isColourLiteral` never matches it either. Restricted to the colour names
 * actually in play here (the custom palette above, plus the default Tailwind
 * `white`/`black`) rather than every Tailwind colour scale, because a
 * broader net would need to exclude non-colour utilities that share the same
 * prefixes (`border-2`, `text-sm`, `from-1`, ...) — this codebase's className
 * usage is small enough to check by name instead of guessing at that split.
 * An optional `/NN` opacity modifier (`bg-ink/50`) is allowed after the name.
 */
const COLOUR_CLASS_PREFIX =
  '(?:bg|text|border|fill|stroke|from|to|via|ring|divide|placeholder|shadow|outline|accent|caret|decoration)';
const COLOUR_CLASS_NAME = `(?:${LEGACY_COLOR_KEYS.join('|')}|black|transparent)`;
const COLOUR_CLASSNAME_TOKEN = new RegExp(`\\b${COLOUR_CLASS_PREFIX}-${COLOUR_CLASS_NAME}(?:/\\d{1,3})?\\b`, 'g');

/**
 * A `className="..."` / `className={'...'}` / `className={\`...\`}` attribute
 * value. The `d` (hasIndices) flag reports each capture group's own
 * [start, end], so a token found inside the value maps back to a source line
 * without re-deriving its offset from the whole-match string.
 */
const CLASSNAME_ATTR = /className\s*=\s*(?:"([^"]*)"|(['`])((?:(?!\2).)*?)\2)/gd;

/**
 * The two detection channels `findColourLiterals` cannot see, because neither
 * one's match target is a quoted colour *value*:
 *
 *   - `colors.<prop>` member access on the legacy hardcoded palette object.
 *   - a colour-bearing NativeWind classname inside a `className` string.
 *
 * Kept as a sibling function rather than folded into `findColourLiterals`:
 * that function's quoted-literal behaviour is exercised by its own suite
 * above and must keep working unchanged, and this is new, separately-risky
 * detection (a `className` string is prose-shaped, unlike a colour literal,
 * so it needs its own narrower rule rather than reusing `COLOUR_LITERAL`).
 */
export function findLegacyColourUsages(src: string): ColourLiteralFinding[] {
  const findings: ColourLiteralFinding[] = [];

  for (const match of src.matchAll(LEGACY_COLORS_MEMBER)) {
    findings.push({ line: lineOf(src, match.index ?? 0), literal: match[0] });
  }

  for (const attrMatch of src.matchAll(CLASSNAME_ATTR) as IterableIterator<RegExpMatchArray & { indices: Array<[number, number] | undefined> }>) {
    const groupIndex = attrMatch[1] !== undefined ? 1 : 3;
    const value = attrMatch[groupIndex] ?? '';
    const valueStart = attrMatch.indices[groupIndex]?.[0] ?? 0;
    for (const tokenMatch of value.matchAll(COLOUR_CLASSNAME_TOKEN)) {
      findings.push({ line: lineOf(src, valueStart + (tokenMatch.index ?? 0)), literal: tokenMatch[0] });
    }
  }

  return findings;
}
