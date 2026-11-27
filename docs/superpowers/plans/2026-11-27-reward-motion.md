# Reward and motion layer: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player app springs, a press-down primary button, one haptic map and rolling numbers. On top of that, four once-only reward moments: match result, award reveal, rankings and knockout champion. Every number comes from the API.

**Architecture:** Reanimated 4 shared values and layout animations on the UI thread, react-native-svg badges, and expo-haptics behind one `lib/haptics.ts`.
- **Logic** (result maths, award keys, reveal choice, next-rank maths, bracket path geometry) lives in pure `lib/*.ts` functions with unit tests.
- **Screens** consume small hooks.
- **The full-screen reveal** is an RN `Modal`, as `BottomSheet` already does.
- **"Already seen"** state lives in the existing `@/lib/secureStore` wrapper.

**Tech stack:** Expo 58, React Native 0.88, expo-router, Reanimated 4.7.1, react-native-worklets 0.13, react-native-svg 15.16, expo-haptics, expo-secure-store, Jest (jest-expo) with Testing Library.

**Spec:** `mobile/docs/superpowers/specs/2026-11-27-reward-motion-design.md` (approved 27 Nov). Background: `d:\kria\GAMIFICATION-MOTION.md`. Read the spec first; this plan cites its sections as "spec §n".

## Global constraints

- **No new dependencies.** Everything uses what is installed.
- **No git.** Don't commit, stash, branch or check out. The user commits. Each task ends with a checkpoint (gates), not a commit.
- **Run everything from `d:\kria\mobile`.** Install with `npm install --legacy-peer-deps` only if needed; it shouldn't be.
- **Spring tokens, exactly:**
  - `snappy {damping:32, stiffness:400, mass:1}`
  - `bouncy {damping:17, stiffness:220, mass:1}`
  - `gentle {damping:26, stiffness:170, mass:1}`
  - `fill {damping:19, stiffness:180, mass:1}`
  - Always pass a token to `withSpring`; never call it bare.
- **Colours:** new token `colors.accentLip = '#B8411A'`. Every other colour comes from `constants/theme.ts`; no literals.
- **Reduced motion is opacity only:** fades ≤ 160ms, final values at once, haptics still fire. Every animated component checks `useReducedMotion()`.
- **UI thread:** no `setState` per frame; JavaScript runs only at a timeline's start and end.
- **One celebration per screen visit:** at most one `notificationAsync` per visit. A tap anywhere jumps a moment to its end state.
- **Text scaling:** every `Text` in new components, and the `Button`, `TabBar` and `Segmented` labels, gets `maxFontSizeMultiplier={1.3}`.
- **Copy:** no exclamation marks, no praise words, no emoji. Numbers over adjectives. The exact strings are in spec §7–§10 and in this plan's tests.
- **Haptics:** only through `lib/haptics.ts`, never `expo-haptics` directly in components.
- **Tests:** they live in `__tests__/`. Screens are `PascalCaseScreen.test.tsx`; libraries are `camelCase.test.ts`. Reanimated stays real (`jest.config.js` resolver); don't mock it globally. The `expo-secure-store` mock in `jest.setup.ts` keeps one store per test file, so use a different `meId` in each test that touches it.
- **Lint:** new and touched files must lint clean (`npx eslint <files>`). The repo total (today: 60 errors, 1 warning) must not rise.
- **Test command:** `npx jest --maxWorkers=2 <path>` (parallel runs time out on this machine).

## Review focus

Inputs the spec implies but no happy-path test covers, most likely first. Each one has a test in the task that owns the code.

1. **The host undoes the winning point and finishes the match again.** The status goes `completed → live → completed`. The moment must not replay with numbers that no longer add up. Expected: the second completion shows today's plain result. (Task 6)
2. **The screen loses focus mid-reveal** (the push-ask screen, a notification tap). Expected: the reveal closes and the award stays new, so it can play later. (Task 9)
3. **Two accounts on one phone.** Expected: "seen" state is per player, so player B still gets their own reveals. (Task 4)
4. **A champion with a bye, or a lone feeder in the bracket.** Expected: the path still draws, with a zero-length vertical run and no crash; the bye doesn't count as a win. (Task 11)
5. **A viewer in the room who isn't a claimed player** (a spectator, a guest slot, or a host who isn't playing). Expected: no moment and no career fetch. (Task 5, Task 6)

---

## File map

| File | Responsibility | Task |
|---|---|---|
| `src/constants/theme.ts` | + `spring`, + `colors.accentLip` | 1 |
| `src/lib/haptics.ts` (new) | the haptic map | 1 |
| `src/lib/motion.ts` (new) | `staggerDelay`, `enterStagger` | 1 |
| `src/lib/rollPlan.ts` (new) | digit-roll maths | 2 |
| `src/components/ui/RollNumber.tsx` (new) | rolling number | 2 |
| `src/components/ui/{Button,Tap,Segmented,Toggle}.tsx`, `navigation/TabBar.tsx` | press-down, spring release, haptics, text cap | 3 |
| `src/lib/resultMoment.ts` (new) | `buildResultMoment` | 5 |
| `src/lib/useResultMoment.ts` (new) | fetch before and after, retry, once-only | 6 |
| `src/components/room/RallyRoom.tsx`, `src/app/quick/[id].tsx` | moment UI, game-end haptic, lint | 6 |
| `src/lib/rewardSeen.ts` (new), `src/lib/launchGate.ts` (new), `src/app/_layout.tsx` | award keys and states, the launch signal | 4 |
| `src/lib/awardsView.ts`, `src/lib/homeView.ts` | `seenKeys`, `reveal` copy, `nextReveal`, `hasDot`, `totalsFrom`; export `MONTHS` | 7 |
| `src/components/AwardBadge.tsx`, `src/components/rewards/AwardReveal.tsx` (new) | shine count; the reveal overlay | 8 |
| `src/lib/useAwardReveal.ts` (new), `src/app/(tabs)/{home,awards}.tsx`, `src/components/awards/{AwardGrid,AwardSheet}.tsx` | reveal wiring, "New" dots | 9 |
| `src/lib/competeView.ts`, `src/components/compete/Rankings.tsx`, `src/app/(tabs)/compete.tsx` | next-rank line, pop, scroll-to-you, ghost rows | 10 |
| `src/lib/knockoutRoom.ts`, `src/lib/bracket.ts`, `src/components/Bracket.tsx`, `src/app/knockout/[id].tsx` | champion path and moment | 11 |
| `src/components/ui/BottomSheet.tsx`, `src/app/(tabs)/events.tsx` | lint fixes; virtualised Events list | 12 |
| `mobile/DESIGN.md` | v1.2 | 13 |

---

### Task 1: Motion tokens, haptic map and stagger helper

**Files:**
- Modify: `src/constants/theme.ts:64-70` (add `spring` after `ease`); `colors` (add `accentLip`)
- Create: `src/lib/haptics.ts`, `src/lib/motion.ts`
- Test: `__tests__/haptics.test.ts`, `__tests__/motion.test.ts`

**Interfaces:**
- Produces:
  - `spring: { snappy; bouncy; gentle; fill }` (each `{ damping: number; stiffness: number; mass: number }`)
  - `colors.accentLip`
  - `haptics: { point(); gameEnd(); press(); select(); win(); loss(); award(); mint(); tick() }`, each `() => void`, fire-and-forget
  - `staggerDelay(i: number): number`
  - `enterStagger(i: number, reduced: boolean)`, which returns a Reanimated entering animation

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/haptics.test.ts
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()), selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Soft: 'soft' }, NotificationFeedbackType: { Success: 'success' },
}));
import * as Haptics from 'expo-haptics';
import { haptics } from '@/lib/haptics';
test.each([
  ['point', 'impactAsync', 'light'], ['gameEnd', 'impactAsync', 'medium'], ['press', 'impactAsync', 'light'],
  ['loss', 'impactAsync', 'soft'], ['mint', 'impactAsync', 'medium'], ['tick', 'impactAsync', 'light'],
  ['win', 'notificationAsync', 'success'], ['award', 'notificationAsync', 'success'],
] as const)('%s calls %s(%s)', (fn, api, arg) => {
  haptics[fn]();
  expect(Haptics[api]).toHaveBeenLastCalledWith(arg);
});
test('select calls selectionAsync', () => { haptics.select(); expect(Haptics.selectionAsync).toHaveBeenCalled(); });
test('a failing haptic is swallowed', async () => {
  (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('no motor'));
  expect(() => haptics.point()).not.toThrow();
  await Promise.resolve();
});

// __tests__/motion.test.ts
import { staggerDelay } from '@/lib/motion';
import { colors, spring } from '@/constants/theme';
test('stagger is 40ms apart and stops at the sixth row', () => {
  expect([0, 1, 3, 5, 6, 40].map(staggerDelay)).toEqual([0, 40, 120, 200, 200, 200]);
});
test('spring tokens and lip colour match the spec', () => {
  expect(spring).toEqual({
    snappy: { damping: 32, stiffness: 400, mass: 1 }, bouncy: { damping: 17, stiffness: 220, mass: 1 },
    gentle: { damping: 26, stiffness: 170, mass: 1 }, fill: { damping: 19, stiffness: 180, mass: 1 },
  });
  expect(colors.accentLip).toBe('#B8411A');
});
```

- [ ] **Step 2: Run the tests and confirm they fail.** `npx jest --maxWorkers=2 __tests__/haptics.test.ts __tests__/motion.test.ts`. Expected: FAIL (modules or exports missing).
- [ ] **Step 3: Implement.**
  - `haptics` calls the `expo-haptics` functions shown in the test, each with `.catch(() => {})`. Add a header comment with the spec §6 A2 rule: "at most one notificationAsync per screen visit; never in a loop".
  - `staggerDelay(i) = Math.min(i, 5) * 40`.
  - `enterStagger(i, reduced)`: when `reduced`, return `FadeIn.duration(160)`. Otherwise return `FadeInUp.duration(220).delay(staggerDelay(i)).easing(ease.enter)` with `.withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })`.
- [ ] **Step 4: Run the tests and confirm they pass.** Same command. Expected: PASS.
- [ ] **Step 5: Checkpoint.** `npx tsc --noEmit` is clean, and `npx eslint src/lib/haptics.ts src/lib/motion.ts src/constants/theme.ts` reports 0 problems. No commit.

---

### Task 2: `rollPlan` and `RollNumber`

**Files:**
- Create: `src/lib/rollPlan.ts`, `src/components/ui/RollNumber.tsx`
- Test: `__tests__/rollPlan.test.ts`, `__tests__/RollNumber.test.tsx`

**Interfaces:**
- Produces:
  - `type RollCell = { char: string; roll?: { start: number; end: number } }`
  - `rollPlan(from: string, to: string): RollCell[] | null` (null means render `to` statically)
  - `RollNumber({ from, to, style, delay = 0, play }: { from: string; to: string; style: TextStyle; delay?: number; play: boolean })`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/rollPlan.test.ts
import { rollPlan } from '@/lib/rollPlan';
test('increase rolls up, wrapping past 9', () => {
  expect(rollPlan('58.3%', '61.5%')).toEqual([
    { char: '6', roll: { start: 5, end: 6 } }, { char: '1', roll: { start: 8, end: 11 } }, { char: '.' },
    { char: '5', roll: { start: 3, end: 5 } }, { char: '%' },
  ]);
  expect(rollPlan('49', '50')).toEqual([{ char: '5', roll: { start: 4, end: 5 } }, { char: '0', roll: { start: 9, end: 10 } }]);
});
test('decrease rolls down', () => {
  expect(rollPlan('58.3%', '53.8%')).toEqual([
    { char: '5' }, { char: '3', roll: { start: 18, end: 13 } }, { char: '.' }, { char: '8', roll: { start: 13, end: 8 } }, { char: '%' },
  ]);
});
test('equal digits are static', () => { expect(rollPlan('12', '12')).toEqual([{ char: '1' }, { char: '2' }]); });
test('different lengths or a non-number "from" render statically', () => {
  expect(rollPlan('9', '10')).toBeNull();
  expect(rollPlan('—', '61.5%')).toBeNull();
});

// __tests__/RollNumber.test.tsx
import { render, screen } from '@testing-library/react-native';
import { RollNumber } from '@/components/ui/RollNumber';
test('announces the final value and caps text scaling', () => {
  render(<RollNumber from="58.3%" to="61.5%" style={{}} play />);
  expect(screen.getByLabelText('61.5%')).toBeTruthy();
  screen.UNSAFE_getAllByType(require('react-native').Text).forEach((t) => expect(t.props.maxFontSizeMultiplier).toBe(1.3));
});
test('a static value renders as plain text', () => {
  render(<RollNumber from="—" to="100.0%" style={{}} play />);
  expect(screen.getByText('100.0%')).toBeTruthy();
});
```

- [ ] **Step 2: Run and confirm they fail.** `npx jest --maxWorkers=2 __tests__/rollPlan.test.ts __tests__/RollNumber.test.tsx`.
- [ ] **Step 3: Implement `rollPlan`.** Return null when the lengths differ or `parseFloat(from)` is NaN. Direction is `parseFloat(to) >= parseFloat(from)`.

  ```ts
  // per changed digit a→b: increase → start a, end b > a ? b : b + 10
  //                        decrease → start a + 10, end b < a ? b + 10 : b
  ```

- [ ] **Step 4: Implement `RollNumber`.**
  - The root `View` has `accessible` and `accessibilityLabel={to}`.
  - Each rolling cell is a one-line-high clip holding a column of "01234567890123456789". Its `translateY = -index × lineHeight` animates from `start` to `end` over 520ms (`ease.standard`) after `delay`, when `play` is set.
  - Static characters are plain `Text`.
  - **Reduced motion:** a 160ms crossfade to `to`.
  - The line height comes from `style.lineHeight ?? style.fontSize`.
- [ ] **Step 5: Run and confirm they pass,** then checkpoint: `tsc` clean and eslint clean on both new files.

---

### Task 3: Press-down button, spring release, selection haptics and text cap

**Files:**
- Modify: `src/components/ui/Button.tsx`, `src/components/ui/Tap.tsx:24`, `src/components/ui/Segmented.tsx`, `src/components/ui/Toggle.tsx` (haptic call), `src/components/navigation/TabBar.tsx`
- Test: `__tests__/PressStyles.test.tsx`

**Interfaces:**
- Consumes: `spring`, `colors.accentLip` and `haptics` (Task 1).
- Produces: no API change. Primary `Button` renders a `testID="button-lip"` view; the outer height is unchanged and the face is `height − 4`.

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/PressStyles.test.tsx
jest.mock('@/lib/haptics', () => ({ haptics: { press: jest.fn(), select: jest.fn() } }));
import { fireEvent, render, screen } from '@testing-library/react-native';
import { haptics } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
beforeEach(() => jest.clearAllMocks());
test('primary sits on a lip and fires the press haptic on press-in', () => {
  render(<Button label="Start match" onPress={() => {}} />);
  expect(screen.getByTestId('button-lip')).toBeTruthy();
  fireEvent(screen.getByLabelText('Start match'), 'pressIn');
  expect(haptics.press).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Start match').props.maxFontSizeMultiplier).toBe(1.3);
});
test('secondary and disabled primary have no lip and no haptic', () => {
  render(<><Button variant="secondary" label="Invite" onPress={() => {}} /><Button label="Pay" disabled onPress={() => {}} /></>);
  expect(screen.queryByTestId('button-lip')).toBeNull();
  fireEvent(screen.getByLabelText('Invite'), 'pressIn');
  expect(haptics.press).not.toHaveBeenCalled();
});
test('segmented fires select only on a change', () => {
  const onChange = jest.fn();
  render(<Segmented options={[{ key: 'a', label: 'Singles' }, { key: 'b', label: 'Doubles' }]} value="a" onChange={onChange} />);
  fireEvent.press(screen.getByText('Singles'));
  expect(haptics.select).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Doubles'));
  expect(haptics.select).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Doubles').props.maxFontSizeMultiplier).toBe(1.3);
});
```

- [ ] **Step 2: Run and confirm they fail.** `npx jest --maxWorkers=2 __tests__/PressStyles.test.tsx`.
- [ ] **Step 3: `Button`.** For primary and not disabled:
  - A lip `View` (`testID="button-lip"`, `accentLip`, `radius.button`) fills the bottom 4px of the outer box. The face is an `Animated.View` with height `outer − 4`.
  - **Press-in:** `translateY` → 4 over `motion.fast` (`ease.standard`), plus `haptics.press()`.
  - **Release:** `withSpring(0, spring.snappy)`.
  - **Reduced motion:** opacity 0.8 while held, no travel.
  - **Others:** keep `Tap` as now.
  - The label gets `maxFontSizeMultiplier={1.3}`.
- [ ] **Step 4: `Tap`.** The release becomes `withSpring(1, spring.snappy)`.
- [ ] **Step 5: `Segmented`.** The thumb x and width use `withSpring(…, spring.snappy)`, still instant on first layout and under reduced motion. Call `haptics.select()` when the key differs from `value`. Labels get `maxFontSizeMultiplier={1.3}`.
- [ ] **Step 6: `TabBar` and `Toggle`.**
  - `TabBar`: a press on a different tab calls `haptics.select()`, and labels get `maxFontSizeMultiplier={1.3}`.
  - `Toggle`: replace `Haptics.selectionAsync()` with `haptics.select()`.
- [ ] **Step 7: Run, confirm the tests pass, and checkpoint.**
  - Run this test, plus every existing test that renders `Button`, `Segmented` or `TabBar`: `npx jest --maxWorkers=2 -t "" __tests__` filtered by `rg -l "Button|Segmented|TabBar" __tests__`. All pass.
  - `tsc` is clean, and the touched files lint clean.

---

### Task 4: Award keys, the seen store and the launch gate

**Files:**
- Create: `src/lib/rewardSeen.ts`, `src/lib/launchGate.ts`
- Modify: `src/app/_layout.tsx` (call `markLaunchDone()` in `endIntro`)
- Test: `__tests__/rewardSeen.test.ts`, `__tests__/launchGate.test.ts`

**Interfaces:**
- Consumes: `getItem` and `setItem` (`@/lib/secureStore`), `Title` (`@/api/profileApi`), `Honor` (`@/lib/badges`).
- Produces:

```ts
export type RewardState = 'new' | 'announced' | 'opened';
export type SeenSource = { kind: 'achievement'; id: string } | { kind: 'title'; title: Title } | { kind: 'honour'; honor: Honor };
export function awardSeenKey(src: SeenSource): string | null;
export function loadStates(meId: string, keys: string[]): Promise<Map<string, RewardState>>;
export function markAnnounced(meId: string, keys: string[]): Promise<void>;
export function markOpened(meId: string, keys: string[]): Promise<void>;
export function seedIfNeeded(meId: string, earnedKeys: string[]): Promise<boolean>;
export function resetRewardCache(): void; // tests and sign-out
// launchGate.ts
export function markLaunchDone(): void;
export function whenLaunchDone(): Promise<void>;
export function isLaunchDone(): boolean;
```

- [ ] **Step 1: Write the failing tests**

```ts
test('keys', () => {
  expect(awardSeenKey({ kind: 'achievement', id: 'matches-50' })).toBe('ach_matches-50');
  expect(awardSeenKey({ kind: 'title', title: { place: 'winner', tournamentId: 't1', categoryId: 'c1' } })).toBe('title_t1_c1_winner');
  expect(awardSeenKey({ kind: 'title', title: { place: 'winner' } })).toBeNull();
  expect(awardSeenKey({ kind: 'honour', honor: { title: 'Best Player', badge: 'season-mvp', tournamentId: 't9' } })).toBe('hon_season-mvp_t9_Best_Player');
  expect(awardSeenKey({ kind: 'honour', honor: { title: 'Won Sunday Smash', badge: 'knockout-winner', ref: 'k7' } })).toBe('ko_k7');
});
test('sanitised and capped', () => {
  const k = awardSeenKey({ kind: 'honour', honor: { title: 'MVP — Round #1 '.repeat(20), badge: 'season-mvp', tournamentId: 't' } })!;
  expect(k).toMatch(/^[A-Za-z0-9._-]+$/);
  expect(k.length).toBeLessThanOrEqual(120);
});
test('new → announced → opened', async () => {
  await markAnnounced('p1', ['ach_a']);
  expect((await loadStates('p1', ['ach_a', 'ach_b'])).get('ach_a')).toBe('announced');
  expect((await loadStates('p1', ['ach_b'])).get('ach_b')).toBe('new');
  await markOpened('p1', ['ach_a']);
  resetRewardCache();
  expect((await loadStates('p1', ['ach_a'])).get('ach_a')).toBe('opened'); // read back from the store
});
test('state is per player', async () => {
  await markOpened('p2', ['ach_x']);
  expect((await loadStates('p3', ['ach_x'])).get('ach_x')).toBe('new');
});
test('seeding opens everything earned, once', async () => {
  expect(await seedIfNeeded('p4', ['ach_a', 'ko_1'])).toBe(true);
  expect([...(await loadStates('p4', ['ach_a', 'ko_1'])).values()]).toEqual(['opened', 'opened']);
  expect(await seedIfNeeded('p4', ['ach_a'])).toBe(false);
});
// launchGate.test.ts, with jest.isolateModules per test:
test('whenLaunchDone resolves after markLaunchDone', async () => { /* isLaunchDone() false → markLaunchDone() → await whenLaunchDone(); isLaunchDone() true */ });
```

- [ ] **Step 2: Run and confirm they fail.**
- [ ] **Step 3: Implement.**
  - **Store keys:** `ann_${meId}_${key}`, `seen_${meId}_${key}` and `seen_seeded_${meId}`, each with value `'1'`.
  - **Sanitise:** `s.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120)`.
  - **Key formats:**
    - honours that aren't knockout wins: `hon_${badge}_${ref ?? tournamentId ?? ''}_${title}`
    - knockout wins: `badge === 'knockout-winner'` with `ref` → `ko_${ref}`; with no `ref`, null
  - **Session cache:** a `Map<meId, Map<key, RewardState>>`. `markOpened` also writes `ann_`.
  - **`launchGate`:** a module-level promise and flag.
- [ ] **Step 4: `_layout.tsx`.** In `endIntro`, call `markLaunchDone()` before `setIntroDone`. If `introDone` starts out true, call it on mount.
- [ ] **Step 5: Run, confirm they pass, checkpoint** (`tsc`, eslint on the three files).

---

### Task 5: `buildResultMoment`

**Files:**
- Create: `src/lib/resultMoment.ts`
- Test: `__tests__/resultMoment.test.ts`

**Interfaces:**
- Consumes: `CareerProfile`, `SportSummary` and `Achievement` (`@/api/career`), `QuickMatch` (`@/api/quickMatch`), `RANK_MIN` (`@/lib/homeView`).
- Produces:

```ts
export type MomentOutcome = 'win' | 'loss' | 'tie' | 'nr';
export interface MomentBar { label: string; from: number; to: number; target: number } // counts, not fractions
export interface ResultMoment {
  outcome: MomentOutcome; sport: string;
  winRate: { from: string; to: string };            // "58.3%"; "—" when from-decided is 0
  decided: { from: string; to: string };
  next: { remaining: number; unit: 'ranked' | 'matches' | 'wins' | 'sports'; target: number } | null; // the Next tile
  bar: MomentBar | null;                            // the progress line
  qualified: boolean;
  minted: Achievement | null;
  mintNext: number | null;                          // the next higher target of the minted kind
}
export function buildResultMoment(before: CareerProfile, after: CareerProfile, match: QuickMatch, meId: string): ResultMoment | null;
export function viewerSide(match: QuickMatch, meId: string): 0 | 1 | null; // index of the side holding a claimed slot for meId
```

**Plan decision (consistent with spec §7's 1100ms beat):**
- `bar` shows the **minted** achievement filling to 100% when there is one.
- Otherwise it shows the rank threshold while `after.decided < RANK_MIN`.
- Otherwise it shows the nearest unearned achievement.
- It is `null` when `qualified` and nothing was minted, because the qualify line replaces it.
- `next` is always the post-match nearest goal: the rank threshold first, then the unearned achievement with the smallest `target − progress` (ties in server order).

- [ ] **Step 1: Write the failing tests.** Fixtures:
  - `sum(sport, played, decided, won)` builds a `SportSummary`, with `lost = decided − won`, `tied 0`, `noResult = played − decided`, `winRate = won/decided || 0`.
  - `prof(sports, achievements)` builds a profile.
  - `match` is a badminton `QuickMatch`. `sides[0].slots = [{slotId:'a', playerId:'me', displayName:'Asha'}]` and `sides[1].slots = [{slotId:'b', playerId:'p2', displayName:'Dev'}]`.
  - `ach(id, label, progress, target)` builds an achievement, with `earned` = progress ≥ target.

```ts
const M50 = (p: number) => ach('matches-50', 'Play 50 matches', p, 50);
const M100 = (p: number) => ach('matches-100', 'Play 100 matches', p, 100);
test('win that mints 50 matches', () => {
  const r = buildResultMoment(prof([sum('badminton', 12, 12, 7)], [M50(49), M100(49)]),
    prof([sum('badminton', 13, 13, 8)], [M50(50), M100(50)]), { ...match, outcome: 'side1' }, 'me')!;
  expect(r.outcome).toBe('win');
  expect(r.winRate).toEqual({ from: '58.3%', to: '61.5%' });
  expect(r.decided).toEqual({ from: '12', to: '13' });
  expect(r.minted?.id).toBe('matches-50');
  expect(r.mintNext).toBe(100);
  expect(r.bar).toEqual({ label: 'Play 50 matches', from: 49, to: 50, target: 50 });
  expect(r.next).toEqual({ remaining: 50, unit: 'matches', target: 100 });
  expect(r.qualified).toBe(false);
});
test('loss', () => {
  const r = buildResultMoment(prof([sum('badminton', 12, 12, 7)], [M50(38)]), prof([sum('badminton', 13, 13, 7)], [M50(39)]), { ...match, outcome: 'side2' }, 'me')!;
  expect(r.outcome).toBe('loss');
  expect(r.winRate.to).toBe('53.8%');
  expect(r.bar).toEqual({ label: 'Play 50 matches', from: 38, to: 39, target: 50 });
});
test('tie counts as decided, no win', () => {
  expect(buildResultMoment(prof([sum('badminton', 12, 12, 7)], []), prof([sum('badminton', 13, 13, 7)], []), { ...match, outcome: 'tied' }, 'me')!.outcome).toBe('tie');
});
test('no result: decided unchanged', () => {
  const r = buildResultMoment(prof([sum('badminton', 12, 12, 7)], []), prof([sum('badminton', 13, 12, 7)], []), { ...match, outcome: 'no_result' }, 'me')!;
  expect(r.outcome).toBe('nr');
  expect(r.decided).toEqual({ from: '12', to: '12' });
});
test('numbers that do not add up give null', () => {
  expect(buildResultMoment(prof([sum('badminton', 12, 12, 7)], []), prof([sum('badminton', 14, 14, 8)], []), { ...match, outcome: 'side1' }, 'me')).toBeNull();
});
test('first decided match in the sport', () => {
  const r = buildResultMoment(prof([], []), prof([sum('badminton', 1, 1, 1)], []), { ...match, outcome: 'side1' }, 'me')!;
  expect(r.winRate).toEqual({ from: '—', to: '100.0%' });
  expect(r.next).toEqual({ remaining: 4, unit: 'ranked', target: 5 });
  expect(r.bar).toEqual({ label: 'Decided matches', from: 0, to: 1, target: 5 });
});
test('crossing the rank threshold replaces the bar with the qualify line', () => {
  const r = buildResultMoment(prof([sum('badminton', 4, 4, 2)], [M50(4)]), prof([sum('badminton', 5, 5, 3)], [M50(5)]), { ...match, outcome: 'side1' }, 'me')!;
  expect(r.qualified).toBe(true);
  expect(r.bar).toBeNull();
  expect(r.next).toEqual({ remaining: 45, unit: 'matches', target: 50 });
});
test('nothing left to aim for', () => {
  const done = [ach('wins-25', 'Win 25 matches', 25, 25)];
  expect(buildResultMoment(prof([sum('badminton', 30, 30, 26)], done), prof([sum('badminton', 31, 31, 27)], done), { ...match, outcome: 'side1' }, 'me')!.next).toBeNull();
});
test('viewer not holding a claimed slot gets null', () => {
  expect(buildResultMoment(prof([], []), prof([], []), { ...match, outcome: 'side1' }, 'spectator')).toBeNull();
  expect(viewerSide({ ...match, sides: [{ ...match.sides[0], slots: [{ slotId: 'g', displayName: 'Guest' }] }, match.sides[1]] }, 'me')).toBeNull();
});
```

- [ ] **Step 2: Run and confirm they fail.** `npx jest --maxWorkers=2 __tests__/resultMoment.test.ts`.
- [ ] **Step 3: Implement.**
  - A missing sport summary in `before` counts as zeros.
  - **The consistency check (spec §7):**
    - `decidedThis = outcome in ['side1', 'side2', 'tied']`
    - `youWon = outcome === ['side1', 'side2'][viewerSide]`
    - require `after.decided === before.decided + (decidedThis ? 1 : 0)` and `after.won === before.won + (youWon ? 1 : 0)`
  - **Formatting:** win rate is `(won / decided × 100).toFixed(1) + '%'`, or '—' when decided is 0.
  - **The `unit` of an achievement** is its id prefix (`matches`, `wins`, `sports`).
  - **`minted`** is the first achievement (server order) with `earned` false before and true after.
  - **`mintNext`** is the smallest target of the same prefix greater than the minted target, else null.
- [ ] **Step 4: Run, confirm they pass, checkpoint** (`tsc` clean, eslint clean).

---

### Task 6: `useResultMoment`, the moment UI in `RallyDone`, the game-end haptic and RallyRoom lint

**Files:**
- Create: `src/lib/useResultMoment.ts`
- Modify:
  - `src/components/room/RallyRoom.tsx` (`RallyDone` at :119; swipe haptic at :64; lint at :60, :68, :84, :138)
  - `src/app/quick/[id].tsx` (`RallyDone` call at :199; add the hook)
- Test: `__tests__/useResultMoment.test.tsx`, `__tests__/QuickMatchScreen.test.tsx` (extend), `__tests__/RallyDone.test.tsx`

**Interfaces:**
- Consumes:
  - `buildResultMoment`, `viewerSide` (Task 5)
  - `RollNumber` (Task 2)
  - `haptics`, `spring` (Task 1)
  - `getCareerProfile` (`@/api/career`)
  - `markOpened` (Task 4)
  - `AwardBadge` with `shine={1}` (Task 8). Until Task 8 lands, pass `shine={1}` and accept today's loop. Task 8 makes it run once.
- Produces:
  - `useResultMoment({ match, meId, suppress }: { match: QuickMatch | null; meId: string; suppress: boolean }): { moment: ResultMoment | null; play: boolean }`
  - `RallyDone({ match, moment, play }: { match: QuickMatch; moment?: ResultMoment | null; play?: boolean })`

**Plan decision:**
- The hook detects `live → completed` itself, with a ref written only inside its effect. That keeps it lint-clean.
- The screen's existing `prevStatus` effect stays as it is, and only drives the knockout-host redirect.
- `suppress = Boolean(match?.knockoutId && host)`, so the redirect wins (spec §7).

- [ ] **Step 1: Write the failing hook tests.** Use `renderHook` (Testing Library) and `jest.useFakeTimers()`. Mock `@/api/career`'s `getCareerProfile`.

```tsx
test('fetches before while live, after on completion, and plays once', async () => {
  // getCareerProfile resolves BEFORE first, then AFTER (consistent: decided +1, won +1)
  const { result, rerender } = renderHook((p) => useResultMoment(p), { initialProps: { match: live, meId: 'me', suppress: false } });
  await waitFor(() => expect(getCareerProfile).toHaveBeenCalledTimes(1));
  rerender({ match: { ...live, status: 'completed', outcome: 'side1' }, meId: 'me', suppress: false });
  await waitFor(() => expect(result.current.moment?.outcome).toBe('win'));
  expect(result.current.play).toBe(true);
  expect(markOpened).toHaveBeenCalledWith('me', ['ach_matches-50']); // mock '@/lib/rewardSeen'; the fixtures mint matches-50 as in Task 5
});
test('retries once after 1.5s when the numbers do not add up yet', async () => {
  // second call STALE (= before), third call AFTER
  // … rerender to completed; act(() => jest.advanceTimersByTime(1500)); expect moment set; getCareerProfile called 3 times
});
test('gives up after the retry: no moment', async () => { /* both after-calls stale → moment null, 3 calls */ });
test('a match opened already completed never fetches and has no moment', () => {
  renderHook(() => useResultMoment({ match: { ...live, status: 'completed', outcome: 'side1' }, meId: 'me', suppress: false }));
  expect(getCareerProfile).not.toHaveBeenCalled();
});
test('spectator, cricket, or suppress: no fetch, no moment', () => { /* meId 'nobody'; sport 'cricket'; suppress true */ });
test('undo then a second completion does not replay', async () => {
  // completed (moment plays) → live → completed: moment becomes null and stays null
});
```

- [ ] **Step 2: Run and confirm they fail.** `npx jest --maxWorkers=2 __tests__/useResultMoment.test.tsx`.
- [ ] **Step 3: Implement `useResultMoment`.**
  - **Eligibility:** `meId`, `viewerSide(match, meId) !== null`, a rally sport (`badminton`/`table_tennis`), and `!suppress`.
  - **Before:** fetch once when eligible and the status is `waiting` or `live`.
  - **After:** on a `live → completed` change with "before" present, fetch "after" and run `buildResultMoment`. On null, retry once after 1500ms. Use `setTimeout`, cleared on unmount.
  - **Played once:** a ref marks it played. Once played, or once the status leaves `completed`, the moment is null. `play` is true only for the instance that produced it.
  - **Minted milestone:** when the moment has `minted`, call `markOpened(meId, ['ach_' + minted.id])` (fire-and-forget), so Home and Awards don't reveal it again (spec C3).
  - All `setState` happens in promise callbacks or timers, never synchronously in an effect body.
- [ ] **Step 4: Write the failing UI tests.**

```tsx
// __tests__/RallyDone.test.tsx: render RallyDone with a fixture match (side1 won 2–1) and the win moment from Task 5
test('shows chip, tiles, bar and mint for a win', () => {
  expect(screen.getByText('W')).toBeTruthy();
  expect(screen.getByText('Win rate')).toBeTruthy();
  expect(screen.getByLabelText('61.5%')).toBeTruthy();
  expect(screen.getByText('was 58.3%')).toBeTruthy();
  expect(screen.getByText('+1 this match')).toBeTruthy();
  expect(screen.getByText('50 more')).toBeTruthy();
  expect(screen.getByText('to 100 matches')).toBeTruthy();
  expect(screen.getByText('Play 50 matches')).toBeTruthy();
  expect(screen.getByText('Milestone · earned in this match')).toBeTruthy();
  expect(screen.getByText('50 matches played')).toBeTruthy();
  expect(screen.getByText('Next: 100.')).toBeTruthy();
});
test('qualify line replaces the bar', () => {
  // moment with qualified: true and bar null, sport badminton
  expect(screen.getByText("You've reached 5 decided matches in badminton. You'll appear in the rankings within a few minutes.")).toBeTruthy();
});
test('no moment renders today\'s result only', () => { /* moment null → no 'Win rate' */ });
test('a game ending fires gameEnd once', () => { /* render RallyLive with 1 finished game, rerender with 2 → haptics.gameEnd called once */ });
// QuickMatchScreen.test.tsx: mock '@/lib/useResultMoment' → { moment: winMoment, play: false } and assert 'Win rate' is shown for a completed rally match; → null shows none.
```

- [ ] **Step 5: Implement the UI** per spec §7. **What renders:**
  - The chip ('W'/'L'/'T'/'NR'), then today's headline and games.
  - Tiles: labels `Win rate` / `Decided` / `Next`.
  - Sub-lines:
    - Win rate: `was ${from}`, or `first decided match` when `from === '—'`
    - Decided: `+1 this match`, or `No result: not counted` for 'nr'
    - Next: `to get ranked`, or `to ${target} matches|wins|sports`
  - The Next tile value is `${remaining} more`, and the tile is left out when `next` is null.
  - The bar row: `bar.label`, then `<RollNumber from={String(bar.from)} to={String(bar.to)}/> of ${bar.target}`.
  - The qualify line (exact copy above). For 'table_tennis' use `sportName(sport).toLowerCase()`, so it reads "table tennis".
  - The mint row: a 96px coin, label `Milestone · earned in this match`, title `${minted.target} matches played` / `${target} wins` / `${target} sports played`, then `Next: ${mintNext}.` when set.
  - Today's credit line last.

  **Timeline** (spec §7 table): only when `play` is set and reduced motion is off. Otherwise everything renders at its final state.
  - Delays: 0, 120 + 40·i, 360, 700, 880, 1100, 1150, 1670, then credit at 1000 or 1700.
  - **Losses:** timing fades instead of `gentle`.
  - **Haptics:** at 0, `win()` or `loss()`. The bar's `tick()` fires only when `bar.to === bar.target`. The mint fires `mint()` if the outcome is 'win', else `award()`.
  - **Skip:** a `Pressable` over the result area sets every shared value to its final value.
- [ ] **Step 6: `RallyRoom` details.**
  - Swipe haptic → `haptics.point()`.
  - `RallyLive` fires `haptics.gameEnd()` when `finishedGames(match).length` increases (detect in an effect against a ref written in that effect).
  - **Lint:**
    - move `live.current = …` into `useLayoutEffect`
    - create the PanResponder with `useState(() => PanResponder.create(…))[0]`
    - escape the apostrophe at :138
- [ ] **Step 7: Wire `quick/[id].tsx`.** Call `const { moment, play } = useResultMoment({ match, meId, suppress: Boolean(match?.knockoutId && host) })` and pass both to `RallyDone`.
- [ ] **Step 8: Run all three test files and confirm they pass, then checkpoint.** `tsc` is clean, and `npx eslint src/components/room/RallyRoom.tsx src/lib/useResultMoment.ts src/lib/resultMoment.ts "src/app/quick/[id].tsx"` reports 0 problems.

---

### Task 7: Award identity, reveal copy, `nextReveal` and `hasDot`

**Files:**
- Modify: `src/lib/awardsView.ts`; `src/lib/homeView.ts` (export `MONTHS`)
- Test: `__tests__/awardsView.test.ts` (extend)

**Interfaces:**
- Consumes: `awardSeenKey` and `RewardState` (Task 4).
- Produces: new fields on `Award`, and new functions:

```ts
// added to Award:
seenKeys: string[];                    // [] for locked and legacy items
awardedAt?: string;                    // titles and honours
reveal?: { label: string; title: string; line: string; prevTarget?: number; nextTarget?: number }; // earned items only
// new:
export function totalsFrom(sports: SportSummary[]): MilestoneTotals;
export function ordinal(n: number): string; // 1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 101st 111th
export function nextReveal(a: Pick<ReturnType<typeof buildAwards>, 'titles' | 'honours' | 'knockouts' | 'milestones'>, states: Map<string, RewardState>):
  { award: Award; key: string; batch: string[] } | null;
export function hasDot(award: Award, states: Map<string, RewardState>): boolean; // any key not 'opened'
```

- [ ] **Step 1: Write the failing tests** (extend `__tests__/awardsView.test.ts`):

```ts
test('seenKeys and reveal copy per family', () => {
  const a = buildAwards({
    titles: [{ place: 'winner', tournamentId: 't1', categoryId: 'c1', tournamentName: 'Kria City Open 2026', categoryName: "Women's singles", awardedAt: '2026-11-24T10:00:00Z' }],
    honors: [{ title: 'Best Player', badge: 'season-mvp', tournamentId: 't1', eventName: 'Kria City Open 2026', awardedAt: '2026-11-20T10:00:00Z' },
             { title: 'Won Sunday Smash', badge: 'knockout-winner', ref: 'k1', eventName: 'Sunday Smash', sport: 'badminton' },
             { title: 'Won Friday Rally', badge: 'knockout-winner', ref: 'k2', eventName: 'Friday Rally', sport: 'badminton' }],
    achievements: [ach('matches-50', 'Play 50 matches', 50, 50), ach('matches-100', 'Play 100 matches', 50, 100)],
    knockouts: [], totals: { played: 50, won: 30, sports: 1 },
  });
  expect(a.titles[0].seenKeys).toEqual(['title_t1_c1_winner']);
  expect(a.titles[0].reveal).toEqual({ label: 'Title · Winner', title: 'Kria City Open 2026', line: "Women's singles. Awarded 24 Nov 2026." });
  expect(a.honours[0].reveal).toEqual({ label: 'Honour', title: 'Best Player', line: 'Kria City Open 2026 · Nov 2026' });
  expect(a.knockouts[0].seenKeys).toEqual(['ko_k1', 'ko_k2']);
  expect(a.knockouts[0].reveal).toEqual({ label: 'Knockout winner', title: 'Friday Rally', line: 'Your 2nd knockout win.' });
  const m50 = a.milestones.find((m) => m.key === 'matches-50')!;
  expect(m50.seenKeys).toEqual(['ach_matches-50']);
  expect(m50.reveal).toEqual({ label: 'Milestone', title: '50 matches played', line: 'Next: 100.', nextTarget: 100 });
  expect(a.milestones.find((m) => m.key === 'matches-100')!.seenKeys).toEqual([]);
});
test('nextReveal: title beats honour beats knockout beats milestone; the batch is every new key', () => {
  const states = new Map<string, RewardState>(); // all new
  const r = nextReveal(a, states)!;
  expect(r.key).toBe('title_t1_c1_winner');
  expect(r.batch.sort()).toEqual(['ach_matches-50', 'hon_season-mvp_t1_Best_Player', 'ko_k1', 'ko_k2', 'title_t1_c1_winner'].sort());
});
test('announced keys are never revealed again but keep the dot; opened clears it', () => {
  const states = new Map<string, RewardState>([['title_t1_c1_winner', 'announced']]);
  expect(nextReveal(a, states)!.key).toBe('hon_season-mvp_t1_Best_Player');
  expect(hasDot(a.titles[0], states)).toBe(true);
  expect(hasDot(a.titles[0], new Map([['title_t1_c1_winner', 'opened']]))).toBe(false);
});
test('nothing new → null', () => { /* every key 'announced' or 'opened' → null */ });
test('ordinal', () => { expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th']); });
test('titles: newest awardedAt first within the family', () => { /* two titles, the later one is picked */ });
```

- [ ] **Step 2: Run and confirm they fail.**
- [ ] **Step 3: Implement.**
  - **`titleAward`:** `seenKeys` from `awardSeenKey({kind:'title'})`. The `reveal` label is 'Title · Winner' or 'Title · Runner-up', and the title is `tournamentName`. The line is `${categoryName}.`, plus ` Awarded ${d} ${MONTHS[m]} ${yyyy}.` when `awardedAt` is set. Use the date in local time (`new Date`).
  - **`honourAward`:** `seenKeys`, `awardedAt`, and `reveal` `{label:'Honour', title, line: [eventName, `${MONTHS[m]} ${yyyy}`].filter(Boolean).join(' · ')}`.
  - **`knockoutAwards`:** takes `ref` too (the `Pick` gains `'badge'`). `seenKeys` holds every win's `ko_${ref}`. The reveal title is the last win's name, and the line is `Your ${ordinal(count)} knockout win.`
  - **`milestoneAwards`:** earned items get `seenKeys: ['ach_' + id]` and the reveal title by prefix (`${target} matches played`, `${target} wins`, `${target} sports played`). `prevTarget` and `nextTarget` are the neighbouring targets of the same prefix in `achievements`, and the line is `Next: ${nextTarget}.` or `''`.
  - **Locked items:** `seenKeys: []`.
  - **`nextReveal`:** go through the families in order. Titles and honours are sorted by `awardedAt` descending (undated last); knockouts and milestones stay in built order. Pick the first award with a `'new'` key; `key` is that key.
  - **`totalsFrom`:** the `awards.tsx:54-55` totals logic, moved here. `awards.tsx` then uses it.
- [ ] **Step 4: Run, confirm they pass, checkpoint.** `awardsView.test.ts` all green, including the old tests; `tsc`; eslint.

---

### Task 8: Shine count on `AwardBadge` and the `AwardReveal` overlay

**Files:**
- Modify: `src/components/AwardBadge.tsx` (prop `shine?: boolean | number`; `Shine` at :254)
- Create: `src/components/rewards/AwardReveal.tsx`
- Test: `__tests__/AwardReveal.test.tsx`

**Interfaces:**
- Consumes: `Award` with `reveal` (Task 7), `spring` and `haptics` (Task 1), `Button` (Task 3).
- Produces: `AwardReveal({ award, line, onSeeAward, onDone, onMinted }: { award: Award; line?: string; onSeeAward: () => void; onDone: () => void; onMinted: () => void })`
  - `line` overrides `award.reveal.line`; the knockout screen prepends the win count.
  - `onMinted` fires once: on a `setTimeout` at 820ms, or immediately on skip or dismiss if not yet fired.

- [ ] **Step 1: Write the failing tests**

```tsx
jest.mock('@/lib/haptics', () => ({ haptics: { award: jest.fn(), press: jest.fn() } }));
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
test('shows label, title and line; minting at 820ms fires award() and onMinted', () => {
  render(<AwardReveal award={m50} onSeeAward={see} onDone={done} onMinted={minted} />);
  expect(screen.getByText('Milestone')).toBeTruthy();
  expect(screen.getByText('50 matches played')).toBeTruthy();
  expect(screen.getByText('Next: 100.')).toBeTruthy();
  act(() => jest.advanceTimersByTime(819)); expect(minted).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1)); expect(minted).toHaveBeenCalledTimes(1); expect(haptics.award).toHaveBeenCalledTimes(1);
});
test('See award and Done call back; Done before 820ms still marks once', () => {
  fireEvent.press(screen.getByText('Done'));
  expect(minted).toHaveBeenCalledTimes(1); expect(done).toHaveBeenCalledTimes(1);
  act(() => jest.advanceTimersByTime(1000)); expect(minted).toHaveBeenCalledTimes(1);
});
test('Android back closes like Done', () => { /* fire the Modal's onRequestClose → done called */ });
test('line prop overrides the reveal line', () => { /* line="3 wins to the title. Your 3rd knockout win." is shown */ });
```

- [ ] **Step 2: Run and confirm they fail.**
- [ ] **Step 3: `AwardBadge` shine count.** `shine === true` keeps today's endless loop. A number `n` runs the same sweep `n` times: `withRepeat(sequence, n, false)` with no rest phase after the last sweep, and nothing at all under reduced motion.
- [ ] **Step 4: Implement `AwardReveal`.**
  - **Modal props:** `transparent`, `animationType="none"`, `statusBarTranslucent`, `navigationBarTranslucent`, `onRequestClose={dismiss}`.
  - **Layout and timeline:** per spec C4. A 168px badge built from the `award` fields, with the locked copy underneath (`metal: 'locked'`, `count: 0`) and the earned copy clipped bottom to top. Side coins at 84px when `reveal.prevTarget` or `nextTarget` is set (glyph = the target, `sub` = `award.sub`, metals `silver` and `locked`).
  - **Burst:** 8 `Animated.View` strokes, each 3×16px, in `metals[award.metal].light`, rotated `i × 45°`. Each goes from `translateY(-92)` at `scaleY(.3)`, to `-106` at `scaleY(1)` at 35%, to `-126` at `scaleY(.4)` at opacity 0, over 320ms starting at 820ms. Under reduced motion there is no burst.
  - **Buttons:** primary `See award`, and a text button `Done`.
  - **Skip:** a full-screen `Pressable` jumps every value to its end state and fires `onMinted` if pending.
- [ ] **Step 5: Run, confirm they pass, checkpoint.**

---

### Task 9: Reveal wiring (`useAwardReveal`, Home, Awards, "New" dots)

**Files:**
- Create: `src/lib/useAwardReveal.ts`
- Modify:
  - `src/app/(tabs)/home.tsx` (focus `load()` at :50; render)
  - `src/app/(tabs)/awards.tsx`
  - `src/components/awards/AwardGrid.tsx` (dot)
  - `src/components/awards/AwardSheet.tsx`: no change if Awards marks opened through `setOpen`, which is the preferred way
- Test: `__tests__/useAwardReveal.test.tsx`, `__tests__/AwardsScreen.test.tsx` (extend)

**Interfaces:**
- Consumes: Tasks 4, 7 and 8; `useIsFocused` from `expo-router`.
- Produces: `useAwardReveal({ meId, awards, focused, blocked }: { meId: string; awards: Pick<ReturnType<typeof buildAwards>, 'titles' | 'honours' | 'knockouts' | 'milestones'> | null; focused: boolean; blocked: boolean }): { reveal: { award: Award; key: string } | null; states: Map<string, RewardState>; onMinted: () => void; close: () => void; open: (award: Award) => void }`
  - `open` marks the award's keys opened, for the "New" dot and for `AwardSheet`.

- [ ] **Step 1: Write the failing hook tests.** Mock `@/lib/launchGate` so `whenLaunchDone` resolves and `isLaunchDone` returns true. Use the real `rewardSeen` and a different `meId` per test.

```tsx
test('first run seeds: no reveal, everything opened', async () => { /* awards with ach_matches-50 earned; reveal stays null; states.get('ach_matches-50') === 'opened' */ });
test('a new award reveals once; onMinted opens it and announces the rest of the batch', async () => {
  // seed first with [] for 'p-r1' via seedIfNeeded('p-r1', []), then render with a title + a milestone new
  // expect reveal.key 'title_t1_c1_winner'; act(onMinted); states: title 'opened', ach 'announced'; rerender → reveal null
});
test('losing focus before the mint closes without marking', async () => {
  // reveal shown; rerender focused:false → reveal null; loadStates(...) title still 'new'
});
test('blocked (a sheet is open) shows nothing', async () => { /* blocked: true → reveal null */ });
// AwardsScreen.test.tsx: seeded player with one new honour → the cell has testID 'new-dot-<award.key>'; pressing the cell opens the sheet and the dot disappears.
```

- [ ] **Step 2: Run and confirm they fail.**
- [ ] **Step 3: Implement the hook.**
  - **When to run:** `awards` set, `focused`, `!blocked`, and `whenLaunchDone()` resolved.
  - **First:** `seedIfNeeded(meId, allEarnedKeys)`. If it returns true, load the states and stop.
  - **Otherwise:** `loadStates` → `nextReveal` → set `reveal`.
  - **`onMinted`:** `markOpened([key])` and `markAnnounced(batch − key)`, then refresh the states.
  - **`close`:** clears `reveal` without marking.
  - **Focus lost** while revealing and not minted: `close`.
  - All `setState` happens in async callbacks.
- [ ] **Step 4: Wire Home.**
  - Add `getPublicPlayer(meId)` to the focus `load()`. Keep `{titles, honors}`, and on failure skip the reveal; never show an error for it.
  - Build `buildAwards({ ..., totals: totalsFrom(career.profile.sports) })` when the career, public record and knockouts are loaded.
  - Call `useAwardReveal({ meId, awards, focused: useIsFocused(), blocked: false })`.
  - Render `AwardReveal` with `onSeeAward={() => { close(); router.push('/(tabs)/awards'); }}` and `onDone={close}`.
- [ ] **Step 5: Wire Awards.**
  - Call the same hook with `blocked: open !== null`.
  - `AwardGrid` takes `dot?: (a: Award) => boolean` and renders an 8px `colors.accent` circle (`testID={'new-dot-' + item.key}`) at the cell's top right when true. Awards passes `(a) => hasDot(a, states)`.
  - Opening any award calls `open(award)` before `setOpen(award)`.
  - "See award" from the reveal: `close(); setOpen(reveal.award)`.
  - The Titles list rows (`awards.tsx:131`) get the same dot.
- [ ] **Step 6: Run, confirm they pass, checkpoint.** Run the hook test plus `AwardsScreen.test.tsx` and any Home screen test (`rg -l "home" __tests__`); `tsc`; eslint on the touched files.

---

### Task 10: Rankings (next-rank line, pop, scroll-to-you, ghost rows)

**Files:**
- Modify: `src/lib/competeView.ts`, `src/components/compete/Rankings.tsx`, `src/app/(tabs)/compete.tsx` (ScrollView at :58, ref at :27)
- Test: `__tests__/competeView.test.ts` (extend), `__tests__/Rankings.test.tsx` (new)

**Interfaces:**
- Consumes: `enterStagger` and `haptics` (Task 1); `RankedPlayer` (`@/api/rankings`).
- Produces:
  - `nextRankLine(board: RankedPlayer[], meId: string): string | null`
  - a `Rankings` prop `onOwnRowLayout?: (y: number, height: number) => void`, where `y` is relative to the `Rankings` root view

- [ ] **Step 1: Write the failing tests**

```ts
// competeView.test.ts. rp(id, firstName, won, decided) builds a RankedPlayer; the board is pre-sorted as the server sends it.
const BOARD = [['kav','Kavya',18,22],['arj','Arjun',15,20],['neh','Neha',14,19],['rav','Ravi',13,18],['imr','Imran',12,17],['pri','Priya',10,15],['dev','Dev',9,14],['me','Asha',8,13],['mee','Meera',7,12]]
  .map(([id, n, w, d]) => rp(id as string, n as string, w as number, d as number));
test('the preview board', () => { expect(nextRankLine(BOARD, 'me')).toBe('Win your next 2 to pass Dev (#7)'); });
test('equal rate: decided breaks the tie', () => {
  expect(nextRankLine([rp('a', 'Ann', 2, 3), rp('me', 'Me', 2, 4)], 'me')).toBe('Win your next 2 to pass Ann (#1)');
});
test('#1, off the board, unreachable, or more than 10 wins away → null', () => {
  expect(nextRankLine(BOARD, 'kav')).toBeNull();
  expect(nextRankLine(BOARD, 'ghost')).toBeNull();
  expect(nextRankLine([rp('a', 'A', 5, 5), rp('me', 'Me', 4, 5)], 'me')).toBeNull();
  expect(nextRankLine([rp('a', 'A', 19, 20), rp('me', 'Me', 0, 20)], 'me')).toBeNull();
});
// Rankings.test.tsx: mock '@/api/rankings' getTopPlayers.
test('own row shows the next-rank line', async () => { /* board BOARD, meId 'me' → findByText('Win your next 2 to pass Dev (#7)') */ });
test('an empty board shows three ghost rows with your initials', async () => {
  // getTopPlayers → [] ; meName 'Asha Nair' → getAllByTestId('ghost-row').length === 3; getByText('AN'); getByText("No one's ranked in badminton yet")
});
```

- [ ] **Step 2: Run and confirm they fail.**
- [ ] **Step 3: Implement `nextRankLine`.** Spec §9 rule, with integer maths:

```ts
// x in 1..10: (me.won + x) * a.decided > a.won * (me.decided + x)  ||  (equal && me.decided + x > a.decided)
```

  It returns `Win your next ${x} to pass ${a.firstName} (#${i})`, where `i` is the 1-based rank of the player above.
- [ ] **Step 4: `Rankings` UI.**
  - **Next-rank line:** render it as a third line in your own row (12.5px `text2`).
  - **First load** (after the skeleton, and on a sport switch): rows use `entering={enterStagger(i, reduced)}` for i < 6. Your row fades in at `staggerDelay(6)` and then pops (scale 1 → 1.03 → 1 over 420ms) with `haptics.select()`.
  - **Expand and collapse:** no stagger. After expanding, call `onOwnRowLayout(y, h)` from your row's `onLayout`.
  - **Empty board:** replace `s.emptyIcon` with three rows (`testID="ghost-row"`): rank '—', grey bars, and the middle one in `accentTint` with initials from `meName`.
- [ ] **Step 5: `compete.tsx`.**
  - Keep the `Rankings` wrapper's y from `onLayout`.
  - On `onOwnRowLayout` after an expand: `scroll.current?.scrollTo({ y: max(0, wrapperY + y − viewportH/2 + h/2), animated: true })`, then after 350ms the pop and `haptics.select()`.
  - `viewportH` comes from the ScrollView's `onLayout`.
- [ ] **Step 6: Run, confirm they pass, checkpoint.**

---

### Task 11: Knockout champion (path, highlight and moment)

**Files:**
- Modify:
  - `src/lib/knockoutRoom.ts`
  - `src/lib/bracket.ts` (add `highlightSegments`)
  - `src/components/Bracket.tsx` (prop `highlight`)
  - `src/app/knockout/[id].tsx` (reveal, outer scroll ref, follow-through)
- Test: `__tests__/knockoutRoom.test.tsx` (extend), `__tests__/bracketLayout.test.ts` (extend), `__tests__/KnockoutScreen.test.tsx` (extend)

**Interfaces:**
- Consumes: `AwardReveal` (Task 8); `loadStates`, `markOpened` and `seedIfNeeded` (Task 4); `knockoutAwards` and `ordinal` (Task 7); `myEntrant` (`knockoutRoom.ts:64`).
- Produces:

```ts
export function isChampion(k: QuickKnockout, meId: string): boolean;          // knockoutRoom.ts
export function championPath(k: QuickKnockout): string[];                      // fixtureIds in round order, final last, byes included
export function championWins(k: QuickKnockout): number;                        // non-bye fixtures won by the champion
export interface Seg { left: number; top: number; width: number; height: number }
export function highlightSegments(columns: BracketColumn[], cardH: number, ids: string[], t = 2): { round: number; stub: Seg; run: Seg; wire: Seg }[]; // bracket.ts
// Bracket: highlight?: { ids: string[]; play: boolean; onDone?: () => void }
```

- [ ] **Step 1: Write the failing tests**

```ts
// bracketLayout.test.ts. Columns of 4, 2 and 1 cards (ids q1..q4, s1, s2, f1), cardH 65.
test('only the champion half of each link', () => {
  expect(highlightSegments(cols, 65, ['q2', 's1', 'f1'])).toEqual([
    { round: 0, stub: { left: 200, top: 112.5, width: 18, height: 2 }, run: { left: 217, top: 73, width: 2, height: 40.5 }, wire: { left: 218, top: 72, width: 18, height: 2 } },
    { round: 1, stub: { left: 436, top: 72, width: 18, height: 2 }, run: { left: 453, top: 73, width: 2, height: 81 }, wire: { left: 454, top: 153, width: 18, height: 2 } },
  ]);
});
test('a lone feeder gives a zero-length run', () => { /* columns [2 cards? no: 3 cards → pair (q3 alone)], ids ['q3', ...] → run.height === 0 */ });
// knockoutRoom.test.tsx. A fixture knockout of 8 singles entrants, champion = me.
test('isChampion, championPath, championWins', () => {
  expect(isChampion(k, 'me')).toBe(true); expect(isChampion(k, 'p2')).toBe(false);
  expect(championPath(k)).toEqual(['f-q1', 'f-s1', 'f-final']);
  expect(championWins(k)).toBe(3);
});
test('a bye on the path is in the path but not a win', () => { /* champion had a bye in round 1 → path length 3, wins 2 */ });
// KnockoutScreen.test.tsx: completed knockout where me is champion and the player is seeded with no ko key opened
test('the champion sees the reveal once', async () => {
  // findByText('Knockout winner') inside the reveal; findByText('3 wins to the title. Your 1st knockout win.'); press 'Done' → reveal gone
});
test('a non-champion sees no reveal', () => { /* meId 'p2' → queryByText('3 wins to the title…') null */ });
```

- [ ] **Step 2: Run and confirm they fail.**
- [ ] **Step 3: Implement the pure functions.**
  - **`highlightSegments`** recomputes `bracketLayout(columns, cardH)`. For each column `c` before the last, take the card `i` whose id is in `ids`.
    - link index: `floor(i/2)` among that column's links
    - `yC = i % 2 ? link.y2 : link.y1`
    - stub: `{left: link.x, top: yC − t/2, width: GUTTER/2, height: t}`
    - run: `{left: link.x + GUTTER/2 − t/2, top: min(yC, yMid), width: t, height: |yMid − yC|}`
    - wire: `{left: link.x + GUTTER/2, top: yMid − t/2, width: GUTTER/2, height: t}`
  - **`championPath`** walks `fixtures` by round, keeping those where the champion is entrant A or B.
- [ ] **Step 4: `Bracket` highlight.**
  - Render the segments in `colors.accent` over the grey connectors.
  - When `play` turns true, run each round in turn, `round × 240ms` apart:
    1. Scroll the horizontal `ScrollView` (give it a ref) to `x = (round + 1) × (CARD_W + GUTTER) − space.gutter`, animated.
    2. Grow the round's segments: stub `scaleX`, then run `scaleY`, then wire `scaleX`, 40ms each, with `transformOrigin` at the champion's edge.
  - After the last round, the won row of the last column's highlighted card turns `accentInk`, and `onDone` fires.
  - **Reduced motion:** a 160ms fade and an unanimated scroll.
- [ ] **Step 5: The knockout screen.**
  - **Show the reveal when** the knockout is completed and `isChampion(k, meId)`, the screen is focused, and `ko_${k._id}` isn't opened. Load states with `seedIfNeeded` then `loadStates`, the same as the hook in Task 9.
  - **Count:** fetch `getPublicPlayer(meId)` once to count the player's `knockout-winner` honours, giving ×N and the ordinal.
  - **Render** `AwardReveal` with:
    - `award = knockoutAwards([{ title: k.name, badge: 'knockout-winner', ref: k._id, eventName: k.name, sport: k.sport }], [])[0]`, with `count` overridden
    - `line = \`${championWins(k)} wins to the title. Your ${ordinal(count)} knockout win.\``
    - `onMinted = () => markOpened(meId, ['ko_' + k._id])`
  - **On Done or See award:** close. At 160ms, scroll the outer ScrollView (add a ref) so the bracket section (y from `onLayout`) is in view, then set `highlight={{ ids: championPath(k), play: true }}`. See award then goes on to `router.push('/(tabs)/awards')` after `onDone`.
  - **Cricket:** check that `entrants[].playerKeys` is filled for cricket knockouts in `useQuickKnockout` fixtures or the server model. If it isn't, `isChampion` resolves the viewer's team through `k.teams`. Add a test for whichever path holds.
- [ ] **Step 6: Run, confirm they pass, checkpoint.**

---

### Task 12: `BottomSheet` lint (M22) and the Events list virtualised (M21)

**Files:**
- Modify: `src/components/ui/BottomSheet.tsx` (:69, :84, :86, :90, :92, :95, :99, :119), `src/app/(tabs)/events.tsx` (:88)
- Test: the existing `__tests__/BottomSheetKeyboard.test.tsx` and Events screen tests (`rg -l "events" __tests__`)

**Interfaces:**
- Consumes: `enterStagger` (Task 1).
- Produces: no API change.

- [ ] **Step 1: Baseline.** Run `npx jest --maxWorkers=2 __tests__/BottomSheetKeyboard.test.tsx` plus the Events tests. All pass; note the counts.
- [ ] **Step 2: Fix `BottomSheet` lint.**
  - Shared-value writes become `y.set(…)` / `.get()`.
  - `onCloseRef.current = onClose` moves into `useLayoutEffect`.
  - The PanResponder is created with `useState(() => PanResponder.create(…))[0]`.
  - The `set-state-in-effect` at :69 becomes derived state, or a state update inside the animation's completion callback.
  - Behaviour stays identical.
- [ ] **Step 3: Verify.** `npx eslint src/components/ui/BottomSheet.tsx` reports 0 problems, and the Step 1 tests still pass.
- [ ] **Step 4: Virtualise Events.**
  - Replace the card list's `ScrollView` with a `FlatList` (or a `SectionList`, if the featured and past sections need it). Search, filters and Featured go in `ListHeaderComponent`, and the past rows go in the footer or their own section.
  - Keep the focus reload, `useScrollToTop` (pass the list ref) and `TAB_BAR_SPACE` bottom padding.
  - Item key: the tournament `_id`.
  - The first 6 cards use `entering={enterStagger(i, reduced)}`, on first load only: track with a ref that the first page has rendered.
- [ ] **Step 5: Run the Events tests, confirm they pass, checkpoint.** `tsc` clean; eslint clean on both files.

---

### Task 13: DESIGN.md v1.2

**Files:** Modify `mobile/DESIGN.md` (header; §5.2; §5.7; §8; §9; §11; §13; §14)

- [ ] **Step 1: Apply the edits.**
  - Apply `d:\kria\GAMIFICATION-MOTION.md` §10 exactly: §9 replaced, §11 replaced, §13 appended.
  - §5.2 gets the lip paragraph.
  - §5.7: "min 10 decided matches" becomes "min 5 decided matches", plus the next-rank line and scroll-to-you.
  - §8 gets the Result and Empty-leaderboard rows.
  - §14: the milestone tiers line points at SERVER-GAPS #43.
  - The header says v1.2 with the date 27 Nov 2026.
  - **The §9 burst sentence:** "A milestone reveal also gets one radial burst: 8 strokes in the badge's metal, 320ms, once."
- [ ] **Step 2: Verify.**
  - `rg -n "min 10 decided" DESIGN.md` returns nothing.
  - `rg -n "radial burst" DESIGN.md` returns one line.
  - `rg -n "v1.2" DESIGN.md` returns the header.

---

### Task 14: Final verification

- [ ] **Step 1: Type check.** `npx tsc --noEmit` is clean.
- [ ] **Step 2: Full test run.** `npx jest --maxWorkers=2` is green. Record the suite and test counts; they must be at least 139 suites and 1,114 tests (25 Nov baseline).
- [ ] **Step 3: Lint.**
  - `npx eslint` on every file created or modified by Tasks 1–12 reports 0 problems.
  - `npx eslint src` total errors are ≤ 60 (it should drop by about 12).
- [ ] **Step 4: Worklet bundle check** (`mobile/AGENTS.md` Gates).
  - Start `npx expo start`, and record its PID.
  - Fetch the Android bundle.
  - `grep -c "__workletHash"` must be higher than before the work. Record both numbers.
  - Stop only the PID you started.
- [ ] **Step 5: Hand-off note.** Append to `d:\kria\GAMIFICATION-MOTION.md` "Status":
  - what shipped
  - the gate numbers
  - the device checklist from spec §13 item 5, which is owed to the user, on a mid-range Android in Expo Go: winner and loser result, a reveal including first-run seeding, rankings, the knockout path, the press-down button, the same with reduced motion on, haptics felt, and the JS thread idle in the perf monitor

  No commit.
