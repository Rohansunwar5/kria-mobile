# Story-Driven Onboarding & Auth Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three "boring" onboarding question screens (Sport/Level/Motivation) with a cinematic 3-beat story screen + one compact sport-only setup screen, and re-skin the Login/Register screens into the same premium dark/animated language — without changing any auth or persistence logic.

**Architecture:** All work is in `mobile/`. The onboarding flow lives under `src/app/(onboarding)/` (expo-router file-based routes). The story screen is a single route containing a horizontal pager of 3 photo beats animated with react-native-reanimated v4. Local-only `level`/`motivations` state is removed from `onboardingSlice`. Auth screens are re-skinned by reusing the existing `OnboardingButton` and a new animated `AuthInput`, leaving all Redux thunks untouched.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 6, NativeWind v4 (Tailwind classes via `className`), Redux Toolkit, react-native-reanimated ~4.1, react-native-gesture-handler, Jest + @testing-library/react-native.

**Conventions to follow (from existing code):**
- Fonts via NativeWind classes `font-oswald` (display) and `font-montserrat` (body). Brand color class `bg-brand`/`text-brand` = `#F97316`; background `bg-ink` = `#111111`.
- Screens wrap content in `SafeAreaView` from `react-native-safe-area-context` with `edges`.
- Reuse `OnboardingButton` for CTAs; never hand-roll a `Pressable` button when this exists.
- Onboarding state via `useAppDispatch`/`useAppSelector` from `@/store/hooks`.
- ESLint: single quotes, semicolons, no `console`, no trailing spaces.

**Verification baseline (run once before starting):**
```bash
cd mobile && npx tsc --noEmit && npx jest
```
Expected: typecheck clean; existing tests pass.

---

### Task 1: Trim `onboardingSlice` to remove level & motivations

**Files:**
- Modify: `mobile/src/store/slices/onboardingSlice.ts`
- Test: `mobile/__tests__/onboardingSlice.test.ts`

- [ ] **Step 1: Update the test to the new shape (write failing test first)**

Replace the entire contents of `mobile/__tests__/onboardingSlice.test.ts` with:

```ts
import reducer, {
  setSport,
  setProfileFields,
  resetOnboarding,
  initialOnboardingState,
} from '@/store/slices/onboardingSlice';

describe('onboardingSlice', () => {
  it('sets sport', () => {
    const s = reducer(initialOnboardingState, setSport('badminton'));
    expect(s.sport).toBe('badminton');
  });

  it('merges profile fields', () => {
    const s = reducer(initialOnboardingState, setProfileFields({ fullName: 'Aarav Mehta', age: 24 }));
    expect(s.fullName).toBe('Aarav Mehta');
    expect(s.age).toBe(24);
    expect(s.gender).toBeNull();
  });

  it('does not expose level or motivations on state', () => {
    expect(initialOnboardingState).not.toHaveProperty('level');
    expect(initialOnboardingState).not.toHaveProperty('motivations');
  });

  it('resets to initial state', () => {
    const dirty = reducer(initialOnboardingState, setSport('badminton'));
    const s = reducer(dirty, resetOnboarding());
    expect(s).toEqual(initialOnboardingState);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && npx jest onboardingSlice`
Expected: FAIL — `setLevel`/`toggleMotivation` import errors are gone, but `initialOnboardingState` still has `level`/`motivations`, so the "does not expose" test fails (and the old slice still exports removed names referenced elsewhere will be fixed in later tasks).

- [ ] **Step 3: Rewrite the slice without level/motivations**

Replace the entire contents of `mobile/src/store/slices/onboardingSlice.ts` with:

```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OnboardingState {
  sport: string | null;
  fullName: string;
  age: number | null;
  gender: string | null;
  photoUri: string | null;
}

export const initialOnboardingState: OnboardingState = {
  sport: null,
  fullName: '',
  age: null,
  gender: null,
  photoUri: null,
};

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState: initialOnboardingState,
  reducers: {
    setSport: (state, action: PayloadAction<string>) => {
      state.sport = action.payload;
    },
    setProfileFields: (
      state,
      action: PayloadAction<Partial<Pick<OnboardingState, 'fullName' | 'age' | 'gender' | 'photoUri'>>>
    ) => {
      Object.assign(state, action.payload);
    },
    resetOnboarding: () => initialOnboardingState,
  },
});

export const { setSport, setProfileFields, resetOnboarding } = onboardingSlice.actions;

export default onboardingSlice.reducer;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd mobile && npx jest onboardingSlice`
Expected: PASS (4 tests). Note: `npx tsc --noEmit` will still fail here because `level.tsx`, `motivation.tsx`, `card-preview.tsx` reference removed exports — those are fixed in Tasks 2–4. Do not run a full typecheck yet.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/store/slices/onboardingSlice.ts __tests__/onboardingSlice.test.ts
git commit -m "refactor(onboarding): drop level and motivations from onboarding state"
```

---

### Task 2: Delete the retired screens, components, and lib

**Files:**
- Delete: `mobile/src/app/(onboarding)/sport.tsx`
- Delete: `mobile/src/app/(onboarding)/level.tsx`
- Delete: `mobile/src/app/(onboarding)/motivation.tsx`
- Delete: `mobile/src/components/onboarding/MotivationChip.tsx`
- Delete: `mobile/src/lib/motivations.ts`

- [ ] **Step 1: Delete the files**

```bash
cd mobile && git rm src/app/"(onboarding)"/sport.tsx src/app/"(onboarding)"/level.tsx src/app/"(onboarding)"/motivation.tsx src/components/onboarding/MotivationChip.tsx src/lib/motivations.ts
```

(On Windows PowerShell, if `git rm` globbing is awkward, run `Remove-Item` on each path then `git add -A`.)

- [ ] **Step 2: Verify nothing else imports the deleted modules**

Search the `mobile/src` tree (editor search or `Select-String -Path mobile\src\* -Recurse -Pattern 'MotivationChip|lib/motivations'`). Expected: zero remaining imports of `MotivationChip` or `@/lib/motivations`. References to `level` will still exist in `card-preview.tsx` and a step label in `creating.tsx` — both fixed in Task 4.

- [ ] **Step 3: Commit**

```bash
cd mobile && git commit -m "chore(onboarding): remove sport/level/motivation screens and motivation lib"
```

---

### Task 3: Add shared motion tokens

**Files:**
- Create: `mobile/src/lib/motion.ts`

- [ ] **Step 1: Create the motion token module**

Create `mobile/src/lib/motion.ts`:

```ts
// Shared animation tokens so every onboarding/auth animation shares one rhythm.
export const MOTION = {
  enterMs: 300,
  exitMs: 200,
  staggerMs: 80,
  spring: { damping: 18, stiffness: 220 },
} as const;
```

- [ ] **Step 2: Typecheck the new file in isolation**

Run: `cd mobile && npx tsc --noEmit src/lib/motion.ts --skipLibCheck --esModuleInterop --jsx react-jsx --moduleResolution bundler`
Expected: no errors (a standalone constant module).

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/lib/motion.ts
git commit -m "feat(onboarding): add shared motion tokens"
```

---

### Task 4: Fix the consumers of removed state (card-preview, creating)

**Files:**
- Modify: `mobile/src/app/(onboarding)/card-preview.tsx`
- Modify: `mobile/src/app/(onboarding)/creating.tsx`
- Test: `mobile/__tests__/PlayerIDCard.test.tsx`

`PlayerIDCard` already treats `level` as optional, so no component change is needed — only its callers.

- [ ] **Step 1: Update `card-preview.tsx` to stop reading `level`**

Replace the entire contents of `mobile/src/app/(onboarding)/card-preview.tsx` with:

```tsx
// src/app/(onboarding)/card-preview.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '@/store/hooks';
import { PlayerIDCard } from '@/components/onboarding/PlayerIDCard';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { StepDots } from '@/components/onboarding/StepDots';
import { SPORT_LABELS } from '@/lib/sports';

export default function CardPreview() {
  const router = useRouter();
  const { fullName, sport, photoUri } = useAppSelector((s) => s.onboarding);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="py-4">
        <StepDots total={3} current={1} />
      </View>
      <View className="flex-1 justify-center">
        <PlayerIDCard
          name={fullName || 'Your Name'}
          sport={SPORT_LABELS[sport || ''] || 'Badminton'}
          photoUri={photoUri}
          locked="preview"
        />
        <Text className="mt-8 text-center font-oswald text-2xl uppercase text-white">{"Let's change that."}</Text>
      </View>
      <View className="py-4">
        <OnboardingButton label="Continue" onPress={() => router.push('/(onboarding)/auth')} />
      </View>
    </SafeAreaView>
  );
}
```

(`StepDots total={3}` reflects the new collect-phase count: setup → profile → card-preview. `current={1}` because profile precedes this. The exact dot mapping is cosmetic; this keeps a sensible 3-step indicator without referencing removed state.)

- [ ] **Step 2: Update `creating.tsx` step label (no skill rating is collected)**

In `mobile/src/app/(onboarding)/creating.tsx`, change the `STEPS` constant on line 11 from:

```ts
const STEPS = ['Profile Created', 'Skill Rating Set', 'Tournament Feed Ready', 'Rankings Enabled'];
```

to:

```ts
const STEPS = ['Profile Created', 'Player Profile Ready', 'Tournament Feed Ready', 'Rankings Enabled'];
```

Leave the rest of the file unchanged.

- [ ] **Step 3: Update `PlayerIDCard.test.tsx` to not depend on `level`**

Replace the entire contents of `mobile/__tests__/PlayerIDCard.test.tsx` with:

```tsx
import { render } from '@testing-library/react-native';
import { PlayerIDCard } from '../src/components/onboarding/PlayerIDCard';

describe('PlayerIDCard', () => {
  it('renders name and sport in preview state', () => {
    const { getByText } = render(
      <PlayerIDCard name="Aarav Mehta" sport="Badminton" locked="preview" />
    );
    expect(getByText('Aarav Mehta')).toBeTruthy();
    expect(getByText(/Badminton/)).toBeTruthy();
  });

  it('renders unranked stats in unranked state', () => {
    const { getByText } = render(
      <PlayerIDCard name="Aarav Mehta" sport="Badminton" locked="unranked" />
    );
    expect(getByText('Unranked')).toBeTruthy();
    expect(getByText('0 Titles')).toBeTruthy();
    expect(getByText('0 Awards')).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `cd mobile && npx jest PlayerIDCard onboardingSlice`
Expected: PASS (all). Typecheck still fails only on the not-yet-created `story`/`setup` routes' absence is fine (routes are optional), but the removed `sport.tsx` route means `welcome.tsx` still pushes to `/(onboarding)/sport` — fixed in Task 7.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/app/"(onboarding)"/card-preview.tsx src/app/"(onboarding)"/creating.tsx __tests__/PlayerIDCard.test.tsx
git commit -m "refactor(onboarding): decouple card-preview and creating from level/motivation"
```

---

### Task 5: Build the `StoryBeat` component

**Files:**
- Create: `mobile/src/components/onboarding/StoryBeat.tsx`

This renders one full-bleed photo beat: image with Ken Burns zoom, bottom gradient scrim, and staggered headline/subtext entry. It takes the pager scroll position (a reanimated shared value) for parallax, and an `active` flag to trigger text entry. Reduced-motion is respected by gating the zoom/parallax.

- [ ] **Step 1: Create the component**

Create `mobile/src/components/onboarding/StoryBeat.tsx`:

```tsx
import { useEffect } from 'react';
import { ImageBackground, View, Text, useWindowDimensions, AccessibilityInfo } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MOTION } from '@/lib/motion';

interface Props {
  source: string;
  headline: string;
  subtext: string;
  index: number;
  active: boolean;
  scrollX: SharedValue<number>;
  width: number;
}

export function StoryBeat({ source, headline, subtext, index, active, scrollX, width }: Props) {
  const enter = useSharedValue(0);
  const zoom = useSharedValue(1);
  const reduceMotion = useSharedValue(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      reduceMotion.value = on;
      if (!on) {
        zoom.value = withRepeat(withTiming(1.08, { duration: 6000 }), -1, true);
      }
    });
  }, [reduceMotion, zoom]);

  useEffect(() => {
    enter.value = active ? withTiming(1, { duration: MOTION.enterMs }) : 0;
  }, [active, enter]);

  const imageStyle = useAnimatedStyle(() => {
    const parallax = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [width * 0.15, 0, -width * 0.15],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: reduceMotion.value ? 0 : parallax },
        { scale: reduceMotion.value ? 1 : zoom.value },
      ],
    };
  });

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [24, 0]) }],
  }));

  const subtextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0.4, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(enter.value, [0, 1], [16, 0]) }],
  }));

  return (
    <View style={{ width }} className="flex-1">
      <Animated.View style={[{ flex: 1 }, imageStyle]}>
        <ImageBackground source={{ uri: source }} className="flex-1" style={{ backgroundColor: '#111111' }} />
      </Animated.View>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(17,17,17,0.95)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' }}
      />
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-40">
        <Animated.Text style={headlineStyle} className="font-oswald text-5xl uppercase leading-[0.95] text-white">
          {headline}
        </Animated.Text>
        <Animated.Text style={subtextStyle} className="mt-4 font-montserrat text-base text-gray-300">
          {subtext}
        </Animated.Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Ensure `expo-linear-gradient` is installed**

Run: `cd mobile && npx expo install expo-linear-gradient`
Expected: installs the SDK-54-compatible version (or reports already installed). This is the only new dependency; it is an Expo-maintained module, web + native safe.

- [ ] **Step 3: Typecheck the component**

Run: `cd mobile && npx tsc --noEmit`
Expected: no NEW errors from `StoryBeat.tsx`. (Pre-existing errors from the missing `story`/`setup` routes and `welcome.tsx`'s push to `/sport` may remain until Tasks 6–7.)

- [ ] **Step 4: Commit**

```bash
cd mobile && git add src/components/onboarding/StoryBeat.tsx package.json package-lock.json
git commit -m "feat(onboarding): add animated StoryBeat component"
```

---

### Task 6: Build the `story` screen (3-beat pager)

**Files:**
- Create: `mobile/src/app/(onboarding)/story.tsx`

Horizontal `Animated.ScrollView` pager of 3 `StoryBeat`s with: top progress segments, Skip (top-right), and a CTA that appears on the last beat. The scroll offset drives parallax and the active-beat index.

- [ ] **Step 1: Create the screen**

Create `mobile/src/app/(onboarding)/story.tsx`:

```tsx
// src/app/(onboarding)/story.tsx
import { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { StoryBeat } from '@/components/onboarding/StoryBeat';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const BEATS = [
  {
    source: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80',
    headline: "You're not just playing anymore.",
    subtext: 'Step onto the court as a real competitor.',
  },
  {
    source: 'https://images.unsplash.com/photo-1613918431703-aa50889e3be9?auto=format&fit=crop&w=900&q=80',
    headline: 'Compete in real tournaments.',
    subtext: 'Live drafts, auctions, and brackets — the way the pros do it.',
  },
  {
    source: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=900&q=80',
    headline: 'Get drafted. Get ranked. Get recognized.',
    subtext: 'Build a record that follows your name.',
  },
];

function ProgressSegment({ index, scrollX, width }: { index: number; scrollX: Animated.SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity: 0.3 + 0.7 * progress };
  });
  return (
    <Animated.View
      style={[{ flex: 1, height: 3, borderRadius: 2, backgroundColor: '#F97316' }, style]}
    />
  );
}

export default function Story() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const [active, setActive] = useState(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const goSetup = () => router.push('/(onboarding)/setup');

  return (
    <View className="flex-1 bg-ink">
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.x / width))}
        className="flex-1"
      >
        {BEATS.map((b, i) => (
          <StoryBeat
            key={i}
            source={b.source}
            headline={b.headline}
            subtext={b.subtext}
            index={i}
            active={active === i}
            scrollX={scrollX}
            width={width}
          />
        ))}
      </Animated.ScrollView>

      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 px-6">
        <View className="mt-2 flex-row items-center gap-1.5">
          {BEATS.map((_, i) => (
            <ProgressSegment key={i} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>
        <Pressable onPress={goSetup} className="mt-3 self-end" accessibilityRole="button" hitSlop={12}>
          <Text className="font-montserrat text-sm text-gray-300">Skip</Text>
        </Pressable>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 px-6 pb-6">
        {active === BEATS.length - 1 ? (
          <OnboardingButton label="Let's set you up" onPress={goSetup} />
        ) : null}
      </SafeAreaView>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors from `story.tsx`. (The `/setup` route resolves once Task 7 creates it; expo-router typed routes may warn until then — acceptable, see memory note on stale typed-routes; resolved after Task 8.)

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/app/"(onboarding)"/story.tsx
git commit -m "feat(onboarding): add cinematic 3-beat story screen"
```

---

### Task 7: Build the `setup` screen and repoint `welcome`

**Files:**
- Create: `mobile/src/app/(onboarding)/setup.tsx`
- Modify: `mobile/src/app/(onboarding)/welcome.tsx`

- [ ] **Step 1: Create the setup screen (sport only, badminton default)**

Create `mobile/src/app/(onboarding)/setup.tsx`:

```tsx
// src/app/(onboarding)/setup.tsx
import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSport } from '@/store/slices/onboardingSlice';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const SPORTS = [
  { key: 'badminton', label: 'Badminton', active: true },
  { key: 'cricket', label: 'Cricket', active: false },
  { key: 'football', label: 'Football', active: false },
  { key: 'table_tennis', label: 'Table Tennis', active: false },
  { key: 'tennis', label: 'Tennis', active: false },
  { key: 'kabaddi', label: 'Kabaddi', active: false },
];

export default function Setup() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selected = useAppSelector((s) => s.onboarding.sport);

  // Default to badminton (the only active sport) so this screen is zero-friction.
  useEffect(() => {
    if (!selected) dispatch(setSport('badminton'));
  }, [selected, dispatch]);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <Text className="mb-2 font-oswald text-4xl uppercase text-white">Lock in your game.</Text>
        <Text className="mb-8 font-montserrat text-base text-gray-400">
          Badminton is live now — more sports are on the way.
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {SPORTS.map((sp) => {
            const isSel = selected === sp.key;
            return (
              <Pressable
                key={sp.key}
                disabled={!sp.active}
                onPress={() => dispatch(setSport(sp.key))}
                accessibilityRole="button"
                className={`rounded-2xl border px-5 py-3 ${
                  isSel ? 'border-brand bg-brand/10' : 'border-white/10 bg-white/5'
                } ${!sp.active ? 'opacity-50' : ''}`}
              >
                <Text className="font-oswald text-base uppercase text-white">{sp.label}</Text>
                {!sp.active ? (
                  <Text className="font-montserrat text-[10px] uppercase tracking-wide text-gray-400">Soon</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View className="py-4">
        <OnboardingButton label="Continue" disabled={!selected} onPress={() => router.push('/(onboarding)/profile')} />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Repoint `welcome.tsx`'s "Get Started" to the story screen**

In `mobile/src/app/(onboarding)/welcome.tsx`, change the "Get Started" button's `onPress` from:

```tsx
<OnboardingButton label="Get Started" onPress={() => router.push('/(onboarding)/sport')} />
```

to:

```tsx
<OnboardingButton label="Get Started" onPress={() => router.push('/(onboarding)/story')} />
```

Leave the rest of `welcome.tsx` unchanged.

- [ ] **Step 3: Typecheck and run all tests**

Run: `cd mobile && npx tsc --noEmit && npx jest`
Expected: typecheck clean (all removed-export references are gone; `story`/`setup` routes now exist). All tests pass.

> If expo-router typed-route errors persist for `/(onboarding)/story` or `/setup`, regenerate route types: `npx expo export --platform web --output-dir /tmp/kria-export` (per the mobile typed-routes memory), then re-run `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add src/app/"(onboarding)"/setup.tsx src/app/"(onboarding)"/welcome.tsx
git commit -m "feat(onboarding): add sport-only setup screen and route welcome to story"
```

---

### Task 8: Build the animated `AuthInput` component

**Files:**
- Create: `mobile/src/components/auth/AuthInput.tsx`
- Test: `mobile/__tests__/AuthInput.test.tsx`

A labelled text input with an animated brand-orange focus border and an optional password show/hide toggle. Wraps RN `TextInput`, forwarding all standard props.

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/AuthInput.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { AuthInput } from '../src/components/auth/AuthInput';

describe('AuthInput', () => {
  it('renders its label and value', () => {
    const { getByText, getByDisplayValue } = render(
      <AuthInput label="Email" value="a@b.com" onChangeText={() => {}} />
    );
    expect(getByText('Email')).toBeTruthy();
    expect(getByDisplayValue('a@b.com')).toBeTruthy();
  });

  it('toggles password visibility when secureToggle is set', () => {
    const { getByLabelText, getByDisplayValue } = render(
      <AuthInput label="Password" value="secret" onChangeText={() => {}} secureToggle />
    );
    // hidden by default
    const input = getByDisplayValue('secret');
    expect(input.props.secureTextEntry).toBe(true);
    fireEvent.press(getByLabelText('Show password'));
    expect(getByDisplayValue('secret').props.secureTextEntry).toBe(false);
  });

  it('shows an error message when error prop is set', () => {
    const { getByText } = render(
      <AuthInput label="Email" value="" onChangeText={() => {}} error="Required" />
    );
    expect(getByText('Required')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd mobile && npx jest AuthInput`
Expected: FAIL — module `../src/components/auth/AuthInput` not found.

- [ ] **Step 3: Implement `AuthInput`**

Create `mobile/src/components/auth/AuthInput.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  secureToggle?: boolean;
}

export function AuthInput({ label, error, secureToggle, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const focus = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error ? '#F87171' : focus.value ? '#F97316' : 'rgba(255,255,255,0.1)',
  }));

  return (
    <View className="mb-4">
      <Text className="mb-1.5 font-montserrat text-xs uppercase tracking-wide text-gray-400">{label}</Text>
      <Animated.View
        style={borderStyle}
        className="flex-row items-center rounded-2xl border bg-white/5 px-4"
      >
        <TextInput
          {...rest}
          secureTextEntry={secureToggle ? hidden : rest.secureTextEntry}
          placeholderTextColor="#888"
          onFocus={(e) => {
            setFocused(true);
            focus.value = withTiming(1, { duration: 150 });
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focus.value = withTiming(0, { duration: 150 });
            rest.onBlur?.(e);
          }}
          className="flex-1 py-3.5 font-montserrat text-base text-white"
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
          >
            <Text className="font-montserrat text-xs text-brand">{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? <Text className="mt-1 font-montserrat text-xs text-red-400">{error}</Text> : null}
    </View>
  );
}
```

(Note: `focused` state is kept for clarity/possible future use; the animated value `focus` drives the border. If ESLint flags `focused` as unused, remove the `useState`/`setFocused` and call `setFocused` inline — but `onFocus`/`onBlur` already use it, so it is used.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd mobile && npx jest AuthInput`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/components/auth/AuthInput.tsx __tests__/AuthInput.test.tsx
git commit -m "feat(auth): add animated AuthInput with focus ring and password toggle"
```

---

### Task 9: Re-skin the Login screen

**Files:**
- Modify: `mobile/src/app/(auth)/login.tsx`

Keep all dispatch logic and mode handling; replace the presentation with a hero band + `AuthInput`s + `OnboardingButton`.

- [ ] **Step 1: Rewrite `login.tsx`**

Replace the entire contents of `mobile/src/app/(auth)/login.tsx` with:

```tsx
import { useState } from 'react';
import { View, Text, Pressable, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginUser, requestLoginOtp, verifyLoginOtp, clearError } from '@/store/slices/authSlice';
import { AuthInput } from '@/components/auth/AuthInput';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

type Mode = 'password' | 'otp';

const HERO = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80';

export default function Login() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);

  const submitPassword = () => dispatch(loginUser({ data: { email, password } }));
  const requestOtp = async () => {
    const res = await dispatch(requestLoginOtp({ data: { email } }));
    if (requestLoginOtp.fulfilled.match(res)) setOtpRequested(true);
  };
  const submitOtp = () => dispatch(verifyLoginOtp({ data: { email, otp } }));

  const ctaLabel = mode === 'password' ? 'Log in' : otpRequested ? 'Verify OTP' : 'Send OTP';
  const onCta = mode === 'password' ? submitPassword : otpRequested ? submitOtp : requestOtp;

  return (
    <View className="flex-1 bg-ink">
      <View className="h-56 w-full">
        <ImageBackground source={{ uri: HERO }} className="flex-1" style={{ backgroundColor: '#111111' }} />
        <LinearGradient
          colors={['transparent', 'rgba(17,17,17,0.7)', '#111111']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}
        />
        <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 px-6">
          <Text className="mt-4 font-oswald text-3xl uppercase text-brand">Kria</Text>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Text className="mb-6 font-oswald text-4xl uppercase text-white">Welcome back.</Text>

          <AuthInput
            label="Email"
            placeholder="you@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(t) => { setEmail(t); dispatch(clearError()); }}
          />

          {mode === 'password' ? (
            <AuthInput
              label="Password"
              placeholder="Your password"
              secureToggle
              value={password}
              onChangeText={setPassword}
            />
          ) : null}

          {mode === 'otp' && otpRequested ? (
            <AuthInput
              label="OTP"
              placeholder="6-digit code"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
          ) : null}

          {error ? <Text className="mb-3 font-montserrat text-red-400">{error}</Text> : null}

          <OnboardingButton label={ctaLabel} loading={isLoading} onPress={onCta} />

          <Pressable
            className="mt-4 items-center"
            onPress={() => {
              setMode((m) => (m === 'password' ? 'otp' : 'password'));
              setOtpRequested(false);
              dispatch(clearError());
            }}
          >
            <Text className="font-montserrat text-brand">
              {mode === 'password' ? 'Log in with OTP instead' : 'Use password instead'}
            </Text>
          </Pressable>

          <View className="mt-6 flex-row justify-between">
            <Link href="/(auth)/forgot-password" className="font-montserrat text-[#aaa]">Forgot password?</Link>
            <Link href="/(auth)/register" className="font-montserrat text-[#aaa]">Create account</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd mobile && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/app/"(auth)"/login.tsx
git commit -m "feat(auth): re-skin login with hero band and animated inputs"
```

---

### Task 10: Re-skin the Register screen

**Files:**
- Modify: `mobile/src/app/(auth)/register.tsx`

- [ ] **Step 1: Rewrite `register.tsx`**

Replace the entire contents of `mobile/src/app/(auth)/register.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { View, Text, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { registerUser, clearError } from '@/store/slices/authSlice';
import { AuthInput } from '@/components/auth/AuthInput';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const HERO = 'https://images.unsplash.com/photo-1613918431703-aa50889e3be9?auto=format&fit=crop&w=900&q=80';

export default function Register() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error, registrationStep } = useAppSelector((s) => s.auth);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (registrationStep === 2) router.replace('/(auth)/verify-otp');
  }, [registrationStep, router]);

  return (
    <View className="flex-1 bg-ink">
      <View className="h-56 w-full">
        <ImageBackground source={{ uri: HERO }} className="flex-1" style={{ backgroundColor: '#111111' }} />
        <LinearGradient
          colors={['transparent', 'rgba(17,17,17,0.7)', '#111111']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}
        />
        <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 px-6">
          <Text className="mt-4 font-oswald text-3xl uppercase text-brand">Kria</Text>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Text className="mb-6 font-oswald text-4xl uppercase text-white">Join the league.</Text>

          <AuthInput label="First name" value={firstName} onChangeText={setFirstName} />
          <AuthInput label="Last name" value={lastName} onChangeText={setLastName} />
          <AuthInput
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(t) => { setEmail(t); dispatch(clearError()); }}
          />
          <AuthInput label="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

          {error ? <Text className="mb-3 font-montserrat text-red-400">{error}</Text> : null}

          <OnboardingButton
            label="Continue"
            loading={isLoading}
            onPress={() => dispatch(registerUser({ data: { firstName, lastName, email, phone } }))}
          />

          <Link href="/(auth)/login" className="mt-6 text-center font-montserrat text-[#aaa]">
            Already have an account? Log in
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck and run the full test suite**

Run: `cd mobile && npx tsc --noEmit && npx jest`
Expected: typecheck clean; all tests pass.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/app/"(auth)"/register.tsx
git commit -m "feat(auth): re-skin register with hero band and animated inputs"
```

---

### Task 11: Manual verification pass

**Files:** none (manual/visual).

- [ ] **Step 1: Lint the whole app**

Run: `cd mobile && npm run lint`
Expected: no errors. Fix any `no-unused-vars`/quote/semicolon issues introduced.

- [ ] **Step 2: Run the app on web and walk the flow**

Run: `cd mobile && npm run web`
Then in the browser, from a logged-out state, verify:
- Welcome → "Get Started" → **story** screen loads; swiping advances the 3 beats; progress segments fill; headline/subtext animate in; "Skip" jumps to setup; CTA appears on the last beat.
- Setup shows Badminton pre-selected; "Soon" sports are non-tappable; Continue → profile.
- profile → card-preview (no level shown) → auth → creating ("Player Profile Ready" step) → welcome-done.
- From Welcome → "Sign In" → **login**: hero band, animated inputs, password show/hide, OTP toggle all work; a real login still authenticates.
- Login → "Create account" → **register**: hero band, inputs, Continue triggers OTP step.

> If the web build throws on `expo-secure-store` again, that is the separate storage fix already applied; confirm `src/lib/secureStore.ts` is present.

- [ ] **Step 2 (alt): Run on a device via Expo Go** (SDK 54, per project memory) if a physical device is preferred for animation feel.

- [ ] **Step 3: Verify reduced-motion**

Enable "Reduce Motion" in OS accessibility settings (or browser emulation), reload, and confirm the story beats fade in without Ken Burns zoom/parallax and remain readable.

- [ ] **Step 4: Final commit (if any lint fixes were made)**

```bash
cd mobile && git add -A && git commit -m "chore: lint fixes for onboarding/auth redesign"
```

---

## Notes for the implementer

- **No backend changes.** Everything is presentation + local onboarding state.
- **Only one new dependency:** `expo-linear-gradient` (Expo-maintained, installed in Task 5).
- **Web safety:** `secureStore.ts` already provides a web fallback (separate prior fix). The redesign adds no native-only APIs except `expo-linear-gradient`, which supports web.
- **Typed-route staleness:** if `npx tsc --noEmit` reports unknown-route errors for the new `story`/`setup` paths, regenerate `.expo/types` via `npx expo export` (see project memory), then re-typecheck.
- **Images:** remote Unsplash URLs are placeholders; swapping to bundled `assets/` images later is a one-line `source` change in `story.tsx` and the two auth `HERO` constants.
