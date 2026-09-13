/**
 * Semantic colour tokens.
 *
 * This is the vocabulary a future light palette (and any theme provider) is
 * written against. Every dark value below is copied verbatim from the literal
 * it replaces in the tree today (see DESIGN.md §2 and the legacy `colors`
 * object in `src/lib/theme.ts`) — nothing here is rounded, re-derived, or
 * re-cased. Zero visual change is the point of this file; `__tests__/palette.test.ts`
 * asserts every value byte-for-byte.
 *
 * Two pairs of tokens are equal today and MUST stay separate tokens. Do not
 * "simplify" either pair by merging it into one — that is exactly the mistake
 * this file exists to prevent, and it fails silently (nothing breaks until
 * someone ships a light palette and half the screen goes the wrong colour).
 *
 *   - `bg` vs `onBrand` — both `#0B0B0B` today. `bg` is the app background;
 *     `onBrand` is the ink that sits on a bright accent fill (a solid-fill
 *     status pill, a brand button label). Under a light palette `bg` becomes
 *     paper while `onBrand` stays near-black, because dark ink on a bright
 *     accent still reads on a light background — the two tokens diverge the
 *     moment a second palette exists. `onOpen`, `onAuction` and `onFail` are
 *     the same idea, one ink per accent, because the accents are not
 *     interchangeable (see below).
 *
 *   - `text` vs `onDark` — both `#FFFFFF` today. `text` is primary body text,
 *     which flips to near-black once the background is paper. `onDark` is
 *     text sitting on an ink-coloured block (e.g. a dark chip on a light
 *     screen) and stays white regardless of the active palette.
 *
 * The three accents (`brand` / `auction` / `open`) are derived, not picked:
 * `oklch(0.70 0.19 h)` with only the hue rotated (brand 46, auction 350,
 * open 145) so all three carry equal lightness and chroma and none shouts
 * beside the others. `fail` is the one accent without a hue in that rotation
 * (see DESIGN.md §2). If a future palette or a new accent is added, derive it
 * the same way rather than eyeballing a hex.
 */

export type ThemeName = 'dark';

export interface Palette {
  /** App background. */
  bg: string;
  /** Blocks, cards, rows. */
  surface: string;
  /** Insets, nested tiles. */
  surfaceAlt: string;
  /** Subtle raised fill (icon buttons). */
  fill: string;
  /** The faintest wash. */
  fillSoft: string;
  /** The standard 1.5px border. */
  line: string;
  /** A divider inside a block. */
  lineSoft: string;
  /** The faintest rule. */
  lineFaint: string;
  /** Primary text. */
  text: string;
  /** Body copy. */
  textBody: string;
  /** Meta text. */
  textMeta: string;
  /** Labels, disabled. */
  textFaint: string;
  /** Text on an ink block — stays white in light mode. */
  onDark: string;
  /** Live, primary action, the brand itself. */
  brand: string;
  /** The auction, and "you" in any list. */
  auction: string;
  /** Entry open, won, money received. */
  open: string;
  /** Failed payment, lost, destructive. */
  fail: string;
  /** Ink that rides on the brand accent fill. */
  onBrand: string;
  /** Ink that rides on the open accent fill. */
  onOpen: string;
  /** Ink that rides on the auction accent fill. */
  onAuction: string;
  /** Ink that rides on the fail accent fill. */
  onFail: string;
}

export const dark: Palette = {
  bg: '#0B0B0B',
  surface: '#151515',
  surfaceAlt: '#1E1E1E',
  fill: 'rgba(255,255,255,0.07)',
  fillSoft: 'rgba(255,255,255,0.04)',
  line: 'rgba(255,255,255,0.14)',
  lineSoft: 'rgba(255,255,255,0.12)',
  lineFaint: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textBody: '#d4d4d4',
  textMeta: '#a3a3a3',
  textFaint: '#7d7d7d',
  onDark: '#FFFFFF',
  brand: '#F97316',
  auction: '#FA4C93',
  open: '#16C46A',
  fail: '#FF4438',
  onBrand: '#0B0B0B',
  onOpen: '#06240F',
  onAuction: '#240614',
  onFail: '#2A0703',
};

export const PALETTES: Record<ThemeName, Palette> = {
  dark,
};
