# Reward and motion layer: design

**Date:** 27 Nov 2026. **Status:** design, awaiting your approval of this document.
**Background:** `d:\kria\GAMIFICATION-MOTION.md` has the research, the Mobbin references and the reasoning. That document's preview was approved on 27 Nov, with the user's choice: "restrained plus one radial burst". This spec is the buildable part of it. Where the two differ, this spec wins.

---

## 1. Intent

**What.** The player app should feel alive and rewarding in the moments that matter:
- you finish a match
- you earn an award
- you climb the rankings
- you win a knockout

It should feel tactile everywhere else: press, select and score. It stays a serious sports-career app.

**Why.** Today nothing in the app reacts when a player wins, earns a badge or enters the rankings. Every animation is a short timed fade or slide, and only three controls have haptics.

**Success looks like:**
- Each of the four moments plays once, at the right time, with numbers the API returned.
- Each one feels as finished as the approved preview.
- Each one is skippable with a tap.
- With reduced motion on, each one is an opacity-only version that is just as clear.

## 2. Goals, non-goals, anti-goals

**Goals (this round)**
1. A motion foundation:
   - spring tokens
   - a primary button that presses down into its own edge
   - one haptic map
   - a list stagger
   - a rolling number
2. **Match result moment** for rally sports (badminton, table tennis).
3. **Award reveal:** a full-screen coin mint with one sweep and one burst, for milestones, titles, honours and knockout wins. Each plays once, with "already seen" tracking and "New" dots on Awards.
4. **Rankings:**
   - first-load stagger
   - one pop on your row
   - a "Win your next N to pass X (#k)" line
   - scroll to your row on "See full rankings"
   - ghost rows in the empty state
5. **Knockout champion moment:** the reveal, then the champion's path drawn through the bracket.
6. **DESIGN.md v1.2:** the §9 / §11 / §13 amendment and the small edits (§10 of `GAMIFICATION-MOTION.md`).
7. **Adjacent fixes in the touched area:**
   - **M22:** lint errors in `RallyRoom.tsx` and `BottomSheet.tsx`.
   - **M24 (part):** cap text scaling on fixed-height controls and on every new component.
   - **M21 (part):** Events list virtualised.

**Non-goals (deferred, decided 27 Nov)**
- **Weekly play streak:** server gap #44, later. When it comes, weeks run Monday to Sunday in Asia/Kolkata for everyone.
- **Milestone ladder 10/50/100/250:** server gap #43. This round works with the server's current achievements (`matches-50`, `matches-100`, `wins-25`, `sports-2`).
- **Rank movement arrows (#41).** Also: clearing the rankings cache on completion (#42). The up-to-5-minute lag is accepted, so the result moment shows no rank number.
- **A result moment for cricket.** `CricketBoard` keeps its result as it is.
- **Live-feed event cards** ("Game 2 to Asha 21–18").
- **A setting to turn celebrations off.** Reduced motion covers it.
- **The rest of M24:** the other ~98 `display()` call sites, `+not-found.tsx`, stale Edit-profile errors, unused permissions. **The rest of M21:** Profile's request count.

**Anti-goals.** This is a failure even if it works:
- Showing a number the API didn't return, or a stale one, as if it were new.
- Two celebrations in one screen visit, or one that blocks a tap.
- Confetti, particle showers, mascots, sound, full-bleed colour, looping pulses, XP or currency.
- Praise or guilt copy ("Amazing", "Don't lose your streak"), or exclamation marks.
- A new dependency.

## 3. Constraints

- **Stack** (`package.json`): Expo 58, React Native 0.88, Reanimated 4.7.1, react-native-worklets 0.13, gesture-handler 3.3, react-native-svg 15.16, expo-haptics. `mobile/AGENTS.md` still says SDK 57; it is stale.
- **Animation runs on the UI thread** (shared values, `useAnimatedStyle` / `useAnimatedProps`, layout animations). JavaScript runs only at a timeline's start and end, never `setState` per frame. Target: 60fps on a mid-range Android.
- **Reduced motion is opacity only:** fades ≤ 160ms, final values at once, before → after shown as text. Haptics still fire. Nothing is conveyed by motion alone. Every component checks `useReducedMotion()`, as all 15 current animated files do.
- **Real data only** (DESIGN §2.1). Every figure traces to an endpoint and field, listed per moment below.
- **One celebration per screen visit:** at most one Moment or Milestone tier. It never blocks, and a tap anywhere jumps to the end state.
- **The app is unpublished** (no installed versions to stay compatible with). The data is test data, so there are no migrations or backfills.
- **Git.** Don't commit; the user commits. Spec and plan files stay untracked until then.

## 4. Approaches considered

**How to animate**
- **A. Reanimated, react-native-svg and expo-haptics, in our own components (chosen).** Everything in the preview is transforms, opacity, a clip and one SVG transform, so all of it runs on the UI thread with what's installed. `AwardBadge` already draws every badge procedurally.
- **B. Lottie for the reveals (rejected).** It needs designed art per badge and metal, can't render our procedural metals, adds a native dependency and a JSON file per animation, and pulls toward the illustrated look DESIGN bans.
- **C. Skia for badges and particles (rejected).** It adds several MB to the APK and means rewriting `AwardBadge`, for effects (particles, shaders) that v1.2 bans anyway.

**Where the full-screen reveal mounts**
- **A. React Native `Modal`, transparent and `statusBarTranslucent`, rendered by the screen that triggers it (chosen).** `BottomSheet` already does exactly this (`components/ui/BottomSheet.tsx:114`). It covers the tab bar and stack headers, and needs no store or global host.
- **B. A global host in `app/_layout.tsx` after `<Stack>`**, as `LaunchAnimation` does at :110. That needs a store or context to trigger it from any screen, which only pays off if many screens trigger reveals. Three do.
- **C. An expo-router `transparentModal` route.** Navigation is wrong for a skippable overlay: Back semantics, the route stack, and a flash on Android.

## 5. Decisions already made (user, 27 Nov)

1. **How loud:** restrained, plus **one radial burst** at milestone-tier reveals. Confetti and full-bleed colour stay banned.
2. **Losses:** the same staged result moment, with neutral motion (no `bouncy`) and `impactAsync(Soft)`.
3. **Streak:** deferred. When built, Asia/Kolkata, Monday to Sunday.
4. **Rankings cache:** the 5-minute lag is accepted, and no rank number appears in the result moment.
5. **Celebration off switch:** none.
6. **From the research doc (unchanged):** the haptic map, the tiers and the timings below. Plus two details settled while building the preview:
   - On a win that also mints a milestone, the mint uses `impactAsync(Medium)`, because the win already used the visit's one Success.
   - The 100% bar pop is scaleY 1 → 1.5 → 1.

---

## 6. Part A: motion foundation

### A1. Tokens (`constants/theme.ts`)

Add:

```ts
export const spring = {
  snappy: { damping: 32, stiffness: 400, mass: 1 }, // damping ratio 0.80 · 1.5% overshoot · settles ~400ms: press release, thumbs
  bouncy: { damping: 17, stiffness: 220, mass: 1 }, // damping ratio 0.57 · 11% overshoot  · settles ~680ms: badge landing, row pop
  gentle: { damping: 26, stiffness: 170, mass: 1 }, // damping ratio 1.00 · no overshoot   · settles ~580ms: text entrances
  fill:   { damping: 19, stiffness: 180, mass: 1 }, // damping ratio 0.71 · 4% overshoot   · settles ~580ms: bar or ring change
} as const;
```

Plus `colors.accentLip = '#B8411A'`. Always pass a token to `withSpring`: Reanimated 4's default spring differs from these.

### A2. Haptic map (`lib/haptics.ts`, new)

One module that wraps `expo-haptics`, swallows failures (`.catch(() => {})`), and names events rather than styles:

| Function | Call | Used by |
|---|---|---|
| `point()` | `impactAsync(Light)` | RallyRoom swipe (replaces the direct call at `RallyRoom.tsx:64`) |
| `gameEnd()` | `impactAsync(Medium)` | RallyRoom, when a game closes (Games tally increments) |
| `press()` | `impactAsync(Light)` | Primary `Button` press-in |
| `select()` | `selectionAsync()` | TabBar, Segmented, Toggle (replaces its direct call), Rankings row pop |
| `win()` | `notificationAsync(Success)` | Result moment |
| `loss()` | `impactAsync(Soft)` | Result moment |
| `award()` | `notificationAsync(Success)` | Reveal, at the end of the mint |
| `mint()` | `impactAsync(Medium)` | Inline mint after a win |
| `tick()` | `impactAsync(Light)` | A bar reaching 100% |

Rule (a comment in the module): at most one `notificationAsync` per screen visit; never in a loop. Under reduced motion, haptics still fire.

### A3. Primary button press-down (`components/ui/Button.tsx`)

- **Primary only.** A 4px `accentLip` edge sits under the face. **The outer size is unchanged**: the face is `height − 4`, so no layout moves.
  - **Press-in:** the face moves down 4px over `motion.fast` (`ease.standard`), covering the lip, and `haptics.press()` fires.
  - **Release:** `withSpring(0, spring.snappy)`.
  - **Reduced motion:** no travel; face opacity 1 → 0.8 while held.
  - **Disabled:** no lip, no travel.
- **Secondary and `Tap`:** keep the 0.96 scale. The release becomes `withSpring(1, spring.snappy)` instead of the 160ms timing.
- **Text scaling:** the label gets `maxFontSizeMultiplier={1.3}` (M24).

### A4. Selection controls

- **`Segmented`:** the thumb x and width use `withSpring(…, spring.snappy)`, still instant on the first layout and under reduced motion. Changing segment fires `haptics.select()`. Labels get `maxFontSizeMultiplier={1.3}`.
- **`TabBar`:** the pill keeps `motion.tab` / `ease.tab`. A tab press fires `haptics.select()`. Labels get `maxFontSizeMultiplier={1.3}`.
- **`Toggle`:** unchanged, apart from routing its haptic through `haptics.select()`.

### A5. `RollNumber` (`components/ui/RollNumber.tsx`, new)

- **Props:** `{ from: string; to: string; style: TextStyle; delay?: number; play: boolean }`. `from` and `to` are formatted strings of equal length ("58.3%" → "61.5%", "12" → "13", "49" → "50").
- **Rendering:** each changed digit is a column of 20 digits (0–9 twice) in a box exactly one line high, with overflow hidden.
- **Motion:** the column's `translateY` moves over 520ms (`ease.standard`) after `delay`. For an increase it rolls up through the digits; for a decrease it rolls down. Unchanged characters are plain `Text`.
- **Implementation:** a pure `rollPlan(from, to)` in `lib/rollPlan.ts` returns each character's start and end column index. The preview's rule:
  - increase: start `a`, end `b > a ? b : b + 10`
  - decrease: start `a + 10`, end `b < a ? b + 10 : b`
- **Unequal lengths:** if the lengths differ, render `to` statically.
- **Reduced motion:** a 160ms crossfade from `from` to `to`.
- **Text scaling:** `maxFontSizeMultiplier={1.3}`. Numbers use the display font with tabular figures.

### A6. List stagger (`lib/motion.ts`, new)

`enterStagger(i: number, reduced: boolean)` returns a Reanimated layout animation:
- **Normal:** `FadeInUp` with its distance cut to 8px (`withInitialValues({ transform: [{ translateY: 8 }] })`; check the direction on device), duration 220, `ease.enter`, delay `min(i, 5) × 40`.
- **Reduced motion:** `FadeIn.duration(160)`.

Use it **only on a list's first load after its skeleton**: never on refresh, filter change or "Load more". This round it applies to Rankings rows and Events cards.

---

## 7. Part B: match result moment

### Trigger

All four must be true:
1. `quick/[id].tsx` shows a **rally** match (`badminton` or `table_tennis`).
2. The viewer holds a claimed slot (`match.sides[].slots[].playerId === meId`, with `meId` from `useAppSelector(s => s.auth).user?._id`).
3. The room was open while the match was `waiting` or `live`.
4. The status then changed to `completed`. The screen already detects this with its `prevStatus` ref effect (`quick/[id].tsx:72-86`); extend that, don't duplicate it.

A completed match opened later shows today's `RallyDone`, unchanged.

**Host redirect wins.** If the existing host redirect to `/knockout/awards/[id]` fires on the same change, the moment doesn't play.

### Data (no new endpoints)

- **Before:** when the room opens with the match `waiting` or `live` and the viewer claimed, call `getCareerProfile(meId)` once (`GET /player/career/:id`) and keep `sports[]` and `achievements[]`.
- **After:** on the change to `completed`, call it again. The server drops the career cache on completion.
- **Consistency check.** Let `s` be the match's sport, `youWon` whether the viewer's side is `outcome`, and `decided` whether `outcome` is `side1`, `side2` or `tied`. The change shows only if both hold:
  - `after[s].decided === before[s].decided + (decided ? 1 : 0)`
  - `after[s].won === before[s].won + (youWon ? 1 : 0)`

  If the check fails, retry the "after" fetch **once after 1.5s**. If it still fails, or either fetch errors, there is no moment: show today's `RallyDone`.
- **Pure logic.** `lib/resultMoment.ts` exports `buildResultMoment(before, after, match, meId)`. It returns a view model or `null`:
  - `outcome: 'win' | 'loss' | 'tie' | 'nr'`
  - `winRate: { from, to }`, formatted to one decimal place with "%". A `from` of 0 decided becomes "—", and a roll from "—" renders statically.
  - `decided: { from, to }`
  - `next`: the rank threshold while `after.decided < RANK_MIN`; otherwise the unearned achievement with the smallest `target − progress`; otherwise `null`. It carries `{ label, remaining, unit, fromFraction, toFraction }`.
  - `qualified`: true when `before.decided < RANK_MIN ≤ after.decided`
  - `minted`: an achievement whose `earned` flipped from false to true; at most one, and if several flip, the first in server order
- **Hook.** `lib/useResultMoment.ts` holds the fetches, the retry and a "played" flag, so the moment plays once per screen instance.

### What it shows (inside `RallyDone`, above and below today's content)

- **Result letter chip** before the headline: W / L / T / NR, with W in `accentTint`/`accentInk` and L in `lossTint`/`lossInk`. The headline itself is today's `resultSummary` (e.g. "Asha & Ravi win 2–1").
- **Game rows:** today's rows.
- **Three tiles**, separated by hairlines rather than boxes:

  | Tile | Label | Value | Sub-line |
  |---|---|---|---|
  | Win rate | "Win rate" | `RollNumber` from → to | "was 58.3%" (or "first decided match") |
  | Decided | "Decided" | `RollNumber` from → to | "+1 this match" (no-result: "No result: not counted") |
  | Next | "Next" | "3 more" | "to get ranked", or "to 50 matches" / "to 25 wins" / "to 2 sports" |

  Leave the Next tile out when `next` is null.
- **Progress line** for `next`:
  - Label: the achievement label ("Play 50 matches"), or "Decided matches" for the rank threshold.
  - Right side: "`<RollNumber>` of N".
  - A 6px bar with an accent fill, moving from `fromFraction` to `toFraction`.
- **Qualify line**, when `qualified`, in place of the progress line: "You've reached 5 decided matches in badminton. You'll appear in the rankings within a few minutes."
- **Inline mint**, when `minted`:
  - a 96px coin (from awardsView's milestone mapping), with the earned silver clipped over the locked coin
  - label "Milestone · earned in this match"
  - title, e.g. "50 matches played"
  - "Next: 100." when a higher target of the same kind exists in `achievements`
- **Credit line:** today's credit line, last.

### Timeline (Moment tier; existing actions stay live throughout)

| t (ms) | What | Motion | Haptic |
|---|---|---|---|
| 0 | Chip and headline | Fade, rise 8px, `gentle` | win `win()` · loss `loss()` · tie / NR none |
| 120 | Game rows | Rise, 40ms apart, 220ms `ease.enter` | |
| 360 | Tiles | Fade and rise; rolls start (520ms) | |
| 700 | Progress line | Fade | |
| 880 | Bar | `toFraction < 1`: `withSpring(spring.fill)`. `= 1`: 220ms timing to 100% exactly. | |
| 1100 | (only if the bar reached 100%) | scaleY 1 → 1.5 → 1, `snappy` | `tick()` |
| 1150 | Inline mint (if any) | Section rises in; earned metal fills bottom to top over 520ms | |
| 1670 | Mint done | One shine sweep, 680ms | `mint()` if `win()` already fired, else `award()` |
| 1000 / 1700 | Credit line | Fade | |

- **Totals:** ≤ 1.2s without a mint, ≤ 2.4s with one.
- **Losses:** same timeline. Replace `gentle` with plain timing fades (`ease.standard`, 220ms), so nothing overshoots.
- **A tap anywhere on the result area** sets every shared value to its final state.
- **Reduced motion:** every section fades in together over 160ms with final values, and the "was …" sub-lines carry the change.

---

## 8. Part C: award reveal and "already seen"

### C1. Stable award identity

`Award.key` in `lib/awardsView.ts` is positional for titles and honours (`title-${i}`, `honour-${i}`), so it can't identify an award across sessions. Add `seenKeys: string[]` to `Award`, built from raw data by a pure `awardSeenKey()` in `lib/rewardSeen.ts`:

| Source | Key | Notes |
|---|---|---|
| Achievement | `ach_${id}` | |
| Title | `title_${tournamentId}_${categoryId}_${place}` | Legacy titles without ids get **no key**: never revealed, never "New" |
| Honour (not a knockout win) | `hon_${badge}_${ref ?? tournamentId ?? ''}_${title}` | Mirrors the server's dedupe identity `(title, badge, ref\|tournamentId)` |
| Knockout win (`badge === 'knockout-winner'`) | `ko_${ref}` | `ref` is the knockout id. A grouped knockout cell carries one key per win. |

Keys are sanitised to `[A-Za-z0-9._-]` (anything else becomes `_`), cut to 120 characters, and stored as `seen_${meId}_${key}`.

### C2. Two states per award (`lib/rewardSeen.ts`)

Each earned award key is in one of three states:

| State | Store key | Meaning |
|---|---|---|
| new | none | Never celebrated. A reveal candidate, and shows a "New" dot. |
| announced | `ann_${meId}_${key}` | A reveal already played for a batch it belonged to. **Never revealed again**, but still shows a "New" dot. |
| opened | `seen_${meId}_${key}` | The player has seen it: revealed full-screen, or its `AwardSheet` was opened. No dot. |

- **Storage.** The existing `@/lib/secureStore` wrapper (`getItem` / `setItem`, with a `localStorage` fallback on web), one key per state per award, value `"1"`. This avoids the platform's value-size limit.
- **Session cache.** An in-memory map per player for the session, so focus checks don't re-read the store.
- **API:**
  - `loadStates(meId, keys): Promise<Map<string, 'new' | 'announced' | 'opened'>>`
  - `markAnnounced(meId, keys)`
  - `markOpened(meId, keys)` (opened implies announced)
  - `seedIfNeeded(meId, earnedKeys): Promise<boolean>`
- **Seeding.** If `seen_seeded_${meId}` is absent, mark every currently earned key opened, set the flag and return `true` (no reveal this time). Existing accounts get no reveals and no dots for what they already had.

### C3. When a reveal plays

- **Screens:** Home on focus, and the Awards tab on focus.
- **Data:** Home gets one new request: `getPublicPlayer(meId)` (titles, honours), joining its focus `load()`. Home already has career achievements and `listMyQuickKnockouts`. Both screens feed the same `buildAwards(...)`. No notification exists for an organiser-given title or honour (`api/notifications.ts`), which is why Home must look.
- **Choosing.** A pure `nextReveal(awards, states)` in `lib/awardsView.ts` takes only **new** keys. The batch is every earned award with a new key. It picks one candidate:
  - family order: title, then honour, then knockout, then milestone
  - within a family: newest `awardedAt` first; milestones in server order
- **Gating.** The reveal opens only when all of these hold:
  - the screen is focused (`useIsFocused()` from `expo-router`)
  - the cold-start launch animation has finished
  - no `BottomSheet` or other reveal is open
  - the result moment or knockout champion moment hasn't already celebrated on this visit

  **The launch signal.** `LaunchAnimation` doesn't expose one today; its visibility is a local `useState` in `app/_layout.tsx:110`. Add a tiny module singleton, `lib/launchGate.ts`, with `markLaunchDone()` and `whenLaunchDone(): Promise<void>`. It is already resolved when no launch is shown. This is a module flag, not a store.
- **Marking.** When the mint completes (820ms), or on skip or dismiss, whichever comes first:
  - `markOpened(candidate)`
  - `markAnnounced(rest of the batch)`

  If the screen loses focus before then (the push-ask screen, a notification tap, navigation), the reveal closes without marking and can play again on a later focus. "See award" on Home leads to Awards, and Awards finds nothing new, so there's no second reveal.
- **"New" dots.** On Awards, an earned cell with any new or announced key shows an 8px `accent` dot at its top right. Opening its `AwardSheet` marks its keys opened.
- **Other moments mark their own key opened** when they play: the result moment's inline mint (`ach_…`) and the knockout champion (`ko_…`).

### C4. `AwardReveal` (`components/rewards/AwardReveal.tsx`, new)

- **Container:** an RN `Modal` (transparent, `animationType="none"`, `statusBarTranslucent`, `navigationBarTranslucent`), as in `BottomSheet`.
- **Props:** `{ award: Award; line: string; onSeeAward: () => void; onDone: () => void }`.
- **Layout:**
  - `bg` at 94% opacity
  - a 168px badge centred, with the top at ~150px
  - for milestones, the previous tier (dimmed to 0.55) and the next locked tier at 84px on either side
  - the label in the metal's `base` colour
  - the title in `display(40)`
  - the line in 14.5px `text3`
  - a primary **See award** and a text **Done** at the bottom
- **Buttons:**
  - **See award:** on Home it goes to the Awards tab; on Awards it opens that award's `AwardSheet`.
  - **Done:** closes.
  - Android Back closes, as Done does.

**Timeline (Milestone tier, ≤ 2.4s; a tap anywhere jumps to the end):**

| t (ms) | What | Motion | Haptic |
|---|---|---|---|
| 0 | Scrim | Fade, 160ms | |
| 80 | **Locked** badge | Scale 0.6 → 1, `bouncy`; fade 160ms | |
| 300 | Earned metal | Clip fills bottom to top over 520ms (the Milestone component's technique) | |
| 820 | Mint done | **One** shine sweep (760ms) and **one radial burst**: 8 strokes, 3×16px, in the metal's `light` colour, radius ~96 → 126px, 320ms, once | `award()` |
| 900 | Label, title, line | Fade and rise 8px, 60ms apart, `gentle` | |
| 1300 | Side tiers (milestones only) | Slide in from ±24px to 0.55 opacity, `gentle` | |
| 1600 | Buttons | Fade | |

**Reduced motion:** the scrim, the earned badge and the text fade in together over 160ms. No scale, fill, sweep, burst or side tiers.

**`AwardBadge` change.** `shine` accepts `true | number`:
- `true` keeps today's endless 4.2s loop.
- A number runs exactly that many sweeps, then stops.

The reveal uses `1`. The burst lives in `AwardReveal`, not in `AwardBadge`.

**Copy (all from fields; no exclamation marks):**

| Family | Label | Title | Line |
|---|---|---|---|
| Milestone | "Milestone" | `${target} ${unit} played` / `${target} wins` / `${target} sports played` | "Next: 100." when a higher target of the same kind exists; else empty |
| Title | "Title · Winner" / "Title · Runner-up" | `tournamentName` | `${categoryName}. Awarded ${d MMM yyyy}.` (date omitted without `awardedAt`) |
| Honour | "Honour" | honour `title` | `${eventName} · ${MMM yyyy}` (each part only if present) |
| Knockout | "Knockout winner" | knockout name (`eventName`, or the name from `listMyQuickKnockouts`) | "Your 3rd knockout win." (ordinal of the count) |

---

## 9. Part D: rankings

Files: `components/compete/Rankings.tsx`, `lib/competeView.ts`, `app/(tabs)/compete.tsx`.

- **Next-rank line.** Add a pure `nextRankLine(board, meId): string | null` to `lib/competeView.ts`.
  - Find the viewer's index `i` in `board`. If `i ≤ 0` (not on the board, or #1), return null.
  - Otherwise, with `me = board[i]` and `a = board[i − 1]`, find the smallest integer `x` in 1…10 where `(me.won + x)·a.decided > a.won·(me.decided + x)`, or the two are equal and `me.decided + x > a.decided`. This is the server's order: win rate desc, then decided desc. Use integers, never rounded rates.
  - Return "Win your next ${x} to pass ${a.firstName} (#${i})", or null if there's no such `x` (for example, the player above is at 100% and you've lost a match).
  - It renders as a third line in your own row (12.5px `text2`).
- **First load.** After the skeleton, the first 6 rows use `enterStagger(i)`. Your row fades in (160ms) at the end of the stagger, then pops once (scale 1 → 1.03 → 1 over 420ms) with `haptics.select()`. The next-rank line fades in 160ms later. A sport switch counts as a first load (it shows a skeleton). Expand and collapse do not.
- **See full rankings.**
  - After expanding, scroll the screen's `ScrollView` (`compete.tsx:58`, which already has a ref) so your row is centred, using a native animated `scrollTo`.
  - About 350ms later, play the row pop and `haptics.select()`.
  - Rankings needs a way to ask `compete.tsx` to scroll: a prop that reports your row's y. That plumbing is left to the builder.
- **Empty state.** Replace the outline icon with three ghost rows: rank "—", grey bars, and the middle row in `accentTint` with your initials from `meName`. The title, line and button stay as today. The rows use `enterStagger`.
- **No movement arrows and no rank in the result moment** (decisions 4, #41/#42).

## 10. Part E: knockout champion

Files: `app/knockout/[id].tsx`, `components/Bracket.tsx`, `lib/knockoutRoom.ts`.

- **Trigger.** `k.status === 'completed'`, `k.championEntrantId` set, `myEntrant(k, meId) === k.championEntrantId` (`lib/knockoutRoom.ts:64-67`), and `ko_${k._id}` not seen.
  - It plays whether the completion was seen live (`knockout:update`) or the screen was opened later. "Seen" tracking makes it once only.
  - **Builder:** confirm cricket knockouts' `entrants[].playerKeys` are filled. If not, resolve the viewer's team through `teams`.
- **Step 1:** `AwardReveal` with the knockout family (hexagon, bronze, sport icon, ×N from honours). Copy: "Knockout winner" · `k.name` · "${wins} wins to the title. Your ${ordinal} knockout win."
  - `wins` counts the fixtures whose `winnerEntrantId` is the champion, excluding byes.
  - Marking follows C3: `ko_${k._id}` is marked opened at mint completion or on dismiss, and focus gating applies.
- **Step 2, on Done or See award:** the champion's path is drawn through the final bracket.
  - Add a prop to `components/Bracket.tsx`, `highlight?: { fixtureIds: string[]; play: boolean }`. The `fixtureIds` come from a pure `championPath(k)` in `lib/knockoutRoom.ts`.
  - **Only the champion's half of each link lights.** Today's connectors are plain Views: `s.join` is a bordered bracket shape spanning both feeding matches, and `s.wire` runs into the next card.
    - The highlight is a **new half-connector** drawn over them in `accent` (2px): a horizontal stub out of the champion's card, a vertical run to the link's midpoint, then the wire into the next card.
    - Don't copy `s.join`: that would light the beaten player's half, and scaling it squashes its rounded corners.
  - **It follows the path on screen.** 8 entrants put the final at x ≈ 472–672, past a phone's width, and the bracket sits below the champion block (and below "Awards given" for a host). So:
    - 160ms after the overlay closes, `knockout/[id].tsx` scrolls its outer list so the bracket is in view. That needs a ref on its outer scroll view and the bracket's layout y.
    - Then each round in turn:
      1. The bracket's horizontal `ScrollView` scrolls (native animated) so that round's target card is in view.
      2. Its three segments grow from the champion's side: stub scaleX, run scaleY, wire scaleX, with `transformOrigin` set to the starting edge.
    - Rounds run 240ms apart, so the scroll has time to land.
  - When the last segment lands, the champion's name in the final card turns `accentInk`.
  - **Reduced motion:** the bracket scrolls without animation, and the segments appear with a 160ms fade.
  - The existing static `card.mine` accent border stays.
- **"See award"** here goes to the Awards tab; there's no in-place sheet.
- **The champion block** (`[id].tsx:172-181`) is unchanged. Its `shine` loop stays: it's the one badge in that viewport.

## 11. Part F: DESIGN.md v1.2

Apply `GAMIFICATION-MOTION.md` §10 as written, with the burst sentence in its approved form:
- §9 replaced
- §11 replaced
- §13 appended
- §5.2 gets the lip paragraph
- §5.7: "min 10" becomes "min 5", plus the next-rank line and scroll-to-you
- §8: the Result and Empty-leaderboard rows
- §14: the milestone tiers point at gap #43

Bump the header to v1.2 with the date.

## 12. Part G: adjacent fixes

- **M22: lint in the two touched files.**
  - **`RallyRoom.tsx`:**
    - refs read during render at 60, 68 and 84: move `live.current = …` into an effect, and create the PanResponder with `useState(() => PanResponder.create(…))[0]`
    - the unescaped entity at 138
  - **`BottomSheet.tsx`:**
    - `set-state-in-effect` at 69
    - shared-value writes at 84, 86, 95 and 99: use Reanimated 4's `.set()`
    - refs during render at 90, 92 and 119
  - **Pass mark:** both files lint clean, and the repo total (60 errors, 1 warning) does not rise.
- **M24 (part): text scaling.** `maxFontSizeMultiplier={1.3}` (DESIGN §10's cap) on the `Button` label, `TabBar` labels, `Segmented` labels, and every `Text` in the new components. The other `display()` sites are left for M24's own pass.
- **M21 (part): Events.**
  - `app/(tabs)/events.tsx` renders up to 100 cards in a `ScrollView` (:88). Convert the card list to a virtualised `FlatList` (or `SectionList` if the featured and past sections need it), with the same look, focus reload and filters.
  - The first 6 cards use `enterStagger` on first load only.
  - Pull-to-refresh isn't added.

---

## 13. Testing and gates

**Pure logic, unit-tested** in `__tests__/`, named like `awardsView.test.ts`:
- **`rollPlan`:** increase, decrease, wrap, equal digits, unequal length.
- **`buildResultMoment`:** win, loss, tie, no-result, failed consistency check, first decided match, crossing the rank threshold, achievement flip, nothing next.
- **`awardSeenKey`:** each source, legacy title without ids, sanitising, length cap.
- **`seedIfNeeded`, `loadStates`, `markAnnounced`, `markOpened`:** expo-secure-store is mocked in `jest.setup.ts`. Cover: opened implies announced; seeding opens everything earned.
- **`nextReveal`:** family priority, recency, announced keys excluded, nothing new.
- **`whenLaunchDone`:** already resolved when no launch is shown.
- **`nextRankLine`:** the preview's board (#8 → "Win your next 2 to pass Dev (#7)"), equal-rate tie-break, #1, off the board, unreachable, x > 10.
- **`championPath`:** byes, path length per round count.

**Screen tests**, view models only, never timings:
- **`QuickMatchScreen.test.tsx`:** extend it. It already mocks `useQuickMatch` and `@/store/hooks`; mock `getCareerProfile` as well. Live → completed with a consistent before and after renders the chip and tiles. An inconsistent pair renders today's result. Opening an already-completed match renders today's result.
- **Awards:** an unseen earned award shows a "New" dot, and opening its sheet clears it.
- **Rankings:** the next-rank line text; ghost rows when the board is empty.

Reanimated stays real in tests (the resolver in `jest.config.js`). Don't mock it.

**Gates, all must pass:**
1. `npx tsc --noEmit` is clean.
2. `npx jest --maxWorkers=2` is green. Last full count: 139 suites / 1,114 tests on 25 Nov; it should only grow.
3. ESLint: clean on every new and touched file, and the whole-repo error count is no higher than 60.
4. The worklet bundle check from `mobile/AGENTS.md` (`grep -c "__workletHash"`) is non-zero and higher than before.
5. **Device check, owed to the user, on a mid-range Android in Expo Go:**
   - the result moment as a winner and as a loser
   - an award reveal, with seeding on first run
   - rankings: stagger, pop, scroll-to-you, ghost rows
   - the knockout path
   - the press-down button
   - all of the above with system reduced motion on
   - haptics felt on the device
   - the JS thread idle in the perf monitor during each moment

## 14. Files

| Area | New | Changed |
|---|---|---|
| Foundation | `lib/haptics.ts`, `lib/motion.ts`, `lib/rollPlan.ts`, `components/ui/RollNumber.tsx` | `constants/theme.ts`, `components/ui/{Button,Tap,Segmented,Toggle}.tsx`, `components/navigation/TabBar.tsx` |
| Result moment | `lib/resultMoment.ts`, `lib/useResultMoment.ts` | `app/quick/[id].tsx`, `components/room/RallyRoom.tsx` (`RallyDone`, haptics, lint) |
| Reveal | `lib/rewardSeen.ts`, `lib/launchGate.ts`, `components/rewards/AwardReveal.tsx` | `lib/awardsView.ts` (`seenKeys`, `nextReveal`), `components/AwardBadge.tsx` (`shine` count), `app/(tabs)/home.tsx`, `app/(tabs)/awards.tsx`, the Awards grid cell (dot), `components/awards/AwardSheet.tsx` (mark seen on open) |
| Rankings | — | `lib/competeView.ts`, `components/compete/Rankings.tsx`, `app/(tabs)/compete.tsx` |
| Knockout | — | `lib/knockoutRoom.ts` (`championPath`), `components/Bracket.tsx` (`highlight`, half-connectors, follow scroll), `app/knockout/[id].tsx` (outer scroll ref) |
| Launch | — | `components/LaunchAnimation.tsx` or `app/_layout.tsx` (call `markLaunchDone()`) |
| Fixes | — | `components/ui/BottomSheet.tsx`, `app/(tabs)/events.tsx` |
| Docs | — | `mobile/DESIGN.md` (v1.2) |

## 15. Left to the builder

- Component decomposition inside each part, and the names of internal helpers not listed above.
- How `Rankings` tells `compete.tsx` where your row is (§9).
- `FlatList` versus `SectionList` for Events, and its item keys.
- Exact easing for the burst strokes, within its 320ms and radius.
- Whether the shine-count change is a new prop or the widened `shine` prop, as long as `true` keeps today's behaviour.
- Verifying cricket knockout entrants' `playerKeys` (§10).

## 16. Review notes (builder check, 27 Nov)

A fresh reviewer read this spec against the code. Its claims held: the `prevStatus` effect, the RallyRoom line numbers, the positional `Award.key`, the `secureStore` API, `BottomSheet`'s `Modal`, the View-based connectors, the server's ranking order, and the career cache dropped on completion. It raised four questions. All four are settled above as my calls, for you to check:

1. **Several new awards at once:** one reveal per batch, and the rest wait as "New" (the approved wording). That needs two states per award (C2).
2. **Collisions:** the reveal waits for the launch animation, plays only while its screen is focused, and is marked only once it has actually been seen (C3).
3. **Knockout path off-screen:** the bracket scrolls into view and follows the path round by round, 240ms apart (§10).
4. **Champion's half only:** a new half-connector lights only the champion's half of each link (§10).
