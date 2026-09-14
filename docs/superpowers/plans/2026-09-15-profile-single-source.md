# Profile: One Source of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the own-profile tab state a player's match record **once**, from the career ledger, and show the auction price where it is genuinely available — closing PROJECT-STATE §8a items 13 and 14.

**Architecture:** Two aggregates currently answer the same-looking question with different numbers. `/player/auth/stats` sums `TournamentRegistration.stats`, which is **tournament-only**; `/player/career/:playerId` aggregates `MatchParticipation`, which blends tournament **and** quick play. The ledger is the right source — it is what "career" means in this product — so the tournament-only match figures come off the screen. The stats endpoint keeps earning its place for the things the ledger genuinely does not know: how many tournaments, total earnings, highest bid.

**Tech Stack:** React Native / Expo SDK 57, expo-router 57, Redux Toolkit, jest + @testing-library/react-native.

**Spec:** `docs/design-canvas/home-portals/body-Profile.html`. Canvas: https://claude.ai/code/artifact/bd825a92-5749-49cb-8e6b-3a8b2bde4184

## The two facts this plan rests on — both verified

**1. The numbers disagree for a real reason.** `playerAuth.service.ts` builds `/player/auth/stats` as
`totalMatchesPlayed: active.reduce((s, r) => s + (r.stats?.matchesPlayed || 0), 0)` over
`TournamentRegistration` rows. A quick match has no registration, so **every quick match a player
has ever played is missing from that number.** `MatchParticipation` has one row per player per
completed match with a `context` of `'tournament' | 'quick'`, and `summariseBySport` aggregates
over all of them. When a player has quick matches, the strip reads lower than the table — on the
same screen, a foot apart.

**2. The auction price is available on your own profile and deliberately not on anyone else's.**
The authenticated registration history carries `auctionData.soldPrice` (used today by
`src/app/profile/history.tsx`), and `/player/auth/stats` returns `totalEarnings` and `highestBid`.
The **public** payload is an explicit whitelist in `playerAuth.service.ts` that omits `auctionData`
— someone else's purchase price is not yours to see. `PlayedForCard` already takes `soldPrice` as
an optional prop for exactly this asymmetry.

## Global Constraints

- **Paramount: only ADD paths.** The organiser/staff/player tournament flow must not change.
- **No server changes.** Everything needed is already served. If you find otherwise, stop and say so rather than adding an endpoint.
- **No new dependencies.**
- **TypeScript strict mode IS enabled.** No line you add may contain `as any`, `: any`, `@ts-ignore`, `console.`, `?? ''` or `|| ''`.
- 2-space indent, single quotes; inline `style={{...}}` objects — not NativeWind.
- **Every colour from `useTheme()`**; files touched here join `MIGRATED` in `test-utils/colourLiterals.ts`.
- **Anton leading floor:** `lineHeight / fontSize >= 1.188`. The fence reads ternaries and reports what it cannot measure.
- 44px hit targets; colour is never the only signal.
- `winRate` is a **0-1 fraction the server owns** — format with `winPercent` from `@/lib/format`, never recompute. Money with `formatMoney` from the same module.
- Run `npx jest` and `npx tsc --noEmit`. **tsc baseline is exactly 3** `TS2591` errors; zero new.
- Commit after every task. Do not push.

---

### Task 1: Give the own-profile tab a test harness

`src/app/(tabs)/profile.tsx` has **no test at all** — verified. Every later task in this plan changes it, and changing an untested screen is how a regression ships silently. The harness comes first.

**Files:** create `__tests__/OwnProfileScreen.test.tsx`.

- [ ] **Step 1: Read the precedents.** `__tests__/PlayerProfileAchievements.test.tsx` and `__tests__/HomeScreen.test.tsx` both render a screen with mocked data — match whichever is closer. The screen reads `user` and `playerStats` from the auth slice, so it needs a real store with `preloadedState` (this repo builds stores that way; **`redux-mock-store` is not installed and must not be added**).
- [ ] **Step 2: Write tests that pass against the screen AS IT IS TODAY.** This is characterisation, not TDD — you are pinning current behaviour before changing it. Cover: the name and avatar render; the career card renders; the recent-matches feed renders; and the four-cell strip currently shows the `playerStats` figures. That last one will be **deliberately deleted in Task 2** — write it anyway, so the change is visible in the diff rather than silent.
- [ ] **Step 3: Run them — they must PASS.** A failing characterisation test means you have mis-read the screen, not found a bug.
- [ ] **Step 4: Commit.**

---

### Task 2: One set of match figures

**Files:** modify `src/app/(tabs)/profile.tsx`; test `__tests__/OwnProfileScreen.test.tsx`.

- [ ] **Step 1: Write the failing tests.** Cover:
  - the four-cell strip's **Matches / Wins / Rate** cells are gone — no element shows a match count sourced from `playerStats`;
  - `BestSportHero` renders when the server named a best sport, and renders nothing when it did not;
  - the career table is present and is the only place a win rate appears;
  - **tournament-only figures survive**: the tournament count still shows, because the ledger does not know it.
- [ ] **Step 2: Run to verify they fail**, and delete the Task 1 characterisation test that asserted the old strip — its whole purpose was to make this deletion visible, and it has now served it. Say so in your report.
- [ ] **Step 3: Implement.**
  - Remove the Matches / Wins / Rate cells. Add `BestSportHero({ bestSport, recent })` above the career table, exactly as `player/[playerId].tsx` does — the two profiles should now state the record identically.
  - **Keep what the ledger genuinely cannot answer**: the tournament count, and `totalEarnings` / `highestBid` if you can place them without inventing layout. If a figure has no obvious home, leave it out and say so rather than forcing it in.
  - Because a hero now sits above the table, pass `showBestSportBadge={false}` — the same call the public profile makes, and the reason that prop exists.
  - `StatCell` may now be unused on this screen; if nothing else uses it, delete it.
- [ ] **Step 4: Verify.** `npx jest`, `npx tsc --noEmit` (3). **Commit.**

---

### Task 3: The auction price, where it exists

**Files:** modify `src/app/(tabs)/profile.tsx`; test `__tests__/OwnProfileScreen.test.tsx`.

- [ ] **Step 1: Find the data before writing anything.** `src/app/profile/history.tsx` reads `tournamentHistory` from the `registration` slice and sums `e.auctionData?.soldPrice`. Read that slice and its thunk, and confirm what the own-profile tab already has loaded or can load. **Report what you found** — if the own-profile tab would need a new fetch, say so and how expensive it is before adding one.
- [ ] **Step 2: Write the failing tests.** Cover: a played-for entry **with** a sold price renders it, formatted with `formatMoney`; one **without** omits that cell entirely rather than showing a dash or a zero; and the public profile is unaffected — it still passes no price.
- [ ] **Step 3: Run to verify they fail.**
- [ ] **Step 4: Implement.** Render the played-for list with `PlayedForCard`, passing `soldPrice` from the authenticated history. `PlayedForCard` already omits the cell when the prop is absent — do not add a second guard.
- [ ] **Step 5: Verify. Commit.**

---

### Task 4: Take the screen onto tokens

**Files:** modify `src/app/(tabs)/profile.tsx`, `test-utils/colourLiterals.ts`.

- [ ] **Step 1: Count the literals** in the file and record the number.
- [ ] **Step 2: Migrate every one to `useTheme()`** and add the file to `MIGRATED`. The fence then guards it. Change nothing else — no layout, no copy, no behaviour. The tests from Tasks 1-3 must pass **unchanged**; if one needs editing, a substitution was not equal to the literal it replaced.
- [ ] **Step 3: Verify.**

```bash
grep -nE "'#[0-9a-fA-F]{3,8}'|'rgba?\('" "src/app/(tabs)/profile.tsx"
```
Expected: nothing. Then `npx jest`, `npx tsc --noEmit` (3).

- [ ] **Step 4: Commit, then report the device-check list** — do not run `npx expo start`.

---

## Not in this plan

- **The public profile.** It is already single-source and correctly has no auction price.
- **Reconciling `/player/auth/stats` server-side.** This plan stops the app showing two answers; whether that endpoint should itself count quick matches is a separate product question. Note in your report if you think it should.
- **Explore, Live, light mode** — their own plans.
