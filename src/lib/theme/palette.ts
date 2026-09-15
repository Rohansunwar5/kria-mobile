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
 *   - `brand` vs `brandInk` (and the three matching pairs) — byte-equal today
 *     and NOT redundant. `brand` is a fill: a chip, a button, the 4px card
 *     edge, with `onBrand` ink riding on top. `brandInk` is the accent used
 *     as text or an icon directly on the page ground. On `#0B0B0B` the two
 *     can be one value; on `#FAFAF8` they cannot, because `#F97316` as text
 *     on paper is 2.68:1 and fails. Merging the pair is the same mistake as
 *     merging `bg` with `onBrand`, and it fails just as silently.
 *
 * The three accents (`brand` / `auction` / `open`) are derived, not picked:
 * `oklch(0.70 0.19 h)` with only the hue rotated (brand 46, auction 350,
 * open 145) so all three carry equal lightness and chroma and none shouts
 * beside the others. `fail` is the one accent without a hue in that rotation
 * (see DESIGN.md §2). If a future palette or a new accent is added, derive it
 * the same way rather than eyeballing a hex.
 *
 * `handle` and `mutedTint` are deliberately not named `line*`. They are fills
 * applied to a shape or a glyph (a grab handle, a dead nav slot) rather than
 * borders, and giving them a `line` name would mislead the next reader into
 * reaching for them as a border colour.
 *
 * `brandTint` is not `brandSoft`. The `Soft`/`Faint` suffixes already mean
 * "the next rung down" within the `fill` and `line` families; reusing that
 * suffix on a different base colour would imply a ladder of brand alpha steps
 * that does not exist — there is exactly one brand tint.
 *
 * `shadow` (`#000`) is the same literal in every palette this file will ever
 * register. A drop shadow is black in both a dark and a light theme, so it is
 * not actually theme-aware — it still gets a token rather than a carve-out in
 * Task 4's colour-literal fence, because one token that never varies is less
 * machinery than an exception rule. Do not "fix" this into a theme-varying
 * value; it is supposed to stay `#000` everywhere.
 *
 * DESIGN.md §2 defines exactly four text tiers as a closed set — `#FFFFFF`,
 * `#d4d4d4` (`textBody`), `#a3a3a3` (`textMeta`), `#7d7d7d` (`textFaint`).
 * Two greys found in the tree, `#bdbdbd` and `#8a8a8a`, sit between those
 * tiers and are drift, not a fifth and sixth tier — they deliberately have no
 * token here. Task 3 snaps them to the nearest tier instead (`#bdbdbd` →
 * `textBody`, `#8a8a8a` → `textFaint`) rather than this file canonising a
 * six-tier ramp the design system never sanctioned, which would also double
 * what every future palette has to define.
 */

export type ThemeName = 'dark' | 'light';

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
  /** The brand accent as INK (text, icons) rather than a fill. Darkens under light. */
  brandInk: string;
  /** The open accent as ink rather than a fill. Darkens under light. */
  openInk: string;
  /** The auction accent as ink rather than a fill. Darkens under light. */
  auctionInk: string;
  /** The fail accent as ink rather than a fill. Darkens under light. */
  failInk: string;
  /** Ink that rides on the brand accent fill. */
  onBrand: string;
  /** Ink that rides on the open accent fill. */
  onOpen: string;
  /** Ink that rides on the auction accent fill. */
  onAuction: string;
  /** Ink that rides on the fail accent fill. */
  onFail: string;
  /** The keyline on chips and option tiles. */
  keyline: string;
  /** A heavier keyline (outline buttons). */
  keylineStrong: string;
  /** The filter sheet's grab handle — a fill, not a border. */
  handle: string;
  /** A disabled/pending glyph, e.g. the nav's dead slots — a fill, not a border. */
  mutedTint: string;
  /** Brand at low alpha as a selected background. */
  brandTint: string;
  /** Auction at alpha as a card border. */
  auctionLine: string;
  /** Fail at alpha as a card border (the destructive-row emphasis on profile). */
  failLine: string;
  /** The modal backdrop. */
  scrim: string;
  /** Drop shadow — black in every palette; see docblock. */
  shadow: string;
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
  brandInk: '#F97316',
  openInk: '#16C46A',
  auctionInk: '#FA4C93',
  failInk: '#FF4438',
  onBrand: '#0B0B0B',
  onOpen: '#06240F',
  onAuction: '#240614',
  onFail: '#2A0703',
  keyline: 'rgba(255,255,255,0.16)',
  keylineStrong: 'rgba(255,255,255,0.22)',
  handle: 'rgba(255,255,255,0.20)',
  mutedTint: 'rgba(255,255,255,0.28)',
  brandTint: 'rgba(249,115,22,0.12)',
  auctionLine: 'rgba(250,76,147,0.45)',
  failLine: 'rgba(255,68,56,0.4)',
  scrim: 'rgba(11,11,11,0.72)',
  shadow: '#000',
};

/**
 * Quoted from the approved artboard `docs/design-canvas/home-portals/body-Light.html`.
 * The user rejected an earlier invented light palette; build from the artboard,
 * never by inverting dark.
 *
 * Three structural facts, each of which fails silently if "simplified":
 *
 *   - The alpha ladder is dark's, with ink swapped for white at the SAME rungs
 *     (0.10 / 0.12 / 0.14 / 0.16 / 0.20 / 0.22 / 0.28). Dark lays white over
 *     ink; light lays ink over paper.
 *   - `surfaceAlt` is the one token that does NOT follow that rule. In dark the
 *     ladder climbs away from the background (#0B0B0B -> #151515 -> #1E1E1E).
 *     Light cannot climb — `surface` is already #FFFFFF — so `surfaceAlt` steps
 *     DOWN into a tinted grey. Deriving it by the alpha rule produces an inset
 *     lighter than the card containing it.
 *   - The accents keep their vivid values as FILLS and darken only as INK. The
 *     four ink values sit at oklch L=0.540 C=0.150 with the hue preserved,
 *     which is the transform measured off the artboard's own #b24b04 and
 *     #248430 rather than a rule invented here. `brandInk` is the artboard's
 *     literal value; re-deriving `openInk` from the rule alone gives #008641
 *     at 4.48:1, which fails the 4.5 floor that #248430 clears. Approved
 *     beats recomputed. `auctionInk` and `failInk` have no artboard value and
 *     ARE the rule's output.
 *
 *     `openInk` is darker than the artboard's #248430: `__tests__/paletteFences.test.ts`
 *     checks every ink against `surfaceAlt` as well as `bg`/`surface` (a nested
 *     tile, not just the page and its cards, is a real call site), and #248430
 *     is only 4.20:1 on `surfaceAlt` (#F1F1EF) — a real AA failure the
 *     artboard's own review never had a nested-tile case to catch. `#1c7e2a`
 *     is the same oklch hue (144.98°) and chroma (0.1496) at L=0.5214 instead
 *     of 0.5399 — darkened just enough to clear 4.5:1 on `surfaceAlt`
 *     (4.57:1), and it still clears both `bg` (4.94:1) and `surface` (5.16:1)
 *     with more room than before. Do not "fix" this back to #248430; that
 *     reintroduces the surfaceAlt failure.
 *
 * NOT YET A TOKEN — the heavy call-to-action block.
 *
 * `FeaturedTournament.tsx` draws a full-width CTA slab. The dark artboard
 * fills it with `brand` and inks it with `onBrand`; the LIGHT artboard fills
 * it with ink (`#0B0B0B`) and inks it white, because "a burnt-orange slab on
 * paper reads as flooded ink; black reads as print". So the roles swap
 * between palettes and `brand`/`onBrand` cannot express it.
 *
 * It wants a `slab` / `onSlab` pair:
 *     dark  -> slab #F97316, onSlab #0B0B0B
 *     light -> slab #0B0B0B, onSlab #FFFFFF
 *
 * Deliberately NOT added here: it is migrated where the call sites are in
 * front of someone, not this batch. Add the pair there instead. Until then,
 * do not let the mechanical brand/onBrand rule touch this shape.
 *
 * This previously said "there is exactly one call site today" — wrong by 7x.
 * The same full-bleed brand bar with near-black ink also appears in at least
 * `src/app/checkout/[tournamentId]/[categoryId].tsx`,
 * `src/app/cricket/leaderboard/[categoryId].tsx`,
 * `src/app/cricket/my-stats/[registrationId].tsx`,
 * `src/app/leaderboard/[categoryId].tsx`, `src/app/team/[teamId].tsx`,
 * `src/app/profile/invoices.tsx` and `src/app/cricket/[matchId]/balls.tsx` —
 * 8 sites total, measured by grep, not estimated. That also means the
 * decision now spans two future batches, not one: the tournament-screens
 * batch (checkout, leaderboard, team, invoices, FeaturedTournament) and the
 * cricket-scoring batch (the three `cricket/...` screens). Whichever batch
 * lands first should add `slab`/`onSlab` once, not each batch guessing
 * whether the other already did.
 */
export const light: Palette = {
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F1EF',
  fill: 'rgba(11,11,11,0.075)',
  fillSoft: 'rgba(11,11,11,0.045)',
  line: 'rgba(11,11,11,0.14)',
  lineSoft: 'rgba(11,11,11,0.12)',
  lineFaint: 'rgba(11,11,11,0.10)',
  text: '#0B0B0B',
  textBody: '#454545',
  textMeta: '#6B6B6B',
  textFaint: '#8A8A8A',
  onDark: '#FFFFFF',
  brand: '#F97316',
  auction: '#FA4C93',
  open: '#16C46A',
  fail: '#FF4438',
  brandInk: '#b24b04',
  openInk: '#1c7e2a',
  auctionInk: '#b0416b',
  failInk: '#b54439',
  onBrand: '#0B0B0B',
  onOpen: '#06240F',
  onAuction: '#240614',
  onFail: '#2A0703',
  keyline: 'rgba(11,11,11,0.16)',
  keylineStrong: 'rgba(11,11,11,0.22)',
  handle: 'rgba(11,11,11,0.20)',
  mutedTint: 'rgba(11,11,11,0.28)',
  brandTint: 'rgba(249,115,22,0.12)',
  auctionLine: 'rgba(250,76,147,0.45)',
  failLine: 'rgba(255,68,56,0.4)',
  scrim: 'rgba(11,11,11,0.72)',
  shadow: '#000',
};

export const PALETTES: Record<ThemeName, Palette> = {
  dark,
  light,
};
