# Quick cricket match screen — redesign

**Date:** 8 Oct 2026 · **Status:** approved in chat, awaiting spec review
**Screens:** `src/app/quick/[id].tsx` for a cricket quick match: setup, live scoring, finished.
This is every cricket quick match, knockout or not, because they share the screen.

## Why

On the first phone test of a cricket knockout, the match screen looked blunt and out of
proportion:

- **Host:** a small score, one "X on strike" line, and a row of small square buttons. No
  non-striker, bowler, this over, or batter and bowler figures.
- **Everyone else:** only `2/0 (0.2)`.
- **Setup:** two bare toss buttons, then a "batting order" screen that can't change anything,
  confirmed one team at a time.

The app already has a polished cricket live screen for tournament matches
(`src/app/live/[matchId].tsx`). Quick matches don't use any of it.

## Decisions (from brainstorming)

| | Decision |
|---|---|
| Watchers | Full live view: score band, At the crease, this and recent overs, plus a **Scorecard** tab. Reuse the tournament components. |
| Host scoring | The same live view scrolls above a **pad pinned at the bottom**: big run keys, then Extras / Wicket / Undo. Steps and pickers replace the keys in place. |
| Setup | **Toss only.** Recording the toss fills both squads on the server, so there is no batting-order step. Watchers see the toss and the squads. |
| Logic | The scoring state machine (`CricketScorePanel`'s modes, pickers and `post`) does not change. Only its layout changes. |
| Look | `DESIGN.md`: dark canvas, orange brand, Anton / Space Mono / Space Grotesk, 16 pt gutter. New files use `useTheme()` tokens and join `MIGRATED`. |

**Out of scope:** charts, team colours, a link to the ball-by-ball screen, bowler over-limit
hints on the picker, reordering the batting order, the badminton panel, and the tournament live
screen.

## 1. Server

### 1.1 `GET /quick-match/:id/scorecard`

- **Route:** in `src/routes/quickMatch.route.ts`, using `quickMatchIdValidator` and `isPlayerLoggedIn`,
  like `GET /:id`.
- **Returns:** `{ innings1, innings2 }`, the same shape as the tournament
  `GET /sports/cricket/match/:id/scorecard`, each innings or `null`.
- **Where:** `src/sports/cricket/services/scorecard.service.ts` gains `getQuickScorecard(matchId)`.
  - It loads the match through `quickMatchRepository.getById`.
  - 404 "Match not found." when missing. 400 "This is not a cricket match." for badminton.
  - It loads balls with `ballRepository.getByMatchAndInnings(matchId, 1 | 2)`. Quick balls are
    already stored there under the quick match's id.
  - It runs the existing `buildInnings`.
- **Lookup:** every slot of both sides: `slotId → { name: displayName, teamId: sideId,
  teamName: side.name }`. Quick balls carry slot ids as player ids, so names resolve without
  the lineups.
- **Team fallback:** `team1Id/Name = sides[0].sideId/name`, `team2Id/Name = sides[1]`.
- The join code is never part of the response.

### 1.2 The toss fills the squads

In `QuickCricketScoringService.recordToss`, after the toss is stored:

- Any empty `side1Lineup` / `side2Lineup` is filled from that side's slots as
  `{ slotId, playerId?, name: displayName }`. This is the shape mobile's `lineupFromSlots` sends.
- Then `lineupsSet` is set, all in the same save.
- `recordLineup` is unchanged. Older apps and the fallback below still use it.

## 2. Mobile

### 2.1 Data

- `getQuickScorecard(id): Promise<Scorecard>` goes in `src/api/quickMatch.ts`, reusing the
  `Scorecard` / `InningsScorecard` types from `@/api/cricketMatch`.
- **When it runs:** on mount, and again whenever this key changes:
  `status · currentInnings · runs · wickets · completedOvers · ballsInCurrentOver`.
  - Every delivery and every undo changes one of those.
  - Updates already arrive through `useQuickMatch`'s `quick:update` push.
- **On failure:** keep the last scorecard. Every reused component already renders `null`
  innings, so the score band still shows from `liveState`.

### 2.2 Screen layout (`src/app/quick/[id].tsx`, cricket only)

- **Header:** "Back", then the title `Side 1 v Side 2` instead of "Quick match", with a mono sub
  line `N overs a side`. A Live tag shows while `status === 'live'`.
  - The knockout "… · ← Bracket" link row stays as it is.
  - Badminton and waiting matches keep today's header.
- **Scroll:** problem text, then `QuickCricketLive` (§2.3), then `TiePick` (as today).
- **Host, live match, ordinary (not knockout) matches only:** the join-code row and **Cancel
  match** move out of `CricketScorePanel` into the scroll, below the live view, under the same
  conditions as today.
- **Pinned under the scroll:** `CricketScorePanel` as the pad (§2.4), only when
  `panelFor === 'cricket-score'`, the viewer is the host, and the match is live.
- **Setup stage:** `CricketSetupPanel` (§2.5) sits in the scroll under the live view, for the
  host only.

### 2.3 `QuickCricketLive` (new, `src/components/quick/QuickCricketLive.tsx`)

Props: `match: QuickMatch`, `scorecard: Scorecard | null`. View only, no actions.

**Toss line**
- "Paryatech won the toss and chose to bat", or "Waiting for the toss" during setup.
- Written here, because `TossLine` expects the tournament match shape.

**Setup stage** (`panelFor === 'cricket-setup'`)
- The toss line, then **Squads**: two columns, each with the side name (Anton) and its
  players' names. "You" is marked for the viewer.

**Live or finished**
- `HeroScore` with `live = match.liveState`, the current innings card, and
  `completed = status === 'completed'`.
  - `HeroScore`'s `match` prop narrows to the fields it reads
    (`Pick<CricketMatch, 'matchConfig' | 'teams' | 'winnerId' | 'result'>`), so a plain object
    built from the quick match fits.
  - It gains an optional `resultLabel`, which overrides its own result text. Quick passes
    `cricketOutcomeLabel(match)`, e.g. "Tied · Paryatech went through".
- `MatchStateBanner` (live only), for innings break and waiting-for-a-batter states.
- **Chips: Live | Scorecard.** The Scorecard chip shows only once an innings card exists. A
  finished match opens on Scorecard.
  - *Live:* `AtTheCrease`, `PartnershipCard`, `RecentOvers` (no `matchId`, so no link to the
    tournament ball screen), and `Innings1Panel`.
  - *Scorecard:* `ScorecardTabs`.

### 2.4 The pad (`CricketScorePanel`)

- **Renders:** the pickers, run keys and step sheets only. It no longer renders the score
  header, the outcome text, the join code or Cancel. Those live in §2.2 and §2.3.
- **Container:** a top hairline, the screen background, 16 pt side padding, 10 pt gaps, and
  `12 + safe-area bottom` padding.
- **Context line** (mono, one line): `<striker> on strike · <bowler> bowling`. Either half is
  dropped when unknown.
- **Keys:**
  - Row 1: `0 1 2 3`, equal width, 56 pt tall.
  - Row 2: `4 6`, equal width, 56 pt tall, brand border and brand text.
  - Row 3: `Extras · Wicket · Undo`, equal width, 48 pt tall. Undo only when `canUndoBall`.
- **Steps** (extras type, extras runs, wicket type, who's out, fielder):
  - A mono title, e.g. "Wide — how many runs?", "How out?", "Who was out?", "Who took it?".
  - Then tiles in a 3-column grid, 48 pt tall, with **Back** first. "+ Wicket too" stays on the
    extras sheet.
- **Pickers** (who's on strike, non-striker, bowler): the existing titles, with names as
  2-column tiles, 52 pt tall.
- **Labels stay exactly as today** ("0"…"6", "Extras", "Wicket", "Undo", "Back", "Wide",
  "No ball", "Bye", "Leg bye", the wicket types, "+ Wicket too", "✓ Wicket too", player names),
  so the scoring tests keep their queries.
- **Busy:** the pad dims to 0.5 and presses are ignored, as today. Styles are plain objects
  (Pressable fence).

### 2.5 Setup (`CricketSetupPanel`, host)

- **Toss:**
  - "Toss — who won it?", then two side-by-side cards (flex 1, at least 96 pt) with the side
    name (Anton 20) and "N players" (mono label).
  - The picked card gets a brand border and tint. Tapping the other card switches.
  - Once a card is picked: "<Side> chose to…", then **Bat** and **Bowl**, equal width, 56 pt,
    brand fill.
  - Picking is local state. Bat and Bowl call `onToss` and are gated by `busy`, as today.
- **Fallback** (`setupStage === 'needs_lineups'`, which only happens when the toss was recorded
  before §1.2 shipped):
  - "Confirm teams" calls `onLineup` once per side whose lineup is empty, using
    `lineupFromSlots`.
  - The per-team batting-order lists are removed.
- The squads come from `QuickCricketLive`, so the host sees them under the toss cards too.
- A non-host gets nothing from this panel. Their setup view is `QuickCricketLive`.

## 3. Rollout

Ship the server first.

- **Old app with the new server:** the toss fills the squads, so the old app skips its
  batting-order screen. That's fine.
- **New app with the old server:** the scorecard returns 404, so the score band shows from
  `liveState` and At the crease stays empty. Setup ends at "Confirm teams". It still works,
  just with less on screen.

## 4. Tests

**Server**
- `test/quickCricketScorecard.test.ts`:
  - After a toss and a few balls, the batting card names come from the slots, and runs and
    balls are right.
  - Two innings come back.
  - Badminton gives 400. An unknown id gives 404.
  - Through the route, logged out gives 401.
- Toss: `lineupsSet` is true, and both lineups equal the slots, in order, with `playerId`
  only where present.

**Mobile**
- `QuickCricketLive`:
  - The score band reads `liveState`.
  - At the crease names come from the scorecard.
  - The Scorecard chip switches the view.
  - The setup view shows "Waiting for the toss" and both squads.
  - A finished match opens on the Scorecard and shows the result label.
- `HeroScore`: `resultLabel` overrides its result text.
- `CricketScorePanel`:
  - Existing tests pass with only these changes: any assertion on the score header, outcome,
    join code or Cancel moves to the screen test.
  - New: the context line, and Undo hidden when `canUndoBall` is false.
- `CricketSetupPanel`:
  - The cards and Bat call `onToss`.
  - Switching the picked card works.
  - "Confirm teams" calls `onLineup` for each empty side.
- `QuickMatchScreen`:
  - The host sees the pad and a watcher doesn't.
  - A watcher sees the live view.
  - The scorecard is fetched again after a `quick:update` that changes the score.
  - Cancel and the join code show in the scroll for an ordinary match, and not for a knockout
    match.
- Gates: `tsc`, eslint, the font fence (Anton `lineHeight` at least 1.188 × size, as an
  integer), the colour fence for the new file, and the Pressable fence.
