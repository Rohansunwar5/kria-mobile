# Quick Play Invites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Kria player that a host adds by search, to a quick knockout or a quick match, is *invited*. Nothing reaches their account (honours, award eligibility, career stats) until they accept.

**Architecture:** An invite is a knockout player row, or a quick-match slot, with `invitedPlayerId` set and `playerId` empty. Every reader that counts accounts already reads only `playerId`, so pending invites are left out by default. Accept moves the id from `invitedPlayerId` to `playerId`, using the claim logic. Knockout Start refuses while invites are pending. A quick match can be accepted until it finishes.

**Tech Stack:** Server: Express, Mongoose 8, vitest with MongoMemoryServer. App: Expo SDK 58, expo-router, jest-expo with Testing Library.

**Spec:** `mobile/docs/superpowers/specs/2026-11-25-quick-play-invites-design.md` (approved 25 Nov 2026). Read it before any task.

## Global Constraints

- **Don't commit.** Leave every change unstaged; the user commits.
- Don't start until the server's Low-cleanup work has landed in the working tree (an agent is editing `D:\kria\server` now).
- No data migrations or backfills (existing data is test data). No old-app compatibility (the app is unpublished).
- **Server tests:** run from PowerShell with an uppercase drive: `cd D:\kria\server; npx vitest run test/<file>`. Run only the files named. Full suites run at the end, one repo at a time.
- **App tests:** `cd D:\kria\mobile; npx jest __tests__/<file>`. Install with `--legacy-peer-deps` (see `mobile/AGENTS.md`); this plan adds no dependencies.
- **Copy is fixed by the spec:**
  - Knockout notification title: `<Host> invited you to <knockout name>`.
  - Quick match notification title: `<Host> invited you to <side1> vs <side2>`. Push body: `Accept to keep the result on your profile.`
  - Start refusal: `Waiting for <names> to accept. Remove them or play them as guests to start.` Names read `A`, `A and B`, or `A, B and C`.
  - Search sheet subtitle (knockout): `Find a Kria player to invite, or type a guest's name.`
  - Host's pending row: `Invited · waiting`.
  - Past-accepting card: `This finished before you accepted`, with a `Remove my name` button.
  - Refusal when an invitee tries to claim a different spot: `You're invited to this one. Accept the invite instead.`
  - Quick match accept after the finish: `This match finished before you accepted.`
- The server looks up the invitee's name from their account; it never trusts the name the app sends.

## Review Focus

1. **A stranger with the join code** tries to claim an invited knockout row or quick-match slot. Refused, and the invite stays. (Task 1 step 1, Task 2 step 1.)
2. **Two accepts at once, or an accept racing a code claim on the same slot.** Exactly one lands. (Task 2 step 1.)
3. **An invitee who already holds another slot in the same quick match accepts.** Refused, never in two slots. (Task 2 step 1.)
4. **A host picks themselves in search** (the "Add me" path sends their own `playerId`). They're linked directly, not invited. (Task 1 step 1.)
5. **A pending row that's paired in a drawn doubles knockout declines.** The pair is dropped, the draw is cleared, and Start names who's still pending. (Task 1 step 1.)

---

### Task 1: Knockout invites (server)

**Files:**
- Modify: `server/src/models/quickKnockout.model.ts` (player schema, `IKnockoutPlayer`, new index)
- Modify: `server/src/services/quickKnockout.service.ts` (`addPlayer`, `join`, `claim`, `start`, new methods)
- Modify: `server/src/repository/quickKnockout.repository.ts:26` (`listForPlayer`)
- Modify: `server/src/controllers/quickKnockout.controller.ts`, `server/src/routes/quickKnockout.route.ts`
- Modify: `server/src/services/notification/messages.ts`, `server/src/models/notification.model.ts:9` (kind enum)
- Test: `server/test/quickKnockoutInvites.test.ts` (new; copy the setup from `test/quickKnockoutRoster.test.ts`), `server/test/notificationMessages.test.ts`

**Interfaces:**
- Produces:
  - **Model:** `IKnockoutPlayer.invitedPlayerId?: mongoose.Types.ObjectId`. A row is pending when `invitedPlayerId && !playerId`. New index: `{ 'players.invitedPlayerId': 1, createdAt: -1 }`.
  - **Service** (on `QuickKnockoutService`):
    - `acceptInvite(id: string, playerId: string): Promise<SuccessResponse<IQuickKnockout>>`
    - `declineInvite(id: string, playerId: string): Promise<SuccessResponse<IQuickKnockout>>`
    - `playAsGuest(id: string, hostId: string, playerKey: string): Promise<SuccessResponse<IQuickKnockout>>`
  - **Routes** (all `isPlayerLoggedIn`):
    - `POST /quick-knockout/:id/invite/accept` and `POST /quick-knockout/:id/invite/decline` (`knockoutIdValidator`)
    - `POST /quick-knockout/:id/players/:playerKey/guest` (`removeKnockoutPlayerValidator`)
    - Add them above the `/:id` GET, next to the other `/:id/...` routes.
  - **Message:** `knockoutInvite(e: { knockoutId: string; hostName: string; knockoutName: string; sport: string }): NotificationMessage`. Kind `'knockout_invite'`, context `Quick knockout · <Sport>`, target `{ path: '/knockout/[id]', params: { id: knockoutId } }`.

- [ ] **Step 1: Write the failing tests** in `test/quickKnockoutInvites.test.ts`. Each `it` names the rule:
  - `addPlayer by search invites`: the row has `invitedPlayerId` equal to the searched player, no `playerId`, and `displayName` equal to the player's real name from their account.
  - `addPlayer of the host links directly`: the "Add me" path gives `playerId === hostId` and no `invitedPlayerId`.
  - `addPlayer refuses someone already linked or already invited`: 400.
  - `accept links the invitee and keeps the playerKey`: an accept on a row that's paired and drawn keeps the pair and the entrants unchanged.
  - `only the invitee can accept or decline`: 403 or 404 for others. Accept after Start is a 400.
  - `decline while waiting removes the row and its pair and clears the draw`: Review Focus 5.
  - `decline on a cancelled knockout renames the row to "Guest"` and clears `invitedPlayerId`.
  - `playAsGuest is host-only` and clears `invitedPlayerId` while keeping `displayName`.
  - `join by code while invited accepts`: still the same number of rows, and the row is now linked.
  - `claim of an invited row by anyone else is refused`, and `an invitee claiming a different row gets "You're invited to this one. Accept the invite instead."`: Review Focus 1.
  - `start refuses with pending invites`: message `Waiting for Asha and Ravi to accept. Remove them or play them as guests to start.`
  - `awardsEligible counts only linked players`: 3 linked plus 1 pending turned guest gives `false`.
  - `listMine includes waiting knockouts I'm invited to, and not cancelled ones`.
  - `addPlayer sends a knockout_invite notification to the invitee`: stub `notificationService.deliver` the way `test/notificationTriggers.test.ts` does.
  - In `notificationMessages.test.ts`: `knockoutInvite` title, target and push text.

- [ ] **Step 2: Run to verify they fail.** Run: `npx vitest run test/quickKnockoutInvites.test.ts test/notificationMessages.test.ts`. Expected: FAIL (methods and routes missing).

- [ ] **Step 3: Implement.**
  - **`addPlayer`:**
    - `input.playerId === hostId` links as today.
    - Otherwise push `{ playerKey, invitedPlayerId, displayName: await this._playerName(id) }`.
    - Refuse a duplicate with a widened `_hasAccount`, or a sibling `_hasInvite`.
    - After persisting, call `notificationService.deliver` with `knockoutInvite`. Mirror `quickMatch.service.ts:107-114`.
  - **`acceptInvite`:** set `playerId`, `$unset` the invite (set it to `undefined` and `markModified`, as `quickMatch.service.ts:350-351` does), then `persist`. Don't call `_rosterChanged`.
  - **`declineInvite`:** while waiting, reuse the body of `removePlayer`. Extract a private `_removeRow(k, playerKey)` that both use.
  - **`join` / `claim`:** check for the caller's pending row first.
  - **`claim`:** additionally refuse a row with `invitedPlayerId`.
  - **`start`:** refuse before `status = 'live'` when any row is pending. Add a private `_names(list: string[]): string` for the "A, B and C" joining.
  - **`listForPlayer`:** add `{ 'players.invitedPlayerId': playerId, status: 'waiting' }` to the `$or`.
  - **Notifications:** add `'knockout_invite'` to the `NotificationKind` union and to the model enum.

- [ ] **Step 4: Run to verify they pass.** Run the same command, then the knockout suites that border this one: `npx vitest run test/quickKnockoutRoster.test.ts test/quickKnockoutHttp.test.ts test/quickKnockoutAwards.test.ts test/quickKnockoutCricketTeams.test.ts`. Expected: all PASS.

### Task 2: Quick match invites (server)

**Files:**
- Modify: `server/src/models/quickMatch.model.ts:30-37` (slot schema and slot type, new index)
- Modify: `server/src/services/quickMatch.service.ts` (`create`, `claimSlot`, new methods)
- Modify: `server/src/repository/quickMatch.repository.ts` (`claimSlot` filter, `listForPlayer`, new `acceptInvite`)
- Modify: `server/src/controllers/quickMatch.controller.ts`, `server/src/routes/quickMatch.route.ts`, `server/src/middlewares/validators/quickMatch.validator.ts`
- Modify: `server/src/services/notification/messages.ts:85-93` (`addedToQuickMatch` copy)
- Test: `server/test/quickMatchInvites.test.ts` (new; copy the setup from `test/quickMatchWaitingRoom.test.ts`), plus updates to `test/notificationMessages.test.ts`, `test/quickMatchCreate.test.ts` and `test/notificationTriggers.test.ts` where they assert the old linking or copy

**Interfaces:**
- Produces:
  - **Model:** slot `invitedPlayerId?: mongoose.Types.ObjectId`. New index: `{ 'sides.slots.invitedPlayerId': 1, createdAt: -1 }`.
  - **Repository:** `acceptInvite(id: string, playerId: string): Promise<IQuickMatch | null>`. One `findOneAndUpdate`, and the filter holds all of these:
    - status `waiting` or `live`;
    - `hasBeenCompleted` not true;
    - no `knockoutId`;
    - `'sides.slots.playerId': { $ne: pid }`;
    - an `$elemMatch` on a slot with `invitedPlayerId: pid, playerId: null`.

    The update sets that slot's `playerId` and unsets its `invitedPlayerId`, using `arrayFilters: [{ 'slot.invitedPlayerId': pid }]`.
  - **Repository `claimSlot`:** its slot `$elemMatch` also requires `invitedPlayerId: null`.
  - **Service** (on `QuickMatchService`):
    - `acceptInvite(matchId: string, playerId: string)`
    - `declineInvite(matchId: string, playerId: string)`
    - `playAsGuest(matchId: string, hostId: string, slotId: string)`

    All return `Promise<SuccessResponse<IQuickMatch>>` and broadcast with `_broadcast`.
  - **Routes:**
    - `POST /quick-match/:id/invite/accept` and `POST /quick-match/:id/invite/decline` (`quickMatchIdValidator`)
    - `POST /quick-match/:id/slots/:slotId/guest`, with a new `slotGuestValidator`: Mongo id plus a non-empty `slotId` param.

- [ ] **Step 1: Write the failing tests** in `test/quickMatchInvites.test.ts`:
  - `create invites every searched player except the host`: the host slot has a `playerId`. Every other slot sent with a `playerId` instead has `invitedPlayerId`, no `playerId`, and the account's real name even when the body sent another name.
  - `createForKnockout still links directly`.
  - `accept works while waiting and while live`. It's refused after completion with `This match finished before you accepted.`, and refused for a knockout match.
  - `accept is refused for someone already in another slot`: Review Focus 3.
  - `two accepts at once land once`: `Promise.all` of two `acceptInvite` calls, one null. Also `an accept racing a code claim on that slot`: exactly one of them fills it. Review Focus 2.
  - `a stranger can't claimSlot an invited slot`, and `an invitee claimSlot on their own slot accepts`, and `on another slot is refused with the spec message`: Review Focus 1.
  - `decline renames the slot to Player N`, where N is the slot's 1-based position in its side. The side is renamed too when its name equalled the decliner's name. With cricket lineups set, the lineup entry with that `slotId` is renamed. Decline is allowed after completion and changes no participation rows.
  - `playAsGuest is host-only and keeps the name`.
  - `a pending slot at completion gets no participation row`: complete a badminton match and check `careerStats` rows, following `test/quickMatchCareer.test.ts`.
  - `listMine includes waiting or live matches I'm invited to, and not completed ones`, including when a `status` filter is passed.
  - `the create notification goes to the invitees with the invite copy`.

- [ ] **Step 2: Run to verify they fail.** Run: `npx vitest run test/quickMatchInvites.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **`create`:** convert the slots after the duplicate check (`_occupantIds` still sees the ids as `playerId`s there) and before `_repository.create`. Look up names with `playerRepository.getById`. `createForKnockout` is untouched.
  - **`claimSlot`:** before the slot checks, find the caller's pending slot. Its own `slotId` goes to `acceptInvite`; any other `slotId` is refused.
  - **`declineInvite`:** load, check the invitee, and apply the renames with a `persist` (it isn't racing anyone for the slot). Rename cricket lineups on the `QuickCricketMatchModel` document's `cricketSetup.side1Lineup` / `side2Lineup` entries by `slotId`.
  - **`listForPlayer`:** add the invite branch to the `$or`, with its own status and completed conditions.
  - **`addedToQuickMatch`:** change it to the spec copy, with the recipients being the invitees.

- [ ] **Step 4: Run to verify they pass.** Run that file, then the suites that border it: `npx vitest run test/quickMatchCreate.test.ts test/quickMatchWaitingRoom.test.ts test/quickMatchRaces.test.ts test/quickMatchListMine.test.ts test/quickMatchCareer.test.ts test/quickMatchHttp.test.ts test/notificationMessages.test.ts test/notificationTriggers.test.ts`. Expected: all PASS. Update any assertion that encoded the old "searched player is linked at create" behaviour, and say which ones in the task report.

### Task 3: Account deletion scrubs invites (server)

**Files:**
- Modify: `server/src/services/accountDeletion.service.ts:159-200` (`scrubQuickPlay`)
- Test: `server/test/accountDeletion.test.ts`

**Interfaces:**
- Consumes: the `invitedPlayerId` fields from Tasks 1 and 2.

- [ ] **Step 1: Write the failing test** `deleting a player scrubs their pending invites`. A pending knockout row and a pending quick-match slot both read `Deleted player` and have no `invitedPlayerId` afterwards. Another player's invite in the same documents is untouched.
- [ ] **Step 2: Run** `npx vitest run test/accountDeletion.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Two `updateMany` calls with `arrayFilters` on `invitedPlayerId`, mirroring the existing `playerId` ones at lines 183-199. Each `$set`s `displayName` to `GONE` and `$unset`s `invitedPlayerId`.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then run `npx tsc --noEmit` and `npx eslint --ext .ts .` in `D:\kria\server` (there's no `lint` script). Expected: clean.

### Task 4: App data layer: types, API calls, hooks, notification route

**Files:**
- Modify: `mobile/src/api/quickKnockout.ts`, `mobile/src/api/quickMatch.ts`, `mobile/src/api/notifications.ts` (kind union)
- Modify: `mobile/src/lib/useQuickKnockout.ts`, `mobile/src/lib/useQuickMatch.ts`, `mobile/src/lib/notificationsView.ts`
- Test: `mobile/__tests__/quickKnockoutApi.test.ts`, `quickMatchApi.test.ts`, `notificationsView.test.ts`, `useQuickKnockout.test.tsx`

**Interfaces:**
- Consumes: the server routes from Tasks 1 and 2.
- Produces:
  - **Types:** `KnockoutPlayer.invitedPlayerId?: string` and `QuickMatchSlot.invitedPlayerId?: string`.
  - **API calls** (each returns the updated document):
    - `acceptKnockoutInvite(id: string)`, `declineKnockoutInvite(id: string)`, `playKnockoutAsGuest(id: string, playerKey: string)`, each `Promise<QuickKnockout>`;
    - `acceptQuickMatchInvite(id: string)`, `declineQuickMatchInvite(id: string)`, `playQuickMatchSlotAsGuest(id: string, slotId: string)`, each `Promise<QuickMatch>`.
  - **`useQuickKnockout`** returns `acceptInvite()`, `declineInvite()` and `playAsGuest(playerKey)`, through `withId` like the others.
  - **`useQuickMatch`** exposes the three quick-match actions the same way that hook already runs `start` and `remove`.
  - **Notifications:** `NotificationKind` gains `'knockout_invite'`, with icon `'group_add'` (already generated). `OPENABLE` gains `'/knockout/[id]'`.

- [ ] **Step 1: Write the failing tests:**
  - Each API function calls the right path with the right verb (follow the existing cases in the two API test files).
  - `targetHref` opens `/knockout/[id]`.
  - `useQuickKnockout().acceptInvite` stores the returned knockout.
- [ ] **Step 2: Run** `npx jest __tests__/quickKnockoutApi.test.ts __tests__/quickMatchApi.test.ts __tests__/notificationsView.test.ts __tests__/useQuickKnockout.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the signatures above.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then `npx tsc --noEmit`. Expected: clean.

### Task 5: Knockout room: host's pending rows, Start blocker, the invitee's card

**Files:**
- Create: `mobile/src/components/room/InviteCard.tsx` (shared with Task 6)
- Modify: `mobile/src/lib/knockoutRoom.ts:76` (`playerSub`), `mobile/src/lib/quickKnockoutView.ts:52` (`startBlocker`)
- Modify: `mobile/src/components/knockout/People.tsx` (`PlayerRow`, `RallyPeople`, `CricketPeople`: an `onGuest` prop)
- Modify: `mobile/src/app/knockout/[id].tsx` (SpotSheet subtitle, invite card, wiring)
- Test: `mobile/__tests__/knockoutRoom.test.tsx`, `quickKnockoutView.test.ts`, `KnockoutScreen.test.tsx`

**Interfaces:**
- Consumes: Task 4's hook actions and types.
- Produces:
  - `InviteCard({ title, busy, finished, onAccept, onDecline }: { title: string; busy: boolean; finished: boolean; onAccept: () => void; onDecline: () => void })`.
    - While accepting is open, it shows `title`, Accept and Decline.
    - When `finished`, it shows `This finished before you accepted` and `Remove my name` (which calls `onDecline`).
    - Build it from the existing `Button` and the tokens in `src/constants/theme.ts`, per `DESIGN.md`.
  - `myInvite(k: QuickKnockout, meId: string): KnockoutPlayer | undefined`, in `quickKnockoutView.ts`.

- [ ] **Step 1: Write the failing tests:**
  - `playerSub` returns `Invited · waiting` for a pending row.
  - `startBlocker` returns the spec message for 1, 2 and 3 pending names (rally and cricket).
  - In `KnockoutScreen`: the host sees Play as guest on a pending row, and tapping it calls `playAsGuest(playerKey)`. The search sheet subtitle is the spec copy. The invitee sees the InviteCard, Accept calls `acceptInvite`, and Decline calls `declineInvite` and goes back. A cancelled knockout shows `Remove my name`.
- [ ] **Step 2: Run** `npx jest __tests__/knockoutRoom.test.tsx __tests__/quickKnockoutView.test.ts __tests__/KnockoutScreen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `startBlocker` checks pending invites first, for every sport.
  - The invitee view: when `myInvite(k, meId)` exists, render the InviteCard above the normal content, with title `<hostName(k)> invited you to <k.name>`. `finished` is `k.status !== 'waiting'`.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then run `npx tsc --noEmit` and `npx eslint` on the changed files. Expected: no new errors.

### Task 6: Quick match screens and the lists

**Files:**
- Modify: `mobile/src/lib/roomView.ts:40` (`roster`: the invited slot's sub-line and a `guestable` flag), `mobile/src/components/room/Roster.tsx` (`onGuest` prop)
- Modify: `mobile/src/app/quick/[id].tsx` (InviteCard for the invitee, Roster wiring)
- Modify: `mobile/src/components/compete/Matches.tsx`, `mobile/src/app/(tabs)/home.tsx` (the `Invited` label)
- Test: `mobile/__tests__/QuickMatchScreen.test.tsx`, `MatchesScreen.test.tsx`, plus a `roomView` case in the closest existing test file

**Interfaces:**
- Consumes: `InviteCard` (Task 5), and Task 4's quick-match actions and types.
- Produces: `invitedMe(item: { players?: KnockoutPlayer[]; sides?: QuickMatchSide[] }, meId: string): boolean`, in `mobile/src/lib/quickMatchView.ts`. Used by both lists.

- [ ] **Step 1: Write the failing tests:**
  - In the waiting room, the host sees an invited slot reading `Invited`, with Play as guest, which calls `playAsGuest(slotId)`. Live screens are unchanged.
  - The invitee sees the InviteCard while the match is waiting or live, and Accept calls accept.
  - After completion, the card shows `This finished before you accepted`, and `Remove my name` calls decline.
  - A list row where `invitedMe` is true shows `Invited`.
- [ ] **Step 2: Run** `npx jest __tests__/QuickMatchScreen.test.tsx __tests__/MatchesScreen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** to the interfaces above. Also confirm `(tabs)/awards.tsx`, `(tabs)/profile.tsx` and `player/[playerId].tsx`, which also call `listMyQuickKnockouts`, only count completed knockouts or the player's own linked rows. A waiting invite must not show as a knockout played. If one doesn't, filter it with `invitedMe`.
- [ ] **Step 4: Run** the same command, then the neighbours: `npx jest __tests__/AllMatchesScreen.test.tsx __tests__/quickMatchView.test.ts __tests__/NotificationsScreen.test.tsx`. Expected: all PASS. Then run `npx tsc --noEmit` and `npx eslint` on the changed files. Expected: no new errors.

### Finish

- [ ] Run the full gates one repo at a time.
  - **Server:** `npx tsc --noEmit`, `npx eslint --ext .ts .`, `npx vitest run`.
  - **App:** `npx tsc --noEmit`, `npx jest`.
- [ ] Add a line under LAUNCH-AUDIT section 5 ("Quick knockout") saying it's fixed by this feature, with test file names.
