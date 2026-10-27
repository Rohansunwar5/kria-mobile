# Onboarding, sign-in and the launch animation: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild sign-up, log-in, password reset and the two profile steps on the new design, replace the launch with Motion 6b (6c under reduced motion), ship one traced Kria mark component, and delete the old UI layer those screens kept alive.

**Architecture:**
- **Pure libs:** `lib/authForms.ts` (validators, date of birth, city suggestions), `lib/authRoute.ts` (the AuthGate's decision, as a function) and `lib/password.ts` (one rule set).
- **Shared sign-in UI:** pieces under `components/signin/` (screen scaffold with step progress, field, code boxes, password field with rules, resend timer).
- **Screens:** thin, in the `(auth)` and `(onboarding)` route groups.
- **The launch:** an overlay in `app/_layout.tsx` built with Reanimated and the traced `KriaMark` SVG.

**Tech Stack:** Expo SDK 57, React Native 0.86, expo-router 57 (typed routes), TypeScript 6, Redux Toolkit, react-native-svg, react-native-reanimated, jest-expo + @testing-library/react-native, axios-mock-adapter.

**Spec:** `mobile/docs/superpowers/specs/2026-10-23-onboarding-design.md`.
- Approved preview source: `mobile/docs/superpowers/specs/2026-10-23-onboarding-preview/` (the traced `kria-mark.svg`, and `ForgotEmail`, `ForgotReset` and `LoginAfterReset` `.dc.html`).
- The mocks: `mobile/new-ui-designs/Kria Onboarding.dc.html` (5a–5h, 7a–7c) and `Kria Motion.dc.html` (6b, 6c).

Read the spec. It holds every copy string, timing and rule this plan calls "per spec".

## Global Constraints

- **Paths:** relative to `d:/kria/mobile/` unless they start with `d:/`. Commands run from `d:/kria/mobile/`.
- **Git:** never run any git command. The controller snapshots the working tree and commits only when the user asks.
- **Processes:** start only what you need. To stop the Expo server after regenerating typed routes, kill only the PID or process tree you started, never by image name.
- **Imports:**
  - New code uses `@/constants/theme` and `@/components/ui/*`, the new `@/components/signin/*` and `@/components/KriaMark`.
  - Never `@/lib/theme`, `@/components/icons`, `@/components/canvas`, `@/components/states`, `@/components/onboarding`, `@/components/auth`, NativeWind `className`, or hex literals outside `constants/theme.ts`.
  - The mark's own colours (`#FF5404`, `#3E403D`) live in `constants/theme.ts` as `colors.mark` and `colors.markSeam`.
- **Real data only:** no sample names, codes or numbers from the mocks. No Terms line, no Google button, no notifications screen.
- **Copy:** exactly as the spec words it. Sentence case, no exclamation marks.
- **Look:** per the spec's "Screens" preamble:
  - 24px side padding; 56px header row with a 44px back button;
  - display-44 titles at line height .92;
  - 54px fields with radius 14, `surface1` fill, no border; 13/600 `text2` labels;
  - 56px footer buttons with radius 16, inside a `KeyboardAvoidingView` together with the form, as in `src/app/quick/new.tsx`.
- **Async:**
  - Every action ignores presses while its request is in flight.
  - Every screen ignores results after unmount, with this guard pattern: `useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);`
- **Typed routes:** after adding or removing a file under `src/app`, regenerate `.expo/types/router.d.ts`. Start `npx expo start --port 8081` in the background, wait for the file to change, then kill that PID.
- **Icons:** add missing Material Symbols names to `scripts/icons.mjs` (filled glyphs need `f`) and run `node scripts/icons.mjs`. Only additions may appear in `iconPaths.ts`.
- **Packages:** install or uninstall nothing.
- **Deletions:** grep for importers first, and delete each file's tests with it.

## Review Focus

1. **Set password → Your game, without a flash of Home.** `beginOnboardingHandoff` must be dispatched before `setPassword` resolves (it sets the user, and the AuthGate reacts at once), and undone if it fails. Pinned by a Task 6 test.
2. **A wrong log-in password.** It shows "That email and password don't match." and must not log anyone out or loop the AuthGate. Pinned by tests in Tasks 3 and 7.
3. **Codes and resend.** Pasting or autofilling a whole 6-digit code fills all six boxes. Resend is unavailable during the 30s cooldown and restarts it. A rejected code clears the boxes. Pinned by Task 4 tests.
4. **Skipping both profile steps.** It still ends on Home with nothing saved and the handoff flag cleared. Pinned by a Task 8 test.
5. **The launch when the app is slow or fast.** Ready before 1750ms: the exit waits for 1750. Ready later: the final frame holds until ready. Reduced motion: the 6c timings. Pinned by a Task 9 test of the timing function.

---

### Task 1: The Kria mark, the Welcome photo and Home's header

**Files:**
- Create: `src/components/KriaMark.tsx`
- Modify: `src/constants/theme.ts` (`colors.mark = '#FF5404'`, `colors.markSeam = '#3E403D'`)
- Create: `assets/images/welcome.png` (a byte copy of `new-ui-designs/banner-cricket.png`)
- Modify: `src/app/(tabs)/home.tsx` (the header logo becomes `<KriaMark width={40} />` at today's size; drop the `logo.png` require)
- Test: `__tests__/KriaMark.test.tsx` (create)

**Interfaces:**
- Produces:
  ```ts
  export const MARK_VIEWBOX = { w: 800, h: 700 };
  export const MARK_BODY_D: string;                        // the traced body path, copied from kria-mark.svg
  export const MARK_BALL = { cx: 493, cy: 91, r: 71, seamD: 'M 432 116 Q 490 96 552 59', flickD: 'M 542 46 Q 570 39 596 40 Q 582 59 563 76 Z' };
  export function KriaMark({ width, accessibilityLabel }: { width: number; accessibilityLabel?: string }): JSX.Element; // height = width * 700/800
  export function MarkBody(props: { width: number }): JSX.Element;   // body only, same viewBox
  export function MarkBall(props: { width: number }): JSX.Element;   // ball only, same viewBox
  ```

- [ ] **Step 1:** Write the failing test. `KriaMark` renders an `Svg` with viewBox `0 0 800 700`, height 98 at width 112, and the accessibility label "Kria" by default. `MarkBall` contains a circle at (493, 91) with r 71.
- [ ] **Step 2:** Run `npx jest __tests__/KriaMark.test.tsx` and confirm it FAILS.
- [ ] **Step 3:** Implement from `docs/superpowers/specs/2026-10-23-onboarding-preview/kria-mark.svg`: the body path verbatim; seam stroke width 10.5 with round caps. Copy the photo. Switch Home's header.
- [ ] **Step 4:** PASS. `__tests__/HomeScreen*.test.tsx` (whatever covers Home) still passes, and `tsc` is clean.

---

### Task 2: One password rule

**Files:**
- Modify: `src/lib/password.ts`
- Modify: `src/app/profile/change-password.tsx` (the soft rule is shown dimmed and doesn't block)
- Modify: `d:/kria/SERVER-GAPS.md`, #33 "Suggested": enforce 8+ characters only
- Test: `__tests__/password.test.ts`, `__tests__/ChangePasswordScreen.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface Rule { label: string; met: boolean; required: boolean }
  export function passwordRules(pw: string): Rule[]; // [{'At least 8 characters', required}, {'Add a number or symbol (recommended)', soft}]
  export function passwordScore(pw: string): 0 | 1 | 2 | 3 | 4; // per spec "One password rule"
  export function strengthLabel(score: number): string;       // '', 'Too weak', 'Fair', 'Strong', 'Very strong'
  export function passwordFormReady(f: { current: string; next: string; confirm: string }): boolean; // required rule only
  export const passwordOk = (pw: string) => pw.length >= 8;
  ```
  `components/auth/PasswordRules.tsx` keeps compiling: its re-export may need the `required` field ignored.

- [ ] **Step 1: Write the failing tests:**
  - `passwordRules('abcdefgh')` → the first rule met, the second not; `required` is true and false respectively.
  - Score:
    - `passwordScore('')` → 0;
    - `'abc'` → 1;
    - `'abcdefgh'` → 2;
    - `'abcdefg1'` → 3;
    - `'abcdefghijk!'` → 4;
    - `'abcdefghijkl'` → 2.
  - `strengthLabel(2)` → `'Fair'`.
  - `passwordFormReady({ current: 'x', next: 'abcdefgh', confirm: 'abcdefgh' })` → true.
  - Change password screen: an 8-letter password with no digit enables "Update password".
- [ ] **Step 2:** Run both files and confirm they FAIL.
- [ ] **Step 3:** Implement. Update #33's suggestion.
- [ ] **Step 4:** PASS; the auth tests that use `PasswordRules` pass; `tsc` clean.

---

### Task 3: Auth API, form logic and server gaps

**Files:**
- Modify: `src/api/axios.ts` (the 401 exemption list gains `/player/auth/login`, next to change-password)
- Modify: `src/api/auth.ts` (add `resetPassword`; fix the stale comment on `requestPasswordReset`, because the server does 404 an unknown email)
- Create: `src/lib/authForms.ts`
- Modify: `d:/kria/SERVER-GAPS.md` (append #35–#37 per the spec)
- Test: `__tests__/axiosUnauthorized.test.ts`, `__tests__/authApi.test.ts`, `__tests__/authForms.test.ts` (create)

**Interfaces:**
- Produces:
  ```ts
  // api/auth.ts
  export async function resetPassword(email: string, otp: string, newPassword: string): Promise<void>; // POST /player/auth/reset-password
  // lib/authForms.ts
  export const emailOk: (s: string) => boolean;            // /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  export const phoneDigits: (s: string) => string;         // digits only, max 10
  export const phoneOk: (s: string) => boolean;            // exactly 10 digits
  export const otpDigits: (s: string) => string;           // digits only, max 6
  export function dobCheck(dd: string, mm: string, yyyy: string, today: Date):
    { state: 'incomplete' } | { state: 'invalid' } | { state: 'valid'; iso: string; age: number };
  export function citySuggestions(tournaments: { venue?: { city?: string } }[], max?: number): string[]; // distinct, trimmed, first-seen order, default max 4
  export const LOGIN_MISMATCH = "That email and password don't match.";
  export function loginErrorMessage(status: number | undefined, serverMessage: string | undefined): string; // 401 → LOGIN_MISMATCH, else server message or 'Something went wrong'
  ```
  `dobCheck`'s valid rule: a real calendar date, year > 1930, and at least 5 years before `today`. Age is whole years as of `today`.

- [ ] **Step 1: Write the failing tests:**
  - **Axios:** a 401 from `/player/auth/login` doesn't call `clearAuth` or the handler; a 401 from `/player/auth/profile` still does.
  - **`resetPassword`:** posts `{ email, otp, newPassword }`.
  - **Phone:** `phoneDigits('98450 21764')` → `'9845021764'`; `phoneOk` of 9 digits → false.
  - **Date of birth:**
    - `dobCheck('31','02','2001', d)` → invalid;
    - `('15','03','2001', new Date(2026,9,23))` → valid, iso `'2001-03-15'`, age 25;
    - `('15','03','20', …)` → incomplete;
    - a date 3 years ago → invalid.
  - **Cities:** `citySuggestions` dedupes "Bengaluru" and " Bengaluru ", skips empty, caps at 4.
  - **Login errors:** `loginErrorMessage(401, 'Unauthorized')` → `LOGIN_MISMATCH`; `(400, 'Password not set. Please use OTP login.')` → that message.
- [ ] **Step 2:** Run the three files and confirm they FAIL.
- [ ] **Step 3:** Implement. Append the gaps.
- [ ] **Step 4:** PASS; `tsc` clean.

---

### Task 4: Shared sign-in UI (`components/signin/`)

**Files:**
- Create: `src/components/signin/AuthScreen.tsx`, `Field.tsx`, `CodeBoxes.tsx`, `PasswordField.tsx`, `useResend.ts`
- Modify: `scripts/icons.mjs` (add `verified` with `f`, `schedule`, and any icon these pieces need that's missing), then regenerate
- Test: `__tests__/CodeBoxes.test.tsx`, `__tests__/useResend.test.tsx`, `__tests__/PasswordField.test.tsx` (create)

**Interfaces:**
- Produces:
  ```ts
  // AuthScreen: header row (back 44px, optional right text), optional 3-segment progress (step 1..3), scroll body with 24px padding, footer pinned, all inside a KeyboardAvoidingView
  export function AuthScreen(p: { onBack?: () => void; right?: React.ReactNode; step?: 1 | 2 | 3; footer: React.ReactNode; children: React.ReactNode }): JSX.Element;
  export function Title({ children, sub }: { children: string; sub?: React.ReactNode }): JSX.Element; // display 44, lh .92; sub 14/1.5 #A3A3AB-equivalent token text3
  // Field: label 13/600 text2, 54px input, radius 14, surface1, error ring 1.5 inset colors.error when `error`, helper/err line under
  export function Field(p: TextInputProps & { label: string; helper?: string; error?: string; prefix?: string; right?: React.ReactNode }): JSX.Element;
  // CodeBoxes: six 60px boxes over one hidden TextInput (keyboardType number-pad, textContentType oneTimeCode, autoComplete sms-otp/one-time-code, maxLength 6)
  export function CodeBoxes({ value, onChange, autoFocus }: { value: string; onChange: (digits: string) => void; autoFocus?: boolean }): JSX.Element;
  export function PasswordField(p: { label: string; value: string; onChangeText: (s: string) => void; placeholder?: string }): JSX.Element; // show/hide button labelled "Show password"/"Hide password"
  export function RuleList({ rules }: { rules: Rule[] }): JSX.Element; // met: filled text circle + check; unmet required: ring outline; unmet soft: dimmer
  export function useResend(seconds?: number): { left: number; canResend: boolean; restart: () => void }; // starts counting on mount; default 30
  ```

- [ ] **Step 1: Write the failing tests:**
  - **CodeBoxes:**
    - typing "12a34" calls `onChange('1234')`;
    - pasting "418236" fills six boxes (render `value='418236'` and check six digits are visible);
    - more than six digits is truncated to six.
  - **useResend** (with fake timers):
    - `left` counts 30→0;
    - `canResend` is false until 0;
    - `restart` resets to 30.
  - **PasswordField:** the toggle flips `secureTextEntry` and its accessibility label.
- [ ] **Step 2:** Run them and confirm they FAIL.
- [ ] **Step 3:** Implement with the spec's look, using the mock's 5c/5d/5e styling. Regenerate icons.
- [ ] **Step 4:** PASS; `tsc` clean.

---

### Task 5: Welcome (5a) and the intro (7a–7c)

**Files:**
- Create: `src/app/(auth)/welcome.tsx`, `src/app/(auth)/intro.tsx`, `src/components/signin/IntroCards.tsx` (the three illustration cards)
- Delete: `src/app/(onboarding)/welcome.tsx`. It maps to the same URL `/welcome`. Repoint the AuthGate's signed-out redirect in `src/app/_layout.tsx` from `/(onboarding)/welcome` to `/(auth)/welcome`. Nothing else changes in the gate yet.
- Regenerate typed routes.
- Test: `__tests__/WelcomeScreen.test.tsx`, `__tests__/IntroScreen.test.tsx` (create)

**Interfaces:**
- Consumes: `KriaMark` (Task 1); `latestTournaments` (`@/api/tournaments`); `AwardBadge`; `RANKED_SPORTS`, `RANK_MIN`, `sportName`; `useReducedMotion` from Reanimated for the pager.

- [ ] **Step 1: Write the failing tests:**
  - **Welcome:**
    - it shows "Play.", "Compete." and "Get on the board.";
    - "Create account" pushes `/(auth)/intro`;
    - "Log in" pushes `/(auth)/login`;
    - there's no "Google" text.
  - **Intro, navigation:**
    - page 1 shows "Host a match in seconds.";
    - "Next" moves to page 2, which shows "Climb the leaderboard." and a line containing "badminton and cricket";
    - "Skip" pushes `/(auth)/register`;
    - page 3 has no Skip, and "Create my account" pushes `/(auth)/register`.
  - **Intro, tournament card:**
    - with `latestTournaments` resolving one open tournament with a banner, page 3 shows its name and "Registration open";
    - when it rejects, page 3 still renders with no tournament name.
  - **Intro, no mock samples:** no text "Neha", "Karthik" or "K R 7".
- [ ] **Step 2:** Run both and confirm they FAIL.
- [ ] **Step 3:** Implement per the spec's 5a and 7a–7c. The intro pager is a horizontal paged `ScrollView` or a Reanimated pager. The photo is `assets/images/welcome.png`, cropped as in the spec, with a gradient (react-native-svg `LinearGradient`) to `bg`.
- [ ] **Step 4:** PASS; `tsc` clean.

---

### Task 6: Create account, Verify email, Set password (5c–5e)

**Files:**
- Rewrite: `src/app/(auth)/register.tsx`, `src/app/(auth)/verify-otp.tsx`, `src/app/(auth)/set-password.tsx`
- Test: `__tests__/SignUpFlow.test.tsx` (create; covers all three screens with a real store and a mocked API)

**Interfaces:**
- Consumes:
  - From Tasks 3 and 4: `emailOk`, `phoneDigits`, `phoneOk`, `otpDigits`, `passwordRules`, `passwordOk`, `resendOtp`, and `AuthScreen`, `Title`, `Field`, `CodeBoxes`, `PasswordField`, `RuleList`, `useResend`.
  - From `authSlice`: `registerUser({ data })`, `verifyOtp({ data })`, `setPassword({ data })`, `beginOnboardingHandoff`, `endOnboardingHandoff`, and `registrationEmail`.
- The email carries from register to verify to set-password through `auth.registrationEmail`, which `registerUser.fulfilled` already stores. A screen opened without it replaces to `/(auth)/register`.

- [ ] **Step 1: Write the failing tests:**
  - **Register:**
    - "Send code to my email" is disabled until all four fields are valid;
    - a touched empty first name shows "Required";
    - a 9-digit phone shows "1 more digit" (the spec's "N more digits", singular at 1);
    - submit posts `/player/auth/register` with `phone: '9845021764'` (10 digits, no "+91"), then pushes `/(auth)/verify-otp`;
    - a 400 "Email already registered. Please login." shows that message and a "Log in" link.
  - **Verify:**
    - "Verify" is enabled only at 6 digits;
    - success pushes `/(auth)/set-password`;
    - a 400 shows the server message and clears the boxes;
    - "Resend code" appears after 30s (fake timers) and posts `/player/auth/resend-otp`.
  - **Set password:**
    - "Create my account" is enabled at 8 characters;
    - on submit, `beginOnboardingHandoff` is dispatched BEFORE the set-password request resolves (assert `pendingOnboarding` is true while the request is pending);
    - on failure `pendingOnboarding` is false again and the message shows.
- [ ] **Step 2:** Run it and confirm it FAILS.
- [ ] **Step 3:** Implement per the spec's 5c, 5d and 5e.
- [ ] **Step 4:** PASS; `tsc` clean.

---

### Task 7: Log in (password and code) and Forgot password

**Files:**
- Rewrite: `src/app/(auth)/login.tsx`, `src/app/(auth)/forgot-password.tsx`
- Create: `src/app/(auth)/login-code.tsx`, `src/app/(auth)/reset-password.tsx`
- Regenerate typed routes.
- Test: `__tests__/LoginFlow.test.tsx`, `__tests__/ForgotPasswordFlow.test.tsx` (create)

**Interfaces:**
- Consumes:
  - `loginUser({ data })`, `requestLoginOtp({ data })` and `verifyLoginOtp({ data })` from `authSlice`.
  - `requestPasswordReset` and `resetPassword` from Task 3.
  - `loginErrorMessage` and `LOGIN_MISMATCH` from Task 3.
  - The Task 4 pieces, and `Segmented` with `fill`.
- Params:
  - Log in reads `?email=` and `?reset=1`.
  - Forgot password reads `?email=`.
  - login-code and reset-password read `email` (required). Without it, they replace back.

- [ ] **Step 1: Write the failing tests:**
  - **Log in by password:**
    - a 401 shows `LOGIN_MISMATCH`, does not dispatch `logout`, and stays on Log in;
    - a 400 "Password not set. Please use OTP login." shows that message and an "Email me a code" link that switches the mode;
    - success sets `auth.user`.
  - **Log in by code:** "Email me a code" posts `/player/auth/login/otp` and pushes `/(auth)/login-code` with the email; the code screen verifies through `/login/otp/verify`.
  - **Forgot password:**
    - Forgot posts `/player/auth/forgot-password` and pushes reset-password;
    - Reset is enabled at 6 digits plus 8 characters and posts `{ email, otp, newPassword }`;
    - success replaces to `/(auth)/login` with `{ reset: '1', email }`;
    - Log in then shows "Password changed. Log in with your new one." with the email prefilled.
- [ ] **Step 2:** Run them and confirm they FAIL.
- [ ] **Step 3:** Implement per the spec's 5b, login-code and Forgot password, and the preview `.dc.html` files.
- [ ] **Step 4:** PASS; `tsc` clean.

---

### Task 8: Your game, For tournaments, and the AuthGate

**Files:**
- Create: `src/app/(onboarding)/your-game.tsx`, `src/app/(onboarding)/for-tournaments.tsx`
- Create: `src/lib/authRoute.ts`
- Modify: `src/app/_layout.tsx`. The AuthGate uses `routeFor`. Remove `getOnboardingComplete` and the `onboardingDone` state.
- Delete: `src/lib/onboardingStorage.ts` (and its test, if any)
- Regenerate typed routes.
- Test: `__tests__/authRoute.test.ts`, `__tests__/ProfileStepsFlow.test.tsx` (create)

**Interfaces:**
- Produces:
  ```ts
  export type Root = string; // segments[0] as a string, 'undefined' when none
  export function routeFor(s: { signedIn: boolean; pendingOnboarding: boolean; root: Root; publicRoots: string[] }):
    '/(auth)/welcome' | '/(onboarding)/your-game' | '/(tabs)/home' | null; // null = stay
  ```
  The rules are the spec's "Flow and routing", in order:
  - signed out, and root not public → `/(auth)/welcome`;
  - signed in with pending onboarding, and root ≠ `(onboarding)` → `/(onboarding)/your-game`;
  - signed in with no pending onboarding, and root `(auth)` → `/(tabs)/home`;
  - signed in, root `'undefined'` → `/(tabs)/home`;
  - otherwise `null`.

  `PUBLIC_ROOTS` stays `['(auth)', 'auction', 'bracket', 'live']`; drop `(onboarding)`.
- Consumes: `updateProfile`, `endOnboardingHandoff`, `EVENT_SPORTS`, `sportIcon`, `citySuggestions`, `dobCheck`, `latestTournaments`, `Segmented fill`, and the Task 4 pieces.

- [ ] **Step 1: Write the failing tests:**
  - **`routeFor`:** every rule above, plus:
    - signed out on `(onboarding)` → welcome;
    - signed in on `(onboarding)` without pending → null (they may finish);
    - signed in on `(tabs)` → null.
  - **Your game:**
    - "Continue" is disabled until a sport is picked;
    - the city chips come from mocked tournaments' venue cities (max 4), and tapping one fills the field;
    - Continue sends `PATCH /player/auth/profile` with `{ sport: 'cricket', location: 'Pune' }` and pushes for-tournaments;
    - Skip pushes for-tournaments without a PATCH.
  - **For tournaments:**
    - "Save" is enabled only with a valid date and a gender;
    - it sends `{ dateOfBirth: '2001-03-15', gender: 'female' }`, dispatches `endOnboardingHandoff` and replaces to `/(tabs)/home`;
    - Skip sends nothing, ends the handoff and replaces to Home;
    - an invalid date shows "That date doesn't look right.".
- [ ] **Step 2:** Run both and confirm they FAIL.
- [ ] **Step 3:** Implement per the spec's 5f and 5g and "Flow and routing". Switch the AuthGate to `routeFor`; its effect calls `router.replace(target)` when the target is non-null. The `entering` route stays until Task 10, unrouted.
- [ ] **Step 4:** PASS. The whole `npx jest` suite still passes, because the old onboarding screens' tests may need deleting now if they relied on the removed flag; delete only those. `tsc` clean.

---

### Task 9: The launch animation (6b, 6c) and the native splash

**Files:**
- Create: `src/components/LaunchAnimation.tsx`, `src/lib/launchTiming.ts`
- Modify: `src/app/_layout.tsx`. Render `LaunchAnimation` with `ready` (fonts, bootstrap and first route) in place of `BrandIntro`. Call `SplashScreen.hideAsync()` once the overlay has mounted.
- Modify: `app.json`, the `expo-splash-screen` plugin: `backgroundColor: '#0B0B0D'` for both platforms, plus a transparent image (create `assets/images/splash-transparent.png`, 1×1 RGBA 0,0,0,0) wherever an image is required.
- Test: `__tests__/launchTiming.test.ts`, `__tests__/LaunchAnimation.test.tsx` (create)

**Interfaces:**
- Consumes: `MarkBody`, `MarkBall`, `MARK_BALL` (Task 1); `motion`, `ease` from `constants/theme`; `useReducedMotion`.
- Produces:
  ```ts
  export const LAUNCH_6B = { total: 1750, exit: 320 };   // per spec timeline
  export const LAUNCH_6C = { total: 720, exit: 320 };
  export function exitAt(p: { reduced: boolean; readyAt: number | null }): number | null; // ms from start when the exit begins; null while not ready
  ```
  `exitAt` is `max(total, readyAt)` once ready, using `LAUNCH_6C.total` under reduced motion.

- [ ] **Step 1: Write the failing tests:**
  - **`exitAt`:**
    - `{ reduced: false, readyAt: 300 }` → 1750;
    - `{ reduced: false, readyAt: 2400 }` → 2400;
    - `{ reduced: true, readyAt: 100 }` → 720;
    - `readyAt: null` → null.
  - **`LaunchAnimation`:**
    - it renders "KRIA" and "Your sporting career, in your pocket.";
    - with `ready` true and fake timers advanced past 1750 + 320, `onDone` is called once;
    - with `ready` false it isn't called;
    - flipping `ready` to true later calls it after the exit.
- [ ] **Step 2:** Run both and confirm they FAIL.
- [ ] **Step 3:** Implement the spec's 6b timeline with Reanimated shared values:
  - The body, ball, speed lines and mark are separate animated views.
  - The ball rotates about its centre: wrap `MarkBall` in an `Animated.View` sized to the mark, with a transform origin at (493/800, 91/700) of its box. Or translate to the centre, rotate, and translate back.
  - The wordmark wipe is an overflow-hidden container whose width animates from 0 to the full width.

  Implement 6c under reduced motion. Then update `app.json`.
- [ ] **Step 4:** PASS. `npx expo config --json` shows the splash plugin with `#0B0B0D`. `tsc` clean.

---

### Task 10: Deletions, old UI layer, gates and handover

**Files:**
- Delete:
  - `src/app/(auth)/entering.tsx`;
  - `src/app/(onboarding)/{story,auth,card-preview,creating,welcome-done}.tsx`;
  - `src/components/BrandIntro.tsx`;
  - `src/store/slices/onboardingSlice.ts`, removed from `src/store/index.ts`;
  - their tests;
  - their `Stack.Screen` lines.
- Modify: `src/app/index.tsx`, a plain `View` with `colors.bg` and no `className`.
- Modify: `src/app/_layout.tsx`, the root background from `constants/theme`. Drop the `lib/theme` import, and stop loading fonts nothing uses any more (check `Anton_400Regular`, `Barlow_*`, `JetBrainsMono_400Regular`, `JetBrainsMono_700Bold` by grep; keep `JetBrainsMono_600SemiBold` and the Archivo files).
- Modify: `src/components/knockout/TiePick.tsx`, onto `constants/theme`.
- Delete: `src/lib/theme.ts` and `src/lib/theme/*` once nothing imports them. Then run an orphan sweep, like the last pass's Task 13 loop, over `src/components`, `src/lib`, `src/api`, `src/store` and `src/hooks`, deleting what nothing imports, with its tests. Expect `components/{canvas,states,icons,auth,onboarding,StatusPill,…}` to go. Repeat until stable.
- Regenerate typed routes.
- Modify: `d:/kria/HANDOVER-mobile-redesign.md`:
  - every route is on the new design;
  - a "What we built" section for this pass;
  - Decisions, from the spec's "Calls made by Claude";
  - Known limits, including that the native splash is unverified in Expo Go;
  - the file map, test counts and server gaps (37);
  - next steps: push, device test, NativeWind/font-package removal, server gaps.

- [ ] **Step 1:** Delete the old screens and pieces above. Grep for importers first. Keep `src/lib/password.ts` and anything the new screens import.
- [ ] **Step 2:** Move `_layout.tsx` and `TiePick` off `lib/theme`, then delete it, the old fonts and the orphans. Loop the sweep until no candidates remain.
- [ ] **Step 3: Gates:**
  - `npx tsc --noEmit` is clean.
  - `npx jest` passes the whole suite (record the counts).
  - `npx expo config --json` resolves.
  - The Android bundle `__workletHash` count is in its usual range (565 at the last hand-over), per the handover's Verification section, stopping only the PID you started.
- [ ] **Step 4:** Update the handover. Report every deleted file, and the gate output.
