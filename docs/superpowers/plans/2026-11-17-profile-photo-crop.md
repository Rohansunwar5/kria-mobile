# Profile Photo Crop + Onboarding Sports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Instagram-style crop screen and in-place upload motion for the profile photo, and an 8-sport onboarding picker.

**Architecture:** Pure crop math in `lib/photoCrop.ts` drives a new `/profile/crop` route built on gesture-handler 3 hooks + Reanimated. Upload progress lives in the auth slice (`photoUpload`), so a shared `PhotoAvatar` on Profile and Edit profile animates the ring wherever the user lands. Sports are a new list in `lib/sports.ts` rendered by the existing onboarding screen.

**Tech Stack:** Expo SDK 58, React Native 0.88, react-native-gesture-handler 3.3 (hook API), Reanimated 4.7, react-native-svg, expo-image-manipulator, expo-image-picker, expo-haptics, Redux Toolkit, Jest.

**Spec:** `mobile/docs/superpowers/specs/2026-11-17-profile-photo-crop-design.md`

## Global Constraints

- No new dependencies. No server change.
- Never commit: the user commits. Leave changes in the working tree.
- Styling: `StyleSheet` on `src/constants/theme.ts` tokens (`colors`, `font`, `radius`, `motion`, `ease`); no colour literals outside theme (`test-utils/colourLiterals.ts` enforces this).
- Copy, verbatim: "Frame your photo", "Cancel", "Drag to move · Pinch to zoom", "Use photo", "Not on Kria yet", "`<Sport>` isn't on Kria yet. You'll get a ranking once it's live.", alert title "Upload failed", fallback body "Could not update your photo. Try again."
- Uploaded image: square crop, resized to 512×512, JPEG compress 0.8, name `avatar.jpg`, type `image/jpeg`.
- Normalised pick: longest side ≤ 2048, JPEG compress 0.9.
- Zoom: min = cover the circle, max = 4 × min; resistance past limits 0.35. Circle diameter = min(stage width, stage height) − 48.
- Reduced motion (`useReducedMotion()`): no scale-in or settle overshoot; fades only.
- Gates (run from `D:\kria\mobile`): `npx tsc --noEmit` clean; `npx jest` all green. Adding a route needs `.expo/types/router.d.ts` regenerated (start `npx expo start` briefly, stop only the PID you started) before tsc passes.

## Review Focus

- Panoramas and very tall photos (e.g. 4000×800): cover scale must use the short side so the circle is always filled — pinned in Task 1 (`coverScale` wide image test).
- Crop rect rounding at the image edge: `originX + width` must never exceed the image width, or the manipulator throws — pinned in Task 1 (edge-clamped test).
- Small photos (under 512px or under the circle) still upscale to fill the circle; crop size can be smaller than 512 and is resized up — pinned in Task 1 (`cropRect` small image test).
- Upload fails after the crop screen is gone: the avatar must return to the previous photo and the alert must show the server's reason — pinned in Task 2 (rejected clears `photoUpload`, keeps `user.profileImage`) and Task 3 (failure test).
- Tapping the avatar again mid-upload must not start a second upload — pinned in Task 3 (disabled while `photoUpload` is set).

---

### Task 1: Crop math

**Files:**
- Create: `src/lib/photoCrop.ts`
- Test: `__tests__/photoCrop.test.ts`

**Interfaces:**
- Produces (all `'worklet'` functions, no imports):
  - `type Size = { width: number; height: number }`, `type View = { s: number; x: number; y: number }` (`s` scale of image px → screen pt; `x`,`y` offset of the image centre from the circle centre, in pt)
  - `coverScale(img: Size, d: number): number`
  - `clampView(v: View, img: Size, d: number): View`
  - `zoomAbout(v: View, fx: number, fy: number, ratio: number): View` (focal point relative to circle centre; no clamping)
  - `cropRect(v: View, img: Size, d: number): { originX: number; originY: number; width: number; height: number }` (integer px, inside the image)
  - `normalizeActions(img: Size): { resize: { width: number } | { height: number } }[]` (empty when longest side ≤ 2048)

- [ ] **Step 1: Write the failing tests** in `__tests__/photoCrop.test.ts`:

```ts
import { clampView, coverScale, cropRect, normalizeActions, zoomAbout } from '../src/lib/photoCrop';
const img = { width: 900, height: 1200 };

it('cover scale fills the circle on the short side', () => {
  expect(coverScale(img, 300)).toBeCloseTo(1 / 3);
  expect(coverScale({ width: 4000, height: 800 }, 300)).toBeCloseTo(300 / 800);
});
it('clamps zoom to [cover, 4x cover] and pan so no gap shows', () => {
  expect(clampView({ s: 0.1, x: 0, y: 0 }, img, 300).s).toBeCloseTo(1 / 3);
  expect(clampView({ s: 10, x: 0, y: 0 }, img, 300).s).toBeCloseTo(4 / 3);
  expect(clampView({ s: 1 / 3, x: 40, y: 80 }, img, 300)).toEqual({ s: 1 / 3, x: 0, y: 50 });
});
it('zooms about the focal point', () => {
  expect(zoomAbout({ s: 1, x: 10, y: -4 }, 0, 0, 2)).toEqual({ s: 2, x: 20, y: -8 });
  expect(zoomAbout({ s: 1, x: 0, y: 0 }, 50, 0, 2)).toEqual({ s: 2, x: -50, y: 0 });
});
it('maps the circle to image pixels', () => {
  expect(cropRect({ s: 1 / 3, x: 0, y: 0 }, img, 300)).toEqual({ originX: 0, originY: 150, width: 900, height: 900 });
  expect(cropRect({ s: 1 / 3, x: 0, y: 50 }, img, 300)).toEqual({ originX: 0, originY: 0, width: 900, height: 900 });
  expect(cropRect({ s: 2 / 3, x: 0, y: 0 }, img, 300)).toEqual({ originX: 225, originY: 375, width: 450, height: 450 });
});
it('keeps the rect inside the image after rounding', () => {
  const r = cropRect({ s: 0.3333, x: 0.4, y: 0 }, { width: 901, height: 1201 }, 300);
  expect(r.originX).toBeGreaterThanOrEqual(0);
  expect(r.originX + r.width).toBeLessThanOrEqual(901);
  expect(r.originY + r.height).toBeLessThanOrEqual(1201);
});
it('handles a photo smaller than the circle', () => {
  const small = { width: 200, height: 300 };
  expect(cropRect({ s: coverScale(small, 300), x: 0, y: 0 }, small, 300)).toEqual({ originX: 0, originY: 50, width: 200, height: 200 });
});
it('only downsizes photos over 2048 on the long side', () => {
  expect(normalizeActions({ width: 1000, height: 2000 })).toEqual([]);
  expect(normalizeActions({ width: 4032, height: 3024 })).toEqual([{ resize: { width: 2048 } }]);
  expect(normalizeActions({ width: 3024, height: 4032 })).toEqual([{ resize: { height: 2048 } }]);
});
```

- [ ] **Step 2: Run** `npx jest __tests__/photoCrop.test.ts` — Expected: FAIL, cannot find module.
- [ ] **Step 3: Implement `src/lib/photoCrop.ts`.** `cropRect`: size = `min(d / s, width, height)`; origin = `(W·s/2 − x − d/2)/s` (same for y); round, then clamp origin to `[0, W − size]`. Every function starts with `'worklet';`.
- [ ] **Step 4: Run** `npx jest __tests__/photoCrop.test.ts` — Expected: PASS (7 tests).

---

### Task 2: Upload state in the auth slice

**Files:**
- Modify: `src/store/slices/authSlice.ts` (state type, initial state, `uploadPlayerProfileImage` ~line 253, reducers ~line 346)
- Test: `__tests__/uploadProfileImage.test.ts`

**Interfaces:**
- Produces: `state.auth.photoUpload: { uri: string; progress: number } | null` (initial `null`); action creator `photoUploadProgress(p: number)` exported from `authSlice.actions` and as a named export; `uploadPlayerProfileImage` signature unchanged.

- [ ] **Step 1: Write the failing tests** (add to the existing describe):

```ts
it('tracks the local photo while uploading and clears it after', async () => {
  let seen: unknown;
  mock.onPut('/player/auth/profile-image').reply(() => { seen = store.getState().auth.photoUpload; return [200, { data: { _id: 'u1', profileImage: 'http://img/y.jpg' } }]; });
  const store = makeStore();
  await store.dispatch(uploadPlayerProfileImage({ uri: 'file://a.jpg', name: 'avatar.jpg', type: 'image/jpeg' }) as any);
  expect(seen).toEqual({ uri: 'file://a.jpg', progress: 0 });
  expect(store.getState().auth.photoUpload).toBeNull();
});
it('keeps the old photo and clears the upload when it fails', async () => {
  mock.onPut('/player/auth/profile-image').networkError();
  const store = makeStore(); // seed user.profileImage = 'http://img/old.jpg' in makeStore for this test
  await store.dispatch(uploadPlayerProfileImage({ uri: 'file://a.jpg', name: 'avatar.jpg', type: 'image/jpeg' }) as any);
  expect(store.getState().auth.photoUpload).toBeNull();
  expect(store.getState().auth.user?.profileImage).toBe('http://img/old.jpg');
});
it('records progress, capped at 1', () => {
  const s1 = reducer({ ...reducer(undefined, { type: '@@x' }), photoUpload: { uri: 'f', progress: 0 } } as any, photoUploadProgress(0.4));
  expect(s1.photoUpload).toEqual({ uri: 'f', progress: 0.4 });
  expect(reducer(s1, photoUploadProgress(1.7)).photoUpload?.progress).toBe(1);
  expect(reducer(reducer(undefined, { type: '@@x' }), photoUploadProgress(0.5)).photoUpload).toBeNull();
});
```

- [ ] **Step 2: Run** `npx jest __tests__/uploadProfileImage.test.ts` — Expected: FAIL (`photoUploadProgress` undefined).
- [ ] **Step 3: Implement.** Pending sets `photoUpload = { uri: action.meta.arg.uri, progress: 0 }`; fulfilled and rejected set it `null`. In the thunk pass `onUploadProgress: (e) => { if (e.total) dispatch(photoUploadProgress(e.loaded / e.total)); }` to `API.put`, and after a successful response `await Promise.resolve(Image.prefetch(url)).catch(() => undefined)` when the returned `profileImage` is a string (`Image` from `react-native`; jest's mock returns undefined, hence the `Promise.resolve`).
- [ ] **Step 4: Run** `npx jest __tests__/uploadProfileImage.test.ts` — Expected: PASS (4 tests).

---

### Task 3: PhotoAvatar with ring and settle

**Files:**
- Create: `src/components/profile/PhotoAvatar.tsx`
- Modify: `src/components/profile/ProfileSections.tsx` (Identity's own-photo branch, lines ~67-72; drop `busy` from the `photo` prop type), `src/app/profile/edit.tsx` (photo `Pressable`, lines ~87-91; delete now-unused `s.photo`/`s.badge`/`Arc` imports), `src/components/profile/usePhotoUpload.ts` (return `{ pick }` only)
- Test: `__tests__/PhotoAvatar.test.tsx`

**Interfaces:**
- Consumes: `state.auth.photoUpload` (Task 2).
- Produces: `PhotoAvatar({ size, image, initials, onPress }: { size: number; image?: string; initials: string; onPress: () => void })`. Badge: size ≥ 100 → 30px / icon 18, else 28px / icon 16 (today's values). Ring: SVG circle 10pt outside the face (`size + 20` box), stroke 3, track `colors.surface3`, arc `colors.accent`, `colors.loss` after a failure; dark overlay `colors.scrim` while uploading. Accessibility label: "Add a profile photo" / "Change profile photo"; "Uploading photo" while uploading (disabled).

- [ ] **Step 1: Write the failing tests** — render inside a `Provider` with `authReducer` preloaded:
  - `it('shows initials and is tappable when idle')`: no `photoUpload`, no image → text "AR" present; press `getByLabelText('Add a profile photo')` calls `onPress`.
  - `it('shows the local framing and blocks taps while uploading')`: `photoUpload: { uri: 'file://new.jpg', progress: 0.5 }`, `image: 'http://img/old.jpg'` → an `Image` with `source.uri === 'file://new.jpg'`; `getByLabelText('Uploading photo')` is disabled; pressing it does not call `onPress`.
  - `it('goes back to the old photo when the upload fails')`: start uploading as above, then dispatch the thunk's `rejected` action with the same `image` prop → the rendered `Image` source is `'http://img/old.jpg'`.
- [ ] **Step 2: Run** `npx jest __tests__/PhotoAvatar.test.tsx` — Expected: FAIL, cannot find module.
- [ ] **Step 3: Implement `PhotoAvatar`.** Shared values: `arc` (0–1), `ringOpacity`, `ringScale`, `overlay`, `face` scale. While uploading: `arc` → `progress × 0.8` (`motion.base`); once progress is 1 → 0.95 over 1500ms (`ease.standard`). When `photoUpload` goes from set to `null`: if `image` changed it's a success → `arc` 1, ring fades and scales to 1.1 (`motion.slow`), overlay → 0, face `withSequence` 0.95 → 1.035 → 1 (~460ms total); otherwise a failure → arc colour `colors.loss`, ring fades (`motion.slow`). Ring arc via `Animated.createAnimatedComponent(Circle)` + `useAnimatedProps` (`strokeDashoffset`), rotated −90°. Reduced motion: skip the face sequence and ring scale.
- [ ] **Step 4: Swap it in.** Identity: `photo ? <PhotoAvatar size={128} image={image} initials={initials(name)} onPress={photo.pick} /> : <View style={s.photo}>{face}</View>`. Edit profile: `<PhotoAvatar size={80} image={user?.profileImage} initials={initials(form.firstName, form.lastName)} onPress={photo.pick} />`. `usePhotoUpload` stops tracking `busy`.
- [ ] **Step 5: Run** `npx jest __tests__/PhotoAvatar.test.tsx __tests__/OwnProfileScreen.test.tsx __tests__/EditProfileScreen.test.tsx` and `npx tsc --noEmit` — Expected: PASS, tsc clean.

---

### Task 4: Crop screen, pick flow and gesture root

**Files:**
- Create: `src/app/profile/crop.tsx`
- Modify: `src/components/profile/usePhotoUpload.ts` (pick → normalise → push), `src/app/profile/_layout.tsx` (`<Stack.Screen name="crop" options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: colors.shadow } }} />`), `src/app/_layout.tsx` (outer `View` → `GestureHandlerRootView`, same props), `jest.setup.ts` (`require('react-native-gesture-handler/jestSetup')`)
- Test: `__tests__/PhotoCropScreen.test.tsx`

**Interfaces:**
- Consumes: Task 1 functions; `uploadPlayerProfileImage` (Task 2).
- Produces: route `/profile/crop` with string params `uri`, `width`, `height`.

- [ ] **Step 1: Write the failing test** `it('crops the centred cover view to 512 and uploads it')`: mock `expo-router` (`useLocalSearchParams` → `{ uri: 'file://n.jpg', width: '900', height: '1200' }`, `useRouter` → `{ back: mockBack }`), `expo-image-manipulator` (`manipulateAsync` resolves `{ uri: 'file://c.jpg', width: 512, height: 512 }`), and `@/store/slices/authSlice`'s `uploadPlayerProfileImage` (returns a thunk resolving `{}`). Render, fire `layout` on `getByTestId('crop-stage')` with `{ width: 348, height: 600 }` (d = 300), press "Use photo". Expect `manipulateAsync` called with `'file://n.jpg'`, `[{ crop: { originX: 0, originY: 150, width: 900, height: 900 } }, { resize: { width: 512, height: 512 } }]`, `{ compress: 0.8, format: 'jpeg' }`; `mockBack` called; upload dispatched with `{ uri: 'file://c.jpg', name: 'avatar.jpg', type: 'image/jpeg' }`.
- [ ] **Step 2: Run** `npx jest __tests__/PhotoCropScreen.test.tsx` — Expected: FAIL, cannot find module.
- [ ] **Step 3: Implement the screen.** Layout per Global Constraints copy; stage `testID="crop-stage"` measures with `onLayout`; image `Animated.Image` sized to the image's px dimensions centred in the stage, transformed `translateX/translateY/scale` from shared values; circle window = a `View` of diameter d with `borderWidth: 1.5` ring and an SVG mask or four scrim rects around it (`colors.scrim`); thirds grid inside, opacity `withTiming` 1 on gesture begin (`motion.fast`), 0 after settle (`motion.slow`). Gestures: `usePanGesture({ onUpdate: changeX/changeY with 0.35 resistance past `clampView` limits })`, `usePinchGesture({ onUpdate: zoomAbout(focal relative to circle centre, scaleChange) })`, combined with `useSimultaneousGestures`, `onFinalize` → animate to `clampView` (`withTiming`, 340ms, `ease.standard`). Entry: scale from 1.12× and opacity 0 → rest (~600ms, `ease.enter`); ring from 0.9× (420ms, 120ms delay); reduced motion → opacity only. "Use photo": read the shared values, `cropRect`, `manipulateAsync` with the crop + 512 resize, then `router.back()`, then dispatch the upload: `.unwrap().then(() => Haptics.impactAsync(ImpactFeedbackStyle.Light)).catch((m) => Alert.alert('Upload failed', typeof m === 'string' && m ? m : 'Could not update your photo. Try again.'))`. Button shows busy during the crop.
- [ ] **Step 4: Rewrite `pick`.** Permission + `launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })` as today; then `manipulateAsync(asset.uri, normalizeActions(asset), { compress: 0.9, format: SaveFormat.JPEG })`; then `router.push({ pathname: '/profile/crop', params: { uri, width: String(w), height: String(h) } })` using the manipulator's returned size. Errors → the existing alert.
- [ ] **Step 5: Add the route and root.** Edit both layouts and `jest.setup.ts` as listed; regenerate typed routes.
- [ ] **Step 6: Run** `npx jest __tests__/PhotoCropScreen.test.tsx` and `npx tsc --noEmit` — Expected: PASS, tsc clean.

---

### Task 5: Eight-sport onboarding picker

**Files:**
- Modify: `src/lib/sports.ts`, `src/components/ui/Icon.tsx` (`SPORT_ICONS`), `scripts/icons.mjs` (+ regenerate `src/components/ui/iconPaths.ts`), `src/app/(onboarding)/your-game.tsx`
- Test: `__tests__/sports.test.ts`, `__tests__/YourGameScreen.test.tsx`

**Interfaces:**
- Produces: `ONBOARDING_SPORTS = ['badminton','cricket','table_tennis','football','tennis','kabaddi','volleyball','basketball']`; `SPORT_LABELS` gains `volleyball: 'Volleyball'`, `basketball: 'Basketball'`; `SPORT_ICONS` gains `volleyball: 'sports_volleyball'`, `basketball: 'sports_basketball'`. "Live" = `RANKED_SPORTS.includes(k)`.

- [ ] **Step 1: Write the failing tests.** `sports.test.ts`: `ONBOARDING_SPORTS` equals the list above and every entry has a label. `YourGameScreen.test.tsx` (mock `expo-router`, `@/api/tournaments` → `[]`, store with `authReducer`, spy `updateProfile`): 8 buttons by label; "Not on Kria yet" appears 5 times; pressing "Football" shows "Football isn't on Kria yet. You'll get a ranking once it's live."; pressing "Table Tennis" shows no such line; Continue after Football dispatches `updateProfile` with `{ data: { sport: 'football' } }`.
- [ ] **Step 2: Run** `npx jest __tests__/sports.test.ts __tests__/YourGameScreen.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** Add the icons to `scripts/icons.mjs` as `'of'` and run `node scripts/icons.mjs`. In `your-game.tsx` map `ONBOARDING_SPORTS`; not-live tiles render the label plus "Not on Kria yet" (`font.regular` 12, `colors.text4`); below the tiles a note (`colors.text3`, 13) with the copy above when the picked sport isn't live.
- [ ] **Step 4: Run** the two tests, then the full gates: `npx tsc --noEmit` clean and `npx jest` all green.
