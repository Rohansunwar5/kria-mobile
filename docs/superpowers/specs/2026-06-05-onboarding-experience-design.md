# Kria Sports — Premium Mobile Onboarding Experience

**Date:** 2026-06-05
**App:** `mobile/` (Expo SDK 54, React Native 0.81, expo-router, NativeWind v4, Redux Toolkit)

## Goal

A 9-screen onboarding flow that makes a new player feel motivated, competitive, and proud — focused on the *identity of becoming a player*, not a feature tour. Visual tone blends Nike Run Club / Strava / Apple Fitness / Airbnb / Linear: premium, minimal, dark-mode-first, large typography, generous whitespace, 24px rounded cards, bold CTAs.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Fidelity | **Hybrid** | Real, navigable screens wired into existing Redux/expo-router app. Auth uses the real email+OTP backend. Skill level + motivations collected and shown on the player card as **local onboarding state** (not persisted to backend, which has no such fields). |
| Palette | **App brand** — `ink #111111` bg, `brand #F97316` orange accent | Keeps onboarding on-brand with the rest of the live app. The brief's `#0B0B0B`/`#E63946` red is *not* used; deeper blacks (`#0d0d0d`) appear only as card insets. |
| Welcome hero | **Full-bleed photo, text over bottom gradient** | Cleanest, most premium; matches brief's "cinematic photography." |
| Player card | **Tall vertical ID card (portrait)** | Screenshots beautifully — meets the "shareable and aspirational" goal. |
| Fonts | `Oswald_500Medium` (display) + `Montserrat_400Regular` (body) | Already loaded in `_layout.tsx`. |

## Architecture

### Routing

New route group `src/app/(onboarding)/` beside `(auth)` and `(tabs)`:

```
(onboarding)/
  _layout.tsx        Stack, headerShown:false, back gesture enabled
  welcome.tsx        Screen 1
  sport.tsx          Screen 2
  profile.tsx        Screen 3
  level.tsx          Screen 4
  motivation.tsx     Screen 5
  card-preview.tsx   Screen 6
  auth.tsx           Screen 7  → hands to real (auth) email/OTP
  creating.tsx       Screen 8  animated progress
  welcome-done.tsx   Screen 9
```

### State — new `onboardingSlice`

Holds the in-progress identity, local only:

```ts
{
  sport: string | null,        // 'badminton'
  fullName: string,
  age: number | null,
  gender: string | null,
  photoUri: string | null,     // local image-picker uri, not yet uploaded
  level: 'beginner' | 'intermediate' | 'advanced' | 'competitive' | null,
  motivations: string[],       // multi-select keys
}
```

Reducers: `setSport`, `setProfileFields`, `setLevel`, `toggleMotivation`, `resetOnboarding`. Registered in `src/store/index.ts`.

### Entry point change

`src/app/index.tsx` is currently an empty placeholder; `AuthGate` in `src/app/_layout.tsx` sends logged-out users straight to `/(auth)/login`. Change:

- Add `(onboarding)` to a non-`(auth)` public root set in `AuthGate`.
- A new secure-store flag `onboardingComplete` (via `expo-secure-store`, alongside `src/lib/storage.ts`) gates the flow.
- Logged-out user **without** `onboardingComplete` → redirect to `/(onboarding)/welcome`.
- Logged-out user **with** `onboardingComplete` → existing `/(auth)/login`.
- Logged-in user → existing `/(tabs)/home`.

### Auth handoff (Screen 7)

No fake working social auth. Layout matches the brief:

- **Primary: "Continue with Email"** → routes into existing `(auth)/register` → `verify-otp` → `set-password`, pre-filling name/email from onboarding state.
- **Google / Apple / Phone**: rendered per brief layout but **disabled with a "Coming soon" affordance** (honest about capability).
- After auth succeeds: best-effort `PATCH /player/auth/profile` with backend-supported fields only (`gender`, `dateOfBirth` derived from `age`, `sport`). Then set `onboardingComplete` and route to Screen 8.

## Components (`src/components/onboarding/`)

- **`OnboardingButton`** — primary (filled orange) / secondary (outline). 24px radius, large tap target.
- **`SelectableCard`** — sport & level cards. Tap animates scale + border via `react-native-reanimated` (installed); selected state elevates with orange border + subtle glow.
- **`MotivationChip`** — multi-select pill; spring + fill on toggle.
- **`PlayerIDCard`** — tall vertical card (Option B). Props `{ name, sport, level, photoUri, locked }`. `locked=true` → preview state with locked Titles/Awards/Rankings rows (Screen 6). `locked` unranked variant shows "Unranked · 0 Titles · 0 Awards" (Screen 9).
- **`ProgressStep`** — checklist row animating spinner → orange check (Screen 8).
- **`StepDots`** — whisper-quiet small step indicator on steps 2–6. (Brief bans a Welcome *carousel*; an in-funnel step indicator is standard and aids orientation.)

## Screen behaviors

1. **Welcome** — full-bleed `ImageBackground` (badminton), bottom-anchored headline "Play. Compete. Get Recognized.", subtext, "Get Started" (primary) + "Sign In" (secondary → `/(auth)/login`). No carousel, no swipe dots.
2. **Sport** — `SelectableCard` grid. Badminton active; Cricket/Football/Table Tennis/Tennis/Kabaddi show "Coming Soon" and are non-selectable. Continue enabled once a sport is selected.
3. **Profile** — large circular avatar upload reusing `expo-image-picker` (writes to onboarding state, not uploaded yet). Full Name, Age (number), Gender segmented control (reuse `GenderSegment` styling).
4. **Level** — 4 single-select `SelectableCard`s with short descriptions.
5. **Motivation** — 6 multi-select `MotivationChip`s (Winning tournaments, Getting drafted, Finding teammates, Tracking performance, Climbing rankings, Earning awards). ≥1 required to continue.
6. **Card preview** — `PlayerIDCard locked` + "Let's change that." + Continue.
7. **Auth** — minimal; per handoff above.
8. **Creating** — 4 `ProgressStep`s animating in sequence (~2.5s): Profile Created → Skill Rating Set → Tournament Feed Ready → Rankings Enabled, then auto-advance.
9. **Welcome to Kria** — "Your journey starts today.", subtext, unranked `PlayerIDCard`, "Every champion starts unranked.", "Explore Tournaments" → `/(tabs)/home`.

**Photography:** remote Unsplash badminton URLs via `ImageBackground` (no bundled assets; production-realistic). `PlayerIDCard`/`ImageBackground` take a `source` prop so local images are a one-line swap later.

## Error handling & edge cases

- **Photo pick** cancelled / permission-denied → fall back to `InitialsAvatar`. Avatar is optional; continue without one.
- **Auth** reuses existing slice error state already rendered in login/register. No new error paths.
- **Profile PATCH** after signup is best-effort: on failure, log and still complete onboarding (data also lives in onboarding state / re-saveable from profile tab). No dead-end on a network hiccup.
- **Back navigation** allowed throughout; onboarding state persists in Redux so going back never loses entries.
- **`creating.tsx`** auto-advances on a timer cleared on unmount (handles app backgrounding).
- **Returning user** with `onboardingComplete` skips the funnel.
- **"Sign In"** on Welcome bypasses the funnel to login.
- **Validation:** name non-empty, age 5–99, before Continue enables on Profile.

## Testing

Existing Jest + `@testing-library/react-native` setup. Add focused tests:

- `onboardingSlice` reducers (set sport/level, toggle motivation, reset).
- `PlayerIDCard` locked-vs-unranked rendering.

No animation / image-picker tests (out of scope). No new framework.

## Out of scope

- Backend schema changes for skill level / motivations.
- Working Google/Apple/Phone social auth.
- Bundled local photography (remote URLs for now).
