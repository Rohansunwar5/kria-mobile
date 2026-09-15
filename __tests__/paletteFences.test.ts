import { dark, light, PALETTES, type Palette } from '../src/lib/theme/palette';
import { contrastRatio } from '../test-utils/contrast';

// An anchor on the helper itself, independent of any palette value: black on
// white is the one ratio the WCAG formula is trivially checkable by hand
// (21:1, the top of the 1:1-21:1 scale), so it pins contrastRatio against a
// "simplification" that collapses the scale (e.g. a linear-luminance
// shortcut) without needing to trust any other assertion in this file first.
describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
  });
});

describe('palette fences', () => {
  // The silent failure this exists for: a token present in dark and missing
  // from light is `undefined`, and React Native renders undefined as
  // transparent. Nothing throws, nothing logs, and the screen ships with an
  // invisible element.
  it('defines exactly the same token set in every palette', () => {
    const expected = Object.keys(dark).sort();
    for (const [name, palette] of Object.entries(PALETTES)) {
      expect({ name, keys: Object.keys(palette).sort() }).toEqual({ name, keys: expected });
    }
  });

  it('leaves no token empty', () => {
    for (const [name, palette] of Object.entries(PALETTES)) {
      for (const [token, value] of Object.entries(palette)) {
        expect(`${name}.${token}=${value}`).toBe(`${name}.${token}=${value.trim()}`);
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });
});

// The floors are a table, not four copied assertions, because a fifth token
// class will arrive eventually.
//
// textFaint sits at 3.0 and not 4.5 deliberately: palette.ts documents it as
// "Labels, disabled", which is the one tier WCAG lets sit at the large-text /
// non-text floor. Light's #8A8A8A is 3.30:1 on paper and that is the approved
// artboard's own value. A blanket 4.5 fence would fail the design the user
// signed off. Do NOT raise this floor to make a number look tidier — darkening
// textFaint means re-approving the artboard.
const FLOORS: ReadonlyArray<{ tokens: ReadonlyArray<keyof Palette>; min: number }> = [
  { tokens: ['text', 'textBody', 'textMeta'], min: 4.5 },
  { tokens: ['textFaint'], min: 3.0 },
  { tokens: ['brandInk', 'openInk', 'auctionInk', 'failInk'], min: 4.5 },
];

// Real call sites are not only the page background: a card is `surface` and
// a nested tile inside a card (an inset row, a chip on a chip) is
// `surfaceAlt`. A token that clears its floor on `bg` alone can still fail
// on a tile it is actually painted against, and checking only `bg` would
// miss that silently — exactly how light's `openInk` shipped at 4.20:1 on
// `surfaceAlt` while reading 4.55:1 on `bg`.
const SURFACES: ReadonlyArray<keyof Palette> = ['bg', 'surface', 'surfaceAlt'];

describe.each(Object.entries(PALETTES))('%s palette contrast', (name, palette) => {
  for (const { tokens, min } of FLOORS) {
    for (const token of tokens) {
      for (const surface of SURFACES) {
        it(`${token} clears ${min}:1 on ${surface}`, () => {
          const ratio = contrastRatio(palette[token], palette[surface]);
          expect({ token, surface, pass: ratio >= min, ratio: Number(ratio.toFixed(2)) }).toEqual({
            token,
            surface,
            pass: true,
            ratio: Number(ratio.toFixed(2)),
          });
        });
      }
    }
  }
});

// palette.ts documents the alpha ladder as structural: dark lays white over
// ink, light lays ink over paper, at the SAME rungs. Nothing enforced that
// until now — changing light.handle to rgba(255,255,255,0.20) (white, the
// dark-side colour) would keep every other test green while rendering an
// invisible grab handle on paper, because a wrong alpha token throws nothing
// and just paints see-through.
const DARK_WHITE_ALPHA = /^rgba\(255,255,255,([\d.]+)\)$/;

/**
 * Tokens excluded from the mirror check, by name, each for its own reason.
 * `brandTint` / `auctionLine` / `failLine` are an accent colour at alpha
 * (e.g. dark's `brandTint` is `rgba(249,115,22,0.12)`), not the white/ink
 * ladder, so light correctly repeats the same coloured rgba rather than
 * mirroring to ink. `scrim` is ink-based in BOTH palettes
 * (`rgba(11,11,11,0.72)` in dark too) — a modal backdrop darkens whatever is
 * under it either way, so it was never white-over-ink to begin with.
 *
 * `fill` and `fillSoft` are a fifth and sixth exception beyond the four the
 * brief for this fix named, found while implementing it: they DO match
 * `DARK_WHITE_ALPHA` (dark is `rgba(255,255,255,0.07)` / `...,0.04)`), but
 * light's approved artboard value is `rgba(11,11,11,0.075)` / `...,0.045)`
 * — a deliberately HEAVIER alpha, not the same rung. palette.ts's own
 * docblock lists the ladder's rungs as 0.10/0.12/0.14/0.16/0.20/0.22/0.28;
 * 0.07 and 0.04 are not on that list. A raised fill reads lighter against
 * paper than the identical alpha reads against ink, so the artboard gave it
 * a touch more opacity in light. Excluding them here is not the fence
 * looking away — it is the fence not asserting a rule these two tokens were
 * never bound by; forcing them to `0.07`/`0.04` in light would undo an
 * approved artboard value to satisfy a test, not fix a bug.
 */
const ALPHA_LADDER_EXCEPTIONS = new Set<keyof Palette>([
  'brandTint',
  'auctionLine',
  'failLine',
  'scrim',
  'fill',
  'fillSoft',
]);

describe('alpha ladder mirror rule', () => {
  it('mirrors every dark white-alpha token to the same ink alpha in light', () => {
    const offenders: string[] = [];
    for (const key of Object.keys(dark) as Array<keyof Palette>) {
      if (ALPHA_LADDER_EXCEPTIONS.has(key)) continue;
      const match = DARK_WHITE_ALPHA.exec(dark[key]);
      if (!match) continue;
      const expected = `rgba(11,11,11,${match[1]})`;
      if (light[key] !== expected) {
        offenders.push(`${key}: dark=${dark[key]} light=${light[key]} expected=${expected}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  // A meta-assertion on the fence itself: a token named like an ink or a text
  // tier that is not in FLOORS at all has silently escaped the contrast
  // check, and a token listed in two rows would be checked against two
  // conflicting floors without either failing loudly.
  it('keeps every Ink/text* token in exactly one FLOORS row', () => {
    const relevant = (Object.keys(dark) as Array<keyof Palette>).filter(
      (key) => /Ink$/.test(key) || /^text/.test(key)
    );
    for (const token of relevant) {
      const rows = FLOORS.filter((row) => (row.tokens as ReadonlyArray<string>).includes(token));
      expect({ token, rows: rows.length }).toEqual({ token, rows: 1 });
    }
  });
});
