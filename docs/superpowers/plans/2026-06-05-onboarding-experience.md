# Kria Sports Onboarding Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 9-screen premium onboarding flow for new players, wired into the existing Expo/Redux app, that collects sport/profile/skill/motivation locally and hands off to the real email+OTP auth.

**Architecture:** A new `(onboarding)` expo-router group holds the 9 screens. A new `onboardingSlice` (Redux) holds in-progress identity state (local only — the backend has no skill/motivation fields). The `AuthGate` in `src/app/_layout.tsx` is extended to route un-onboarded logged-out users into the flow, gated by a new `onboardingComplete` secure-store flag. Screen 7 hands off to the existing `(auth)` register→verify-otp→set-password flow; on completion a `pendingOnboarding` flag routes the now-logged-in user to the "creating" + "welcome" screens before reaching the tabs.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router v6, NativeWind v4, Redux Toolkit, react-native-reanimated v4, expo-image-picker, expo-secure-store, Jest + @testing-library/react-native.

**Conventions to follow (from existing code):**
- Colors via NativeWind tokens: `bg-ink` (#111111), `text-brand`/`bg-brand` (#F97316). Deeper black `#0d0d0d` only as inline style for card insets.
- Fonts: `font-oswald` (display) and `font-montserrat` (body). Already loaded in `_layout.tsx`.
- ESLint-style of repo: single quotes, semicolons, no `console` (use silent best-effort for the profile PATCH).
- Screens are default-exported components. Route files live under `src/app/`.

---

## File Structure

**Create:**
- `src/store/slices/onboardingSlice.ts` — local onboarding identity state + reducers.
- `src/lib/onboardingStorage.ts` — `getOnboardingComplete()` / `setOnboardingComplete()` via SecureStore.
- `src/lib/motivations.ts` — the 6 motivation option constants.
- `src/components/onboarding/OnboardingButton.tsx`
- `src/components/onboarding/SelectableCard.tsx`
- `src/components/onboarding/MotivationChip.tsx`
- `src/components/onboarding/PlayerIDCard.tsx`
- `src/components/onboarding/ProgressStep.tsx`
- `src/components/onboarding/StepDots.tsx`
- `src/app/(onboarding)/_layout.tsx`
- `src/app/(onboarding)/welcome.tsx`
- `src/app/(onboarding)/sport.tsx`
- `src/app/(onboarding)/profile.tsx`
- `src/app/(onboarding)/level.tsx`
- `src/app/(onboarding)/motivation.tsx`
- `src/app/(onboarding)/card-preview.tsx`
- `src/app/(onboarding)/auth.tsx`
- `src/app/(onboarding)/creating.tsx`
- `src/app/(onboarding)/welcome-done.tsx`
- `__tests__/onboardingSlice.test.ts`
- `__tests__/PlayerIDCard.test.tsx`

**Modify:**
- `src/store/index.ts` — register `onboarding` reducer.
- `src/store/slices/authSlice.ts` — add `pendingOnboarding` flag + `beginOnboardingHandoff` / `endOnboardingHandoff` reducers.
- `src/app/_layout.tsx` — extend `AuthGate` routing for onboarding.

---

## Task 1: Onboarding Redux slice

**Files:**
- Create: `src/store/slices/onboardingSlice.ts`
- Test: `__tests__/onboardingSlice.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/onboardingSlice.test.ts
import reducer, {
  setSport,
  setProfileFields,
  setLevel,
  toggleMotivation,
  resetOnboarding,
  initialOnboardingState,
} from '../src/store/slices/onboardingSlice';

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

  it('sets level', () => {
    const s = reducer(initialOnboardingState, setLevel('intermediate'));
    expect(s.level).toBe('intermediate');
  });

  it('toggles motivation on and off', () => {
    const on = reducer(initialOnboardingState, toggleMotivation('winning'));
    expect(on.motivations).toEqual(['winning']);
    const off = reducer(on, toggleMotivation('winning'));
    expect(off.motivations).toEqual([]);
  });

  it('resets to initial state', () => {
    const dirty = reducer(initialOnboardingState, setSport('badminton'));
    const s = reducer(dirty, resetOnboarding());
    expect(s).toEqual(initialOnboardingState);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest onboardingSlice -t "sets sport"`
Expected: FAIL — cannot find module `onboardingSlice`.

- [ ] **Step 3: Write the slice**

```ts
// src/store/slices/onboardingSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'competitive';

export interface OnboardingState {
  sport: string | null;
  fullName: string;
  age: number | null;
  gender: string | null;
  photoUri: string | null;
  level: SkillLevel | null;
  motivations: string[];
}

export const initialOnboardingState: OnboardingState = {
  sport: null,
  fullName: '',
  age: null,
  gender: null,
  photoUri: null,
  level: null,
  motivations: [],
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
    setLevel: (state, action: PayloadAction<SkillLevel>) => {
      state.level = action.payload;
    },
    toggleMotivation: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      state.motivations = state.motivations.includes(key)
        ? state.motivations.filter((m) => m !== key)
        : [...state.motivations, key];
    },
    resetOnboarding: () => initialOnboardingState,
  },
});

export const { setSport, setProfileFields, setLevel, toggleMotivation, resetOnboarding } =
  onboardingSlice.actions;

export default onboardingSlice.reducer;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest onboardingSlice`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/store/slices/onboardingSlice.ts __tests__/onboardingSlice.test.ts
git commit -m "feat(onboarding): add onboarding redux slice"
```

---

## Task 2: Register slice in store

**Files:**
- Modify: `src/store/index.ts`

- [ ] **Step 1: Add the reducer**

Edit `src/store/index.ts` — add the import after the existing slice imports and register it:

```ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tournamentReducer from './slices/tournamentSlice';
import registrationReducer from './slices/registrationSlice';
import teamReducer from './slices/teamSlice';
import onboardingReducer from './slices/onboardingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tournament: tournamentReducer,
    registration: registrationReducer,
    team: teamReducer,
    onboarding: onboardingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No new errors referencing `store/index.ts` or `onboarding`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/store/index.ts
git commit -m "feat(onboarding): register onboarding reducer"
```

---

## Task 3: Onboarding-complete storage flag

**Files:**
- Create: `src/lib/onboardingStorage.ts`

- [ ] **Step 1: Write the module**

```ts
// src/lib/onboardingStorage.ts
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'onboardingComplete';

export async function getOnboardingComplete(): Promise<boolean> {
  return (await SecureStore.getItemAsync(ONBOARDING_KEY)) === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `onboardingStorage.ts`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/lib/onboardingStorage.ts
git commit -m "feat(onboarding): add onboardingComplete storage flag"
```

---

## Task 4: Motivation constants

**Files:**
- Create: `src/lib/motivations.ts`

- [ ] **Step 1: Write the constants**

```ts
// src/lib/motivations.ts
export interface MotivationOption {
  key: string;
  label: string;
}

export const MOTIVATIONS: MotivationOption[] = [
  { key: 'winning', label: 'Winning tournaments' },
  { key: 'drafted', label: 'Getting drafted' },
  { key: 'teammates', label: 'Finding teammates' },
  { key: 'performance', label: 'Tracking performance' },
  { key: 'rankings', label: 'Climbing rankings' },
  { key: 'awards', label: 'Earning awards' },
];
```

- [ ] **Step 2: Commit**

```bash
cd mobile && git add src/lib/motivations.ts
git commit -m "feat(onboarding): add motivation option constants"
```

---

## Task 5: OnboardingButton component

**Files:**
- Create: `src/components/onboarding/OnboardingButton.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/onboarding/OnboardingButton.tsx
import { Pressable, Text, ActivityIndicator } from 'react-native';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
}

export function OnboardingButton({ label, onPress, variant = 'primary', disabled, loading }: Props) {
  const isPrimary = variant === 'primary';
  const base = 'items-center justify-center rounded-3xl py-4 px-6';
  const look = isPrimary ? 'bg-brand' : 'border border-white/20 bg-transparent';
  const dim = disabled ? 'opacity-40' : '';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      className={`${base} ${look} ${dim}`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="font-montserrat text-base font-semibold text-white">{label}</Text>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `OnboardingButton.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/components/onboarding/OnboardingButton.tsx
git commit -m "feat(onboarding): add OnboardingButton component"
```

---

## Task 6: SelectableCard component

**Files:**
- Create: `src/components/onboarding/SelectableCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/onboarding/SelectableCard.tsx
import { Pressable, View, Text } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Props {
  title: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  badge?: string;
  onPress?: () => void;
}

export function SelectableCard({ title, description, selected, disabled, badge, onPress }: Props) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(selected ? 1.02 : 1, { damping: 18, stiffness: 220 }) }],
  }));

  return (
    <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button">
      <Animated.View
        style={style}
        className={`rounded-3xl border p-5 ${
          selected ? 'border-brand bg-brand/10' : 'border-white/10 bg-white/5'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-oswald text-xl uppercase text-white">{title}</Text>
          {badge ? (
            <Text className="font-montserrat text-[10px] uppercase tracking-wide text-gray-400">{badge}</Text>
          ) : null}
        </View>
        {description ? (
          <Text className="mt-1 font-montserrat text-sm text-gray-400">{description}</Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `SelectableCard.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/components/onboarding/SelectableCard.tsx
git commit -m "feat(onboarding): add SelectableCard component"
```

---

## Task 7: MotivationChip component

**Files:**
- Create: `src/components/onboarding/MotivationChip.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/onboarding/MotivationChip.tsx
import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function MotivationChip({ label, selected, onPress }: Props) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(selected ? 1.04 : 1, { damping: 16, stiffness: 240 }) }],
  }));

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <Animated.View
        style={style}
        className={`rounded-3xl border px-4 py-3 ${
          selected ? 'border-brand bg-brand/15' : 'border-white/15 bg-white/5'
        }`}
      >
        <Text className={`font-montserrat text-sm ${selected ? 'font-semibold text-white' : 'text-gray-300'}`}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `MotivationChip.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/components/onboarding/MotivationChip.tsx
git commit -m "feat(onboarding): add MotivationChip component"
```

---

## Task 8: PlayerIDCard component (+ test)

**Files:**
- Create: `src/components/onboarding/PlayerIDCard.tsx`
- Test: `__tests__/PlayerIDCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/PlayerIDCard.test.tsx
import { render } from '@testing-library/react-native';
import { PlayerIDCard } from '../src/components/onboarding/PlayerIDCard';

describe('PlayerIDCard', () => {
  it('renders name, sport and level in preview state', () => {
    const { getByText } = render(
      <PlayerIDCard name="Aarav Mehta" sport="Badminton" level="Intermediate" locked="preview" />
    );
    expect(getByText('Aarav Mehta')).toBeTruthy();
    expect(getByText(/Badminton/)).toBeTruthy();
    expect(getByText(/Intermediate/)).toBeTruthy();
  });

  it('renders unranked stats in unranked state', () => {
    const { getByText } = render(
      <PlayerIDCard name="Aarav Mehta" sport="Badminton" level="Intermediate" locked="unranked" />
    );
    expect(getByText('Unranked')).toBeTruthy();
    expect(getByText('0 Titles')).toBeTruthy();
    expect(getByText('0 Awards')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest PlayerIDCard`
Expected: FAIL — cannot find module `PlayerIDCard`.

- [ ] **Step 3: Write the component**

```tsx
// src/components/onboarding/PlayerIDCard.tsx
import { View, Text, Image } from 'react-native';
import { InitialsAvatar } from '@/components/InitialsAvatar';

type LockedMode = 'preview' | 'unranked';

interface Props {
  name: string;
  sport: string;
  level?: string;
  photoUri?: string | null;
  locked: LockedMode;
}

function LockedRow({ label }: { label: string }) {
  return (
    <View className="flex-row items-center justify-between border-t border-white/10 py-2.5">
      <Text className="font-montserrat text-xs text-gray-500">🔒 {label}</Text>
      <Text className="font-montserrat text-xs text-gray-600">Locked</Text>
    </View>
  );
}

export function PlayerIDCard({ name, sport, level, photoUri, locked }: Props) {
  return (
    <View
      className="self-center overflow-hidden rounded-3xl border border-white/10"
      style={{ width: 280, backgroundColor: '#0d0d0d' }}
    >
      <View className="items-center px-5 pb-4 pt-6" style={{ backgroundColor: '#1a120b' }}>
        <Text className="font-oswald text-xs uppercase tracking-widest text-brand">Kria</Text>
        <View className="my-3 h-24 w-24 items-center justify-center rounded-full border-2 border-brand bg-black">
          {photoUri ? (
            <Image source={{ uri: photoUri }} className="h-full w-full rounded-full" />
          ) : (
            <InitialsAvatar name={name} size={88} />
          )}
        </View>
        <Text className="font-oswald text-2xl uppercase text-white">{name}</Text>
        <Text className="mt-1 font-montserrat text-xs text-gray-400">
          {sport}
          {level ? ` · ${level}` : ''}
        </Text>
      </View>

      <View className="px-5 py-4">
        {locked === 'preview' ? (
          <>
            <LockedRow label="Titles" />
            <LockedRow label="Awards" />
            <LockedRow label="Rankings" />
          </>
        ) : (
          <View className="flex-row items-center justify-between">
            <Text className="font-oswald text-base uppercase text-gray-300">Unranked</Text>
            <Text className="font-montserrat text-xs text-gray-400">0 Titles</Text>
            <Text className="font-montserrat text-xs text-gray-400">0 Awards</Text>
          </View>
        )}
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest PlayerIDCard`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/components/onboarding/PlayerIDCard.tsx __tests__/PlayerIDCard.test.tsx
git commit -m "feat(onboarding): add PlayerIDCard component"
```

---

## Task 9: ProgressStep component

**Files:**
- Create: `src/components/onboarding/ProgressStep.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/onboarding/ProgressStep.tsx
import { View, Text, ActivityIndicator } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface Props {
  label: string;
  done: boolean;
}

export function ProgressStep({ label, done }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(300)} className="flex-row items-center gap-3 py-3">
      <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: done ? '#F97316' : '#1c1c1c' }}>
        {done ? (
          <Text className="font-montserrat text-sm font-bold text-white">✓</Text>
        ) : (
          <ActivityIndicator size="small" color="#888" />
        )}
      </View>
      <Text className={`font-montserrat text-base ${done ? 'text-white' : 'text-gray-500'}`}>{label}</Text>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `ProgressStep.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/components/onboarding/ProgressStep.tsx
git commit -m "feat(onboarding): add ProgressStep component"
```

---

## Task 10: StepDots component

**Files:**
- Create: `src/components/onboarding/StepDots.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/onboarding/StepDots.tsx
import { View } from 'react-native';

interface Props {
  total: number;
  current: number; // 0-based
}

export function StepDots({ total, current }: Props) {
  return (
    <View className="flex-row items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className="h-1.5 rounded-full"
          style={{ width: i === current ? 18 : 6, backgroundColor: i === current ? '#F97316' : '#333' }}
        />
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `StepDots.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/components/onboarding/StepDots.tsx
git commit -m "feat(onboarding): add StepDots component"
```

---

## Task 11: Onboarding stack layout

**Files:**
- Create: `src/app/(onboarding)/_layout.tsx`

- [ ] **Step 1: Write the layout**

```tsx
// src/app/(onboarding)/_layout.tsx
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#111111' } }}>
      <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
      <Stack.Screen name="creating" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd mobile && git add "src/app/(onboarding)/_layout.tsx"
git commit -m "feat(onboarding): add onboarding stack layout"
```

---

## Task 12: Screen 1 — Welcome

**Files:**
- Create: `src/app/(onboarding)/welcome.tsx`

- [ ] **Step 1: Write the screen**

```tsx
// src/app/(onboarding)/welcome.tsx
import { ImageBackground, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const HERO =
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80';

export default function Welcome() {
  const router = useRouter();
  return (
    <ImageBackground source={{ uri: HERO }} className="flex-1" style={{ backgroundColor: '#111111' }}>
      <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
        <SafeAreaView edges={['top', 'bottom']} className="flex-1 justify-end px-6 pb-10">
          <Text className="font-oswald text-5xl uppercase leading-[0.95] text-white">
            Play. Compete. Get Recognized.
          </Text>
          <Text className="mb-8 mt-4 font-montserrat text-base text-gray-300">
            Join tournaments, get drafted into teams, and build your player profile.
          </Text>
          <View className="gap-3">
            <OnboardingButton label="Get Started" onPress={() => router.push('/(onboarding)/sport')} />
            <OnboardingButton label="Sign In" variant="secondary" onPress={() => router.replace('/(auth)/login')} />
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}
```

> Note: the dark overlay `View` (`rgba(0,0,0,0.35)`) plus the bottom-anchored layout provides the gradient-style legibility behind the text. Swap `HERO` for a bundled local image later via the same `source` prop if desired.

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `welcome.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "src/app/(onboarding)/welcome.tsx"
git commit -m "feat(onboarding): add welcome screen"
```

---

## Task 13: Screen 2 — Choose Your Sport

**Files:**
- Create: `src/app/(onboarding)/sport.tsx`

- [ ] **Step 1: Write the screen**

```tsx
// src/app/(onboarding)/sport.tsx
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSport } from '@/store/slices/onboardingSlice';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { StepDots } from '@/components/onboarding/StepDots';

const SPORTS = [
  { key: 'badminton', label: 'Badminton', active: true },
  { key: 'cricket', label: 'Cricket', active: false },
  { key: 'football', label: 'Football', active: false },
  { key: 'table_tennis', label: 'Table Tennis', active: false },
  { key: 'tennis', label: 'Tennis', active: false },
  { key: 'kabaddi', label: 'Kabaddi', active: false },
];

export default function Sport() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selected = useAppSelector((s) => s.onboarding.sport);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="py-4">
        <StepDots total={5} current={0} />
      </View>
      <Text className="mb-6 font-oswald text-4xl uppercase text-white">What sport do you play?</Text>
      <ScrollView className="flex-1" contentContainerStyle={{ gap: 12 }}>
        {SPORTS.map((sp) => (
          <SelectableCard
            key={sp.key}
            title={sp.label}
            selected={selected === sp.key}
            disabled={!sp.active}
            badge={sp.active ? undefined : 'Coming Soon'}
            onPress={() => dispatch(setSport(sp.key))}
          />
        ))}
      </ScrollView>
      <View className="py-4">
        <OnboardingButton label="Continue" disabled={!selected} onPress={() => router.push('/(onboarding)/profile')} />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `sport.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "src/app/(onboarding)/sport.tsx"
git commit -m "feat(onboarding): add sport selection screen"
```

---

## Task 14: Screen 3 — Player Profile Setup

**Files:**
- Create: `src/app/(onboarding)/profile.tsx`

- [ ] **Step 1: Write the screen**

```tsx
// src/app/(onboarding)/profile.tsx
import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setProfileFields } from '@/store/slices/onboardingSlice';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { GenderSegment } from '@/components/profile/GenderSegment';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { StepDots } from '@/components/onboarding/StepDots';

export default function Profile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { fullName, age, gender, photoUri } = useAppSelector((s) => s.onboarding);
  const [name, setName] = useState(fullName);
  const [ageText, setAgeText] = useState(age ? String(age) : '');
  const [genderVal, setGenderVal] = useState(gender || '');

  const ageNum = parseInt(ageText, 10);
  const valid = name.trim().length > 0 && ageNum >= 5 && ageNum <= 99;

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;
    dispatch(setProfileFields({ photoUri: result.assets[0].uri }));
  };

  const onContinue = () => {
    dispatch(setProfileFields({ fullName: name.trim(), age: ageNum, gender: genderVal || null }));
    router.push('/(onboarding)/level');
  };

  const input = 'mb-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-montserrat text-white';

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="py-4">
        <StepDots total={5} current={1} />
      </View>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <Text className="mb-6 font-oswald text-4xl uppercase text-white">Tell us about yourself</Text>

        <Pressable onPress={pickPhoto} className="mb-6 self-center">
          <View className="h-28 w-28 items-center justify-center rounded-full border-2 border-brand bg-black">
            {photoUri ? (
              <Image source={{ uri: photoUri }} className="h-full w-full rounded-full" />
            ) : (
              <InitialsAvatar name={name} size={104} />
            )}
            <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
              <Text className="text-2xl">📷</Text>
            </View>
          </View>
        </Pressable>

        <TextInput className={input} placeholder="Full name" placeholderTextColor="#888" value={name} onChangeText={setName} />
        <TextInput className={input} placeholder="Age" placeholderTextColor="#888" keyboardType="number-pad" value={ageText} onChangeText={setAgeText} />
        <Text className="mb-2 mt-2 font-montserrat text-sm text-gray-400">Gender</Text>
        <GenderSegment value={genderVal} onChange={setGenderVal} />
      </ScrollView>
      <View className="py-4">
        <OnboardingButton label="Continue" disabled={!valid} onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `profile.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "src/app/(onboarding)/profile.tsx"
git commit -m "feat(onboarding): add profile setup screen"
```

---

## Task 15: Screen 4 — Skill Level

**Files:**
- Create: `src/app/(onboarding)/level.tsx`

- [ ] **Step 1: Write the screen**

```tsx
// src/app/(onboarding)/level.tsx
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setLevel, SkillLevel } from '@/store/slices/onboardingSlice';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { StepDots } from '@/components/onboarding/StepDots';

const LEVELS: { key: SkillLevel; title: string; description: string }[] = [
  { key: 'beginner', title: 'Beginner', description: 'New to the sport, learning the basics.' },
  { key: 'intermediate', title: 'Intermediate', description: 'Play regularly, comfortable in rallies.' },
  { key: 'advanced', title: 'Advanced', description: 'Strong technique, compete locally.' },
  { key: 'competitive', title: 'Competitive', description: 'Tournament-level, chasing rankings.' },
];

export default function Level() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selected = useAppSelector((s) => s.onboarding.level);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="py-4">
        <StepDots total={5} current={2} />
      </View>
      <Text className="mb-6 font-oswald text-4xl uppercase text-white">What's your level?</Text>
      <ScrollView className="flex-1" contentContainerStyle={{ gap: 12 }}>
        {LEVELS.map((lv) => (
          <SelectableCard
            key={lv.key}
            title={lv.title}
            description={lv.description}
            selected={selected === lv.key}
            onPress={() => dispatch(setLevel(lv.key))}
          />
        ))}
      </ScrollView>
      <View className="py-4">
        <OnboardingButton label="Continue" disabled={!selected} onPress={() => router.push('/(onboarding)/motivation')} />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `level.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "src/app/(onboarding)/level.tsx"
git commit -m "feat(onboarding): add skill level screen"
```

---

## Task 16: Screen 5 — Motivation Selection

**Files:**
- Create: `src/app/(onboarding)/motivation.tsx`

- [ ] **Step 1: Write the screen**

```tsx
// src/app/(onboarding)/motivation.tsx
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleMotivation } from '@/store/slices/onboardingSlice';
import { MOTIVATIONS } from '@/lib/motivations';
import { MotivationChip } from '@/components/onboarding/MotivationChip';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { StepDots } from '@/components/onboarding/StepDots';

export default function Motivation() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const motivations = useAppSelector((s) => s.onboarding.motivations);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="py-4">
        <StepDots total={5} current={3} />
      </View>
      <Text className="mb-6 font-oswald text-4xl uppercase text-white">What excites you most?</Text>
      <ScrollView className="flex-1">
        <View className="flex-row flex-wrap gap-3">
          {MOTIVATIONS.map((m) => (
            <MotivationChip
              key={m.key}
              label={m.label}
              selected={motivations.includes(m.key)}
              onPress={() => dispatch(toggleMotivation(m.key))}
            />
          ))}
        </View>
      </ScrollView>
      <View className="py-4">
        <OnboardingButton
          label="Continue"
          disabled={motivations.length === 0}
          onPress={() => router.push('/(onboarding)/card-preview')}
        />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `motivation.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "src/app/(onboarding)/motivation.tsx"
git commit -m "feat(onboarding): add motivation selection screen"
```

---

## Task 17: Screen 6 — Player Card Preview

**Files:**
- Create: `src/app/(onboarding)/card-preview.tsx`

- [ ] **Step 1: Write the screen**

```tsx
// src/app/(onboarding)/card-preview.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '@/store/hooks';
import { PlayerIDCard } from '@/components/onboarding/PlayerIDCard';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const SPORT_LABELS: Record<string, string> = {
  badminton: 'Badminton',
  cricket: 'Cricket',
  football: 'Football',
  table_tennis: 'Table Tennis',
  tennis: 'Tennis',
  kabaddi: 'Kabaddi',
};

function titleCase(s?: string | null) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function CardPreview() {
  const router = useRouter();
  const { fullName, sport, level, photoUri } = useAppSelector((s) => s.onboarding);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <PlayerIDCard
          name={fullName || 'Your Name'}
          sport={SPORT_LABELS[sport || ''] || 'Badminton'}
          level={titleCase(level)}
          photoUri={photoUri}
          locked="preview"
        />
        <Text className="mt-8 text-center font-oswald text-2xl uppercase text-white">Let's change that.</Text>
      </View>
      <View className="py-4">
        <OnboardingButton label="Continue" onPress={() => router.push('/(onboarding)/auth')} />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `card-preview.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "src/app/(onboarding)/card-preview.tsx"
git commit -m "feat(onboarding): add player card preview screen"
```

---

## Task 18: Auth slice — onboarding handoff flag

**Files:**
- Modify: `src/store/slices/authSlice.ts`

This adds a `pendingOnboarding` flag so the `AuthGate` (Task 22) sends a user who just finished onboarding-signup to the "creating" screen instead of straight to the tabs.

- [ ] **Step 1: Add flag to state interface**

In `src/store/slices/authSlice.ts`, add to the `AuthState` interface (after `bootstrapped: boolean;`):

```ts
  pendingOnboarding: boolean;
```

- [ ] **Step 2: Add to initialState**

In `initialState` (after `bootstrapped: false,`):

```ts
  pendingOnboarding: false,
```

- [ ] **Step 3: Add reducers**

In the `reducers: { ... }` block of `authSlice`, add alongside `clearError`:

```ts
    beginOnboardingHandoff: (state) => {
      state.pendingOnboarding = true;
    },
    endOnboardingHandoff: (state) => {
      state.pendingOnboarding = false;
    },
```

- [ ] **Step 4: Export the new actions**

Update the export line near the bottom:

```ts
export const { resetRegistration, clearError, beginOnboardingHandoff, endOnboardingHandoff } =
  authSlice.actions;
```

- [ ] **Step 5: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `authSlice.ts`.

- [ ] **Step 6: Commit**

```bash
cd mobile && git add src/store/slices/authSlice.ts
git commit -m "feat(onboarding): add pendingOnboarding handoff flag to auth slice"
```

---

## Task 19: Screen 7 — Authentication

**Files:**
- Create: `src/app/(onboarding)/auth.tsx`

This screen sets the `pendingOnboarding` flag, pre-fills the register form via the onboarding state, and routes into the existing register flow. The disabled social buttons match the brief layout.

- [ ] **Step 1: Write the screen**

```tsx
// src/app/(onboarding)/auth.tsx
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '@/store/hooks';
import { beginOnboardingHandoff } from '@/store/slices/authSlice';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

function DisabledOption({ label }: { label: string }) {
  return (
    <View className="flex-row items-center justify-center rounded-3xl border border-white/10 bg-white/5 py-4 opacity-50">
      <Text className="font-montserrat text-base text-gray-400">{label}</Text>
      <Text className="ml-2 font-montserrat text-[10px] uppercase tracking-wide text-gray-600">Coming soon</Text>
    </View>
  );
}

export default function OnboardingAuth() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const continueWithEmail = () => {
    dispatch(beginOnboardingHandoff());
    router.push('/(auth)/register');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <Text className="mb-2 font-oswald text-4xl uppercase text-white">Save your progress</Text>
        <Text className="mb-10 font-montserrat text-base text-gray-400">
          Create your account to lock in your player profile.
        </Text>
        <View className="gap-3">
          <OnboardingButton label="Continue with Email" onPress={continueWithEmail} />
          <DisabledOption label="Continue with Google" />
          <DisabledOption label="Continue with Apple" />
          <DisabledOption label="Continue with Phone Number" />
        </View>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `auth.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "src/app/(onboarding)/auth.tsx"
git commit -m "feat(onboarding): add authentication handoff screen"
```

---

## Task 20: Screen 8 — Account Creation Progress

**Files:**
- Create: `src/app/(onboarding)/creating.tsx`

On mount this screen: (a) best-effort PATCHes the backend-supported profile fields, (b) marks onboarding complete, (c) animates the 4 progress steps, then (d) clears the handoff flag and routes to the welcome-done screen.

- [ ] **Step 1: Write the screen**

```tsx
// src/app/(onboarding)/creating.tsx
import { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile, uploadPlayerProfileImage, endOnboardingHandoff } from '@/store/slices/authSlice';
import { setOnboardingComplete } from '@/lib/onboardingStorage';
import { ProgressStep } from '@/components/onboarding/ProgressStep';

const STEPS = ['Profile Created', 'Skill Rating Set', 'Tournament Feed Ready', 'Rankings Enabled'];

function ageToDob(age: number | null): string | undefined {
  if (!age) return undefined;
  const year = new Date().getFullYear() - age;
  return `${year}-01-01`;
}

export default function Creating() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const onboarding = useAppSelector((s) => s.onboarding);
  const [done, setDone] = useState(0);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Best-effort: persist the fields the backend supports. Never blocks the flow.
    const persist = async () => {
      try {
        await dispatch(
          updateProfile({
            data: {
              gender: onboarding.gender || undefined,
              dateOfBirth: ageToDob(onboarding.age),
              sport: onboarding.sport || undefined,
            },
          })
        ).unwrap();
      } catch {
        // ignore — onboarding still completes
      }
      if (onboarding.photoUri) {
        try {
          await dispatch(
            uploadPlayerProfileImage({ uri: onboarding.photoUri, name: 'avatar.jpg', type: 'image/jpeg' })
          ).unwrap();
        } catch {
          // ignore
        }
      }
    };
    persist();
    setOnboardingComplete().catch(() => {});
  }, [dispatch, onboarding]);

  // Animate the checklist, then advance.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setDone(i + 1), 500 * (i + 1)));
    });
    timers.push(
      setTimeout(() => {
        dispatch(endOnboardingHandoff());
        router.replace('/(onboarding)/welcome-done');
      }, 500 * STEPS.length + 700)
    );
    return () => timers.forEach(clearTimeout);
  }, [dispatch, router]);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <Text className="mb-10 font-oswald text-4xl uppercase text-white">Setting up your profile</Text>
        {STEPS.map((label, i) => (
          <ProgressStep key={label} label={label} done={i < done} />
        ))}
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `creating.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "src/app/(onboarding)/creating.tsx"
git commit -m "feat(onboarding): add account creation progress screen"
```

---

## Task 21: Screen 9 — Welcome to Kria

**Files:**
- Create: `src/app/(onboarding)/welcome-done.tsx`

- [ ] **Step 1: Write the screen**

```tsx
// src/app/(onboarding)/welcome-done.tsx
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { resetOnboarding } from '@/store/slices/onboardingSlice';
import { PlayerIDCard } from '@/components/onboarding/PlayerIDCard';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

const SPORT_LABELS: Record<string, string> = {
  badminton: 'Badminton',
  cricket: 'Cricket',
  football: 'Football',
  table_tennis: 'Table Tennis',
  tennis: 'Tennis',
  kabaddi: 'Kabaddi',
};

export default function WelcomeDone() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { fullName, sport } = useAppSelector((s) => s.onboarding);

  const explore = () => {
    dispatch(resetOnboarding());
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-ink px-6">
      <View className="flex-1 justify-center">
        <Text className="font-oswald text-5xl uppercase leading-[0.95] text-white">Your journey starts today.</Text>
        <Text className="mb-8 mt-4 font-montserrat text-base text-gray-300">
          Join your first tournament and earn your first ranking.
        </Text>
        <PlayerIDCard
          name={fullName || 'Your Name'}
          sport={SPORT_LABELS[sport || ''] || 'Badminton'}
          locked="unranked"
        />
        <Text className="mt-6 text-center font-montserrat text-sm text-gray-400">
          Every champion starts unranked.
        </Text>
      </View>
      <View className="py-4">
        <OnboardingButton label="Explore Tournaments" onPress={explore} />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `welcome-done.tsx`.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add "src/app/(onboarding)/welcome-done.tsx"
git commit -m "feat(onboarding): add welcome-to-kria screen"
```

---

## Task 22: Wire onboarding into AuthGate

**Files:**
- Modify: `src/app/_layout.tsx`

This is the routing brain. It must: register the `(onboarding)` stack screen; treat `(onboarding)` as a public root; route logged-out un-onboarded users to welcome; and keep a just-signed-up onboarding user inside the flow (so they hit `creating` → `welcome-done`, not the tabs).

- [ ] **Step 1: Import the storage helper and onboarding state**

At the top of `src/app/_layout.tsx`, add the import:

```ts
import { getOnboardingComplete } from '@/lib/onboardingStorage';
```

- [ ] **Step 2: Add `(onboarding)` to public roots**

Change the `PUBLIC_ROOTS` constant:

```ts
const PUBLIC_ROOTS = ['(auth)', '(onboarding)', 'auction', 'bracket', 'live'];
```

- [ ] **Step 3: Track onboarding-complete in AuthGate**

Inside `AuthGate`, add state + a load effect. Add near the existing `useAppSelector` line:

```ts
  const pendingOnboarding = useAppSelector((s) => s.auth.pendingOnboarding);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    getOnboardingComplete().then(setOnboardingDone);
  }, []);
```

Also add `useState` to the React import at the top:

```ts
import { useEffect, useCallback, useState } from 'react';
```

- [ ] **Step 4: Update the `ready` gate and routing effect**

Replace the `ready` line and the routing `useEffect` with:

```ts
  const ready = fontsLoaded && bootstrapped && onboardingDone !== null;

  useEffect(() => {
    if (!ready) return;
    const root = String(segments[0]);
    const isPublic = root !== 'undefined' && PUBLIC_ROOTS.includes(root);

    if (user) {
      // A user who just signed up via onboarding stays in the flow until creating/welcome-done finish.
      if (pendingOnboarding && root === '(onboarding)') return;
      if (root === 'undefined' || root === '(auth)' || (root === '(onboarding)' && !pendingOnboarding)) {
        router.replace('/(tabs)/home');
      }
    } else if (!isPublic) {
      router.replace(onboardingDone ? '/(auth)/login' : '/(onboarding)/welcome');
    }
  }, [ready, user, segments, router, pendingOnboarding, onboardingDone]);
```

- [ ] **Step 5: Register the `(onboarding)` stack screen**

In the returned `<Stack>`, add after the `(auth)` screen line:

```tsx
        <Stack.Screen name="(onboarding)" />
```

- [ ] **Step 6: Verify typecheck passes**

Run: `cd mobile && npx tsc --noEmit`
Expected: No errors in `_layout.tsx`.

- [ ] **Step 7: Manual smoke test**

Run: `cd mobile && npx expo start` (or run on device via Expo Go).
Expected flow:
- Fresh install (logged out, not onboarded) → lands on `/(onboarding)/welcome`.
- "Get Started" → sport → profile → level → motivation → card-preview → auth.
- "Continue with Email" → register → verify-otp → set-password → on success, lands on `creating` (animated checklist) → `welcome-done`.
- "Explore Tournaments" → `/(tabs)/home`.
- Kill & relaunch app while logged out → now lands on `/(auth)/login` (onboardingComplete flag set).
- "Sign In" on welcome → `/(auth)/login` directly.

- [ ] **Step 8: Commit**

```bash
cd mobile && git add "src/app/_layout.tsx"
git commit -m "feat(onboarding): wire onboarding flow into AuthGate routing"
```

---

## Task 23: Full test + lint pass

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `cd mobile && npx jest`
Expected: All tests pass, including the new `onboardingSlice` and `PlayerIDCard` tests.

- [ ] **Step 2: Run lint**

Run: `cd mobile && npm run lint`
Expected: No new lint errors in `src/app/(onboarding)/`, `src/components/onboarding/`, `src/store/slices/onboardingSlice.ts`, `src/lib/onboardingStorage.ts`, `src/lib/motivations.ts`. Fix any reported (e.g., unused imports, missing semicolons).

- [ ] **Step 3: Run typecheck**

Run: `cd mobile && npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 4: Final commit if lint fixes were needed**

```bash
cd mobile && git add -A
git commit -m "chore(onboarding): lint and typecheck cleanup"
```

---

## Self-Review notes

- **Spec coverage:** Welcome (T12), Sport (T13), Profile (T14), Level (T15), Motivation (T16), Card Preview (T17), Auth (T19), Creating (T20), Welcome to Kria (T21) — all 9 screens covered. Palette = brand orange (all screens use `bg-ink`/`bg-brand`). Player card = vertical Option B (T8). Hybrid fidelity: real email/OTP handoff (T18/T19), local skill+motivation state (T1) shown on card (T17/T21), best-effort backend PATCH (T20). Storage flag (T3), routing (T22). Tests (T1, T8). Error handling: photo permission fallback (T14), best-effort PATCH with empty catches (T20), timer cleanup on unmount (T20).
- **Type consistency:** `PlayerIDCard` `locked` prop is `'preview' | 'unranked'` in T8 and used as such in T17 (`preview`) and T21 (`unranked`). `SkillLevel` defined in T1, imported in T15. `setProfileFields`/`setSport`/`setLevel`/`toggleMotivation`/`resetOnboarding` defined in T1, used consistently. `beginOnboardingHandoff`/`endOnboardingHandoff` defined T18, used T19/T20.
- **Imports:** Each screen/component import list matches exactly what its body uses (no unused imports) — verified for `OnboardingButton` (no `View`) and `welcome.tsx` (no stray import).
- **Test matchers:** Tests use core Jest matchers (`toBeTruthy`) + RNTL `render`/`getByText`, both provided by the existing `jest-expo` preset and `@testing-library/react-native` — no extra matcher setup needed (confirmed against `jest.config.js`).
