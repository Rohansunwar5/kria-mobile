# Player Profile Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the player profile up to its artboard — a best-sport hero with a form strip, a career table that totals, played-for cards carrying the team's colour — and take the screen onto theme tokens while it is open.

**Architecture:** Two pieces already exist in the wrong place and get extracted rather than copied: the form strip lives inside `PlayPortal`, and the career figures live in `CareerCard`, which **both** the public profile and the own-profile tab render. Restyling `CareerCard` in place — rather than adding a second career presentation for the public profile — is the whole point; two presentations of the same numbers is the drift this codebase keeps paying for.

**Tech Stack:** React Native / Expo SDK 57, expo-router 57, jest + @testing-library/react-native.

**Spec:** `docs/design-canvas/home-portals/body-Profile.html`. Canvas: https://claude.ai/code/artifact/bd825a92-5749-49cb-8e6b-3a8b2bde4184

## Two decisions made up front

**`CareerCard` is restyled in place, and that touches a second screen.** It renders on `src/app/player/[playerId].tsx` (the artboard's subject) **and** `src/app/(tabs)/profile.tsx` (which has no artboard). The alternative — a new table component for the public profile only — leaves two renderings of the same `SportSummary[]` to drift apart. Both screens get the table. `(tabs)/profile.tsx` is otherwise untouched.

**Follow and Challenge are not built.** No follower or challenge model exists on the server. The artboard's two buttons are omitted; do not draw them dead.

## Global Constraints

- **Paramount: only ADD paths.** This restyles presentation. No data shape, request, or navigation behaviour may change.
- **No new dependencies.**
- **TypeScript strict mode IS enabled.** No line you add may contain `as any`, `: any`, `@ts-ignore`, `console.`, `?? ''` or `|| ''`.
- 2-space indent, single quotes; inline `style={{...}}` objects with shared style constants — not NativeWind.
- **Every colour from `useTheme()`.** New and restyled files join `MIGRATED` in `test-utils/colourLiterals.ts`; the fence fails the build on a literal.
- **Anton leading floor:** `lineHeight / fontSize >= 1.188`. The fence reads ternaries and reports what it cannot measure. Raise the `lineHeight`, never shrink the `fontSize`.
- **44px hit targets; colour is never the only signal** (DESIGN.md §7).
- `winRate` is a **0-1 fraction** the server owns. Format it with `winPercent` from `@/lib/format` — never recompute from `won/decided`. `played` includes `no_result`; `decided` does not.
- Navigation from `expo-router` only.
- Run `npx jest` and `npx tsc --noEmit`. **tsc baseline is exactly 3** `TS2591` errors; zero new, do not fix those 3.
- Commit after every task. Do not push.

---

### Task 1: Extract the form strip

`PlayPortal` holds `FORM_TOKEN` and renders the W/L/NR chips inline. The profile needs the same strip, so it moves out.

**Files:** Create `src/components/profile/FormStrip.tsx`; modify `src/components/home/PlayPortal.tsx`, `test-utils/colourLiterals.ts`; test `__tests__/FormStrip.test.tsx`.

**Produces:** `FormStrip({ recent, limit? })` — takes `RecentMatch[]`, renders newest-last.

- [ ] **Step 1: Write the failing test.** Cover: results render oldest-to-newest left-to-right (the artboard's arrow reads "NEWEST ▸"), so a newest-first feed is reversed; each chip carries its **letter** as well as its colour (W/L/NR — colour is never the only signal); a `no_result` renders `NR` and is visually distinct from a loss; only the most recent `limit` are shown; an empty feed renders nothing.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.** Lift `FORM_TOKEN` and the chip markup out of `PlayPortal` verbatim — same sizes, same radii, same colours via `useTheme()`. **`PlayPortal` must then render `<FormStrip>` and lose its copy; its existing tests must pass unchanged.** If one needs editing, the extraction changed behaviour. Add the new file to `MIGRATED`.
- [ ] **Step 4: Verify** — `npx jest`, `npx tsc --noEmit` (3). **Commit.**

---

### Task 2: The career table

**Files:** Modify `src/components/profile/CareerCard.tsx`; test — `__tests__/CareerCard.test.tsx` exists, extend it.

- [ ] **Step 1: Write the failing test.** Cover: a header row of `SPORT / PL / W / L / WIN%`; one row per sport; a **Total row** summing played, won and lost across sports with an overall win rate; the total's win rate computed from **summed won over summed decided**, not by averaging per-sport rates (averaging is wrong whenever the sports have different volumes — pin it with two sports of unequal size); `decided: 0` renders `0%`, never `NaN%`; and the footnote naming excluded no-results appears **only when there is at least one**.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.** Match `body-Profile.html`'s table. Keep the existing `bestSport` badge behaviour exactly as it is — the server sends `null` below 10 decided and no badge shows; **do not re-implement that threshold.** Use `winPercent` from `@/lib/format`. Add `CareerCard.tsx` to `MIGRATED`.
- [ ] **Step 4: Verify.** The existing `CareerCard` tests that are not about layout must still pass, and `(tabs)/profile.tsx` must still render — check its test if one exists. **Commit.**

---

### Task 3: The best-sport hero

**Files:** Create `src/components/profile/BestSportHero.tsx`; modify `test-utils/colourLiterals.ts`; test `__tests__/BestSportHero.test.tsx`.

**Produces:** `BestSportHero({ bestSport, recent })`.

- [ ] **Step 1: Write the failing test.** Cover: the big percentage comes from `bestSport.winRate` formatted, not recomputed; the W/L/decided line shows `won`, `lost` and `decided`; the sport's name and icon appear; **it renders nothing at all when `bestSport` is null** — the server withholds it below 10 decided matches and an empty hero would imply the player has no best sport rather than not enough evidence; and the form strip from Task 1 is rendered inside it.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.** Match the artboard: kicker, 52px `SpaceMono_700Bold` figure, WIN RATE label, the W/L/decided line, then the form strip. Sport icons via `Icon` (industrial set) — `shuttlecock` and `cricket-bat` exist. Add to `MIGRATED`.
- [ ] **Step 4: Verify.** **Commit.**

---

### Task 4: Played-for cards

**Files:** Create `src/components/profile/PlayedForCard.tsx`; modify `test-utils/colourLiterals.ts`; test `__tests__/PlayedForCard.test.tsx`.

**Produces:** `PlayedForCard({ entry, onPress })` taking one `PublicHistoryEntry` from `@/api/profileApi`.

- [ ] **Step 1: Write the failing test.** Cover: the team's `primaryColor` drives the swatch, and **a missing `primaryColor` falls back to a token rather than rendering an invalid colour**; the tournament name and the sport tag render; the played/won cells come from `stats` and show `0` rather than blank when absent; the card is only pressable when `tournament._id` exists, and announces that correctly; and the third cell is **omitted when there is no auction price** — `soldPrice` exists only for tournament auctions, so a badminton entry has none and an empty "Sold for —" cell is noise.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.** Match the artboard's card: 38px square team swatch with initials, name over tournament·year, sport tag, then the stat strip. Add to `MIGRATED`.
- [ ] **Step 4: Verify.** **Commit.**

---

### Task 5: Assemble the screen, on tokens

**Files:** Modify `src/app/player/[playerId].tsx`, `test-utils/colourLiterals.ts`; test `__tests__/PlayerProfileAchievements.test.tsx` exists — extend it, or add a sibling.

- [ ] **Step 1: Record the current tests.** Run `npx jest PlayerProfile` and note the counts; they must still pass.
- [ ] **Step 2: Write the failing test.** Cover: the sections render in the artboard's order — identity, best-sport hero, career table, achievements, titles, played-for; the screen still renders when `bestSport` is null (no hero) and when `history` is empty (the existing empty state); and the recent-matches feed still renders, since it is on the screen today and the artboard simply does not show it.
- [ ] **Step 3: Implement.**
  - Replace the four-cell `StatCell` row with `BestSportHero` + the restyled `CareerCard`. `StatCell` becomes unused — **delete it** rather than leaving it dead.
  - Give the identity band the seeded art treatment the tournament cards use: `TournamentArt` takes a `seed`, so the player's `_id` gives each profile its own stable ground. Read `src/components/TournamentArt.tsx` first and reuse it rather than re-deriving a hue.
  - Restyle the titles list and swap the history rows for `PlayedForCard`.
  - **Migrate every remaining colour literal in the file to `useTheme()`** and add the file to `MIGRATED`.
  - **Do not** add Follow or Challenge. **Do not** change what is fetched or how.
- [ ] **Step 4: Verify.** `npx jest`, `npx tsc --noEmit` (3), and:

```bash
grep -nE "'#[0-9a-fA-F]{3,8}'|'rgba?\(" "src/app/player/[playerId].tsx" src/components/profile/*.tsx
```
Expected: nothing.

- [ ] **Step 5: Commit, then report the device-check list** (do not run `npx expo start`).

---

## Not in this plan

- **Explore and Live** — undesigned; artboards first.
- **Light mode** — the token layer is in; the second palette, the toggle and the remaining ~100 files are their own plan. This plan moves the profile files onto tokens, which shrinks that.
- **Follow and Challenge** — no model exists.
- **`@types/node`** — would take the tsc baseline from 3 to 0. PROJECT-STATE §8a item 1.
