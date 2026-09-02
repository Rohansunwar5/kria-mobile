# Implementing the v2 player-app design

The design is 34 artboards in `mobile/docs/design-canvas/*.dc.html`.

To view them: open `mobile/docs/design-canvas/kria-player-app-screens.html` in a browser — it is
the whole canvas as one pan/zoom page, with PNG/PDF export. (It was published to a shareable link
once; that link has since been deleted. Ask and it can be republished.)

**Work from the `.dc.html` files, not from a screenshot.** Each is plain HTML + inline CSS. Ignore
the `<x-dc>` / `<helmet>` wrapper — the shared CSS is in `_head.html`, and each artboard's markup
is the matching `body-<Name>.html`. Exact values (colours, sizes, spacing) come from those files;
do not round or re-invent them.

`Components.dc.html` is the token sheet and `Patterns.dc.html` is the state system. Read both
before writing any screen.

## What this is not

The canvas is HTML/CSS; the app is React Native + NativeWind. This is a **translation**, not a
port. Web-only constructs used in the artboards and their RN equivalents:

| Artboard uses | In the app |
|---|---|
| `box-shadow: inset 0 0 0 1.5px` | `borderWidth: 1.5` + `borderColor` |
| `.grain` SVG data-URI overlay | skip it, or one low-opacity `<Image>` — do not ship a WebView |
| `.ghost` `-webkit-text-stroke` | `<Text>` at low opacity; RN has no text stroke |
| `.hazard` repeating-linear-gradient | `expo-linear-gradient`, or a tiled 18px `<Image>` |
| `writing-mode: vertical-rl` (`.rail`) | `transform: [{ rotate: '90deg' }]` |
| `mix-blend-mode` | not supported — drop it |
| CSS `gap` | supported in RN 0.81, keep it |

Where an effect can't be done cheaply in RN, **drop it rather than approximating badly**, and say
which ones you dropped.

## Phase 1 — foundation — DONE

Landed already: all three fonts loaded in `_layout.tsx`, tokens in `tailwind.config.js`, the
icon set in `src/components/icons/`, and the four state patterns in `src/components/states.tsx`
(`Skeleton`, `EmptyState`, `ErrorBlock`, `StaleBanner`, `Ghost`). Kept for reference:

1. **Fonts.** The design replaces Oswald/Montserrat with three faces:
   - `Anton` — display, uppercase, tight leading
   - `Space Grotesk` — interface / body (400, 500, 700)
   - `Space Mono` — all numerals and data (400, 700), tabular

   Install `@expo-google-fonts/anton`, `@expo-google-fonts/space-grotesk`,
   `@expo-google-fonts/space-mono` at versions matching **Expo SDK 54** (see `mobile/AGENTS.md` —
   do not upgrade the SDK). Load them in `src/app/_layout.tsx` alongside the existing `useFonts`
   call. Keep Oswald/Montserrat installed until the last screen is migrated, then remove them.

2. **Tokens.** Update `tailwind.config.js` from `Components.dc.html`:
   - `ink: '#0B0B0B'` (was `#111111`), `panel: '#151515'`, `panel2: '#1E1E1E'`
   - `brand: '#F97316'` (unchanged), `auction: '#FA4C93'`, `open: '#16C46A'`, `fail: '#FF4438'`
   - the three accents are `oklch(0.70 0.19 h)` at h46 / h350 / h145 — if you add a fourth
     accent later, derive it the same way so it carries equal weight
   - fontFamily entries for the three new faces
   - border colour `rgba(255,255,255,0.14)`, radii 5–6px (was 24px)

3. **Shared components.** Rework these to the new system before touching screens:
   `src/components/Screen.tsx`, `StatusPill.tsx`, `TournamentCard.tsx`, `InitialsAvatar.tsx`
   (squares now, 4px radius — not circles), `navigation/PremiumTabBar.tsx` (solid orange bar with
   a black active pill, replacing the dark floating pill), and `auth/AuthInput.tsx` (5px radius,
   1.5px brand border on focus).

4. **State patterns** from `Patterns.dc.html` — build these as shared components:
   `<Skeleton>`, `<EmptyState>`, `<ErrorBlock>` (scoped, with retry), `<StaleBanner>`.

   This is the highest-value item on the canvas. Every screen currently does
   `if (loading) return <ActivityIndicator />`, which blanks the entire view — header, hero and
   nav — then snaps back. Replace that pattern everywhere as you migrate each screen.

## Phase 2 — screens

One screen per commit. Each artboard maps to a route:

### Existing routes to restyle
| Artboard | Route |
|---|---|
| `Main` | `src/app/(tabs)/home.tsx` |
| `TournamentDetail` | `src/app/tournament/[id].tsx` — **collapse 8 tabs to 4**: Overview / Draw / Teams / Info. Draw absorbs auction + bracket + teamLeague; Info absorbs awards; Players folds into Teams. |
| `Checkout` | `src/app/checkout/[tournamentId]/[categoryId].tsx` |
| `Auction` | `src/app/auction/[tournamentId]/[categoryId].tsx` |
| `Bracket` | `src/app/bracket/[tournamentId]/[categoryId].tsx` |
| `TeamLeague` | `src/app/team-league/[tournamentId]/[categoryId].tsx` |
| `CricketLive` | `src/app/live/[matchId].tsx` (cricket branch) |
| `Profile` | `src/app/(tabs)/profile.tsx` — group the flat menu into Playing / Account, drop the redundant "Find Tournaments" row |
| `MyRegistrations` | `src/app/profile/registrations.tsx` |

### Still on the OLD styling (Oswald/Montserrat) — DONE
All migrated. Oswald and Montserrat are gone from `_layout.tsx`, `tailwind.config.js` and
`package.json` — nothing references them any more, so do not reintroduce them.

### Onboarding & auth — canvas page 6
| Artboard | Route |
|---|---|
| `Welcome` | `src/app/(onboarding)/welcome.tsx` |
| `Story` | `src/app/(onboarding)/story.tsx` |
| `CardPreview` | `src/app/(onboarding)/card-preview.tsx` |
| `OnboardingAuth` | `src/app/(onboarding)/auth.tsx` |
| `WelcomeDone` | `src/app/(onboarding)/welcome-done.tsx` |
| `Register` | `src/app/(auth)/register.tsx` |
| `VerifyOtp` | `src/app/(auth)/verify-otp.tsx` |
| `Login` | `src/app/(auth)/login.tsx` |

Not drawn, on purpose: `set-password` is `ChangePassword` minus the current-password field;
`forgot-password` is `Login` with only the email field; `creating` and `entering` are transitions
— use `Skeleton` + `Ghost`, never a bare spinner.

The **player ID card** is designed twice — `CardPreview` (locked, no photo, number pending) and
`WelcomeDone` (photo, real number, brand border). It is the payoff of the whole flow; build it as
a shared component and don't water either state down.

### Account — canvas page 7
| Artboard | Route | Endpoint |
|---|---|---|
| `EditProfile` | `src/app/profile/edit.tsx` | `PATCH /player/auth/profile`, `PUT /player/auth/profile-image` |
| `ChangePassword` | `src/app/profile/change-password.tsx` (new) | `POST /player/auth/change-password` |
| `Payments` | `src/app/profile/invoices.tsx` | `GET /payments/my-payments`, `GET /payments/status/:orderId` |
| `TournamentHistory` | `src/app/profile/history.tsx` | `GET /player/auth/tournament-history` |

`settings.tsx`, `history.tsx` and `registrations.tsx` are already migrated — `TournamentHistory`
replaces the improvised version of history.

### New routes to create
| Artboard | Suggested route | Endpoint |
|---|---|---|
| `CategoryRegister` | `src/app/category/[categoryId].tsx` | `GET /categories/:id`, `GET /sports/:sport`, `POST /registrations/register` |
| `PaymentStatus` | `src/app/payment/[orderId].tsx` | `GET /payments/status/:orderId` |
| `BadmintonLive` | `src/app/live/[matchId].tsx` (badminton branch) | `GET /sports/badminton/match/:id` + socket |
| `Leaderboard` | `src/app/leaderboard/[categoryId].tsx` | `GET /matches/leaderboard/:categoryId` |
| `CricketBalls` | `src/app/cricket/[matchId]/balls.tsx` | `GET /sports/cricket/stats/matches/:matchId/innings/:n/balls` |
| `CricketLeaderboard` | `src/app/cricket/leaderboard/[categoryId].tsx` | `GET /sports/cricket/stats/categories/:categoryId/leaderboard?sort=` |
| `CricketMyStats` | `src/app/cricket/my-stats/[registrationId].tsx` | `GET /sports/cricket/stats/registrations/:registrationId/stats?tournamentId=` |
| `TeamDetail` | `src/app/team/[teamId].tsx` | `GET /teams/:id`, `GET /registrations/teams/:teamId/roster` |
| `PlayerProfile` | `src/app/player/[playerId].tsx` | `GET /player/auth/public/:playerId` |
| `Announcements` | `src/app/tournament/[id]/announcements.tsx` | `GET /tournaments/:tournamentId/announcements` |
| `Settings` | `src/app/profile/settings.tsx` | `POST`+`DELETE /player/auth/fcm-token`, `POST /contact` |

All of the above exist. `profile/change-password.tsx` was the last route missing and is now built;
`Settings` links out to it rather than embedding a password form.

Each page of the canvas carries a sticky note with the full endpoint list — read
`canvas.json`'s `annotations` array for the authoritative mapping.

## Deviations from the artboards

Recorded here so nobody "fixes" them back:

- **Radial gradients** (`Login`, `WelcomeDone`) are the nearest diagonal `expo-linear-gradient`.
  RN has no radial gradient.
- **`.grain`** and **`mix-blend-mode`** are dropped everywhere, as the table above says.
- **`WelcomeDone`'s orange bloom** (`box-shadow: 0 20px 46px rgba(249,115,22,0.16)`) is dropped;
  RN shadows take one colour, so only the black drop shadow survives.
- **`Register`** gains a Full name field the artboard does not draw: `OnboardingAuth` captures the
  name in the onboarding path, but register is also reachable straight from login, where nothing
  has been captured. One always-visible field beats a branch.
- **`OnboardingAuth`** replaced the old social-auth chooser (Google/Apple/Phone, all disabled and
  fake). It now captures photo, name and sport, as drawn.
- **`VerifyOtp`'s** resend is wired to the real `POST /player/auth/resend-otp`, which the doc did
  not mention but the server has.
- **`ChangePassword`** drops "last changed 4 months ago" — the profile payload has no password
  timestamp — and says what the change does instead.
- **`EditProfile`** replaces the free-text sport field with the two-chip picker; only badminton and
  cricket are feature-complete.
- **`Payments`** drops the header export button: there is no export endpoint. The "Receipt" chip is
  a "Details" chip pointing at `PaymentStatus`, since receipts are gateway-emailed. Failed rows get
  a red Retry chip into checkout.
- **`TournamentHistory`** ribbon is Played / Matches / W-L / Earned, not Played / Titles / Finals /
  W-L: the history endpoint carries no finishing position, so the per-row tag is the tournament
  status rather than "2nd" / "QF" / "Group".
- **The player number** on the ID card is derived from the tail of the player `_id`
  (`KRIA·<last 4>`). There is no player-number field server-side; add one and this becomes real.
- **`profile/_layout.tsx`** no longer shows the native header — every screen in that stack draws
  the canvas `.hdr` itself, so it was rendering two headers.

## Three real bugs the design surfaced

Fix these regardless of styling — they are defects, not design preferences.

1. **Badminton live scoring is unreachable.** `POST /sports/badminton/match/:id/live/start` and
   `/live/point` are fully implemented server-side, but `src/app/live/[matchId].tsx` returns
   `UnsupportedSport` for any sport that isn't cricket. `BadmintonLive.dc.html` is the missing
   screen.

2. **Three sport filters can never return results.** `SPORTS` in
   `src/lib/tournamentConstants.ts` offers `bowling`, `basketball` and `volleyball`; `SportConfig`
   only supports badminton, cricket, football, kabaddi, table_tennis, tennis. Only badminton and
   cricket are actually feature-complete (auction, live, leaderboards), so the design filters to
   those two. Trim the list to match.

3. **Cricket leaderboard shape.** It is per-category with seven sort keys
   (`?sort=runs|wickets|sr|economy|fours|sixes|highest`), and player stats are per-**registration**
   (scoped to one tournament), not per-player. Any earlier assumption of Batting/Bowling/Fielding
   tabs or a global player-stats endpoint is wrong.

## Constraints

- **Expo SDK 54**, pinned. Read https://docs.expo.dev/versions/v54.0.0/ before writing code; do
  not upgrade. See `mobile/AGENTS.md`.
- Backend is expected on **localhost**: `app.json`'s `extra` is intentionally empty so
  `src/lib/config.ts` resolves to the LAN dev host in dev and `api.kria.club` in production. Do
  not put `apiBaseUrl` back.
- **Player-only app.** No organizer screens. Any route requiring `isOrganizerLoggedIn` is out of
  scope.
- Existing architecture stays: Redux Toolkit slices in `src/store/slices/`, API calls in
  `src/api/`, the `@/` path alias, NativeWind for styling.
- **Tests exist** — `mobile/__tests__/` runs on jest-expo + React Native Testing Library
  (22 suites, 92 tests). Keep them green; add tests for new slices and api modules.
- Follow `mobile/CLAUDE.md` and the repo's Superpowers workflow (brainstorming before new work,
  TDD for features, systematic-debugging for bugs).
- Hit targets stay at 44px minimum even where an artboard draws a control smaller.
- Do not draw a fake iOS status bar or keyboard — the artboards deliberately leave that space
  empty because the real ones render on top.

## Suggested order

Phase 1 → `Main` → `TournamentDetail` → `CategoryRegister` → `Checkout` → `PaymentStatus`
→ `BadmintonLive` → the rest of badminton → cricket → the Me screens.

Commit at meaningful checkpoints, not after every file.
