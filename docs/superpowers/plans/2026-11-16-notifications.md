# Notifications (SERVER-GAPS #2 and #5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five events (entry decided, sold or assigned at auction, match starting, tournament news, added to a quick match) store a notification for each player concerned and push it to their phones. The app lists them, shows a Home bell, and asks for permission once.

**Architecture:**
- **Server:** one `notificationService.deliver(build)` entry point. Each of the five places calls it after its own write. It runs a builder that looks up names and recipients, inserts one row per player, and fires the Expo pushes without awaiting them, swallowing and logging every error. Copy lives in pure builders in `services/notification/messages.ts`. "New" is one `notificationsSeenAt` time per player.
- **App:** reads the list, the unread count and a mark-read call. It registers its Expo push token on sign-in and removes it on log out.

**Tech Stack:** Node/Express/Mongoose with vitest (server). Expo SDK 58 / React Native with jest and `expo-notifications` (mobile). Expo's push HTTP API through the built-in `fetch`.

**Spec:** `mobile/docs/superpowers/specs/2026-11-16-notifications-design.md` (approved 16 Nov). Read it first; its tables are the source for every string below.

## Global Constraints

- **Repos:** two, `d:\kria\server` and `d:\kria\mobile`. The web client doesn't change.
- **Git:** never run git commit, push, stash or checkout. The user commits. Each task ends with its gate, not a commit.
- **Tests first:** write each test and watch it fail before writing the code.
- **No new npm packages.** Server pushes use the global `fetch` (Node ≥ 18).
- **Notification kinds**, exactly: `entry_approved`, `entry_rejected`, `sold`, `match_starting`, `announcement`, `added_to_quick_match`.
- **Copy:**
  - Row and push text: the spec's two tables, verbatim. Push context parts are joined with ", ", row context parts with " · ".
  - Money: `₹` + `n.toLocaleString('en-IN')` with 0 decimals for whole amounts, else 2 (the app's `rupees`).
  - Sport names: Badminton, Cricket, Table Tennis (the app's `SPORT_LABELS`).
- **Retention:** rows expire 90 days after `createdAt` (TTL index).
- **Expo:**
  - Endpoint: `POST https://exp.host/--/api/v2/push/send`, with headers `Authorization: Bearer ${config.EXPO_ACCESS_TOKEN}`, `Content-Type: application/json` and `Accept: application/json`.
  - At most 100 messages per request.
  - No push at all when `config.EXPO_ACCESS_TOKEN` is empty. Tests leave it empty, except where a test sets it.
- **App screen copy, verbatim:**
  - Empty state title: "Nothing yet"
  - Empty state line: "Enter a tournament and you'll hear when your entry is decided, when you're sold at auction, when your match starts and when the organiser posts news."
  - Empty state button: "Find an event"
  - Pushes-off bar: "Notifications are off on this phone. You'll still find them here.", with the button "Turn on".
  - Sections: "New", "Earlier".
  - Load error: "Couldn't load notifications."
  - 5h ask: "Know when it's your turn." / "Only for things you're part of. No promotions." / "Turn on notifications" / "Not now", and the five list rows from the spec.
- **CRLF:** server files are often CRLF. Use the edit tool for multi-line edits.
- **Server tests:** run from PowerShell (`npx vitest run test/<file>`). Under Git Bash, `/d/` paths break vitest's runner.
- **Mobile:**
  - Full jest runs use `--maxWorkers=2`.
  - Adding a route file needs `.expo/types/router.d.ts` regenerated before `tsc` passes. Start `npx expo start` briefly, then stop only the PID you started.
- **Processes:** subagents stop only processes they started. Never `taskkill /IM node.exe`.

## Review Focus

These are the cases no feature test naturally covers. Each one gets its test in the task that owns the code:

1. **Expo is down or answers 500.** The organiser's approve, sale or start still succeeds, and the rows exist. → Task 1, test `a failed push never fails the caller`.
2. **The same player twice in one delivery** (a doubles pair registered twice, or one player on both teams): one row, one push. → Task 1, test `dedupes players`.
3. **A big tournament: more than 100 tokens.** Requests are split into batches of 100. → Task 1, test `batches 100 messages per request`.
4. **A phone that changes hands.** The token moves to whoever signed in last, so the previous player's pushes stop. → Task 2, test `a token belongs to the last player who saved it`.
5. **Expo Go, or permission denied.** Registering a token returns null and never throws, and the screens still render. → Task 6, test `registerPushToken returns null when the token can't be had`.
6. **A push carrying a path the app doesn't know.** Tapping it does nothing, with no crash. → Task 7, test `targetHref ignores unknown paths`.

---

### Task 1: Notification store and sender (server)

**Files:**
- Create: `server/src/models/notification.model.ts`
- Create: `server/src/repository/notification.repository.ts`
- Create: `server/src/services/notification/messages.ts`
- Create: `server/src/services/notification.service.ts`
- Modify: `server/src/models/player.model.ts` (add `notificationsSeenAt?: Date`)
- Modify: `server/src/repository/player.repository.ts` (add `getPushTokens`, `removePushTokenEverywhere`)
- Modify: `server/src/config/index.ts` (add `EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN || ''`)
- Test: `server/test/notificationMessages.test.ts`, `server/test/notificationService.test.ts`

**Interfaces:**
- Produces:
  - `type NotificationKind = 'entry_approved' | 'entry_rejected' | 'sold' | 'match_starting' | 'announcement' | 'added_to_quick_match'`
  - `type NotificationMessage = { kind: NotificationKind; title: string; detail?: string; context: string; target: { path: string; params: Record<string, string> }; ref?: string; push: { title: string; body: string } }`
  - `type Delivery = { playerIds: (string | null | undefined)[]; message: NotificationMessage }`
  - `notificationService.deliver(build: () => Promise<Delivery[]>): Promise<void>` never rejects. It awaits the inserts, not the pushes.
  - `notificationService.idle(): Promise<void>` resolves when in-flight pushes finish. It exists for tests.
  - `notificationService.retract(kind: NotificationKind, ref: string): Promise<void>` deletes every row with that kind and ref.
  - Builders in `messages.ts`. Each returns a `NotificationMessage`, and targets use the app's route patterns:
    - `entryApproved(e: { tournamentId; tournamentName; categoryId; categoryName })`: target `{ path: '/category/[categoryId]', params: { categoryId, tournamentId } }`
    - `entryRejected(e: same & { reason?: string })`
    - `placedOnTeam(e: same & { registrationId: string; teamName: string; price: number })`: kind `sold`, `ref: registrationId`
    - `matchStarting(e: { matchId; tournamentName; categoryName; round: string; opponent: string; court?: string })`: target `{ path: '/live/[matchId]', params: { matchId } }`
    - `announcementPosted(e: { tournamentId; tournamentName; title?: string; message: string; authorName: string; authorRole: string })`: target `{ path: '/tournament/[id]/announcements', params: { id: tournamentId } }`
    - `addedToQuickMatch(e: { matchId; hostName; side1: string; side2: string; sport: string })`: target `{ path: '/quick/[id]', params: { id: matchId } }`
  - `matchRound(m: { bracketRound?: string; positionInRound?: number; tieId?: unknown; slotLabel?: string; subMatchSlotNumber?: number }): string`
  - `playerRepository.getPushTokens(ids: string[]): Promise<{ _id: string; fcmTokens: string[] }[]>`
  - `playerRepository.removePushTokenEverywhere(token: string): Promise<void>`

- [ ] **Step 1: Write the failing builder tests** (`notificationMessages.test.ts`). Each string comes from the spec's tables:

```ts
const e = { tournamentId: 't1', tournamentName: 'Arohance Open', categoryId: 'c1', categoryName: "Men's Doubles" };
expect(entryApproved(e)).toMatchObject({ kind: 'entry_approved', title: "Entry approved: Men's Doubles", context: 'Arohance Open',
  target: { path: '/category/[categoryId]', params: { categoryId: 'c1', tournamentId: 't1' } }, push: { title: "Entry approved: Men's Doubles", body: 'Arohance Open' } });
expect(entryRejected({ ...e, reason: 'This category is for players aged 35 and over.' })).toMatchObject({
  title: "Entry not accepted: Men's Doubles", detail: 'Reason: This category is for players aged 35 and over.',
  push: { body: 'Arohance Open. Reason: This category is for players aged 35 and over.' } });
expect(entryRejected(e).detail).toBeUndefined();
expect(placedOnTeam({ ...e, registrationId: 'r1', teamName: 'Rawnat United', price: 16500 })).toMatchObject({
  kind: 'sold', ref: 'r1', title: 'Sold to Rawnat United for ₹16,500', context: "Men's Doubles · Arohance Open", push: { body: "Men's Doubles, Arohance Open" } });
expect(placedOnTeam({ ...e, registrationId: 'r1', teamName: 'Rawnat United', price: 0 }).title).toBe('Assigned to Rawnat United');
expect(matchStarting({ matchId: 'm1', tournamentName: 'Arohance Open', categoryName: "Men's Singles", round: 'Quarter-final 2', opponent: 'Asha Rao', court: '2' })).toMatchObject({
  title: 'Your match is starting', detail: 'Quarter-final 2 vs Asha Rao · Court 2', context: "Men's Singles · Arohance Open",
  target: { path: '/live/[matchId]', params: { matchId: 'm1' } },
  push: { title: 'Your match is starting', body: "Quarter-final 2 vs Asha Rao · Court 2. Men's Singles, Arohance Open" } });
expect(announcementPosted({ tournamentId: 't1', tournamentName: 'Arohance Open', title: 'Court change for the semi-finals', message: 'Semi-finals move to courts 3 and 4.', authorName: 'Asha Rao', authorRole: 'organizer' })).toMatchObject({
  title: 'Court change for the semi-finals', detail: 'Semi-finals move to courts 3 and 4.', context: 'Arohance Open · Asha Rao, organiser',
  push: { title: 'Arohance Open: Court change for the semi-finals', body: 'Semi-finals move to courts 3 and 4.' } });
expect(announcementPosted({ tournamentId: 't1', tournamentName: 'Arohance Open', message: 'Bring white shoes.\nCourts open at 7.', authorName: 'Asha Rao', authorRole: 'staff' })).toMatchObject({
  title: 'Bring white shoes.', context: 'Arohance Open · Asha Rao, staff', push: { title: 'Arohance Open', body: 'Bring white shoes.\nCourts open at 7.' } });
expect(addedToQuickMatch({ matchId: 'q1', hostName: 'Karan Mehta', side1: 'Smash Bros', side2: 'Net Gains', sport: 'table_tennis' })).toMatchObject({
  title: 'Karan Mehta added you to Smash Bros vs Net Gains', context: 'Quick match · Table Tennis',
  target: { path: '/quick/[id]', params: { id: 'q1' } }, push: { body: "Table Tennis quick match. It's in your matches." } });
expect(matchRound({ bracketRound: 'Quarter-Final', positionInRound: 1 })).toBe('Quarter-final 2');
expect(matchRound({ bracketRound: 'Final', positionInRound: 0 })).toBe('Final');
expect(matchRound({ bracketRound: 'Group A', positionInRound: 3 })).toBe('Group A');
expect(matchRound({ tieId: 'x', slotLabel: "Men's Doubles 1" })).toBe("Men's Doubles 1");
expect(matchRound({ tieId: 'x', subMatchSlotNumber: 2 })).toBe('Match 2');
```

- [ ] **Step 2: Run** `npx vitest run test/notificationMessages.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement `messages.ts`.**
  - `matchRound` follows the app's `roundTitle`/`roundLabel`: a group round (`/^Group [A-Z]$/`) keeps its name. Otherwise the first letter is kept and the rest lowercased. `Final`, `League` and group rounds carry no number. A sub-match uses `slotLabel ?? 'Match {n}'`.
  - The role reads `staff` when `authorRole === 'staff'`, otherwise `organiser`.

- [ ] **Step 4: Run.** Expected: PASS.

- [ ] **Step 5: Write the failing service tests** (`notificationService.test.ts`). Players are created with `fcmTokens`; set `config.EXPO_ACCESS_TOKEN = 'test-token'` in a `beforeEach`, restored after; stub `fetch` with `vi.spyOn(globalThis, 'fetch')`.
  - `stores one row per player and pushes to each token`: one delivery to two players with tokens `ExponentPushToken[a]` and `ExponentPushToken[b]`, then `await idle()`.
    - There are 2 rows with the message's fields.
    - fetch is called once, with the URL above and the `Authorization` header.
    - Each body message has `{ to, title: push.title, body: push.body, sound: 'default', data: { notificationId: <that player's row _id>, path, params } }`.
  - `dedupes players`: `playerIds: [a, a, null, undefined]` gives 1 row and 1 message.
  - `batches 100 messages per request`: 101 tokens across players gives 2 fetch calls, of sizes 100 and 1.
  - `removes a token Expo reports as not registered`: fetch answers `{ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] }`. The player's `fcmTokens` no longer holds that token.
  - `a failed push never fails the caller`: fetch rejects. `deliver` resolves, the row exists, and `idle()` resolves.
  - `a builder that throws is logged, not thrown`: `deliver(async () => { throw new Error('x') })` resolves, and `logger.error` was called.
  - `sends nothing without an access token`: with `config.EXPO_ACCESS_TOKEN = ''`, the row is stored and fetch isn't called.
  - `retract deletes every row of that kind and ref`.

- [ ] **Step 6: Run.** Expected: FAIL.

- [ ] **Step 7: Implement the model, the repository and the service.**
  - **Model:** `playerId` (String, required), `kind`, `title`, `detail`, `context`, `target` (`{ path, params: Mixed }`), `ref`, and timestamps.
  - **Indexes:** `{ playerId: 1, createdAt: -1 }`, `{ kind: 1, ref: 1 }`, and the TTL `{ createdAt: 1 }` with `expireAfterSeconds: 90 * 86400`.
  - **`deliver`:** inserts with `insertMany`, then starts `this._send(...)` without awaiting it. That send's promise goes into a set that `idle()` awaits. Errors are logged with `logger.error` (`import logger from '../utils/logger'`).
  - **Tickets** come back in message order: match them by index.

- [ ] **Step 8: Run both test files.** Expected: PASS.

- [ ] **Step 9: Gate:** `npx tsc --noEmit -p .` is clean, and `npx eslint src test --ext .ts` is clean.

### Task 2: Routes and token ownership (server)

**Files:**
- Create: `server/src/routes/notification.route.ts`
- Create: `server/src/controllers/notification.controller.ts`
- Create: `server/src/middlewares/validators/notification.validator.ts`
- Modify: `server/src/routes/v1.route.ts`: `v1Router.use('/player/notifications', notificationRouter)`, placed before the `/player` routers
- Modify: `server/src/repository/player.repository.ts` (`addFcmToken`)
- Modify: `server/src/services/notification.service.ts` (add `list`, `unreadCount`, `markRead`)
- Test: `server/test/notificationsHttp.test.ts`

**Interfaces:**
- Consumes: the Task 1 model and service.
- Produces:
  - `GET /player/notifications?before=<ISO>` → `data.data = { notifications: Row[], seenAt: string | null }`. At most 30 rows, newest first, `createdAt < before` when given. `Row = { _id, kind, title, detail?, context, target, createdAt }`.
  - `GET /player/notifications/unread-count` → `data.data = { count: number }`.
  - `POST /player/notifications/read` → `data.data = { seenAt: string }`.
  - All three require `isPlayerLoggedIn`. `before` must be an ISO date (422 otherwise).

- [ ] **Step 1: Write the failing tests.** Use the `login()` helper pattern from `test/savedTournaments.test.ts`.
  - `lists my notifications newest first, 30 a page, with seenAt`: insert 31 rows for me and 1 for another player.
    - The first page has 30, newest first, none of the other player's, and `seenAt: null`.
    - `?before=<the 30th createdAt>` returns the last one.
  - `counts what is newer than seenAt, and read clears it`: count is 2. After `POST read`, count is 0. A newer row makes it 1. `seenAt` is returned by the list.
  - `needs a signed-in player`: each route without auth answers 400 (the middleware's missing-header answer).
  - `a token belongs to the last player who saved it`: A posts `{ token: 'ExponentPushToken[x]' }` to `/player/auth/fcm-token`, then B posts the same token. B has it and A doesn't.

- [ ] **Step 2: Run** `npx vitest run test/notificationsHttp.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - `addFcmToken(id, token)` first runs `updateMany({ _id: { $ne: id }, fcmTokens: token }, { $pull: { fcmTokens: token } })`, then `$addToSet` as now.
  - `markRead` sets `notificationsSeenAt: new Date()`.
  - Controllers follow `careerStats.controller.ts`: read `req.player._id`, then `next(response)`.

- [ ] **Step 4: Run.** Expected: PASS.

- [ ] **Step 5: Gate:** `tsc` and `eslint`, as in Task 1.

### Task 3: Entry decisions, tournament news and quick matches (server)

**Files:**
- Modify: `server/src/services/tournamentRegistration.service.ts` (`approve`, `reject`)
- Modify: `server/src/services/announcement.service.ts` (`create`)
- Modify: `server/src/services/quickMatch.service.ts` (`create`)
- Test: `server/test/notificationTriggers.test.ts`

**Interfaces:**
- Consumes: `notificationService.deliver`, `entryApproved`, `entryRejected`, `announcementPosted` and `addedToQuickMatch` from Task 1.

- [ ] **Step 1: Write the failing tests.** Call the service methods directly, as existing service tests do, then read `Notification` rows.
  - `approving an entry tells its player`: one row for the registration's `playerId`, title "Entry approved: {category name}".
  - `rejecting tells its player, with the reason when given`.
  - `an entry with no player account sends nothing`.
  - `news reaches each live entrant once`: entrants are approved, pending, withdrawn and rejected, plus one player with two categories. The approved and pending players get one row each (the two-category player too). Withdrawn and rejected get none.
  - `a new quick match tells the players the host added, not the host`: slots are the host's id, player P, and a placeholder with no `playerId`. Only P gets a row, with title "{host first} {host last} added you to {side 1} vs {side 2}".

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement.**
  - Each method, after its own write succeeds, calls `await notificationService.deliver(async () => [...])`, looking up names with `tournamentRepository.getById` and `categoryRepository.getById`.
  - **News:** `tournamentRegistrationRepository.getByTournament(tournamentId)`, keeping status not `withdrawn` or `rejected`, mapped to `playerId`.
  - **Host name:** from `playerRepository` (`firstName lastName`).

- [ ] **Step 4: Run.** Expected: PASS. Then run the existing `announcement.test.ts`, `entryRules.test.ts` and `quickBadmintonHttp.test.ts`. Expected: PASS.

- [ ] **Step 5: Gate:** `tsc` and `eslint`.

### Task 4: Sold or assigned at auction, and undo (server)

**Files:**
- Modify: `server/src/services/auction.service.ts` (`startAuction`, `sellPlayer`, `distributeEvenly`, `undoLast`)
- Test: `server/test/notificationAuction.test.ts`

**Interfaces:**
- Consumes: `placedOnTeam`, `deliver` and `retract` from Task 1. Team names come from `teamRepository`.

- [ ] **Step 1: Write the failing tests.** Reuse the setup style of `test/auctionPlace.test.ts` and `test/distributePlayers.test.ts`.
  - `a sale tells the player the team and price`: the row title is "Sold to {team} for ₹{price}".
  - `a pre-assigned player placed at the start is told "Assigned to {team}"`.
  - `even distribution tells each placed player "Assigned to {team}"`.
  - `undo removes the sale's notification`: sell, then `undoLast`. There's no `sold` row with `ref` equal to that registration.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement.**
  - After each placement, deliver `placedOnTeam`, with `price` = the stored sold price (0 for carry-overs and distribution).
  - In `undoLast`, after `removeLastLog` succeeds, `retract('sold', id)` for each registration the undo unassigns: the sale's registration when it stood, plus every unwound carry-over.

- [ ] **Step 4: Run** this file plus `auction*.test.ts` and `distributePlayers.test.ts`. Expected: PASS.

- [ ] **Step 5: Gate:** `tsc` and `eslint`.

### Task 5: Your match is starting (server)

**Files:**
- Create: `server/src/services/notification/matchStart.ts`
- Modify: `server/src/sports/badminton/services/badmintonMatch.service.ts` (live start, about line 335; live point, about line 382)
- Modify: `server/src/sports/badminton/services/teamLeague.service.ts` (`startLiveScoring`, about line 668, and the sub-match point path, about line 725: set `startedAt` once, as badminton does)
- Modify: `server/src/sports/cricket/services/cricketMatch.service.ts` (`recordToss`)
- Test: `server/test/notificationMatchStart.test.ts`

**Interfaces:**
- Consumes: `matchStarting`, `matchRound` and `deliver` from Task 1.
- Produces: `matchStartDeliveries(match): Promise<Delivery[]>`. It returns one delivery per side, whose players are told the other side's name as `opponent`.
  - **Sides:**
    - A sub-match (`tieId` set) uses `player{n}.registrationId.split(',')` as **player** ids, and `player{n}.name`.
    - A team side (`competitorType === 'team'`, or a cricket match) uses every registration from `getByTeamAndCategory(teams.team{n}Id, categoryId)` whose status isn't withdrawn or rejected, and `teams.team{n}Name`.
    - A player side uses `player{n}.registrationId`'s registration plus its `partnerRegistrationId` partner, and `player{n}.name`.
  - **Court:** `schedule.court`.

- [ ] **Step 1: Write the failing tests.**
  - `a badminton match going live tells both sides, partners included`: a doubles match with pairs (A,B) v (C,D) and court "2", started live.
    - A and B get the detail "{round} vs {C/D side name} · Court 2".
    - C and D get the other side's name.
  - `only the first start counts`: start, then point, then reopen and start again. Each player has one row.
  - `a team-league sub-match tells its lineup`: the sub-match's side `registrationId` is `'p1,p2'`, so p1 and p2 get rows and the detail starts with the slot label.
  - `a cricket toss tells both teams once`: the second `recordToss` adds no rows.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement.**
  - At each site, read `const first = !match.startedAt` (cricket: `!existing?.toss?.recorded`) before the update.
  - After it, `if (first) await notificationService.deliver(() => matchStartDeliveries(updated))`.
  - Look up the names from the category and tournament.

- [ ] **Step 4: Run** this file plus `badmintonLiveScoring.test.ts`, `careerStatsTeamLeague.test.ts` and `cricket*.test.ts`. Expected: PASS.

- [ ] **Step 5: Server gate:** `npx tsc --noEmit -p .`, then the full `npx vitest run` (expect 151 files plus the 5 new ones, all passing), then `npx eslint src test --ext .ts`.

### Task 6: App API, push registration and log out (mobile)

**Files:**
- Create: `mobile/src/api/notifications.ts`
- Create: `mobile/src/lib/push.ts`
- Modify: `mobile/src/app/_layout.tsx` (register the token once signed in)
- Modify: `mobile/src/app/(tabs)/profile.tsx` (Log out awaits `unregisterPushToken()` before `dispatch(logout())`)
- Modify: `mobile/jest.setup.ts` (a default `jest.mock('expo-notifications', …)` with jest.fn for every function used)
- Test: `mobile/__tests__/notificationsApi.test.ts`, `mobile/__tests__/push.test.ts`

**Interfaces:**
- Produces:
  - `type NotificationKind` (the six kinds)
  - `type AppNotification = { _id: string; kind: NotificationKind; title: string; detail?: string; context: string; target: { path: string; params: Record<string, string> }; createdAt: string }`
  - `getNotifications(before?: string): Promise<{ notifications: AppNotification[]; seenAt: string | null }>`
  - `getUnreadCount(): Promise<number>`
  - `markNotificationsRead(): Promise<void>`
  - `savePushToken(token: string): Promise<void>` → `POST /player/auth/fcm-token { token }`
  - `removePushToken(token: string): Promise<void>` → `DELETE /player/auth/fcm-token`, `data: { token }`
  - `pushPermission(): Promise<'granted' | 'denied' | 'undetermined'>`, and `canAskAgain(): Promise<boolean>`
  - `askPushPermission(): Promise<boolean>`
  - `registerPushToken(): Promise<string | null>`
  - `unregisterPushToken(): Promise<void>`
  - `configurePushHandling(): void`: a foreground banner, with list and sound on

- [ ] **Step 1: Write the failing tests.**
  - **API** (axios-mock-adapter, as `recentMatchesApi.test.ts`): each function's method, path, params and body, and unwrapping `{ data: { data: … } }`.
  - **Push:**
    - `registerPushToken saves the Expo token when allowed`: it creates the Android channel `default`, calls `getExpoPushTokenAsync({ projectId: '6e2afcc6-b326-4ce8-80e4-b99e314160f7' })` and `savePushToken('ExponentPushToken[x]')`, and returns the token.
    - `registerPushToken returns null when the token can't be had`: when `getExpoPushTokenAsync` rejects (Expo Go), it resolves null and nothing is saved.
    - `registerPushToken asks nothing and saves nothing without permission`.
    - `unregisterPushToken removes the saved token, and swallows a failure`.

- [ ] **Step 2: Run** `npx jest __tests__/notificationsApi.test.ts __tests__/push.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - `projectId` is `Constants.expoConfig?.extra?.eas?.projectId`.
  - `registerPushToken` keeps the token in a module variable for `unregisterPushToken`.
  - `_layout.tsx` calls `configurePushHandling()` once, and `registerPushToken()` whenever `user?._id` becomes set.

- [ ] **Step 4: Run.** Expected: PASS. Then `npx jest __tests__/OwnProfileScreen.test.tsx`: Log out still dispatches logout, after `unregisterPushToken`.

- [ ] **Step 5: Gate:** `npx tsc --noEmit` is clean.

### Task 7: Notifications screen (mobile)

**Files:**
- Create: `mobile/src/lib/notificationsView.ts`
- Create: `mobile/src/app/notifications.tsx`
- Modify: `mobile/scripts/icons.mjs` (add `notifications`, `notifications_off`, `notifications_active`, `play_circle`, `group_add`, `how_to_reg`, `cancel`), then run `node scripts/icons.mjs`
- Test: `mobile/__tests__/notificationsView.test.ts`, `mobile/__tests__/NotificationsScreen.test.tsx`

**Interfaces:**
- Consumes: the Task 6 API and `pushPermission`, `canAskAgain`, `askPushPermission` and `registerPushToken`. `timeAgo` comes from `lib/tournamentView`.
- Produces:
  - `NOTIFICATION_ICON: Record<NotificationKind, IconName>`: `how_to_reg`, `cancel`, `gavel`, `play_circle`, `campaign` and `group_add`, in the kinds' order.
  - `splitBySeen(list: AppNotification[], seenAt: string | null): { fresh: AppNotification[]; earlier: AppNotification[] }`. A null `seenAt` means everything is fresh.
  - `targetHref(t: AppNotification['target']): { pathname: string; params: Record<string, string> } | null`. It returns null unless the path is one of `/category/[categoryId]`, `/live/[matchId]`, `/tournament/[id]/announcements` or `/quick/[id]`.
  - `rowContext(n: AppNotification, now: Date): string` = `${n.context} · ${timeAgo(n.createdAt, now)}`.

- [ ] **Step 1: Write the failing view tests.**
  - `splitBySeen` puts rows newer than `seenAt` in `fresh`, and everything when it's null.
  - `targetHref ignores unknown paths`: `{ path: '/admin', params: {} }` gives null, and each of the four known paths passes through.
  - `rowContext` ends with "5 min ago" for a row 5 minutes old.

- [ ] **Step 2: Write the failing screen tests.** Mock the API module and `lib/push`, with the `expo-router` mock pattern from `CategoryScreen.test.tsx`.
  - `shows New and Earlier, then marks read`:
    - Rows render title, detail and context.
    - "New" lists the rows newer than `seenAt` and "Earlier" the rest, with "Unread" on each new row.
    - `markNotificationsRead` is called after `getNotifications` resolves.
  - `a row opens its target`: pressing a row pushes `{ pathname: '/live/[matchId]', params: { matchId: 'm1' } }`.
  - `Load more pages with before`: a 30-row first page shows "Load more". Pressing it calls `getNotifications(<oldest createdAt>)`, and a short page hides it.
  - `nothing yet`: an empty list shows "Nothing yet", the line, and "Find an event", which pushes `/(tabs)/events`.
  - `pushes off shows the bar, and Turn on asks`:
    - With `pushPermission` 'undetermined', the bar text shows. "Turn on" calls `askPushPermission`, then `registerPushToken` when it was granted.
    - When it's 'denied' and `canAskAgain` is false, "Turn on" calls `Linking.openSettings`.
    - When it's 'granted', there's no bar.
  - `a failed load says so and retries`: it shows "Couldn't load notifications." and Retry refetches.

- [ ] **Step 3: Run both files.** Expected: FAIL.

- [ ] **Step 4: Implement** the view helpers and the screen, as the spec's "Notifications screen" section describes, using `TopBar`, `InlineError`, `Skeleton` and `Icon`. Regenerate the typed routes, then run `npx tsc --noEmit`.

- [ ] **Step 5: Run both files.** Expected: PASS.

### Task 8: Home bell and opening a push (mobile)

**Files:**
- Modify: `mobile/src/app/(tabs)/home.tsx` (the bell at the right of the header)
- Modify: `mobile/src/app/_layout.tsx` (open the target when a push is tapped, live or at launch; refresh the bell when one arrives)
- Create: `mobile/src/lib/unreadBell.ts`
- Test: extend `mobile/__tests__/HomeScreen.test.tsx` (or the existing Home test file), and add `mobile/__tests__/pushOpen.test.tsx`

**Interfaces:**
- Consumes: `getUnreadCount`, and `targetHref` from Task 7.
- Produces: `useUnreadCount(): { count: number; refresh: () => void }`. It refetches on focus and when `Notifications.addNotificationReceivedListener` fires, and it unsubscribes on unmount.

- [ ] **Step 1: Write the failing tests.**
  - `the bell shows a dot while something is new`: with an unread count of 3, the button labelled "Notifications, 3 new" is there. With 0, it's labelled "Notifications". Pressing it pushes `/notifications`.
  - `a tapped push opens its target`:
    - Firing the response listener with `data: { path: '/quick/[id]', params: { id: 'q1' } }` pushes it.
    - An unknown path pushes nothing.
    - `getLastNotificationResponseAsync` resolving with a response at launch pushes once, after the auth gate has routed.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement.** The bell follows the spec: 44px round, `surface1`, a 7px `accent` dot ringed in 2px `surface1` at top 11 / right 12.

- [ ] **Step 4: Run.** Expected: PASS.

### Task 9: The 5h ask, app config and the record (mobile and docs)

**Files:**
- Create: `mobile/src/app/turn-on-notifications.tsx`
- Modify: `mobile/src/app/(tabs)/home.tsx`. On first focus, when signed in, `pushPermission()` is 'undetermined' and the secure-store key `kria.pushAsked` is unset, push `/turn-on-notifications`.
- Modify: `mobile/app.json`: the plugin entry becomes `["expo-notifications", { "icon": "<monochrome icon>", "color": "#FF5A1F" }]`. Use `./assets/images/android-icon-monochrome.png` if it's white on transparent; otherwise add a 96×96 white-on-transparent Kria mark and use that.
- Modify: `d:\kria\SERVER-GAPS.md` (#2 and #5 Done blocks, and the header counts) and `d:\kria\HANDOVER-server-gaps.md`
- Test: `mobile/__tests__/TurnOnNotificationsScreen.test.tsx`, plus a Home test for the redirect

**Interfaces:**
- Consumes: `askPushPermission`, `registerPushToken`, `pushPermission` and `setItem`/`getItem` from `lib/secureStore`.

- [ ] **Step 1: Write the failing tests.**
  - `the ask lists the five moments`: it shows the title, the line and each of the five rows from the spec.
  - `Turn on asks, registers when allowed, and doesn't ask again`: it calls `askPushPermission`, then `registerPushToken` when granted. It sets `kria.pushAsked` to '1' and goes back.
  - `Not now remembers and goes back`: it sets the key and calls `askPushPermission` 0 times.
  - `Home sends an undecided player to the ask once`: with 'undetermined' and no key, it pushes `/turn-on-notifications`. With the key set, or with 'granted', it doesn't.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement** the screen to match the approved `Prompt` board: the onboarding mock 5h layout, with the spec's list. Update `app.json`, then confirm `npx expo config --json` resolves.

- [ ] **Step 4: Run.** Expected: PASS.

- [ ] **Step 5: Mobile gate:** `npx tsc --noEmit`, then `npx jest --maxWorkers=2` (expect 953 plus the new tests, all passing). Changed files lint clean apart from the five problems that predate this work.

- [ ] **Step 6: Record it.**
  - **SERVER-GAPS.md:** a Done (date) block for #2 and #5, in the file's format (what shipped, the calls made, Not done: iOS and delivery receipts), and the header counts at 39 closed with 1 open (#35).
  - **Handover:** the deploy steps:
    - set `EXPO_ACCESS_TOKEN` on the live server;
    - build an Android APK with `eas build --profile preview --platform android` and send a real test push;
    - if the first send is refused, raise the robot's role to Developer.
