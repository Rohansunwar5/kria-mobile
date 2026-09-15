import { dark, light, PALETTES, type Palette } from '../src/lib/theme/palette';
import { contrastRatio } from '../test-utils/contrast';

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

describe.each(Object.entries(PALETTES))('%s palette contrast', (name, palette) => {
  for (const { tokens, min } of FLOORS) {
    for (const token of tokens) {
      it(`${token} clears ${min}:1 on the background`, () => {
        const ratio = contrastRatio(palette[token], palette.bg);
        expect({ token, pass: ratio >= min, ratio: Number(ratio.toFixed(2)) }).toEqual({
          token,
          pass: true,
          ratio: Number(ratio.toFixed(2)),
        });
      });
    }
  }
});
