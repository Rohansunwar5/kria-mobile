# Table tennis in the quick host portal

Spans two repos: `server/` and `mobile/`. Adds table tennis as a third sport to quick matches and
quick knockouts, alongside badminton and cricket. Table tennis is a rally sport, so it rides on the
badminton quick scorer rather than getting an engine of its own.

## Goal

A player hosts a casual table tennis match or knockout with the same low effort as badminton:
pick the sport, set the format, add players, share the code, score point by point. Results count
towards careers and feeds as **table tennis**, not as badminton.

## Decisions (settled in the design session)

| Topic | Decision |
|---|---|
| Formats | Points per game **11 or 21** (21 = old-school casual). Match length **best of 1, 3, 5 or 7**. Defaults: 11 points, best of 3. |
| Deuce | Win by 2, **no cap** (30-30 keeps going). Badminton keeps its 30 cap. |
| Storage | Its own discriminator, `sport: 'table_tennis'`, sharing badminton's schema. Not a badminton variant flag: `sport` is what career stats, best-sport and feeds read. |
| Scoring | One quick scorer for both rally sports. Same routes (`/quick-match/:id/badminton/point` and `/undo`), same one-level undo, same career/knockout hooks. |
| Knockout | In scope. Reuses badminton's knockout entry (side names, config, started-check, badges incl. Ace Serve). |
| Icon | New `paddle` glyph. |
| Labels | Quick-match and knockout format labels name the sport. |

## Out of scope

Organizer/tournament table tennis; table tennis on the home Top Players ladder (`RANKED_SPORTS`
comes from the tournament `SPORTS` list, which deliberately excludes it); a serve indicator;
the expedite rule; table tennis-specific badges; renaming the `/badminton/` routes.

Found while designing, not fixed here: badminton quick games to 11 and 15 still cap at 30
(`liveScoring.util.ts` `DEFAULT_CAP`). Official short formats cap at 15 and 21.

---

## 1. Server

### 1.1 Rally formats, in one place

In `server/src/models/quickMatch.model.ts`:

```ts
export const RALLY_FORMATS = {
    badminton:    { bestOf: [1, 3, 5],    pointsToWin: [11, 15, 21], defaults: { bestOf: 3, pointsToWin: 21 }, cap: 30 },
    table_tennis: { bestOf: [1, 3, 5, 7], pointsToWin: [11, 21],     defaults: { bestOf: 3, pointsToWin: 11 }, cap: Infinity },
} as const;
export type RallySport = keyof typeof RALLY_FORMATS;
export const isRallySport = (s: unknown): s is RallySport => s === 'badminton' || s === 'table_tennis';
```

Validators, the knockout schema and the scorer all read this; no other copy of these numbers.

### 1.2 Model

- `IQuickMatch.sport`: `'badminton' | 'table_tennis' | 'cricket'`.
- Badminton's discriminator schema becomes a small factory taking the sport's defaults;
  `QuickBadmintonMatchModel` and a new `QuickTableTennisMatchModel` (`'table_tennis'`) each call it
  (a fresh `Schema` each — no shared schema instance between discriminators).
  `IQuickTableTennisMatch` mirrors `IQuickBadmintonMatch` with `sport: 'table_tennis'`.
- `QuickMatchRepository.create`: `SportKey` gains `'table_tennis'`; it picks the matching model.
- `quickKnockout.model.ts`: `sport` enum gains `'table_tennis'`; `matchConfig.bestOf` enum becomes
  `[1, 3, 5, 7]` (per-sport sets are enforced by the validator); `IQuickKnockout.sport` widened.

### 1.3 Create

- `createQuickMatchValidator`: `sport` accepts `table_tennis`. `matchConfig.bestOf` and
  `pointsToWin` are checked against `RALLY_FORMATS[sport]` for both rally sports (badminton's sets
  are unchanged: best of 7 is still refused for badminton).
- `QuickMatchService.create` / `createForKnockout`: the badminton-only branches become
  `isRallySport(input.sport)`. Types widened.
- `createKnockoutValidator`: `sport` accepts `table_tennis`; `bestOf`/`pointsToWin` checked
  against `RALLY_FORMATS[sport ?? 'badminton']` for non-cricket bodies.
- `QuickKnockoutService.create`: the rally branch writes `sport: input.sport ?? 'badminton'`
  (today it writes nothing, so the schema default makes every non-cricket knockout badminton).
  `CreateKnockoutInput` widened.

### 1.4 Scoring

`QuickBadmintonScoringService.recordPoint` / `undoLastPoint`: the `sport !== 'badminton'` guard
becomes `!isRallySport(match.sport)` (message: "This is not a rally match."). `recordPoint` passes
`cap: RALLY_FORMATS[match.sport].cap` to `applyPoint`. `gameWinner` already handles
`cap: Infinity` (`t >= Infinity` is never true). Everything else — snapshot undo, completion,
career rows, knockout reconcile — is unchanged.

### 1.5 Knockout sport table

`knockoutSports.table_tennis = knockoutSports.badminton`'s entry (same object). `maxPlayers` reads
`k.format`, `matchConfig` reads `bestOf`/`pointsToWin`, `hasStarted` reads `gameScores` — all
identical for table tennis.

### 1.6 Unchanged, verified

Career stats (`recordQuickMatchCompletion` writes `match.sport`, participation `sport` is a free
string), `summariseQuickMatch` (shape-based), live feed (`sport: String(match.sport)`), claim /
remove / start / cancel (sport-agnostic).

---

## 2. Mobile

### 2.1 Types and formats

- `api/quickMatch.ts`, `api/quickKnockout.ts`: sport unions gain `'table_tennis'`; `bestOf` gains
  `7`.
- `lib/quickHostWizard.ts`:
  - `Sport = 'badminton' | 'table_tennis' | 'cricket'`; `bestOf: 1 | 3 | 5 | 7`.
  - `BEST_OF` gains `7: { label: 'Best of 7', hint: 'First to win 4 games takes the match' }`.
  - `RALLY_FORMATS` mirrors the server's sets, with per-sport points captions
    (badminton `11 Quick / 15 Short / 21 Standard`; table tennis `11 Standard / 21 Classic`) and
    defaults. Replaces the badminton-only `POINTS`.
  - New pure `pickSport(draft, sport)`: returns the patch for a sport tap — and when the sport
    changes, that sport's default `bestOf` / `pointsToWin`, so badminton's 15 never reaches
    table tennis.
  - `teamNames` and `buildCreateBody` treat every non-cricket sport as rally
    (`sport: d.sport`, not the literal `'badminton'`).

### 2.2 Host wizard (`quick/new.tsx`, `components/quick/HostSteps.tsx`)

- `SportStep`: third `ChoiceCard` — icon `paddle`, "Table tennis", "Singles or doubles, games to 11".
  Order: Badminton, Table tennis, Cricket.
- Sport tap goes through `pickSport`.
- `FormatStep`: rally sports read options from `RALLY_FORMATS[draft.sport]`. Best-of buttons show
  the number as the label and `One game` / `Best of` as the sub-line, so four fit at 360 dp wide;
  the hint below spells it out. Same rendering for badminton.
- `ReviewStep`: sport names via `SPORT_LABELS` (no raw `table_tennis`); the `people` line and the
  Players/Teams row use `!== 'cricket'`.
- `quick/new.tsx` format-step copy: same check.

### 2.3 Knockout wizard (`knockout/new.tsx`)

Same third card ("Singles or doubles, 3 to 16 entrants"), sport state widened, format step for any
rally sport from `RALLY_FORMATS`, defaults reset on sport change, body sends `sport` for rally
sports too.

### 2.4 Labels and copy

- `quickKnockoutView.formatLabel`: rally knockouts read `<Sport> · Singles|Doubles`, like cricket's
  `Cricket · 8 overs`.
- `quickMatchView.formatLabel`: prefixed with the sport (`Table Tennis · Best of 3 · to 11`).
  `HomeHero`'s meta line drops its separate sport label for rally matches so it isn't doubled.
- `lib/sports.ts`: `SPORT_ICON.table_tennis = 'paddle'`.
- `components/icons`: new `paddle` glyph — round blade, short handle, same stroke style.
- Copy: HomeHero "Host a badminton or cricket match." → three sports; `quick/host.tsx` and
  `HostSheet` knockout hint "A badminton knockout for 3 to 16" → "Badminton, table tennis or
  cricket" (already stale for cricket).

### 2.5 Unchanged, verified

`panelFor` returns the rally panel for every non-cricket match, so `MatchPanel` scores table tennis
as is (no serve indicator to get wrong). Waiting room, join, bracket and knockout screens branch on
`=== 'cricket'` only.

---

## 3. Testing

**Server** (`server/test/`)
- `liveScoring`: `cap: Infinity` — 30-30 undecided, 32-30 decided; badminton still decides 30-29.
- Quick match HTTP: create `table_tennis` (stored discriminator, defaults 3 / 11); best of 7
  accepted for table tennis, refused for badminton; points 15 refused for table tennis; score a
  table tennis game through deuce to completion; career row written with `sport: 'table_tennis'`;
  undo works.
- Knockout: create with `sport: 'table_tennis'` stores it; reconcile creates `table_tennis` matches.
- Gates: `tsc`, lint, build, full suite.

**Mobile** (`mobile/__tests__/`)
- `quickHostWizard`: `buildCreateBody` for table tennis (sport, config); `pickSport` resets
  defaults on change and keeps them on a re-tap.
- `quickMatchView` / `quickKnockoutView`: updated `formatLabel` expectations.
- Gates: `npx tsc --noEmit`, `npx jest`.
