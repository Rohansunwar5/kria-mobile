# Google sign-in for players — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Android players can create an account or sign in with Google from Welcome (5a). A new player goes through Your game and For tournaments, a returning one lands on Home, and a player with no phone or last name is asked for them at their first tournament entry.

**Architecture:**
- **Server:** `POST /player/auth/google` checks Google's ID token with `google-auth-library` against the Web client ID, then finds the player by email or creates them. It answers with the usual login shape plus `isNew`.
- **App:** the native `@react-native-google-signin/google-signin` module is loaded only outside Expo Go. A `googleSignIn` thunk stores the token and sets `pendingOnboarding` from `isNew`; the existing AuthGate does the routing.
- **Entry screen:** one `profileGap` helper decides what's missing.

**Tech Stack:**
- **Server:** Express, Mongoose, `google-auth-library` ^9.8 (already installed), vitest and supertest.
- **App:** Expo SDK 57, Redux Toolkit, jest-expo and `@testing-library/react-native`, `axios-mock-adapter`.
- **New dependency:** `@react-native-google-signin/google-signin` v17.

**Spec:** `mobile/docs/superpowers/specs/2026-11-16-google-sign-in-design.md`

## Global Constraints

- **Web client ID:** `538256095759-op8gn7jusv3iqeccherrglr00nngb6u9.apps.googleusercontent.com`.
  - **Server:** read from the env variable `GOOGLE_PLAYER_CLIENT_ID`.
  - **App:** the constant `GOOGLE_WEB_CLIENT_ID`.
  - The existing `GOOGLE_CLIENT_ID` stays untouched.
- **Android only.** Google sign-in is never offered on iOS or in Expo Go.
- **No client secret** is used anywhere.
- **No 401s from the Google route.** Every refusal is 400, and an unset `GOOGLE_PLAYER_CLIENT_ID` is a 500.
- **Installing in the app:** `npx expo install <pkg> -- --legacy-peer-deps`, never a bare `npm install` (see `mobile/AGENTS.md`).
- **No NativeWind:** style with `StyleSheet` on the tokens in `src/constants/theme.ts`.
- **No git:** don't commit, push, stash or checkout. The user commits.
- **Run server tests from PowerShell.** Under Git Bash, vitest fails with "failed to find the runner".
- **CRLF files:** use the edit tool, not `sed`.
- **Exact copy:**
  - Server errors: "Couldn't verify your Google sign-in. Try again." · "Your Google email isn't verified." · "This account is deactivated." · "You signed up with Google. Use Forgot password to set one."
  - App: "Continue with Google" · busy label "Signing in" · fallback error "Couldn't sign in with Google. Try again."

## Review Focus

1. **A Google name the model would reject** (none given, or longer than 50 characters) must not turn into a 500. Fall back to the part of the email before `@`, and cut to 50 characters. Pinned in Task 2.
2. **A Google email in different case** from the stored account (`Asha@Gmail.com` against `asha@gmail.com`) must sign into that account, not create a second one. Pinned in Task 2.
3. **A player with no phone or last name opening an entry screen** must see what to add, not crash in `maskPhone`. Pinned in Task 3.
4. **A double tap on Continue with Google** must not open two pickers or post twice. The button is busy while signing in. Pinned in Task 5.
5. **After logging out**, the next Google sign-in must show the account picker again instead of silently reusing the last account. Pinned in Task 4.

---

### Task 1: Phone and last name are optional for Google players (server model)

**Files:**
- Modify: `server/src/models/player.model.ts` (the `lastName` and `phone` fields, and `IPlayer.phone`)
- Test: `server/test/player.model.test.ts`

**Interfaces:**
- Produces: `Player` accepts a missing `phone` and an empty `lastName` when `authProvider` is `'google'`. `IPlayer.phone` becomes `phone?: string`.

- [ ] **Step 1: Write the failing tests** (append to `describe('Player model')`)

```ts
it('a Google player needs no phone or last name', async () => {
  const p = await Player.create({ firstName: 'Asha', lastName: '', email: 'g@kria.club', authProvider: 'google', status: 'verified' });
  expect(p.phone).toBeUndefined();
  expect(p.lastName).toBe('');
});

it('an email player still needs both', async () => {
  await expect(Player.create({ firstName: 'Asha', email: 'e@kria.club' })).rejects.toThrow(/phone[\s\S]*lastName|lastName[\s\S]*phone/);
});
```

- [ ] **Step 2: Run them and confirm the first fails.** Run from PowerShell: `cd server; npx vitest run test/player.model.test.ts`. Expected: "a Google player…" fails with a ValidationError on `lastName` and `phone`.

- [ ] **Step 3: Make both fields conditional.** Set `required: function (this: { authProvider?: string }) { return this.authProvider !== IAuthProvider.GOOGLE; }` on `lastName` and `phone`, and change `IPlayer.phone` to `phone?: string`. Then run `npx tsc --noEmit -p .` and handle `undefined` at any server reader it flags.

- [ ] **Step 4: Run the tests and confirm they pass.** Run `npx vitest run test/player.model.test.ts`. Expected: 3 passed.

---

### Task 2: `POST /player/auth/google`, and the change-password message

**Files:**
- Modify: `server/src/config/index.ts` (add `GOOGLE_PLAYER_CLIENT_ID` under `GOOGLE_CLIENT_SECRET`, with a comment saying it's the Firebase Web client ID for player Google sign-in)
- Modify: `server/test/setup.ts` (add `process.env.GOOGLE_PLAYER_CLIENT_ID = 'test-web-client';`)
- Modify: `server/src/middlewares/validators/auth.validator.ts`. `googleAuthValidator` is unused: change it to `[isRequired('idToken'), ...validateRequest]`.
- Modify: `server/src/repository/player.repository.ts:12`. `create`'s data becomes `{ firstName: string; lastName: string; email: string; phone?: string; status?: string; authProvider?: string }`.
- Modify: `server/src/services/playerAuth.service.ts` (add `loginWithGoogle`, and change `changePassword`)
- Modify: `server/src/controllers/playerAuth.controller.ts` (add `loginWithGoogle` in the LOGIN section)
- Modify: `server/src/routes/playerAuth.route.ts`. Add `playerAuthRouter.post('/google', googleAuthValidator, asyncHandler(playerAuthController.loginWithGoogle));` under the login routes.
- Test: `server/test/playerGoogleAuth.test.ts` (new)

**Interfaces:**
- Consumes: Task 1's optional `phone` and `lastName`.
- Produces: `POST /player/auth/google` with body `{ idToken: string }`.
  - **200:** `body.data.data = { accessToken: string, player: Player, isNew: boolean }`.
  - **400:** every refusal, with the exact messages from Global Constraints.
- Produces: `playerAuthService.loginWithGoogle(idToken: string): Promise<SuccessResponse>`.

- [ ] **Step 1: Write the failing tests** in `server/test/playerGoogleAuth.test.ts`.
  - **Mocking Google:** use `vi.hoisted` (see `test/lock.test.ts`) to create `verifyIdToken = vi.fn()`. Then `vi.mock('google-auth-library', () => ({ OAuth2Client: vi.fn(() => ({ verifyIdToken })) }))`.
  - **Helper:** `google(payload)` sets `verifyIdToken.mockResolvedValue({ getPayload: () => payload })`.
  - **Calling the route:** `request(app).post('/player/auth/google').send({ idToken: 'tok' })`.
  - **Players and tokens:** create them with `Player.create`, and sign tokens as in `test/savedTournaments.test.ts`.

  Tests, each asserting status, `body.message` and the database:
  - `creates a verified Google player on first sign-in`
    - Payload: `{ email: 'asha@gmail.com', email_verified: true, given_name: 'Asha', family_name: 'Rao' }`.
    - Response: 200, `isNew === true`, `accessToken` is a string, `player.firstName === 'Asha'`.
    - Database: one Player, with `authProvider: 'google'`, `status: 'verified'`, `lastName: 'Rao'` and `phone` undefined.
    - `verifyIdToken` was called with `{ idToken: 'tok', audience: 'test-web-client' }`.
  - `signs an existing verified player in, whatever their sign-up method`
    - Existing: an email player `asha@gmail.com`, verified.
    - Payload email: `'Asha@Gmail.com'`.
    - Expect: `isNew === false`, the same `_id`, `authProvider` still `'email'`, and `Player.countDocuments()` is 1.
  - `completes an unfinished email sign-up`
    - Existing: `status: 'pending'`, with `otp: { code: '123456', expiresAt: <future> }`.
    - Expect: `isNew === true`, status `'verified'`, `otp.code` cleared.
  - `falls back to the email when Google gives no name, and cuts long names to 50`
    - Payload `{ email: 'kiran@gmail.com', email_verified: true }`: `firstName 'kiran'`, `lastName ''`.
    - Payload with a 60-character `given_name`: `firstName.length === 50`.
  - `refuses an unverified Google email`
    - Payload: `email_verified: false`.
    - Expect: 400 "Your Google email isn't verified.", and no Player created.
  - `refuses a token Google rejects`
    - `verifyIdToken.mockRejectedValue(new Error('bad'))`.
    - Expect: 400 "Couldn't verify your Google sign-in. Try again."
  - `refuses a deactivated or suspended player`
    - Existing: one player with `isActive: false`, another with `status: 'suspended'`.
    - Expect: both get 400 "This account is deactivated." with no `accessToken`.
  - `needs an idToken`
    - `.send({})`.
    - Expect: 400.
  - `a Google-only player changing their password is told to use Forgot password`
    - A Google player with no password posts `/player/auth/change-password` with `{ currentPassword: 'whatever1', newPassword: 'newpass123' }`.
    - Expect: 400 "You signed up with Google. Use Forgot password to set one."

- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run test/playerGoogleAuth.test.ts`. Expected: 404s from the missing route, and the change-password test gets "Player not found."

- [ ] **Step 3: Implement `loginWithGoogle(idToken: string)`** in `playerAuth.service.ts`.
  - **Client:** a module-level `const googleClient = new OAuth2Client();`.
  - **Order:**
    1. If `config.GOOGLE_PLAYER_CLIENT_ID` is unset, `throw new Error('GOOGLE_PLAYER_CLIENT_ID is not set.')`. This goes before any try, so it stays a 500.
    2. Call `verifyIdToken({ idToken, audience })` and `getPayload()`. Turn any throw, or a payload with no email, into the BadRequestError "Couldn't verify…".
    3. If `email_verified !== true`, refuse with "Your Google email isn't verified."
    4. Lowercase the email and call `playerRepository.getByEmail`.
  - **Found, but `!isActive` or `status === 'suspended'`:** refuse with "This account is deactivated."
  - **Found and verified:** sign in, `isNew = false`.
  - **Found, but pending or `otp_verified`:** `updateStatus(email, VERIFIED)` and `clearOtp(email)`, `isNew = true`.
  - **Not found:** `playerRepository.create({ firstName, lastName, email, status: VERIFIED, authProvider: IAuthProvider.GOOGLE })`, `isNew = true`.
    - `firstName` = `(given_name || name || email.split('@')[0]).slice(0, 50)`.
    - `lastName` = `(family_name ?? '').slice(0, 50)`.
  - **Answer:** `generateJWTToken`, then `new SuccessResponse('Login successful.', { accessToken, player: await playerRepository.getByEmail(email), isNew })`.
  - **`changePassword`:** look up the player as now. If the player exists but has no `password`, throw `BadRequestError('You signed up with Google. Use Forgot password to set one.')`. A missing player keeps `NotFoundError`.
  - **Controller:** `loginWithGoogle` reads `req.body.idToken` and calls `next(response)`, like `loginWithPassword`.

- [ ] **Step 4: Run the tests and confirm they pass.** Run `npx vitest run test/playerGoogleAuth.test.ts test/player.model.test.ts`. Expected: all pass.

- [ ] **Step 5: Run the server gates.** Run `npx tsc --noEmit -p .; npx vitest run; npx eslint src test --ext .ts`. Expected: tsc clean, every test file passing (157 or more), and eslint clean.

---

### Task 3: The entry screen asks for a missing last name or phone (app)

**Files:**
- Modify: `mobile/src/lib/entryView.ts`
  - `EntryUser.phone` becomes `phone?: string`.
  - Add `profileGap`; `entryBlocker` uses it in place of the date-of-birth and gender line.
  - `entryLine` skips a missing phone.
- Modify: `mobile/src/components/tournament/EntryForm.tsx:76-77`. The note shows `profileGap(user)` instead of the fixed date-of-birth and gender text.
- Modify: `mobile/src/app/category/[categoryId].tsx`. Delete `NEEDS_PROFILE` (line 27). Line 239 hides the reason when `blocker === (user ? profileGap(user) : null)`, because EntryForm already shows it.
- Modify: `mobile/src/store/slices/authSlice.ts`. `User.phone` becomes `phone?: string`.
- Test: `mobile/__tests__/entryView.test.ts`, and `mobile/__tests__/CategoryScreen.test.tsx` if it asserts the old text.

**Interfaces:**
- Produces: `profileGap(user: EntryUser): string | null`.
  - **Checks:** missing items in the order last name (`!lastName?.trim()`), date of birth, gender, mobile number (`!phone?.trim()`).
  - **Wording:** one item is `x`; two are `x and y`; three or more are `a, b and c`.
  - **Result:** `Add your ${list} to enter`, or `null` when nothing is missing.

- [ ] **Step 1: Write the failing tests** (in `entryView.test.ts`, and import `profileGap`)

```ts
describe('profileGap', () => {
  it('names exactly what is missing', () => {
    expect(profileGap(user())).toBeNull();
    expect(profileGap(user({ phone: undefined }))).toBe('Add your mobile number to enter');
    expect(profileGap(user({ dateOfBirth: undefined }))).toBe('Add your date of birth to enter');
    expect(profileGap(user({ dateOfBirth: undefined, gender: undefined }))).toBe('Add your date of birth and gender to enter');
    expect(profileGap(user({ lastName: '', phone: '' }))).toBe('Add your last name and mobile number to enter');
    expect(profileGap(user({ dateOfBirth: undefined, gender: undefined, phone: undefined }))).toBe('Add your date of birth, gender and mobile number to enter');
  });
});
```

Also change the existing assertions:
- `entryBlocker` with `gender: undefined` now expects `'Add your gender to enter'`.
- Add `entryBlocker(c, tour(), user({ phone: undefined }), NOW)` → `'Add your mobile number to enter'`.
- Add `entryLine(user({ phone: undefined }), NOW)`, which returns the same line as `entryLine(user(), NOW)` without its last ` · …` part and doesn't throw.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `cd mobile; npx jest __tests__/entryView.test.ts`. Expected: `profileGap` isn't exported, and the gender assertion fails.

- [ ] **Step 3: Implement `profileGap`** and wire it into `entryBlocker`, `entryLine`, EntryForm and the category screen as listed under Files.

- [ ] **Step 4: Run the tests and confirm they pass.** Run `npx jest __tests__/entryView.test.ts __tests__/CategoryScreen.test.tsx; npx tsc --noEmit`. Expected: all pass and tsc is clean. Fix any `user.phone` reader tsc flags by handling `undefined`.

---

### Task 4: The native module, the `googleSignIn` thunk, and signing out of Google on log out (app)

**Files:**
- Modify: `mobile/package.json`. Run `npx expo install @react-native-google-signin/google-signin -- --legacy-peer-deps`.
- Modify: `mobile/app.json`. Add `"@react-native-google-signin/google-signin"` to `plugins`, after `expo-notifications`.
- Create: `mobile/src/lib/googleSignIn.ts`
- Modify: `mobile/src/store/slices/authSlice.ts`
- Test: `mobile/__tests__/authSlice.test.ts`

**Interfaces:**
- Produces, in `src/lib/googleSignIn.ts`:
  - `GOOGLE_WEB_CLIENT_ID: string`, the value from Global Constraints.
  - `googleSignInAvailable(): boolean`, which is `Platform.OS === 'android' && !isRunningInExpoGo()` (`isRunningInExpoGo` from `'expo'`).
  - `googleIdToken(): Promise<string | null>`.
    - Loads the module with a lazy `require('@react-native-google-signin/google-signin')`, so Expo Go and jest never load it.
    - Calls `GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID })` once, then `hasPlayServices()` and `signIn()`.
    - Returns `null` for a cancelled response, the ID token on success, and throws on errors.
    - Check the installed v17 types (`node_modules/@react-native-google-signin/google-signin/lib/typescript/`) for `signIn`'s response shape and `isSuccessResponse` before writing it.
  - `googleSignOut(): Promise<void>`: a no-op when unavailable, and never throws.
- Produces, in `authSlice.ts`: `googleSignIn = createAsyncThunk<{ role: Role; responseData: any }, { idToken: string }, { rejectValue: string }>('auth/google', …)`.
  - It posts `{ idToken }` to `/player/auth/google` and stores the token as `loginUser` does.
  - **Fulfilled:** `handleLoginSuccess`, then `state.pendingOnboarding = !!action.payload.responseData?.isNew`, so the AuthGate sees both in one update.
  - **Pending and rejected:** handled as for `loginUser`.
- Changes: the `logout` thunk calls `storage.clearAuth()` and then `googleSignOut()`.

- [ ] **Step 1: Write the failing tests** (in `authSlice.test.ts`)
  - `google.fulfilled signs a new player in and starts onboarding`
    - Reduce `{ type: 'auth/google/fulfilled', payload: { role: 'player', responseData: { accessToken: 't', player: { _id: 'p' }, isNew: true } } }`.
    - Expect: `user._id === 'p'`, `accessToken === 't'`, `pendingOnboarding === true`.
  - `google.fulfilled for a returning player goes straight in`
    - Same action with `isNew: false`.
    - Expect: `pendingOnboarding === false`.
  - `googleSignIn posts the token and stores the session`
    - Set up `new MockAdapter(API)` as `LoginFlow.test.tsx` does, with `onPost('/player/auth/google', { idToken: 'tok' })` replying `200 { data: { data: { accessToken: 't', player: { _id: 'p' }, isNew: false } } }`.
    - Dispatch it on a `configureStore({ reducer: { auth } })` store.
    - Expect: state `accessToken === 't'`.
  - `logout signs out of Google too`
    - `jest.mock('@/lib/googleSignIn', () => ({ googleSignOut: jest.fn(() => Promise.resolve()) }))`.
    - Dispatch `logout()`.
    - Expect: `googleSignOut` was called once.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx jest __tests__/authSlice.test.ts`. Expected: they fail because `googleSignIn` and `@/lib/googleSignIn` don't exist yet.

- [ ] **Step 3: Install the package, add the plugin, and write `googleSignIn.ts` and the thunk changes** as listed under Interfaces.

- [ ] **Step 4: Run the tests and check the config.** Run `npx jest __tests__/authSlice.test.ts; npx tsc --noEmit; npx expo config --json`. Expected: tests pass, tsc is clean, and the config output lists `@react-native-google-signin/google-signin` in plugins. If a plugin load fails with `Cannot find module '@expo/...'`, follow `mobile/AGENTS.md`'s hoisting table.

---

### Task 5: "Continue with Google" on Welcome (app)

**Files:**
- Modify: `mobile/src/components/ui/Button.tsx`. Add `lead?: React.ReactNode`, rendered where `icon` is when not busy.
- Modify: `mobile/src/app/(auth)/welcome.tsx`
- Test: `mobile/__tests__/WelcomeScreen.test.tsx`

**Interfaces:**
- Consumes: Task 4's `googleSignInAvailable` and `googleIdToken`, and the `googleSignIn` thunk.
- Produces, on Welcome, between Create account and the Log in link:
  - A `<Button variant="secondary" label="Continue with Google" busy={busy} busyLabel="Signing in" lead={<GDisc/>} />`, shown only when `googleSignInAvailable()`.
  - **The G disc** (mock 5a): 22×22, radius 11, background `colors.text`, a centred "G" at 13px in `font.bold`, colour `colors.bg`.
  - **Errors:** an error line under the Log in link, 13px in `colors.error`. It shows the thunk's rejected payload, or "Couldn't sign in with Google. Try again." when `googleIdToken` throws.
  - **On press:** clear the error, set busy, `await googleIdToken()`. A `null` result stops quietly; otherwise dispatch `googleSignIn({ idToken })`. Busy clears in `finally`.
  - Routing is left to the AuthGate.

- [ ] **Step 1: Write the failing tests.**
  - **Setup:**
    - Wrap renders in a Redux `Provider` with `makeStore`, as `LoginFlow.test.tsx` does.
    - `jest.mock('@/lib/googleSignIn', () => ({ googleSignInAvailable: () => mockAvailable, googleIdToken: (...a) => mockIdToken(...a), googleSignOut: jest.fn() }))`.
    - Answer `/player/auth/google` with `MockAdapter`.
  - **Replace `has no Google button`** with:
    - `hides Google sign-in where it can't run`: with `mockAvailable = false`, `queryByText(/Google/)` is null.
    - `Continue with Google signs in with Google's token`
      - Setup: `mockAvailable = true`, `mockIdToken` resolves `'tok'`, and the mock replies 200 with `isNew: true`.
      - Press "Continue with Google".
      - Expect: the post body is `{ idToken: 'tok' }`, and the store has `pendingOnboarding === true` and an `accessToken`.
    - `a cancelled picker does nothing`: `mockIdToken` resolves `null`. Expect no request (`mock.history.post.length === 0`) and no error text.
    - `shows why sign-in failed`
      - `mockIdToken` rejects: "Couldn't sign in with Google. Try again." is shown.
      - The server replies 400 `{ message: 'This account is deactivated.' }`: that text is shown.
    - `is busy while signing in`: `mockIdToken` stays pending. After one press, the button's label is "Signing in" and a second press doesn't call `mockIdToken` again.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx jest __tests__/WelcomeScreen.test.tsx`. Expected: the new tests fail because there's no Google button.

- [ ] **Step 3: Implement the `lead` prop on Button and the Welcome button**, as listed under Interfaces.

- [ ] **Step 4: Run the tests and confirm they pass.** Run `npx jest __tests__/WelcomeScreen.test.tsx __tests__/LoginFlow.test.tsx __tests__/AuthScreen.test.tsx`. Expected: all pass.

- [ ] **Step 5: Run the app gates.** Run `npx tsc --noEmit; npx jest --maxWorkers=2; npx expo config --json > $null`. Expected: tsc clean, every suite passing (129 or more), and the config resolves. `AwardsScreen.test.tsx` is known to time out now and then; rerun it alone if it does.

---

### Task 6: Records and deploy notes

**Files:**
- Modify: `d:\kria\SERVER-GAPS.md`.
  - #35 gets "✅ closed 2026-11-16" and a **Done (2026-11-16)** block: what shipped, the calls (match by email; finish an unfinished sign-up; phone and last name asked at first entry; 400s, not 401s), and **Not done** (iOS; Google photo; matching by `sub`; the Play App Signing SHA-1).
  - Change the summary line to "Still open (0)" and add a "Closed 2026-11-16, Google sign-in (1)" paragraph with the gate counts from Tasks 2 and 5.
- Modify: `d:\kria\HANDOVER-server-gaps.md`.
  - Correct the status line: 40 of 40, and the 16 Nov work is committed and pushed (server `803eb39`, mobile `d9f96bf`).
  - Add #35 to "Where things stand" as uncommitted.
  - Remove the "What's open" table.
  - Under "Before the next deploy", add:
    - Set `GOOGLE_PLAYER_CLIENT_ID` on the live server.
    - Google sign-in needs a new APK (`eas build --profile preview --platform android`), because it adds a native module.
    - At Play Store launch, add the Play App Signing SHA-1 in Firebase.
- Modify: `C:\Users\MY PC\.claude\projects\d--kria\memory\server-gaps-handover.md` and its line in `MEMORY.md`: 40/40 closed, and #35 uncommitted.

- [ ] **Step 1: Update the three records** as listed.
- [ ] **Step 2: Report to the user.** Say what to set (`GOOGLE_PLAYER_CLIENT_ID` in `server/.env` and on the live server) and that a fresh EAS APK is needed to try Google sign-in on a phone. The web client is unchanged, so its gates aren't rerun.
