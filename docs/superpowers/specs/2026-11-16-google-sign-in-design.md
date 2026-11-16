# Google sign-in for players (SERVER-GAPS #35) — design

16 November 2026. Short design: a small change across the server and the player app.

## Intent

Mock 5a (Welcome) has "Continue with Google" between Create account and Log in. A Google sign-up skips the form, the OTP and the password, and goes straight to the profile steps (5f Your game, then For tournaments). Players can then join without typing an email, a code and a password.

## Goals

- Android players can create an account or sign in with Google from Welcome.
- A new Google player goes through Your game and For tournaments. A returning one lands on Home.
- No new secrets: the server checks Google's signed token, and the client secret is never used.

## Non-goals

- iOS. It needs an iOS app in Firebase (bundle id, `GoogleService-Info.plist`) and an Apple Developer account. It's a later step.
- Google sign-in for organisers. The `GOOGLE_CLIENT_ID` already in `server/.env` belongs to another Google project, and no code reads it.
- Importing the Google profile photo.

## Constraints

- The player app runs in Expo Go during development (SDK 57), and Expo Go can't load native Google sign-in. Google sign-in works only in an EAS build (APK), as push does.
- `Player.phone` and `Player.lastName` are required today. Google never gives a phone, and some accounts have no family name.
- Tournament entry sends the account's phone in the entry profile: organisers use it on match day, and the payment validator requires `profile.phone`.

## Approaches

| | How | Trade-off |
|---|---|---|
| **A, picked** | The native library `@react-native-google-signin/google-signin` (v17; its peer is `expo >= 52`) shows Android's account picker and returns Google's ID token. The server checks it with `google-auth-library`, which is already installed. | No secret anywhere, and no Firebase SDK. Needs an APK build. |
| B | Browser sign-in: the server swaps a code for tokens. | Needs the client secret on the server and a clunkier browser sheet, and still needs a build. |
| C | Firebase Auth, with the server checking Firebase tokens. | Two new packages and a second user list beside `Player`. Worth it only if Firebase later handles phone OTP or Apple sign-in too. |

Firebase is used only to issue the OAuth clients (project `kria-b849d`): the Android client for `club.kria.app` (EAS keystore SHA-1 `42:3f:2c…`) and the Web client `538256095759-op8gn7jusv3iqeccherrglr00nngb6u9.apps.googleusercontent.com`.

## Decisions

### Server

- **Route:** `POST /player/auth/google`, body `{ idToken }`. It answers `{ accessToken, player, isNew }`, the same shape as the other logins plus `isNew`.
- **Token check:** `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_PLAYER_CLIENT_ID })`, a new env variable set to the Web client ID. If the check fails, the route answers 400, not 401: the app reads any 401 as an expired session (#34, #37). It also refuses with 400 if `email_verified` isn't true.
- **Matching the email (my call):** the lowercased email is looked up against existing players.
  - **No player:** one is created with `firstName` = `given_name`, else `name`, else the part of the email before `@`; `lastName` = `family_name` or `''`; no phone; `status: verified`; `authProvider: google`. `isNew: true`.
  - **Verified player:** signed in, whatever the original sign-up method was, because Google has confirmed the email. `authProvider` is unchanged. `isNew: false`.
    - **Exception, added after the final review:** an email-made account (`authProvider: email`) is opened through Google only for a Gmail address or a Workspace one (`hd` set). Google vouches for who holds those addresses now; any other address was checked once, when the Google account was made, and may have changed hands since. Otherwise the route answers 400 "This email already has a Kria account. Log in with your password or an emailed code."
  - **Pending or `otp_verified` player** (an unfinished email sign-up): marked verified and signed in. `isNew: true`, because they never reached the profile steps.
  - **Suspended or inactive player:** refused, as other logins refuse them.
- **Model:** `phone` and `lastName` are required only when `authProvider` is `email`.
- **Change password with no password set (my call):** a Google-only player gets "You signed up with Google. Use Forgot password to set one." instead of today's "Player not found."
- **Unset env variable:** if `GOOGLE_PLAYER_CLIENT_ID` is unset, the route answers 500 with a clear log line, as the Razorpay webhook does without its secret.

### Player app

- **Welcome (5a):** a "Continue with Google" button between Create account and Log in. It follows the mock: dark surface, a white "G" disc, and the label.
  - **Expo Go:** the button is hidden there (`isRunningInExpoGo()`), and the native module is loaded only outside it, so Expo Go and jest never import it.
- **The flow:** `hasPlayServices`, then `signIn` (a cancel does nothing), then a `googleSignIn` thunk posts the token, stores the access token as the other logins do, and dispatches `beginOnboardingHandoff()` when `isNew`. The AuthGate already routes a pending handoff to Your game; a returning player goes Home.
- **Errors:** shown as one line under the buttons.
- **Log out:** also signs out of Google, so the account picker shows again next time.
- **Config:** the library's config plugin goes in `app.json`, and the Web client ID becomes an app constant (it is public).

### Phone at first entry (the user's pick: B)

- **Missing-profile check:** the entry screen's check covers last name and phone as well as date of birth and gender, because both entry validators and the registration model require `profile.lastName` and `profile.phone`. The note and the blocker name exactly what's missing, for example "Add your mobile number to enter" or "Add your date of birth, gender and mobile number to enter". The existing Edit link opens Edit profile, which already has Last name and Phone fields.
- **No crash without a phone:** `entryLine` and `maskPhone` cope with a missing phone.
- **Server check:** already in place. `tournamentRegistration.validator.ts` and `payment.validator.ts` both refuse an entry with an empty `profile.phone` or `profile.lastName`.

## Left to the builder

- The plan sets the exact error wording for the server's refusals and the app's error line.
- The plan checks every app reader of `user.phone` and `user.lastName` for a missing value (settings' contact form, category screen, profile header).
- Tests come first, as in every batch. The server tests mock `google-auth-library`'s `verifyIdToken`; the app tests mock the native module.

## Not done

- iOS.
- Matching by Google account id (`sub`). Accounts are matched by email only, which is unique on `Player`.
- The Play App Signing SHA-1 has to be added in Firebase when the app reaches the Play Store.
- `GOOGLE_PLAYER_CLIENT_ID` must be set on the live server before deploying.
