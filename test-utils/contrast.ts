/**
 * WCAG 2.1 relative-luminance contrast, for the palette fence.
 *
 * Hex only — every colour this fence checks is a text or ink token, and all of
 * those are opaque hexes. The alpha tokens (lines, fills, scrims) are not
 * checked: a contrast number for a translucent value is meaningless without
 * knowing what sits behind it.
 */

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`contrastRatio: expected an opaque hex, got "${hex}"`);
  }
  const r = channel(parseInt(h.slice(0, 2), 16));
  const g = channel(parseInt(h.slice(2, 4), 16));
  const b = channel(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio between two opaque hex colours, 1:1 to 21:1. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
