# Doubles Pairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organisers pair same-team doubles players. The draw is built from pairs, and both partners get every credit: title, result, career row and match counts.

**Architecture:** A symmetric `partnerRegistrationId` on TournamentRegistration. In a match, a pair is one side carried by one of its two registration ids (the "side id"), named "A / B". So generation, advancement, swap and reopen are untouched. Every place that turns a registration into people also brings the partner. The organiser web client gets a pairing panel on the Brackets page. The player app counts a partner's registration as "mine" and shows the partner on My entries.

**Tech Stack:** Server: Express, Mongoose and vitest (in-memory Mongo, `test/*.test.ts`). Web client: React, Vite, vitest, msw and Tailwind tokens. App: Expo / React Native, jest.

**Spec:** `mobile/docs/superpowers/specs/2026-10-29-doubles-pairs-design.md`. Read it first. This plan argues from it.

## Global Constraints

- Applies only to badminton categories with `matchType: 'doubles'` (`IBadmintonMatchType.DOUBLES`). Singles, team, team league and cricket behave exactly as today.
- Draw-eligible means `teamId` is set and `status` is `auctioned` or `assigned`, the same filter `badmintonCategoryAdapter.generateBracket` uses today.
- One gate for every pair edit and for a paired player's team change: refused once any match in the category `wasPlayed` (completed, not a bye). That's the same rule as `assertBracketNotPlayed`.
- Side id = the smaller of the two registration id strings. Side name = `${regName(side)} / ${regName(partner)}`, where `regName` is `` `${firstName} ${lastName}`.trim() || 'Unknown' ``.
- Exact server messages (`BadRequestError` unless noted):
  - `Pairs are only for doubles categories.`
  - `Partners must be on the same team.`
  - `${name} isn't on a team in this category yet.`
  - `${name} already has a partner.`
  - `${name} has no partner.`
  - `A player can't partner themselves.`
  - `Results are in for this category, so its pairs are locked.`
  - `Pair at least two pairs before generating the draw.`
  - `${name} is paired in a category with results, so their team can't change.`
  - `One of these players already has a partner.`
- Exact client copy:
  - The pairing notice, from the approved preview: "Pair each team's players the way the team told you, then generate the draw. Partners must be on the same team. Each pair plays as one side, and both partners get the result and any title."
  - Hints: "Pick a player, then their partner" and "Now pick {name}'s partner on the same team".
  - Odd player: "Odd one out: sits out the draw unless the team bought another player."
  - Mismatch: "The draw doesn't match the pairs any more. Redo draw to rebuild it."
  - Redo confirmation: "Redo the draw for {category}? It's rebuilt from the current pairs and placed at random."
  - Generate confirmation: "Generate the draw for {category}? {n} pairs are placed at random." plus " Unpaired, so not in the draw: {Name (Team)}, …." when any are unpaired.
- App copy: "Partner: {name}".
- No new dependencies in any repo.
- Don't commit, branch or stash. The user commits or asks. Leave every change in the working trees (server, client and mobile are separate git repos on `main`).
- Subagent briefs must say: "stop only a process you started (by its PID); never kill node processes broadly."
- The app is unpublished, so response-shape changes ship with it.

## Review Focus

- A dangling `partnerRegistrationId` (the partner's registration was deleted). Every fan-out skips it without throwing, and the side's own player still gets credit. Test: Task 3.
- Two organisers pair the same player at once. `setPartners` must not leave a three-way link. Test: Task 1.
- A bye walkover whose `winnerId` names a side id that change-partner replaces. The `winnerId` follows the new side id, or the pair never advances. Test: Task 4.
- A captain or icon role set on the same team after pairing. It must not clear the pair. Test: Task 5.
- The partner who doesn't carry the side opens the tournament screen (the second `Me`, in `app/tournament/[id].tsx`). Their next match shows. Test: Task 9.

---

### Task 1: Partner link on registrations

**Files:**
- Modify: `server/src/models/tournamentRegistration.model.ts` (schema next to `teamId` at ~88, interface at ~179)
- Modify: `server/src/repository/tournamentRegistration.repository.ts`
- Modify: `server/src/shared/bracket/guardRegenerate.ts:11` (export `wasPlayed`)
- Test: `server/test/doublesPairsRepository.test.ts`

**Interfaces:**
- Produces:
  - `partnerRegistrationId?: string` on `ITournamentRegistration`; schema `{ type: String }`.
  - `tournamentRegistrationRepository.setPartners(aId: string, bId: string): Promise<void>`
  - `tournamentRegistrationRepository.clearPartners(ids: string[]): Promise<void>`
  - `tournamentRegistrationRepository.getByIds(ids: string[]): Promise<ITournamentRegistration[]>`
  - `getPlayerIdsByRegistrationIds` now returns `{ _id; playerId; partnerRegistrationId?: string }[]`
  - `export function wasPlayed(match: { status?: string; winReason?: string }): boolean`

- [ ] **Step 1: Write the failing tests.** Use the `entrant()` / `TournamentRegistration.create` fixture style of `test/categoryCompletionTitles.test.ts`.

```ts
it('setPartners links both registrations to each other', ...)
  // after setPartners(a, b): a.partnerRegistrationId === b && b.partnerRegistrationId === a
it('setPartners refuses when either is already paired and changes nothing', ...)
  // setPartners(a, b); then setPartners(a, c) rejects /already has a partner/
  // a still → b, b still → a, c has no partnerRegistrationId
it('clearPartners clears both sides given either id', ...)
  // setPartners(a, b); clearPartners([a]) → neither has partnerRegistrationId
it('getPlayerIdsByRegistrationIds returns the partner id', ...)
it('getByIds returns [] for no ids and the documents otherwise', ...)
```

- [ ] **Step 2: Run them and confirm they fail.** Run `npx vitest run test/doublesPairsRepository.test.ts`. Expected: FAIL (`setPartners is not a function`).
- [ ] **Step 3: Implement.**
  - `setPartners`: two `updateOne`s, each filtered on `{ _id, partnerRegistrationId: { $exists: false } }`. If either matches nothing, `$unset` whatever this call set and throw `BadRequestError('One of these players already has a partner.')`.
  - `clearPartners`: `updateMany` on `{ $or: [{ _id: { $in: ids } }, { partnerRegistrationId: { $in: ids } }] }` with `$unset: { partnerRegistrationId: 1 }`.
  - `getPlayerIdsByRegistrationIds`: `.select('_id playerId partnerRegistrationId')`.
- [ ] **Step 4: Run them again and confirm they pass,** plus `npx tsc --noEmit`.

---

### Task 2: The draw is built from pairs

**Files:**
- Create: `server/src/sports/badminton/services/doublesPairs.service.ts` (pure helpers here; Task 4 adds the service)
- Modify: `server/src/sports/badminton/adapters/categoryAdapter.ts` (individual branch, ~98-113)
- Test: `server/test/doublesPairsDraw.test.ts`

**Interfaces:**
- Consumes: `partnerRegistrationId` (Task 1).
- Produces, from `doublesPairs.service.ts`:
  - `type PairReg = { _id: unknown; status?: string; teamId?: unknown; partnerRegistrationId?: string; profile?: { firstName?: string; lastName?: string } }`
  - `isDrawEligible(r: PairReg): boolean`
  - `regName(r: PairReg): string`
  - `pairName(side: PairReg, partner: PairReg): string`
  - `pairCompetitors(regs: PairReg[], teamNames: Record<string, string>): PlayerCompetitor[]`

- [ ] **Step 1: Write the failing tests.**

```ts
it('pairCompetitors gives one side per mutual pair, named side-first, carried by the smaller id', ...)
  // regs a(id '…a1', Asha Rao) ↔ b('…b2', Priya Nair), both assigned on team t1
  // → [{ registrationId: '…a1', name: 'Asha Rao / Priya Nair', teamId: 't1', teamName: 'Smashers' }]
it('pairCompetitors leaves out unpaired, one-way links, cross-team links and pairs with an ineligible partner', ...)
it('generateBracket on a doubles knockout draws pairs only', ...)
  // BadmintonCategory { matchType: 'doubles', bracketType: 'knockout' }, 3 pairs + 1 unpaired, all assigned to teams
  // → every non-TBD side registrationId is a side id; names contain ' / '; the unpaired reg appears nowhere
it('generateBracket on a doubles league plays pair against pair', ...)   // 3 pairs → 3 matches
it('generateBracket refuses a doubles category with fewer than two pairs', ...)
  // rejects 'Pair at least two pairs before generating the draw.'
```

- [ ] **Step 2: Run them and confirm they fail.** Run `npx vitest run test/doublesPairsDraw.test.ts`.
- [ ] **Step 3: Implement the helpers.** `pairCompetitors` keeps a registration only when it is eligible, its partner is in `regs`, the partner is eligible, they share a `teamId`, the partner points back at it, and its own id is the smaller one. In the adapter:
  - doubles → `pairCompetitors(allRegs, teamMap)`, else the existing map.
  - The minimum-two check uses the doubles message for doubles. Singles keeps `At least 2 assigned players are required.`
  - Both branches name players through `regName`.
- [ ] **Step 4: Run them again and confirm they pass,** plus the existing bracket tests: `npx vitest run test/bracket test/doublesPairsDraw.test.ts`.

---

### Task 3: Both partners get the credit

**Files:**
- Modify: `server/src/shared/results/recordCategoryResults.ts` (`entrantsOf`, player branch)
- Modify: `server/src/services/careerStats.service.ts` (`_toPlayerIds`, ~189)
- Modify: `server/src/sports/badminton/services/stats-aggregator.ts` (`creditForMatch` ~26, `runRebuild` ~152)
- Modify: `server/src/services/match.service.ts` (player stats block in `recordResult`, ~222-239)
- Test: `server/test/doublesPairsCredit.test.ts`

**Interfaces:**
- Consumes: `getByIds`, and `partnerRegistrationId` from `getPlayerIdsByRegistrationIds` (Task 1).
- Produces: `creditForMatch(match: IBadmintonMatch, rosters: Map<string, string[]>, partners: Map<string, string> = new Map()): Map<string, RegistrationCredit>`

- [ ] **Step 1: Write the failing tests.** Fixtures: a doubles knockout final between pair A (side `a1`, partner `a2`) and pair B (`b1`/`b2`), completed with `winnerId = a1` and a single game 21–10.

```ts
it('completing the category gives both winners the winner title and result, both losers runner-up', ...)
  // via badmintonCategoryService.completeCategory (stub tournament as categoryCompletionTitles.test.ts does)
it('a deleted partner is skipped: the side player still gets the title, nothing throws', ...)
it('recordMatchCompletion writes a career row for all four players, partners on their pair's side', ...)
  // MatchParticipation rows for a2: result 'won'; for b2: 'lost'
it('creditForMatch credits the partner exactly as the side', ...)
  // partners Map([['a1','a2'],['b1','b2']]) → a2 { matchesPlayed: 1, matchesWon: 1, pointsContributed: 21 }
it('rebuildBadmintonStatsForCategory writes the partner registration stats', ...)
it('matchService.recordResult adds the partner registration stats', ...)
```

- [ ] **Step 2: Run them and confirm they fail.** Run `npx vitest run test/doublesPairsCredit.test.ts`.
- [ ] **Step 3: Implement.**
  - **`entrantsOf`:** the player branch returns `[reg, partnerReg]`, with the partner fetched by `reg.partnerRegistrationId`. The existing `!!r` filter drops a missing partner.
  - **`_toPlayerIds`:** collect the partner ids from the first lookup, resolve them with a second `getPlayerIdsByRegistrationIds`, and push `{ playerId, side }` for each resolved partner.
  - **`runRebuild`:** fetch the category registrations before the credit loop and build `partners` from those with `partnerRegistrationId`. Pass the map to `creditForMatch`, which credits `partners.get(p1)` with the same credit as `p1` (and likewise for p2).
  - **`match.service`:** after each player-side `updateStats`, look up that registration and apply the same `updateStats` to its partner.
- [ ] **Step 4: Run them again and confirm they pass.** Run `npx vitest run test/doublesPairsCredit.test.ts test/categoryCompletionTitles.test.ts test/careerStatsWrite.test.ts test/badmintonStatsRebuild.test.ts`.

---

### Task 4: Pairing service and routes

**Files:**
- Modify: `server/src/sports/badminton/services/doublesPairs.service.ts`
- Modify: `server/src/routes/tournamentRegistration.route.ts`
- Modify: `server/src/controllers/tournamentRegistration.controller.ts`
- Modify: `server/src/middlewares/validators/tournamentRegistration.validator.ts`
- Test: `server/test/doublesPairsService.test.ts`

**Interfaces:**
- Consumes: Task 1 repository methods and `wasPlayed`; Task 2 helpers; `badmintonMatchRepository.getByCategory/update`; `categoryRepository.getById`; `teamRepository.getByTournament`; `tournamentRepository.isOrganizerOrStaff`.
- Produces:

```ts
export interface PairingPlayer { registrationId: string; name: string; teamId: string; partnerRegistrationId: string | null }
export interface PairingState {
    players: PairingPlayer[];                       // draw-eligible registrations only
    teams: { _id: string; name: string; logo?: string; primaryColor?: string }[];  // teams with an eligible player
    drawn: boolean;                                 // the category has any match
    locked: boolean;                                // any match wasPlayed
    sideIds: string[];                              // distinct non-'TBD' player1/player2 registrationIds
}
export const doublesPairsService: {
    getState(categoryId: string, userId: string): Promise<SuccessResponse<PairingState>>;
    pair(categoryId: string, registrationIds: [string, string], userId: string): Promise<SuccessResponse<PairingState>>;
    unpair(registrationId: string, userId: string): Promise<SuccessResponse<PairingState>>;
    changePartner(registrationId: string, partnerRegistrationId: string, userId: string): Promise<SuccessResponse<PairingState>>;
    releaseForTeamChange(changes: { registrationId: string; newTeamId?: string }[]): Promise<void>;  // body in Task 5
};
```

- Routes (all `isOrganizerLoggedIn`, then `validateRequest`; the service checks `isOrganizerOrStaff` and throws `ForbiddenError`):
  - `GET /registrations/categories/:categoryId/pairs` → `getState`
  - `POST /registrations/categories/:categoryId/pairs`, body `{ registrationIds: [a, b] }` → `pair`
  - `DELETE /registrations/:id/partner` → `unpair`
  - `PUT /registrations/:id/partner`, body `{ partnerRegistrationId }` → `changePartner`

- [ ] **Step 1: Write the failing tests.**

```ts
it('pair links two eligible teammates and returns the new state', ...)
it.each([...])('pair refuses: %s', ...)
  // not doubles / different teams / ineligible / already paired / same id twice / locked, each with its exact message
it('unpair clears both partners; refused once locked', ...)
it('changePartner to an unpaired teammate: K–N paired, P unpaired, the pair keeps its slot', ...)
  // draw sides carried by P → registrationId K, name 'K… / N…'; a bye walkover with winnerId P → winnerId K
it('changePartner to a teammate in another pair swaps partners and keeps both slots', ...)
  // K–P, N–M → K–N, P–M; slot that held K or P now carries K-or-original id with name of K's pair; slot of N/M now P–M
it('getState lists eligible players, their teams, drawn, locked and sideIds', ...)
it('the routes refuse an organiser who does not run the tournament with 403', ...)
```

- [ ] **Step 2: Run them and confirm they fail.** Run `npx vitest run test/doublesPairsService.test.ts`.
- [ ] **Step 3: Implement.** Every mutation:
  1. loads the registrations and the category
  2. checks the category is badminton doubles
  3. authorises
  4. refuses when locked
  5. validates (eligible, same team, unpaired for `pair`, paired for `changePartner`)
  6. writes
  7. returns `getState`

  `changePartner(K, N)` is the one algorithm the tests don't fully pin down:

```text
P = K.partner (required). N: same team, eligible, N ≠ K, N ≠ P. M = N.partner (may be none).
links: clearPartners([K, N]); setPartners(K, N); if M: setPartners(P, M).
draw: for each match side whose registrationId S is in {K, P}: new pair (K, N), keep S if S ∈ {K, N} else K.
      if M: for each side whose S is in {N, M}: new pair (P, M), keep S if S ∈ {P, M} else M.
      set that side's registrationId and name = pairName(kept, other); if match.winnerId == old S, set it to the kept id.
```

- [ ] **Step 4: Run them again and confirm they pass,** plus `npx tsc --noEmit`.

---

### Task 5: A team change releases the pair

**Files:**
- Modify: `server/src/sports/badminton/services/doublesPairs.service.ts` (`releaseForTeamChange`)
- Modify: `server/src/services/tournamentRegistration.service.ts`: `manualAssign` (both the carry-over branch ~377 and the normal path ~401), `unassign` ~417, `assignRoleWithRefund` ~478
- Modify: `server/src/services/auction.service.ts`, the undo at ~650-692
- Test: `server/test/doublesPairsTeamChange.test.ts`

**Interfaces:**
- Consumes: `releaseForTeamChange` (signature in Task 4), `clearPartners`, `wasPlayed`.

- [ ] **Step 1: Write the failing tests.**

```ts
it('unassign clears the pair on both registrations', ...)
it('manualAssign to another team clears the pair; to the same team keeps it', ...)
it('setCaptain on the same team keeps the pair', ...)
it('with a played match in the category, unassign is refused and nothing changes', ...)
  // rejects '<name> is paired in a category with results, so their team can't change.'; teamId and both links intact
it('auction undo is refused before any write when a carry-over registration is paired in a played category', ...)
  // the sold registration still has its team, the budget is unchanged, and the log is still there
```

- [ ] **Step 2: Run them and confirm they fail.** Run `npx vitest run test/doublesPairsTeamChange.test.ts`.
- [ ] **Step 3: Implement `releaseForTeamChange`.**
  - It considers only registrations that have a partner and whose team actually changes: `newTeamId` is undefined, or differs from `teamId`.
  - It checks every one of them before it writes anything.
  - Then it calls `clearPartners` on them.
- [ ] **Step 4: Call it before each team write.**
  - In `undo`, move the `findCarryOvers` and `findLockTeamId` reads above the first write. Neither depends on that write: both exclude `lastLog.registrationId`.
  - Then call `releaseForTeamChange` once, with the sold registration (when `stands`) plus the carry-overs about to be unassigned.
- [ ] **Step 5: Run the tests again and confirm they pass,** plus the regression tests: `npx vitest run test/doublesPairsTeamChange.test.ts test/auction*.test.ts test/captainIcon.test.ts`.

---

### Task 6: My entries carry the partner

**Files:**
- Modify: `server/src/services/tournamentRegistration.service.ts` (`getMyRegistrations`, ~110-160)
- Test: `server/test/doublesPairsMyEntries.test.ts`

**Interfaces:**
- Produces: each entry gains `partner: { registrationId: string; name: string } | null`. `partnerRegistrationId` already rides along on `...reg`.

- [ ] **Step 1: Write the failing test.** It checks that a paired entry has `partner: { registrationId: b, name: 'Priya Nair' }` and an unpaired one has `partner: null`.
- [ ] **Step 2: Run it and confirm it fails.** Run `npx vitest run test/doublesPairsMyEntries.test.ts`.
- [ ] **Step 3: Implement.** Make one `getByIds` call for all the partner ids, and take the names from `regName`.
- [ ] **Step 4: Run it again and confirm it passes.**

---

### Task 7: Organiser client, pairing before the draw

**Files:**
- Create: `client/src/api/pairs.ts`, `client/src/lib/pairs.ts` (+ `client/src/lib/pairs.test.ts`), `client/src/pages/organizer/components/PairingPanel.tsx` (+ `PairingPanel.test.tsx`)
- Modify: `client/src/store/slices/registrationSlice.ts` (`Category` gets `matchType?: string`), `client/src/pages/organizer/components/BracketManagementSection.tsx` (`CategoryInfo` gets `matchType?`; doubles with no draw), `BracketManagementSection.test.tsx`

**Interfaces:**
- Consumes: the Task 4 routes and the `PairingState` shape.
- Produces:

```ts
// api/pairs.ts (unwrap like fetchCategoryMatches)
getPairs(categoryId: string): Promise<PairingState>
pairPlayers(categoryId: string, a: string, b: string): Promise<PairingState>
unpairPlayer(registrationId: string): Promise<PairingState>
changePartner(registrationId: string, partnerRegistrationId: string): Promise<PairingState>
// lib/pairs.ts (PairingPlayer / PairingState types mirror the server)
teamCards(s: PairingState): { team: PairingState['teams'][number]; pairs: [PairingPlayer, PairingPlayer][]; unpaired: PairingPlayer[] }[]
pairSummary(s: PairingState): { pairs: number; unpaired: string[] }      // unpaired as 'Name (Team)'
drawMatchesPairs(s: PairingState): boolean                                // spec: every side id paired, each pair exactly one id on the draw
// PairingPanel.tsx
<PairingPanel categoryId={string} readOnly={boolean} onChange={(s: PairingState) => void} />
```

- [ ] **Step 1: Write the failing tests.**
  - `lib/pairs.test.ts`:
    - `teamCards` lists each pair once and the unpaired players per team.
    - `pairSummary` counts the pairs and names the unpaired players as "Name (Team)".
    - `drawMatchesPairs` is true for the drawn pairs, and false when a side id is unpaired, when both members of a pair are on the draw, or when a pair is missing from the draw.
  - `PairingPanel.test.tsx` (msw):
    - It renders one card per team, with the pairs and the Unpaired players.
    - Picking two unpaired teammates POSTs `{ registrationIds: [a, b] }`.
    - Picking a paired player and then a teammate PUTs `/registrations/<first>/partner`.
    - Picking an unpaired player and then a paired teammate PUTs `/registrations/<paired>/partner` with the unpaired player's id.
    - Unpair sends a DELETE.
    - When `locked` or `readOnly`, there are no buttons.
    - A server error shows in a red `Notice`.
  - `BracketManagementSection.test.tsx`, for a doubles category with no draw:
    - The panel shows in place of "No bracket yet".
    - Generate bracket is disabled with one pair.
    - With two pairs and one unpaired player, the confirmation reads exactly `Generate the draw for Men's Doubles? 2 pairs are placed at random. Unpaired, so not in the draw: Rahul Pillai (Kings).`
- [ ] **Step 2: Run them and confirm they fail.** Run `npx vitest run src/lib/pairs.test.ts src/pages/organizer/components/PairingPanel.test.tsx src/pages/organizer/components/BracketManagementSection.test.tsx`.
- [ ] **Step 3: Implement.**
  - **Layout:** follow screen 1 of the preview, built from `PANEL`, `Notice`, `Avatar`, `TeamLogo`, `BTN_*` and `FOCUS`.
  - **Picking players:** the first pick is the player who stays. Picking a player on another team moves the selection, and picking the selected player again deselects.
  - **After each write:** the panel uses the returned state and calls `onChange`.
  - **Generate button:** the section keeps the last `PairingState`, so it can disable the button and write the confirmation.
- [ ] **Step 4: Run them again and confirm they pass,** plus `npx tsc` (as the `build` script runs it) and `npm run lint`.

---

### Task 8: Organiser client, after the draw

**Files:**
- Modify: `client/src/pages/organizer/components/BracketManagementSection.tsx`, `BracketManagementSection.test.tsx`

**Interfaces:**
- Consumes: `PairingPanel`, `drawMatchesPairs` (Task 7); `POST /matches/generate/:categoryId` (it already rebuilds over an unplayed draw).

- [ ] **Step 1: Write the failing tests.** For a doubles category with a draw and no results:
  - An **Edit pairs** button toggles the panel above the bracket.
  - The swap toggle reads **Swap pairs**.
  - The More menu has **Redo draw**. Its confirmation copy is exact, and confirming POSTs `/matches/generate/c1` and reloads the bracket.
  - When the state doesn't match the draw, the mismatch notice shows, with its own **Redo draw** button.
  - After a partner change, the bracket reloads (its names change).

  With results: no **Edit pairs** and no **Redo draw**. A singles category: unchanged, with **Swap players** and no **Edit pairs**.
- [ ] **Step 2: Run them and confirm they fail.** Run `npx vitest run src/pages/organizer/components/BracketManagementSection.test.tsx`.
- [ ] **Step 3: Implement.**
  - Add a `'redo'` value to the `confirm` state.
  - Remount the panel after a redo (a `key` bumped on refresh), so it reloads `sideIds`.
  - The panel's `onChange` triggers `refresh()` while a draw exists.
- [ ] **Step 4: Run the tests again and confirm they pass,** plus the type check and lint.

---

### Task 9: Player app

**Files:**
- Modify: `mobile/src/api/tournaments.ts` (`MyEntry` gets `partnerRegistrationId?: string; partner?: { registrationId: string; name: string } | null`)
- Modify: `mobile/src/lib/tournamentBracket.ts` (add `meFrom`), `mobile/src/app/tournament/[id].tsx:93` and `mobile/src/app/tournament/[id]/matches.tsx:133` (both use `meFrom`)
- Modify: `mobile/src/lib/entriesView.ts` (`EntryRow.partner?: string`), `mobile/src/app/profile/registrations.tsx` (render it under `sub`, in the `s.sub` style)
- Test: `mobile/__tests__/tournamentBracket.test.ts`, `mobile/__tests__/entriesView.test.ts`, `mobile/__tests__/MyEntriesScreen.test.tsx`

**Interfaces:**
- Produces: `meFrom(entries: Pick<MyEntry, '_id' | 'teamId' | 'partnerRegistrationId'>[]): Me`. Its `registrationIds` are the entry ids plus each partner id; `teamId` is the first entry's that has one.

- [ ] **Step 1: Write the failing tests.**
  - `meFrom` includes the partner ids.
  - `isMine` is true for a match whose side carries the partner's id.
  - `entryRows` gives `partner: 'Partner: Priya Nair'` when paired, and `undefined` otherwise.
  - My entries renders "Partner: Priya Nair".
- [ ] **Step 2: Run them and confirm they fail.** Run `npx jest __tests__/tournamentBracket.test.ts __tests__/entriesView.test.ts __tests__/MyEntriesScreen.test.tsx`.
- [ ] **Step 3: Implement,** and replace both inline `Me` literals with `meFrom(...)`.
- [ ] **Step 4: Run them again and confirm they pass,** plus `npx tsc --noEmit`.

---

### Task 10: Close #38 and run every gate

**Files:**
- Modify: `d:/kria/SERVER-GAPS.md`. Mark #38 closed with a **Done (date)** line in the house style, update the header counts, and note that the gap turned out to be "doubles was never paired".

- [ ] **Step 1: Server.** Run `npx tsc --noEmit` and `npx vitest run`. Expected: clean, and all files pass.
- [ ] **Step 2: Web client.** Run its type check, `npx vitest run` and `npm run lint`. Expected: clean.
- [ ] **Step 3: App.** Run `npx tsc --noEmit` and `npx jest`. Expected: clean. Any failure that isn't new goes in the report by name.
- [ ] **Step 4: Update SERVER-GAPS.md.** Record the gates' numbers.
