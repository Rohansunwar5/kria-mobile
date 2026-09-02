# Implementing the v2 player-app design

The design is 22 artboards in `mobile/docs/design-canvas/*.dc.html`.

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

## Phase 1 — foundation (do this first, alone)

Nothing else should start until this lands.

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
| `Settings` | `src/app/profile/settings.tsx` | `POST /player/auth/change-password`, `POST`+`DELETE /player/auth/fcm-token`, `POST /contact` |

Each page of the canvas carries a sticky note with the full endpoint list — read
`canvas.json`'s `annotations` array for the authoritative mapping.

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
