# Open issues

## 1. Cricket live screen repeats its own header — 2026-09-02

`src/app/live/[matchId].tsx` renders `<Header title={`${team1} v ${team2}`} live />`, and the
`HeroScore` block directly beneath it renders the *same* `team1 v team2` line with the *same*
`Live` tag in its own band. On a real match the screen reads:

```
‹  GOLD COAST TITANS V BLAZING WILLOW            ● LIVE
   ┌──────────────────────────────────────────────────┐
   │ GOLD COAST TITANS V BLAZING WILLOW      ● LIVE   │
   │ 14/0                              OVERS 2.0/12   │
```

Two titles, two live tags, ~40px of vertical space spent saying nothing.

**Fix.** Pick one owner for the match identity. `CricketLive.dc.html` puts the fixture in the
header (`Match 12 · Group B · T20` as the subtitle, `● Live` tag on the right) and gives the hero
band to the *batting side* — `HeroScore`'s band should say who is batting, not repeat the fixture.
So:

- Header: `title` = `team1 v team2`, `sub` = round/match number (`match.bracketRound`,
  `match.matchNumber`), keep the `Live` tag. The badminton branch already passes a `sub`; the
  cricket branch passes none.
- `HeroScore` band: replace `{team1} v {team2}` with the batting team and the innings —
  `scorecard.innings{N}.battingTeamName` + `I1`/`I2`. Drop the duplicated `Live` tag; keep
  `Full time` on completion, since that is state the header does not carry.

## 2. The two extras figures on screen disagree

Same screenshot: `At the crease` prints `EXTRAS · WD 1 · NB 0 · B 0 · LB 0` (total 1) while the
batting table's footer prints `EXTRAS 2`. Recent balls show one `wd+1`, so 2 looks correct — a
wide plus a run off it.

The two come from different places: `AtTheCrease` reads `live.extras` (`cricketLiveState.extras`),
the table reads `innings.totals.extras.total`. Likely `cricketLiveState.extras.wides` counts wide
*events* and the scorecard total counts wide *runs*. **Server-side question first** — confirm which
is intended before touching the client. Whatever the answer, one screen must not print two totals
for the same thing.

## 3. Nobody can tell who is batting

`battingTeamName` and `bowlingTeamName` come down on every innings in the scorecard payload and are
rendered in exactly one place in the app — `src/app/cricket/[matchId]/balls.tsx:135`. The live
screen never says which of the two teams the `14/0` belongs to. Folded into issue 1's fix.

---

# Cricket live: data we already fetch and never show

The live screen calls three endpoints and renders a fraction of what comes back. Nothing below
needs a new endpoint or a new socket event.

## Already in the client's types, unrendered on this screen

| Field | What it gives us |
|---|---|
| `InningsScorecard.battingTeamName` / `bowlingTeamName` | who is batting (issue 3) |
| `InningsScorecard.oversTimeline` | full per-over `{runs, wickets, balls}`. `recentBalls()` uses the last 3 overs only — the rest is a ready-made over-by-over strip or manhattan |
| `InningsScorecard.fallOfWickets` | buried in the FoW tab. `Last wicket: 3-42 (7.2)` belongs in the hero, and the **current partnership** is `runs − lastWicket.score` off `(balls since)` |
| `totals.extras` breakdown | shown as one number in the table footer while `At the crease` shows the split — pick one place |

## In the server payload but not even declared in `src/api/cricketMatch.ts`

From `cricketLiveState` (`server/src/models/match.model.ts:82`):

| Field | What it gives us |
|---|---|
| `innings1Summary` `{runs, wickets, completedOvers, ballsInCurrentOver}` | the first-innings score during a chase. `chaseLine()` currently reverse-engineers this from `target` alone, so it cannot show `167/8 (20.0)` |
| `matchStatus: 'innings_break'` | the client only tests for `'completed'`. At the break the screen shows a frozen innings-1 scoreboard with no explanation — this is exactly what `EmptyState`/`StaleBanner` are for |
| `nextBatsmanNeeded` / `nextBowlerNeeded` | "waiting for the next batter" instead of a scoreboard that has silently stopped moving |
| `bowlingTeamId` | pairs with `battingTeamId`, which is declared but unused |
| `bowlerStats` (per-bowler over tracking) | overs remaining per bowler |

From `cricketSetup` (`match.model.ts:149`) — typed `cricketSetup?: any` in the client and never
read:

| Field | What it gives us |
|---|---|
| `toss.winnerTeamId` + `toss.decision` | "Titans won the toss and chose to bat" — the first thing anyone opening a live match wants |
| `team1Lineup.startingXI` / `team2Lineup.startingXI` | the XIs, and **yet to bat** = `startingXI` minus everyone in `battingCard` |
| `reserves`, `lineupSet`, `setupComplete` | whether the match is actually ready |

## Derivable from the above, no new data at all

- **Partnership** — current pair's runs and balls, from `fallOfWickets` + live score.
- **Projected score** — `runs + CRR × overs remaining`.
- **Balls remaining** — `maxOvers × 6 − legal balls`, already needed for RRR.
- **Innings boundary count** — sum `fours`/`sixes` across `battingCard`.
- **Dot-ball count / %** — from `oversTimeline`.
- **Milestones** — a `50`/`100` tag on a batter, off `battingCard.runs`.
- **Best figures so far** — top of `bowlingCard` by wickets.

## Suggested order

Toss line and batting-team identity first (cheapest, highest value, kills issue 1 and 3 together),
then `innings1Summary` into `chaseLine`, then partnership + last wicket in the hero, then the
`innings_break` / `nextBatsmanNeeded` states, then yet-to-bat, then the over-by-over strip.

Nothing here changes the design language — every item lands in an existing `.blk`, `.lbl` or `.tag`
from `docs/design-canvas/body-CricketLive.html`.
