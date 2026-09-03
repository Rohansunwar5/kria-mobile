# Open issues

## 1. Cricket live screen repeats its own header — FIXED 2026-09-02

`src/app/live/[matchId].tsx` rendered `<Header title={team1 v team2} live />` and `HeroScore`
repeated the identical line and `Live` tag in its own band directly beneath it — two titles, two
live tags, ~40px saying nothing.

**Fixed.** The header owns the fixture and the live tag, and gained a subtitle
(`bracketRound · Match N · 12 ov`). `HeroScore`'s band now names the side that is **batting**
(`Titans batting` / `v Willow`) with its kit colour and the innings number — the one thing the
header cannot say. Issue 3 went with it.

## 2. The two extras figures on screen disagree — FIXED (client side) 2026-09-02

`At the crease` printed `EXTRAS · WD 1 · NB 0 · B 0 · LB 0` (=1) while the batting card footer
printed `EXTRAS 2`. They came from different objects: `live.extras` vs
`innings.totals.extras.total`.

**Fixed on the client** by making `AtTheCrease` read the split from `innings.totals.extras` — the
same object the footer total comes from — so the screen can no longer print two different totals
for the same thing.

**Still open server-side:** `cricketLiveState.extras.wides` appears to count wide *events* while
the scorecard counts wide *runs* (one `wd+1` produced 1 vs 2). Worth confirming which is intended.
Nothing on the client reads `live.extras` any more, so this is no longer user-visible.

## 3. Nobody can tell who is batting — FIXED 2026-09-02

Folded into issue 1: `battingTeamName` / `bowlingTeamName` now drive the hero band.

---

# Cricket live: data parity with the web client — DONE 2026-09-02

`client/src/sports/cricket/pages/public/CricketLiveScoreboard.tsx` (1936 lines) was rendering far
more of the same payload than mobile was. Mobile now shows all of it, in the design-canvas
language rather than the web app's blue/gold stadium theme.

## Types that were missing

`src/api/cricketMatch.ts` now declares what the server actually returns:

- `InningsScorecard.currentPartnership` (`PartnershipInfo`) and `.partnerships`
  (`PartnershipRecord[]`) — neither existed.
- `FallOfWicket.batterId`, `.partnershipRuns`, `.partnershipBalls`.
- `Dismissal.bowlerId`, `.fielderId`.
- `LiveState.bowlingTeamId`, `.innings1Summary`, `.nextBatsmanNeeded`, `.nextBowlerNeeded`,
  `.bowlerStats`, and `matchStatus` as a proper `MatchStatus` union.
- `CricketSetup` / `TeamLineup` / `PlayerSlot` — `cricketSetup` was typed `any` and never read.
- `getTeamBrands(tournamentId)` for team colours off `GET /tournaments/:id/teams`.

## Screen structure

The live screen is now section-chipped rather than one endless scroll — this is the interaction
the phone needs, where the web client relies on a two-column sticky layout:

| Section | Contents |
|---|---|
| always on | header, toss line, hero (batting side, score, overs, chase, CRR, extras, boundaries), match-state banner |
| **Live** | at the crease, current partnership, CRR/RRR/balls-left/projection, 1st-innings reference, recent balls (→ ball-by-ball), over-by-over rows |
| **Scorecard** | innings switch + Batting / Bowling / Wickets / Stands |
| **Charts** | runs per over (manhattan), worm, ball outcomes |
| **Squads** | both XIs, reserves, yet-to-bat |
| **Summary** | result, both innings, top score / best bowling / biggest stand (default section once complete) |

Sections only appear when their data exists, so an unstarted match still shows a single clean
screen.

## New pure logic (all unit-tested in `__tests__/cricketLiveView.test.ts`)

`ballsRemaining`, `projectedScore`, `strikeRate`, `tossLine`, `matchStateNote`, `manhattanBars`,
`wormSeries`, `runDistribution`, `matchSummary`, `yetToBat` — added to `src/lib/cricketView.ts`.

## Deliberately not ported

- **Broadcast mode** (`BroadcastMode` / `BroadcastHeroSlide` / `MatchSummarySlide`, ~350 lines) — a
  full-screen auto-advancing TV slideshow for a venue screen. Wrong shape for a phone held in one
  hand; the phone equivalent is the Summary section.
- **Wagon wheel** — the web client ships a placeholder that explains itself: the scorer's ball-entry
  pad does not capture shot direction, so there is no data. Nothing to render until it does.
- **Team logos** — `getTeamBrands` returns `logo`, but the canvas uses square initials avatars
  (`InitialsAvatar`) throughout, so only `primaryColor` is used. Wire logos in if the design ever
  calls for them.

---

# Still open

- **Extras semantics server-side** — see issue 2 above.
- **Cricket leaderboard economy sort** — `sortMetric` labels economy "best economy" (lower better),
  but ordering is the server's. If the API sorts economy descending, the leader chip reads wrong.
  Needs live cricket data to confirm.
- **`bowlerStats`** is now typed but unused. It carries per-bowler over tracking, which would let
  the bowling card show overs remaining per bowler under a spell limit.
