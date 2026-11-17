# Profile photo crop + onboarding sports — design (2026-11-17)

Approved by the user after the clickable preview ("looks fine, go ahead and build it").

## Intent

Changing your profile photo should feel like Instagram's: pick a photo, frame your face in a
circle on its own screen, and see motion through every step instead of a silent upload behind a
16px spinner. Separately, onboarding's "What do you play most?" should show more than the two
tournament sports, so people who play something else can say so.

## Goals

- A crop screen: photo behind a circular window; drag to move, pinch to zoom; can't leave a gap
  in the circle (rubber-bands past the edge and springs back); faint thirds grid while moving.
- Motion: crop screen slides up; photo settles in (slight scale-down + fade); circle ring eases in.
  After "Use photo" the screen slides away and the avatar immediately shows the new framing,
  dimmed, with a progress ring; on success the ring closes and fades, the photo brightens and
  settles (small overshoot), light haptic. On failure the ring turns red, the old photo returns,
  and an alert gives the real reason.
- Onboarding lists 8 sports: Badminton, Cricket, Table Tennis (live) and Football, Tennis, Kabaddi,
  Volleyball, Basketball (pickable, marked "Not on Kria yet"; picking one shows "X isn't on Kria
  yet. You'll get a ranking once it's live.").

## Non-goals

No colour filters, rotate or camera capture (gallery only, as today). No deleting older photos
from R2. Events filters keep tournament sports only. No server change.

## Approaches

Photo: **own crop screen (picked)**, built from installed packages (gesture-handler 3.3, Reanimated
4.7, image-manipulator, svg, haptics); works in Expo Go and the APK. Rejected: expo-image-picker's
`allowsEditing` (OS screen: plain square on iOS, varies on Android — not the requested feel);
a crop library such as react-native-image-crop-picker (native code Expo Go can't load; new dependency).

Sports: **A, pickable (picked)** over B, visible but locked — B forces people who play an
unlisted sport to give a false answer. Home/Profile already handle an unranked main sport.

## Design

1. **Pick** (`components/profile/usePhotoUpload.ts`): permission → gallery → normalise with
   `manipulateAsync` (bakes EXIF orientation, longest side ≤ 2048, JPEG) so the crop screen and
   the crop share one pixel space → `{ uri, width, height }` handed over in `lib/photoDraft.ts`
   (not route params: expo-router decodes them twice, which breaks Expo Go's percent-escaped cache
   paths) → `router.push('/photo-crop')`. Taps are ignored while a photo is being prepared.
2. **Crop screen** (`app/photo-crop.tsx`, a root route so the slide-up and the swipe-back block
   apply from both Profile and Edit profile; `slide_from_bottom`, `gestureEnabled: false`, black;
   pan averages touches so an Android pinch doesn't drift; Cancel is disabled while cropping and
   leaving mid-crop uploads nothing): top bar Cancel ·
   "Frame your photo"; stage; hint "Drag to move · Pinch to zoom"; one primary "Use photo".
   Circle diameter = min(stage width, stage height) − 48. Pan + pinch run simultaneously
   (`usePanGesture`, `usePinchGesture`, `useSimultaneousGestures`) on Reanimated shared values;
   pinch zooms about the focal point; min zoom covers the circle, max 4× that; 0.35 resistance past
   limits; on release animate to the clamped state (`ease.standard`). Entry: image from 1.12× and
   transparent to rest (`ease.enter`, ~600ms); ring from 0.9× (~420ms, 120ms delay). Reduced
   motion: no scale-in, fades only.
3. **Use photo**: pure `cropRect()` maps the on-screen circle to image pixels → `manipulateAsync`
   crop + resize 512 → JPEG 0.8 → `router.back()` → upload continues from the store; success gives a
   light haptic, failure an `Alert` with the reason (the extractError change of 2026-11-17).
4. **Upload state**: `auth.photoUpload: { uri, progress } | null`. `uploadPlayerProfileImage`
   sets it on pending, reports axios `onUploadProgress`, prefetches the new URL before fulfilling
   (no blank flash when the avatar switches from the local file to the R2 URL), clears it on
   fulfilled/rejected. `busy` comes from this state, so both screens agree.
5. **Avatar** (`components/profile/PhotoAvatar.tsx`, shared by Profile's Identity at 128 and Edit
   profile at 80): shows the local framing under a dark overlay with an SVG ring whose arc is
   bytes-sent × 0.8, easing to 0.95 while the server stores it, then 1. Then: ring fades and
   scales 1.1, overlay fades, face settles 0.95 → 1.035 → 1 (~460ms); camera badge scales to 0
   during upload and back after.
6. **Sports**: `ONBOARDING_SPORTS` (8) in `lib/sports.ts`; "live" = `RANKED_SPORTS`. Labels and
   icons for volleyball/basketball (`SPORT_LABELS`, `SPORT_ICONS`, `scripts/icons.mjs`).
   Tennis and Badminton keep sharing the racket icon (user saw this in the preview).
7. **Root**: wrap the app in `GestureHandlerRootView` — gesture-handler is installed but has
   never been mounted, and gestures don't fire without it.

## Checks

Jest: `cropRect` / clamp math; onboarding renders 8 tiles and the not-live note; the upload thunk
sets and clears `photoUpload`; existing Edit/Own profile and upload tests stay green. Device check
in Expo Go (iOS) — gestures and motion can't be judged in jest.

## Left to the builder

Exact durations within the theme's motion tokens, component splits, and test shapes.
