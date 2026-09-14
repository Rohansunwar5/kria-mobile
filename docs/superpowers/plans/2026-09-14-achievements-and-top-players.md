# Achievements and Top Players Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the two figures the server just started serving onto the screens that were designed for them — the achievement badges on the player profile, and the Top players board in the PLAY portal.

**Architecture:** Achievements arrive free on the career profile call the app already makes, so no new request; `useCareer` just stops discarding them. Top players is one new endpoint behind one new hook, following `useCareer`'s local-state shape rather than a Redux slice. Both new components read colours from `useTheme()` and join the `MIGRATED` list from day one — that is why the token layer landed first.

**Tech Stack:** React Native / Expo SDK 57, expo-router 57, jest + @testing-library/react-native.

**Spec:** `docs/design-canvas/home-portals/body-Profile.html` (the achievements grid, the "Next" progress row) and `body-PlayFull.html` (the Top players section). Published canvas: https://claude.ai/code/artifact/bd825a92-5749-49cb-8e6b-3a8b2bde4184

## What the server now provides

Merged to `server/main` today, unpushed:

- **`GET /player/career/:playerId`** gained an `achievements` array alongside `sports` and `bestSport`. Each entry is `{ id, label, earned, progress, target }`, `progress` already clamped to `target` by the server. The list is stable and complete — a locked achievement is returned with `earned: false`, never omitted, because a locked badge is a UI state rather than an absence.
- **`GET /player/rankings?sport=<key>&limit=<1-50>`** returns `{ playerId, firstName, lastName, profileImage?, played, decided, won, winRate }[]`, ranked by win rate. `sport` is **required**. Players below 10 decided matches are excluded by the server, so a one-match 100% player never appears.

`winRate` is a **0-1 fraction** on both, as everywhere else in this codebase. `profileImage` is an **absent key** rather than `null` when the player has none.

## What is deliberately NOT in this plan

**The profile screen's visual overhaul.** `src/app/player/[playerId].tsx` already implements most of `body-Profile.html`: the identity band with ghost initials and avatar, the career card, the recent-matches feed, the titles list and the played-for history. The artboard restyles those (a bigger best-sport hero, a form strip, richer played-for cards) — that is a redesign of working screen furniture and a much larger, riskier change than adding what is missing. This plan adds the achievements block to that screen and leaves the rest alone. The restyle, and migrating that file to tokens, is its own plan.

**Follow and Challenge.** No follower or challenge model exists anywhere on the server. A social feature needing its own design, not a button to draw.

## Global Constraints

- **Paramount: only ADD paths.** The tournament-discovery flow and the existing profile screen must keep working exactly as they do.
- **No new dependencies.**
- **TypeScript strict mode IS enabled** (`mobile/tsconfig.json` `"strict": true`). No line you add may contain `as any`, `: any`, `@ts-ignore`, `console.`, `?? ''` or `|| ''`.
- 2-space indent, single quotes; inline `style={{...}}` objects with shared style constants, matching `src/components/profile/CareerCard.tsx` — not NativeWind.
- **Every new component reads colours from `useTheme()`** (`@/lib/theme`) and is added to `MIGRATED` in `test-utils/colourLiterals.ts`. The fence will fail the build if a literal survives.
- **Anton leading floor:** every Anton style needs `lineHeight / fontSize >= 1.188`. The fence reads ternaries and reports anything it cannot measure; never weaken it, raise the `lineHeight`.
- **44px minimum hit target**; **colour is never the only signal** (DESIGN.md §7).
- Navigation from `expo-router`, never `@react-navigation/*`.
- Run `npx jest` and `npx tsc --noEmit`. **The tsc baseline is exactly 3** `TS2591` errors, in `__tests__/antonLeading.test.ts` and `__tests__/colourLiterals.test.ts`. Zero new; do not fix those 3.
- Commit after every task. Do not push.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/api/career.ts` | **Modify.** `Achievement` type; keep `achievements` off the wire response. |
| `src/api/rankings.ts` | **New.** `RankedPlayer`, `getTopPlayers`. |
| `src/lib/useCareer.ts` | **Modify.** Stop discarding `achievements`. |
| `src/lib/useTopPlayers.ts` | **New.** Local-state hook, `useCareer`'s shape. |
| `src/components/profile/Achievements.tsx` | **New.** The badge grid and the next-milestone row. |
| `src/components/home/TopPlayers.tsx` | **New.** The ranked list. |
| `src/components/home/PlayPortal.tsx` | **Modify.** Render `TopPlayers`. |
| `src/app/player/[playerId].tsx` | **Modify.** Render `Achievements`. Nothing else. |
| `test-utils/colourLiterals.ts` | **Modify.** Add the two new components to `MIGRATED`. |

---

### Task 1: The data layer

**Files:**
- Modify: `src/api/career.ts`, `src/lib/useCareer.ts`
- Create: `src/api/rankings.ts`, `src/lib/useTopPlayers.ts`
- Test: `__tests__/rankingsApi.test.ts`, and add to `__tests__/careerApi.test.ts` (exists)

**Interfaces:**
- Produces: `Achievement`; `CareerProfile` gains `achievements: Achievement[]`; `RankedPlayer`; `getTopPlayers(sport: string, limit?: number): Promise<RankedPlayer[]>`; `useTopPlayers(sport: string)` returning `{ players, loading, error, reload }`.

- [ ] **Step 1: Read the existing idiom first**

`src/api/career.ts` and `__tests__/careerApi.test.ts` are the templates — the `unwrap` helper, the axios-mock-adapter style, and the habit of defaulting a null payload to an empty array so callers never branch on null. Match them. Note `src/api/unwrap.ts` already exists as the shared helper; **do not add a fourth copy of it**.

- [ ] **Step 2: Write the failing tests**

Cover, for `getTopPlayers`:
- it requests `/player/rankings` with `sport`, and with `limit` only when given (so the server owns the default);
- a null payload returns `[]` rather than crashing every caller that maps;
- `winRate` passes through untouched as a fraction — assert `0.68`, not `68`.

And for the career profile:
- `achievements` is returned when present;
- **`achievements` defaults to `[]` when the server omits it** — this is the important one. The server derives achievements outside its cache, but an older server would not send the field at all, and the app must render rather than crash.

- [ ] **Step 3: Run to verify they fail**

- [ ] **Step 4: Implement**

`rankings.ts` mirrors `career.ts`'s shape and doc style. The `Achievement` docblock should record that `progress` is **already clamped to `target` server-side** — so a progress bar renders `progress / target` directly and must not re-clamp, and that the list always contains every achievement including locked ones.

`useTopPlayers(sport)` follows `useCareer`: local state, not a slice, with the same reasoning (a read-only GET scoped to one screen). Reload when `sport` changes.

- [ ] **Step 5: Verify and commit**

`npx jest`, `npx tsc --noEmit` (exactly 3).

```bash
git add -A && git commit -m "feat: achievements on the career profile, and the rankings api"
```

---

### Task 2: The achievements block

**Files:**
- Create: `src/components/profile/Achievements.tsx`
- Modify: `test-utils/colourLiterals.ts`
- Test: `__tests__/Achievements.test.tsx`

**Interfaces:**
- Consumes: `Achievement` from Task 1, `useTheme` from `@/lib/theme`.
- Produces: `Achievements({ achievements, loading, error, onRetry })`.

- [ ] **Step 1: Write the failing test**

Cover:
- an earned badge and a locked badge render differently, and **the difference is announced, not only drawn** — `accessibilityLabel` or visible text must say which, since colour is never the only signal;
- the next-milestone row shows the nearest unearned achievement with its `progress / target`;
- **when everything is earned there is no next-milestone row** — and the component still renders the badges rather than nothing;
- an empty array renders nothing at all rather than an empty shell. `CareerCard` sits above this on the profile and is already empty in that case; a second empty state is the same sentence twice, which `RecentMatches` deliberately avoids too.

- [ ] **Step 2: Run to verify it fails**

- [ ] **Step 3: Implement**

Match `body-Profile.html`: a 4-column grid of badge tiles, each a glyph over a two-line mono caption, locked ones dimmed; then the "Next · <label>" row with a progress bar.

- Use `Icon` from `@/components/icons` — the **industrial** set, since this is content, not nav. Pick existing glyph names; check `src/components/icons/index.tsx` for what exists rather than inventing one, and if a badge has no good glyph say so in your report rather than forcing a wrong one.
- Progress bar width is `progress / target` — the server has already clamped `progress`, so do not clamp again.
- Add `src/components/profile/Achievements.tsx` to `MIGRATED`.

- [ ] **Step 4: Verify and commit**

---

### Task 3: Top players

**Files:**
- Create: `src/components/home/TopPlayers.tsx`
- Modify: `src/components/home/PlayPortal.tsx`, `test-utils/colourLiterals.ts`
- Test: `__tests__/TopPlayers.test.tsx`, and add to `__tests__/PlayPortal.test.tsx`

**Interfaces:**
- Consumes: `RankedPlayer`, `useTopPlayers` from Task 1.
- Produces: `TopPlayers({ sport, onSportChange, viewerId })`.

- [ ] **Step 1: Write the failing test**

Cover:
- rows render in the order given, numbered from 01 — the server has already ranked them, so the component must **not** re-sort;
- `winRate` renders as a percentage from the fraction (`0.92` → `92%`), never recomputed from `won/decided`;
- **the viewer's own row is marked**, and marked in a way a screen reader gets too — the artboard tints it with the auction accent and DESIGN.md §2 assigns that colour to "you" in any list;
- a player with no `profileImage` still renders (the key is absent, not null) — use `InitialsAvatar`, as the rest of the app does;
- the empty state names what would fill it rather than showing a bare "no data";
- an error scopes to this block with a retry, leaving the rest of PLAY alone (DESIGN.md §5).

- [ ] **Step 2: Run to verify it fails**

- [ ] **Step 3: Implement**

Match the Top players section of `body-PlayFull.html`: a section head with a sport chip, then rows of rank / square avatar / name+decided / win rate.

- The sport chip switches between the two sports the app serves. Read `SPORTS` from `@/lib/tournamentConstants` and skip the `'All'` sentinel — a ranking has no "all sports" meaning, since win rates across different sports are not comparable.
- Avatars are **squares** (DESIGN.md §3), 4px radius.
- Add `src/components/home/TopPlayers.tsx` to `MIGRATED`.

Then render it in `PlayPortal` below the recent-matches section. **Change nothing else in that file** — it was verified byte-equal during the token migration and holds the PLAY portal's whole layout.

- [ ] **Step 4: Verify and commit**

---

### Task 4: Achievements onto the profile

**Files:**
- Modify: `src/app/player/[playerId].tsx`
- Test: add to an existing profile test if one exists; otherwise `__tests__/PlayerProfileAchievements.test.tsx`

- [ ] **Step 1: Write the failing test**

- the achievements block renders on the profile when the server sends some;
- it renders nothing when the list is empty, and the rest of the profile is unaffected;
- the surrounding screen — career card, recent matches, titles, played-for list — still renders either way.

- [ ] **Step 2: Run to verify it fails**

- [ ] **Step 3: Implement**

Render `<Achievements … />` between the career card and the recent-matches feed, matching the artboard's order. Feed it from `career.profile?.achievements`.

**This file is not migrated to tokens and this task does not migrate it.** It is full of colour literals and is not in `MIGRATED`; converting it is the separate restyle plan's job. Add your block using `useTheme()` anyway — new code should not add literals even in an unmigrated file — but leave every existing line alone.

- [ ] **Step 4: Verify**

`npx jest`, `npx tsc --noEmit` (exactly 3), and:

```bash
grep -nE "'#[0-9a-fA-F]{3,8}'|'rgba?\(" src/components/profile/Achievements.tsx src/components/home/TopPlayers.tsx
```
Expected: nothing.

- [ ] **Step 5: Commit, then report the device-check list** (do not run `npx expo start`).

---

## Not in this plan

- The profile restyle and its token migration — its own plan, above.
- Explore and Live screens — undesigned; artboards first.
- Light mode — the palette layer is in, the second palette is not.
- `@types/node`, which would take the tsc baseline from 3 to 0.
