# Live matches (3a–3c) and quick-cricket pad: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Live now feed, the badminton and cricket scoreboards, and the restyled host scoring pad for quick cricket, replacing the old live screens and cricket panels.

**Architecture:** View logic lives in pure libs: `lib/badmintonBoard.ts`, `lib/cricketBoard.ts`, `lib/cricketPad.ts` and `lib/liveFeedView.ts`. One `CricketBoard` component serves tournament and quick cricket through two adapters into one view model. Thin screens: `app/live/index.tsx`, `app/live/[matchId].tsx` and the cricket part of `app/quick/[id].tsx`. Live data comes from the existing socket client (`lib/socket.ts`) and the existing quick-match hooks.

**Tech Stack:** Expo SDK 57, React Native 0.86, expo-router 57 (typed routes), TypeScript 6, jest-expo + @testing-library/react-native, axios-mock-adapter, socket.io-client via `lib/socket.ts`.

**Spec:** `mobile/docs/superpowers/specs/2026-10-22-live-matches-design.md` (approved 2026-10-22). The approved pad preview is in `mobile/docs/superpowers/specs/2026-10-22-live-matches-pad-preview/*.dc.html`. Read both. The spec holds every copy string and rule this plan calls "per spec".

## Global Constraints

- **Paths:** under `d:/kria/mobile/` unless they start with `d:/`. Commands run from `d:/kria/mobile/`.
- **Git:** `d:/kria/mobile` is the user's git repo. Never run any git command; the controller snapshots changes separately. No commit steps: each task ends with `npx tsc --noEmit` clean and its jest files passing.
- **Imports:** new code uses tokens from `@/constants/theme` and UI from `@/components/ui/*` only. Never `@/lib/theme`, `@/components/icons`, NativeWind `className`, or hex literals outside `constants/theme.ts`.
- **Real data only:** no mock sample values. No join code anywhere a spectator can see it.
- **Motion:** the only motion is the digit flip (`FlipScore` timing). Respect reduced motion as `FlipScore` already does.
- **Copy:** per DESIGN §11, sentence case, no exclamation marks.
- **Typed routes:** after adding or removing a file under `src/app`, regenerate `.expo/types/router.d.ts`. Start `npx expo start --port 8081` in the background, wait until that file's modification time changes, then stop it.
- **Icons:** add missing Material Symbols names to `scripts/icons.mjs` and run `node scripts/icons.mjs`; only additions may appear in `iconPaths.ts`.
- **Packages:** install nothing new.
- **Deletions:** grep for importers first. Remove deleted files' entries from `test-utils/colourLiterals.ts` `MIGRATED` with a dated note.
- **Tone colours:** `accent` → `colors.accent`, `text` → `colors.text`, `text2` → `colors.text2`, `text3` → `colors.text3`, `text4` → `colors.text4`.

## Review Focus

1. **A socket drop mid-match.** The board shows "Reconnecting. Showing the last update." and reloads on reconnect. Pinned by Task 6 and Task 7 screen tests.
2. **Innings break and match end in cricket.** The hero switches to "Innings break · Target {t}" or the result. The chase never shows negative runs or balls. Pinned by Task 3 tests.
3. **A double tap on the pad while a ball is posting.** One post only. Pinned by a Task 8 screen test.
4. **A spectator in a quick cricket room.** They never see the pad, the toss controls or the join code. Pinned by a Task 8 screen test.
5. **Deuce and cap scores.** At 20–20 there is no chip. At 29–29 the chip reads "Next point wins the game". In best of 1, any game point is a match point. Pinned by Task 2 tests.

---

### Task 1: API types and server gaps

**Files:**
- Modify: `src/api/badmintonMatch.ts` (`BadmintonMatch` gains `positionInRound?: number; nextMatchId?: string; nextMatchSlot?: string; subMatchSlotNumber?: number; slotLabel?: string`)
- Modify: `src/api/cricketMatch.ts` (`CricketMatch` gains `categoryId?: string; positionInRound?: number; nextMatchId?: string; schedule?: { date?: string; time?: string; court?: string }`; export `getMatchLive(matchId)` returning `{ liveState: LiveState | null; recentBalls: unknown[] }` from `GET /sports/cricket/match/:id/live`)
- Modify: `d:/kria/SERVER-GAPS.md` (append #23–#30 in the existing entry format: Shows on / Today / Suggested / App follow-up)
- Test: `__tests__/cricketMatchApi.test.ts` (add one `getMatchLive` case)

**Interfaces:**
- Produces: the type fields above; `getMatchLive(matchId: string): Promise<{ liveState: LiveState | null }>`.

- [ ] **Step 1:** Add a failing test that `getMatchLive` unwraps `{ data: { data: { liveState: {...}, recentBalls: [] } } }` from `/sports/cricket/match/m1/live`. Run `npx jest __tests__/cricketMatchApi.test.ts` and confirm it FAILS.
- [ ] **Step 2:** Implement the types and the function. Append the gaps #23–#30, worded from the spec's "Server gaps to log" section with file references from the spec's Data table.
- [ ] **Step 3:** Run the same jest file and confirm it PASSES. `npx tsc --noEmit` must be clean.

---

### Task 2: Badminton board logic (`lib/badmintonBoard.ts`)

**Files:**
- Create: `src/lib/badmintonBoard.ts`
- Test: `__tests__/badmintonBoard.test.ts`

**Interfaces:**
- Consumes: `BadmintonMatch` (Task 1); `roundLabel` from `@/lib/knockoutRoom`.
- Produces:
  ```ts
  export interface RallyConfig { bestOf: number; pointsToWin: number; cap: number }
  export function rallyConfig(m: Pick<BadmintonMatch, 'matchConfig'>): RallyConfig; // defaults 3 / 21 / cap 30
  export function wouldWin(own: number, opp: number, c: RallyConfig): boolean;     // next point wins this game for `own`
  export function sides(m: BadmintonMatch): [{ name: string; team?: string; teamId?: string }, { name: string; team?: string; teamId?: string }];
  export interface BoardView {
    top: string;            // "Game 2 · Games 1–0" | "{winner} won 2–1"
    format: string;         // "Best of 3 · to 21"
    rows: [BoardRow, BoardRow];
    chip: string | null;    // "Game point · {name}" | "Match point · {name}" | "Next point wins the game" | "Next point wins the match"
    games: { n: number; score: string; winner: string; live: boolean }[];
    over: boolean;
  }
  export interface BoardRow { name: string; team?: string; teamId?: string; done: { v: number; won: boolean }[]; points: number | null; leading: boolean; lost: boolean }
  export function badmintonBoard(m: BadmintonMatch): BoardView;
  export function roundTitle(m: Pick<BadmintonMatch, 'bracketRound' | 'positionInRound' | 'tieId' | 'teams' | 'slotLabel' | 'subMatchSlotNumber'>): string;
  export function feedRound(round?: string): string | undefined; // raw bracketRound → label; tie codes (contain '-') → 'Team league'
  export function parseScoreline(s?: string): { a: number; b: number }[]; // "21-15, 4-3" → [{a:21,b:15},{a:4,b:3}]; junk → []
  ```
  The current game is the last `gameScores` entry without `winnerId`; when there is none and the match isn't completed, it's a fresh 0–0. Games won count `winnerId` matches against side ids (`player{n}.registrationId`, else `teams.team{n}Id`). Winner names in `games` and `top` use the side's last word (surname) for players and the full name for teams.

- [ ] **Step 1: Write the failing tests:**
  - `rallyConfig({})` → `{ bestOf: 3, pointsToWin: 21, cap: 30 }`; `{ matchConfig: { bestOf: 5, pointsToWin: 11 } }` → 5 / 11 / 30.
  - `wouldWin`:
    - `(20,18)` true; `(20,19)` true; `(20,20)` false; `(21,20)` true; `(28,28)` false; `(29,29)` true (cap);
    - with `{ pointsToWin: 11, … }`: `(10,8)` true, `(10,10)` false.
  - `badmintonBoard` in game 1 at 20–19 → `chip` `'Game point · Kulkarni'`. In game 2 with A having won game 1, at 20–15 → `'Match point · Kulkarni'`. At 20–20 → `null`. At 29–29 → `'Next point wins the game'`. At 29–29 when either side would also win the match → `'Next point wins the match'`. A completed match → `chip` null, `over` true, `points` null on both rows, `top` `'Kulkarni won 2–1'`.
  - Best of 1 at 20–10 → `'Match point · …'`.
  - Mid-match: `top` `'Game 2 · Games 1–0'`, `format` `'Best of 3 · to 21'`; `rows[0].done` `[{ v: 18, won: false }]`, `rows[1].done` `[{ v: 21, won: true }]`; `leading` true for the side with more current points; `games` includes the live game with `live: true` and winner `'In play'`.
  - Team match (no player1/2): names from `teams.team{1,2}Name`, `top` uses full team names.
  - `roundTitle`:
    - `{ bracketRound: 'Quarter-Final', positionInRound: 3 }` → `'Quarter-final 4'`
    - `'Final'` → `'Final'`; `'League'` → `'League'`
    - a tie sub-match `{ tieId: 't', teams: { team1Name: 'A', team2Name: 'B' }, slotLabel: "Men's singles 1" }` → `"A vs B · Men's singles 1"`; without `slotLabel` and with `subMatchSlotNumber: 2` → `'A vs B · Match 2'`
  - `feedRound('Semi-Final')` → `'Semi-final'`; `feedRound('S1-GroupA-T3')` → `'Team league'`; `feedRound(undefined)` → `undefined`.
  - `parseScoreline('21-15, 4-3')` → two games; `''` → `[]`; `'abc'` → `[]`.
- [ ] **Step 2:** Run `npx jest __tests__/badmintonBoard.test.ts` and confirm it FAILS.
- [ ] **Step 3:** Implement. `wouldWin(own, opp, c)` is `own + 1 >= c.cap ? own + 1 > opp : own + 1 >= c.pointsToWin && own + 1 - opp >= 2`.
- [ ] **Step 4:** Confirm it PASSES; `npx tsc --noEmit` clean.

---

### Task 3: Cricket board logic (`lib/cricketBoard.ts`)

**Files:**
- Create: `src/lib/cricketBoard.ts`
- Test: `__tests__/cricketBoard.test.ts`

**Interfaces:**
- Consumes:
  - From `@/lib/cricketView` (existing, reuse, don't copy): `currentRunRate`, `requiredRunRate`, `ballsRemaining`, `dismissalLine`, `ballChipKind`, `strikeRate`, `manhattanBars`.
  - Types `LiveState`, `Scorecard`, `CricketMatch`, `TeamBrand` (`@/api/cricketMatch`); `QuickMatch` (`@/api/quickMatch`); `cricketOutcomeLabel` (`@/lib/quickCricketView`).
- Produces:
  ```ts
  export interface BoardSide { id: string; name: string; crest?: string }
  export interface BoardInput {
    sides: [BoardSide, BoardSide];
    live: LiveState | null;
    scorecard: Scorecard | null;
    maxOvers: number;
    completed: boolean;
    result: string | null;                                   // already-worded result line
    toss: { winnerId?: string; decision?: 'bat' | 'bowl' } | null;
    squads: [string[], string[]];
  }
  export function fromTournament(m: CricketMatch, live: LiveState | null, scorecard: Scorecard | null, brands: Record<string, TeamBrand>, fallbackOvers?: number): BoardInput;
  export function fromQuick(m: QuickMatch, scorecard: Scorecard | null): BoardInput;
  export type ChipKind = 'wicket' | 'boundary' | 'extra' | 'run';
  export interface Chip { label: string; kind: ChipKind }
  export interface CricketBoardView {
    pill: string; pillLive: boolean;                          // "1st innings" | "Innings break" | "2nd innings" | "Completed" | "Not started"
    hero: {
      rows: { side: BoardSide; score: string | null; big: boolean }[];  // score "87/3" + overs "(6.2)" split below
      overs: (string | null)[];
      line:
        | { kind: 'chase'; need: number; balls: number; req: string; cur: string }
        | { kind: 'text'; text: string }
        | null;
    };
    defaultTab: 'live' | 'card' | 'overs';
    live: {
      batters: { name: string; striker: boolean; r: number; b: number; f: number; s: number; sr: string }[];
      partnership: string | null;
      bowler: { name: string; o: string; m: number; r: number; w: number; e: string } | null;
      thisOver: { chips: Chip[]; empty: number; runs: number } | null;
      lastOver: string | null;
      toss: string | null;
    } | null;
    innings: { key: 1 | 2; label: string; batting: { name: string; how: string; notOut: boolean; r: number; b: number; sr: string }[]; extras: string; total: string; bowling: { name: string; o: string; r: number; w: number; e: string }[]; fow: string }[];
    overs: { bars: { n: number; a: number; b: number | null; wicketB: boolean; current: boolean }[]; max: number; list: { n: number; chips: Chip[]; runs: number }[] };
    waiting: { line: string; squads: [string[], string[]] } | null;   // before the first ball
  }
  export function cricketBoard(i: BoardInput): CricketBoardView;
  ```
  - **`fromTournament`:**
    - `maxOvers` = `m.matchConfig?.maxOvers ?? fallbackOvers ?? 20`.
    - `result` = completed ? `"{winner} won {marginOfVictory}"`, or the `marginOfVictory` text when there's no winner (a tie) : null.
    - Crests from `brands[teamId]?.logo`; squads from the `cricketSetup` lineups' `startingXI` names.
  - **`fromQuick`:** `maxOvers` = `matchConfig.maxOvers ?? 20`; `result` = `cricketOutcomeLabel(m)` when completed; squads from the slots' `displayName`.
  - **Chip kinds:** `W` → wicket; `4`/`6` → boundary; labels starting with `wd`/`nb`/`lb`/`b` (not a plain digit) → extra; else run.

- [ ] **Step 1: Write the failing tests** (second innings fixture: target 119, live runs 87, wickets 3, `completedOvers` 6, `ballsInCurrentOver` 2, `maxOvers` 10, innings 1 summary 118/6 in 10.0):
  - `hero.line` → `{ kind: 'chase', need: 32, balls: 22, req: '8.73', cur: '13.74' }`; `pill` `'2nd innings'`, `pillLive` true; `rows` batting side `big: true`, score `'87/3'`, overs `'(6.2)'`; other side `'118/6'`, `'(10.0)'`.
  - First innings: no chase; the other side's score null with `hero.line` `{ kind: 'text', text: '{other} yet to bat' }`; `pill` `'1st innings'`.
  - `matchStatus: 'innings_break'` → `pill` `'Innings break'`, `hero.line` text `'Innings break · Target 119'`.
  - Completed → `pill` `'Completed'`, `pillLive` false, `hero.line` text = `result`, `defaultTab` `'card'`.
  - The chase never goes negative: runs 120 with target 119 → `need` 0 and the line becomes the result or null; no balls left → `balls` 0.
  - `live.batters`: striker first with `striker: true`, values from `battingCard` (r, b, fours, sixes, SR to 1 decimal).
  - `bowler` for `currentBowlerId` with economy to 2 decimals.
  - `thisOver` from the last `oversTimeline` entry: chips `['4','wd','1']`, `empty` 3, `runs` 6.
  - `lastOver` `'1 6 0 2 W 1 · 10 runs'`.
  - `toss` `'Rawnat won the toss and chose to bowl'`.
  - `innings[1].batting`: `how` from the matching `fallOfWickets.dismissalLine` (by `batterId`), `'not out'` with `notOut: true` when no dismissal; `'retired hurt'` when the dismissal type is `retired_hurt`.
  - `extras`: `'Extras 6 (wd 4, lb 2)'` (zeros skipped); `total` `'87/3 (6.2)'`.
  - `fow`: `'1-22 Kulkarni (1.5) · 2-58 Kumar (4.6)'`.
  - `innings[n].label`: `'{side} {runs}/{wickets}'`.
  - `overs.bars` pair over numbers across innings, with `current` true on the over in progress and `wicketB` when that over had a wicket; `list` newest first.
  - Before the first ball (`live` null or `matchStatus: 'awaiting_start'`): `waiting.line` `'Waiting for the toss'`, or `'Waiting for the first ball'` once the toss is set; `pill` `'Not started'`.
  - `fromQuick` maps sides by `sideId` and names; `fromTournament` maps `teams.team{1,2}Id/Name` and crests; both feed `cricketBoard` to the same view.
- [ ] **Step 2:** Run `npx jest __tests__/cricketBoard.test.ts` and confirm it FAILS.
- [ ] **Step 3:** Implement, reusing the `cricketView` helpers named above.
- [ ] **Step 4:** Confirm it PASSES; `npx tsc --noEmit` clean.

---

### Task 4: Pad logic (`lib/cricketPad.ts`)

Behaviour parity with today's `components/quick/CricketScorePanel.tsx` is the bar. Read it whole first. Its non-visual logic moves here: who must be picked, step transitions, `BallEntry` building, dismissed-batter filtering and the "+ wicket too" carry.

**Files:**
- Create: `src/lib/cricketPad.ts`
- Test: `__tests__/cricketPad.test.ts`

**Interfaces:**
- Consumes: `QuickMatch`, `BallEntry`, `WicketType` (`@/api/quickMatch`); `whoIsNeeded`, `isFirstBallOfInnings`, `battingSideId`, `bowlingSideId`, `canUndoBall` (`@/lib/quickCricketView`).
- Produces:
  ```ts
  export type ExtrasType = 'wide' | 'no_ball' | 'bye' | 'leg_bye';
  export type PadStep = 'keys' | 'extras' | 'wicket' | 'who' | 'fielder' | 'pick';
  export type PickRole = 'striker' | 'nonStriker' | 'bowler' | 'batter' | 'fielder';
  export interface PadState {
    step: PadStep;
    picks: { striker?: string; nonStriker?: string; bowler?: string; batter?: string };
    extras?: { type: ExtrasType; runs: number };
    alsoWicket: boolean;
    wicketType?: WicketType;
    dismissed?: string;
  }
  export const initialPad: PadState;
  export function nextPick(m: QuickMatch, s: PadState): PickRole | null;        // which player the engine still needs before a ball
  export function pickOptions(m: QuickMatch, s: PadState, role: PickRole, scorecard?: Scorecard | null): { id: string; name: string; figures?: string }[];
  export function pickTitle(m: QuickMatch, role: PickRole, wicket?: WicketType): string; // per spec titles
  export function ballFor(m: QuickMatch, s: PadState, extra: Partial<BallEntry>): BallEntry; // ids from liveState or picks
  export const WICKETS: { type: WicketType; label: string; hint: string }[];   // per preview: 'then fielder' | 'then batter' | 'then keeper' | ''
  export const FIELDER_TYPES: WicketType[];   // caught, run_out, stumped
  export const EITHER_END_TYPES: WicketType[]; // run_out, retired_hurt
  ```
  - **Pick titles:** striker → `'Opening batters'` (sub `'On strike'`); nonStriker → `'Opening batters'` (sub `'Non-striker'`); batter → `'Next batter'`; bowler → `'Over {n} · who's bowling?'`; fielder → `'Caught by'`, `'Run out by'` or `'Stumped by'`.
  - **Bowler figures:** `'{O}-{M}-{R}-{W}'` from the current innings' bowling card in the `scorecard` argument (the room already has it from `useQuickScorecard`), or `'yet to bowl'`. With no scorecard, there are no figures.

- [ ] **Step 1: Write the failing tests** by porting the behaviour cases of `__tests__/CricketScorePanel.test.tsx`, `CricketDismissedBatsman.test.tsx`, `CricketExtrasWicket.test.tsx` and `CricketPanelAffordances.test.tsx` that are about logic, not rendering. Cover at least:
  - the first ball needs striker → nonStriker → bowler, in that order;
  - after a wicket, `nextPick` is `batter`;
  - at the end of an over, `bowler`;
  - both at once → batter then bowler;
  - dismissed batters are excluded from batter options;
  - `ballFor` for a plain 4 uses `liveState` ids;
  - an extra with "wicket too" carries the extra into the wicket entry (`extrasType`, `extrasRuns`, `wicketType`, `dismissedPlayerId`);
  - a run out asks who's out, then the fielder (`dismissedPlayerId` is the chosen end, `fielderId` set);
  - a caught wicket skips "who" and goes to the fielder;
  - bowled, lbw and hit wicket record at once;
  - `canUndoBall` gating is unchanged.
- [ ] **Step 2:** Run `npx jest __tests__/cricketPad.test.ts` and confirm it FAILS.
- [ ] **Step 3:** Implement by moving the logic out of `CricketScorePanel.tsx` (don't delete that file yet; Task 8 does).
- [ ] **Step 4:** Confirm it PASSES; `npx tsc --noEmit` clean.

---

### Task 5: Live now feed (3a) and the Home row

**Files:**
- Create: `src/lib/liveFeedView.ts`, `src/lib/useLiveNow.ts`
- Rewrite: `src/app/live/index.tsx`
- Modify: `src/app/(tabs)/home.tsx` (Live now row)
- Test: `__tests__/liveFeedView.test.ts`, `__tests__/LiveNowScreen.test.tsx` (replaces `liveScreen.test.tsx`), Home test update or `__tests__/HomeLiveRow.test.tsx`

**Interfaces:**
- Consumes: `fetchLiveFeed`, `LiveItem` (`@/api/live`); `getMatchLive`, `getMatch` (Task 1, `@/api/cricketMatch`); `parseScoreline`, `feedRound` (Task 2); chase maths from `@/lib/cricketView`.
- Produces:
  ```ts
  export interface FeedRow {
    key: string; kind: 'tournament' | 'quick'; matchId: string; sport: string;
    meta: string;                       // "{tournament} · {category} · {round}" skipping empties | quick: sport name
    sides: [string, string];            // from title split on ' vs '
    badminton?: { games: { a: number; b: number }[] };   // last = current
    cricket?: { scores: [string | null, string | null]; chase: string | null };  // "118/6 (10)", "87/3 (6.2)"; "Rawnat need 32 off 22 balls"
    scoreline?: string;                 // quick rows: shown as the feed gives it
    sub?: string;                       // "Game 2"
  }
  export function feedRows(items: LiveItem[], cricket: Record<string, { live: LiveState | null; match: CricketMatch | null }>): { tournament: FeedRow[]; quick: FeedRow[] };
  export function useLiveNow(): { tournament: FeedRow[]; quick: FeedRow[]; count: number; loading: boolean; error: boolean; refresh: () => void };
  ```
  `useLiveNow` loads in `useFocusEffect`, refreshes every 30 s while focused, and for each live tournament cricket item fetches `getMatchLive` + `getMatch` in parallel (per-row failures leave that row without scores). A failed feed keeps the last rows with `error` true.

- [ ] **Step 1: Write the failing tests:**
  - `feedRows`:
    - a badminton tournament item `{ title: 'Rohit Kulkarni vs Karthik Nair', scoreline: '18-21, 11-7', tournamentName: 'Arohance', categoryName: '', round: 'Quarter-Final' }` → `meta` `'Arohance · Quarter-final'`, sides split, `badminton.games` two entries, `sub` `'Game 2'`;
    - a team-league round code → meta ends `'Team league'`;
    - a cricket tournament item with enrichment (2nd innings, target 119, 87/3 in 6.2, maxOvers 10) → `cricket.scores` `['118/6 (10.0)', '87/3 (6.2)']` in side order, and `chase` `'Rawnat United need 32 off 22 balls'`;
    - without enrichment, `cricket.scores` `[null, null]` and no chase;
    - quick items carry `scoreline` and `meta` `'Cricket'` (sport name) and never a `joinCode` key, even if one is in the input.
  - Screen:
    - sections "Tournaments" and "Quick matches", and "{n} matches";
    - a tournament row press pushes `{ pathname: '/live/[matchId]', params: { matchId } }`;
    - a quick row pushes `/quick/[id]`, or `/(auth)/login` when logged out;
    - empty → `'Nothing live right now'`;
    - error → InlineError with Retry.
  - Home: the "Live now" row appears with `'{n} matches'` when `useLiveNow` reports count > 0, pushes `/live`, and is absent at 0.
- [ ] **Step 2:** Run the tests and confirm they FAIL.
- [ ] **Step 3:** Implement per spec 3a and the mock's 3a layout (row grid, 24-condensed current game, Live dot). In Home, place the row under the hero buttons and reuse `useLiveNow` (count only).
- [ ] **Step 4:** Confirm they PASS; `npx tsc --noEmit` clean.

---

### Task 6: Badminton live (3b)

**Files:**
- Rewrite: `src/app/live/[matchId].tsx` as a router between `BadmintonLive` and `CricketLive` (Task 7 fills the cricket branch; until then the cricket branch renders the existing cricket view unchanged)
- Create: `src/components/live/BadmintonLive.tsx`, `src/lib/useBadmintonLive.ts`
- Modify: `src/components/FlipScore.tsx` (optional props, current defaults unchanged)
- Test: `__tests__/BadmintonLiveScreen.test.tsx`; existing `__tests__/QuickMatchScreen.test.tsx` must still pass

**Interfaces:**
- Consumes: Task 2 `badmintonBoard`, `roundTitle`; `getBadmintonMatch`; `getTeamBrands`; `getTournament`, `getTournamentCategories` (`@/api/tournaments`); `resolveMatchSport` (`@/api/cricketMatch`); socket `join:match` / `score:update` / `leave:match` via `acquireSocket`/`releaseSocket`.
- Produces:
  - `useBadmintonLive(matchId: string): { match: BadmintonMatch | null; connected: boolean; loading: boolean; error: boolean; reload: () => void }`. It replaces `useBadmintonMatchSocket`, which Task 9 deletes.
  - `FlipScore({ value, size?, color?, plain? })`: `plain` drops the two-tone card. `size` is the font size (default today's), `color` the digit colour. With no new props it renders exactly as today.

- [ ] **Step 1: Write the failing screen tests** (mock `@/lib/useBadmintonLive`, `resolveMatchSport`, the tournaments API and `getTeamBrands`):
  - Live: title `'Quarter-final 4'` and sub `'Arohance · Men's Singles · Court 2'`; pill `'Live'`; `'Game 2 · Games 0–1'`; `'Best of 3 · to 21'`; both names; a game point chip when at 20–19.
  - Completed: pill `'Completed'`, `'… won 2–1'`, no chip.
  - Next match: the match has `nextMatchId`; a mocked `getBadmintonMatch(nextId)` returns the other side `'Rohan D'Souza'` and schedule → `"Winner plays Rohan D'Souza"` and `'Semi-final 2 · 4:30 PM · Court 1'`. The other side is `'TBD'` → `'Winner goes to Semi-final'`. No `nextMatchId` → no card. A tie sub-match → no card and the tie title.
  - Disconnected with data → `'Reconnecting. Showing the last update.'`.
  - `FlipScore` without new props → same output as before (keep the room tests green).
- [ ] **Step 2:** Run the tests and confirm they FAIL.
- [ ] **Step 3:** Implement per spec 3b and mock 3b. The points are `FlipScore plain size={68}`, leader `colors.text`, trailer `colors.text4`. Add the `sensors`/`account_tree` icons if missing.
- [ ] **Step 4:** Confirm they PASS, plus `__tests__/QuickMatchScreen.test.tsx`; `npx tsc --noEmit` clean.

---

### Task 7: Cricket board (3c) for tournament matches

**Files:**
- Create: `src/components/live/CricketBoard.tsx` (hero card, tabs, Live / Scorecard / Overs panels; takes `view: CricketBoardView` and `tab` state inside)
- Modify: `src/app/live/[matchId].tsx` (cricket branch → `CricketBoard` with `fromTournament`)
- Modify: `src/lib/useCricketMatchSocket.ts` (adds `connected: boolean`; listens to `disconnect`)
- Delete: `src/app/cricket/[matchId]/balls.tsx` and its `Stack.Screen`; regenerate typed routes
- Test: `__tests__/CricketLiveScreen.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`fromTournament`, `cricketBoard`, `CricketBoardView`); `getTeamBrands`; category overs fallback from `getTournamentCategories(tournamentId)` (`cricketConfig.overs` of the match's category).
- Produces: `CricketBoard({ view, extra }: { view: CricketBoardView; extra?: React.ReactNode })`. `extra` renders under the hero, which Task 8 uses for host tools.

- [ ] **Step 1: Write the failing screen tests** (mock `useCricketMatchSocket`, `resolveMatchSport` → `'cricket'`):
  - Live tab: `'Need'`, `'32'`, `'off 22'`, `'8.73'`, `'13.74'`; batter rows with `*`; `'Partnership 18 (8)'`; the bowler row; the "This over" chips and `'6 runs'`; the toss line.
  - Scorecard tab: the innings switch labels; `'c Hegde b Pillai'`; `'not out'`; the extras line; `'Fall of wickets'`.
  - Overs tab: `'Runs per over'`; an over row `'Over 7'` with chips.
  - Innings break: pill `'Innings break'`, `'Innings break · Target 119'`.
  - Completed: opens on Scorecard; the result line.
  - Disconnected: the reconnecting line.
- [ ] **Step 2:** Run the tests and confirm they FAIL.
- [ ] **Step 3:** Implement per spec 3c and mock 3c: hero card radius 26 on `surface1`, tabs with an accent underline, `Segmented` for the innings switch, bars drawn as Views.
- [ ] **Step 4:** Confirm they PASS; `npx tsc --noEmit` clean after regenerating typed routes.

---

### Task 8: Quick cricket room: board, toss and the new pad

**Files:**
- Create: `src/components/live/CricketPad.tsx` (pinned pad + one stepped `BottomSheet`), `src/components/live/TossCard.tsx`
- Modify: `src/app/quick/[id].tsx` (cricket: `CricketBoard` via `fromQuick`; host: `TossCard` before scoring, `CricketPad` pinned; host tools: `CodeCard` while slots are open + "Cancel match" with an `Alert` confirm)
- Delete (grep first): `src/components/quick/QuickCricketLive.tsx`, `CricketScorePanel.tsx`, `CricketSetupPanel.tsx`
- Rewrite tests: port `__tests__/CricketScorePanel.test.tsx`, `CricketDismissedBatsman.test.tsx`, `CricketExtrasWicket.test.tsx`, `CricketPanelAffordances.test.tsx`, `CricketHostTools.test.tsx`, `CricketSetupPanel.test.tsx` and `QuickCricketLive.test.tsx` into `__tests__/CricketPad.test.tsx`, `__tests__/TossCard.test.tsx` and the cricket block of `__tests__/QuickMatchScreen.test.tsx`; delete the old files after porting

**Interfaces:**
- Consumes: Task 4 (`cricketPad` exports), Task 3 (`fromQuick`, `cricketBoard`), Task 7 (`CricketBoard`); `useQuickMatch` actions (`toss`, `lineup`, `ball`, `undoBall`, `cancel`); `lineupFromSlots`, `setupStage`, `panelFor` (`@/lib/quickCricketView`); `CodeCard` (`@/components/room/Roster`); `BottomSheet`, `Segmented`, `Toggle`, `Tap`, `Button`.
- Produces:
  - `CricketPad({ match, scorecard, busy, problem, onBall, onUndo })`, with the same props as `CricketScorePanel` minus `playerId`, plus the room's `scorecard` for bowler figures.
  - `TossCard({ match, busy, onToss, onLineup })`.

- [ ] **Step 1: Write the failing tests** (ported assertions keep their meaning, new copy per spec and preview):
  - **Run keys:**
    - a run key posts `{ runs: n }` with liveState ids;
    - 4 and 6 post boundaries;
    - two fast taps while `busy` → one post (Review Focus 3);
    - Undo shows only when `canUndoBall`.
  - **Extras:**
    - the Extras sheet: the kind Segmented and keys 1–6 post `{ extrasType, extrasRuns }`;
    - with "Wicket on this ball too" on, a runs key moves to the wicket step and the final post carries both.
  - **Wickets:**
    - Wicket → Caught → "Caught by" list → post with `fielderId`;
    - Run out → "Who's out?" → fielder → post with `dismissedPlayerId` and `fielderId`;
    - Bowled posts at once;
    - Back steps one level.
  - **Picks:**
    - The first ball: the pick sheet opens by itself, striker → non-striker → bowler, then the keys show.
    - Closing it shows a "Pick the opening batters" button in place of the keys.
    - A new over opens "Over {n} · who's bowling?" with figures.
    - Dismissed batters are not offered.
  - **Errors:** a refused ball shows the server message above the keys and keeps the pad open.
  - **Toss:** pick the winner, then Bat → `toss({ winnerSideId, decision: 'bat' })`; an old match without line-ups shows "Confirm teams", which posts each side via `lineupFromSlots`.
  - **Room:**
    - A spectator (not host) in a live cricket room sees `CricketBoard` but no pad, no toss controls and no join code (Review Focus 4).
    - The host sees the pad pinned outside the scroll.
    - "Cancel match" asks via `Alert` before calling `cancel`.
- [ ] **Step 2:** Run the tests and confirm they FAIL.
- [ ] **Step 3:** Implement per spec ("The quick-cricket host pad") and the preview files (layout, sizes, colours via tokens). Then delete the three old components after grepping importers, and remove their `MIGRATED` entries.
- [ ] **Step 4:** Confirm the new and ported tests PASS, plus `__tests__/QuickMatchScreen.test.tsx` whole; `npx tsc --noEmit` clean.

---

### Task 9: Cleanup, gates and handover

**Files:**
- Delete when unused (grep first):
  - `src/components/live/LiveRow.tsx`, `src/components/badminton/*`, `src/components/cricket/*`
  - `src/lib/useLiveFeed.ts`, `src/lib/useBadmintonMatchSocket.ts`, `src/lib/badmintonLive.ts`, `src/lib/cricketBalls.ts`
  - unused exports in `src/lib/cricketView.ts` (e.g. `wormSeries`, `runDistribution`, `matchSummary`, `projectedScore`, `recentBalls`, `matchStateNote`, `yetToBat` if unused)
  - their tests (`LiveRow.test.tsx`, `useLiveFeed.test.tsx`, `liveScreen.test.tsx`, `badmintonLive.test.ts`, `cricketBalls.test.ts`, `HeroScore.test.tsx`, the parts of `cricketView.test.ts` / `cricketLiveView.test.ts` for removed exports)
- Modify: `test-utils/colourLiterals.ts` (dated note), `d:/kria/HANDOVER-mobile-redesign.md`, `C:/Users/MY PC/.claude/projects/d--kria/memory/mobile-redesign.md`

- [ ] **Step 1:** Grep for leftover imports of every deleted module and delete what's unused. Keep `src/app/cricket/leaderboard/*`, `src/app/cricket/my-stats/*` and what they import.
- [ ] **Step 2: Gates.**
  - `npx tsc --noEmit` clean.
  - Full `npx jest` passing; report the counts.
  - Bundle check: `npx expo start --port 8081`, then `curl -s -o b.js "http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=android&dev=true&transform.routerRoot=src%2Fapp"`, then `grep -c "__workletHash" b.js` should give about 573. Stop the server and delete `b.js`.
- [ ] **Step 3: Handover and memory.** Add a Live matches section to the handover: what was built, the calls from the spec, gaps #23–#30, known limits, new counts and the file map. Add a dated line to the memory note.
