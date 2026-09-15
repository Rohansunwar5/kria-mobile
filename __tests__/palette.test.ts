import { dark, light, PALETTES } from '../src/lib/theme/palette';
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

  // Added in fix round 1: ten literals across Task 3's eight target files had
  // no token. Values are byte-for-byte from the coordinator's table.
  it('covers the keyline, handle, tint, scrim and shadow literals Task 3 needs', () => {
    expect(dark.keyline).toBe('rgba(255,255,255,0.16)');
    expect(dark.keylineStrong).toBe('rgba(255,255,255,0.22)');
    expect(dark.handle).toBe('rgba(255,255,255,0.20)');
    expect(dark.mutedTint).toBe('rgba(255,255,255,0.28)');
    expect(dark.brandTint).toBe('rgba(249,115,22,0.12)');
    expect(dark.auctionLine).toBe('rgba(250,76,147,0.45)');
    expect(dark.failLine).toBe('rgba(255,68,56,0.4)');
    expect(dark.scrim).toBe('rgba(11,11,11,0.72)');
    expect(dark.shadow).toBe('#000');
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

  // An accent is legible as text on ink but not on paper: #F97316 on #FAFAF8
  // is 2.68:1. The ink tokens are the light palette's answer, and in dark they
  // are byte-equal to their accent so this layer stays a no-op until light
  // exists. If one of these ever drifts in dark, a screen changed appearance.
  it('gives every accent an ink twin, byte-equal in dark', () => {
    expect(dark.brandInk).toBe(dark.brand);
    expect(dark.openInk).toBe(dark.open);
    expect(dark.auctionInk).toBe(dark.auction);
    expect(dark.failInk).toBe(dark.fail);
  });
});

describe('light palette', () => {
  // Every value here is quoted from the approved artboard body-Light.html.
  // The user rejected an invented light palette once already; these are not
  // to be re-derived or "improved" without a new artboard.
  it('uses the approved paper, surface and ink', () => {
    expect(light.bg).toBe('#FAFAF8');
    expect(light.surface).toBe('#FFFFFF');
    expect(light.text).toBe('#0B0B0B');
  });

  it('keeps the four text tiers a closed set', () => {
    expect(light.textBody).toBe('#454545');
    expect(light.textMeta).toBe('#6B6B6B');
    expect(light.textFaint).toBe('#8A8A8A');
  });

  // Dark lays white over ink; light lays ink over paper, at the SAME alpha
  // rungs. That symmetry is the palette's structure, not a coincidence.
  it('mirrors the dark alpha ladder with ink instead of white', () => {
    expect(light.line).toBe('rgba(11,11,11,0.14)');
    expect(light.lineFaint).toBe('rgba(11,11,11,0.10)');
    expect(light.keyline).toBe('rgba(11,11,11,0.16)');
  });

  // The whole point of the ink tokens. Fills stay vivid so the brand keeps
  // its identity; only the ink darkens.
  it('keeps accents vivid as fills and darkens them as ink', () => {
    expect(light.brand).toBe(dark.brand);
    expect(light.auction).toBe(dark.auction);
    expect(light.brandInk).toBe('#b24b04');
    // Darkened past the artboard's own #248430: __tests__/paletteFences.test.ts
    // checks every ink against surfaceAlt as well as bg/surface, and #248430
    // is only 4.20:1 on surfaceAlt (#F1F1EF) — a real AA failure. #1c7e2a is
    // the same oklch hue/chroma, just darker, and clears 4.5:1 on all three
    // surfaces (see src/lib/theme/palette.ts's docblock for the ratios).
    expect(light.openInk).toBe('#1c7e2a');
    expect(light.auctionInk).toBe('#b0416b');
    expect(light.failInk).toBe('#b54439');
  });

  // Dark ink on a bright fill reads on either ground, so these do not move.
  it('leaves on-accent ink and the shadow alone', () => {
    expect(light.onBrand).toBe(dark.onBrand);
    expect(light.onOpen).toBe(dark.onOpen);
    expect(light.onDark).toBe('#FFFFFF');
    expect(light.shadow).toBe(dark.shadow);
  });

  // In dark the ladder climbs away from the background (#0B0B0B -> #151515 ->
  // #1E1E1E). Light cannot climb: surface is already #FFFFFF. So surfaceAlt
  // steps DOWN into grey. Applying the alpha rule here instead would give an
  // inset lighter than the card holding it.
  it('inverts the surface ladder, because light cannot climb past white', () => {
    expect(light.surfaceAlt).toBe('#F1F1EF');
  });

  it('registers both palettes', () => {
    expect(PALETTES.dark).toBe(dark);
    expect(PALETTES.light).toBe(light);
  });
});
