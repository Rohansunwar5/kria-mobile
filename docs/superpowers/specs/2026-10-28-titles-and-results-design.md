# Titles and tournament results — design

Closes SERVER-GAPS.md **#9** (titles are plain strings, winners only), **#10**
(no result for a player in a tournament, beyond winning) and **#22** (the league
table is empty when teams play). Spans `d:\kria\server`
and `d:\kria\mobile`.

#22 is here because it is the missing input, not a bonus: without a server-side
team table there is no way to rank a team-mode league, so every cricket league
would produce neither a title nor a placement (§4.3).

Date: 2026-10-28. Revised the same day after a builder check — §4.1, §4.2, §6,
§7 and the implementation notes come from it.

---

## Why

Two screens in the rebuilt player app show less than their design because the
server doesn't record enough.

**Awards (DESIGN §5.11)** wants a tournament winner *and* a runner-up, each
linking to the tournament it was won at. Today a title is a string on the
player: `"Winner of Men's Doubles at HSR Shuttle Cup"`. There is no runner-up at
all, no tournament or category id to link with, and no date — so the app parses
the string with a regex (`titleAward` in `mobile/src/lib/awardsView.ts`), the
title row can't link anywhere, and "latest title" means "last element of the
array" rather than the most recent one.

**Profile › Tournaments (mock 1h)** wants each row to end with how far the player
got: "Winner", "Quarter-final", "3rd in group". The only placement recorded
anywhere is a winner's title string, so `tournamentRow` in
`mobile/src/lib/profileView.ts` rebuilds that exact string and checks whether the
player's titles array contains it. Everyone who didn't win gets a line about the
state of their entry instead — Entered, In progress, Completed.

Both of those are the same underlying gap: the server records *that* someone won,
as prose, and nothing else about where anyone finished.

---

## Goals

- A title is structured data: who placed, where, in what, and when.
- Runner-up titles exist and are awarded by the same hooks that award winners.
- Every entrant in a completed category gets a recorded result, not just the winner.
- The app stops parsing strings and stops matching titles to rows.
- A title links to its tournament.
- A team-mode league has a real table, so its entrants place like everyone else
  and the profile row agrees with the table on the tournament screen.

## Non-goals

- **No migration or backfill.** Existing title strings stay as they are and are
  normalised on read (see below). Already-completed categories get no results.
- **Group positions for hybrid categories.** Hybrid doesn't generate groups yet
  (SERVER-GAPS #12) — it makes one all-vs-all round. Hybrid and league both yield
  a league position here. The stored shape already carries `groupName`, so #12
  can start filling it without another schema change.
- **Organiser-set league points for cricket.** §4.3 uses the badminton config
  where it exists and documented defaults where it doesn't. Giving cricket
  categories their own points setting means an organiser-facing form field in
  the web client, which is not this change.
- **SERVER-GAPS #8** (honours missing where/when) is not in scope, though the
  "featured award is the newest by date" change overlaps with it and lands here
  for titles only.
- **The organiser web client.** It doesn't read `player.titles`; if that turns
  out to be wrong, the legacy read-normalisation below keeps it working.

## Anti-goals

Things that would make this a failure even if it shipped:

- **The app re-deriving placement.** If the client ends up computing where a
  player finished from matches or standings, this didn't work. The server
  decides placement; the app only words it.
- **A failed result write blocking category completion.** Today's title awarding
  is deliberately best-effort (try/catch, logged, swallowed) so a title bug can't
  strand a category mid-completion. Results inherit that. A missing result is a
  row that falls back to today's line, which is acceptable; a category that can't
  be completed is not.
- **Losing the unwind.** Reopening a decided final already takes the title back.
  Whatever replaces string-matching must keep that working, including for
  runner-up and for results.

---

## Constraints

- `server/` is **not a git repo** (only `mobile/` is). There is no revert.
- Server tests are vitest (`npx vitest run`, currently 115 files / 790 tests).
  Mobile is jest (124 suites / 976 tests). Both must stay green, both `tsc` clean.
- Mobile's working tree has uncommitted work on `main` on top of `7d087de`.
- Categories live in per-sport collections (`badminton_categories`,
  `cricket_categories`); the legacy `categories` collection is not written.
  Cross-collection reads go through `categoryRepository` / `findCategoryById`.
- Title awarding happens in **four** places and is unwound in **one**:

  | | file | what it does |
  |---|---|---|
  | write | `server/src/sports/badminton/services/badmintonCategory.service.ts` ~152-192 | standard bracket (knockout/league/hybrid); skips `TEAM_LEAGUE` |
  | write | `server/src/sports/cricket/services/cricketCategory.service.ts` ~136-161 | cricket, always team-based |
  | write | `server/src/sports/badminton/services/teamLeague.service.ts` ~890-905 | team league auto-complete from the deciding tie |
  | write | `server/src/sports/badminton/services/teamLeague.service.ts` ~1287-1299 | `_completeCategoryWithChampion` |
  | unwind | `server/src/sports/badminton/services/badmintonMatch.service.ts` ~436-463 | reopening a decided final (`revokeCategoryTitle`, local to that file) |
  | **no unwind today** | `server/src/sports/cricket/services/cricketMatch.service.ts` ~784-792 | reopens the category, never revokes the title — see §6 |
  | **no unwind today** | `teamLeague.service.ts` | no reopen path revokes anything — see §6 |

---

## The design

### 1. A title becomes an object

`player.titles` stops being `string[]` and becomes an array of:

```
{
  place: 'winner' | 'runner_up',
  tournamentId, categoryId,
  tournamentName, categoryName,   // copied at award time
  sport,
  awardedAt
}
```

Names are **snapshotted, not joined**. A title then survives a renamed or deleted
tournament and renders without a lookup — the same call the registration snapshot
already makes elsewhere in this codebase.

### 2. Identity becomes `(categoryId, place)`

Today `$addToSet` on the exact string is what stops a double award, and the
unwind rebuilds that identical string to `$pull` it. Objects break both: an
`awardedAt` that differs by a millisecond defeats `$addToSet`.

So identity is the pair `(categoryId, place)`:

- **award** — `$pull` that pair, then `$push` the new title. Two ops; idempotent.
- **unwind** — `$pull` that pair.

This is strictly less fragile than string matching, and it is what makes
runner-up safe to add: the two places in a category are distinct keys.

### 3. Legacy strings are normalised on read, never migrated

Strings already in the database are parsed once, server-side, into the same
shape: `/^Winner of (.+) at (.+)$/` → `{ place: 'winner', categoryName: $1,
tournamentName: $2 }`, with no ids and no date.

The first group is **greedy**, so the split falls on the LAST " at " in the
string. That is what makes `"Winner of Mixed at Dusk at HSR Shuttle Cup"` read
as category `Mixed at Dusk`. (An earlier draft of this document specified a
lazy first group. That was wrong: lazy splits on the FIRST " at " and yields
category `Mixed`, failing the very test it was written for. Corrected
2026-10-28.) The format is inherently ambiguous — greedy mis-splits only when
the TOURNAMENT name itself contains " at ", which is the rarer case.

The app therefore only ever sees objects. A legacy title has no `tournamentId`,
so it doesn't link, and no `awardedAt`, so it sorts last for "latest title" —
both of which the app must tolerate. A migration can't recover the ids anyway,
which is why there isn't one.

Anything that writes to `player.titles` writes objects from this change onward;
the normaliser exists for what's already there.

### 4. Results are written when a category completes

One shared helper, called from the same four hooks, does both jobs for a
completing category:

1. awards the winner's and runner-up's titles (runner-up = the loser of the final
   match; for team league, the losing side of the deciding tie);
2. writes a `result` on **every** registration in that category.

Computing at completion rather than at read is deliberate: a player with twenty
entries would otherwise mean twenty categories' worth of matches and standings on
every profile load.

#### 4.1 Where the winner comes from, per bracket shape

A knockout has a final; a league does not. Today's hook finds the decider with
`matches.find(m => m.bracketRound === 'Final' || !m.nextMatchId)` — and league
matches carry `bracketRound: 'League'` with **no `nextMatchId` at all**
(`shared/bracket/leaguePlayer.ts`, `leagueTeam.ts`), so every one of them
satisfies the second clause. A league category currently awards the tournament
title to the winner of whichever league match happens to sort first. That is a
live bug and this change ends it.

| shape | winner | runner-up |
|---|---|---|
| knockout | the final's `winnerId` | the final's loser |
| hybrid | as knockout, once #12 gives it a knockout stage; until then as league | same |
| league, **player mode** | 1st on `GET /matches/leaderboard/:categoryId` (`_buildPointsLeaderboard`, ranked by points scored then point difference) | 2nd on the same board |
| league, **team mode** (all cricket; badminton `matchType: 'team'`) | 1st on the team table built in §4.3 | 2nd on the same table |
| team league | the winning team from the deciding tie | §4.2 |

Ranking a league off the same table the tournament screen renders is the point: a
player must not read "3rd" on their profile and 5th in the table. That is why
#22 comes with this change rather than after it — see §4.3.

A category that yields no determinable winner still writes everyone's
`result`. Results and titles are independent.

#### 4.2 Team league

A team league is stage-1 groups followed by a `groupName: 'Knockout'` group
whose ties carry `bracketRound` ending `-KO-R1`, `-KO-R2`, … (the regex at
`teamLeague.service.ts` ~1240).

- A team eliminated in the **knockout stage** gets `kind: 'knockout'`. Those
  round names are not `getRoundNames` output, so §5's depth function does not
  apply: depth comes from the `-KO-R(d+)` number counted back from the last
  round that exists in the category.
- A team eliminated in the **group stage** gets `kind: 'group'` with its
  `groupName` and `outOf` = that group's size.
- `_completeCategoryWithChampion` (~1289) receives only a winning team id and
  has no tie in hand. It reads the other finalist out of the last KO round for
  the runner-up; where that can't be determined, it awards **no runner-up**
  rather than guess one.
- `badmintonCategory.completeCategory` currently skips title awarding for
  `TEAM_LEAGUE` entirely. It now calls the shared helper like the others, so a
  manually completed team league gets results for everyone and a title only when
  §4.1 can name a winner.

#### 4.3 The team league table (SERVER-GAPS #22)

`GET /matches/leaderboard/:categoryId` builds its rows from
`player1/player2.registrationId` and drops any row without a name
(`match.repository.ts` ~196-330). A match between teams carries only
`teams{team1Id, team1Name, team2Id, team2Name}`, so the table comes back empty —
and cricket is always team versus team. That is why a team-mode league has
nothing to rank.

**The route gains a team path.** When the category's `competitorType` is
`team`, rows are built from `teams.*` and `winnerId`:

| column | from |
|---|---|
| played | completed, non-bye matches the team appears in |
| won | `winnerId` is this team |
| lost | `winnerId` is the other team |
| drawn | completed with no `winnerId` (a tie, or a cricket no-result) |
| points | `won × pointsForWin + drawn × pointsForDraw + lost × pointsForLoss` |

**Points config.** Badminton categories carry
`teamLeagueConfig.pointsForWin/Loss/Draw` (defaults 2/0/1). Cricket categories
carry no points setting at all, so the same 2/0/1 applies. The three values go
out **with** the table so the app can label the column rather than assume them.

**Ranking:** points desc, then wins desc, then fewer losses, then name. §4.1 and
§5 read 1st and 2nd off this.

**Two things the builder must check rather than assume.** The existing
`_buildPointsLeaderboard` is bound to the badminton model
(`getBadmintonModel()`), so the team path has to cover the cricket collection
too — confirm how, or whether, that route serves cricket today before writing
it. And the app currently builds its own table client-side (`teamTable` in
`mobile/src/lib/standingsView.ts`) ranked by **wins**, not points; switching it
to the server's table can reorder what is on screen today wherever draws exist.

**App:** `teamTable` stops counting completed matches and reads the server
table, and the table gains a **Pts** column. `teamLeagueTable` (the stage-group
standings) is untouched.

### 5. `result` stores facts, not a sentence

On `tournamentRegistration`:

```
result: { kind: 'winner' | 'runner_up' | 'knockout' | 'group',
          round?, position?, outOf?, groupName? }
```

The app words it. "Quarter-final" and "3rd in group" stay client-side and can be
reworded without a migration.

**Derivation per entrant:**

- *Winner / runner-up* — from the final match, which the hook already has.
- *Knockout* — the deepest round the player (or their team) lost in. Round names
  come from `getRoundNames` (`server/src/shared/bracket/roundNames.ts`) in a fixed
  order: `Final` → `Semi-Final` → `Quarter-Final` → `Round of N`, plus
  `Preliminary Round` for a mostly-bye first round. Depth is therefore a **pure
  function of the name** — `Final` 0, `Semi-Final` 1, `Quarter-Final` 2,
  `Round of N` → `log2(N) - 1`, `Preliminary Round` deepest — and should be
  written and tested as one.
- *League / hybrid, player mode* — position on `_buildPointsLeaderboard`, with
  `outOf` = the number of ranked entrants. `groupName` stays empty: a flat league
  has no group, which is why the wording table in §8 has a separate line for it.
- *League / hybrid, team mode* — position on the §4.3 team table, with `outOf`
  = the number of teams. Applied to every player on the team.
- *Team league* — per §4.2, knockout depth or group position, applied to every
  player on the team.
- *Never played* (withdrew, no matches) — no result. The row falls back.

### 6. Reopening clears what it wrote

**The trigger changes.** Badminton's unwind currently fires on
`isFinal = match.bracketRound === 'Final' || !match.nextMatchId` — which, as
§4.1 explains, is true of *every* match in a league. The unwind instead fires on
the thing that actually matters and that both reopen paths already compute:
**did this reopen put the category back to ongoing?** If it did, pull both
titles for that category and clear `result` on all its registrations. If it
didn't, nothing was awarded off this match and there is nothing to take back.

**Cricket and team league gain the unwind.** Only badminton has one today:
`cricketMatch.service.ts` (~784) flips a COMPLETED category back to ONGOING on
a corrected match and leaves the title standing, and no team-league path revokes
anything. Before this change that is one stale string. After it, it is a stale
winner *and* runner-up plus a visible "Winner" on the Profile row of someone who
no longer won — so the mirror of `revokeCategoryTitle` goes into both paths.
That makes the "losing the unwind" anti-goal actually true rather than
badminton-only.

### 7. Endpoints

- `GET /player/auth/public/:id` — `titles` now objects.
- `GET /player/auth/tournament-history` — each row gains `result`. Note the
  service builds rows field-by-field (`playerAuth.service.ts`
  `_buildTournamentHistory`), so `result` must be added to that map explicitly or
  it won't appear.
- `GET /player/auth/public/:id` — **also** carries `result` on its history rows.
  `getPublicProfile` (~379) re-maps the same rows a second time for PII
  stripping, and the app renders another player's rows through the same
  `tournamentRow`. Miss this map and every row on every other player's profile
  silently regresses to "Completed" once the title match is deleted. `result`
  holds no personal data; it is the same placement anyone watching the
  tournament saw.

### 8. The app

**Awards** (`mobile/src/lib/awardsView.ts`)

- `titleAward` reads the object; the regex goes.
- `place: 'runner_up'` renders the same shield in **silver** — `AwardBadge`
  already takes a metal, and the ramps are in `constants/theme.ts`. No new
  artwork.
- A title row links to its tournament via `tournamentId`.
- Featured "latest title" picks by `awardedAt`, not array position — and
  prefers a **winner** over a runner-up when both exist, falling back to the
  newest runner-up when there is no win. The headline award shouldn't demote
  itself to silver because the silver one is newer.
- Card copy for a runner-up, matching the five fields `titleAward` already
  sets: name `Runner-up · <category>`, context the tournament, tier
  "Tournament title", description "Lost the final at <tournament>.", criteria
  "Reach a tournament category final".

**Profile › Tournaments** (`mobile/src/lib/profileView.ts`)

- `tournamentRow` reads `result` off its own registration. The
  `titles.includes("Winner of …")` match is deleted, and with it the Profile
  list's dependence on Awards data.
- Wording (chosen in review — just the placing, not a sentence):

  | result | line | colour |
  |---|---|---|
  | `winner` | Winner | gold |
  | `runner_up` | Runner-up | silver |
  | `knockout`, round | the round name, lowercased after the first word — "Quarter-final", "Semi-final", "Round of 16" | text2 |
  | `group`, position, `groupName` | "3rd in group" | text2 |
  | `group`, position, no `groupName` (a flat league) | "3rd of 12" | text2 |
  | none | today's ladder: In progress · Completed · Cancelled · Awaiting approval · Sold ₹X · Entered | unchanged |

- A winner appears in both places — a shield on Awards, "Winner" on the
  Tournaments row. Intended; they answer different questions.

---

## Implementation notes worth having up front

- **`player.titles` must hold both shapes.** New objects and the legacy strings
  that are already in the collection live in the same array, so the Mongoose
  path is `[Schema.Types.Mixed]` with the normaliser in §3 as the only thing
  that reads it. A typed sub-schema will reject every existing document.
- **Scope the team lookup by category.** `tournamentRegistrationRepository.getByTeam(teamId)`
  filters on `teamId` alone, so in team mode a title currently goes to every
  registration that team holds across *all* the tournament's categories. Results
  are written per category, so left alone the two new surfaces would contradict
  each other — a title for a category whose row shows no result. Add a
  category-scoped lookup for the award paths rather than changing `getByTeam`,
  which the public team roster also calls.

## Left to the builder

- Where the round-depth function and the ordinal helper live, and whether the
  shared completion helper sits in `server/src/shared/` or beside the sport
  services. It has four callers across two sport modules.
- Whether withdrawn and rejected registrations get a `result` written at all
  (the suggestion is no — they didn't finish anywhere).
- The exact sequencing of the two write ops in `addTitle`, and whether the
  repository exposes one method or two.
- Test shape, within the house style: vitest on the server, jest on the app. The
  round-depth function and the result-wording map are the two pieces that most
  want direct tests.
