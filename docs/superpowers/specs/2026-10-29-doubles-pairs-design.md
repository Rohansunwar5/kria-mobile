# Doubles pairs in tournaments: design

Closes SERVER-GAPS #38. Spans the server (`d:\kria\server`), the organiser web client (`d:\kria\client`) and the player app (`d:\kria\mobile`).

## Why

#38 reported that a doubles partner gets no title or result. Tracing it showed the real problem starts earlier: nothing pairs doubles players at all. Each partner registers on their own (one registration per player), and bracket generation turns every registration into its own side. So a "Men's Doubles" draw today is a singles draw: wrong draw, wrong match names, and titles, results and career rows go to one person per side.

The fix: the organiser pairs the players, the draw is built from pairs, and both partners get the match credit, the title and the result.

## What the user decided

- Each partner signs up and pays on their own, as today.
- Each team tells the organiser who partners whom, outside the app. The organiser enters the pairs in the organiser dashboard. There is no pairing by players or team owners (teams have no accounts).
- Partners must be on the same team.
- The preview of 2026-10-29 (artifact "Doubles pairing preview", screens 1 and 2) was approved as drawn:
  - Pairing lives on the Brackets page of a doubles category, before its draw.
  - One card per team, listing its pairs and its unpaired players.
  - Pick a player, then a teammate, to pair them. Picking someone on another team starts a new pick.
  - **Unpair** undoes a pair.
  - **Generate bracket** stays off until there are two pairs. Its confirmation names who is left out.
  - A team with an odd player shows an "Odd one out" note.
  - In the draw, a side reads "Asha Rao / Priya Nair" with the team underneath. **Edit pairs** sits beside **Swap pairs**.

## Calls made by me, shown in the preview and approved with it

- An unpaired player sits out the draw. It is not an error.
- Pairs can change after the draw until the first result. A changed pair keeps its place in the draw.

## Calls made by me, not in the preview

- My entries in the player app shows "Partner: Priya Nair" on a paired doubles entry. It's the only place a player sees who their partner is.
- One gate for every pair edit: until a result is played in the category, pair, unpair and change partner are all allowed. After that, all of them are refused (see Changing pairs).
- A team change counts as an unpair, under the same gate. Until the first result it clears the pair; after it, the team change is refused while the player is paired (see Team changes).
- A doubles category gets **Redo draw** until its first result. It rebuilds the draw from the current pairs. That's how a category drawn as singles before this ships gets fixed, and how a whole pair is added or dropped after the draw.
- Both partners get the per-entry match counts (`registration.stats`), not just the side's registration.

## Scope

Badminton categories with `matchType: 'doubles'` and `bracketType` knockout, league or hybrid. Badminton is the only sport with doubles. Cricket has none, and table tennis has no tournaments. Team league is untouched: its doubles sub-matches already put two players behind a side with `playerIds`.

## How it works today (facts the design builds on)

- **Building the draw.** An individual draw is built in `badmintonCategoryAdapter.generateBracket` (`server/src/sports/badminton/adapters/categoryAdapter.ts`).
  - It uses the registrations that have a `teamId` and status `auctioned` or `assigned`, one competitor per registration: `{ registrationId, name, teamId, teamName }`.
  - Every way of generating a draw goes through it: `match.service.generateBracket` and the badminton category controller/service paths.
- **What a side holds.** A match side stores one `registrationId` plus `name`, `teamId` and `teamName`.
  - Generation (`shared/bracket/knockoutPlayer.ts`, `leaguePlayer.ts`), advancement (`shared/bracket/autoAdvance.ts`), swap and reshuffle all copy exactly those fields.
  - `winnerId` is a registration id.
- **Where the name shows.** A side's `name` is what the organiser bracket, the public bracket and the app show. It is also what the player leaderboard shows (`match.repository.ts`, `playerName: '$player1.name'`).
- **Where a registration becomes people.** This happens in four places:
  1. Titles and results: `entrantsOf` in `server/src/shared/results/recordCategoryResults.ts`.
  2. Career rows: `careerStatsService._toPlayerIds`, through `tournamentRegistrationRepository.getPlayerIdsByRegistrationIds`.
  3. Per-entry match counts, `registration.stats` (`matchesPlayed`, `matchesWon`, `pointsContributed`). These are credited per side id by `match.service` (`updateStats`, on completion) and by `rebuildBadmintonStatsForCategory` in `sports/badminton/services/stats-aggregator.ts`. They show in the app Profile ("N played · M won"), the web `TournamentHistoryView` and `CategoryAnalyticsModal`.
  4. In the app, "my" matches and table rows: `Me.registrationIds` in `mobile/src/lib/tournamentBracket.ts`. It is built in two places, `app/tournament/[id]/matches.tsx` and `app/tournament/[id].tsx`, both from My entries.
- **What changes a registration's team.**
  - `unassign` takes the team away and resets the status to `approved`.
  - `manual-assign` moves a player to another team.
  - Auction `undoLast` unassigns, and its carry-over unwind also reaches the same player's registrations in other categories.
  - `setIcon` / `setCaptain` (`assignRole`) rewrite `teamId`.

  None of these look at brackets today. Withdraw is refused once a registration is `auctioned` or `assigned`, and reject accepts only `pending`, so neither can touch a paired registration.
- **Redrawing.** The server can already redraw: `generateBracket` deletes the old draw after `assertBracketNotPlayed`. The web client only offers **Generate bracket** when there is no bracket.
- **Reopening.** Reopening a category takes titles and results back category-wide (`unwindCategoryResults`: `removeAllTitlesForCategory`, `clearResultsForCategory`). That already covers partners.

## Design

### Data

- Add `partnerRegistrationId` to TournamentRegistration. It is set on both registrations of a pair and cleared on both when they are unpaired.
- A pair is valid only when all of these hold:
  - both registrations are in the same category, and that category is a badminton doubles category
  - both have the same `teamId`
  - both are draw-eligible: a `teamId` and status `auctioned` or `assigned`
  - neither is already paired, and they aren't the same registration

### Team changes

- **Until a result is played in the category:** any of the team-changing paths listed above clears the pair on both registrations. The pairing panel then shows both players unpaired again. If the category already has a draw, the panel shows that the draw no longer matches the pairs (see Changing pairs).
- **After a result:** a team change for a paired registration is refused.
- A role change that keeps the same team is not a team change.
- This covers the cross-category reach of the auction undo too. Every affected registration is checked before anything is written, so an undo is never half done.

### A pair's side in a match

- A pair is one side, carried by one of its two registration ids (the "side id").
  - Its `name` is both names joined by " / ".
  - Its `teamId` and `teamName` are the team's.
- Nothing that copies sides changes. Generation, advancement, swap, reshuffle and reopen keep moving one `registrationId` and one `name`, so a pair moves through the bracket as a unit for free.

### Both partners get the credit

At each of the four places where a registration becomes people, a registration also brings its partner:
1. `entrantsOf` returns the registration and its partner's registration. Both get the title and the result.
2. Career stats: a registration slot resolves to its player and its partner's player, on the same side. Both get a career row.
3. `registration.stats` is credited to both registrations, on completion and in the rebuild. Otherwise the non-side partner would show "Winner" next to "Not played yet".
4. The app adds each entry's `partnerRegistrationId` to `Me.registrationIds`, in both places it is built. The non-side partner then sees the pair's matches and table row as their own.

### Generating the draw

- In the adapter's individual branch, for a doubles category:
  - The competitors are the pairs: draw-eligible registrations whose partner is also draw-eligible on the same team, one competitor per pair.
  - Unpaired eligible registrations are left out.
  - Fewer than two pairs is refused with a clear message.
- Singles is unchanged.

### Changing pairs

- **Until a result is played in the category,** pair, unpair and change partner are all allowed. This uses the same idea of "played" that already locks swap and reshuffle (`assertBracketNotPlayed`): a bye doesn't count.
- **Pair and unpair** never touch the draw. When a category has a draw that no longer matches its pairs, the pairing panel says so and offers **Redo draw**. "Matches" means every drawn side carries a paired registration, and every pair has exactly one of its two registrations on the draw.
- **Change partner** keeps the pair's place in the draw. The organiser can:
  - replace a partner with an unpaired teammate, or
  - swap partners between two pairs on the same team.

  The server updates the partner links. It then rewrites every match side in the category that carries the affected side id: the new `name`, and a new side id if the registration the side carried is the one that left the pair. When the side id changes, `winnerId` changes with it on any bye walkover that names it. The pair keeps its place.
- **Redo draw (doubles, until a result is played):** rebuilds the whole draw from the current pairs, through the existing `generateBracket`. It lives in the bracket's More menu next to Reshuffle, with a confirmation. Use it to add or drop a whole pair after the draw, and to fix a doubles category drawn as singles before this shipped.
- **After a result:** pairs are locked, like the draw. A pair that can't play then gives a walkover, through the existing result flow.

### Server endpoints

- They're for the organiser and staff of the tournament (`isOrganizerOrStaff`), and there are four:
  - read a category's pairing state: the eligible registrations (id, name, `teamId`, `partnerRegistrationId`) and the teams
  - pair two registrations
  - unpair
  - change a partner after the draw
- Paths and payloads are the builder's call.
- `/registrations/my-registrations` adds `partner: { registrationId, name }` on a paired entry, for the app.

### Organiser web client (`client/src/pages/organizer/components/BracketManagementSection.tsx`)

- For a doubles category with no bracket, the pairing panel (preview screen 1) takes the place of the "No bracket yet" empty state.
  - **Generate bracket** is off below two pairs.
  - Its confirmation names the unpaired players.
- With a bracket and no results:
  - **Edit pairs** opens the same panel in change-partner mode.
  - "Swap players" reads "Swap pairs".
  - The More menu gains **Redo draw**.
- Built from the dashboard's existing pieces and tokens: `PANEL`, `PageHead`, `Notice`, `ConfirmBar`, `CategoryTabs`, `Avatar`, `TeamLogo`, the `BTN_*` styles.

### Player app

- `Me.registrationIds` includes partners (see Both partners get the credit).
- On My entries, a paired doubles entry shows "Partner: {name}".
- Everything else already reads what the server writes: bracket and match names, league tables, Awards titles, Profile results and career stats.

## Non-goals

- Players or team owners choosing partners in the app.
- A mixed-doubles gender check. Category gender isn't enforced at registration either (#17).
- Migrating categories already drawn as singles. While no result is in, the organiser pairs the players and uses **Redo draw**. Once a result is in, the category stays as it was played.
- Doubles in cricket or table tennis tournaments, and team league.

## Anti-goals (failures even if it technically works)

- A partner silently missing a title, a result or a career row.
- A pair that crosses teams.
- A pair changing after a result is in.

## Must be covered by tests

- A draw from pairs, knockout and league.
- Unpaired players are left out.
- Fewer than two pairs is refused.
- A cross-team pair and a double pairing are refused.
- Until the first result, a team change (unassign, reassign, auction undo, role change to another team) clears the pair. After a result, it is refused, and an auction undo is refused before anything is written.
- Titles and results go to both partners.
- Career rows go to both partners.
- `registration.stats` goes to both partners, on completion and on rebuild.
- Redo draw rebuilds from pairs and is refused after a result.
- A partner change after the draw rewrites the sides, including when the side's own registration leaves.
- Pairs are locked after a result.
- The app counts a partner's registration as "mine", and My entries shows the partner.

## Left to the builder

- Endpoint paths and payloads.
- The name order within a pair.
- How the client loads and refreshes pairing state.
- Component structure.
- Test layout.
