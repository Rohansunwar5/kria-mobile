# Tournament Filter Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the events portal's hard-coded sport and city chips with a real filter — a bottom sheet offering sport, city and stage, plus an active-filter bar on home showing what is applied and how many results it yields.

**Architecture:** The three filter values collapse from separate `useState` calls into one `filters` object owned by `home.tsx`, so adding a fourth later touches one shape rather than three. The sheet is React Native's built-in `Modal` — **the first `Modal` in this codebase**; there is no sheet library installed and none is needed. The result count comes from `total`, which the server already returns and the mobile thunk currently throws away.

**Tech Stack:** React Native / Expo SDK 57, expo-router 57, Redux Toolkit, jest + @testing-library/react-native.

**Spec:** `mobile/docs/design-canvas/home-portals/body-Filters.html` (the sheet) and `body-Main.html`'s filter bar — the row of dismissible chips with the count button, which replaces the chips currently in `EventsPortal`. Published canvas: https://claude.ai/code/artifact/bd825a92-5749-49cb-8e6b-3a8b2bde4184
Design system: `mobile/DESIGN.md`.

## Global Constraints

- **Paramount: only ADD paths.** The tournament list itself must keep working exactly as it does — this plan changes how filters are *chosen*, never how results are fetched or rendered.
- **No new dependencies.** Use `Modal` from `react-native`. Do not add a bottom-sheet library.
- **Offer only filters the server accepts.** `getAllTournamentsValidator` (`server/src/middlewares/validators/tournament.validator.ts`) accepts `status`, `sport`, `city`, `page`, `limit` and nothing else. A control for entry fee, date range or format would be a control that cannot work — do not add one.
- `npm install --legacy-peer-deps` if you ever need it — bare `npm install` fails ERESOLVE. Read `mobile/AGENTS.md` before touching dependencies.
- TypeScript strict mode is **off** — not licence for `any`. No line you add may contain `as any`, `: any`, `@ts-ignore`, `console.`, `?? ''` or `|| ''`.
- 2-space indent, single quotes. Inline `style={{...}}` objects with shared style constants, matching `src/components/profile/CareerCard.tsx` — not NativeWind classes.
- **44px minimum hit target** on every interactive element, even where the artboard draws smaller.
- **Colour is never the only signal** (DESIGN.md §7) — a selected filter must carry a mark or a word, not just a fill.
- **Anton leading floor: every Anton style needs `lineHeight / fontSize >= 1.188`.** `__tests__/antonLeading.test.ts` enforces it and it guards a real iOS cap-clipping bug. Raise the `lineHeight`, never shrink the `fontSize`, and never weaken the fence. Note the fence reads integer literals only — a ternary slips past it, so check those by hand.
- Colours from `src/lib/theme.ts`. Fonts: `Anton_400Regular` (display, uppercase), `SpaceGrotesk_*` (interface), `SpaceMono_*` (**all numerics**).
- Navigation from `expo-router`, never `@react-navigation/*`.
- Run `npx jest` and `npx tsc --noEmit`. **The tsc baseline is 2 pre-existing errors**, both `TS2591` in `__tests__/antonLeading.test.ts`. Zero new; do not fix those 2.
- Commit after every task. Do not push.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/store/slices/tournamentSlice.ts` | **Modify.** Keep the `total` the server already sends instead of discarding it. |
| `src/lib/tournamentFilters.ts` | **New.** The `Filters` shape and pure helpers: active-filter descriptors, applied count, defaults. No React. |
| `src/components/home/FilterSheet.tsx` | **New.** The `Modal` sheet: sport, city, stage, reset, apply. |
| `src/components/home/FilterBar.tsx` | **New.** Applied chips plus the count button that opens the sheet. |
| `src/components/home/EventsPortal.tsx` | **Modify.** Swap the inline sport/city chips for `FilterBar`. |
| `src/app/(tabs)/home.tsx` | **Modify.** Own one `filters` object; pass it down; feed the thunk. |

---

### Task 1: Keep the result total

The server has always returned `{ tournaments, total }` (`server/src/repository/tournament.repository.ts:146`). The mobile thunk reads `payload.tournaments` and drops `total` on the floor. The sheet's "Show N events" button needs it.

**Files:**
- Modify: `src/store/slices/tournamentSlice.ts`
- Test: `__tests__/tournamentSlice.test.ts` (exists — add to it)

**Interfaces:**
- Consumes: nothing.
- Produces: `state.tournament.publicTotal: number`. The thunk's fulfilled payload becomes `{ tournaments: Tournament[]; total: number }`.

- [ ] **Step 1: Read the existing test file first**

`__tests__/tournamentSlice.test.ts` already covers this slice. Read it and match its idiom — do not invent a second style of slice test in the same file.

- [ ] **Step 2: Write the failing tests**

Add to `__tests__/tournamentSlice.test.ts`:

```ts
describe('fetchPublicTournaments — the result total', () => {
  it('keeps the total the server sent', () => {
    const state = reducer(
      undefined,
      { type: fetchPublicTournaments.fulfilled.type, payload: { tournaments: [{ _id: 't1' }], total: 12 } }
    );
    expect(state.publicTournaments).toHaveLength(1);
    expect(state.publicTotal).toBe(12);
  });

  // The old payload was a bare array. If anything still dispatches that shape,
  // the list must survive rather than the reducer throwing on payload.tournaments.
  it('survives a bare-array payload without losing the list', () => {
    const state = reducer(
      undefined,
      { type: fetchPublicTournaments.fulfilled.type, payload: [{ _id: 't1' }] }
    );
    expect(state.publicTournaments).toHaveLength(1);
    expect(state.publicTotal).toBe(1);
  });

  it('falls back to the page length when the server omits a total', () => {
    const state = reducer(
      undefined,
      { type: fetchPublicTournaments.fulfilled.type, payload: { tournaments: [{ _id: 'a' }, { _id: 'b' }] } }
    );
    expect(state.publicTotal).toBe(2);
  });

  it('resets the total to 0 when a load fails', () => {
    const loaded = reducer(
      undefined,
      { type: fetchPublicTournaments.fulfilled.type, payload: { tournaments: [{ _id: 't1' }], total: 12 } }
    );
    const failed = reducer(loaded, { type: fetchPublicTournaments.rejected.type, payload: 'boom' });
    expect(failed.publicTotal).toBe(0);
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx jest tournamentSlice`
Expected: FAIL — `publicTotal` is undefined.

- [ ] **Step 4: Implement**

In `src/store/slices/tournamentSlice.ts`:
- Add `publicTotal: number` to `TournamentState` and `0` to `initialState`.
- In the thunk, return `{ tournaments: data, total: typeof payload.total === 'number' ? payload.total : data.length }` instead of bare `data`.
- In `fulfilled`, handle both shapes: an array payload keeps today's behaviour with `total = length`; an object payload reads both fields.
- In `rejected`, set `publicTotal` to `0` alongside the existing error handling. Leave `publicTournaments` exactly as the existing code leaves it — do not change failure behaviour of the list.

- [ ] **Step 5: Verify**

Run: `npx jest tournamentSlice` — PASS. Then `npx jest` — full suite green.

- [ ] **Step 6: Commit**

```bash
git add src/store/slices/tournamentSlice.ts __tests__/tournamentSlice.test.ts
git commit -m "feat: keep the tournament result total the server already sends"
```

---

### Task 2: Filter view-logic

**Files:**
- Create: `src/lib/tournamentFilters.ts`
- Test: `__tests__/tournamentFilters.test.ts`

**Interfaces:**
- Consumes: `CITIES`, `SPORTS` from `@/lib/tournamentConstants`.
- Produces:
  - `type Filters = { sport: string; city: string; status: string }`
  - `EMPTY_FILTERS: Filters` — all `'All'`
  - `STAGES: { value: string; label: string; tone: 'open' | 'live' | 'auction' | 'ended' }[]`
  - `appliedChips(f: Filters): { key: keyof Filters; label: string }[]`
  - `appliedCount(f: Filters): number`
  - `clearOne(f: Filters, key: keyof Filters): Filters`
  - `toQuery(f: Filters): { sport?: string; city?: string; status?: string }`

- [ ] **Step 1: Write the failing test**

`__tests__/tournamentFilters.test.ts`:

```ts
import {
  EMPTY_FILTERS, STAGES, appliedChips, appliedCount, clearOne, toQuery,
} from '../src/lib/tournamentFilters';

describe('tournament filters', () => {
  it('starts with nothing applied', () => {
    expect(appliedCount(EMPTY_FILTERS)).toBe(0);
    expect(appliedChips(EMPTY_FILTERS)).toEqual([]);
  });

  it('counts and labels each applied filter', () => {
    const f = { sport: 'badminton', city: 'Bangalore', status: 'All' };
    expect(appliedCount(f)).toBe(2);
    expect(appliedChips(f)).toEqual([
      { key: 'sport', label: 'Badminton' },
      { key: 'city', label: 'Bangalore' },
    ]);
  });

  // The chip says what a human picked, not the enum the server takes.
  it('labels a stage with its human name, not its enum value', () => {
    expect(appliedChips({ ...EMPTY_FILTERS, status: 'registration_open' }))
      .toEqual([{ key: 'status', label: 'Open' }]);
  });

  it('clears one filter without touching the others', () => {
    const f = { sport: 'cricket', city: 'Pune', status: 'ongoing' };
    expect(clearOne(f, 'city')).toEqual({ sport: 'cricket', city: 'All', status: 'ongoing' });
  });

  // 'All' is the unfiltered sentinel and must never reach the query string —
  // the server would treat it as a literal city named "All".
  it('omits every unset filter from the query', () => {
    expect(toQuery(EMPTY_FILTERS)).toEqual({});
    expect(toQuery({ sport: 'badminton', city: 'All', status: 'ongoing' }))
      .toEqual({ sport: 'badminton', status: 'ongoing' });
  });

  // Only what getAllTournamentsValidator accepts.
  it('offers only stages the server understands', () => {
    expect(STAGES.map((s) => s.value)).toEqual([
      'registration_open', 'ongoing', 'auction_in_progress', 'completed',
    ]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tournamentFilters`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/tournamentFilters.ts`. Notes that matter:
- `'All'` is the unfiltered sentinel for all three keys — reuse the one `CITIES`/`SPORTS` already use rather than inventing `null`.
- Chip order is `sport, city, status`, stable, so chips do not reshuffle as filters are added.
- Sport labels are title-cased for display (`badminton` → `Badminton`); the value stays the lowercase enum.
- `STAGES` labels reuse `STATUS_TAG` from `@/lib/tournamentConstants` where the wording already exists, so the sheet and the cards cannot drift apart in wording.

- [ ] **Step 4: Verify**

Run: `npx jest tournamentFilters` — PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tournamentFilters.ts __tests__/tournamentFilters.test.ts
git commit -m "feat: filter shape, labels and query mapping"
```

---

### Task 3: The filter sheet

**Files:**
- Create: `src/components/home/FilterSheet.tsx`
- Test: `__tests__/FilterSheet.test.tsx`

**Interfaces:**
- Consumes: `Filters`, `EMPTY_FILTERS`, `STAGES` from Task 2; `CITIES`, `SPORTS` from `@/lib/tournamentConstants`.
- Produces: `FilterSheet({ visible, filters, resultCount, onApply, onClose })` — `onApply: (f: Filters) => void`, `onClose: () => void`.

**Behaviour that the design implies and the tests pin:** the sheet edits a DRAFT. Tapping a chip changes nothing on the screen behind it; `onApply` fires only from the footer button, and `onClose` discards. That is what makes "Show N events" meaningful.

- [ ] **Step 1: Write the failing test**

`__tests__/FilterSheet.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { FilterSheet } from '../src/components/home/FilterSheet';
import { EMPTY_FILTERS } from '../src/lib/tournamentFilters';

const props = (over = {}) => ({
  visible: true,
  filters: EMPTY_FILTERS,
  resultCount: 12,
  onApply: jest.fn(),
  onClose: jest.fn(),
  ...over,
});

describe('FilterSheet', () => {
  it('shows the result count on the apply button', () => {
    const { getByText } = render(<FilterSheet {...props()} />);
    expect(getByText(/show 12 events/i)).toBeTruthy();
  });

  it('uses the singular for one result', () => {
    const { getByText } = render(<FilterSheet {...props({ resultCount: 1 })} />);
    expect(getByText(/show 1 event$/i)).toBeTruthy();
  });

  // Editing a draft is the whole point of an apply button.
  it('does not apply until the footer button is pressed', () => {
    const p = props();
    const { getByLabelText, getByText } = render(<FilterSheet {...p} />);
    fireEvent.press(getByLabelText('Badminton'));
    expect(p.onApply).not.toHaveBeenCalled();

    fireEvent.press(getByText(/show 12 events/i));
    expect(p.onApply).toHaveBeenCalledWith({ ...EMPTY_FILTERS, sport: 'badminton' });
  });

  it('toggles a selected filter back off', () => {
    const p = props({ filters: { ...EMPTY_FILTERS, sport: 'badminton' } });
    const { getByLabelText, getByText } = render(<FilterSheet {...p} />);
    fireEvent.press(getByLabelText('Badminton'));
    fireEvent.press(getByText(/show 12 events/i));
    expect(p.onApply).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  it('resets every filter without closing', () => {
    const p = props({ filters: { sport: 'cricket', city: 'Pune', status: 'ongoing' } });
    const { getByText } = render(<FilterSheet {...p} />);
    fireEvent.press(getByText(/^reset$/i));
    expect(p.onClose).not.toHaveBeenCalled();
    fireEvent.press(getByText(/show 12 events/i));
    expect(p.onApply).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  // Colour is never the only signal (DESIGN.md §7).
  it('announces selection to a screen reader, not just by fill', () => {
    const { getByLabelText } = render(
      <FilterSheet {...props({ filters: { ...EMPTY_FILTERS, sport: 'badminton' } })} />
    );
    expect(getByLabelText('Badminton').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('Cricket').props.accessibilityState.selected).toBe(false);
  });

  it('gives every control a 44px hit target', () => {
    const { getByLabelText } = render(<FilterSheet {...props()} />);
    for (const label of ['Badminton', 'Cricket', 'Bangalore', 'Open']) {
      expect(getByLabelText(label).props.style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  // Reopening after a discarded edit must not resurrect the discarded draft.
  it('starts from the applied filters each time it opens', () => {
    const p = props();
    const { rerender, getByLabelText, getByText } = render(<FilterSheet {...p} />);
    fireEvent.press(getByLabelText('Cricket'));
    rerender(<FilterSheet {...p} visible={false} />);
    rerender(<FilterSheet {...p} visible />);
    fireEvent.press(getByText(/show 12 events/i));
    expect(p.onApply).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest FilterSheet`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Build to match `docs/design-canvas/home-portals/body-Filters.html`: grab handle, `FILTER` title with `CLEAR ALL`, then Sport (two tiles), City (wrapping chips), Stage (2-column grid), then the footer with `Reset` and the count button.

- **This is the first `Modal` in the codebase.** Use `Modal` from `react-native` with `transparent`, `animationType="slide"`, `onRequestClose={onClose}` (Android back button — without it the sheet traps the user), and a pressable backdrop that calls `onClose`.
- Draft state lives in the sheet. Reset it from `filters` whenever `visible` goes true — the last test pins this.
- `accessibilityRole="button"` with `accessibilityState={{ selected }}` on every option, and an `accessibilityLabel` equal to the option's visible label — the tests query `Badminton`, `Cricket`, `Bangalore` and `Open` by label, and a screen-reader user needs the same handle a sighted one has.
- Sport tiles use the existing `Icon` (`shuttlecock`, `cricket-bat`) from `@/components/icons` — the industrial set, since this is content chrome, not nav.
- The stage swatches are 9px squares, not circles (DESIGN.md §3), and each carries its word.
- Wrap the sheet body in a `ScrollView` — seven cities plus four stages will overflow a short phone.

- [ ] **Step 4: Verify**

Run: `npx jest FilterSheet` — PASS, 8 tests. Then check by hand that no Anton style you wrote has `lineHeight / fontSize < 1.188`.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/FilterSheet.tsx __tests__/FilterSheet.test.tsx
git commit -m "feat: the tournament filter sheet"
```

---

### Task 4: The filter bar

**Files:**
- Create: `src/components/home/FilterBar.tsx`
- Test: `__tests__/FilterBar.test.tsx`

**Interfaces:**
- Consumes: `Filters`, `appliedChips`, `appliedCount` from Task 2.
- Produces: `FilterBar({ filters, onClear, onOpen })` — `onClear: (key: keyof Filters) => void`, `onOpen: () => void`.

- [ ] **Step 1: Write the failing test**

`__tests__/FilterBar.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { FilterBar } from '../src/components/home/FilterBar';
import { EMPTY_FILTERS } from '../src/lib/tournamentFilters';

const props = (over = {}) => ({
  filters: EMPTY_FILTERS,
  onClear: jest.fn(),
  onOpen: jest.fn(),
  ...over,
});

describe('FilterBar', () => {
  it('says what is showing when nothing is filtered', () => {
    const { getByText } = render(<FilterBar {...props()} />);
    expect(getByText(/all tournaments/i)).toBeTruthy();
  });

  it('shows a chip per applied filter', () => {
    const { getByText } = render(
      <FilterBar {...props({ filters: { sport: 'badminton', city: 'Pune', status: 'All' } })} />
    );
    expect(getByText('Badminton')).toBeTruthy();
    expect(getByText('Pune')).toBeTruthy();
  });

  it('clears just the chip that was dismissed', () => {
    const p = props({ filters: { sport: 'badminton', city: 'Pune', status: 'All' } });
    const { getByLabelText } = render(<FilterBar {...p} />);
    fireEvent.press(getByLabelText('Clear Pune filter'));
    expect(p.onClear).toHaveBeenCalledWith('city');
  });

  it('opens the sheet from the filter button', () => {
    const p = props();
    const { getByLabelText } = render(<FilterBar {...p} />);
    fireEvent.press(getByLabelText('Filter tournaments'));
    expect(p.onOpen).toHaveBeenCalled();
  });

  // The count is what tells you filters are on without reading the chips.
  it('carries the applied count on the button', () => {
    const { getByLabelText } = render(
      <FilterBar {...props({ filters: { sport: 'badminton', city: 'Pune', status: 'ongoing' } })} />
    );
    expect(getByLabelText('Filter tournaments, 3 applied')).toBeTruthy();
  });

  it('keeps the filter button at a 44px hit target', () => {
    const { getByLabelText } = render(<FilterBar {...props()} />);
    expect(getByLabelText('Filter tournaments').props.style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest FilterBar`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Match the filter bar in `body-Main.html`: applied chips on the left (each with a dismiss ✕), the filter button on the right carrying the count. With nothing applied, the left side reads `ALL TOURNAMENTS` in the 9px Space Mono overline style rather than sitting empty.

Chips scroll horizontally (`ScrollView horizontal`) — three chips will not fit beside the button on a narrow phone.

Accessibility labels exactly: `Clear <label> filter` per chip, `Filter tournaments` with no filters, `Filter tournaments, N applied` with some.

- [ ] **Step 4: Verify**

Run: `npx jest FilterBar` — PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/FilterBar.tsx __tests__/FilterBar.test.tsx
git commit -m "feat: the applied-filter bar"
```

---

### Task 5: Wire it in and retire the old chips

**Files:**
- Modify: `src/components/home/EventsPortal.tsx`
- Modify: `src/app/(tabs)/home.tsx`
- Test: `__tests__/EventsPortal.test.tsx`, `__tests__/HomeScreen.test.tsx` (both exist — add to them)

**Interfaces:**
- `EventsPortal`'s props change: `sport`, `city`, `cityOpen`, `onSport`, `onCity`, `onToggleCity` are REPLACED by `filters: Filters`, `onClearFilter: (key: keyof Filters) => void`, `onOpenFilters: () => void`. `tournaments`, `isLoading`, `error`, `onOpen`, `onRetry` are unchanged.

- [ ] **Step 1: Update the existing test fixture FIRST**

`__tests__/EventsPortal.test.tsx` has a `props()` helper passing the OLD props (`sport`, `city`, `cityOpen`, `onSport`, `onCity`, `onToggleCity`). Changing the component's interface breaks its four existing tests unless you update that helper in the same edit. Replace those six keys with `filters: EMPTY_FILTERS`, `onClearFilter: jest.fn()`, `onOpenFilters: jest.fn()`, and leave the other keys alone. The four existing tests must still pass unchanged afterwards — if any needs rewriting, that is a signal you changed behaviour you were not asked to change.

- [ ] **Step 2: Write the failing tests**

Add to `__tests__/EventsPortal.test.tsx`:

```tsx
it('shows the filter bar instead of the old sport chips', () => {
  const { getByLabelText, queryByText } = render(<EventsPortal {...props()} />);
  expect(getByLabelText('Filter tournaments')).toBeTruthy();
  // The hard-coded chip row is gone for good.
  expect(queryByText('BLR')).toBeNull();
});

it('offers a filter reset in the empty state only when a filter is applied', () => {
  const { queryByText } = render(<EventsPortal {...props({ tournaments: [] })} />);
  expect(queryByText(/clear filters/i)).toBeNull();

  const { getByText } = render(
    <EventsPortal {...props({ tournaments: [], filters: { sport: 'badminton', city: 'All', status: 'All' } })} />
  );
  expect(getByText(/clear filters/i)).toBeTruthy();
});
```

Add to `__tests__/HomeScreen.test.tsx`:

```tsx
it('opens the filter sheet from the bar and applies a choice', async () => {
  const { getByLabelText, getByText } = renderHome();
  fireEvent.press(getByLabelText('Filter tournaments'));
  await waitFor(() => expect(getByText(/^reset$/i)).toBeTruthy());

  fireEvent.press(getByLabelText('Cricket'));
  fireEvent.press(getByText(/show \d+ events?/i));

  // The chip proves the choice reached the screen's state, not just the sheet's.
  await waitFor(() => expect(getByText('Cricket')).toBeTruthy());
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx jest EventsPortal HomeScreen`
Expected: FAIL — no filter bar.

- [ ] **Step 4: Implement**

In `EventsPortal.tsx`:
- Delete the `SPORT_CHIPS` row, the city `Chip`, and the `cityOpen` `ScrollView` of cities entirely — the sheet owns all of that now. Remove the now-unused `CITIES`/`SPORTS`/`Chip` imports.
- Render `<FilterBar filters={filters} onClear={onClearFilter} onOpen={onOpenFilters} />` in their place.
- `filtersActive` (which drives the empty state's "Clear filters" CTA) becomes `appliedCount(filters) > 0`.
- **Change nothing else.** The featured card, the list, the skeleton, the error block and the empty-state copy stay exactly as they are — that is the tournament-discovery flow the paramount constraint protects.

In `home.tsx`:
- Replace the `sport`/`city`/`cityOpen` state with `const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)` and `const [sheetOpen, setSheetOpen] = useState(false)`.
- The load effect depends on `filters` and passes `toQuery(filters)` into the thunk alongside `limit: 20`.
- `portalStrip`'s `city` argument comes from `filters.city`.
- Render `<FilterSheet visible={sheetOpen} filters={filters} resultCount={publicTotal} onApply={(f) => { setFilters(f); setSheetOpen(false); }} onClose={() => setSheetOpen(false)} />`.
- `publicTotal` comes from the slice (Task 1).

**One honest caveat to write as a comment where `resultCount` is passed:** the count reflects the filters *currently applied*, not the draft being edited in the sheet, because the server is only asked once the user applies. Getting a live count per keystroke would need a count-only endpoint. Say so in the comment so the next reader does not think it is a bug.

- [ ] **Step 5: Verify**

Run: `npx jest` — full suite green. Then `npx tsc --noEmit` — 2 pre-existing errors only.

```bash
grep -rnE "as any|: any|@ts-ignore|console\.|\?\? ''|\|\| ''" src/components/home src/lib/tournamentFilters.ts
```
Expected: nothing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: real tournament filtering, replacing the hard-coded chips"
```

- [ ] **Step 7: Device check list (do not run `npx expo start` as a subagent — report this list instead)**

1. The sheet opens, scrolls, and closes on the Android back button.
2. Choosing a filter and applying reloads the list; dismissing a chip reloads it.
3. The count on the apply button matches what lands.
4. Nothing scrolls under the floating nav bar.

---

## Not in this plan

- **Player profile and the achievements aggregate** — its own plan; needs server work.
- **Top players** — needs a platform-wide ranking route over `MatchParticipation`.
- **Explore and Live screens** — the two nav slots stay disabled by decision.
- **A live draft count** — would need a count-only endpoint; the applied count is what ships.
- **Light mode** — `Light.dc.html` is a direction test, not an approved theme.
