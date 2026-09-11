# Two-Portal Home + Floating Nav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the player home into an EVENTS portal (organiser-hosted tournaments, the default) and a PLAY portal (quick matches, your record, recent matches), and replace the orange pill tab bar with a floating five-slot nav.

**Architecture:** The existing home screen body is extracted UNCHANGED into `EventsPortal`, then a `PortalSwitch` selects between it and a new `PlayPortal`. Portal selection is local `useState` on the home screen — there is no cross-screen consumer, so a Redux slice would be three files for one boolean. The PLAY portal loads from endpoints that already exist (`useCareer`, `listMyQuickMatches`); nothing here needs server work. The tab bar renders a fixed five-slot layout and maps only two slots to real routes.

**Tech Stack:** React Native / Expo SDK 57, expo-router 57, Redux Toolkit (auth only), react-native-svg, jest + @testing-library/react-native.

**Spec:** `mobile/docs/design-canvas/home-portals/` — artboards `Main.dc.html` (the interactive home, both portals), `PlayEmpty.dc.html` (first-run PLAY), `PlayFull.dc.html` (PLAY at full scroll), `NavBar.dc.html` (nav variants A and B; **variant A is chosen**). Published canvas: https://claude.ai/code/artifact/bd825a92-5749-49cb-8e6b-3a8b2bde4184
Design system: `mobile/DESIGN.md` (§3 surfaces, §4 icons, §5 state patterns, §6 motion).

## Global Constraints

- **Paramount: only ADD paths.** The organiser/staff/player tournament flow must not change behaviour. The EVENTS portal must render exactly what `home.tsx` renders today — Task 3 is a pure refactor and its test asserts that.
- **`npm install --legacy-peer-deps`** — bare `npm install` fails ERESOLVE. Read `mobile/AGENTS.md` before touching dependencies.
- **No new dependencies.** Everything needed is installed.
- Run tests with `npx jest`. Typecheck with `npx tsc --noEmit`.
- **`npx tsc --noEmit` has 4 pre-existing errors**, all in `__tests__/antonLeading.test.ts` (missing `@types/node`). Zero *new* errors is the standard. Do not "fix" those 4.
- TypeScript strict mode is **off** — that is not licence for `any`. No `as any`, `: any`, `@ts-ignore`, `console.`, `?? ''` or `|| ''` on any line you add.
- 2-space indent, single quotes.
- Data-driven components use inline `style={{...}}` objects with a shared label-style constant, not NativeWind classes. Match `src/components/profile/CareerCard.tsx`.
- Import `useFocusEffect` / `useIsFocused` from `expo-router`, never `@react-navigation/*`.
- **44px minimum hit target**, even where an artboard draws a control smaller.
- Colours come from `src/lib/theme.ts` (`colors.ink` `#0B0B0B`, `panel` `#151515`, `panel2` `#1E1E1E`, `brand` `#F97316`, `auction` `#FA4C93`, `open` `#16C46A`, `fail` `#FF4438`, `line` `rgba(255,255,255,0.14)`).
- Fonts: `Anton_400Regular` (display, uppercase), `SpaceGrotesk_400Regular` / `_500Medium` / `_700Bold` (interface), `SpaceMono_400Regular` / `_700Bold` (**all numerics**).
- Commit after every task. Do not push.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/icons/nav.tsx` | **New.** The five soft nav glyphs (1.8 stroke, round caps). Deliberately a separate module from `icons/index.tsx` — DESIGN.md §4 fixes the boundary at "nav is soft, content is industrial", and one file per language is what keeps that boundary visible. |
| `src/components/navigation/FloatingTabBar.tsx` | **New.** Floating pill, five slots, lifted Host circle. Replaces `PremiumTabBar`. |
| `src/lib/homePortal.ts` | **New.** Pure view-logic for the portal strip and the live-match dot. No React. |
| `src/components/home/PortalSwitch.tsx` | **New.** The two-up segmented control. |
| `src/components/home/EventsPortal.tsx` | **New.** Today's home body, moved verbatim. |
| `src/components/home/PlayPortal.tsx` | **New.** Host/join, your record, recent matches. |
| `src/app/(tabs)/home.tsx` | **Modify.** Masthead + switch + whichever portal. |
| `src/app/(tabs)/_layout.tsx` | **Modify.** Swap `PremiumTabBar` for `FloatingTabBar`. |
| `src/components/navigation/PremiumTabBar.tsx` | **Delete** in Task 2, once nothing imports it. |

---

### Task 1: Nav icon set

The industrial set (square caps, mitred joins) read spiky at 22px in a bar. These five are the app's second, deliberately softer language.

**Files:**
- Create: `src/components/icons/nav.tsx`
- Test: `__tests__/navIcons.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `NavIcon({ name, size, color, strokeWidth })` React component; `type NavIconName = 'home' | 'search' | 'plus' | 'live' | 'user'`; `NAV_ICON_NAMES: NavIconName[]`; `NAV_ICON_PATHS: Record<NavIconName, string[]>`.

- [ ] **Step 1: Write the failing test**

`__tests__/navIcons.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { NavIcon, NAV_ICON_NAMES, NAV_ICON_PATHS } from '../src/components/icons/nav';

describe('nav icon set', () => {
  it('ships exactly the five nav glyphs', () => {
    expect(NAV_ICON_NAMES).toEqual(['home', 'search', 'plus', 'live', 'user']);
  });

  it('every glyph has at least one path', () => {
    for (const name of NAV_ICON_NAMES) {
      expect(NAV_ICON_PATHS[name].length).toBeGreaterThan(0);
    }
  });

  // DESIGN.md §4: the nav set is round-capped, the content set is square-capped.
  // That boundary is the whole reason this module is separate — if a square cap
  // ever lands here, the two languages have started to blur.
  it('renders with round caps and round joins, unlike the content set', () => {
    const { UNSAFE_root } = render(<NavIcon name="home" size={22} color="#fff" />);
    const svg = UNSAFE_root.findByProps({ strokeLinecap: 'round' });
    expect(svg.props.strokeLinejoin).toBe('round');
  });

  it('scales stroke width with size so a 44px glyph is not four times heavier', () => {
    const { UNSAFE_root } = render(<NavIcon name="user" size={44} color="#fff" />);
    // 1.8 at the 24 grid, doubled for a 44px render.
    expect(UNSAFE_root.findByProps({ strokeLinecap: 'round' }).props.strokeWidth).toBeCloseTo(3.3, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest navIcons -t 'ships exactly'`
Expected: FAIL — `Cannot find module '../src/components/icons/nav'`

- [ ] **Step 3: Write minimal implementation**

`src/components/icons/nav.tsx`:

```tsx
import Svg, { Path } from 'react-native-svg';

/**
 * The bottom-nav icon set — the app's SECOND icon language.
 *
 * `src/components/icons/index.tsx` is the industrial set: 2px stroke, square
 * caps, mitred joins. It is right on a scoreboard and on a status tag. At 22px
 * inside a floating bar it read spiky rather than precise, and the nav is chrome
 * you see on every screen, so it should recede.
 *
 * These five are 1.8 stroke with ROUND caps and joins. DESIGN.md §4 fixes the
 * boundary bluntly: nav is soft, everything else is industrial. A round terminal
 * in content is a bug, not a style choice — and that is why this is its own
 * module rather than five more entries in the main set, where the two would
 * silently mix.
 */
type NavIconDef = string[];

const NAV_ICONS = {
  home: ['M3.8 10.4 L12 4.2 L20.2 10.4 V18.5 A1.7 1.7 0 0 1 18.5 20.2 H5.5 A1.7 1.7 0 0 1 3.8 18.5 Z'],
  search: ['M11 4.7 A6.3 6.3 0 1 1 11 17.3 A6.3 6.3 0 1 1 11 4.7 Z', 'M15.6 15.6 L20 20'],
  plus: ['M12 5.5 V18.5', 'M5.5 12 H18.5'],
  live: ['M3.5 12 H6.6 L8.9 6.4 L12.5 17.6 L14.8 12 H20.5'],
  user: ['M12 4.5 A3.9 3.9 0 1 1 12 12.3 A3.9 3.9 0 1 1 12 4.5 Z', 'M4.8 20 A7.2 7.2 0 0 1 19.2 20'],
} satisfies Record<string, NavIconDef>;

export type NavIconName = keyof typeof NAV_ICONS;

export const NAV_ICON_NAMES = Object.keys(NAV_ICONS) as NavIconName[];

export const NAV_ICON_PATHS: Record<NavIconName, string[]> = NAV_ICONS;

/** Stroke is authored on the 24 grid and scales with `size`, so a glyph keeps
 *  its weight rather than getting heavier as it grows. */
const GRID = 24;
const STROKE = 1.8;

export function NavIcon({
  name,
  size = 22,
  color = '#FFFFFF',
  strokeWidth,
}: {
  name: NavIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const width = strokeWidth ?? (STROKE * size) / GRID;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${GRID} ${GRID}`} fill="none">
      {NAV_ICONS[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest navIcons`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/icons/nav.tsx __tests__/navIcons.test.tsx
git commit -m "feat: soft-capped icon set for the bottom nav"
```

---

### Task 2: Floating tab bar

Variant A from `NavBar.dc.html`: a pill inset 14px from the edges, one lifted circle for Host. Five slots, but only `home` and `profile` are routes — Explore and Live are drawn disabled until those screens exist.

**Files:**
- Create: `src/components/navigation/FloatingTabBar.tsx`
- Modify: `src/app/(tabs)/_layout.tsx`
- Delete: `src/components/navigation/PremiumTabBar.tsx`
- Test: `__tests__/FloatingTabBar.test.tsx`

**Interfaces:**
- Consumes: `NavIcon`, `NavIconName` from Task 1.
- Produces: `FloatingTabBar(props)` where `props` is expo-router's tab-bar prop type; `NAV_SLOTS` (exported for the test).

- [ ] **Step 1: Write the failing test**

`__tests__/FloatingTabBar.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { FloatingTabBar } from '../src/components/navigation/FloatingTabBar';

const push = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => push(...a) } }));

const props = (index = 0) => ({
  state: {
    index,
    routes: [
      { key: 'home-1', name: 'home' },
      { key: 'profile-1', name: 'profile' },
    ],
  },
  navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() },
}) as never;

describe('FloatingTabBar', () => {
  beforeEach(() => push.mockClear());

  it('renders all five slots', () => {
    const { getByLabelText } = render(<FloatingTabBar {...props()} />);
    for (const label of ['Home', 'Explore', 'Host a match', 'Live', 'You']) {
      expect(getByLabelText(label)).toBeTruthy();
    }
  });

  it('marks the focused route selected', () => {
    const { getByLabelText } = render(<FloatingTabBar {...props(0)} />);
    expect(getByLabelText('Home').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('You').props.accessibilityState.selected).toBe(false);
  });

  // Explore and Live have no routes yet. They are drawn so the bar matches the
  // design, but they must announce themselves as disabled rather than look
  // tappable and do nothing.
  it('marks the unbuilt slots disabled', () => {
    const { getByLabelText } = render(<FloatingTabBar {...props()} />);
    expect(getByLabelText('Explore').props.accessibilityState.disabled).toBe(true);
    expect(getByLabelText('Live').props.accessibilityState.disabled).toBe(true);
    expect(getByLabelText('Home').props.accessibilityState.disabled).toBe(false);
  });

  it('does not navigate when a disabled slot is pressed', () => {
    const p = props();
    const { getByLabelText } = render(<FloatingTabBar {...p} />);
    fireEvent.press(getByLabelText('Explore'));
    expect(p.navigation.navigate).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('navigates between real routes', () => {
    const p = props(0);
    const { getByLabelText } = render(<FloatingTabBar {...p} />);
    fireEvent.press(getByLabelText('You'));
    expect(p.navigation.navigate).toHaveBeenCalledWith('profile');
  });

  // Host is an ACTION, not a tab. It pushes rather than switching tabs, which is
  // why it never takes the selected state.
  it('pushes the new-quick-match route from Host', () => {
    const p = props();
    const { getByLabelText } = render(<FloatingTabBar {...p} />);
    fireEvent.press(getByLabelText('Host a match'));
    expect(push).toHaveBeenCalledWith('/quick/new');
    expect(p.navigation.navigate).not.toHaveBeenCalled();
  });

  it('gives every slot a 44px hit target', () => {
    const { getByLabelText } = render(<FloatingTabBar {...props()} />);
    for (const label of ['Home', 'Explore', 'Host a match', 'Live', 'You']) {
      const style = getByLabelText(label).props.style;
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest FloatingTabBar`
Expected: FAIL — `Cannot find module '../src/components/navigation/FloatingTabBar'`

- [ ] **Step 3: Write minimal implementation**

`src/components/navigation/FloatingTabBar.tsx`:

```tsx
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Tabs } from 'expo-router';
import { NavIcon, type NavIconName } from '@/components/icons/nav';
import { colors } from '@/lib/theme';

// expo-router 57 vendors react-navigation, so the tab-bar prop type comes from
// the Tabs component itself — the standalone @react-navigation/bottom-tabs types
// are a different, incompatible copy.
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

type Slot =
  | { kind: 'route'; route: string; icon: NavIconName; label: string }
  | { kind: 'action'; href: string; icon: NavIconName; label: string; a11y: string }
  | { kind: 'pending'; icon: NavIconName; label: string };

/**
 * Five slots, but only two routes exist. Explore and Live are drawn so the bar
 * reads as designed and are announced disabled — a control that looks tappable
 * and does nothing is worse than one that says it is not ready.
 *
 * Host is an ACTION, not a tab: it pushes /quick/new and never takes the
 * selected state. That is deliberate — the lifted circle always means "create",
 * so the lift never competes with which tab you are on.
 */
export const NAV_SLOTS: Slot[] = [
  { kind: 'route', route: 'home', icon: 'home', label: 'Home' },
  { kind: 'pending', icon: 'search', label: 'Explore' },
  { kind: 'action', href: '/quick/new', icon: 'plus', label: 'Host', a11y: 'Host a match' },
  { kind: 'pending', icon: 'live', label: 'Live' },
  { kind: 'route', route: 'profile', icon: 'user', label: 'You' },
];

const IDLE = '#7d7d7d';
const PENDING = 'rgba(255,255,255,0.28)';

const label = (color: string) => ({
  fontFamily: 'SpaceGrotesk_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.03 * 9,
  color,
  marginTop: 3,
});

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: Math.max(insets.bottom, 12) + 8,
        height: 64,
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: colors.panel,
        borderWidth: 1.5,
        borderColor: colors.line,
        borderRadius: 32,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
      }}
    >
      {NAV_SLOTS.map((slot) => {
        const routeIndex =
          slot.kind === 'route' ? state.routes.findIndex((r) => r.name === slot.route) : -1;
        const focused = routeIndex >= 0 && state.index === routeIndex;
        const disabled = slot.kind === 'pending';
        const a11yLabel = slot.kind === 'action' ? slot.a11y : slot.label;

        const onPress = () => {
          if (slot.kind === 'pending') return;
          if (slot.kind === 'action') {
            router.push(slot.href);
            return;
          }
          const route = state.routes[routeIndex];
          if (!route) return;
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(slot.route);
        };

        // The create action: a lifted circle ringed in the page ground, so the
        // ring reads as a notch cut into the bar.
        if (slot.kind === 'action') {
          return (
            <Pressable
              key={slot.label}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              accessibilityState={{ selected: false, disabled: false }}
              onPress={onPress}
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  marginTop: -30,
                  backgroundColor: colors.auction,
                  borderWidth: 5,
                  borderColor: colors.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NavIcon name={slot.icon} size={24} color="#240614" strokeWidth={2.2} />
              </View>
              <Text style={label('#FFFFFF')}>{slot.label}</Text>
            </Pressable>
          );
        }

        const tint = disabled ? PENDING : focused ? colors.brand : IDLE;

        return (
          <Pressable
            key={slot.label}
            accessibilityRole="button"
            accessibilityLabel={a11yLabel}
            accessibilityState={{ selected: focused, disabled }}
            disabled={disabled}
            onPress={onPress}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <NavIcon name={slot.icon} size={22} color={tint} />
            <Text style={label(tint)}>{slot.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest FloatingTabBar`
Expected: PASS, 7 tests.

- [ ] **Step 5: Swap the bar in and delete the old one**

`src/app/(tabs)/_layout.tsx` — replace the whole file:

```tsx
import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
    </Tabs>
  );
}
```

Then:

```bash
git rm src/components/navigation/PremiumTabBar.tsx
npx jest
```

Expected: the whole suite passes. If anything still imports `PremiumTabBar`, fix that import rather than restoring the file.

- [ ] **Step 6: Check the bar does not sit on top of list content**

The old bar was 41px tall at `bottom: 12`. The new one is 64px at `bottom: insets.bottom + 8` and the Host circle lifts 30px above it. Every scroll view under the tabs needs at least `paddingBottom: 110`.

Run: `grep -rn "paddingBottom" src/app/\(tabs\)/`
For each result below 110, raise it to 110. `home.tsx` currently uses 110 — leave it.

- [ ] **Step 7: Typecheck and commit**

```bash
npx tsc --noEmit
```
Expected: the 4 pre-existing `antonLeading.test.ts` errors and nothing else.

```bash
git add -A
git commit -m "feat: floating five-slot nav, replacing the orange pill bar"
```

---

### Task 3: Extract the events portal, changing nothing

This is a pure refactor and the riskiest task in the plan, because it touches the tournament-discovery flow the paramount constraint protects. Move the code; change no behaviour.

**Files:**
- Create: `src/components/home/EventsPortal.tsx`
- Modify: `src/app/(tabs)/home.tsx`
- Test: `__tests__/EventsPortal.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `EventsPortal({ tournaments, isLoading, error, sport, city, cityOpen, onSport, onCity, onToggleCity, onOpen, onRetry })` — props typed in the file; `tournaments: Tournament[]` from `@/store/slices/tournamentSlice`.

- [ ] **Step 1: Write the failing test**

`__tests__/EventsPortal.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { EventsPortal } from '../src/components/home/EventsPortal';
import type { Tournament } from '../src/store/slices/tournamentSlice';

const tournament = (over: Partial<Tournament> = {}): Tournament => ({
  _id: 't1',
  name: 'Kria Smash Cup',
  sport: 'badminton',
  status: 'registration_open',
  startDate: '2026-09-02T00:00:00.000Z',
  endDate: '2026-09-07T00:00:00.000Z',
  ...over,
}) as Tournament;

const props = (over = {}) => ({
  tournaments: [tournament()],
  isLoading: false,
  error: null,
  sport: 'All',
  city: 'All',
  cityOpen: false,
  onSport: jest.fn(),
  onCity: jest.fn(),
  onToggleCity: jest.fn(),
  onOpen: jest.fn(),
  onRetry: jest.fn(),
  ...over,
});

describe('EventsPortal', () => {
  it('shows the tournament list', () => {
    const { getByText } = render(<EventsPortal {...props()} />);
    expect(getByText(/kria smash cup/i)).toBeTruthy();
  });

  // DESIGN.md §5: an error scopes to the section that failed. The rest of home
  // — masthead, portal switch — is the home screen's, not this component's, and
  // must survive.
  it('scopes a failed load to itself when nothing is cached', () => {
    const { getByText } = render(<EventsPortal {...props({ tournaments: [], error: 'boom' })} />);
    expect(getByText(/events unavailable/i)).toBeTruthy();
  });

  it('offers a filter reset only when a filter is actually applied', () => {
    const { queryByText } = render(<EventsPortal {...props({ tournaments: [] })} />);
    expect(queryByText(/clear filters/i)).toBeNull();

    const { getByText } = render(
      <EventsPortal {...props({ tournaments: [], sport: 'badminton' })} />
    );
    expect(getByText(/clear filters/i)).toBeTruthy();
  });

  it('dims rather than blanks while refreshing over cached data', () => {
    const { getByTestId } = render(<EventsPortal {...props({ isLoading: true })} />);
    expect(getByTestId('events-list').props.style.opacity).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest EventsPortal`
Expected: FAIL — `Cannot find module '../src/components/home/EventsPortal'`

- [ ] **Step 3: Move the code**

Create `src/components/home/EventsPortal.tsx`. Move the `Header`, the `FlatList`, the skeleton branch and the error branch out of `src/app/(tabs)/home.tsx` **verbatim** — same JSX, same styles, same numbers. Three mechanical changes only:

1. Values that came from `useState`/`useAppSelector` become props (`sport`, `city`, `cityOpen`, `tournaments`, `isLoading`, `error`).
2. Handlers that called `setSport` / `setCity` / `setCityOpen` / `router.push` / `load` call `onSport` / `onCity` / `onToggleCity` / `onOpen` / `onRetry`.
3. Add `testID="events-list"` to the `FlatList`.

Do **not** take the opportunity to tidy anything. Keep the featured-tournament selection, the `visible` filter, the skeleton geometry and the empty-state copy exactly as they are. Anything you improve here is a behaviour change to the flow the constraint protects.

**The featured card needs no change.** `FeaturedTournament` already renders `<TournamentArt uri={tournament.bannerImage} …>` with the seeded-ground fallback and the hazard edge. The artboard was catching up to the code here, not the other way round — do not add an art strip, it is already there.

**The sport and city chips stay as they are.** The filter bar and sheet in the canvas are the next plan; this task moves the existing chips untouched.

Keep the `Hazard` import out — the masthead rule stays on the home screen (Task 7 replaces it).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest EventsPortal`
Expected: PASS, 4 tests.

- [ ] **Step 5: Verify nothing else broke**

```bash
npx jest
npx tsc --noEmit
```
Expected: full suite green; only the 4 known tsc errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/EventsPortal.tsx "src/app/(tabs)/home.tsx" __tests__/EventsPortal.test.tsx
git commit -m "refactor: lift the events portal out of home, no behaviour change"
```

---

### Task 4: Portal view-logic

Pure functions, no React — the strip copy and the live dot are the two things the switch shows, and both are worth testing without rendering.

**Files:**
- Create: `src/lib/homePortal.ts`
- Test: `__tests__/homePortal.test.ts`

**Interfaces:**
- Consumes: `QuickMatch` from `@/api/quickMatch`.
- Produces: `type Portal = 'events' | 'play'`; `hasLiveQuickMatch(matches: QuickMatch[]): boolean`; `portalStrip(portal: Portal, opts: { openCount: number; city: string; played: number; live: boolean }): string`.

- [ ] **Step 1: Write the failing test**

`__tests__/homePortal.test.ts`:

```ts
import { hasLiveQuickMatch, portalStrip } from '../src/lib/homePortal';
import type { QuickMatch } from '../src/api/quickMatch';

const match = (status: QuickMatch['status']) => ({ status }) as QuickMatch;

describe('hasLiveQuickMatch', () => {
  it('is true when any match is live', () => {
    expect(hasLiveQuickMatch([match('completed'), match('live')])).toBe(true);
  });

  it('is false for completed and cancelled matches only', () => {
    expect(hasLiveQuickMatch([match('completed'), match('cancelled')])).toBe(false);
  });

  it('is false for an empty list', () => {
    expect(hasLiveQuickMatch([])).toBe(false);
  });
});

describe('portalStrip', () => {
  it('names the city when one is filtered', () => {
    expect(portalStrip('events', { openCount: 3, city: 'Bangalore', played: 0, live: false }))
      .toBe('ORGANISER-HOSTED · 3 OPEN IN BANGALORE');
  });

  it('drops the city clause when the filter is All', () => {
    expect(portalStrip('events', { openCount: 3, city: 'All', played: 0, live: false }))
      .toBe('ORGANISER-HOSTED · 3 OPEN');
  });

  it('uses the singular for one event', () => {
    expect(portalStrip('events', { openCount: 1, city: 'All', played: 0, live: false }))
      .toBe('ORGANISER-HOSTED · 1 OPEN');
  });

  // A live match is the one thing worth crossing portals for unprompted, so it
  // outranks the career count in the strip.
  it('leads with the live match on the play side', () => {
    expect(portalStrip('play', { openCount: 0, city: 'All', played: 47, live: true }))
      .toBe('YOUR GAME · 1 LIVE NOW');
  });

  it('falls back to the career count when nothing is live', () => {
    expect(portalStrip('play', { openCount: 0, city: 'All', played: 47, live: false }))
      .toBe('YOUR GAME · 47 PLAYED');
  });

  it('says so plainly when nothing has been played', () => {
    expect(portalStrip('play', { openCount: 0, city: 'All', played: 0, live: false }))
      .toBe('YOUR GAME · NOTHING PLAYED YET');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest homePortal`
Expected: FAIL — `Cannot find module '../src/lib/homePortal'`

- [ ] **Step 3: Write minimal implementation**

`src/lib/homePortal.ts`:

```ts
import type { QuickMatch } from '@/api/quickMatch';

export type Portal = 'events' | 'play';

/** Whether any of your quick matches is in progress. This is what puts the dot
 *  on the PLAY tab — the only unprompted reason to cross portals. */
export function hasLiveQuickMatch(matches: QuickMatch[]): boolean {
  return matches.some((m) => m.status === 'live');
}

/**
 * The one-line strip under the switch. It says what is behind the side you are
 * on, so the portal you are not looking at is never a mystery.
 */
export function portalStrip(
  portal: Portal,
  opts: { openCount: number; city: string; played: number; live: boolean },
): string {
  if (portal === 'play') {
    if (opts.live) return 'YOUR GAME · 1 LIVE NOW';
    if (opts.played === 0) return 'YOUR GAME · NOTHING PLAYED YET';
    return `YOUR GAME · ${opts.played} PLAYED`;
  }
  const where = opts.city === 'All' ? '' : ` IN ${opts.city.toUpperCase()}`;
  return `ORGANISER-HOSTED · ${opts.openCount} OPEN${where}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest homePortal`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/homePortal.ts __tests__/homePortal.test.ts
git commit -m "feat: portal strip copy and live-match detection"
```

---

### Task 5: Portal switch

**Files:**
- Create: `src/components/home/PortalSwitch.tsx`
- Test: `__tests__/PortalSwitch.test.tsx`

**Interfaces:**
- Consumes: `Portal` from Task 4.
- Produces: `PortalSwitch({ portal, live, onChange })` where `onChange: (p: Portal) => void`.

- [ ] **Step 1: Write the failing test**

`__tests__/PortalSwitch.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { PortalSwitch } from '../src/components/home/PortalSwitch';

describe('PortalSwitch', () => {
  it('marks the active side selected', () => {
    const { getByLabelText } = render(
      <PortalSwitch portal="events" live={false} onChange={jest.fn()} />
    );
    expect(getByLabelText('Events').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('Play').props.accessibilityState.selected).toBe(false);
  });

  it('switches portals on press', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <PortalSwitch portal="events" live={false} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Play'));
    expect(onChange).toHaveBeenCalledWith('play');
  });

  it('does not fire when the active side is pressed again', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <PortalSwitch portal="events" live={false} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Events'));
    expect(onChange).not.toHaveBeenCalled();
  });

  // Colour is never the only signal (DESIGN.md §7) — the dot has to be
  // announced, not just drawn.
  it('announces a live match rather than only drawing a dot', () => {
    const { getByLabelText } = render(
      <PortalSwitch portal="events" live onChange={jest.fn()} />
    );
    expect(getByLabelText('Play, a match is live')).toBeTruthy();
  });

  it('keeps both halves at a 44px hit target', () => {
    const { getByLabelText } = render(
      <PortalSwitch portal="play" live={false} onChange={jest.fn()} />
    );
    expect(getByLabelText('Events').props.style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest PortalSwitch`
Expected: FAIL — `Cannot find module '../src/components/home/PortalSwitch'`

- [ ] **Step 3: Write minimal implementation**

`src/components/home/PortalSwitch.tsx`:

```tsx
import { View, Pressable, Text } from 'react-native';
import { colors } from '@/lib/theme';
import type { Portal } from '@/lib/homePortal';

const HALF = {
  flex: 1,
  minHeight: 44,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
};

const TEXT = {
  fontFamily: 'Anton_400Regular' as const,
  fontSize: 16,
  letterSpacing: 0.05 * 16,
  textTransform: 'uppercase' as const,
};

/**
 * The two faces of home. EVENTS is organiser-hosted tournaments and stays the
 * default; PLAY is the player ecosystem.
 *
 * Each side carries its own accent — brand orange for the organiser side,
 * auction magenta for yours — reusing the meanings DESIGN.md §2 already assigns
 * them rather than inventing a third colour.
 */
export function PortalSwitch({
  portal,
  live,
  onChange,
}: {
  portal: Portal;
  live: boolean;
  onChange: (p: Portal) => void;
}) {
  const isPlay = portal === 'play';

  return (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 13,
        borderWidth: 1.5,
        borderColor: colors.line,
        borderRadius: 5,
        backgroundColor: colors.panel,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="Events"
        accessibilityState={{ selected: !isPlay }}
        onPress={() => { if (isPlay) onChange('events'); }}
        style={{ ...HALF, backgroundColor: isPlay ? 'transparent' : colors.brand }}
      >
        <Text style={{ ...TEXT, color: isPlay ? '#7d7d7d' : colors.ink }}>Events</Text>
      </Pressable>

      <Pressable
        accessibilityRole="tab"
        accessibilityLabel={live ? 'Play, a match is live' : 'Play'}
        accessibilityState={{ selected: isPlay }}
        onPress={() => { if (!isPlay) onChange('play'); }}
        style={{ ...HALF, backgroundColor: isPlay ? colors.auction : 'transparent' }}
      >
        {live ? (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: isPlay ? '#240614' : colors.auction,
            }}
          />
        ) : null}
        <Text style={{ ...TEXT, color: isPlay ? '#240614' : '#7d7d7d' }}>Play</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest PortalSwitch`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/PortalSwitch.tsx __tests__/PortalSwitch.test.tsx
git commit -m "feat: the events/play portal switch"
```

---

### Task 6: Play portal

Host/join, your record per sport, and the blended recent feed. Every figure here comes from an endpoint that already exists.

**Files:**
- Create: `src/components/home/PlayPortal.tsx`
- Test: `__tests__/PlayPortal.test.tsx`

**Interfaces:**
- Consumes: `CareerProfile` and `RecentMatch` from `@/api/career`, `QuickMatch` from `@/api/quickMatch`.
- Produces: `PlayPortal({ profile, recent, matches, playerId, loading, onRetry })` — `profile: CareerProfile | null`, `recent: RecentMatch[] | null`, `matches: QuickMatch[]`, `playerId?: string`, `loading: boolean`, `onRetry: () => void`.

- [ ] **Step 1: Write the failing test**

`__tests__/PlayPortal.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { PlayPortal } from '../src/components/home/PlayPortal';
import type { CareerProfile, RecentMatch } from '../src/api/career';

const profile: CareerProfile = {
  sports: [
    { sport: 'badminton', played: 31, decided: 31, won: 21, lost: 10, tied: 0, noResult: 0, winRate: 21 / 31 },
  ],
  bestSport: null,
};

const recent: RecentMatch[] = [
  {
    _id: 'r1',
    matchId: 'm1',
    sport: 'badminton',
    context: 'quick',
    result: 'won',
    playedAt: '2026-09-09T10:00:00.000Z',
    title: 'Rohan v Dev',
    scoreline: '21-18, 21-16',
  },
];

const props = (over = {}) => ({
  profile,
  recent,
  matches: [],
  playerId: 'p1',
  loading: false,
  onRetry: jest.fn(),
  ...over,
});

describe('PlayPortal', () => {
  it('always offers Host and Join', () => {
    const { getByLabelText } = render(<PlayPortal {...props()} />);
    expect(getByLabelText('Host a match')).toBeTruthy();
    expect(getByLabelText('Join with a code')).toBeTruthy();
  });

  it('renders the win rate as a percentage, not the 0-1 fraction', () => {
    const { getByText } = render(<PlayPortal {...props()} />);
    expect(getByText('68%')).toBeTruthy();
  });

  it('lists a recent match with its scoreline', () => {
    const { getByText } = render(<PlayPortal {...props()} />);
    expect(getByText(/rohan v dev/i)).toBeTruthy();
    expect(getByText(/21-18, 21-16/)).toBeTruthy();
  });

  // The ledger outlives the matches it describes, so `title` can be absent.
  it('survives a feed row whose match could not be read', () => {
    const bare: RecentMatch[] = [
      { _id: 'r2', matchId: 'm2', sport: 'cricket', context: 'tournament', result: 'lost', playedAt: '2026-09-01T00:00:00.000Z' },
    ];
    const { getByText } = render(<PlayPortal {...props({ recent: bare })} />);
    expect(getByText(/match unavailable/i)).toBeTruthy();
  });

  // DESIGN.md §5: an empty state names what would appear and offers the one
  // action that fills it — which is Host, already at the top. It must not offer
  // a second competing action.
  it('names what is missing when nothing has been played', () => {
    const { getByText, queryByText } = render(
      <PlayPortal {...props({ profile: { sports: [], bestSport: null }, recent: [] })} />
    );
    expect(getByText(/your record/i)).toBeTruthy();
    expect(getByText(/once you have played/i)).toBeTruthy();
    expect(queryByText(/^start playing$/i)).toBeNull();
  });

  it('keeps the chrome while loading rather than blanking', () => {
    const { getByLabelText } = render(
      <PlayPortal {...props({ profile: null, recent: null, loading: true })} />
    );
    expect(getByLabelText('Host a match')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest PlayPortal`
Expected: FAIL — `Cannot find module '../src/components/home/PlayPortal'`

- [ ] **Step 3: Write minimal implementation**

`src/components/home/PlayPortal.tsx` — build it to match `PlayFull.dc.html`, in the order the artboard has it: host/join block, your record, recent matches.

Rules that the tests pin and the artboard assumes:
- `winRate` is a **0-1 fraction**. Render `Math.round(s.winRate * 100)`; never recompute it from `won/decided`.
- A sport with `decided: 0` renders `0%`, not `NaN%`. Guard it.
- `noResult` is shown in the W/L line (`13W · 12L · 1NR`) and excluded from the rate — `played` and `decided` are not interchangeable.
- `RecentMatch.title` and `.scoreline` are both optional. Fall back to `Match unavailable` for a missing title, and render nothing where a scoreline is absent.
- Host pushes `/quick/new`, Join pushes `/quick/join`, both via `router.push` from `expo-router`.
- `matches` is what surfaces a live quick match as the **top row** of the recent list, above the ledger rows — the artboard shows it with a `Live` tag, a `Quick` tag and `HOSTING`/`PLAYING`. Use `isHost(match, playerId)` and `outcomeLabel` / `formatLabel` from `@/lib/quickMatchView`, and `scoreLine` from `@/lib/quickCricketView` for cricket, exactly as `src/app/quick/index.tsx` does — do not write a second formatter. Pass `playerId` in as a prop alongside `matches`.
- Accessibility labels exactly: `Host a match`, `Join with a code`.
- Empty record block copy: `Win rate, form and best sport appear here once you have played. Tournament matches count towards it too — so does anything you score above.`
- While `loading` with nothing cached, render the host/join block plus `Skeleton` shapes from `@/components/states` — never an `ActivityIndicator` that blanks the portal.

Reuse `Tag` from `@/components/StatusPill` for the result and context pills, and `Skeleton` / `ErrorBlock` from `@/components/states`. Use `colors` from `@/lib/theme` rather than literal hexes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest PlayPortal`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/PlayPortal.tsx __tests__/PlayPortal.test.tsx
git commit -m "feat: the play portal — host, your record, recent matches"
```

---

### Task 7: Wire the home screen

**Files:**
- Modify: `src/app/(tabs)/home.tsx`
- Test: `__tests__/HomeScreen.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 3–6.
- Produces: the finished screen.

- [ ] **Step 1: Write the failing test**

`__tests__/HomeScreen.test.tsx`:

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import tournamentReducer from '@/store/slices/tournamentSlice';
import Home from '../src/app/(tabs)/home';

// This test is about the portal switch, not about loading. Stub the thunk so
// nothing reaches axios, and give the screen a real store — the repo builds
// stores with preloadedState rather than a mock-store library (see
// __tests__/uploadProfileImage.test.ts). Do NOT add redux-mock-store.
jest.mock('@/store/slices/tournamentSlice', () => {
  const actual = jest.requireActual('@/store/slices/tournamentSlice');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    fetchPublicTournaments: Object.assign(() => ({ type: 'tournament/noop' }), { pending: { type: 'p' }, fulfilled: { type: 'f' }, rejected: { type: 'r' } }),
  };
});
jest.mock('../src/api/quickMatch', () => ({ listMyQuickMatches: jest.fn(async () => []) }));
jest.mock('../src/lib/useCareer', () => ({
  useCareer: () => ({ profile: { sports: [], bestSport: null }, recent: [], loading: false, error: false, recentError: false, reload: jest.fn() }),
}));

const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer, tournament: tournamentReducer },
    preloadedState: {
      auth: { user: { _id: 'p1', firstName: 'Rohan' }, isLoading: false, error: null },
      tournament: { publicTournaments: [], isLoading: false, error: null },
    } as never,
  });

const renderHome = () => render(<Provider store={makeStore()}><Home /></Provider>);

describe('Home', () => {
  it('opens on the events portal', () => {
    const { getByLabelText } = renderHome();
    expect(getByLabelText('Events').props.accessibilityState.selected).toBe(true);
  });

  it('crosses to the play portal and back', async () => {
    const { getByLabelText } = renderHome();
    fireEvent.press(getByLabelText('Play'));
    await waitFor(() => expect(getByLabelText('Host a match')).toBeTruthy());

    fireEvent.press(getByLabelText('Events'));
    await waitFor(() => expect(getByLabelText('Play').props.accessibilityState.selected).toBe(false));
  });

  // The masthead renders from cached auth state, which is the whole point of
  // the Patterns sheet — it must survive every load and every error.
  it('keeps the masthead across a portal change', () => {
    const { getByLabelText, getByText } = renderHome();
    expect(getByText('Kria')).toBeTruthy();
    fireEvent.press(getByLabelText('Play'));
    expect(getByText('Kria')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest HomeScreen`
Expected: FAIL — no portal switch on the screen yet.

- [ ] **Step 3: Rewrite the screen**

`src/app/(tabs)/home.tsx` keeps its data loading and owns portal state. Structure:

1. Existing tournament loading, unchanged.
2. `const [portal, setPortal] = useState<Portal>('events')`.
3. `const career = useCareer(user?._id)`.
4. Quick matches via `listMyQuickMatches()` in a `useFocusEffect` (imported from **expo-router**), into local state — same shape as `src/app/quick/index.tsx`. Load them regardless of portal: the dot on the PLAY tab has to be right before you cross over.
5. Masthead: the logo at 33×29, `Kria` in Anton at 23/21, notification button, avatar. **No `PLAYER` overline** — it was removed from the design.
6. Under the masthead, replace `<Hazard />` with a 2px `rgba(255,255,255,0.10)` rule carrying a 54px bar in the live portal's accent, offset 16px from the left. The hazard rule now belongs only on an art edge.
7. `<PortalSwitch portal={portal} live={hasLiveQuickMatch(matches)} onChange={setPortal} />`.
8. The strip line from `portalStrip(...)`, in `SpaceMono_700Bold` 9px, letter-spacing `0.14 * 9`.
9. `{portal === 'events' ? <EventsPortal ... /> : <PlayPortal ... />}`.

Total career `played` for the strip is `career.profile?.sports.reduce((n, s) => n + s.played, 0) ?? 0`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest HomeScreen`
Expected: PASS, 3 tests.

- [ ] **Step 5: Full verification**

```bash
npx jest
npx tsc --noEmit
```
Expected: whole suite green; only the 4 known `antonLeading.test.ts` errors.

```bash
git diff --stat HEAD~5
grep -rnE "as any|: any|@ts-ignore|console\.|\?\? ''|\|\| ''" src/components/home src/components/navigation src/components/icons/nav.tsx src/lib/homePortal.ts
```
Expected: the grep returns nothing.

- [ ] **Step 6: Look at it on a device**

```bash
npx expo start
```

Check, in this order:
1. Home opens on EVENTS and the tournament list is exactly as before.
2. The switch crosses to PLAY and back.
3. The Host circle lifts clear of the bar and its ring reads as a notch.
4. Explore and Live are visibly dimmed and do nothing when tapped.
5. Nothing in either portal scrolls under the floating bar.
6. `.expo/types` regenerates — new expo-router files can throw phantom route-type errors until a brief `npx expo start` refreshes it. Never commit from `.expo/`.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(tabs)/home.tsx" __tests__/HomeScreen.test.tsx
git commit -m "feat: split home into the events and play portals"
```

---

## Not in this plan

Deliberately deferred, with what blocks each:

- **Filter sheet** — client-side and unblocked (`sport`, `city`, `status` are all accepted by `getAllTournamentsValidator`); only the footer's result count needs a new count query. Next plan.
- **Player profile** — `CareerProfile`, `PublicPlayer.titles[]` and `PublicHistoryEntry` cover most of it, but the achievement badges need a new aggregate over `MatchParticipation`, and **Follow and Challenge have no model at all**.
- **Explore and Live screens** — the two disabled nav slots.
- **Top players** — needs a platform-wide ranking route; none exists in `careerStats.route.ts`.
- **Light mode** — `Light.dc.html` is a direction test, not an approved theme. DESIGN.md §7 still says the app has no light theme.
