# Light Mode — Batch 2 (auth + onboarding) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the 17 auth and onboarding files off hardcoded colours onto theme tokens, and give the fence a documented exemption for art-direction colours so it can guard those files honestly.

**Architecture:** No new palette tokens. Every literal either maps to an existing token, snaps to the nearest tier, or is marked `theme-exempt:` as art direction. The ratchet fence gains an exemption marker, mirroring the `hsl()` carve-out it already has.

**Tech Stack:** React Native 0.86.3, Expo SDK 57, React 19.2.3, TypeScript 6.0.3 (strict), jest.

**Spec:** `docs/superpowers/specs/2026-09-15-mobile-light-mode-design.md` (**umbrella** repo, one level above `mobile/`) — §6 defines the migration strategy and the batch order.

**Predecessor:** `docs/superpowers/plans/2026-09-15-light-mode-foundation.md`, merged as `a68420a`.

## Global Constraints

- **`mobile/` only.** No `server/`, no `client/` change.
- **Four independent git repos share this folder.** `cd` into `mobile/` explicitly or use `git -C`. The working directory drifts silently between commands.
- **TypeScript strict is ON.** `any` banned on new lines.
- **`npx tsc --noEmit` baseline is ZERO.** Any error is yours.
- **Gates after every task:** `npx tsc --noEmit` clean, `npx jest` (**951 passing / 90 suites** before this plan starts), `npx expo config --json` exit 0.
- 2-space indent, single quotes.
- **Do NOT edit pre-existing tests.** If one fails, the change altered behaviour.
- **Never REMOVE an entry from `MIGRATED`** — only append. (The foundation removed eight; that was a one-off correction of entries that were never true, and it is not a precedent.)
- **Do NOT flip `SHOW_APPEARANCE_CONTROL`.** It stays `false` until the final batch.
- **Do NOT add palette tokens.** If a literal seems to need one, it is snapping or exempting instead — raise it rather than inventing a token.
- Colour is never the only signal (`DESIGN.md` §7).
- Commit at the end of each task.

## The mapping table — use this for every substitution

Property determines the token. The same literal maps differently as a fill and as ink; getting it backwards looks perfect in dark and wrong in light, and no test catches it.

| Literal | As `color` (ink) | As `backgroundColor` / `borderColor` (fill) |
|---|---|---|
| `#F97316` | `theme.brandInk` | `theme.brand` |
| `#16C46A` | `theme.openInk` | `theme.open` |
| `#FF4438` | `theme.failInk` | `theme.fail` |
| `#FA4C93` | `theme.auctionInk` | `theme.auction` |
| `#0B0B0B` | `theme.onBrand` *(ink riding on a bright accent fill)* | `theme.bg` |
| `#fff` / `#FFFFFF` | `theme.text` | `theme.surface` — **but `theme.onDark` when it is ink on a dark block** |
| `#151515` | — | `theme.surface` |
| `#1E1E1E` | — | `theme.surfaceAlt` |
| `#d4d4d4` | `theme.textBody` | — |
| `#a3a3a3` | `theme.textMeta` | — |
| `#7d7d7d` | `theme.textFaint` | — |
| `rgba(255,255,255,0.07)` | — | `theme.fill` |
| `rgba(255,255,255,0.04)` | — | `theme.fillSoft` |
| `rgba(255,255,255,0.14)` | — | `theme.line` |
| `rgba(255,255,255,0.12)` | — | `theme.lineSoft` |
| `rgba(255,255,255,0.10)` | — | `theme.lineFaint` |
| `rgba(255,255,255,0.16)` | — | `theme.keyline` |
| `rgba(255,255,255,0.22)` | — | `theme.keylineStrong` |
| `rgba(255,255,255,0.20)` | — | `theme.handle` |
| `rgba(249,115,22,0.12)` | — | `theme.brandTint` |

### Snap decisions — already made, apply them as given

These values sit between tiers. `DESIGN.md` fixes the four text tiers as a **closed set**; snap to the nearest, never add a fifth.

| Literal | Snaps to | Why |
|---|---|---|
| `#737373` | `theme.textFaint` (`#7d7d7d`) | nearest tier; 3 sites |
| `#bdbdbd` | `theme.textBody` (`#d4d4d4`) | the existing documented snap |
| `#101010` | `theme.bg` (`#0B0B0B`) | a footer bar reading as page ground, 1 site |
| `#151515` | `theme.surface` | exact match |
| `rgba(255,255,255,0.05)` and `0.06` | `theme.fill` (`0.07`) | both sit between `fillSoft` 0.04 and `fill` 0.07, nearer `fill` |
| `rgba(255,255,255,0.18)` | **`theme.handle`** (`0.20`) at `src/app/(onboarding)/story.tsx:98`, **`theme.keyline`** (`0.16`) at `src/components/auth/CloseButton.tsx:23` | This closes `PROJECT-STATE.md` §8a item 9. The rule is the call site, not the number: story's is a `backgroundColor` on a progress segment — a fill, so `handle`. CloseButton's is a `borderColor` — so `keyline`. |
| `rgba(249,115,22,0.10)`, `0.11`, `0.16`, `0.22` | `theme.brandTint` (`0.12`) | There is exactly one brand tint by design — `palette.ts` says so explicitly ("reusing that suffix would imply a ladder of brand alpha steps that does not exist"). Four near-identical alphas are drift. |
| `rgba(0,0,0,0.35)`, `rgba(11,11,11,0.5)`, `rgba(11,11,11,0.55)` | `theme.scrim` (`rgba(11,11,11,0.72)`) | all three are modal/overlay scrims |
| `rgba(11,11,11,0)` | **leave as-is, mark exempt** | a transparent gradient terminator, not a colour |

---

### Task 1: Give the fence an art-direction exemption

The onboarding story paints a **different gradient wash per story beat** — `['#3a2415','#141414','#0B0B0B']`, `['#152331',…]`, `['#1c2a18',…]`: orange-, blue- and green-tinted darks. These are editorial art direction, not theme values, exactly like the `hsl()` tournament hues the fence already excludes ("a seeded tournament hue is that tournament's identity, not a theme value").

**Files:**
- Modify: `test-utils/colourLiterals.ts`
- Test: `__tests__/colourLiterals.test.ts`

**Interfaces:**
- Consumes: `findColourLiterals(src)` and `findLegacyColourUses(src)` (or whatever the foundation named the second detector — read the file).
- Produces: exemption handling inside the existing finder functions. **No new exported function** unless the file's shape demands it.

The marker is `theme-exempt: <reason>` in a comment, and **it must sit on the same line as the literal or the line immediately above** — the same adjacency rule the Anton fence uses for `anton-leading-exempt`. A reason is mandatory; a bare marker does not count.

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/colourLiterals.test.ts`:

```typescript
  it('skips a literal marked theme-exempt on the same line', () => {
    const src = "const wash = ['#3a2415', '#141414']; // theme-exempt: per-beat story art";
    expect(findColourLiterals(src)).toEqual([]);
  });

  it('skips a literal marked theme-exempt on the line above', () => {
    const src = ['// theme-exempt: per-beat story art, dark-only', "const wash = ['#3a2415'];"].join('\n');
    expect(findColourLiterals(src)).toEqual([]);
  });

  // A marker two lines up is not adjacent. Without this the marker drifts and
  // starts silently covering literals nobody meant to exempt.
  it('does not let an exemption reach a literal two lines away', () => {
    const src = ['// theme-exempt: something else', '', "const c = '#F97316';"].join('\n');
    expect(findColourLiterals(src)).toHaveLength(1);
  });

  // A bare marker with no reason is not an exemption. The reason is the point:
  // it is what a future reader weighs when deciding whether it still holds.
  it('requires a reason after the marker', () => {
    const src = "const c = '#F97316'; // theme-exempt:";
    expect(findColourLiterals(src)).toHaveLength(1);
  });

  it('still flags an unmarked literal on a neighbouring line', () => {
    const src = ["const a = '#3a2415'; // theme-exempt: art", "const b = '#F97316';"].join('\n');
    expect(findColourLiterals(src)).toHaveLength(1);
  });
```

- [ ] **Step 2: Run them and watch them fail**

```bash
cd mobile && npx jest __tests__/colourLiterals.test.ts -t "theme-exempt"
```

Expected: FAIL — the marker is not implemented, so the literals are still reported.

- [ ] **Step 3: Implement the exemption**

In `test-utils/colourLiterals.ts`, add above the finder functions:

```typescript
/**
 * An art-direction escape hatch, adjacent-only and reason-required.
 *
 * Some colours in this app are not theme values and never will be: the
 * onboarding story paints a different gradient wash per beat, and those
 * tinted darks are editorial, the same way a seeded tournament hue is that
 * tournament's identity rather than a palette entry (which is why `hsl()` is
 * excluded outright above).
 *
 * The marker must sit ON the literal's line or the line DIRECTLY above it,
 * and it must carry a reason. Both rules exist because a fence's escape hatch
 * is the thing most likely to rot: a marker allowed to float would quietly
 * cover literals nobody meant to exempt, and a marker with no reason gives a
 * future reader nothing to weigh when deciding whether it still applies.
 *
 * This mirrors `anton-leading-exempt` in the Anton fence. If you are reaching
 * for it for anything other than art direction, the answer is a token.
 */
const THEME_EXEMPT = /theme-exempt:\s*\S/;

function isExempt(lines: string[], lineNumber: number): boolean {
  const own = lines[lineNumber - 1] ?? '';
  const above = lines[lineNumber - 2] ?? '';
  return THEME_EXEMPT.test(own) || THEME_EXEMPT.test(above);
}
```

Then, in each finder, drop findings whose line is exempt. Read the existing code and match its shape — it already computes a line number per finding.

- [ ] **Step 4: Run the tests**

```bash
cd mobile && npx jest __tests__/colourLiterals.test.ts
```

Expected: all PASS, including the pre-existing ones.

- [ ] **Step 5: Prove the exemption cannot over-reach**

The danger of an escape hatch is that it covers more than intended. Confirm the adjacency rule actually binds:

```bash
cd mobile && npx jest __tests__/colourLiterals.test.ts -t "two lines away"
```

Expected: PASS. Now temporarily widen the window in `isExempt` to also check `lines[lineNumber - 3]`, re-run that one test, and confirm it FAILS. Then revert the widening.

**If it still passed with the widened window, the test is not binding the rule and must be sharpened before you continue.**

- [ ] **Step 6: Run the gates**

```bash
cd mobile && npx jest && npx tsc --noEmit
```

Expected: 951 + the 5 new tests pass; `tsc` silent.

- [ ] **Step 7: Commit**

```bash
cd mobile
git add test-utils/colourLiterals.ts __tests__/colourLiterals.test.ts
git commit -m "Give the colour fence an art-direction exemption

The onboarding story paints a different gradient wash per beat — tinted
darks that are editorial, not theme values, the same way a seeded
tournament hue is that tournament's identity rather than a palette entry.
The fence already excludes hsl() for exactly that reason; this extends the
idea to named stops.

Adjacent-only and reason-required, mirroring anton-leading-exempt. A
fence's escape hatch is the part most likely to rot: a floating marker
would quietly cover literals nobody meant to exempt, and a marker without
a reason gives the next reader nothing to weigh.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Migrate the four auth form screens

**Files:**
- Modify: `src/app/(auth)/login.tsx`, `src/app/(auth)/register.tsx`, `src/app/(auth)/forgot-password.tsx`, `src/app/(auth)/verify-otp.tsx`
- Modify: `test-utils/colourLiterals.ts` (append to `MIGRATED`)

**Interfaces:**
- Consumes: `useTheme()` from the barrel `@/lib/theme` — **always the barrel, never `@/lib/theme/ThemeProvider`**.
- Produces: nothing other tasks depend on.

These four are the densest and most similar to each other: 60 literals between them, all ordinary form chrome.

- [ ] **Step 1: Migrate the four files**

For each: add `import { useTheme } from '@/lib/theme';`, call `const theme = useTheme();` inside every component holding a literal, and apply the mapping table above **by reading each call site** — the property decides the token.

Module-scope style constants holding a literal become functions taking `theme`, matching the `LBL(theme)` idiom in `src/components/settings/Section.tsx`.

- [ ] **Step 2: Confirm no literal survives**

```bash
cd mobile && grep -nE "['\"]#[0-9a-fA-F]{3,8}['\"]|['\"]rgba?\(|colors\.[a-zA-Z]|bg-ink|bg-panel|text-white|border-line" \
  "src/app/(auth)/login.tsx" "src/app/(auth)/register.tsx" \
  "src/app/(auth)/forgot-password.tsx" "src/app/(auth)/verify-otp.tsx"
```

Expected: **no output.** Both quote styles and the legacy `colors` object are covered — a single-quote-only grep reported a file clean once when it was not.

- [ ] **Step 3: Append to `MIGRATED`**

```typescript
  'src/app/(auth)/login.tsx',
  'src/app/(auth)/register.tsx',
  'src/app/(auth)/forgot-password.tsx',
  'src/app/(auth)/verify-otp.tsx',
```

- [ ] **Step 4: Prove the ratchet now guards them**

```bash
cd mobile
git stash push -- "src/app/(auth)/login.tsx"
git stash apply
sed -i "0,/color: theme.textFaint,/s//color: '#7d7d7d',/" "src/app/(auth)/login.tsx"
npx jest __tests__/colourLiterals.test.ts
```

Expected: FAIL, naming `src/app/(auth)/login.tsx`.

```bash
git checkout -- "src/app/(auth)/login.tsx"
git stash pop
npx jest __tests__/colourLiterals.test.ts
```

Expected: PASS. **Do not commit until you have seen it fail.**

- [ ] **Step 5: Run the gates**

```bash
cd mobile && npx jest && npx tsc --noEmit && npx expo config --json > /dev/null && echo CONFIG_OK
```

- [ ] **Step 6: Commit**

```bash
cd mobile
git add "src/app/(auth)/login.tsx" "src/app/(auth)/register.tsx" \
        "src/app/(auth)/forgot-password.tsx" "src/app/(auth)/verify-otp.tsx" \
        test-utils/colourLiterals.ts
git commit -m "Migrate the four auth form screens onto theme tokens

Ordinary form chrome, 60 literals. The only judgement in here is
fill-vs-ink: brand as a button background stays theme.brand, brand as a
link colour becomes theme.brandInk, and #0B0B0B on a brand fill is
theme.onBrand rather than theme.bg. All four join MIGRATED, with the
ratchet watched failing on a reintroduced literal first.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Migrate the remaining auth screens and components

**Files:**
- Modify: `src/app/(auth)/set-password.tsx`, `src/app/(auth)/entering.tsx`, `src/app/(auth)/_layout.tsx`, `src/components/auth/PasswordRules.tsx`, `src/components/auth/AuthInput.tsx`, `src/components/auth/CloseButton.tsx`
- Modify: `test-utils/colourLiterals.ts`

**Interfaces:** same as Task 2.

Two specific decisions land here:

- **`CloseButton.tsx:23`** — `borderColor: 'rgba(255,255,255,0.18)'` → **`theme.keyline`**. It is a border. This is half of `PROJECT-STATE.md` §8a item 9.
- **`AuthInput.tsx`** is the one file in this batch holding a **NativeWind colour classname** as well as quoted literals. Replace the classname with a token on the style object; do not leave a colour-bearing class behind, because the extended fence flags those in `MIGRATED` files.
- **`set-password.tsx:82`** — `backgroundColor: '#101010'` → **`theme.bg`** per the snap table.

- [ ] **Step 1: Migrate the six files** using the mapping and snap tables.

- [ ] **Step 2: Confirm no literal survives**

```bash
cd mobile && grep -nE "['\"]#[0-9a-fA-F]{3,8}['\"]|['\"]rgba?\(|colors\.[a-zA-Z]|bg-ink|bg-panel|text-white|border-line" \
  "src/app/(auth)/set-password.tsx" "src/app/(auth)/entering.tsx" "src/app/(auth)/_layout.tsx" \
  src/components/auth/PasswordRules.tsx src/components/auth/AuthInput.tsx src/components/auth/CloseButton.tsx
```

Expected: **no output.**

- [ ] **Step 3: Append all six to `MIGRATED`.**

- [ ] **Step 4: Prove the ratchet guards `AuthInput.tsx` specifically**

It is the file with the NativeWind class, so it exercises the extended detector rather than the quoted-literal one:

```bash
cd mobile
git stash push -- src/components/auth/AuthInput.tsx
git stash apply
sed -i '0,/className="/s//className="text-white /' src/components/auth/AuthInput.tsx
npx jest __tests__/colourLiterals.test.ts
```

Expected: FAIL, naming `AuthInput.tsx` and the classname.

```bash
git checkout -- src/components/auth/AuthInput.tsx
git stash pop
npx jest __tests__/colourLiterals.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the gates** — `npx jest`, `npx tsc --noEmit`, `npx expo config --json`.

- [ ] **Step 6: Commit**

```bash
cd mobile
git add "src/app/(auth)/set-password.tsx" "src/app/(auth)/entering.tsx" "src/app/(auth)/_layout.tsx" \
        src/components/auth/PasswordRules.tsx src/components/auth/AuthInput.tsx \
        src/components/auth/CloseButton.tsx test-utils/colourLiterals.ts
git commit -m "Migrate the remaining auth screens and components

Closes half of PROJECT-STATE section 8a item 9: CloseButton's
rgba(255,255,255,0.18) is a borderColor, so it snaps to keyline (0.16)
rather than handle (0.20). The call site decides, not the number.

AuthInput is the first file migrated that carried a NativeWind colour
class as well as quoted literals — the extended fence catches those in
MIGRATED files, and it was watched failing on one before this landed.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Migrate the onboarding flow, exempting the story art

**Files:**
- Modify: `src/app/(onboarding)/story.tsx`, `welcome.tsx`, `welcome-done.tsx`, `auth.tsx`, `card-preview.tsx`, `creating.tsx`, `_layout.tsx`
- Modify: `test-utils/colourLiterals.ts`

**Interfaces:** consumes the `theme-exempt:` marker from Task 1.

The other half of §8a item 9 lands here: **`story.tsx:98`** — `backgroundColor: i <= active ? '#F97316' : 'rgba(255,255,255,0.18)'` on a progress segment. It is a **fill**, so the accent side becomes `theme.brand` and the inactive side snaps to **`theme.handle`** (0.20).

- [ ] **Step 1: Migrate the seven files**, applying the mapping and snap tables.

- [ ] **Step 2: Exempt the story washes**

`story.tsx` (three `wash:` arrays) and `welcome.tsx` (one `colors={[...]}` gradient) carry per-beat art. Mark each, with a real reason:

```typescript
    // theme-exempt: per-beat story art, dark-only by design
    wash: ['#3a2415', '#141414', '#0B0B0B'],
```

Also mark the `rgba(11,11,11,0)` gradient terminators — a fully transparent stop is not a colour:

```typescript
    // theme-exempt: transparent gradient terminator, not a colour
```

**Exempt only the art.** Every other literal in these two files is ordinary chrome and takes a token. If you find yourself marking more than the four wash arrays and the transparent stops, stop and report it — that is the escape hatch rotting on its first use.

- [ ] **Step 3: Confirm only the exempt lines remain**

```bash
cd mobile && grep -nE "['\"]#[0-9a-fA-F]{3,8}['\"]|['\"]rgba?\(" "src/app/(onboarding)/"*.tsx
```

Expected: **only** the wash arrays and transparent terminators, each with a `theme-exempt:` comment on or directly above its line. Any other line is unfinished work.

- [ ] **Step 4: Append all seven to `MIGRATED`.**

- [ ] **Step 5: Prove the fence guards `story.tsx` despite the exemption**

This is the important one — an exemption must not disarm the whole file:

```bash
cd mobile
git stash push -- "src/app/(onboarding)/story.tsx"
git stash apply
sed -i "0,/color: theme.textFaint,/s//color: '#7d7d7d',/" "src/app/(onboarding)/story.tsx"
npx jest __tests__/colourLiterals.test.ts
```

Expected: FAIL, naming `story.tsx` and `'#7d7d7d'` — **not** the exempt wash lines.

```bash
git checkout -- "src/app/(onboarding)/story.tsx"
git stash pop
npx jest __tests__/colourLiterals.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run the gates** — `npx jest`, `npx tsc --noEmit`, `npx expo config --json`.

- [ ] **Step 7: Commit**

```bash
cd mobile
git add "src/app/(onboarding)/" test-utils/colourLiterals.ts
git commit -m "Migrate the onboarding flow, exempting the story art

Closes the other half of PROJECT-STATE section 8a item 9: story's
rgba(255,255,255,0.18) is a backgroundColor on a progress segment, so it
snaps to handle (0.20) where CloseButton's border snapped to keyline
(0.16). Same literal, different call sites, different tokens.

The per-beat gradient washes are marked theme-exempt rather than
tokenised. They are editorial — one tinted dark per story beat — and
tokenising them would add seven dark-only tokens serving one screen that
every future palette would then have to define. The file still joins
MIGRATED and the fence was watched failing on a non-exempt literal inside
it, so the exemption covers the art and nothing else.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Close out the batch in the docs

**Files:**
- Modify: `C:/Kria/kria-sports/PROJECT-STATE.md` (**umbrella repo** — a different git repo; `cd` there explicitly)

- [ ] **Step 1: Recount, do not estimate**

```bash
cd /c/Kria/kria-sports/mobile
n=0; for f in $(git ls-files 'src/*.ts' 'src/*.tsx' 'src/**/*.ts' 'src/**/*.tsx'); do
  if grep -qE "['\"]#[0-9a-fA-F]{3,8}['\"]|['\"]rgba?\(|colors\.[a-zA-Z]" "$f" 2>/dev/null; then n=$((n+1)); fi
done; echo "files still holding literals: $n"
grep -c "^  'src/" test-utils/colourLiterals.ts
```

Use the printed numbers. **Do not carry forward the 103/11 figures in this plan** — they are true as of writing and this task's whole job is to replace them.

- [ ] **Step 2: Update `PROJECT-STATE.md`**

- §8a item 10: the new counts.
- **§8a item 9: DELETE the row.** Both halves are resolved — `CloseButton` → `keyline`, `story` → `handle`. The file's own rule is to delete a closed entry, not let it rot.
- §8b Light mode row: batch 2 done, four batches remain.
- §8c: add the `theme-exempt:` marker, why art colours are not tokens, and that the marker is adjacent-only and reason-required.

- [ ] **Step 3: Commit in the umbrella repo**

```bash
cd /c/Kria/kria-sports
git add PROJECT-STATE.md
git commit -m "docs: light-mode batch 2 done, auth and onboarding migrated

Closes section 8a item 9. The rgba(255,255,255,0.18) that sat between two
tokens and was byte-equal to neither resolved as a call-site question
rather than a value question: a border took keyline, a fill took handle.

Records the theme-exempt marker. Art direction is not a theme value, and
the fence already made that distinction for hsl(); this names it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## After this batch

Three migration batches remain: tournament screens, cricket scoring, quick match, then the tail.

**Batches 3 and 4 jointly own the `slab`/`onSlab` decision** recorded in `src/lib/theme/palette.ts`. Eight screens draw a full-bleed brand bar with near-black ink; the light artboard draws that same block as **ink with white text**, because "a burnt-orange slab on paper reads as flooded ink". The mechanical `brand`/`onBrand` rule gets all eight wrong. Read that docblock before starting either batch.

**Still unresolved and required before the flag ever flips:**
- `auctionInk` `#b0416b` and `failInk` `#b54439` are computed, never drawn, never seen. `failInk` and `brandInk` `#b24b04` are close in hue.
- `light.openInk` deviates from the approved artboard (`#248430` → `#1c7e2a`) to clear AA on nested tiles. The user has not ruled on it.
