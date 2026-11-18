# Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player delete their Kria account from the app and from `kria.club/delete-account` (LAUNCH-AUDIT B7).

**Architecture:** One server endpoint, `DELETE /player/auth/account`, calls `deletePlayerAccount(playerId)` in a new service. That service anonymises the player document, scrubs every stored copy of the player's name and contact details, and deletes their notifications, support messages and photo. The app calls the endpoint from a confirmation sheet in Settings. The web page reaches it through the existing email-code login.

**Tech Stack:**
- server: Express, Mongoose, vitest + supertest
- mobile: Expo Router, Redux Toolkit, jest + RNTL
- client: React, Vite, vitest + msw

**Spec:** `mobile/docs/superpowers/specs/2026-11-18-account-deletion-design.md`

## Global Constraints

- Replacement name: first name `Deleted`, last name `player`. Name copies become `Deleted player`.
- Replacement email: `deleted-<playerId>@deleted.invalid`.
- Kept: payments, including their `profile`; career-stat rows; organiser-typed team owner contacts; entry `age` and `gender`; entry status.
- No password is asked for. The app's sheet and the web's emailed code are the confirmation.
- Server tests run from PowerShell in `D:\kria\server` (uppercase drive). Mobile and client use `--maxWorkers=2` for full runs.
- Don't commit. The user commits.

## Review Focus

- **A Google-only account** (no password, no phone) deletes cleanly. Task 1 test.
- **The old token after deletion** gets 401, and a second delete also gets 401. Task 1 test.
- **The same email can sign up again** after deletion. Task 1 test.
- **A doubles name like `Asha Rao & Ravi K`**: only the deleted half is replaced. Task 2 test.
- **The web visitor is also signed in as an organiser**: the delete must use the player token from the code, not the stored one. Task 4 test.

---

### Task 1: Player document, endpoint, token death

**Files:**
- Create: `server/src/services/accountDeletion.service.ts`
- Modify: `server/src/models/player.model.ts` (add `IPlayerStatus.DELETED = 'deleted'`, `deletedAt: Date`)
- Modify: `server/src/controllers/playerAuth.controller.ts`, `server/src/routes/playerAuth.route.ts`
- Test: `server/test/accountDeletion.test.ts`

**Interfaces:**
- Produces: `deletePlayerAccount(playerId: string): Promise<void>` in `accountDeletion.service.ts`. Task 2 adds to it.
- Produces: `DELETE /player/auth/account` (requires `isPlayerLoggedIn`) → `200 { message: 'Account deleted.' }`.

- [ ] **Step 1: Failing tests** in `accountDeletion.test.ts`, through supertest. Sign in by issuing a token the way `playerGoogleAuth.test.ts` does, or log in with a password.
  - `it('erases the account and its personal details')`: after DELETE, the stored player has `firstName 'Deleted'`, `lastName 'player'`, email `deleted-<id>@deleted.invalid`, `isActive false`, `status 'deleted'` and a `deletedAt`. These are all unset or empty: `phone`, `password`, `dateOfBirth`, `gender`, `location`, `profileImage`, `otp`, `fcmTokens`, `savedTournaments`, `titles`, `honors`.
  - `it('the old token stops working')`: `GET /player/auth/profile` with the same token → 401, and a second `DELETE` → 401.
  - `it('deletes a Google-only account')`: an `authProvider 'google'` player with no phone or password → 200.
  - `it('frees the email for a new sign-up')`: after deletion, `Player.create` with the original email succeeds.
  - `it('needs a signed-in player')`: no token → 400 or 401, and the player is untouched.
- [ ] **Step 2:** Run `npx vitest run test/accountDeletion.test.ts` and expect FAIL (404 on the route).
- [ ] **Step 3: Implement.**
  - One `Player.updateOne` with `$set` for the name, email, status, `isActive` and `deletedAt`, and `$unset` for the rest.
  - Then `playerJWTCacheManager.remove({ userId })`.
  - The controller calls the service and returns `SuccessResponse('Account deleted.')`.
  - Route: `playerAuthRouter.delete('/account', isPlayerLoggedIn, asyncHandler(playerAuthController.deleteAccount))`.
- [ ] **Step 4:** Run the same file and expect PASS.

### Task 2: Scrub copies, delete side data

**Files:**
- Modify: `server/src/services/accountDeletion.service.ts`
- Test: `server/test/accountDeletion.test.ts`

**Interfaces:**
- Consumes: `deletePlayerAccount` from Task 1.
- Before anonymising the player, the service reads two things: the player's names (the account name, plus each entry's `profile.firstName + ' ' + profile.lastName`) and their registration ids (`TournamentRegistration.find({ playerId })`).

- [ ] **Step 1: Failing tests.** Seed a fixture in each place, call `deletePlayerAccount`, and assert:
  - `it('anonymises their entries but keeps them')`: the entry's `profile.firstName/lastName` become `Deleted`/`player`. `phone` and `photo` are gone. `age`, `gender` and `status` are unchanged.
  - `it('renames them on match cards')`: on `BadmintonMatch` and `CricketMatch`, `player1.name` becomes `Deleted player` where `player1.registrationId` is theirs. A doubles `player2.name` `Asha Rao & Ravi K`, whose `playerIds` include their registration, becomes `Deleted player & Ravi K`.
  - `it('renames them in lineups and auction logs')`: their `CricketMatch.cricketSetup.team1Lineup.startingXI` and `reserves` entries; `Auction.logs[].playerName` and `lastSoldResult.playerName` for their registration; and the `TieLineup.assignments[].playerNames` entry at the index of their id in `playerIds`. Other players' names stay unchanged.
  - `it('renames them in quick matches and knockouts')`: `QuickMatch.sides[].slots[].displayName` and quick-cricket `side1Lineup/side2Lineup[].name` for their `playerId`, and `QuickKnockout.players[].displayName`.
  - `it('deletes their notifications and support messages')`: `Notification` rows for `playerId` are gone, and `ContactLead` rows for their original email are gone. Other players' rows remain.
  - `it('keeps their payments')`: the `Payment` doc, `profile` included, is unchanged.
  - `it('removes their photo from storage and survives a storage failure')`: spy on `r2.deleteObject`. A `profileImage` under `config.R2_PUBLIC_URL` is deleted by its key. When it rejects, the deletion still completes.
- [ ] **Step 2:** Run it and expect these FAIL.
- [ ] **Step 3: Implement.**
  - Use `updateMany` with `arrayFilters` where one query can do it: the entries, single names, lineups, auction logs, quick slots and knockouts.
  - Use load-and-rewrite for the joined doubles names and the parallel `playerNames` array. Replace each of their names in the string with `split(name).join('Deleted player')`.
  - Do the photo delete last, best-effort, through `r2.deleteObject({ Bucket: config.R2_BUCKET_NAME, Key })`. Log a failure; never throw it.
- [ ] **Step 4:** Run the file, then the full server suite, tsc and lint. Expect all green.

### Task 3: App, Settings → Delete account

**Files:**
- Modify: `mobile/src/api/settings.ts` (add `deleteAccount(): Promise<void>`, which calls `API.delete('/player/auth/account')` and turns errors into an `Error` with the server's message, like `changePassword`)
- Modify: `mobile/src/app/profile/settings.tsx`
- Test: `mobile/__tests__/SettingsScreen.test.tsx`

- [ ] **Step 1: Failing tests.**
  - `it('asks before deleting and keeps the account on Keep')`: press `Delete account` → the sheet shows `Delete your account?` → press `Keep my account` → `deleteAccount` is not called.
  - `it('deletes, signs out and returns to Welcome')`: press **Delete account** in the sheet → `deleteAccount` is called once, `logout` runs (the store's `auth.user` becomes null), and `router.replace('/(auth)/welcome')` is called.
  - `it('shows the server message and stays signed in when deletion fails')`.
- [ ] **Step 2:** Run `npx jest __tests__/SettingsScreen.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement.**
  - The row comes after Change password: a `trash` icon, label `Delete account`, text in `colors.error`.
  - The `BottomSheet` copy is fixed by the spec's sketch: the title `Delete your account?`; the line `Your name, email, phone, photo and sign-in go for good. Your match results stay, shown as "Deleted player".`; the buttons `Delete account` (busy: `Deleting`) and `Keep my account`.
  - If `trash` isn't in `iconPaths`, add it through `scripts/icons.mjs`.
- [ ] **Step 4:** Run the file, then `npx tsc --noEmit` and `npx jest --maxWorkers=2`. Expect green.

### Task 4: Web, `/delete-account`

**Files:**
- Create: `client/src/api/deleteAccount.ts` with:
  - `sendDeletionCode(email: string): Promise<void>`
  - `deleteWithCode(email: string, otp: string): Promise<void>`
  - Both use bare `axios` with `API.defaults.baseURL`, never the shared instance.
- Create: `client/src/pages/DeleteAccountPage.tsx`, plus its route in `client/src/App.tsx`, a footer link, and a `public/sitemap.xml` entry
- Test: `client/src/pages/DeleteAccountPage.test.tsx` (msw)

- [ ] **Step 1: Failing tests.**
  - `it('sends a code, then deletes with it')`: type `  Asha@Example.com `, press `Send code`, and expect `POST /player/auth/login/otp` with `{ email: 'asha@example.com' }`. Type the code and press `Delete my account`, and expect `POST /player/auth/login/otp/verify` with `{ email, otp }`, then `DELETE /player/auth/account` with `Authorization: Bearer <token from verify>`. Expect the page to show `Your account has been deleted.`
  - `it('uses the code\'s token even when an organiser is signed in')`: with `localStorage.accessToken = 'org-token'`, the DELETE still carries the verify token.
  - `it('shows the server message for a wrong code and deletes nothing')`: verify returns 400 `Invalid OTP.` → the message is shown and no DELETE is sent.
- [ ] **Step 2:** Run `npx vitest run src/pages/DeleteAccountPage.test.tsx` and expect FAIL.
- [ ] **Step 3: Implement.**
  - Use the `ContactPage` layout (Navbar, HoverFooter).
  - Steps: email, then code, then done. Explain what goes and what stays in the same words as the app.
  - Mention that deleting from the app works too: Profile → Settings → Delete account.
- [ ] **Step 4:** Run the file, then `npx tsc -b`, lint and `npx vitest run --maxWorkers=2`. Expect green.

### Task 5: Ledger

- [ ] Mark B7 in `d:\kria\LAUNCH-AUDIT.md` as done, with what shipped, and with the deletion URL `https://kria.club/delete-account` for the Play Console form (O6).
