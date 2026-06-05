# Kria Sports — Story-Driven Onboarding Redesign

**Date:** 2026-06-05
**App:** `mobile/` (Expo SDK 54, React Native 0.81, expo-router, NativeWind v4, Redux Toolkit, react-native-reanimated v4)
**Supersedes (partially):** `2026-06-05-onboarding-experience-design.md` — replaces the Sport / Level / Motivation screens only.

## Problem

The original onboarding asked three back-to-back selection questions — **Sport**, **Level**, **Motivation** — each a list of tap-and-continue cards. It reads like a form, not an experience. None of these three felt motivating; selecting a skill level and ticking motivation chips is the boring part of the funnel.

## Goal

Replace the three question screens with **storytelling**: cinematic full-bleed beats that sell the *identity transformation* of becoming a recognized Kria player (the app tagline: "Play. Compete. Get Recognized."), followed by a single compact setup step. Inspire first, collect once.

Reference feel: **Nike Run Club** intro sequence + **Strava** onboarding. The UI/UX design intelligence pass classified this as an **Immersive/Interactive** pattern on a **Dark Mode (OLED)** canvas with **condensed athletic typography** (the app's existing `Oswald` display font already matches) and flagged a **Skip affordance** as essential for immersive flows.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Question screens | **Replaced by story** | Sport/Level/Motivation as questions are removed. |
| Narrative angle | **"Become a recognized player"** | Identity transformation arc; matches the tagline and pays off in the player card. |
| Animation treatment | **Full-bleed photo + parallax text** | Direct continuation of the existing `welcome.tsx` visual language (full-bleed Unsplash photo, text over bottom gradient). Truest Nike Run Club feel; keeps the whole onboarding one cohesive cinematic sequence. |
| Structure | **One paged story screen + one setup screen** | `story.tsx` (3 in-screen paged beats) + `setup.tsx`. Net **−1 route** vs. the three it replaces. |
| Data collected | **Sport only** | Level and motivation are **dropped entirely** (they were local-only, never persisted to backend). Sport defaults to badminton (the only active sport) and is confirmed in setup. |
| Imagery | **Remote Unsplash badminton URLs** | Consistent with current `welcome.tsx`; one-line swap to local assets later. No bundling now. |
| Palette / fonts | **Unchanged app brand** — `ink #111111` bg, `brand #F97316` accent, `Oswald` display + `Montserrat` body | Already loaded; stays on-brand. |

## Flow

```
BEFORE: welcome → sport → profile → level → motivation → card-preview → auth → creating → welcome-done   (9 routes)
AFTER:  welcome → story → setup → profile → card-preview → auth → creating → welcome-done                (8 routes)
```

`story` and `setup` replace `sport` + `level` + `motivation` (3 → 2 routes). `profile`, `card-preview`, `auth`, `creating`, `welcome-done`, `welcome` are unchanged except where noted.

## Architecture

### New screen — `story.tsx`

A full-screen **horizontal pager** (3 pages) inside one route. Each page is a full-bleed `ImageBackground` sports photo with a dark bottom gradient scrim (same treatment as `welcome.tsx`), an animated headline + subtext, and shared chrome (progress segments + Skip + CTA).

**Beats:**

| # | Headline (Oswald, ~5xl, uppercase) | Subtext (Montserrat) |
|---|---|---|
| 1 | You're not just playing anymore. | Step onto the court as a real competitor. |
| 2 | Compete in real tournaments. | Live drafts, auctions, and brackets — the way the pros do it. |
| 3 | Get drafted. Get ranked. Get recognized. | Build a record that follows your name. |

**Animations (react-native-reanimated v4 + gesture-handler, all installed):**
- **Ken Burns**: each photo slow-zooms `scale 1.0 → 1.08` over ~6s; subtle parallax X-shift driven by the pager's scroll offset (`gesture-feedback` — motion tracks the finger).
- **Staggered text entry** on page settle: headline `opacity 0→1` + `translateY 24→0` (~300ms `ease-out`), subtext follows ~80ms later (`stagger-sequence`).
- **Progress segments**: 3 thin bars pinned top, safe-area aware, filling brand-orange as pages advance (Instagram-story style).
- **Directional paged slide**, swipe-driven (the pager owns horizontal gesture; no conflict with vertical scroll).
- **Skip** top-right → jumps straight to `setup` (`escape-routes`, and the immersive-pattern skip caveat).
- **CTA** appears on the last beat: "Let's set you up" → `setup`.

### New screen — `setup.tsx`

The single collection step, framed as confirmation, not interrogation. Headline: "Lock in your game."

- **Sport** row: horizontal chips. Badminton active and **default-selected** (zero friction); Cricket/Football/Table Tennis/Tennis/Kabaddi rendered with a "Soon" tag, non-tappable. Active chip spring-fills on mount/selection.
- No level, no motivation.
- **Continue** → `profile` (unchanged).

### New component — `StoryBeat`

`src/components/onboarding/StoryBeat.tsx`. Props `{ source, headline, subtext, scrollOffset, index, active }`. Renders the `ImageBackground` + gradient + animated text for one page; reused for all three. Parallax/zoom derive from `scrollOffset` + `index`; text-entry triggers on `active`.

### State — `onboardingSlice` changes

Remove the now-unused fields and actions:

- **Remove** from `OnboardingState`: `level`, `motivations`.
- **Remove** actions: `setLevel`, `toggleMotivation`.
- **Remove** type export: `SkillLevel`.
- **Keep**: `sport`, `fullName`, `age`, `gender`, `photoUri`.

### Retired files

- `src/app/(onboarding)/sport.tsx` (replaced by `setup.tsx`'s sport row)
- `src/app/(onboarding)/level.tsx`
- `src/app/(onboarding)/motivation.tsx`
- `src/components/onboarding/MotivationChip.tsx`
- `src/lib/motivations.ts`
- `StepDots` usage on these screens (story has its own progress bar). `StepDots.tsx` may remain if still referenced by `card-preview`; its `total`/`current` props are updated to the new screen count (see below).

### Touched consumers

- **`card-preview.tsx`**: stop reading `level`; pass a fixed/derived value (or omit) to `PlayerIDCard`. Update `StepDots total/current` to the new flow length.
- **`PlayerIDCard.tsx`**: `level` prop becomes optional; renders a neutral default when absent (preview card no longer depends on a collected level).
- **`creating.tsx`**: the checklist step "Skill Rating Set" is reworded (no skill rating collected) — e.g. "Player Profile Ready". Persist logic unchanged (it never sent level).
- **Tests**: `onboardingSlice.test.ts` drops the level/motivation cases; `PlayerIDCard.test.tsx` adjusted for the optional `level` prop.

### Entry / routing

`(onboarding)/_layout.tsx` and `AuthGate` are unaffected — `story` and `setup` are auto-registered by file-based routing under the existing `(onboarding)` group; the `pendingOnboarding`/`onboardingComplete` gating is unchanged.

## Auth screens — Login & Register (added scope)

The existing `(auth)/login.tsx` and `(auth)/register.tsx` are visually plainer than the new onboarding: a small `Kria` wordmark, flat `#1a1a1a` inputs with `#333` borders, a basic orange button, no imagery, no animation. They must be redesigned to match the same premium dark/cinematic language so the whole entry experience is cohesive. **Auth backend logic and Redux flow are unchanged** — only presentation.

### Shared auth visual language

- **Top hero band**: a compact full-bleed sports photo (same Unsplash source family) with a gradient fading into `ink`, anchoring an Oswald headline — so login/register feel like a continuation of the story, not a separate plain form. Screen scrolls under a `KeyboardAvoidingView`.
- **Brand mark**: Oswald `Kria` wordmark in brand orange over the hero.
- **Inputs**: redesigned `AuthInput` component — `ink`-tone fill, subtle `white/10` border, brand-orange focus ring (animated, 150–300ms), floating/visible label (not placeholder-only, per `input-labels`), 16px text, ≥44pt height. Password field gets a show/hide toggle (`password-toggle`); email uses `keyboardType="email-address"`, phone uses `phone-pad` (`input-type-keyboard`).
- **Primary CTA**: reuse the onboarding `OnboardingButton` (filled orange, 24px radius, large tap target, spinner-on-loading) instead of the current ad-hoc `Pressable`.
- **Secondary links** ("Forgot password?", "Create account", mode toggle): brand-orange, clearly tappable, ≥44pt hit area.
- **Errors**: shown inline below the relevant field (`error-placement`), `aria-live`/`role="alert"` semantics, danger color meeting 4.5:1.
- **Motion**: headline + form fields stagger-fade in on mount (~300ms, same `motion.ts` tokens). Respect reduced-motion (collapse to instant). Forward nav (login→register, register→verify-otp) animates consistently with the onboarding direction.

### `login.tsx`

Keep the dual password/OTP mode and all dispatch calls (`loginUser`, `requestLoginOtp`, `verifyLoginOtp`, `clearError`). Re-skin into: hero band → headline ("Welcome back.") → `AuthInput`s → `OnboardingButton` → mode toggle + forgot/create links. Inline error under the field.

### `register.tsx`

Keep `registerUser` flow and the `registrationStep === 2 → verify-otp` redirect. Re-skin: hero band → headline ("Join the league.") → first/last/email/phone `AuthInput`s → `OnboardingButton` → "Already have an account? Log in" link. Inline error.

### Consistency note

`verify-otp.tsx`, `set-password.tsx`, `forgot-password.tsx` are **out of scope for this pass** (not requested), but the new `AuthInput` + `OnboardingButton` are built to drop into them later in one pass. No behavior change to any auth screen.

### New component — `AuthInput`

`src/components/onboarding/AuthInput.tsx` (or `src/components/auth/`). Props mirror `TextInput` plus `{ label, error?, secureToggle? }`. Animated focus border via reanimated; visible label; optional password toggle. Reused by login and register now, the rest later.

## Motion system

A small shared module (e.g. `src/lib/motion.ts`) centralizes the enter duration (~300ms), exit duration (~200ms, shorter per `exit-faster-than-enter`), and spring config, so every beat shares one rhythm (`motion-consistency`).

## Accessibility & edge cases

- **`prefers-reduced-motion`** (RN `AccessibilityInfo.isReduceMotionEnabled`): disable Ken Burns/parallax, collapse text entry to a simple fade. Content readable immediately.
- **Skip** always reachable on the story screen.
- **Contrast**: bottom gradient scrim guarantees ≥4.5:1 for headline/subtext over any photo.
- **Touch targets**: Skip, CTA, and sport chips ≥44pt; chips spaced ≥8px.
- **Safe areas**: progress segments respect top inset; CTA respects bottom inset.
- **Image load failure**: `ImageBackground` falls back to `ink` background (already the pattern in `welcome.tsx`); text + gradient remain legible.
- **Returning user** with `onboardingComplete` still skips the whole funnel (unchanged).

## Testing

Existing Jest + `@testing-library/react-native`:
- Update `onboardingSlice.test.ts` — remove level/motivation cases; keep sport/profile/reset.
- Update `PlayerIDCard.test.tsx` for optional `level`.
- No animation / pager / image tests (out of scope, no framework for it).

## Out of scope

- Backend schema changes (none needed; sport already supported).
- Bundled local photography (remote URLs for now).
- Changes to `welcome`, `profile`, `welcome-done` behavior.
- Auth **behavior/logic** changes — login & register are re-skinned only; Redux/auth flow untouched.
- Redesign of `verify-otp`, `set-password`, `forgot-password` (deferred; new components built to drop in later).
- Reintroducing level/motivation anywhere (explicitly dropped).
