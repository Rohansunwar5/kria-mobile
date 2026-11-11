# Groups, then a knockout (SERVER-GAPS #12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Badminton singles and doubles `hybrid` categories play groups, then a knockout drawn automatically from each group's top finishers, shown on the organiser web client and on the app's 2e/2f screens.

**Architecture:** Group matches are ordinary bracket matches whose `bracketRound` is the group's name ("Group A"). Pure helpers in `server/src/shared/bracket/groups.ts` deal groups, build group tables and seed the qualifiers. The existing knockout generator gains a seeded mode. One completion rule replaces the per-route `!nextMatchId` trigger: when a match with no next match is decided and nothing in the category is left, a finished group stage draws the knockout and anything else completes.

**Tech Stack:** Node/Express/Mongoose with vitest (server); React + Vite with vitest (client); Expo/React Native with jest (mobile).

**Spec:** `mobile/docs/superpowers/specs/2026-11-11-hybrid-groups-design.md`

## Global Constraints

- Three repos: `d:\kria\server`, `d:\kria\client`, `d:\kria\mobile`. **Never run git commit, push, stash or checkout.** The user commits. Each task ends with its gate, not a commit.
- Write each test first and watch it fail.
- Group round names: exactly `Group A` … `Group Z` (regex `/^Group [A-Z]$/`). A flat league stays `League`. "League round" means either.
- Group points: 2 for a win, 0 for a loss.
- Copy, verbatim:
  - topN validation: "Fewer must qualify than play in each group."
  - Reopen refusal: "Cannot reopen: the knockout has started. Correct the knockout first."
  - Swap refusal: "Swap works on knockout matches only. Redraw to change the draw."
  - Organiser line before the knockout: "The knockout is drawn when every group match is done."
  - App rule line: "2 points for a win. Level players split by head-to-head, then games, then points."
  - Cut line: "{roundLabel(knockoutRound)} line", e.g. "Quarter-final line".
  - Formats: "Groups → knockouts" (format line); "Groups of {leagueSize}, top {topN} to knockouts" (2b fact); how-it-works step "Groups, then knockouts" / "Groups of {leagueSize} play each other; the top {topN} go through."
- Server files are often CRLF. Use the edit tool, not `sed`, for multi-line edits. There's no Python on this machine.
- Mobile: `npm install` is never needed for this plan. Icons are unchanged.
- Subagents stop only processes they started (never `taskkill /IM node.exe`).

## Review Focus

1. **A hybrid category drawn before this change** (flat `League` rounds, no groups): the server sends no `groups`, the app falls back to the players table, and the category completes after its last match, not its first. Pinned in Tasks 6 and 9.
2. **Doubles hybrid:** groups and knockout carry pair sides ("A / B"), and both partners get their result. Pinned in Tasks 2 and 6.
3. **A non-bye walkover in a group** counts as a win with no games, and a bye never counts. Pinned in Task 1.
4. **A group smaller than `topN`** (13 entries, size 4 → 4,3,3,3 with topN 3): the whole small group qualifies. Pinned in Task 1.
5. **Two last group results at once** both try to draw the knockout; exactly one knockout exists afterwards. Pinned in Task 3.

---

## Server

### Task 1: Group helpers (pure)

**Files:**
- Create: `server/src/shared/bracket/groups.ts`, `server/src/shared/bracket/seedOrder.ts`
- Modify: `server/src/shared/bracket/index.ts` (export the new names); `server/src/sports/badminton/services/teamLeague.service.ts:1128-1141` (delete `_seedOrder`, call `seedOrder`)
- Test: `server/test/hybridGroups.test.ts`

**Interfaces:**
- Produces:
  - `seedOrder(size: number): number[]`, moved unchanged from `teamLeague.service._seedOrder`.
  - `isGroupRound(name?: string): boolean`, which is `/^Group [A-Z]$/`.
  - `isLeagueRound(name?: string): boolean`, which is `name === 'League' || isGroupRound(name)`.
  - `groupName(i: number): string`, giving `Group A` for 0.
  - `dealGroups<T extends PlayerCompetitor>(players: T[], groupSize: number): T[][]`.
  - `interface GroupRow { registrationId: string; name: string; teamId?: string; teamName?: string; played: number; won: number; lost: number; points: number }`
  - `interface GroupTable { name: string; rows: GroupRow[] }`
  - `groupTables(matches: GroupMatchLike[]): GroupTable[]`. `GroupMatchLike` is the subset `{ bracketRound?, status?, winReason?, winnerId?, player1?, player2?, gameScores? }`. Groups are ordered by name, and only group-round matches are read.
  - `qualifierCount(tables: GroupTable[], topN: number): number`
  - `seedQualifiers(tables: GroupTable[], topN: number): PlayerCompetitor[]`, in seed order (index 0 is seed 1).
  - `knockoutRoundName(qualifiers: number): string`, which is `getRoundNames(log2(S), S - qualifiers)[0]` for S = the next power of two.

- [ ] **Step 1: Write the failing tests** in `server/test/hybridGroups.test.ts`. Build matches as plain objects, with no database.
  - `dealGroups`:
    - 13 players, size 4 → group sizes `[4,3,3,3]`.
    - 8 players from 2 teams (4 each), size 4 → each group holds 2 of each team.
    - 4 players, size 4 → one group.
  - `groupTables`:
    - Every member has a row before any match is played (`played: 0`).
    - A win is 2 points and a loss 0. `lost` counts.
    - Two players level on points are ordered by their own match: A beat B, B has the better game difference, and A is still first.
    - Three level on points (A beats B, B beats C, C beats A) are ordered by game difference, then point difference, then name.
    - A `walkover` with `winReason: 'walkover'` and a winner counts as played and won, with no games. A `walkover` with `winReason: 'bye'` counts for nothing.
    - `scheduled` and `in_progress` matches count for nothing.
  - `seedQualifiers` (build tables with fixed rows):
    - 2 groups, topN 2 → names in seed order `['A1','B1','A2','B2']`. With `seedOrder(4) = [1,4,2,3]`, the first round is A1 v B2 and B1 v A2.
    - 4 groups, topN 2 → in the 8-draw, every X1 and X2 sit in opposite halves (positions from `seedOrder(8)`, half = `pos < 4`).
    - 3 groups, topN 2 → 6 qualifiers. Seeds 1 and 2 are A1 and B1, so they get the byes, and no first-round match pairs two players from the same group.
    - topN 3 with groups of 4,3,3,3 → 12 qualifiers (each group's top 3).
  - `knockoutRoundName`: 8 → `'Quarter-Final'`, 4 → `'Semi-Final'`, 6 → `'Quarter-Final'`, 2 → `'Final'`, 5 → `'Preliminary Round'`.
  - `isLeagueRound('League')`, `isLeagueRound('Group C')`, `!isLeagueRound('Semi-Final')`, `!isGroupRound('Group AB')`.

- [ ] **Step 2: Run** `cd server && npx vitest run test/hybridGroups.test.ts`. Expected: FAIL, because the module isn't found.

- [ ] **Step 3: Implement `groups.ts` and `seedOrder.ts`.**
  - **`dealGroups`:**
    - A Fisher-Yates shuffle.
    - Then a stable sort by `teamId ?? ''`, so team-mates sit next to each other in the dealing order.
    - Then player `i` goes to group `i % G`, with `G = ceil(n / groupSize)`.
  - **`groupTables`:**
    - Rows are keyed by `registrationId`, seeded from both sides of every group match except a `'TBD'` side.
    - A side wins when `String(winnerId) === registrationId`.
    - Games come from `gameScores`: a game is won when `myScore > theirScore`. Points come from the sum of the scores.
    - The sort is points, then a two-way head-to-head (only when exactly two rows share a points total and they have a decided match), then game difference, then point difference, then `name.localeCompare`.
  - **`seedQualifiers`** is greedy separation:

```ts
const size = 2 ** Math.ceil(Math.log2(Math.max(2, qualifierCount(tables, topN))));
const pos = new Map(seedOrder(size).map((seed, i) => [seed, i]));   // seed → bracket position
const meet = (a: number, b: number) => Math.floor(Math.log2(a ^ b)) + 1; // round two positions meet in (higher = later)
const placed: { seed: number; group: number; row: GroupRow }[] = [];
let first = 1;
for (let place = 0; place < topN; place++) {
  const band = tables.map((t, g) => ({ g, row: t.rows[place] })).filter((x) => x.row);
  const free = band.map((_, i) => first + i);
  for (const { g, row } of band) {
    const mates = placed.filter((p) => p.group === g).map((p) => pos.get(p.seed)!);
    const score = (s: number) => Math.min(Infinity, ...mates.map((m) => meet(pos.get(s)!, m)));
    const seed = free.reduce((best, s) => (score(s) > score(best) ? s : best));   // ties keep the lower seed
    free.splice(free.indexOf(seed), 1);
    placed.push({ seed, group: g, row });
  }
  first += band.length;
}
// return placed sorted by seed, mapped to { registrationId, name, teamId, teamName }
```

- [ ] **Step 4: Run** the test again, and the team league's tests (`npx vitest run test/hybridGroups.test.ts test/teamLeague*`). Expected: PASS.

- [ ] **Step 5: Gate:** `npx tsc --noEmit -p .` is clean.

### Task 2: Draw the group stage

**Files:**
- Modify: `server/src/shared/bracket/groups.ts` (add `generateGroupStage`)
- Modify: `server/src/sports/badminton/adapters/categoryAdapter.ts:36-40` (validation) and `:125-137` (the hybrid branch for individual mode)
- Test: `server/test/hybridDraw.test.ts`

**Interfaces:**
- Consumes: `dealGroups`, `groupName` (Task 1).
- Produces:
  - `generateGroupStage(args: { players: PlayerCompetitor[]; groupSize: number; topN: number; categoryId: string; tournamentId: string; sportType: string; matchConfig: Record<string, unknown>; repo: BracketMatchRepo }): Promise<unknown[]>`.
  - Each match: `bracketRound: 'Group X'`, `roundNumber: 1`, `positionInRound` from 0 within the group, a category-wide `matchNumber` from 1, `competitorType: 'player'`, `status: 'scheduled'`, and no `nextMatchId`.
  - Pairings within a group use the same `i < j` loops as `leaguePlayer.ts`.

- [ ] **Step 1: Write the failing tests** (pattern: `test/doublesPairsDraw.test.ts`; create a `hybrid` singles category with `hybridConfig: { leagueSize: 4, topN: 2 }`, then call `badmintonCategoryAdapter.generateBracket`):
  - 13 assigned singles registrations → 15 matches. The distinct `bracketRound` values are `['Group A','Group B','Group C','Group D']`, every `roundNumber` is 1, no `nextMatchId` is set, and Group A has 6 matches.
  - Doubles hybrid with 4 mutual pairs and size 2 → 2 groups of one match each, and every side's name contains `' / '`.
  - `validateConfig` throws "Fewer must qualify than play in each group." for `{ leagueSize: 4, topN: 4 }`.
  - 3 entries with `{ leagueSize: 4, topN: 1 }` → `generateBracket` rejects with a message starting "Not enough entries for a knockout".
  - A `league` category still draws one `League` round (regression).

- [ ] **Step 2: Run** `npx vitest run test/hybridDraw.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **Adapter, individual mode:** when `bracketType === 'hybrid'`, call `generateGroupStage` with `groupSize = hybridConfig.leagueSize` and `topN = hybridConfig.topN`. `league` keeps `generateLeaguePlayer`. Team mode is unchanged.
  - **`generateGroupStage` refuses before writing anything:**
    - when there would be more than 26 groups;
    - when fewer than 2 would qualify (sum over groups of `min(topN, size)`): "Not enough entries for a knockout: {n} entries make {G} group(s), and only {q} would go through."
  - **`validateConfig`** adds the `topN < leagueSize` rule.

- [ ] **Step 4: Run** the test, plus `test/doublesPairsDraw.test.ts` and `test/bracketRegenerateGuard.test.ts`. Expected: PASS.

- [ ] **Step 5: Gate:** `npx tsc --noEmit -p .` is clean.

### Task 3: Seeded knockout and drawing it

**Files:**
- Modify: `server/src/shared/bracket/knockoutPlayer.ts:36-118` (the `seeded` and `firstRound` arguments)
- Create: `server/src/sports/badminton/services/hybrid.service.ts`
- Test: `server/test/hybridKnockout.test.ts`

**Interfaces:**
- Consumes: `groupTables`, `seedQualifiers`, `seedOrder`, `isGroupRound` (Task 1).
- Produces:
  - `generateKnockoutPlayer` accepts `seeded?: boolean` and `firstRound?: number` (default 1).
    - **Seeded:** `players` are in seed order, and first-round slot `i` pairs seeds `seedOrder(S)[2i]` and `[2i+1]`. A seed greater than `n` is a bye for its opponent. There is no shuffle and no `byePositions`.
    - **`firstRound`:** every created match's `roundNumber` is shifted by `firstRound - 1`. Names and links are unchanged.
  - `hybridService.drawKnockout(categoryId: string): Promise<boolean>`. It returns `true` when it drew. It returns `false` when:
    - the category has a non-group match already;
    - not every group match is decided (`completed` or `walkover`);
    - there are no matches;
    - a concurrent draw won (Mongo `code === 11000` is caught).

- [ ] **Step 1: Write the failing tests.** Seed the group matches directly with `BadmintonMatch.create`, completed with `gameScores` and a `winnerId`.
  - **2 groups of 3, topN 2, all played** → `drawKnockout` returns `true`.
    - It creates `Semi-Final` ×2 (`roundNumber` 2) and a `Final` (`roundNumber` 3).
    - The semis pair A1 v B2 and B1 v A2 (by name).
    - Each semi has `nextMatchId` set to the Final.
  - **3 groups of 2, topN 2 (6 qualifiers)** → the first knockout round is named `Quarter-Final`. A1 and B1 each sit in a walkover with `winReason: 'bye'`, already advanced into the semi-final's slot.
  - **One group match still `scheduled`** → returns `false` and creates nothing.
  - **Race:** `await Promise.all([drawKnockout(id), drawKnockout(id)])` → exactly one `true`. Afterwards the knockout matches number 3 (2 semis + Final) and there's no duplicate.
  - **Unseeded regression:** `generateKnockoutPlayer` without `seeded` still yields 8 entrants → 7 matches, `roundNumber` 1–3.

- [ ] **Step 2: Run** `npx vitest run test/hybridKnockout.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** the two arguments and `drawKnockout`.
  - Use `badmintonMatchRepository`, `badmintonCategoryRepository` and `badmintonMatchAdapter.buildMatchConfig(category)`.
  - `tournamentId` comes from the category.

- [ ] **Step 4: Run** the test plus `test/quickKnockoutBracket.test.ts` and `test/bracketReshuffleTeam.test.ts`. Expected: PASS.

- [ ] **Step 5: Gate:** `npx tsc --noEmit -p .` is clean.

### Task 4: One completion rule (fixes the league's first-result completion)

**Files:**
- Modify: `server/src/shared/bracket/groups.ts` (add `isStageOver`)
- Modify: `server/src/sports/badminton/services/badmintonMatch.service.ts:124-132` and `:389-396`
- Modify: `server/src/sports/cricket/services/cricketMatch.service.ts:709-717`
- Test: `server/test/stageCompletion.test.ts`

**Interfaces:**
- Consumes: `hybridService.drawKnockout` (Task 3), `isGroupRound`.
- Produces:
  - `isStageOver(match: { nextMatchId?: unknown }, all: { status?: string }[]): boolean`. It is `!match.nextMatchId && all.every(m => m.status === 'completed' || m.status === 'walkover')`.
  - Badminton's private `_afterDecided(match, userId)`, used by both the result route and the live-point route:
    - when the stage isn't over, nothing happens;
    - when every match is a group match, it calls `drawKnockout`;
    - otherwise it calls `completeCategory`.
    - Best-effort: it logs and never throws, as now.
  - Cricket calls `completeCategory` only when `isStageOver`.

- [ ] **Step 1: Write the failing tests.**
  - **Badminton singles `league`, 3 players, `ongoing`:**
    - Record the first result through `badmintonMatchService.recordResult` (stub `tournamentRepository.isOrganizerOrStaff` as the existing reopen tests do) → the category is still `ongoing`.
    - Record the other two → `completed`.
  - **Badminton hybrid**, 2 groups of 2, topN 1:
    - The first group result → `ongoing`, with no knockout.
    - The second → a `Final` exists, and the category is still `ongoing`.
    - Recording the Final → `completed`.
  - **Live points** finishing the last group match also draw the knockout (drive `recordLivePoint` to a 1-game win with `bestOf: 1`, `pointsToWin: 3`).
  - **Cricket `league`** with 3 teams: the first result leaves it `ongoing`. Follow `test/cricketReopen.test.ts` for setup.
  - **A knockout's Final** still completes the category (regression).

- [ ] **Step 2: Run** `npx vitest run test/stageCompletion.test.ts`. Expected: FAIL (the league completes after one result).

- [ ] **Step 3: Implement** the rule in all three places.

- [ ] **Step 4: Run** it, plus `test/badmintonReopen*.test.ts`, `test/cricketReopen.test.ts`, `test/categoryCompletionTitles.test.ts` and `test/badmintonLiveScoring.test.ts`. Expected: PASS. Any existing test that relied on a league completing after one result is wrong under the spec; fix the test, and say so in the task report.

- [ ] **Step 5: Gate:** `npx tsc --noEmit -p .` is clean.

### Task 5: Reopen, reshuffle and swap around groups

**Files:**
- Modify: `server/src/sports/badminton/repository/badmintonMatch.repository.ts` (add `deleteFromRound`)
- Modify: `server/src/sports/badminton/services/badmintonMatch.service.ts:161-190` (reopen)
- Modify: `server/src/services/match.service.ts:142-177` (swap) and `:312-326` (reshuffle)
- Test: `server/test/hybridReopen.test.ts`

**Interfaces:**
- Consumes: `isGroupRound`, `isLeagueRound` (Task 1); `wasPlayed` from `shared/bracket/guardRegenerate.ts`.
- Produces: `badmintonMatchRepository.deleteFromRound(categoryId: string, roundNumber: number): Promise<unknown>`, which deletes the category's matches with `roundNumber >= roundNumber`.

- [ ] **Step 1: Write the failing tests.**
  - **Reopen a group match** while the knockout exists and nothing in it is played → it succeeds, and no knockout matches remain. Re-recording the result draws the knockout again.
  - **Reopen a group match** once a knockout match is `in_progress` or `completed` → 400 with "Cannot reopen: the knockout has started. Correct the knockout first." Nothing changes.
  - **`matchService.reshuffleBracket`** on a hybrid category with nothing played → still the same number of matches, all in group rounds. Group membership may change; assert the set of `bracketRound` names is unchanged and no `nextMatchId` appears.
  - **`matchService.swapCompetitors`** between two `Group A` matches → 400 "Swap works on knockout matches only. Redraw to change the draw." The same holds for two `League` matches.

- [ ] **Step 2: Run** `npx vitest run test/hybridReopen.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **Reopen:** the guard runs before the ledger step. When `isGroupRound(match.bracketRound)`, find the non-group matches. If any `wasPlayed` (or is `in_progress`), refuse. Otherwise `deleteFromRound(categoryId, 2)`.
  - **Reshuffle:** when any match `isLeagueRound`, return `this.generateBracket(categoryId, userId)` after the existing results check.
  - **Swap:** refuse when either match `isLeagueRound`.

- [ ] **Step 4: Run** it, plus `test/badmintonReopen*.test.ts` and `test/bracketReshuffleTeam.test.ts`. Expected: PASS.

- [ ] **Step 5: Gate:** `npx tsc --noEmit -p .` is clean.

### Task 6: Results and the table endpoint

**Files:**
- Modify: `server/src/shared/results/recordCategoryResults.ts:295-316` (a hybrid branch)
- Modify: `server/src/services/match.service.ts:501-554` (`getLeaderboard`)
- Test: `server/test/hybridResults.test.ts`

**Interfaces:**
- Consumes: `groupTables`, `qualifierCount`, `knockoutRoundName`, `isGroupRound` (Task 1).
- Produces:
  - **Leaderboard:** for a `hybrid` category whose matches include a group round, the payload adds `groups: GroupTable[]`, `qualify: number` (`topN`) and `knockoutRound: string`.
  - **Results:** a hybrid category with group rounds places each knockout entrant by `knockoutPlacements`. Every other group member gets `{ kind: 'group', groupName: 'Group B', position, outOf }`, where `outOf` is the size of their group. Winner and runner-up come only from the Final.

- [ ] **Step 1: Write the failing tests.** Use real matches plus `badmintonCategoryService.completeCategory`, as in `test/categoryCompletionTitles.test.ts`.
  - **2 groups of 3, topN 2, Final played:**
    - The Final's winner gets `kind: 'winner'` plus a title, and the loser `runner_up`.
    - The losing semi-finalists get `kind: 'knockout', round: 'Semi-Final'`.
    - Each group's 3rd gets `kind: 'group', groupName: 'Group A' | 'Group B', position: 3, outOf: 3`.
  - **Completed by hand before any knockout:** everyone has a `group` result, and nobody holds a title.
  - **Doubles hybrid:** the Final's winning side's partner registration gets `kind: 'winner'` too.
  - **`matchService.getLeaderboard`** on a hybrid category with groups → `groups` has 2 tables, `qualify: 2` and `knockoutRound: 'Semi-Final'`. On a hybrid category whose matches are a single `League` round → there's no `groups` key.

- [ ] **Step 2: Run** `npx vitest run test/hybridResults.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** the branch and the payload fields. The flat `leaderboard` stays in the payload as is.

- [ ] **Step 4: Run** the full server suite: `npx tsc --noEmit -p . && npx vitest run && npx eslint src test --ext .ts`. Expected: all clean. Note the new totals.

## Organiser web client

### Task 7: Offer hybrid again and draw groups on Brackets

**Files:**
- Modify: `client/src/sports/badminton/pages/organizer/BadmintonCategoryForm.tsx:81-84,169-170` and its test `BadmintonCategoryForm.test.tsx:21-33`
- Modify: `client/src/lib/bracketLayout.ts` (add `isLeagueRound`; guard `resolveSwapSlot` at `:136`) and `bracketLayout.test.ts`
- Modify: `client/src/pages/organizer/components/BracketManagementSection.tsx:255-263,295,361-381,440-448` and its test
- Modify: `client/src/pages/player-tournament/BracketTab.tsx` (around `:173`) and `client/src/pages/BracketPage.tsx:106-110`, to keep group rounds out of the tree

**Interfaces:**
- Produces: `isLeagueRound(name?: string): boolean` in `client/src/lib/bracketLayout.ts`, the same rule as the server's.

- [ ] **Step 1: Write the failing tests.**
  - **Form:**
    - "Groups + knockout" is offered for a new badminton category.
    - topN 4 with group size 4 shows "Fewer must qualify than play in each group." and doesn't submit.
  - **`resolveSwapSlot`** returns `null` for a `Group A` or `League` match.
  - **Brackets**, given rounds `Group A` and `Group B` with no knockout:
    - two sections labelled "Group A" and "Group B", each with its matches;
    - no "Knockout draw" section;
    - the text "The knockout is drawn when every group match is done.";
    - the Reshuffle menu item reads "Redraw".
  - **Brackets**, given groups plus `Semi-Final`/`Final` → the group sections and the knockout tree, but not the line.

- [ ] **Step 2: Run** `cd client && npx vitest run src/lib/bracketLayout.test.ts src/pages/organizer/components/BracketManagementSection.test.tsx src/sports/badminton/pages/organizer/BadmintonCategoryForm.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **League sections:** `league`/`knockout` split by `isLeagueRound`. Each league round is its own `PANEL` section titled by its name ("League fixtures" for `League`).
  - **The line** shows when the category's `bracketType === 'hybrid'`, a group round exists and `knockout.length === 0`.
  - **The Reshuffle item and its confirm** read "Redraw" and "Redraw the draw? Every group is drawn again at random." when any round is a league round.
  - **`BracketTab` and `BracketPage`:** pass only non-league rounds to the knockout view.

- [ ] **Step 4: Gate:** `npx tsc --noEmit && npx vitest run && npx eslint src/` are all clean.

## Player app

### Task 8: Data, labels and view-model

**Files:**
- Modify: `mobile/src/api/tournaments.ts:94-102` (`hybridConfig?: { leagueSize?: number; topN?: number }`)
- Modify: `mobile/src/api/leaderboard.ts` (add `GroupRow`, `GroupTable` and `getGroupTables`)
- Modify: `mobile/src/lib/knockoutRoom.ts:38` (add `isGroupRound`; `roundLabel` leaves group names alone)
- Modify: `mobile/src/lib/badmintonBoard.ts:98,106` (no number on group rounds)
- Modify: `mobile/src/lib/tournamentBracket.ts:125-136` (no number in the next-match header; `nextMatchLabel` reads "Your Group A match")
- Modify: `mobile/src/lib/standingsView.ts` (`TableKind` gains `'groups'`; `tableKind` maps `hybrid` → `'groups'` after the team checks; add `groupTable`; `ruleLine(c, 'groups')`; add `cutLine`)
- Modify: `mobile/src/lib/tournamentView.ts:65`, `mobile/src/lib/entryView.ts:10,35-43,50-64`, `mobile/src/components/tournament/Results.tsx:32`
- Test: `mobile/__tests__/standingsView.test.ts`, `tournamentView.test.ts`, `entryView.test.ts`, `tournamentBracket.test.ts`, `badmintonBoard.test.ts` (whichever exist; add cases to them)

**Interfaces:**
- Produces:
  - `interface GroupRow { registrationId: string; name: string; teamName?: string; played: number; won: number; lost: number; points: number }`
  - `interface GroupTable { name: string; rows: GroupRow[] }`
  - `getGroupTables(categoryId: string): Promise<{ groups: GroupTable[]; qualify?: number; knockoutRound?: string }>`, which reads `/matches/leaderboard/:categoryId`; `groups` defaults to `[]`.
  - `groupTable(rows: GroupRow[], myRegIds: string[]): TableRow[]`, with `key: registrationId`, `sub: teamName`, `pts: points`, and `rank` = index + 1.
  - `cutLine(knockoutRound?: string): string | undefined`, giving `'Quarter-final line'` for `'Quarter-Final'`.
  - `isGroupRound(name?: string): boolean` in `knockoutRoom.ts`.

- [ ] **Step 1: Write the failing tests.**
  - `roundLabel('Group A')` → `'Group A'`; `roundLabel('Semi-Final')` → `'Semi-final'`.
  - `feedRound('Group B', 2)` → `'Group B'`.
  - `nextMatchLabel` for a `Group C` match at 4:30 PM → `'Your Group C match · 4:30 PM'`.
  - `tableKind` of a hybrid singles category → `'groups'`; of hybrid team mode → `'teams'`.
  - `groupTable` marks my row and keeps the server's order.
  - `cutLine('Quarter-Final')` → `'Quarter-final line'`.
  - `formatLine(hybrid)` → `'Groups → knockouts · Best of 3 to 21'`. Update the existing case at `tournamentView.test.ts:103`.
  - `categoryFacts`: a hybrid category with `{ leagueSize: 4, topN: 2 }` has Format `'Groups of 4, top 2 to knockouts · Singles'`.
  - `howItWorks`: a hybrid category's last step is `{ title: 'Groups, then knockouts', body: 'Groups of 4 play each other; the top 2 go through.' }`.
  - `Results`: a completed hybrid category with a decided `Final` appears under Champions.

- [ ] **Step 2: Run** `cd mobile && npx jest __tests__/standingsView.test.ts __tests__/tournamentView.test.ts`, plus the other touched test files. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - `ruleLine(c, 'groups')` returns the exact copy in Global Constraints.
  - `Results.isKnockout` becomes: knockout, or hybrid with a `Final` match in `matches[c._id]`.

- [ ] **Step 4: Gate:** `npx tsc --noEmit && npx jest`. Both are clean.

### Task 9: The Matches screen for groups (2e/2f)

**Files:**
- Modify: `mobile/src/components/tournament/StandingsTable.tsx` (optional `cutText?: string`, defaulting to `Top {cut} go through`)
- Modify: `mobile/src/app/tournament/[id]/matches.tsx` (the `'groups'` view)
- Test: `mobile/__tests__/MatchesScreen.test.tsx`

**Interfaces:**
- Consumes: `getGroupTables`, `groupTable`, `cutLine`, `ruleLine(c, 'groups')`, `isGroupRound`, `resultRows`, `comingUp` (Task 8); the existing `knockout(list)` renderer.

- [ ] **Step 1: Write the failing tests** (mock the APIs as the file's existing league and team-league cases do).
  - **Hybrid, groups only** (matches in `Group A`/`Group B`, leaderboard `groups` for both, `qualify: 2`, `knockoutRound: 'Semi-Final'`):
    - there's no Knockouts switch;
    - a "Group A" / "Group B" control;
    - Group A's rows;
    - the text "Semi-final line";
    - "Group A results" with Group A's completed match only;
    - the rule line.
  - **Tapping "Group B"** shows Group B's rows.
  - **Hybrid with knockout matches as well:** the switch "Knockouts" / "Groups" shows, and Knockouts is selected with the bracket rendered. Choosing Groups shows the table.
  - **A hybrid whose leaderboard has no `groups`** (an old flat draw) renders the players table, as a league does.

- [ ] **Step 2: Run** `npx jest __tests__/MatchesScreen.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **Loading:** `view === 'groups'` loads `getGroupTables` into per-category state, through the same `extras:{category}` failure key.
  - **The switch:** `Segmented` options `knockouts`/`groups`, shown only when a non-group match exists, defaulting to `knockouts` then.
  - **Groups view:**
    - a `Segmented` of the group names (only when more than one group);
    - the rule line;
    - `<StandingsTable rows={groupTable(...)} head="Player" topN={qualify} cutText={cutLine(knockoutRound)} />`;
    - `${name} results` (`ResultRows` over that group's matches);
    - "Coming up" (`ComingUpRows`).
  - **Knockouts view:** `knockout(ms.filter(m => !isGroupRound(m.bracketRound)))`.
  - **Empty groups:** fall back to `table(sel, ms, 'players')`.
  - **Choosing a new category chip** resets the group and the switch.

- [ ] **Step 4: Gate:** `npx tsc --noEmit && npx jest`. Both are clean (the flaky `AwardsScreen.test.tsx` may need one rerun).

## Wrap-up

### Task 10: Close the gap

**Files:**
- Modify: `d:\kria\SERVER-GAPS.md` (#12: "✅ closed 2026-11-11" and a **Done** block in the house style, listing the calls from the spec and "Not done": team-mode hybrid, editing groups by hand, an organiser group table, web player group tables)
- Modify: the counts line ("**Still open (3):** 2, 5, 35"), plus a new "Closed 2026-11-11" line with the gates
- Modify: `d:\kria\HANDOVER-server-gaps.md` (#12 moves from open to shipped; note the league-completion fix)

- [ ] **Step 1:** Run all three gates:

```
cd server && npx tsc --noEmit -p . && npx vitest run && npx eslint src test --ext .ts
cd mobile && npx tsc --noEmit && npx jest
cd client && npx tsc --noEmit && npx vitest run && npx eslint src/
```

  Expected: all clean. Record the totals.
- [ ] **Step 2:** Write the SERVER-GAPS and handover entries with those totals.
- [ ] **Step 3:** A whole-branch review by a fresh reviewer against the spec. Fix Critical and Important findings, and list deferred minors in the gap's Done block.
