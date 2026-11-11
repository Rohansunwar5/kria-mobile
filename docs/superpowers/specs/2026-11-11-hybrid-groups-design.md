# Groups, then a knockout, for individual categories (SERVER-GAPS #12)

Date: 11 November 2026. The user asked me to make the product calls, so every rule below is my call unless it quotes the mock or the existing organiser form.

## Why

An organiser can create a `hybrid` badminton category ("Groups + knockout") with a group size and how many qualify from each group. The server stores both numbers and ignores them: it plays the whole category as one all-play-all league with no knockout. The organiser web client hid the option for new categories for that reason. Mock 2f (group tabs, a P W L Pts table and a qualifying line) and 2e (a Knockouts · Groups switch) can't be built until the server plays the format.

Done looks like this: an organiser creates a Groups + knockout singles or doubles category, draws it, and scores the group matches. When the last group match is decided, the server draws the knockout from the top finishers. The Final decides the champion. The app shows the groups and the bracket, and every entrant's profile shows how far they got.

## Goals

- `hybrid` works for badminton **singles and doubles** categories.
- Group tables follow standard badminton rules, in the shape of the mock.
- The knockout draws itself. The organiser does nothing between the stages.
- Titles and results work as they do for knockout and league categories.

## Non-goals

- **Team-mode hybrid** (badminton `matchType: 'team'`, and cricket, which always plays team v team) stays one league. Cricket's form doesn't offer hybrid. Badminton team mode can still pick it, and it plays as a league as today.
- **Editing groups by hand.** The organiser can redraw while nothing is played, but can't move one player between groups.
- **Seeding from rankings.** Groups are drawn at random.
- **A group table for the organiser** in the web client. Their Brackets page shows each group's fixtures, and the knockout appears when the groups finish.
- **Group tables on the web client's player pages** (BracketTab, the public bracket page). They stop showing group fixtures as a broken knockout column, and that's all.
- A third-place match.

## Anti-goals

- A knockout that rematches two players from the same group earlier than it has to.
- A category that marks itself complete before its last match. That already happens to every league (see "Completion", below), and groups would inherit it.

## How it works

### Group size and qualifiers (existing fields)

`hybridConfig.leagueSize` is **entries per group**. The organiser form labels it "Group size: Entries in each group". `hybridConfig.topN` is **how many qualify from each group** ("Qualify from each group"). SERVER-GAPS #12 suggested `leagueSize` groups; the form is the source, so it's the per-group size.

- New rule, server and form: `topN` must be less than `leagueSize` ("Fewer must qualify than play in each group").

### The group stage (drawn with Generate, as today)

- **Number of groups:** ceil(entries / `leagueSize`). Group sizes differ by at most one. For example, 13 entries with size 4 make groups of 4, 3, 3 and 3.
- **Who goes where (my call):** shuffle the entries, then deal them out one group at a time, keeping team-mates together in the dealing order so that players from the same auction team land in different groups wherever the numbers allow. Doubles deal pairs, as the draw already does.
- **Names:** Group A, Group B and so on, at most 26 groups.
- **Matches:** everyone in a group plays everyone else in it once. Each match has `bracketRound: 'Group A'` (the group's name), `roundNumber: 1`, `positionInRound` counting within the group, and a category-wide `matchNumber`. No `nextMatchId`.
- **Refused at the draw:** when the groups would send fewer than 2 players through ("Not enough entries for a knockout: …").

`bracketRound` carries the group so no schema change is needed. Every screen that lists matches by round already shows "Group A" as a heading.

### Group tables

One pure function builds every group's table from its matches. Only completed or walkover matches with a winner count; a bye doesn't. Every group member has a row, even before they play.

- **Row:** `registrationId`, `name`, `teamName`, `played`, `won`, `lost`, `points`.
- **Points (my call):** 2 for a win and 0 for a loss, the existing default (`resolvePointsConfig`) and the mock's own figures (`pts: r[3] * 2`). Badminton has no draws.
- **Order (my call, from the BWF's rules):** points; then, when exactly two players are level, whoever won their match; then game difference; then point difference; then name. With three or more level, head-to-head is skipped. Games and points come from `gameScores`.

### Drawing the knockout

When the last group match is decided and no knockout exists, the server draws it:

- **Qualifiers:** the top `topN` of each group, or the whole group if it's smaller.
- **Seeds (my call):** group winners first, in group order (A1 is seed 1). Each later finishing place is placed one group at a time, in the open seed spot that keeps that player away from their own group's qualifiers for as long as possible (ties go to the lowest seed). Two groups, top two: A1 v B2 and B1 v A2, so group-mates can meet only in the Final. Four groups, top two: the same holds.
- **Byes:** when the number of qualifiers isn't a power of two, the top seeds get byes, in the usual way.
- **Matches:** the existing knockout generator, called with seeded order instead of a shuffle. Rounds are named as today (Quarter-Final, Semi-Final, Final, Round of N, Preliminary Round), `roundNumber` starts at 2, and the rounds are linked by `nextMatchId`.
- **A race between two last results:** both may try to draw the knockout. The unique (category, round, match number) index refuses the second, which is caught and ignored.

### Completion (fixes a bug that also affects league categories today)

**Today:** a badminton or cricket result calls `completeCategory` whenever the match has no `nextMatchId`. Every league match lacks one, so a league category completes, and hands out its titles, after its **first** result.

**New rule, in one helper used by badminton's result and live-point routes and by cricket's result route:** after a match is decided, if it has no next match and every match in the category is decided, then:
- a hybrid category with no knockout yet draws its knockout;
- anything else completes. A knockout's Final still completes it, because by then every other match is decided.

"Decided" means completed or walkover.

### Reopening a group match

Reopening a group match after the knockout has been drawn:
- **Refused** once any knockout match has been played or is under way: "Cannot reopen: the knockout has started. Correct the knockout first."
- **Otherwise allowed:** the unplayed knockout is deleted, and it is drawn again when the group stage is over again.

### Reshuffle and swap

Both are broken today for league fixtures, and they would scramble groups the same way.
- **Reshuffle** on a league or hybrid category redraws it, the same as Generate (refused once results exist, as now).
- **Swap** refuses a league or group fixture: "Swap works on knockout matches only. Redraw to change the draw."

### Results and titles

When a hybrid category completes:
- **Players who reached the knockout** are placed by the knockout, as a knockout category is: Winner, Runner-up, or the round they went out in.
- **Everyone else** gets `{ kind: 'group', groupName: 'Group A', position, outOf }`. The app already shows this as "3rd in group".
- **Completed before its Final** (by hand): everyone gets their group place and nobody gets a title, as a team league finished early does today.

### The table endpoint

`GET /matches/leaderboard/:categoryId` for a hybrid category adds the following to today's response, so existing readers are unaffected:
- `groups: [{ name: 'Group A', rows }]`
- `qualify`: `topN`
- `knockoutRound`: the first knockout round's name, worked out from the number of qualifiers (for example "Quarter-Final"), even before the knockout exists.

## Organiser web client

- **Category form:** offer "Groups + knockout" again for new badminton categories, and enforce the `topN < leagueSize` rule.
- **Brackets:**
  - Each `Group X` round shows as a fixture grid under its own heading, as `League` does today, and the knockout rounds show as the tree.
  - Until the knockout exists, a line reads "The knockout is drawn when every group match is done."
  - Group fixtures offer no swap.
  - For a league or hybrid category, the Reshuffle button reads "Redraw".
- **Match Management:** no change. It already lists matches under their round names.
- **Player BracketTab and public BracketPage:** leave group rounds out of the knockout tree.

## Player app

- **The Matches view (2e/2f) for a hybrid category:**
  - The Knockouts · Groups switch appears once the knockout exists, and Knockouts is then the default. Until then the Groups view shows on its own.
  - **Groups (2f):** a Group A–D segmented control and a table with the columns #, Player, P, W, L and Pts. Your row is lifted. The cut line under row `qualify` reads "{knockout round} line", for example "Quarter-final line". Below the table come "Group A results" and that group's coming-up matches.
  - The rule line reads: "2 points for a win. Level players split by head-to-head, then games, then points."
  - **Knockouts (2e):** the existing bracket view, given only the knockout matches.
- **Labels:**
  - Hybrid's format line becomes "Groups → knockouts" (mock line 440).
  - The 2b format fact becomes "Groups of 4, top 2 to knockouts" (line 130).
  - Its how-it-works step becomes "Groups, then knockouts / Groups of 4 play each other; the top 2 go through." (line 456).
  - `TournamentCategory` gains `hybridConfig`.
- **Completed hybrid (2a Results):** shows the champion from its Final, as a knockout does.
- **Round labels:** `roundLabel` leaves "Group A" as it is (it currently gives "Group a"). Group matches carry no number in live and next-match labels, as League matches don't.
- **Profile:** no change. "3rd in group" already renders.

## Left to the builder

- File and function names, and where the pure helpers live (`server/src/shared/bracket/` fits).
- Whether the knockout generator takes a `seeded` flag or the seeded order is built beside it, provided the bracket's shape and links match the existing generator.
- Test layout. Write each test first, as the earlier gaps did.
