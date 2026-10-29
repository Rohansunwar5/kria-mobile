# Titles, tournament results and the team league table — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record what every entrant achieved in a tournament category — a structured winner/runner-up title and a placement for everyone else — and build the team league table that ranking a team-mode league depends on.

**Architecture:** One shared helper runs at category completion and does both jobs (titles + per-registration results), called from the four existing award sites; a matching unwind runs from the three reopen sites. Placement comes from the final match for knockouts and from the leaderboard for leagues, which gains a team-row path so team-mode categories can be ranked at all. The app stops parsing title strings and stops matching titles to rows.

**Tech Stack:** Server — Express, Mongoose, TypeScript, vitest (`npx vitest run`). Mobile — Expo React Native, TypeScript, jest (`npx jest`).

**Spec:** `d:\kria\mobile\docs\superpowers\specs\2026-10-28-titles-and-results-design.md`

## Global Constraints

- **`d:\kria\server` is not a git repository.** Only `d:\kria\mobile` is. Commit steps below apply to mobile only; server tasks end at a green test run. There is no revert on the server — do not restructure files a task does not name.
- Both gates must stay green at every task boundary: server `npx tsc --noEmit` + `npx vitest run` (baseline 115 files / 790 tests), mobile `npx tsc --noEmit` + `npx jest` (baseline 124 suites / 976 tests).
- Mobile's working tree has uncommitted work on `main` on top of `7d087de`. Do not stash, reset or checkout; commit only the files a task names.
- League points default to **2 win / 1 draw / 0 loss** where a category carries no `teamLeagueConfig` (spec §4.3).
- Categories live in per-sport collections. Cross-collection reads go through `categoryRepository` / `findCategoryById`, never the legacy `categories` collection.
- Title identity is the pair `(categoryId, place)` — never the rendered string (spec §2).

## Review Focus

Five things the spec implies that no task's happy path exercises. Each has a test added to the task that owns the code.

1. **A category completed with no completed matches** (everyone withdrew, or the organiser completes an empty category) — must write no title and no results, and must not throw; completion is best-effort and may never block. *Task 5.*
2. **A legacy title string whose category name contains " at "** — `"Winner of Mixed at Dusk at HSR Shuttle Cup"`. The regex is **greedy** on the first group, so it splits on the last " at " and the parse must yield category `Mixed at Dusk`, not `Mixed`. *Task 3.*
3. **One player holding entries in two categories of the same tournament** — two independent results and up to two titles; `(categoryId, place)` must not collapse them into one. *Task 5.*
4. **A league or group of one** — a single-entrant category ranks 1 of 1 and has no runner-up to award. *Task 5.*
5. **A cricket league with draws and no-results** — matches completed with no `winnerId` count as drawn for both teams and score `pointsForDraw`, and must not be read as a loss. *Task 1.*

---

### Task 1: Team rows on the category leaderboard (SERVER-GAPS #22)

**Files:**
- Modify: `server/src/repository/match.repository.ts` — add `_buildTeamLeaderboard`, dispatch from `getLeaderboardByCategory` (~153-161)
- Modify: `server/src/services/match.service.ts:690-740` — return the points config with the board
- Test: `server/test/teamLeaderboard.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `matchRepository.getLeaderboardByCategory(categoryId: string, sportType: string, slotNumber?: number)` now returns team rows `{ teamId: string; name: string; played: number; won: number; lost: number; drawn: number; points: number }[]` when the category's matches are team-vs-team, ranked. `GET /matches/leaderboard/:categoryId` gains `pointsConfig: { pointsForWin: number; pointsForLoss: number; pointsForDraw: number }` alongside `leaderboard`.

- [ ] **Step 1: Write the failing tests**

```ts
// server/test/teamLeaderboard.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import '../src/sports/cricket';
// seed a cricket league category + CricketMatch docs carrying teams{team1Id,team1Name,team2Id,team2Name} and winnerId

it('ranks teams by points, then wins, then fewer losses', async () => {
    // Alpha 2W, Bravo 1W 1L, Charlie 2L  → points 4, 2, 0
    const rows = await matchRepository.getLeaderboardByCategory(categoryId, 'cricket');
    expect(rows.map(r => r.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(rows[0]).toMatchObject({ played: 2, won: 2, lost: 0, drawn: 0, points: 4 });
});

// Review Focus 5
it('counts a completed match with no winner as a draw for both teams', async () => {
    const rows = await matchRepository.getLeaderboardByCategory(categoryId, 'cricket');
    expect(rows.find(r => r.name === 'Alpha')).toMatchObject({ drawn: 1, lost: 0, points: 1 });
    expect(rows.find(r => r.name === 'Bravo')).toMatchObject({ drawn: 1, lost: 0, points: 1 });
});

it('leaves player-mode categories on the existing board', async () => {
    const rows = await matchRepository.getLeaderboardByCategory(badmintonSinglesCategoryId, 'badminton');
    expect(rows[0]).toHaveProperty('playerId');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd d:\kria\server && npx vitest run test/teamLeaderboard.test.ts`
Expected: FAIL — rows come back empty (team matches have no `player1.registrationId`).

- [ ] **Step 3: Implement `_buildTeamLeaderboard(categoryId: string, pointsConfig: PointsConfig): Promise<TeamRow[]>` in `match.repository.ts`**

Resolve the collection with the existing `resolveModelByCategory(categoryId)`. Match on `categoryId`, `status: 'completed'`, `isActive: true`, `winReason: { $ne: 'bye' }`, `isTie: { $ne: true }`. Build one row per side from `teams.team1Id/team1Name` and `teams.team2Id/team2Name`; a completed match whose `winnerId` is absent is drawn for both. Points are `won × pointsForWin + drawn × pointsForDraw + lost × pointsForLoss`. Sort points desc, won desc, lost asc, name asc.

- [ ] **Step 4: Dispatch to it from `getLeaderboardByCategory`**

Team mode is a property of the matches, not the sport: before building, `resolveModelByCategory(categoryId).findOne({ categoryId, isActive: true }).select('competitorType')` and take the team path when that is `'team'`. Cricket and badminton `matchType: 'team'` both land there; the existing `_buildPointsLeaderboard` / `_buildGenericLeaderboard` split is untouched for player mode.

- [ ] **Step 5: Return the points config from `match.service.ts getLeaderboard`**

Read `teamLeagueConfig.pointsForWin/pointsForLoss/pointsForDraw` off the category, defaulting to 2/1/0 per the Global Constraints, and include it as `pointsConfig` in both the slotted and unslotted `SuccessResponse` payloads so the app can label the column instead of assuming it.

- [ ] **Step 6: Run the tests and the server gates**

Run: `cd d:\kria\server && npx vitest run test/teamLeaderboard.test.ts && npx tsc --noEmit && npx vitest run`
Expected: new tests PASS, tsc silent, 115+ files green.

---

### Task 2: Round depth

**Files:**
- Create: `server/src/shared/results/roundDepth.ts`
- Test: `server/test/roundDepth.test.ts`

**Interfaces:**
- Consumes: nothing. Pure functions, no database.
- Produces:
  - `roundDepth(roundName: string): number | null` — 0 is the final, larger is earlier. `null` when the name is not a knockout round (e.g. `'League'`).
  - `koRoundDepth(bracketRound: string, lastRound: number): number | null` — for team-league `…-KO-R{n}` names, depth counted back from `lastRound`.

- [ ] **Step 1: Write the failing test**

```ts
// server/test/roundDepth.test.ts
import { describe, expect, it } from 'vitest';
import { roundDepth, koRoundDepth } from '../src/shared/results/roundDepth';

it('reads depth off getRoundNames output', () => {
    expect(roundDepth('Final')).toBe(0);
    expect(roundDepth('Semi-Final')).toBe(1);
    expect(roundDepth('Quarter-Final')).toBe(2);
    expect(roundDepth('Round of 16')).toBe(3);
    expect(roundDepth('Round of 32')).toBe(4);
});

it('puts a preliminary round before any named round', () => {
    expect(roundDepth('Preliminary Round')).toBe(Number.MAX_SAFE_INTEGER);
});

it('is null for anything that is not a knockout round', () => {
    expect(roundDepth('League')).toBeNull();
    expect(roundDepth('S1-KO-R2')).toBeNull();
});

it('counts team-league knockout rounds back from the last one', () => {
    expect(koRoundDepth('S1-KO-R3', 3)).toBe(0);
    expect(koRoundDepth('S1-KO-R1', 3)).toBe(2);
    expect(koRoundDepth('League', 3)).toBeNull();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd d:\kria\server && npx vitest run test/roundDepth.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement both functions**

`roundDepth` mirrors `getRoundNames` (`server/src/shared/bracket/roundNames.ts`): `Final` 0, `Semi-Final` 1, `Quarter-Final` 2, `Round of N` → `log2(N) - 1`. Keep the two in the same shape — a new name in `getRoundNames` must be addable here in one line.

- [ ] **Step 4: Run it to verify it passes**

Run: `cd d:\kria\server && npx vitest run test/roundDepth.test.ts`
Expected: PASS.

---

### Task 3: Titles become objects

**Files:**
- Modify: `server/src/models/player.model.ts:122-127,172` — `titles` to `[Schema.Types.Mixed]`
- Create: `server/src/shared/results/titles.ts` — the `Title` type and `normaliseTitle`
- Modify: `server/src/repository/player.repository.ts:125-146` — `addTitle`, `removeTitlesForCategory`
- Test: `server/test/titleShape.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Title = { place: 'winner' | 'runner_up'; tournamentId?: string; categoryId?: string; tournamentName?: string; categoryName?: string; sport?: string; awardedAt?: Date }`
  - `normaliseTitle(raw: unknown): Title | null` — passes objects through, parses legacy strings, `null` for anything else.
  - `playerRepository.addTitle(playerId: string, title: Title): Promise<void>`
  - `playerRepository.removeTitlesForCategory(playerId: string, categoryId: string): Promise<void>` — removes both places.

- [ ] **Step 1: Write the failing tests**

```ts
// server/test/titleShape.test.ts
it('keeps one title per category and place', async () => {
    await playerRepository.addTitle(id, { place: 'winner', categoryId: 'c1', tournamentName: 'Cup', categoryName: 'MS', awardedAt: new Date() });
    await playerRepository.addTitle(id, { place: 'winner', categoryId: 'c1', tournamentName: 'Cup', categoryName: 'MS', awardedAt: new Date() });
    const p = await Player.findById(id).lean();
    expect(p!.titles).toHaveLength(1);
});

it('holds a winner and a runner-up for different categories', async () => {
    await playerRepository.addTitle(id, { place: 'winner', categoryId: 'c1' });
    await playerRepository.addTitle(id, { place: 'runner_up', categoryId: 'c2' });
    expect((await Player.findById(id).lean())!.titles).toHaveLength(2);
});

it('removes both places for one category and leaves others', async () => {
    await playerRepository.removeTitlesForCategory(id, 'c1');
    const left = (await Player.findById(id).lean())!.titles;
    expect(left.every((t: any) => t.categoryId !== 'c1')).toBe(true);
});

it('reads a legacy string as a winner title', () => {
    expect(normaliseTitle('Winner of Mens Doubles at HSR Shuttle Cup'))
        .toEqual({ place: 'winner', categoryName: 'Mens Doubles', tournamentName: 'HSR Shuttle Cup' });
});

// Review Focus 2
it('keeps a category name that itself contains " at "', () => {
    expect(normaliseTitle('Winner of Mixed at Dusk at HSR Shuttle Cup'))
        .toMatchObject({ categoryName: 'Mixed at Dusk', tournamentName: 'HSR Shuttle Cup' });
});

it('is null for a string it cannot read', () => {
    expect(normaliseTitle('Some organiser freetext')).toBeNull();
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd d:\kria\server && npx vitest run test/titleShape.test.ts`
Expected: FAIL — `normaliseTitle` not defined; `addTitle` takes a string.

- [ ] **Step 3: Widen the model**

`titles: [mongoose.Schema.Types.Mixed]`, interface `titles?: (string | Title)[]`. Mixed is required, not a preference: a typed sub-schema rejects every legacy string already in the collection (spec, Implementation notes).

- [ ] **Step 4: Implement `normaliseTitle` in `shared/results/titles.ts`**

Objects pass through. A string is parsed with `/^Winner of (.+) at (.+)$/` — **greedy first group**, which splits on the last " at " and is what makes Review Focus 2 pass. (Corrected 2026-10-28: an earlier draft said lazy, which splits on the FIRST " at " and fails that test.) No match, or any other type, is `null`.

- [ ] **Step 5: Reshape the repository methods**

`addTitle` is `$pull` on `{ categoryId, place }` then `$push` the title — two ops, because Mongo will not do both in one update and `$addToSet` cannot dedupe objects carrying a timestamp. `removeTitle(id, string)` is replaced by `removeTitlesForCategory(id, categoryId)`, a `$pull` on `{ categoryId }`.

- [ ] **Step 6: Run the tests**

Run: `cd d:\kria\server && npx vitest run test/titleShape.test.ts && npx tsc --noEmit`
Expected: PASS, tsc silent.

The five existing call sites (four award, one unwind) pass strings and will not compile against the new signatures. Adapt them mechanically **in this task** — build the `Title` from what each site already holds, and swap `removeTitle(id, string)` for `removeTitlesForCategory(id, categoryId)` — so the tree compiles and the suite stays green at this boundary, per the Global Constraints. Tasks 6 and 7 then replace those blocks wholesale with the helper. `test/badmintonReopen.test.ts` asserts on title **strings**; move its assertions to the object shape here.

---

### Task 4: Result storage on the registration

**Files:**
- Modify: `server/src/models/tournamentRegistration.model.ts` — add `result`
- Modify: `server/src/repository/tournamentRegistration.repository.ts:48` — add `getByTeamAndCategory`, `setResult`, `clearResultsForCategory`
- Test: `server/test/registrationResult.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type EntryResult = { kind: 'winner' | 'runner_up' | 'knockout' | 'group'; round?: string; position?: number; outOf?: number; groupName?: string }`
  - `tournamentRegistrationRepository.setResult(registrationId: string, result: EntryResult): Promise<void>`
  - `tournamentRegistrationRepository.clearResultsForCategory(categoryId: string): Promise<void>`
  - `tournamentRegistrationRepository.getByTeamAndCategory(teamId: string, categoryId: string): Promise<ITournamentRegistration[]>`

- [ ] **Step 1: Write the failing tests**

```ts
it('stores and clears a result', async () => {
    await repo.setResult(regId, { kind: 'knockout', round: 'Quarter-Final' });
    expect((await TournamentRegistration.findById(regId).lean())!.result)
        .toMatchObject({ kind: 'knockout', round: 'Quarter-Final' });
    await repo.clearResultsForCategory(categoryId);
    expect((await TournamentRegistration.findById(regId).lean())!.result).toBeFalsy();
});

it('scopes a team lookup to one category', async () => {
    // same team, two categories of one tournament
    const rows = await repo.getByTeamAndCategory(teamId, categoryA);
    expect(rows).toHaveLength(1);
    expect(String(rows[0].categoryId)).toBe(categoryA);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd d:\kria\server && npx vitest run test/registrationResult.test.ts`
Expected: FAIL — methods not defined.

- [ ] **Step 3: Add the schema field and the three methods**

`result` is an optional sub-document matching `EntryResult`. `getByTeamAndCategory` exists because `getByTeam(teamId)` filters on team alone — using it to award a team title hands the title to every registration that team holds across all of the tournament's categories (spec, Implementation notes). Leave `getByTeam` as it is; the public team roster calls it.

- [ ] **Step 4: Run the tests**

Run: `cd d:\kria\server && npx vitest run test/registrationResult.test.ts && npx tsc --noEmit`
Expected: PASS, tsc silent.

---

### Task 5: The completion helper

**Files:**
- Create: `server/src/shared/results/recordCategoryResults.ts`
- Test: `server/test/recordCategoryResults.test.ts`

**Interfaces:**
- Consumes: Task 2 `roundDepth`/`koRoundDepth`, Task 3 `addTitle`, Task 4 `setResult`/`getByTeamAndCategory`, Task 1 `getLeaderboardByCategory`.
- Produces: `recordCategoryResults(args: { category: { _id: string; tournamentId: string; name: string; sport?: string; bracketType?: string; matchType?: string; teamLeagueConfig?: unknown }; tournament: { _id: string; name: string }; matches: unknown[] }): Promise<void>` — awards both titles and writes every entrant's result. Never throws; callers keep their existing try/catch.

- [ ] **Step 1: Write the failing tests**

```ts
it('gives the knockout final its winner and runner-up', async () => { /* both titles, correct categoryId + awardedAt */ });

it('records how far each knockout entrant got', async () => {
    // beaten quarter-finalist
    expect(result(regId)).toMatchObject({ kind: 'knockout', round: 'Quarter-Final' });
});

it('takes a player league winner off the leaderboard, not an arbitrary match', async () => {
    // 3-player round robin where the first-created match is NOT won by the table leader
    expect(titleOf(leaderPlayerId)).toMatchObject({ place: 'winner' });
    expect(titlesOf(otherMatchWinnerId)).toHaveLength(0);
});

it('ranks a team-mode league off the team table', async () => {
    expect(result(regOnSecondTeam)).toMatchObject({ kind: 'group', position: 2, outOf: 3 });
});

// Review Focus 1
it('writes nothing and does not throw for a category with no completed matches', async () => {
    await expect(recordCategoryResults({ category, tournament, matches: [] })).resolves.toBeUndefined();
    expect((await Player.findById(playerId).lean())!.titles ?? []).toHaveLength(0);
});

// Review Focus 3
it('keeps two categories of one tournament independent', async () => {
    // player wins category A, goes out in the semis of category B
    expect(titlesOf(playerId)).toHaveLength(1);
    expect(result(regInB)).toMatchObject({ kind: 'knockout', round: 'Semi-Final' });
});

// Review Focus 4
it('ranks a single-entrant category 1 of 1 with no runner-up', async () => {
    expect(result(onlyReg)).toMatchObject({ position: 1, outOf: 1 });
    expect(titlesOf(onlyPlayerId).filter(t => t.place === 'runner_up')).toHaveLength(0);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd d:\kria\server && npx vitest run test/recordCategoryResults.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the winner/runner-up half**

Follow spec §4.1's table exactly. A knockout decider is `bracketRound === 'Final'`; **do not** fall back to `!m.nextMatchId`, which is true of every league match and is the live bug this closes. A player league takes 1st and 2nd off `getLeaderboardByCategory`; a team-mode league takes them off Task 1's rows. Where no winner can be named, award none and carry on to results. Titles snapshot `tournamentName`, `categoryName`, `sport` and `awardedAt` at write time (spec §1). Team titles use `getByTeamAndCategory`.

- [ ] **Step 4: Implement the results half**

Per spec §5. Winner and runner-up get `kind: 'winner' | 'runner_up'`. A knockout entrant gets the name of the deepest round they lost in, by `roundDepth`. A league entrant gets `kind: 'group'` with `position` and `outOf` from the board, and `groupName` only where one exists. Team league follows §4.2: `koRoundDepth` for a knockout-stage exit, group position otherwise. An entrant with no completed match gets no result.

- [ ] **Step 5: Run the tests and the gates**

Run: `cd d:\kria\server && npx vitest run test/recordCategoryResults.test.ts && npx tsc --noEmit`
Expected: PASS, tsc silent.

---

### Task 6: Wire the four award sites

**Files:**
- Modify: `server/src/sports/badminton/services/badmintonCategory.service.ts:152-192`
- Modify: `server/src/sports/cricket/services/cricketCategory.service.ts:136-161`
- Modify: `server/src/sports/badminton/services/teamLeague.service.ts` ~890-905 and ~1287-1299
- Test: `server/test/categoryCompletionTitles.test.ts`

**Interfaces:**
- Consumes: Task 5 `recordCategoryResults`.
- Produces: nothing new. All four sites now call one helper in place of their inline title block.

- [ ] **Step 1: Write the failing tests**

```ts
it('awards from badminton category completion', async () => { /* winner + runner-up titles, results on all entrants */ });
it('awards from cricket category completion', async () => { /* team title via getByTeamAndCategory */ });
it('awards from a manually completed team league', async () => {
    // badmintonCategory.completeCategory on a TEAM_LEAGUE category — today it skips titles entirely
    expect(resultsFor(categoryId).length).toBeGreaterThan(0);
});
it('still completes the category when the helper throws', async () => {
    // completion is best-effort; a results failure must never strand a category
    expect((await category()).status).toBe('completed');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd d:\kria\server && npx vitest run test/categoryCompletionTitles.test.ts`

- [ ] **Step 3: Replace each inline title block with the helper call**

Keep every site's existing try/catch and its log line — completion stays best-effort (spec, Anti-goals). Remove the `bracketType !== TEAM_LEAGUE` guard in `badmintonCategory.service.ts` so a manually completed team league gets results too (spec §4.2).

- [ ] **Step 4: Run the tests and the full server suite**

Run: `cd d:\kria\server && npx vitest run && npx tsc --noEmit`
Expected: all green.

---

### Task 7: Wire the three unwind sites

**Files:**
- Modify: `server/src/sports/badminton/services/badmintonMatch.service.ts:200-215,436-465` — change the trigger, replace `revokeCategoryTitle`
- Modify: `server/src/sports/cricket/services/cricketMatch.service.ts:784-792` — add the unwind
- Modify: `server/src/sports/badminton/services/teamLeague.service.ts` — add the unwind to its reopen path
- Test: `server/test/categoryReopenUnwind.test.ts`

**Interfaces:**
- Consumes: Task 3 `removeTitlesForCategory`, Task 4 `clearResultsForCategory`.
- Produces: `unwindCategoryResults(categoryId: string): Promise<void>` in `shared/results/recordCategoryResults.ts` — pulls both titles from every entrant and clears every result for the category.

- [ ] **Step 1: Write the failing tests**

```ts
it('takes back both titles and every result when a badminton final reopens', async () => { /* … */ });
it('takes them back when a cricket final reopens', async () => { /* cricket has no unwind today */ });
it('leaves a category alone when the reopen did not reopen it', async () => { /* non-final match in an ongoing category */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd d:\kria\server && npx vitest run test/categoryReopenUnwind.test.ts`
Expected: the cricket test FAILS loudest — that path revokes nothing today.

- [ ] **Step 3: Change the badminton trigger**

The guard becomes **"did this reopen put the category back to ongoing?"** — the value both reopen paths already compute — not `isFinal = bracketRound === 'Final' || !match.nextMatchId`, which is true of every match in a league (spec §6).

- [ ] **Step 4: Add the unwind to cricket and team league**

`cricketMatch.service.ts` already computes `categoryReopened` (~786). Call `unwindCategoryResults` there, and from team league's reopen, with the same catch-and-log the badminton site uses.

- [ ] **Step 5: Run the tests and the full suite**

Run: `cd d:\kria\server && npx vitest run && npx tsc --noEmit`

---

### Task 8: Serve titles and results

**Files:**
- Modify: `server/src/services/playerAuth.service.ts` — `_buildTournamentHistory` row map, `getPublicProfile` (~379) row map and its `titles`
- Test: `server/test/profileTitlesAndResults.test.ts`

**Interfaces:**
- Consumes: Task 3 `normaliseTitle`, Task 4's `result` field.
- Produces: `GET /player/auth/public/:id` returns `titles` as `Title[]` and history rows carrying `result`; `GET /player/auth/tournament-history` rows carry `result`.

- [ ] **Step 1: Write the failing tests**

```ts
it('serves legacy strings as objects', async () => {
    // player seeded with a raw string title
    expect(res.data.player.titles[0]).toMatchObject({ place: 'winner', tournamentName: 'HSR Shuttle Cup' });
});
it('carries result on my own history rows', async () => { /* … */ });
it('carries result on another player public profile rows', async () => { /* the second, PII-stripped map */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd d:\kria\server && npx vitest run test/profileTitlesAndResults.test.ts`

- [ ] **Step 3: Map `result` into both row builders and normalise `titles` on read**

Both builders list their fields explicitly, so `result` must be named in each or it will not appear. `getPublicProfile` is the one that is easy to miss — without it every row on *other* players' profiles regresses to "Completed" once Task 10 deletes the title match (spec §7). `result` carries no personal data.

- [ ] **Step 4: Run the tests and the gates**

Run: `cd d:\kria\server && npx vitest run && npx tsc --noEmit`
Expected: full suite green. This is the last server task — the server is now complete and consistent on its own.

---

### Task 9: App — titles as objects

**Files:**
- Modify: `mobile/src/api/profileApi.ts:12` — `titles: Title[]`
- Modify: `mobile/src/lib/awardsView.ts:57-67,157,164-167` — `titleAward`, featured pick
- Modify: `mobile/src/app/(tabs)/awards.tsx`, `mobile/src/app/(tabs)/profile.tsx`, `mobile/src/app/player/[playerId].tsx`, `mobile/src/app/profile/history.tsx` — the `titles: string[]` state types
- Test: `mobile/__tests__/awardsView.test.ts`

**Interfaces:**
- Consumes: Task 8's response shape.
- Produces: `titleAward(title: Title, i: number): Award`.

- [ ] **Step 1: Write the failing tests**

```ts
it('renders a runner-up in silver', () => {
    expect(titleAward({ place: 'runner_up', categoryName: 'MS', tournamentName: 'Cup' }, 0))
        .toMatchObject({ metal: 'silver', name: 'Runner-up · MS', tier: 'Tournament title' });
});
it('renders a winner in gold', () => {
    expect(titleAward({ place: 'winner', categoryName: 'MD', tournamentName: 'Cup' }, 0))
        .toMatchObject({ metal: 'gold', name: 'Champion · MD' });
});
it('features a winner over a newer runner-up', () => {
    const a = buildAwards({ titles: [winnerLastYear, runnerUpToday], /* … */ });
    expect(a.featured!.award.metal).toBe('gold');
});
it('features the newest by awardedAt among winners', () => { /* … */ });
it('survives a legacy title with no ids or date', () => {
    expect(titleAward({ place: 'winner', categoryName: 'MS', tournamentName: 'Cup' }, 0).earned).toBe(true);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd d:\kria\mobile && npx jest __tests__/awardsView.test.ts`

- [ ] **Step 3: Rewrite `titleAward` against the object and delete the regex**

Runner-up copy is fixed by the spec §8: name `Runner-up · <category>`, context the tournament, tier `Tournament title`, description `Lost the final at <tournament>.`, criteria `Reach a tournament category final`. Winner copy is unchanged. A title with a `tournamentId` becomes tappable; one without stays inert.

- [ ] **Step 4: Change the featured pick**

Prefer a winner over a runner-up; within a place, newest `awardedAt` first. A title with no `awardedAt` (legacy) sorts last.

- [ ] **Step 5: Run the tests, then the gates**

Run: `cd d:\kria\mobile && npx jest && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
cd d:\kria\mobile
git add src/api/profileApi.ts src/lib/awardsView.ts src/app/(tabs)/awards.tsx src/app/(tabs)/profile.tsx "src/app/player/[playerId].tsx" src/app/profile/history.tsx __tests__/awardsView.test.ts
git commit -m "feat(awards): titles as structured data, runner-up shield"
```

---

### Task 10: App — the result line

**Files:**
- Modify: `mobile/src/lib/profileView.ts:72-98` — `RowEntry`, `tournamentRow`
- Modify: `mobile/src/components/profile/ProfileSections.tsx:275` and its `titles` prop
- Modify: `mobile/src/app/(tabs)/profile.tsx:138`, `mobile/src/app/player/[playerId].tsx:122`, `mobile/src/app/profile/history.tsx` — drop the prop
- Test: `mobile/__tests__/profileView.test.ts`

**Interfaces:**
- Consumes: Task 8's `result` on history rows.
- Produces: `tournamentRow(e: RowEntry)` — one argument; the `titles` parameter is gone.

- [ ] **Step 1: Write the failing tests**

```ts
it('words each result', () => {
    expect(row({ result: { kind: 'winner' } }).result).toMatchObject({ text: 'Winner', color: colors.gold });
    expect(row({ result: { kind: 'runner_up' } }).result).toMatchObject({ text: 'Runner-up', color: colors.silver });
    expect(row({ result: { kind: 'knockout', round: 'Quarter-Final' } }).result.text).toBe('Quarter-final');
    expect(row({ result: { kind: 'knockout', round: 'Round of 16' } }).result.text).toBe('Round of 16');
    expect(row({ result: { kind: 'group', position: 3, groupName: 'A' } }).result.text).toBe('3rd in group');
    expect(row({ result: { kind: 'group', position: 3, outOf: 12 } }).result.text).toBe('3rd of 12');
});
it('falls back for an entry with no result', () => {
    expect(row({ tournament: { status: 'ongoing' } }).result.text).toBe('In progress');
    expect(row({ tournament: { status: 'completed' } }).result.text).toBe('Completed');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd d:\kria\mobile && npx jest __tests__/profileView.test.ts`

- [ ] **Step 3: Read `result` and delete the title match**

Wording is spec §8's table. "Quarter-Final" lowercases after the first word — "Quarter-final", "Semi-final" — while "Round of 16" keeps its number. An ordinal helper gives 1st/2nd/3rd/Nth. The `titles.includes(\`Winner of …\`)` line goes, and with it `tournamentRow`'s second parameter and the `titles` prop threaded through four files.

- [ ] **Step 4: Run the tests, then the gates**

Run: `cd d:\kria\mobile && npx jest && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
cd d:\kria\mobile
git add src/lib/profileView.ts src/components/profile/ProfileSections.tsx src/app/(tabs)/profile.tsx "src/app/player/[playerId].tsx" src/app/profile/history.tsx __tests__/profileView.test.ts
git commit -m "feat(profile): show how far a player got in each tournament"
```

---

### Task 11: App — the league table from the server

**Files:**
- Modify: `mobile/src/api/leaderboard.ts` — carry team rows and `pointsConfig`
- Modify: `mobile/src/lib/standingsView.ts:28-46` — `teamTable` reads the server's rows
- Modify: `mobile/src/app/tournament/[id]/matches.tsx` — the Pts column
- Test: `mobile/__tests__/standingsView.test.ts`

**Interfaces:**
- Consumes: Task 1's `leaderboard` team rows and `pointsConfig`.
- Produces: `teamTable(rows: TeamRow[], myTeamId?: string): TableRow[]` — maps the server's rows, no longer counts matches.

- [ ] **Step 1: Write the failing tests**

```ts
it('maps the server rows in the order they arrive', () => {
    const t = teamTable([{ teamId: 'b', name: 'Bravo', played: 2, won: 1, lost: 1, drawn: 0, points: 2 }], 'b');
    expect(t[0]).toMatchObject({ rank: 1, name: 'Bravo', p: 2, w: 1, l: 1, d: 0, pts: 2, mine: true });
});
it('is empty when the category has no table yet', () => expect(teamTable([])).toEqual([]));
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd d:\kria\mobile && npx jest __tests__/standingsView.test.ts`

- [ ] **Step 3: Rewrite `teamTable` as a mapping and add the Pts column**

The server ranks; the app renders. `TableRow` gains `pts`. `teamLeagueTable` (stage-group standings) is untouched. **Expect the on-screen order to change** wherever draws exist — the old client-side table ranked by wins, the server ranks by points (spec §4.3).

- [ ] **Step 4: Run the tests, then the gates**

Run: `cd d:\kria\mobile && npx jest && npx tsc --noEmit`
Expected: 124+ suites green, tsc silent.

- [ ] **Step 5: Commit**

```bash
cd d:\kria\mobile
git add src/api/leaderboard.ts src/lib/standingsView.ts "src/app/tournament/[id]/matches.tsx" __tests__/standingsView.test.ts
git commit -m "feat(tournament): read the league table from the server, with points"
```

---

### Task 12: Close the gaps in the log

**Files:**
- Modify: `d:\kria\SERVER-GAPS.md` — mark #9, #10 and #22 closed

- [ ] **Step 1: Mark the three entries**

Append ` — ✅ closed 2026-10-28` to each heading and a `- **Done (2026-10-28):**` line describing what shipped, matching the format the 14 entries closed on 2026-10-27 already use. Update the counts in the summary block at the top: 17 closed, 20 open.

- [ ] **Step 2: Commit**

SERVER-GAPS.md lives in `d:\kria`, which is **not** a git repository — there is nothing to commit. Leave the file saved.
