import { dark, PALETTES } from '../src/lib/theme/palette';
import { colors } from '../src/lib/theme';

describe('dark palette', () => {
  // These assertions are the zero-visual-change guarantee. Every value here is
  // a literal that exists in the tree today; if one drifts, a screen changed
  // appearance and this task failed at its one job.
  it('matches the values DESIGN.md §2 already documents', () => {
    expect(dark.bg).toBe('#0B0B0B');
    expect(dark.surface).toBe('#151515');
    expect(dark.surfaceAlt).toBe('#1E1E1E');
    expect(dark.line).toBe('rgba(255,255,255,0.14)');
    expect(dark.brand).toBe('#F97316');
    expect(dark.auction).toBe('#FA4C93');
    expect(dark.open).toBe('#16C46A');
    expect(dark.fail).toBe('#FF4438');
  });

  it('keeps the four text tiers DESIGN.md §2 names', () => {
    expect(dark.text).toBe('#FFFFFF');
    expect(dark.textBody).toBe('#d4d4d4');
    expect(dark.textMeta).toBe('#a3a3a3');
    expect(dark.textFaint).toBe('#7d7d7d');
  });

  // The whole reason this layer exists. `#0B0B0B` is the app background 26
  // times and ink-on-a-bright-fill 43 times; in light mode the first becomes
  // paper and the second stays near-black. Same value today, different futures,
  // so they cannot be one token.
  it('separates the background from ink-on-an-accent, though both are #0B0B0B today', () => {
    expect(dark.bg).toBe(dark.onBrand);
    expect(Object.keys(dark)).toContain('bg');
    expect(Object.keys(dark)).toContain('onBrand');
  });

  it('gives every accent its own ink, because they are not interchangeable', () => {
    expect(dark.onOpen).toBe('#06240F');
    expect(dark.onAuction).toBe('#240614');
    expect(dark.onFail).toBe('#2A0703');
  });

  // Same split as bg/onBrand, the other way up: primary text goes near-black on
  // paper, but text on an ink block stays white.
  it('separates primary text from text-on-ink, though both are white today', () => {
    expect(dark.text).toBe(dark.onDark);
    expect(Object.keys(dark)).toContain('text');
    expect(Object.keys(dark)).toContain('onDark');
  });

  it('agrees with the legacy colors object it replaces', () => {
    expect(dark.bg).toBe(colors.ink);
    expect(dark.surface).toBe(colors.panel);
    expect(dark.surfaceAlt).toBe(colors.panel2);
    expect(dark.brand).toBe(colors.brand);
    expect(dark.auction).toBe(colors.auction);
    expect(dark.open).toBe(colors.open);
    expect(dark.fail).toBe(colors.fail);
    expect(dark.line).toBe(colors.line);
  });

  it('registers dark as a named palette', () => {
    expect(PALETTES.dark).toBe(dark);
  });

  it('has no token whose value is undefined or empty', () => {
    for (const [name, value] of Object.entries(dark)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      expect(name).not.toMatch(/\s/);
    }
  });
});
