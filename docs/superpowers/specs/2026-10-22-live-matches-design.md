# Live matches (3a–3c) and the quick-cricket scoring pad: design

22 October 2026 · player app (`mobile/`) · part of the redesign to `mobile/DESIGN.md` v1.1

## Intent

Watching a match live is the one place the score is the whole screen. This pass builds the mock `mobile/new-ui-designs/Kria Live Matches.dc.html`:
- 3a: a "Live now" feed.
- 3b: a badminton scoreboard.
- 3c: a cricket scoreboard with Live, Scorecard and Overs.

It also restyles the host's quick-cricket scoring pad in the new look, as previewed and approved by the user on 22 October 2026 (five screens: scoring a ball, extras, wicket, pick a player, toss).

It replaces the old `live/*` screens, the ball-by-ball screen, and the old cricket panels inside the quick match room.

Most things stay as the mock has them. Where the mock and DESIGN.md disagree on structure, DESIGN.md wins. Where they disagree on a value, the mock wins. Real server data only.

## Goals

- 3a reachable from Home, listing every live tournament and quick match the server reports, each opening its scoreboard.
- 3b for tournament badminton, updating live over the socket.
- 3c for tournament cricket and quick cricket alike: one scoreboard, three tabs, live updates.
- The quick-cricket host keeps every scoring action they have today, in the new look.
- New server gaps logged in `SERVER-GAPS.md` from #23.

## Non-goals

- Tournament scoring. Organisers and staff score in the organiser portal (DESIGN §2.6).
- The quick-match room for badminton and table tennis. It's already rebuilt (`components/room/RallyRoom.tsx`) and stays as is.
- The cricket leaderboard and "my stats" screens (`app/cricket/leaderboard`, `app/cricket/my-stats`). They aren't in this design and stay on the old UI.
- Charts beyond the mock's runs-per-over: the worm chart, run distribution, squads and match summary go away with the old screen.
- Table tennis tournament matches, which don't exist on the server.

## Anti-goals

- Showing a join code anywhere a spectator can see it.
- Sample values from the mock (names, scores, "Started 2:52 PM", "Group stage D1 vs A2", "Toss: Rawnat chose to bowl" as fixed text).
- Showing server, rally length, or a deuce cap the server doesn't send. The mock says so itself.
- Motion beyond "a quick change on the number that moved" (DESIGN §7, §9). The existing `FlipScore` is the allowed digit flip.
- Losing any scoring capability the host has today.

## Constraints

- **Code:** build on `src/constants/theme.ts` and `src/components/ui/*`. No `@/lib/theme`, `components/icons`, NativeWind or hex literals in new code.
- **Data:** load as the rebuilt screens do (`useFocusEffect` plus local state). Sockets go through `src/lib/socket.ts` (`acquireSocket`/`releaseSocket`).
- **Logic:** pure view logic in `src/lib/*.ts` with jest tests; screens lay out what it returns.
- **Git:** `d:/kria/mobile` is the user's git repo. Agents never run git there; the user decides on commits.
- **Typed routes are on:** adding or removing a route needs `.expo/types/router.d.ts` regenerated (start `npx expo start` briefly) before tsc passes.
- **No new packages.**

## Data

Paths are as mounted. Every route here is public unless marked *player*.

| Need | Source | Notes |
|---|---|---|
| Feed | `GET /live` → `{ total, items[] }` | `items[]`: `kind` (`tournament`\|`quick`), `matchId`, `sport`, `title` ("A vs B"), `scoreline`, `tournamentName`, `categoryName` (often empty, see #24), `round` (raw `bracketRound`). Capped at 40, cached 15 s, no socket. Join code never present |
| Badminton match | `GET /sports/badminton/match/:id` | `player1/2 {name, teamName, teamId}`, `teams`, `gameScores[] {team1Score, team2Score, winnerId}`, `matchConfig {bestOf, pointsToWin}`, `schedule {date, time, court}`, `bracketRound`, `positionInRound`, `nextMatchId`, `nextMatchSlot`, `status`, `winnerId`, `tournamentId`, `categoryId` |
| Badminton live | socket `join:match {matchId}` → `score:update {match}` | Full match doc |
| Cricket match | `GET /sports/cricket/match/:id` | `teams`, `matchConfig.maxOvers`, `cricketSetup` (toss, lineups), `status`, `winnerId`, `result.marginOfVictory`, `bracketRound`, `tournamentId` |
| Cricket live | `GET /sports/cricket/match/:id/live` → `{ liveState, recentBalls, match }`; socket `ball:recorded {liveState, …}`, `ball:undone` | `liveState`: `matchStatus`, `currentInnings`, `battingTeamId`, `runs`, `wickets`, `completedOvers`, `ballsInCurrentOver`, `target`, `innings1Summary`, `strikerId`, `nonStrikerId`, `currentBowlerId` |
| Cricket scorecard | `GET /sports/cricket/match/:id/scorecard` | Per innings: `totals`, `battingCard`, `bowlingCard`, `oversTimeline {overNumber, runs, wickets, balls[{label, runs, isWicket}]}`, `currentPartnership`, `fallOfWickets {…, dismissalLine}` |
| Quick match | `GET /quick-match/:id` *player*; socket `quick:update {match}` | `sides`, `liveState`, `inningsScores`, `cricketSetup`, `matchConfig`, `status`, `outcome`, `hostId` |
| Quick scorecard | `GET /quick-match/:id/scorecard` *player* | Same shape as the cricket scorecard; refetch on each `quick:update` that changes the score (existing `useQuickScorecard`) |
| Quick scoring (host only) | `POST /quick-match/:id/cricket/toss`, `/lineup`, `/ball`, `/undo`, `/cancel` *player* | Existing functions in `api/quickMatch.ts` and `lib/useQuickMatch.ts` |
| Team crests | `getTeamBrands(tournamentId)` (`api/cricketMatch.ts`) | Existing; crest by team id |

## Shared rules

**Badminton game and match point.** This is the server's own game rule (`server/src/sports/badminton/services/liveScoring.util.ts`): a side wins the game at `pointsToWin` with a 2-point lead, or by reaching the cap of 30 first. `pointsToWin` defaults to 21 and best-of to 3.
- **Game point** for a side: its next point would win the current game.
- **Match point:** game point while that side already has `ceil(bestOf/2) − 1` games.
- Show the chip ("Game point · {name}" or "Match point · {name}") only when true, and never on a finished match.

**Cricket chase.** Shown in the second innings only, from `liveState` and `maxOvers`:
- runs needed = `target − runs`;
- balls left = `maxOvers × 6 − (completedOvers × 6 + ballsInCurrentOver)`;
- required rate = needed ÷ (balls left ÷ 6), to 2 decimals;
- current rate = runs ÷ (balls ÷ 6), to 2 decimals.

Read "Need {n} off {b}". When nothing is needed or no balls are left, the result line takes over. `maxOvers` comes from the match (tournament) or `matchConfig.maxOvers` (quick, default 20).

**Ball chips** (mock 3c): `W` on accent; `4` and `6` on text (light) with bg text; extras labels (`wd…`, `nb…`, `lb…`, `b…`) on lineStrong with text2; everything else on surface2. Labels come from `oversTimeline[].balls[].label` as the server writes them.

**Round label.** `bracketRound` through `roundLabel`, plus `positionInRound + 1` for rounds with more than one match ("Quarter-final 4"). The Final has no number. On feed rows, which have no position, the round shows on its own (#23).

## Screens

### 3a Live now, `app/live/index.tsx` (rewritten)

- **Header:** back, then "Live now" in condensed 40 with "{n} matches" beside it (`items.length`, not `total`). Pull to refresh; refetch on focus and every 30 s while focused (the server caches for 15 s).
- **"Tournaments" section** (kind tournament): one row per match.
  - Meta line: "{tournament} · {category} · {round}", skipping empty parts, and a Live dot on the right.
  - Two side rows: names from splitting `title` on " vs ".
  - Badminton: the scoreline parsed into games. Finished games are small, with the winner's bright; the current game is condensed 24, leader bright.
  - Cricket: the feed has no live tournament cricket score (#25), so the app fetches `/sports/cricket/match/:id/live` for each live tournament cricket row and shows both innings ("118/6 (10)" and "87/3 (6.2)"), plus the chase line "{batting team} need {n} off {b} balls" in the second innings.
  - Sub-line: "Game {n}" for badminton (the court isn't in the feed, #23).
- **"Quick matches" section:** sport icon + sport name, a Live dot, the title, and the scoreline as the feed gives it. No "started X min ago": the time is wrong (#26).
- **Tapping a row:** tournament opens `/live/[matchId]`; quick opens `/quick/[id]` (logged out → login).
- **Empty:** sensors icon in the DESIGN §8 pattern, "Nothing live right now", "Live matches show up here as soon as they start." **Error:** InlineError with Retry, keeping the last list.
- **Entry point:** Home shows a "Live now" row (SectionHeader-style title + "{n} matches" + chevron) under the hero buttons when the feed has at least one item, opening 3a. No row when nothing is live.

### 3b Badminton live, `app/live/[matchId].tsx` (rewritten, badminton branch)

- **Top bar:** back; title = round label ("Quarter-final 4"); sub = "{tournament} · {category} · Court {c}" (names via `getTournament` / category list, skipping empty parts). Status pill on the right: Live (accent dot), Completed (text3), Scheduled (text2).
- **Score card** (surface1, radius 26), as mock 3b:
  - Top line: "Game {n} · Games {a}–{b}" (or "{winner} won {a}–{b}" when completed) and "Best of {n} · to {p}".
  - Two rows: crest (40, `getTeamBrands`, initials when none), name + team, finished games small (winner bright and bold), and current points as plain condensed 68 numerals in a 76px column, as the mock draws them (leader text, trailer text4; blank once completed). The digit change reuses `components/FlipScore.tsx`'s flip timing through new optional props (size, colour, no card), with its current defaults unchanged so the match room looks the same.
- **Team-league sub-matches** (`tieId` set; their `bracketRound` is a code like `S1-GroupA-T3`): the title is "{team1} vs {team2} · {slot label, else Match {subMatchSlotNumber}}", there is no next-match card, and on feed rows the round part reads "Team league".
  - The game or match point chip per the shared rule.
- **"Games":** one row per game, "Game {n} · {a}–{b} · {winner surname}", with the game in play marked "In play" in accent.
- **Next match card:** only when `nextMatchId` is set. Fetch it and show "Winner plays {other side}", or "Winner goes to {round}" when the other side is TBD, with "{round} · {time} · Court {c}" from its schedule (skipping empty parts) and a "Bracket" link to `/tournament/[id]/matches?category=…`.
- **Left out:** start time and group stage (#26, and #12 for groups).
- **Live:** socket `score:update` replaces the match. On reconnect, reload. When disconnected, an inline "Reconnecting. Showing the last update."
- **States:** skeletons; InlineError with Retry; a scheduled match shows its card with 0–0 and "Starts {time} · Court {c}" when known.

### 3c Cricket live: one board for tournament and quick

The board is a component, `components/live/CricketBoard.tsx`. Tournament matches use it in `app/live/[matchId].tsx` (cricket branch); quick cricket uses it in `app/quick/[id].tsx`, replacing the old panels. Each screen supplies data through an adapter, so both sources map to one view model in `lib/cricketBoard.ts`. Quick matches use slot ids and side names; tournament matches use registration ids and team names.

- **Top bar** (tournament): back; "{round label} · {category}" or "Match {n}"; sub = tournament name. The status pill reads "1st innings", "Innings break", "2nd innings" (accent dot) or "Completed" (text3). The quick room keeps its own header.
- **Hero card** (surface1, radius 26):
  - Both sides with crest (32, tournament only) and score. The batting side is in condensed 44; the other is a small line.
  - First innings shows the batting side only, with "{other side} yet to bat".
  - Second innings: the chase per the shared rule ("To win", "Need {n} off {b}", Req. rate, Current).
  - Innings break: "Innings break · Target {target}".
  - Completed: the result. Tournament uses "{winner} won {marginOfVictory}"; quick uses the outcome label (no margin, #27); a tie reads "Match tied".
- **Tabs:** Live · Scorecard · Overs (accent underline). A completed match opens on Scorecard.
- **Live tab:**
  - Batting table: striker (*) and non-striker with R, B, 4s, 6s, SR from the current innings' `battingCard`.
  - "Partnership {runs} ({balls})" from `currentPartnership`.
  - Bowling row: the current bowler's O, M, R, W, Econ from `bowlingCard`.
  - "This over": ball chips from the last `oversTimeline` entry plus empty slots up to 6, with "{n} runs".
  - Footer line: "Last over: {labels} · {runs} runs" and the toss sentence "{side} won the toss and chose to {bat|bowl}" from `cricketSetup.toss`.
- **Scorecard tab:**
  - Innings switch (Segmented): "{side} {runs}/{wickets}".
  - Batting rows: name, dismissal line, R, B, SR. The dismissal line comes from the matching `fallOfWickets[].dismissalLine`, "not out" in accent for an unfinished innings, or "retired hurt" from the dismissal type.
  - Extras line "Extras {total} (wd {w}, nb {n}, lb {lb}, b {b})", skipping zeros, with the total on the right.
  - Bowling rows: O, R, W, Econ.
  - "Fall of wickets": "{n}-{score} {batter} ({overs})", joined with " · ".
- **Overs tab:**
  - Runs per over: one paired bar per over number, innings 1 in `colors.ring`, innings 2 in `colors.text`, with the over in progress in accent. An over with a wicket gets a ring. Height scales to the largest over.
  - The legend names both sides.
  - Under it, one row per over, newest first: "Over {n}", ball chips, runs.
  - This replaces `app/cricket/[matchId]/balls.tsx`.
- **Live updates:**
  - Tournament: `ball:recorded` replaces `liveState` and refetches the scorecard when the tally changes; `ball:undone` reloads.
  - Quick: `quick:update` (existing `useQuickMatch`) plus `useQuickScorecard`.
- **Before the first ball:**
  - Spectators see "Waiting for the toss", or the toss sentence and "Waiting for the first ball", and both squads (from the lineups or slots).
  - The host sees the toss screen or the pickers (below).

### The quick-cricket host pad (as previewed)

The approved preview's source is next to this spec, in `2026-10-22-live-matches-pad-preview/` (Main, Extras, Wicket, Pick and Toss `.dc.html`). Match it for layout, sizes and colours, using theme tokens.

- **Step behaviour:** Extras, Wicket, Who's out, Fielder and Pick are one BottomSheet whose content changes step by step, with a Back arrow to the previous step. The step state lives in the pad.
- **Opening the pick sheet:** it opens by itself whenever the engine needs a player (first ball of an innings, after a wicket, at the end of an over). If the host closes it, the run keys are replaced by one "Pick the {bowler|next batter|opening batters}" button until the player is chosen, because no ball can be recorded without one.

It applies only to the host, on a live, non-knockout or knockout quick cricket match (today's rule: `panelFor(...) === 'cricket-score'`). It is pinned under the room's scroll on surface1, with a 30 top radius and the bottom inset. Everything below is today's behaviour in a new layout.

- **Context row:** "{bowler} to {striker}" and this over's ball chips with empty slots.
- **Keys:**
  - 0, 1, 2, 3: surface2, condensed 30, 60 tall.
  - 4 and 6 with "Four" and "Six": light tiles.
  - Extras, Wicket (accent ink) and Undo (only when `canUndoBall`): outlined, 48 tall.
  - A run key records the ball at once.
- **Extras sheet** (BottomSheet):
  - Back arrow, title "Extras", one line of help.
  - A Segmented kind control: Wide, No ball, Bye, Leg bye.
  - "{kind} · runs" with keys 1–6, which record at once.
  - "Wicket on this ball too": a Toggle that carries the extra into the wicket sheet, as today.
- **Wicket sheet:**
  - "How was it out?" with "{striker} is on strike · {bowler} bowling", and seven types in a 2-column grid with hints ("then fielder", "then batter", "then keeper").
  - Caught, run out and stumped go to the fielder list. Run out and retired hurt go to "Who's out?" first (striker or non-striker).
  - Back returns one step.
- **Pick sheet:** one list sheet for the opening batters, a new batter, a new bowler and the fielder.
  - Title by need: "Opening batters", "Next batter", "Over {n} · who's bowling?", "Caught by", "Run out by", "Stumped by".
  - A sub-line with context; rows with initials, name, and figures for bowlers ("{O}-{M}-{R}-{W}" or "yet to bowl").
  - Dismissed batters are excluded.
  - When a batter and a bowler are both needed, it asks one after the other.
  - The first ball of an innings asks striker, then non-striker, then bowler.
- **Toss screen** (before the first ball, host only):
  - "Who won the toss?" with two side tiles (selected is light) showing the player count.
  - "{side} chose to" with Bat and Bowl buttons; picking one records the toss.
  - Old matches without line-ups get "Confirm teams" as today (`lineupFromSlots`).
- **Host tools:**
  - The join code card (existing `CodeCard`) while slots are open.
  - "Cancel match" with an Alert confirmation (today it cancels without asking).
- **Errors:** a refused ball shows the server's message above the keys and keeps the pad open.
- **Busy:** keys are disabled while a request is in flight; no double posts.

## Routes and deletions

- **Rewritten:** `app/live/index.tsx`, `app/live/[matchId].tsx`, and the cricket part of `app/quick/[id].tsx`.
- **Removed:** `app/cricket/[matchId]/balls.tsx` (Stack.Screen too).
- **Kept old:** `app/cricket/leaderboard/[categoryId].tsx`, `app/cricket/my-stats/[registrationId].tsx`.
- **Delete when unused** (grep first; the user's repo keeps history):
  - `components/live/LiveRow.tsx`
  - `components/badminton/*`
  - `components/cricket/*` (HeroScore, AtTheCrease, RecentOvers, ScorecardTabs, LivePanels, CricketCharts, MatchSummaryPanel)
  - `components/quick/{QuickCricketLive,CricketScorePanel,CricketSetupPanel}.tsx`
  - `lib/badmintonLive.ts`, `lib/cricketBalls.ts`, and the parts of `lib/cricketView.ts` / `lib/quickCricketView.ts` no longer used
  - their tests
  - Their `test-utils/colourLiterals.ts` `MIGRATED` entries are removed with a dated note.
- **Keep:** `lib/quickCricketView.ts` logic still used (`setupStage`, `whoIsNeeded`, `isFirstBallOfInnings`, `lineupFromSlots`, `battingSideId`, `bowlingSideId`, `canUndoBall`, `cricketOutcomeLabel`, `panelFor`), and `useQuickMatch`, `useQuickScorecard`, `useLiveFeed` (or its replacement) and `useCricketMatchSocket` / `useBadmintonMatchSocket` (rewritten if needed).

## Tests

- **View logic:**
  - game/match point (21-point and 11-point games, deuce, the 30 cap, best of 1/3/5);
  - chase numbers;
  - ball chip kinds;
  - feed scoreline parsing;
  - round labels;
  - the cricket view model from tournament and from quick data;
  - dismissal lines and extras text;
  - the per-over bars.
- **Screens:**
  - 3a: tournament + quick rows, empty, tap targets, no join code;
  - 3b: live chip, completed, next match;
  - 3c: each tab, innings break, completed, spectator vs host in the quick room;
  - the pad: records a run, the extras flow, a caught wicket through the fielder pick, a new bowler, the toss, undo, a refused ball, busy;
  - the Home "Live now" row shown and hidden.
- **Gates:** `npx tsc --noEmit`, the full `npx jest`, and the Android bundle worklet check.

## Server gaps to log (new, #23 onwards)

- **#23** The feed lacks separate side names, team names, crests, court, round position and match config.
- **#24** The feed's category name is empty: it populates against the legacy `Category` collection.
- **#25** The feed carries no score for live tournament cricket. Quick cricket shows the current innings only, and "0/0" at the break.
- **#26** There's no real start time: feed `startedAt` is `createdAt`, and matches have no `startedAt`.
- **#27** Quick cricket stores no win margin and sends no ball events, only `quick:update`.
- **#28** The cricket `/live` response has no `maxOvers` or result, so the app makes a second request.
- **#29** `score:update` isn't sent on a manual result, reopen or schedule change.
- **#30** The public balls route returns raw ball documents (with the heavy `liveStateBefore`) for any match, quick ones included.

## Left to the builder

- Component breakdown and file names beyond those named, and adapter shapes.
- Skeleton shapes, spacing within DESIGN §4.3, and copy for minor states in DESIGN §11's voice.

## Calls made by Claude (not the user)

- A "Live now" row on Home (the mock's own "try next") is the way into 3a.
- Live tournament cricket feed rows fetch their own score (one request per row) because the feed has none.
- "Started …" and "Group stage …" are left out (no data). Quick rows show no start time.
- 3c's tabs and pad serve both tournament and quick cricket through one view model.
- The Overs tab replaces the ball-by-ball screen. The worm chart, run distribution, squads and match summary are dropped.
- The cricket leaderboard and "my stats" stay on the old UI.
- Cancel match gets a confirmation it didn't have.
- The pad's steps are one sheet, stepped with Back. The pick sheet opens by itself, with a "Pick …" button if the host closes it.
- Badminton points are plain numerals, flipping through new optional `FlipScore` props.
- Team-league sub-matches are titled by their teams and slot, with no next-match card.
- Older tournament cricket matches without `matchConfig.maxOvers` fall back to the category's overs. A resolved knockout tie shows the server's margin text as it is.
