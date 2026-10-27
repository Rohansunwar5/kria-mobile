# Onboarding, sign-in and the launch animation: design

23 October 2026 · player app (`mobile/`) · the last part of the redesign to `mobile/DESIGN.md` v1.1

## Intent

Sign-in, sign-up and the launch are the last screens still on the old UI. This pass rebuilds them from two mocks:
- `new-ui-designs/Kria Onboarding.dc.html`: 7a–7c (a three-screen intro) and 5a–5h (the flow).
- `new-ui-designs/Kria Motion.dc.html`: the launch animation, 6b "Sprint and catch".

After this pass every screen is on the new design, so the old UI layer can go.

The user agreed the following on 23 October 2026 (playback approved):
- 6b is the launch animation.
- The Welcome photo is `new-ui-designs/banner-cricket.png`.
- The Kria mark is traced to SVG from the existing PNG, with the ball as its own layer.
- Google sign-in and the Notifications screen (5h) are left out.
- The old ID-card steps and the "entering" transition go.
- The native splash becomes the app's dark background.

The user approved a preview of the traced mark and of Forgot password, then deleted it. Its source is in `docs/superpowers/specs/2026-10-23-onboarding-preview/`:
- `KriaMark.dc.html`;
- `ForgotEmail.dc.html`, `ForgotReset.dc.html` and `LoginAfterReset.dc.html`;
- the traced `kria-mark.svg`, and `trace2.js`, which produced it.

Where DESIGN.md and a mock disagree on structure, DESIGN.md wins; on a value, the mock wins. Real server data only. Sample names, codes and numbers in the mocks are not data.

## Goals

- **Sign-up works end to end on the new design:** Welcome → intro → Create account → Verify email → Set password → Your game → For tournaments → the new-player Home.
- **Log in works on the new design:** by password or by emailed code, plus Forgot password.
- **The launch:** 6b plays on every cold start, and 6c's quiet fade plays when the system's reduced-motion setting is on. The native splash hands off to it with no flash of colour.
- **One Kria mark component (SVG):** used by the launch, Welcome, the intro header and Home's header.
- **One password rule everywhere:** 8+ characters required, "a number or symbol" recommended. That includes Change password.
- **Cleanup:** the old onboarding and auth screens, `BrandIntro`, and the old UI layer they kept alive are deleted.
- **Server gaps:** #35–#37 are logged in `d:/kria/SERVER-GAPS.md`.

## Non-goals

- **Push notifications and the 5h screen.** Nothing sends push (gap #2).
- **Google sign-in.** The server has none for players (new gap #35).
- **The "warm start" resume animation.** Nothing plays when the app returns from the background.
- **The splash-to-Home "runner" loader** (the Motion mock's bridge). If the app isn't ready when 6b ends, the final frame simply holds.
- **Removing NativeWind and its build config,** and uninstalling the old font packages. These touch the Babel and Metro setup and are a separate follow-up. This pass only stops using them.
- **A new app icon.** The icon stays as it is.
- **Terms and Privacy pages.** None exist. See "Calls made by Claude".

## Anti-goals

- **Claims the server doesn't back.** Examples:
  - "Climb your city's leaderboard" (rankings have no city);
  - "ranked … in every sport" (only badminton and cricket are ranked, gap #3);
  - a Terms line pointing at pages that don't exist;
  - notification promises.
- **Sample people, codes or numbers from the mocks shown as real data.**
- **Blocking someone who skips** a skippable step (For tournaments).
- **Losing any account action that works today:**
  - registering;
  - verifying, and resending the code;
  - setting a password;
  - both log-in methods;
  - forgot and reset password.

## Constraints

- Build on `constants/theme.ts` and `components/ui/*`. New code never imports `lib/theme`, `components/icons`, `components/canvas`, `components/states`, `components/onboarding`, `components/auth`, or NativeWind `className`.
- Icons come from `scripts/icons.mjs`: add a name and regenerate.
- No new dependencies. `react-native-svg` and `react-native-reanimated` are already installed.
- Implementer subagents don't run git and stop only the processes they started. The controller commits, and only when the user asks.
- After adding or removing route files, regenerate the typed routes before running `tsc`.

## Server facts (traced 23 October 2026)

| Need | Route | Notes |
|---|---|---|
| Register | `POST /player/auth/register` `{firstName, lastName, email, phone}` | All four required. Re-registering a pending email just re-sends the code. A verified email → 400 "Email already registered. Please login." |
| Verify the sign-up code | `POST /player/auth/verify-otp` `{email, otp}` | 6 digits, valid 10 minutes. Wrong or expired → 400 with a message. |
| Resend the sign-up code | `POST /player/auth/resend-otp` `{email}` | No server cooldown; the app adds one. |
| Set password | `POST /player/auth/set-password` `{email, password}` | Returns `{accessToken, player}`: the player is now signed in. The model's minimum is 8. |
| Log in by password | `POST /player/auth/login` `{email, password}` | A wrong password → bare 401 "Unauthorized" (new gap #37). "Password not set. Please use OTP login." → 400. An unknown email → 404. |
| Log in by code | `POST /player/auth/login/otp` `{email}`, then `POST /player/auth/login/otp/verify` `{email, otp}` | The same 6-digit, 10-minute code. |
| Forgot / reset | `POST /player/auth/forgot-password` `{email}`, then `POST /player/auth/reset-password` `{email, otp, newPassword}` | Reset does NOT sign you in. An unverified account → 400 "Account not verified." |
| Profile | `PATCH /player/auth/profile` | `gender` is male or female; `dateOfBirth` is ISO; `sport` and `location` are free text. Existing `updateProfile` thunk. |
| Tournaments (public) | `GET /tournament` | No login needed. Existing `latestTournaments`. |
| Rankings | `GET /player/rankings` | Login required, and no city filter (new gap #36). It can't be used before sign-up. |

The existing redux thunks in `store/slices/authSlice.ts` (`loginUser`, `requestLoginOtp`, `verifyLoginOtp`, `registerUser`, `verifyOtp`, `setPassword`, `updateProfile`) and the helpers in `api/auth.ts` (`resendOtp`, `requestPasswordReset`) are kept and reused. Add a reset-password helper if none exists.

## The Kria mark

- **`components/KriaMark.tsx`:** the traced mark as `react-native-svg` paths, copied from `kria-mark.svg`.
  - viewBox `0 0 800 700`; orange `#FF5404`; seam `#3E403D`.
  - Two parts: `body` (one path) and `ball` (a circle, the seam stroke and the flick).
  - A plain `<KriaMark size={n} />` draws both.
  - The launch needs the parts separately, so export the path data and the ball's centre (493, 91 in viewBox units) too.
- **Where it's used:**
  - Welcome: 56px wide.
  - The intro header: 46px.
  - Home's header, replacing the `logo.png` image (`app/(tabs)/home.tsx`).
  - The launch: 112×98.

## The launch: 6b "Sprint and catch"

- **Component:** `components/LaunchAnimation.tsx`. It replaces `components/BrandIntro.tsx` in `app/_layout.tsx` and plays once per cold start, over everything.
- **Layout:** the `bg` colour fills the screen. A centred column, gap 26:
  - the mark at 112×98;
  - "KRIA" in display type, 46px, letter-spacing 0.16em;
  - 10px below it, the tagline "Your sporting career, in your pocket." in 13px `text3`.
- **Timeline** (ms, from the Motion mock's `splash('B')`):
  - **Runner (body):** 0→580. It comes from translateX −240 with skewX −22° and opacity 0; at 62% it is at translateX 8, skewX 4°, opacity 1; then it settles at rest. Easing `cubic-bezier(.16,.9,.3,1)`.
  - **Four speed lines:** 3px tall, radius 2, `accent`, left of the mark at top 40, 54, 68 and 82. Widths 140/110/150/90; left −150/−120/−160/−100. Each runs 560ms, starting i×30 apart. It goes from translateX −140 with scaleX .2 and opacity 0, to translateX 0, scaleX 1, opacity .9 at 50%, to translateX 12, scaleX 0, opacity 0. Easing ease-out; transform origin is the right edge.
  - **Ball (head):** 360→1000, 640ms. Its path, rotating about its own centre:
    - from translate(170, −210), rotate 0°;
    - to translate(46, −74), rotate 320° at 55%;
    - to translate(0, 0), rotate 530° at 86%;
    - settling at rotate 540°.

    Easings per segment: `cubic-bezier(.25,0,.6,.5)`, `cubic-bezier(.3,.5,.6,1)`, ease-out.
  - **Catch:** 920→1200. The whole mark goes to translateY 3 and scale (1.03, .96) at 40%, then back. Ease-out.
  - **Wordmark:** 1080→1540. A left-to-right wipe (clip from right 100% to 0). Easing `cubic-bezier(.65,0,.35,1)`.
  - **Tagline:** 1350→1750. Opacity 0→1. Easing `ease.standard`.
- **Exit:** 320ms opacity 1→0 and scale 1→1.03, easing `ease.exit`. It starts when both are true:
  - the timeline has reached 1750ms;
  - the app is ready (fonts loaded, auth bootstrapped, first route chosen).

  If the app isn't ready, the final frame holds until it is. Then the overlay unmounts.
- **Reduced motion (6c):**
  - The mark wipes in left to right over 420ms (`cubic-bezier(.65,0,.35,1)`), with opacity 0→1.
  - The word fades in over 300ms from 220ms; the tagline over 300ms from 320ms.
  - The exit is an opacity-only fade of 320ms, starting at max(720ms, ready).
- **Native splash** (`app.json`, the `expo-splash-screen` plugin): background `#0B0B0D` on both platforms, with no visible image. If the plugin needs an image, use a fully transparent PNG. The launch overlay starts on the same colour, so there's no flash. `SplashScreen.hideAsync()` runs once the overlay has mounted.

## Flow and routing

- **Routes** (expo-router groups):
  - `(auth)`: `welcome` (5a), `intro` (7a–7c, one route with a pager), `register` (5c), `verify-otp` (5d), `set-password` (5e), `login` (5b), `login-code` (the code entry for log-in by code), `forgot-password`, `reset-password`.
  - `(onboarding)`: `your-game` (5f) and `for-tournaments` (5g).
- **The `AuthGate` in `app/_layout.tsx`:**
  - **Signed out**, outside the public roots: replace to `/(auth)/welcome`. The "onboarding complete" flag and `lib/onboardingStorage.ts` go. Every signed-out player starts on Welcome, which has Log in one tap away.
  - **Signed in with `pendingOnboarding`:** set by a successful Set password, through `beginOnboardingHandoff`. Stay in `(onboarding)`; anywhere else, replace to `/(onboarding)/your-game`.
  - **Signed in in `(auth)`:** replace to `/(tabs)/home`. The `entering` screen goes.
  - **Fresh launch, signed in, no route:** `/(tabs)/home`.
  - **Leaving onboarding:** For tournaments (Save or Skip) calls `endOnboardingHandoff` and replaces to `/(tabs)/home`.
  - **Killed mid-profile:** if the app is killed during 5f–5g, the flag is lost and the next launch opens Home. The new-player Home already shows "Complete your profile".

## Screens

All screens follow the mock's look:
- 24px side padding;
- a 56px header row with a 44px back button;
- display-44 titles at line height .92;
- 54px fields with radius 14, `surface1` fill and no border; labels 13/600 in `text2`;
- footer buttons 56px with radius 16, inside a `FooterBar` or pinned the same way with safe-area padding;
- the form inside a `KeyboardAvoidingView`, footer included, as in `quick/new.tsx`.

Buttons are `accent` when enabled, and `surface2` with `disabled` text when not. Every action ignores presses while its request is in flight. Every screen ignores late responses after unmount.

### 5a Welcome: `(auth)/welcome`
- **Background:** full-bleed `assets/images/welcome.png` (a copy of `new-ui-designs/banner-cricket.png`), cropped about 58% / 30% as in the mock. A gradient from transparent to `bg` keeps the text readable, per the mock.
- **Content:**
  - the mark at 56px;
  - "Play. / Compete. / Get on the board." in display type, each on its own line;
  - "Host games with friends, enter real tournaments and build a record that counts."
- **Buttons:**
  - "Create account" (primary) opens the intro.
  - "I already have an account · Log in" opens Log in.
  - No Google button.

### 7a–7c Intro: `(auth)/intro`
A horizontal pager with three pages. Swipe, or tap "Next". A back arrow and the mark sit in the header. "Skip" (top right on 7a and 7b) goes straight to Create account. 7c has no Skip; its button "Create my account" is the only orange one. Each page has a small mono label ("01 / 03 · PLAY"), a display headline, one line, and an illustration card that reuses real app components.
- **7a Play** — "Host a match in seconds." / "Start a quick match, share the code, and friends join from their phones. Every result goes on your record."
  - The card shows "Badminton · Quick match", a share-code row of six boxes showing "·", and two roster rows: "You · Host" and "Your friend · Joined" with a check.
  - Under it, a result line "You won 2–0 · Added to your record".
  - The card is an illustration, so it uses no names or codes.
- **7b Compete** — "Climb the leaderboard." / "You're ranked by win rate in badminton and cricket. Ten decided matches and you're on the board."
  - Rankings need login (gap #36), so the card is an illustration:
    - sport pills (Badminton, Cricket);
    - "WIN RATE";
    - three ranked rows (1–3, medal colours) with grey avatar circles and grey name and value bars, static with no shimmer;
    - a tinted fourth row: "You · 10 matches to go".
  - The line names the sports from `RANKED_SPORTS`; `RANK_MIN` gives the ten.
- **7c Tournaments** — "Enter real tournaments." / "Register for events near you, get picked in team auctions, follow the bracket live and earn awards."
  - The card shows a real tournament: the soonest event with status `registration_open` and a banner, from `latestTournaments`. It shows the banner (128px), name, "Registration open" and "<date> · <city>".
  - If the list fails or is empty, it shows the mark on `surface1`, with no tournament text.
  - Under it, an award row: `AwardBadge` shield gold with "CHAMPION", plus "Champion" and "Awarded by the organiser".
- **Create my account** opens Create account.

### 5c Create account: `(auth)/register`
- **Header:** back, "1 of 3" and a three-segment progress bar (segment 1 `accent`).
- **Title:** "Who's playing?"
- **Fields:**
  - First name and Last name side by side.
  - Email, helper "We'll send your code here." When invalid, "Enter a valid email, like name@example.com" in `error` with an `error`-coloured 1.5px inset ring.
  - Mobile number with a fixed "+91" prefix and 10 digits. Helper "Organisers use this to reach you on match day." While incomplete, "N more digits".
  - A required field left empty shows "Required".
  - Validation shows once a field has been touched.
- **Footer:** "Send code to my email", enabled when all four are valid. It calls `registerUser` with the phone as 10 digits, then opens Verify.
  - A server error shows its message above the button.
  - If the email is already registered, the message offers "Log in" as a link.
- **No Terms line.** See "Calls made by Claude".

### 5d Verify email: `(auth)/verify-otp`
- **Header:** "2 of 3", progress 2/3.
- **Title:** "Check your inbox". Sub-line: "We sent a 6-digit code to **<email>**".
- **Code entry:** six 60px boxes over one hidden input with `textContentType="oneTimeCode"` / `autoComplete="sms-otp"`, numeric, so the platforms can autofill. The active box has a `text` ring; filled boxes have a `ring` ring.
- **Status line:** "N more digits" (mail icon), or "Code looks complete. Tap Verify." (check_circle).
- **Resend:** "Didn't get it? Check spam." plus "Resend in 0:SS", a 30s cooldown that starts on arrival. After it, "Resend code" calls `resendOtp` and restarts the cooldown.
- **Footer:** "Verify", enabled with six digits. It calls `verifyOtp`; on success it opens Set password. On failure it shows the server message and clears the boxes.

### 5e Set password: `(auth)/set-password`
- **Header:** "3 of 3", progress 3/3, and "Email verified" with a filled `verified` icon in `accent`.
- **Title:** "Lock it in".
- **Password field:** with show/hide.
- **Rules,** from `lib/password.ts` (see "One password rule"):
  - "At least 8 characters" is required.
  - "Add a number or symbol (recommended)" is soft.
  - A met rule is a filled `text` circle with a check. An unmet required rule has a `ring` outline; an unmet soft rule is dimmer.
- **Footer:** "Create my account", enabled at 8+ characters. It calls `setPassword` and then `beginOnboardingHandoff`; the AuthGate takes the player to Your game. A failure shows the server message.

### 5f Your game: `(onboarding)/your-game`
- **Header:** "Your profile · 1 of 2", and "Skip" on the right. Skip goes to For tournaments without saving.
- **Title:** "What do you play most?" Sub-line: "This sets your home ranking. You can still play and be ranked in any sport we rank."
- **Sport:** single-select tiles for `EVENT_SPORTS` (Badminton, Cricket), the same list as Edit profile and Events, each with its sport icon. The selected tile has a `text` ring and an `accent` dot and icon.
- **City:**
  - A text field, with suggestion chips below it.
  - The chips are the distinct venue cities of upcoming events from `latestTournaments`, at most 4.
  - Tapping a chip fills the field.
  - With no suggestions, there are no chips.
- **Footer:** "Continue", enabled once a sport is picked.
  - It saves `{sport, location}` through `updateProfile` (location only if non-empty), then opens For tournaments.
  - On failure it shows the message and stays.

### 5g For tournaments: `(onboarding)/for-tournaments`
- **Header:** back, "Your profile · 2 of 2", and Skip.
- **Title:** "Ready for tournaments?" Sub-line: "Organisers run categories by age and gender. These go on your entry automatically, so you never retype them."
- **Date of birth:** three numeric fields, DD, MM and YYYY. The hint reads:
  - "Used for age-group categories like U-17." while incomplete;
  - "<N> years old" when valid;
  - "That date doesn't look right." in `error` when invalid.

  A valid date is a real calendar date, after 1930, and at least 5 years ago.
- **Gender:** Male / Female (`Segmented fill`). Under it: "Shown to organisers only, to place you in the right category."
- **Footer:**
  - "Save", enabled when the date is valid and a gender is picked. It sends `{dateOfBirth (YYYY-MM-DD), gender}` through `updateProfile`.
  - Under it: "Skip for now, and you'll be asked again when you enter a tournament."
- **Leaving:** Save (on success) and Skip both call `endOnboardingHandoff` and replace to `/(tabs)/home`, the new-player Home.

### 5b Log in: `(auth)/login`
- **Title:** "Welcome back".
- **Method:** a `Segmented fill` switch, "Password" or "Email me a code".
- **Fields:** Email, plus Password (with "Forgot?" on its label row) in password mode. In code mode, the line "We'll email a one-time code to this address. No password needed."
- **Footer:** "Log in" or "Email me a code", and "New to Kria? Create account", which opens the intro.
- **Password mode:**
  - It calls `loginUser`.
  - A 401 shows "That email and password don't match." Exempt `/player/auth/login` from the axios 401 handling, as change-password already is.
  - Other errors show the server message, e.g. "Password not set. Please use OTP login.", plus a "Email me a code" link that switches the mode.
- **Code mode:** it calls `requestLoginOtp`, then opens `login-code`.
- **After a reset:** arriving from Reset password with `?reset=1` shows the status card "Password changed. Log in with your new one." (filled check_circle in `accent`), with the email prefilled.

### Log in by code: `(auth)/login-code`
- Built like 5d without the step counter or progress.
- Title "Check your inbox", with the same six boxes, status line, 30s resend (calling `requestLoginOtp` again) and errors.
- The footer "Log in" calls `verifyLoginOtp`. On success, the AuthGate takes the player to Home.

### Forgot password: `(auth)/forgot-password` and `(auth)/reset-password`
As previewed (`ForgotEmail.dc.html`, `ForgotReset.dc.html`, `LoginAfterReset.dc.html`).
- **Forgot your password?**
  - Line: "We'll email you a 6-digit code to set a new one."
  - Email, prefilled from Log in.
  - "Email me a code" calls `requestPasswordReset`, then opens Reset.
  - "Remembered it? Log in".
  - Server messages are shown as sent: "Player not found.", or "Account not verified."; the latter adds a "Create account" link.
- **Set a new password:**
  - "Enter the 6-digit code we sent to **<email>**".
  - The six boxes and the 30s resend (calling forgot-password again).
  - New password with show/hide, and the two rules.
  - "Reset password", enabled at 6 digits plus 8+ characters. It calls `POST /player/auth/reset-password`; on success it replaces to `/(auth)/login?reset=1&email=…`.
  - A wrong or expired code shows the server message and clears the boxes.

## One password rule

`lib/password.ts` changes:
- `passwordRules(pw)` returns two rules: "At least 8 characters" (required) and "Add a number or symbol (recommended)" (soft, met when the password contains a digit or a non-alphanumeric character).
- `passwordFormReady` requires only the required rule.

Set password, Reset password and Change password all use it. Change password's screen shows the soft rule dimmed when unmet and no longer blocks on it. Update its tests.

Change password's strength meter stays. `passwordScore` no longer counts rules; it uses its own scale:
- 0: empty.
- 1: under 8 characters.
- 2: 8+ characters.
- 3: 8+ with a number or symbol.
- 4: 12+ with a number or symbol.

`strengthLabel` gives "Too weak" (1), "Fair" (2), "Strong" (3) and "Very strong" (4). So an 8-letter password the button accepts reads "Fair", and "Too weak" only ever means "too short". Update `SERVER-GAPS.md` #33's suggestion to the single rule: enforce 8+ characters.

## Deletions

Once the new screens are in, delete:
- **Old auth screens:** the old `(auth)/{entering,register,verify-otp,set-password,forgot-password,login}` implementations. They are replaced in place where the route names match.
- **Old onboarding screens:** `(onboarding)/{welcome,story,auth,card-preview,creating,welcome-done}.tsx`.
- **The launch and flags:** `components/BrandIntro.tsx`, `store/slices/onboardingSlice.ts` (with its store registration) and `lib/onboardingStorage.ts`.
- **`app/index.tsx`'s NativeWind placeholder:** it becomes a plain `bg` view, or a redirect.
- **The old UI layer:** move `app/_layout.tsx`'s background and `components/knockout/TiePick.tsx` to `constants/theme.ts`, then delete `lib/theme.ts` and `lib/theme/*`.
- **Old components:** `components/{canvas,states,icons,auth,onboarding,StatusPill,…}` and anything else nothing imports any more, with their tests. Use an orphan sweep like the last pass.
- **Old fonts:** stop loading Anton, Barlow and JetBrains Mono 400/700 in `_layout.tsx` if nothing uses them. Keep JetBrains Mono 600 (`font.mono`).
- **Not removed:** NativeWind's config and the font packages stay installed (non-goal).

## Tests

Logic gets unit tests:
- the registration validators (email, 10-digit phone, required names);
- the date-of-birth validation and age;
- the new password rules;
- the city suggestions from tournaments;
- the AuthGate routing decisions, extracted as a pure function `routeFor({ user, pendingOnboarding, root })`;
- the launch's exit timing (ready before or after 1750ms; reduced motion).

Each new screen gets a screen test for its main path and its main error:
- register → verify → set password, with the store mocked;
- log in by password (a 401 shows the match message, and the player is not logged out), and by code;
- forgot → reset → log in with the note;
- your game saves sport and city;
- for tournaments: Save sends an ISO date, Skip saves nothing, and both end on Home;
- the intro: Skip, Next, and the 7c card with a tournament and without one.

`tsc` stays clean and the whole suite passes.

## Server gaps to log (#35–#37)

35. **No Google sign-in for players.**
    - Shows on: 5a Welcome, "Continue with Google".
    - Today: Google OAuth exists only for organisers (`organizer.model.ts`). `player-auth` has no Google route.
    - Suggested: `POST /player/auth/google` exchanging an auth code for tokens, creating the player on first use.
    - App follow-up: add the button back on Welcome; a Google sign-up skips straight to Your game.
36. **Rankings need login and have no city.**
    - Shows on: 7b's leaderboard card and its "your city's leaderboard" promise.
    - Today: `GET /player/rankings` is behind `isPlayerLoggedIn` and takes no city.
    - Suggested: a public top-N per sport, optionally by city.
    - App follow-up: 7b shows the real top three.
37. **A wrong login password comes back as a bare 401.**
    - Shows on: 5b Log in.
    - Today: `loginWithPassword` throws `UnauthorizedError('Invalid email or password.')`, but it serialises to "Unauthorized" (same as #34).
    - Suggested: a 400 with the message.
    - App follow-up: drop the login 401 exemption and show the server message.

## Left to the builder

- Component names and internal splits (e.g. a shared `CodeBoxes` for 5d, login-code and reset).
- How the pager and the launch are built with Reanimated.
- Skeleton and loading shapes.

The plan fixes the task order; deletions come last.

## Calls made by Claude (not the user)

- **Launch timing:** 6b plays in full on every cold start. The exit waits for 1750ms and readiness, and the final frame holds if the app is slow. There is no bridge loader, and nothing plays on resume.
- **The intro cards:**
  - 7a and 7b are illustrations with no names, codes or numbers. 7b can't show live rankings before sign-up (gap #36); this replaces the earlier "live leaderboard" idea.
  - 7c shows a real open tournament.
  - Copy is corrected where the mock over-promises: "the leaderboard" not "your city's", "badminton and cricket" not "every sport".
- **Sport tiles on Your game:** `EVENT_SPORTS` (Badminton, Cricket), as on Edit profile and Events, not the mock's six.
- **City suggestions:** from upcoming events' venues, not a fixed list.
- **No Terms/Privacy line on Create account.** No such pages exist; add the line when they do.
- **Every signed-out player starts on Welcome.** The "onboarding complete" flag goes.
- **One password rule (8+ required, number or symbol recommended) everywhere,** including Change password.
- **Resend cooldown:** 30 seconds.
- **The 5g date of birth:** valid after 1930 and at least 5 years ago. The hint shows the age only, not category eligibility.
- **NativeWind and old font packages stay installed,** unused (follow-up).
- **Change password's strength meter is kept,** on its own length-plus-mix scale (see "One password rule").
- **The native splash change can't be seen in Expo Go,** which shows its own loading screen. It is verified only in a development or preview build, which is not part of this pass's gates. The handover lists it under "not checked on a device".
