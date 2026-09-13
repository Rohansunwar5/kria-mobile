# Theme Token Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a semantic colour-token layer under the app, with dark as the only palette and **zero visual change**, so every screen built from here is theme-ready and the light palette becomes a data change rather than a rewrite.

**Architecture:** A `dark` palette of semantic tokens whose values are byte-for-byte today's literals, reached through a `useTheme()` hook backed by a context that mounts once at the root. `useTheme()` falls back to `dark` with no provider, so nothing existing needs re-wrapping. Only the eight home-screen files built in the last two plans migrate now; a fence tracks which files are migrated so the remaining hundred-odd can be converted incrementally without anyone losing count.

**Tech Stack:** React Native / Expo SDK 57, expo-router 57, jest + @testing-library/react-native.

**Spec:** `mobile/DESIGN.md` §2 (colour) is the source of truth for every dark value. The light palette that will eventually sit beside this one is recorded in `mobile/docs/design-canvas/home-portals/body-Light.html` and its rule is in the canvas note: an accent keeps its bright hex as a **fill** and only drops to a derived dark hue as **text on paper**.

## Why this lands before the new screens

There are **1105 colour literals across 114 files**. Two of them are overloaded in a way that only matters once a light palette exists:

- **`#0B0B0B` is the app background 26 times and ink-on-a-bright-fill 43 times.** In light mode the background becomes paper and the ink stays near-black. One literal, two futures — so they must be two tokens.
- **`#FFFFFF` / `#fff` is foreground 178 times and background 0 times.** Mostly primary text, which in light mode becomes near-black; but text sitting on an ink block stays white. Again two tokens.

Building the player profile, Explore and Live against literals would add three more screens to the migration backlog the moment they shipped. This task is what stops that.

## Global Constraints

- **Zero visual change.** Every dark token equals the literal it replaces, exactly. A test asserts the hexes; if a screen looks different, the task failed.
- **Paramount: only ADD paths.** The organiser/staff/player tournament flow must not change behaviour.
- **No new dependencies.** The context is React's own; the system-appearance hook, if used, is `useColorScheme` from `react-native`.
- **TypeScript strict mode IS enabled** (`mobile/tsconfig.json` `"strict": true`). The project's CLAUDE.md was wrong about this until 2026-09-13. No line you add may contain `as any`, `: any`, `@ts-ignore`, `console.`, `?? ''` or `|| ''`.
- 2-space indent, single quotes. Inline `style={{...}}` objects, matching `src/components/profile/CareerCard.tsx` — not NativeWind classes.
- **Anton leading floor**: every Anton style needs `lineHeight / fontSize >= 1.188`. The fence in `__tests__/antonLeading.test.ts` now reads ternaries and computed values and reports anything it cannot measure. Never weaken it; raise the `lineHeight`.
- Do **not** migrate any file outside the eight named in Task 3. The other hundred-odd are a later plan.
- Run `npx jest` and `npx tsc --noEmit`. **The tsc baseline is exactly 2 pre-existing `TS2591` errors** in `__tests__/antonLeading.test.ts`. Zero new; do not fix those 2.
- Commit after every task. Do not push.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/theme/palette.ts` | **New.** The semantic token vocabulary and the `dark` palette. No React. |
| `src/lib/theme/ThemeProvider.tsx` | **New.** Context + provider + `useTheme()`. |
| `src/lib/theme.ts` | **Modify.** Keeps exporting `colors` and `fonts` unchanged so the 8 existing importers keep working; re-exports the new surface. |
| `src/app/_layout.tsx` | **Modify.** Mount the provider once, inside the redux `Provider`. |
| The eight home files | **Modify.** Literals → tokens. Listed in Task 3. |
| `test-utils/colourLiterals.ts` | **New.** The migration fence's analyser. |
| `__tests__/colourLiterals.test.ts` | **New.** The fence: migrated files must contain no colour literal. |

---

### Task 1: The token vocabulary

**Files:**
- Create: `src/lib/theme/palette.ts`
- Test: `__tests__/palette.test.ts`

**Interfaces:**
- Produces: `type ThemeName = 'dark'`; `type Palette` (the token names); `dark: Palette`; `PALETTES: Record<ThemeName, Palette>`.

- [ ] **Step 1: Write the failing test**

`__tests__/palette.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest palette`
Expected: FAIL — `Cannot find module '../src/lib/theme/palette'`.

- [ ] **Step 3: Implement**

Create `src/lib/theme/palette.ts`. The vocabulary, with every value taken from the literal it replaces — do not round, re-derive or tidy any of them:

| Token | Dark value | What it is |
|---|---|---|
| `bg` | `#0B0B0B` | app background |
| `surface` | `#151515` | blocks, cards, rows |
| `surfaceAlt` | `#1E1E1E` | insets, nested tiles |
| `fill` | `rgba(255,255,255,0.07)` | subtle raised fill (icon buttons) |
| `fillSoft` | `rgba(255,255,255,0.04)` | the faintest wash |
| `line` | `rgba(255,255,255,0.14)` | the standard 1.5px border |
| `lineSoft` | `rgba(255,255,255,0.12)` | a divider inside a block |
| `lineFaint` | `rgba(255,255,255,0.10)` | the faintest rule |
| `text` | `#FFFFFF` | primary |
| `textBody` | `#d4d4d4` | body copy |
| `textMeta` | `#a3a3a3` | meta |
| `textFaint` | `#7d7d7d` | labels, disabled |
| `onDark` | `#FFFFFF` | text on an ink block — stays white in light mode |
| `brand` / `auction` / `open` / `fail` | `#F97316` / `#FA4C93` / `#16C46A` / `#FF4438` | the accents |
| `onBrand` / `onOpen` / `onAuction` / `onFail` | `#0B0B0B` / `#06240F` / `#240614` / `#2A0703` | the ink that rides on each accent fill |

Write the file's docblock to say **why** `bg`/`onBrand` and `text`/`onDark` are separate despite being equal today — that is the one thing a future reader will be tempted to "simplify", and collapsing either pair breaks light mode silently.

Type `Palette` so a missing token is a compile error, and `PALETTES` so a second palette registers without touching consumers.

- [ ] **Step 4: Verify**

Run: `npx jest palette` — PASS. Then `npx jest` — full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/palette.ts __tests__/palette.test.ts
git commit -m "feat: semantic colour tokens, dark values unchanged"
```

---

### Task 2: Provider and hook

**Files:**
- Create: `src/lib/theme/ThemeProvider.tsx`
- Modify: `src/lib/theme.ts`, `src/app/_layout.tsx`
- Test: `__tests__/useTheme.test.tsx`

**Interfaces:**
- Consumes: `dark`, `Palette`, `PALETTES`, `ThemeName` from Task 1.
- Produces: `ThemeProvider({ children, theme? })`; `useTheme(): Palette`.

- [ ] **Step 1: Write the failing test**

`__tests__/useTheme.test.tsx`:

```tsx
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../src/lib/theme/ThemeProvider';
import { dark } from '../src/lib/theme/palette';

function Probe() {
  const t = useTheme();
  return <Text>{t.bg}</Text>;
}

describe('useTheme', () => {
  it('gives a consumer the dark palette under the provider', () => {
    const { getByText } = render(
      <ThemeProvider><Probe /></ThemeProvider>
    );
    expect(getByText(dark.bg)).toBeTruthy();
  });

  // Falling back rather than throwing is deliberate: the provider mounts once
  // at the root, and every one of the 70-odd existing test files renders
  // components without it. Throwing would mean re-wrapping all of them to buy
  // nothing — dark IS the app's only palette today.
  it('falls back to dark with no provider at all', () => {
    const { getByText } = render(<Probe />);
    expect(getByText(dark.bg)).toBeTruthy();
  });

  it('returns the same object identity across renders, so styles can be memoised', () => {
    const seen: unknown[] = [];
    function Capture() {
      seen.push(useTheme());
      return null;
    }
    const { rerender } = render(<ThemeProvider><Capture /></ThemeProvider>);
    rerender(<ThemeProvider><Capture /></ThemeProvider>);
    expect(seen[0]).toBe(seen[1]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest useTheme`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`ThemeProvider.tsx`: a `createContext<Palette>(dark)` — the default value is what makes the no-provider fallback work without a branch. `ThemeProvider` takes an optional `theme: ThemeName` (defaulting to `'dark'`) and provides `PALETTES[theme]`.

**Do not add a toggle, persistence, or `useColorScheme` wiring in this task.** There is one palette; a switch with one position is dead code, and the toggle belongs with the light palette that gives it a second position. Say so in a comment so the next reader does not think it was forgotten.

Then:
- `src/lib/theme.ts` — leave `colors` and `fonts` exactly as they are (8 files import them and nothing about this task should touch those), and re-export `useTheme`, `ThemeProvider` and `dark` so consumers have one import path.
- `src/app/_layout.tsx` — wrap `<AuthGate />` in `<ThemeProvider>`, inside the redux `Provider`. Leave `colors.ink` on the root `View` alone; Task 3 does not cover this file.

- [ ] **Step 4: Verify**

Run: `npx jest useTheme` — PASS, 3 tests. Then `npx jest` — full suite green. Then `npx tsc --noEmit` — exactly 2.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/ThemeProvider.tsx src/lib/theme.ts "src/app/_layout.tsx" __tests__/useTheme.test.tsx
git commit -m "feat: theme context and useTheme, dark-only"
```

---

### Task 3: Migrate the eight home files

**Files — migrate exactly these, and nothing else:**
- `src/app/(tabs)/home.tsx`
- `src/components/home/EventsPortal.tsx`
- `src/components/home/PlayPortal.tsx`
- `src/components/home/PortalSwitch.tsx`
- `src/components/home/FilterBar.tsx`
- `src/components/home/FilterSheet.tsx`
- `src/components/navigation/FloatingTabBar.tsx`
- `src/components/icons/nav.tsx`
- Test: the existing suites for these files must pass **unchanged**.

**Interfaces:**
- Consumes: `useTheme` from Task 2.

- [ ] **Step 1: Confirm the tests are green before you start**

Run: `npx jest home EventsPortal PlayPortal PortalSwitch FilterBar FilterSheet FloatingTabBar navIcons`
Record the counts. **These same tests must pass unchanged at the end** — that is the zero-visual-change proof. If you find yourself editing one, stop: the colour you substituted was not equal to the literal.

- [ ] **Step 2: Migrate, file by file**

In each file, replace every colour literal with the token that means what the literal meant. The mapping is Task 1's table. Two calls need thought rather than search-and-replace:

- **`#0B0B0B`**: `bg` when it is a `backgroundColor`, `onBrand`/`onAuction`/etc. when it is a `color` or `stroke` sitting on an accent fill. Read each site.
- **`#fff` / `#FFFFFF`**: `text` for primary copy on the dark ground; `onDark` only where it sits on an ink block.

`useTheme()` is a hook, so it must be called in the component body — a module-level style constant cannot read it. Where a file has shared style constants built from colours, turn them into functions of the palette (`const label = (t: Palette) => ({...})`) or move them inside the component. Prefer the function form where the constant is used more than once; it keeps the style object out of the render path's inline noise.

Where a colour is genuinely not a theme colour, leave it: `hsl(...)` seeded tournament art is identity, not theme, and the grain/noise `data:` URI is an asset.

**`src/components/icons/nav.tsx` is the one file that should not gain a hook.** Its only literal is `color = '#FFFFFF'`, a default parameter on a leaf SVG component. Calling `useTheme()` inside it to supply a default would put a context read in every glyph for a value every caller already passes — `FloatingTabBar` sets `color` on all five slots. **Make `color` a required prop instead** and delete the default. That removes the literal, keeps the component pure, and turns "someone renders a glyph without deciding its colour" into a compile error. Check no other caller relies on the default before you do it; if one does, pass the token at that call site rather than restoring the default.

- [ ] **Step 3: Verify nothing moved**

```bash
npx jest
npx tsc --noEmit
```
Expected: full suite green with the same counts as Step 1, and exactly 2 tsc errors.

```bash
grep -nE "'#[0-9a-fA-F]{3,8}'|'rgba?\(" "src/app/(tabs)/home.tsx" src/components/home/*.tsx src/components/navigation/FloatingTabBar.tsx src/components/icons/nav.tsx
```
Expected: nothing, except any `hsl(` art colour you deliberately left.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: the home surfaces read colours from tokens"
```

---

### Task 4: The migration fence

Ninety-odd files still hold literals. Without a mechanism, "which files are migrated" becomes folklore and the light palette ships half-applied.

**Files:**
- Create: `test-utils/colourLiterals.ts`, `__tests__/colourLiterals.test.ts`

**Interfaces:**
- Produces: `MIGRATED: string[]`; `findColourLiterals(src: string): { line: number; literal: string }[]`.

- [ ] **Step 1: Write the failing test**

`__tests__/colourLiterals.test.ts`:

```ts
import { readFileSync } from 'fs';
import { MIGRATED, findColourLiterals } from '../test-utils/colourLiterals';

// A ratchet, not a sweep. A file joins MIGRATED when its literals become
// tokens; from then on this fence stops them coming back. The ~90 files not
// listed are the remaining backlog and are deliberately unguarded.
describe('colour literal fence', () => {
  it('finds a hex literal', () => {
    expect(findColourLiterals("color: '#fff'")).toEqual([{ line: 1, literal: "'#fff'" }]);
  });

  it('finds an rgba literal', () => {
    expect(findColourLiterals("borderColor: 'rgba(255,255,255,0.14)'")).toHaveLength(1);
  });

  it('does not flag a seeded art colour, which is identity rather than theme', () => {
    expect(findColourLiterals("backgroundColor: `hsl(${hue(seed)}, 44%, 13%)`")).toEqual([]);
  });

  it('does not flag a data: URI', () => {
    expect(findColourLiterals("uri: 'data:image/svg+xml,%3Csvg%3E'")).toEqual([]);
  });

  it('every migrated file is free of colour literals', () => {
    const offenders = MIGRATED.flatMap((file) =>
      findColourLiterals(readFileSync(file, 'utf8')).map((f) => `${file}:${f.line} ${f.literal}`)
    );
    expect(offenders).toEqual([]);
  });

  it('lists the files Task 3 migrated', () => {
    expect(MIGRATED).toContain('src/components/home/FilterSheet.tsx');
    expect(MIGRATED).toContain('src/components/navigation/FloatingTabBar.tsx');
    expect(MIGRATED.length).toBeGreaterThanOrEqual(8);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest colourLiterals`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`test-utils/colourLiterals.ts`: a quoted-string matcher for `#rgb`/`#rrggbb`/`#rrggbbaa` and `rgb(`/`rgba(`, skipping `hsl(` and `data:`. `MIGRATED` is the eight paths from Task 3, as repo-relative strings, with a comment saying a file is added when its literals become tokens and that the list is the light-mode migration's progress bar.

- [ ] **Step 4: Verify**

Run: `npx jest colourLiterals` — PASS. Then `npx jest` and `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add test-utils/colourLiterals.ts __tests__/colourLiterals.test.ts
git commit -m "test: ratchet the migrated files against colour literals"
```

---

## Not in this plan

- **The light palette, the toggle, and persistence.** A switch with one position is dead code. They arrive together with the second palette.
- **The other ~90 files.** The fence's `MIGRATED` list is how that progresses, a few files at a time.
- **`colors` from `src/lib/theme.ts`.** It stays, unchanged, for its 8 importers. Retiring it is a later cleanup, not a prerequisite.
- **Following the system appearance** (`useColorScheme`). It is a one-line addition once there is more than one palette to choose between.
