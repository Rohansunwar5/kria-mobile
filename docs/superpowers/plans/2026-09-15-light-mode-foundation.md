# Light Mode — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a complete, tested light palette plus a three-state appearance setting that stays hidden from users until the colour-literal migration finishes.

**Architecture:** `palette.ts` gains four ink tokens and a second `Palette` object. `ThemeProvider` gains a persisted `'system' | 'light' | 'dark'` mode resolved through React Native's `useColorScheme()`, while its context value stays a plain `Palette` so no consumer and no existing test changes. Two new fences guard the palette: token-set completeness and per-class contrast floors.

**Tech Stack:** React Native 0.86.3, React 19.2.3, Expo SDK 57, TypeScript 6.0.3 (strict), jest + @testing-library/react-native, expo-secure-store.

**Spec:** `docs/superpowers/specs/2026-09-15-mobile-light-mode-design.md` (in the **umbrella** repo, one level above `mobile/`)

## Global Constraints

- **This plan touches `mobile/` only.** No `server/` change, no `client/` change.
- **Four independent git repos share this folder.** `cd` into `mobile/` explicitly or use `git -C`. The shell's working directory drifts silently between commands.
- **TypeScript strict mode is ON.** `any` is banned on new lines.
- **The mobile `tsc` baseline is ZERO** as of 2026-09-15. Any error `npx tsc --noEmit` prints is yours.
- **Gates after every task:** `npx tsc --noEmit` (clean), `npx jest` (872 passing before this plan starts), `npx expo config --json` (exits 0).
- **Never run `npm test` in `server/`** and never run `npm run dev` in `server/` — its `.env` points at the production cluster.
- 2-space indent, single quotes.
- **Do not edit pre-existing tests.** If one fails, the change altered behaviour.
- **`__tests__/antonLeading.test.ts` and `__tests__/colourLiterals.test.ts` are fences.** They may gain entries; they may never be weakened.
- **Never remove an entry from `MIGRATED`** to make a failing file pass.
- **Mutate the code and watch each new fence fail before believing it.** Two fences written in an earlier session could not have failed.
- Commit at the end of each task, not between steps.

---

### Task 1: Add the four ink tokens to the dark palette

Ink tokens first, in dark only, where every value is byte-equal to its accent. This is a pure no-op visually and keeps the `palette.ts` zero-visual-change guarantee intact before light exists to complicate it.

**Files:**
- Modify: `src/lib/theme/palette.ts`
- Test: `__tests__/palette.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Palette` interface with `brandInk: string`, `openInk: string`, `auctionInk: string`, `failInk: string`. `dark.brandInk === dark.brand`, and likewise for the other three.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/palette.test.ts` inside the existing `describe('dark palette', ...)`:

```typescript
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
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd mobile && npx jest __tests__/palette.test.ts -t "ink twin"
```

Expected: FAIL. `dark.brandInk` is `undefined`, so `expect(undefined).toBe('#F97316')`.

- [ ] **Step 3: Add the tokens to the interface**

In `src/lib/theme/palette.ts`, inside `interface Palette`, directly after the `fail` entry:

```typescript
  /** The brand accent as INK (text, icons) rather than a fill. Darkens under light. */
  brandInk: string;
  /** The open accent as ink rather than a fill. Darkens under light. */
  openInk: string;
  /** The auction accent as ink rather than a fill. Darkens under light. */
  auctionInk: string;
  /** The fail accent as ink rather than a fill. Darkens under light. */
  failInk: string;
```

- [ ] **Step 4: Add the values to `dark`**

In the `dark` object, directly after `fail: '#FF4438',`:

```typescript
  brandInk: '#F97316',
  openInk: '#16C46A',
  auctionInk: '#FA4C93',
  failInk: '#FF4438',
```

- [ ] **Step 5: Document why the pair exists**

Add to the `palette.ts` docblock, after the paragraph that explains `text` vs `onDark`:

```
 *   - `brand` vs `brandInk` (and the three matching pairs) — byte-equal today
 *     and NOT redundant. `brand` is a fill: a chip, a button, the 4px card
 *     edge, with `onBrand` ink riding on top. `brandInk` is the accent used
 *     as text or an icon directly on the page ground. On `#0B0B0B` the two
 *     can be one value; on `#FAFAF8` they cannot, because `#F97316` as text
 *     on paper is 2.68:1 and fails. Merging the pair is the same mistake as
 *     merging `bg` with `onBrand`, and it fails just as silently.
```

- [ ] **Step 6: Run the gates**

```bash
cd mobile && npx jest __tests__/palette.test.ts && npx tsc --noEmit
```

Expected: palette suite PASSES, `tsc` prints nothing.

- [ ] **Step 7: Commit**

```bash
cd mobile
git add src/lib/theme/palette.ts __tests__/palette.test.ts
git commit -m "Give every accent an ink twin, byte-equal in dark

An accent works as text on ink but not on paper — #F97316 on #FAFAF8 is
2.68:1. One token cannot be both a fill and ink once a light palette
exists. Adding the twins now, byte-equal, keeps this a no-op.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Add the light palette

**Files:**
- Modify: `src/lib/theme/palette.ts`
- Test: `__tests__/palette.test.ts`

**Interfaces:**
- Consumes: the `Palette` interface from Task 1.
- Produces: `export const light: Palette`, `ThemeName = 'dark' | 'light'`, and `PALETTES` carrying both keys.

**Values are fixed by the spec — do not re-derive or round them.** They come from the approved artboard `docs/design-canvas/home-portals/body-Light.html`; an earlier invented palette was rejected by the user.

- [ ] **Step 1: Write the failing test**

Append a new `describe` block to `__tests__/palette.test.ts`:

```typescript
import { dark, light, PALETTES } from '../src/lib/theme/palette';

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
    expect(light.openInk).toBe('#248430');
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
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd mobile && npx jest __tests__/palette.test.ts -t "light palette"
```

Expected: FAIL to compile/import — `light` is not exported from `palette.ts`.

- [ ] **Step 3: Widen `ThemeName`**

In `src/lib/theme/palette.ts`, replace:

```typescript
export type ThemeName = 'dark';
```

with:

```typescript
export type ThemeName = 'dark' | 'light';
```

- [ ] **Step 4: Add the `light` palette**

Directly after the `dark` object:

```typescript
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
 *     #248430 rather than a rule invented here. `brandInk` and `openInk` are
 *     the artboard's literal values; re-deriving `openInk` from the rule alone
 *     gives #008641 at 4.48:1, which fails the 4.5 floor that #248430 clears.
 *     Approved beats recomputed. `auctionInk` and `failInk` have no artboard
 *     value and ARE the rule's output.
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
  openInk: '#248430',
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
```

- [ ] **Step 5: Register it**

Replace the `PALETTES` constant:

```typescript
export const PALETTES: Record<ThemeName, Palette> = {
  dark,
  light,
};
```

- [ ] **Step 6: Record the heavy-block finding — do NOT add a token for it yet**

Spec §4.2 leaves one question open: an ink block on paper has no fill token. **It was
investigated while writing this plan, and the answer is that it is real but does not belong
to this batch.** Record it so it is not rediscovered, then move on.

The evidence: `src/components/home/FeaturedTournament.tsx:108-120` draws its call-to-action
block as `backgroundColor: '#F97316'` with `color: '#0B0B0B'`. The dark artboard agrees
(`.blkb { background:#F97316; color:#0B0B0B }`). **The light artboard deliberately does not** —
it draws the same block `background:#0B0B0B; color:#fff`, and comments: *"The heavy block
goes ink, not accent. A burnt-orange slab on paper reads as flooded ink; black reads as
print."*

**This means the mechanical migration rule is WRONG at this one site.** Mapping
`backgroundColor: '#F97316'` to `theme.brand` and `color: '#0B0B0B'` to `theme.onBrand`
gives a vivid orange slab with black text under light — precisely the result the artboard
rejects. It is a semantic role that flips fill and ink between palettes, not a value swap.

Add this to the `palette.ts` docblock, at the end:

```
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
 * Deliberately NOT added here: there is exactly one call site today, and it
 * is migrated in the tournament-screens batch, not this one. Add the pair in
 * that batch, where the call site is in front of you. Until then, do not let
 * the mechanical brand/onBrand rule touch that block.
```

**Do not add `slab`/`onSlab` to the interface in this task.** One call site, and it is not in
this batch — adding it now means an unused token pair that the completeness fence will
happily carry and nobody will remember to wire up.

- [ ] **Step 7: Run the gates**

```bash
cd mobile && npx jest __tests__/palette.test.ts && npx tsc --noEmit
```

Expected: both `describe` blocks PASS, `tsc` prints nothing.

- [ ] **Step 8: Commit**

```bash
cd mobile
git add src/lib/theme/palette.ts __tests__/palette.test.ts
git commit -m "Add the approved light palette

Quoted from body-Light.html, which the user approved after rejecting an
invented one. The alpha ladder mirrors dark at the same rungs with ink
for white; surfaceAlt is the exception and steps down into grey, because
light cannot climb past #FFFFFF.

auctionInk and failInk have no artboard value and are derived at the
transform measured off the artboard's own two inks: oklch L=0.540
C=0.150, hue preserved. Both need a human look before shipping.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Fence the palettes — completeness and contrast

Two fences. Completeness catches the silent one: a token missing from `light` is `undefined`, which React Native renders as transparent rather than throwing.

**Files:**
- Create: `test-utils/contrast.ts`
- Create: `__tests__/paletteFences.test.ts`

**Interfaces:**
- Consumes: `dark`, `light`, `PALETTES` from `src/lib/theme/palette`.
- Produces: `contrastRatio(hex1: string, hex2: string): number` from `test-utils/contrast.ts`.

**Why `test-utils/` and not `__tests__/`:** jest's default `testMatch` treats every `.ts` under `__tests__/` as a suite, and a helper there fails the run with "must contain at least one test". `test-utils/colourLiterals.ts` already lives there for this reason.

- [ ] **Step 1: Write the contrast helper**

Create `test-utils/contrast.ts`:

```typescript
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
```

- [ ] **Step 2: Write the failing fence**

Create `__tests__/paletteFences.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run it and confirm it PASSES**

```bash
cd mobile && npx jest __tests__/paletteFences.test.ts
```

Expected: PASS. Tasks 1 and 2 already satisfy both fences — this one is written green.

- [ ] **Step 4: Prove the fence can actually fail — do not skip this**

A fence that cannot fail is worse than no fence; this project has shipped three of them. Mutate the code, watch red, then revert.

```bash
cd mobile
# Mutation A: break completeness.
sed -i "s/^  failInk: '#b54439',$//" src/lib/theme/palette.ts
npx jest __tests__/paletteFences.test.ts
```

Expected: FAIL on "defines exactly the same token set", naming `failInk`.

```bash
git checkout src/lib/theme/palette.ts
# Mutation B: break contrast — the original 2.68:1 bug this all exists for.
sed -i "s/^  brandInk: '#b24b04',$/  brandInk: '#F97316',/" src/lib/theme/palette.ts
npx jest __tests__/paletteFences.test.ts
```

Expected: FAIL on `brandInk clears 4.5:1`, reporting roughly `2.9`.

```bash
git checkout src/lib/theme/palette.ts
npx jest __tests__/paletteFences.test.ts
```

Expected: PASS again. **If either mutation did not fail, the fence is broken — fix it before continuing.**

- [ ] **Step 5: Run the gates**

```bash
cd mobile && npx jest && npx tsc --noEmit
```

Expected: 872 + the new fence tests pass; `tsc` prints nothing.

- [ ] **Step 6: Commit**

```bash
cd mobile
git add test-utils/contrast.ts __tests__/paletteFences.test.ts
git commit -m "Fence the palettes on token completeness and contrast

A token present in dark and missing from light is undefined, which React
Native renders as transparent — it fails silently and would ship. The
completeness fence catches that; the contrast fence stops a future edit
reintroducing the 2.68:1 accent-as-text problem the ink tokens exist for.

Floors are a table rather than copied assertions. textFaint sits at 3.0,
not 4.5, because palette.ts documents it as the labels/disabled tier and
light's approved #8A8A8A is 3.30:1 — a blanket 4.5 fence would fail the
artboard the user signed off.

Both mutations verified failing before commit.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Persist and resolve the theme mode

The provider gains mode state. Its context value stays a plain `Palette`, so no consumer changes and none of the ~70 provider-less test files need re-wrapping.

**Files:**
- Modify: `src/lib/theme/ThemeProvider.tsx`
- Test: `__tests__/themeProvider.test.tsx`

**Interfaces:**
- Consumes: `PALETTES`, `dark`, `light`, `Palette`, `ThemeName` from `./palette`; `getItem`, `setItem` from `@/lib/secureStore`.
- Produces:
  - `type ThemeMode = 'system' | 'light' | 'dark'`
  - `useTheme(): Palette` — unchanged signature
  - `useThemeMode(): { mode: ThemeMode; setMode: (m: ThemeMode) => void; resolved: ThemeName }`
  - `THEME_MODE_KEY = 'kria.theme.mode'`

- [ ] **Step 1: Write the failing test**

Create `__tests__/themeProvider.test.tsx`:

```typescript
import { Text } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import { ThemeProvider, useTheme, useThemeMode, THEME_MODE_KEY } from '../src/lib/theme/ThemeProvider';
import { dark, light } from '../src/lib/theme/palette';
import * as secureStore from '../src/lib/secureStore';

let systemScheme: 'light' | 'dark' | null = 'dark';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => systemScheme,
}));

function Probe() {
  const theme = useTheme();
  const { mode, resolved } = useThemeMode();
  return <Text testID="probe">{`${theme.bg}|${mode}|${resolved}`}</Text>;
}

function probe() {
  return screen.getByTestId('probe').props.children as string;
}

beforeEach(() => {
  systemScheme = 'dark';
  jest.restoreAllMocks();
  jest.spyOn(secureStore, 'getItem').mockResolvedValue(null);
  jest.spyOn(secureStore, 'setItem').mockResolvedValue();
});

describe('ThemeProvider', () => {
  // The app has always been dark and the light theme has never been on a
  // device. Defaulting to `system` would flip every user on a light phone to
  // an unverified UI at update time.
  it('defaults to dark, not to the system scheme', async () => {
    systemScheme = 'light';
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => {});
    expect(probe()).toBe(`${dark.bg}|dark|dark`);
  });

  it('restores a persisted mode on mount', async () => {
    jest.spyOn(secureStore, 'getItem').mockResolvedValue('light');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => {});
    expect(probe()).toBe(`${light.bg}|light|light`);
  });

  it('follows the system scheme when the mode is system', async () => {
    systemScheme = 'light';
    jest.spyOn(secureStore, 'getItem').mockResolvedValue('system');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => {});
    expect(probe()).toBe(`${light.bg}|system|light`);
  });

  // useColorScheme returns null when the platform cannot say. Falling through
  // to light there would flip the app on a device that never asked for it.
  it('resolves system to dark when the platform reports nothing', async () => {
    systemScheme = null;
    jest.spyOn(secureStore, 'getItem').mockResolvedValue('system');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => {});
    expect(probe()).toBe(`${dark.bg}|system|dark`);
  });

  it('persists a mode change', async () => {
    const setItem = jest.spyOn(secureStore, 'setItem').mockResolvedValue();
    let setMode: (m: 'system' | 'light' | 'dark') => void = () => {};
    function Setter() {
      setMode = useThemeMode().setMode;
      return null;
    }
    render(<ThemeProvider><Setter /><Probe /></ThemeProvider>);
    await act(async () => {});
    await act(async () => { setMode('light'); });
    expect(probe()).toBe(`${light.bg}|light|light`);
    expect(setItem).toHaveBeenCalledWith(THEME_MODE_KEY, 'light');
  });

  // A corrupted or hand-edited store value must not brick the app.
  it('ignores an unrecognised persisted value', async () => {
    jest.spyOn(secureStore, 'getItem').mockResolvedValue('chartreuse');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => {});
    expect(probe()).toBe(`${dark.bg}|dark|dark`);
  });

  // ~70 existing test files render components with no provider. The context
  // default is the only reason they work, and it must keep working.
  it('serves dark to a consumer with no provider mounted', () => {
    render(<Probe />);
    expect(probe()).toBe(`${dark.bg}|dark|dark`);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd mobile && npx jest __tests__/themeProvider.test.tsx
```

Expected: FAIL — `useThemeMode` and `THEME_MODE_KEY` are not exported.

- [ ] **Step 3: Rewrite the provider**

Replace the whole body of `src/lib/theme/ThemeProvider.tsx`:

```typescript
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { PALETTES, dark, type Palette, type ThemeName } from './palette';
import { getItem, setItem } from '@/lib/secureStore';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODE_KEY = 'kria.theme.mode';

const MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

function isMode(value: string | null): value is ThemeMode {
  return value !== null && (MODES as readonly string[]).includes(value);
}

// The default value passed to createContext (rather than `null` with a
// runtime check) is what makes useTheme() work with no provider mounted at
// all: React only falls back to this default when a consumer has no matching
// Provider above it in the tree. That is deliberate, not a missing guard —
// the provider mounts once at the app root, but ~70 existing test files
// render components directly with no provider. Throwing on a missing provider
// would mean re-wrapping every one of those files to buy nothing.
const ThemeContext = createContext<Palette>(dark);

interface ModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolved: ThemeName;
}

const ModeContext = createContext<ModeContextValue>({
  mode: 'dark',
  setMode: () => {},
  resolved: 'dark',
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Dark, not `system`, and not a "still loading" state. The app has been dark
  // its whole life, so dark is what every user already sees — starting there
  // means a restored preference can only ever change the screen to something
  // the user explicitly chose. Starting at `system` would flash the wrong
  // theme on every launch for anyone whose phone disagrees with their choice.
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const system = useColorScheme();

  useEffect(() => {
    let cancelled = false;
    getItem(THEME_MODE_KEY)
      .then((stored) => {
        // An unrecognised value (corrupted, hand-edited, or written by a
        // future version) falls through to the default rather than bricking
        // the app on a colour preference.
        if (!cancelled && isMode(stored)) setModeState(stored);
      })
      .catch(() => {
        // A keychain read can fail on a locked device. Dark is already the
        // state; there is nothing to recover and nothing worth surfacing.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // useColorScheme returns null when the platform cannot say. Falling through
  // to light there would flip the app on a device that never asked for it.
  const resolved: ThemeName = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;

  const modeValue = useMemo<ModeContextValue>(
    () => ({
      mode,
      resolved,
      setMode: (next: ThemeMode) => {
        setModeState(next);
        // Fire-and-forget: the UI must not wait on the keychain to repaint.
        // A failed write costs the preference next launch, not this one.
        void setItem(THEME_MODE_KEY, next).catch(() => {});
      },
    }),
    [mode, resolved],
  );

  const palette = useMemo(() => PALETTES[resolved], [resolved]);

  return (
    <ModeContext.Provider value={modeValue}>
      <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>
    </ModeContext.Provider>
  );
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}

export function useThemeMode(): ModeContextValue {
  return useContext(ModeContext);
}
```

- [ ] **Step 4: Re-export through the barrel**

**Every consumer imports from `@/lib/theme`, not from the provider directly** — 15 files do
`import { useTheme } from '@/lib/theme'`. `src/lib/theme.ts` is that barrel. Without this
step, Task 5's import does not resolve.

In `src/lib/theme.ts`, replace line 25-26:

```typescript
export { useTheme, ThemeProvider } from './theme/ThemeProvider';
export { dark } from './theme/palette';
```

with:

```typescript
export { useTheme, useThemeMode, ThemeProvider, THEME_MODE_KEY, type ThemeMode } from './theme/ThemeProvider';
export { dark, light, type Palette, type ThemeName } from './theme/palette';
```

- [ ] **Step 5: Check the `theme` prop is not still passed at the root**

The old signature took an optional `theme?: ThemeName` prop, which this removes.

```bash
cd mobile && grep -rn "<ThemeProvider" src/ __tests__/
```

If any call site passes `theme=`, delete that prop — mode now comes from state. `src/app/_layout.tsx:132` renders `<ThemeProvider>` with no prop and needs no change.

- [ ] **Step 6: Run the tests**

```bash
cd mobile && npx jest __tests__/themeProvider.test.tsx
```

Expected: all 7 PASS.

- [ ] **Step 7: Run the full gates — this task is the one that can break other suites**

```bash
cd mobile && npx jest && npx tsc --noEmit && npx expo config --json > /dev/null && echo CONFIG_OK
```

Expected: 872 + new tests pass, `tsc` silent, `CONFIG_OK` printed. **If a pre-existing suite fails, the provider changed behaviour — fix the provider, do not edit that test.**

- [ ] **Step 8: Commit**

```bash
cd mobile
git add src/lib/theme/ThemeProvider.tsx src/lib/theme.ts __tests__/themeProvider.test.tsx
git commit -m "Give the provider a persisted, system-aware theme mode

Three-state mode ('system' | 'light' | 'dark') persisted through the
existing secureStore wrapper — no new dependency. The palette context
value stays a plain Palette, so no consumer changes and none of the ~70
provider-less test files need re-wrapping.

Defaults to dark rather than system: the app has always been dark and the
light theme has never been on a device, so following the system out of
the box would flip every user on a light phone at update time.

useColorScheme returning null resolves to dark, and an unrecognised
persisted value falls through to the default rather than bricking the app.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Migrate `settings.tsx` onto tokens and add the hidden Appearance control

The toggle's host screen still holds colour literals, so it migrates in the same task that gives it the control — the migration is what lets the new section be written in tokens from the start.

**Files:**
- Modify: `src/app/profile/settings.tsx`
- Modify: `test-utils/colourLiterals.ts`
- Create: `src/components/settings/AppearanceSection.tsx`
- Test: `__tests__/appearanceSection.test.tsx`

**Interfaces:**
- Consumes: `useTheme`, `useThemeMode` and `ThemeMode` — all from the barrel `@/lib/theme`, which Task 4 Step 4 widened.
- Produces: `SHOW_APPEARANCE_CONTROL: boolean` and `default function AppearanceSection()` from `src/components/settings/AppearanceSection.tsx`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/appearanceSection.test.tsx`:

```typescript
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import AppearanceSection, { SHOW_APPEARANCE_CONTROL } from '../src/components/settings/AppearanceSection';
import { ThemeProvider } from '../src/lib/theme/ThemeProvider';
import * as secureStore from '../src/lib/secureStore';

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(secureStore, 'getItem').mockResolvedValue(null);
  jest.spyOn(secureStore, 'setItem').mockResolvedValue();
});

async function renderSection() {
  const utils = render(<ThemeProvider><AppearanceSection /></ThemeProvider>);
  await act(async () => {});
  return utils;
}

describe('AppearanceSection', () => {
  // The toggle ships hidden. A half-migrated screen in light mode draws
  // hardcoded near-black cards on paper, which reads as broken rather than
  // partial — so users must not reach light mode until migration completes.
  // This asserts the SHIPPED value; flipping it is a deliberate release step.
  it('is hidden while the colour-literal migration is incomplete', () => {
    expect(SHOW_APPEARANCE_CONTROL).toBe(false);
  });

  it('renders nothing at all while hidden', async () => {
    await renderSection();
    expect(screen.queryByLabelText('System')).toBeNull();
    // getByText, not getByLabelText: the heading is a Text node with no
    // accessibility label, so a label query could never have matched it and
    // would have passed even with the section rendered.
    expect(screen.queryByText('Appearance')).toBeNull();
  });
});

// The control's behaviour is tested by rendering it directly, so these cover
// real logic even while the section is gated off the settings screen.
describe('AppearanceSection, forced visible', () => {
  it('offers three modes and marks dark selected by default', async () => {
    render(<ThemeProvider><AppearanceSection forceVisible /></ThemeProvider>);
    await act(async () => {});
    expect(screen.getByLabelText('System')).toBeTruthy();
    expect(screen.getByLabelText('Light')).toBeTruthy();
    expect(screen.getByLabelText('Dark').props.accessibilityState.selected).toBe(true);
  });

  it('selects a mode and persists it', async () => {
    const setItem = jest.spyOn(secureStore, 'setItem').mockResolvedValue();
    render(<ThemeProvider><AppearanceSection forceVisible /></ThemeProvider>);
    await act(async () => {});
    await act(async () => { fireEvent.press(screen.getByLabelText('Light')); });
    expect(screen.getByLabelText('Light').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Dark').props.accessibilityState.selected).toBe(false);
    expect(setItem).toHaveBeenCalledWith('kria.theme.mode', 'light');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd mobile && npx jest __tests__/appearanceSection.test.tsx
```

Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the component**

Create `src/components/settings/AppearanceSection.tsx`:

```typescript
import { View, Text, Pressable } from 'react-native';
import { useTheme, useThemeMode, type ThemeMode } from '@/lib/theme';

/**
 * The single gate on light mode reaching users.
 *
 * Light mode is only correct on a screen whose colour literals have become
 * tokens. Until the migration finishes, a user who switched would see
 * hardcoded near-black cards on paper on every unmigrated screen — which
 * reads as broken, not as partial. Everything behind this flag is built,
 * tested and working; flipping it to `true` is the release step, and it
 * belongs in the commit that migrates the last file.
 */
export const SHOW_APPEARANCE_CONTROL = false;

const OPTIONS: ReadonlyArray<{ mode: ThemeMode; label: string; hint: string }> = [
  { mode: 'system', label: 'System', hint: 'Follow the phone' },
  { mode: 'light', label: 'Light', hint: 'Paper' },
  { mode: 'dark', label: 'Dark', hint: 'The default' },
];

export default function AppearanceSection({ forceVisible = false }: { forceVisible?: boolean }) {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();

  if (!SHOW_APPEARANCE_CONTROL && !forceVisible) return null;

  return (
    <View style={{ marginTop: 22 }}>
      <Text
        style={{
          fontFamily: 'SpaceMono_400Regular',
          fontSize: 9,
          letterSpacing: 0.1 * 9,
          textTransform: 'uppercase',
          color: theme.textFaint,
          marginBottom: 8,
        }}
      >
        Appearance
      </Text>
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: theme.line,
          overflow: 'hidden',
        }}
      >
        {OPTIONS.map((option, index) => {
          const selected = mode === option.mode;
          return (
            <Pressable
              key={option.mode}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => setMode(option.mode)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                minHeight: 52,
                borderTopWidth: index === 0 ? 0 : 1.5,
                borderTopColor: theme.lineFaint,
                backgroundColor: selected ? theme.brandTint : 'transparent',
              }}
            >
              <View>
                <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: theme.text }}>
                  {option.label}
                </Text>
                <Text
                  style={{
                    fontFamily: 'SpaceMono_400Regular',
                    fontSize: 9,
                    letterSpacing: 0.08 * 9,
                    textTransform: 'uppercase',
                    color: theme.textFaint,
                    marginTop: 4,
                  }}
                >
                  {option.hint}
                </Text>
              </View>
              {/* Colour is never the only signal — the selected row carries a
                  word, not just a tint. DESIGN.md §7. */}
              {selected ? (
                <Text
                  style={{
                    fontFamily: 'SpaceMono_700Bold',
                    fontSize: 9,
                    letterSpacing: 0.1 * 9,
                    textTransform: 'uppercase',
                    color: theme.brandInk,
                  }}
                >
                  On
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run the component tests**

```bash
cd mobile && npx jest __tests__/appearanceSection.test.tsx
```

Expected: all 4 PASS.

- [ ] **Step 5: Migrate `settings.tsx` to tokens and mount the section**

In `src/app/profile/settings.tsx`:

1. Add `import { useTheme } from '@/lib/theme';` and `import AppearanceSection from '@/components/settings/AppearanceSection';` to the imports. **Import from the barrel, never from `@/lib/theme/ThemeProvider`** — that is the convention in all 15 existing consumers.
2. Call `const theme = useTheme();` inside every component in the file that holds a colour literal — `Section`, `Row`, `Button`, the status line component, and the default export. Module-scope style constants that use a literal must become functions taking `theme`, matching the `LBL(theme)` idiom already used in `src/components/profile/CareerCard.tsx`.
3. Replace each literal with its token:

| Literal | Token |
|---|---|
| `'#fff'`, `'#FFFFFF'` | `theme.text` |
| `'#0B0B0B'` **as a `color` on a brand fill** | `theme.onBrand` |
| `'#0B0B0B'` **as a `backgroundColor`** | `theme.bg` |
| `'#151515'` | `theme.surface` |
| `'#1E1E1E'` | `theme.surfaceAlt` |
| `'#d4d4d4'` | `theme.textBody` |
| `'#a3a3a3'` | `theme.textMeta` |
| `'#7d7d7d'` | `theme.textFaint` |
| `'#F97316'` as `backgroundColor`/`borderColor` | `theme.brand` |
| `'#F97316'` as `color` | `theme.brandInk` |
| `'#16C46A'` as `color` | `theme.openInk` |
| `'#FF4438'` as `color` | `theme.failInk` |
| `'rgba(255,255,255,0.07)'` | `theme.fill` |
| `'rgba(255,255,255,0.14)'` | `theme.line` |
| `'rgba(255,255,255,0.12)'` | `theme.lineSoft` |
| `'rgba(255,255,255,0.10)'` | `theme.lineFaint` |
| `'rgba(255,255,255,0.16)'` | `theme.keyline` |

4. Render `<AppearanceSection />` inside the `ScrollView`, directly after the `Security` section.

- [ ] **Step 6: Confirm no literal survives**

```bash
cd mobile && grep -nE "['\"]#[0-9a-fA-F]{3,8}['\"]|['\"]rgba?\(|\bcolors\.(ink|panel2|panel|brand|auction|open|fail|line|white)\b|className=[\"'][^\"']*\b(bg|text|border|fill|stroke|from|to|via|ring|divide|placeholder|shadow|outline|accent|caret|decoration)-(ink|panel2|panel|brand|auction|open|fail|line|white|black|transparent)\b" src/app/profile/settings.tsx
```

Expected: **no output.** Any line printed is a literal still to convert.

**The character class covers both quote styles on purpose.** An earlier draft of this step
matched single quotes only, which would have silently passed over the two double-quoted
literals this very file contained (`"#F97316"` and `"#7d7d7d"` as icon `color` props). The
real fence in `test-utils/colourLiterals.ts` backreferences the quote character and is not
blind to them, so nothing would have shipped broken — but the check would have told you the
file was clean while it was not. Keep both quote styles in every batch that reuses this step.

**The grep also covers two channels that are not quoted colour literals at all**, added after
a whole-branch review found eight files wrongly marked `MIGRATED` because of them: member
access on the legacy hardcoded `colors` object in `src/lib/theme.ts` (`colors.white`,
`colors.brand`, ...), and colour-bearing NativeWind classnames (`bg-ink`, `text-white`, ...)
inside a `className` attribute. Neither is a quoted string containing a colour value, so the
first half of this grep — and `findColourLiterals` in the real fence — cannot see them. The
real fence's stronger check lives in `findLegacyColourUsages` (`test-utils/colourLiterals.ts`);
batches 2-6 must run both, not just the quoted-literal half, before adding a file to
`MIGRATED`.

- [ ] **Step 7: Add the file to the ratchet**

In `test-utils/colourLiterals.ts`, append to `MIGRATED`:

```typescript
  'src/app/profile/settings.tsx',
```

- [ ] **Step 8: Prove the ratchet is actually guarding it**

**Stash first.** `git checkout` would throw away the whole migration you just did, because
none of it is committed yet.

```bash
cd mobile
git stash push -- src/app/profile/settings.tsx
git stash apply                       # work back in the tree, and safe in the stash
sed -i "0,/color: theme.textFaint,/s//color: '#7d7d7d',/" src/app/profile/settings.tsx
npx jest __tests__/colourLiterals.test.ts
```

Expected: FAIL, naming `src/app/profile/settings.tsx` and the reintroduced `'#7d7d7d'`.

```bash
git checkout -- src/app/profile/settings.tsx   # drops only the mutation
git stash pop                                   # restores the migration
npx jest __tests__/colourLiterals.test.ts
```

Expected: PASS. **Do not commit until the fence has been seen failing.** If it stayed green,
the file never made it into `MIGRATED` and nothing is guarding it.

- [ ] **Step 9: Run the full gates**

```bash
cd mobile && npx jest && npx tsc --noEmit && npx expo config --json > /dev/null && echo CONFIG_OK
```

Expected: everything passes, `tsc` silent, `CONFIG_OK`.

- [ ] **Step 10: Commit**

```bash
cd mobile
git add src/components/settings/AppearanceSection.tsx __tests__/appearanceSection.test.tsx \
        src/app/profile/settings.tsx test-utils/colourLiterals.ts
git commit -m "Add the Appearance control, gated off, and migrate settings.tsx

Three-state System/Light/Dark, built and tested but behind
SHOW_APPEARANCE_CONTROL=false. Light mode is only correct on a screen
whose literals are tokens, so users must not reach it until the migration
finishes; flipping that constant is the release step and belongs in the
commit that migrates the last file.

settings.tsx migrates in the same change because it hosts the control —
writing a new section in literals on a screen we are about to tokenise
would just be work to undo. It joins MIGRATED and the ratchet now guards
it, verified by watching the fence fail on a reintroduced literal.

The selected row carries the word 'On' as well as a tint: colour is never
the only signal (DESIGN.md §7).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Rewrite `DESIGN.md` §7 and record the migration rules

`DESIGN.md` §7 currently states the app has no light theme. That claim becomes false the moment Task 2 lands, and it must not outlive this plan — a stale claim in this project has cost real time more than once.

**Files:**
- Modify: `DESIGN.md`

**Interfaces:**
- Consumes: the palette from Task 2 and the fences from Task 3.
- Produces: no code.

- [ ] **Step 1: Replace the false claim**

In `DESIGN.md` §7, replace:

```
- The three accents are tuned for the dark ground only. This app has **no light theme** — don't
  add one without re-deriving the palette.
```

with:

```
- **The app has two palettes: `dark` (the default) and `light`.** Both live in
  `src/lib/theme/palette.ts`; reach them only through `useTheme()`, never as a literal.
- **An accent is a fill; an accent-as-text is an ink.** `brand`/`auction`/`open`/`fail` keep
  their vivid values in both palettes and always carry `onBrand`/`onAuction`/`onOpen`/`onFail`
  as the ink riding on top. For the accent used as text or an icon directly on the page
  ground, use `brandInk`/`auctionInk`/`openInk`/`failInk` — they darken under light because
  `#F97316` as text on `#FAFAF8` is 2.68:1 and fails. The two are byte-equal in dark, which is
  exactly why the distinction is easy to lose: a wrong choice is invisible until someone
  switches theme.
- **The light palette is the approved artboard `docs/design-canvas/home-portals/body-Light.html`,
  not an inversion of dark.** An invented light palette was rejected once. The alpha ladder
  mirrors dark's rungs with ink in place of white; `surfaceAlt` is the sole exception and
  steps *down* into grey, because light cannot climb past `#FFFFFF`.
- **The four text tiers stay a closed set in both palettes.** Snap a stray grey to the nearest
  tier; never add a fifth.
- Contrast floors are enforced by `__tests__/paletteFences.test.ts`: 4.5:1 for `text`,
  `textBody`, `textMeta` and the four inks; **3.0:1 for `textFaint`**, which is the
  labels/disabled tier and sits at 3.30:1 on paper in the approved design. Raising that floor
  means re-approving the artboard, not editing the fence.
```

- [ ] **Step 2: Check no other section still denies light mode**

```bash
cd mobile && grep -niE "no light theme|dark only|dark-only|single palette" DESIGN.md
```

Expected: **no output.** Rewrite anything that prints.

- [ ] **Step 3: Correct the contrast figure in two committed code comments**

Two comments quote `#F97316` on `#FAFAF8` as **2.9:1**. That figure was an estimate and it
is wrong — the measured value is **2.68:1**, established when Task 3's fence mutation
reported it. The decision it justifies is unchanged (2.68 fails the 4.5 floor exactly as 2.9
would), but a number stated as fact in a code comment should be the measured one.

```bash
cd mobile
sed -i 's/2\.9:1/2.68:1/g' src/lib/theme/palette.ts __tests__/palette.test.ts
grep -rn "2\.68:1" src/lib/theme/palette.ts __tests__/palette.test.ts
```

Expected: two lines printed, one per file. Then confirm nothing was missed:

```bash
grep -rn "2\.9:1" src/ __tests__/
```

Expected: **no output.**

These are comment-only edits. `__tests__/palette.test.ts` is otherwise a pre-existing test
file — **change only the comment text, never an assertion.**

- [ ] **Step 4: Commit**

```bash
cd mobile
git add DESIGN.md src/lib/theme/palette.ts __tests__/palette.test.ts
git commit -m "Rewrite DESIGN.md section 7 for two palettes, and fix a measured figure

Section 7 said the app has no light theme. That stopped being true when
the light palette landed, and it is rewritten in the same plan rather
than after it — a stale claim in these docs has cost this project real
time more than once.

Adds the fill-vs-ink rule, which is the one distinction that is invisible
in dark (the pairs are byte-equal there) and wrong-looking the moment
anyone switches.

Also corrects two code comments that quoted the brand-on-paper contrast as
2.9:1. That was an estimate; the measured value is 2.68:1. The ink tokens
are just as justified either way — a number stated as fact in a comment
should just be the real one.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## After this plan

Foundation is done: both palettes exist, are fenced, and a working three-state control sits behind `SHOW_APPEARANCE_CONTROL`. **Light mode is still unreachable by users, and that is correct** — 103 files still hold colour literals.

The migration batches are a separate plan, written once this one lands:

| Batch | Scope |
|---|---|
| 2 | Auth and onboarding — includes the `rgba(255,255,255,0.18)` decision (PROJECT-STATE §8a item 9) |
| 3 | Tournament screens — category, checkout, payment, leaderboard, bracket. **Owns the `slab`/`onSlab` decision** recorded in `palette.ts` (Task 2 Step 6): `FeaturedTournament.tsx`'s CTA block flips fill and ink between palettes, and the mechanical brand/onBrand rule gets it wrong. |
| 4 | Cricket scoring — `LivePanels` (66 literals, the largest), `ScorecardTabs`, `balls`, `CricketCharts` |
| 5 | Quick match |
| 6 | The tail |

**The release step is flipping `SHOW_APPEARANCE_CONTROL` to `true`, in the same commit that migrates the last file.** `__tests__/appearanceSection.test.tsx` asserts the shipped value, so that test changes in that commit too — deliberately, so the flip cannot happen by accident.

`src/lib/theme/palette.ts` and `src/lib/theme.ts` keep their literals forever; they are where the literals are supposed to live. "Migration complete" means every file except those.

**Two values need a human look before the flip:** `auctionInk` `#b0416b` and `failInk` `#b54439` are derived, not drawn — no artboard shows pink or red as text. Both clear the contrast floor at 5.27:1 and 5.22:1.
