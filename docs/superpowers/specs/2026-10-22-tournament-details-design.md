# Tournament details (2a–2f): design

22 October 2026 · player app (`mobile/`) · part of the redesign to `mobile/DESIGN.md` v1.1

## Intent

An official tournament is followed from sign-up to final in the player app: see it, enter it, pay, watch the auction, find your team, follow your matches, see the results. Today that is spread over thirteen old-UI screens built on the old theme. This pass replaces them with screens built from the new design system, following the mock `mobile/new-ui-designs/Kria Tournament Details.dc.html` (2a–2f).

The user said the mock needn't be copied exactly, because tournament formats produce many outcomes the mock doesn't show. Most things should stay as the mock has them. Where the mock and DESIGN.md disagree on structure, DESIGN.md wins. Where they disagree on a value, the mock wins.

## Goals

- Replace the old tournament screens with new-system screens covering 2a–2f, every lifecycle stage and every format the server produces (knockout, league, hybrid, team league; badminton and cricket).
- Make paid entry work end to end. Today the app's verify call is refused, so no paid registration is ever created (SERVER-GAPS #11).
- Show only real server data. Every mock element without server backing is left out and logged in `SERVER-GAPS.md` (#11–#21 were logged for this pass).

## Non-goals

- Live match screens (`live/*`, the cricket ball-by-ball, cricket stats leaderboard, my cricket stats). A separate Live Matches design exists and comes next. These old screens stay and are linked from the new ones.
- Server changes. Gaps are logged, not fixed.
- The payment status screen `payment/[orderId]` and Profile's sub-screens (`profile/registrations`, `profile/invoices`). They stay old until their own pass.
- Withdrawing an entry (server supports it; the mock doesn't show it; refund rules are unclear).

## Anti-goals

- Sample values from the mock (names, prices, "Court 1", "player 9 of 32", "usually within a day"). Never.
- Organiser or staff controls (bidding, approval, scoring). Players watch.
- Registration counts ("41 joined"). Players see the cap only.
- Promising a notification. Nothing on the server sends one (#2).
- Confetti, spin-wheel animation, looping pulses (DESIGN §9, §13).

## Constraints

- Repo is not under git. Copy every file to a backup before deleting it (see Deletions).
- Build on `src/constants/theme.ts` and `src/components/ui/*`. No imports of `src/lib/theme.ts`, `components/icons` or NativeWind classes in new code.
- Data loading follows the rebuilt screens (e.g. `app/(tabs)/awards.tsx`): API calls in `useFocusEffect` with local state, `useAppSelector` only for the auth user. No new Redux thunks.
- Pure view logic goes in `src/lib/*View.ts` files with tests; screens lay out what they return.
- Install packages with `--legacy-peer-deps` (none are expected to be needed).
- Screens without a mock get an HTML preview first, and wait for the user's approval (user's standing rule). This pass has three: the team-league tie screen, the auction's finished state, and the completed-tournament results section on 2a.

## Data the screens read

All public unless marked *player*. Paths as mounted (no `/api/v1` prefix).

| Need | Route | Notes |
|---|---|---|
| Tournament | `GET /tournament/:id` | `name, bannerImage, status, startDate, endDate, venue{name,address,city,coordinates}, registrationDeadline, description, teamsCount, awards[]` |
| Categories | `GET /tournaments/:id/categories` | All sports merged. See the corrected type below |
| Announcements | `GET /tournaments/:id/announcements` | Pinned first, then newest. `title?, message, severity, pinned, authorName, createdAt` |
| Teams | `GET /tournaments/:id/teams` | `name, logo, owner.name, budget, initialBudget, whatsappGroupLink` |
| Roster | `GET /registrations/teams/:teamId/roster` | `players[]` with `profile, role (normal/captain/icon), categoryId, auctionData.soldPrice, playerId`; `totalPlayers` |
| My entries | `GET /registrations/my-registrations` *player* | All my registrations; filter by `tournamentId`/`categoryId` client-side |
| Register (free) | `POST /registrations/register` *player* | `{tournamentId, categoryId, profile{firstName,lastName,age,gender,phone,photo?,skillLevel}}`. Never send `basePrice` |
| Pay | `POST /payments/create-order`, then Razorpay, then `POST /payments/verify` *player* | Verify body: the three Razorpay fields **plus** `profile{firstName,lastName,age,gender,phone,skillLevel}` |
| Auction | `GET /auction/:t/:c/status` + socket `join:auction` / `auction:update`, `GET /auction/:t/:c/sold-log` | Reuse `lib/useAuctionSocket.ts` as is. Status 404 = not started |
| Matches | `GET /matches/categories/:categoryId` | Resolves badminton or cricket by category. `bracketRound, roundNumber, positionInRound, matchNumber, nextMatchId, nextMatchSlot, player1/2{registrationId,name,teamId,teamName}, teams{…}, competitorType, gameScores, result{team1Summary,team2Summary}, winnerId, winReason, status, schedule{date,time,court}, matchConfig` |
| League table | `GET /matches/leaderboard/:categoryId` | Badminton: `playerName, teamName, matchesPlayed, matchesWon, totalPointsScored, pointDiff, rank`. Cricket: `matchesPlayed, matchesWon, rank` |
| Team league | `GET /sports/badminton/team-league/:c/standings?stageNumber=`, `/groups/:g/ties`, `/ties/:id` | Existing `api/teamLeague.ts` |

**Corrected category type.** The mobile `Category` type (`store/slices/registrationSlice.ts`) doesn't match the server. New code uses a new type that matches `badmintonCategory.model.ts` / `cricketCategory.model.ts`: `gender: 'male'|'female'|'mixed'`, `ageGroup{min?,max?,label?}`, `matchType: 'singles'|'doubles'|'team'`, `matchFormat{bestOf,pointsPerGame,tieBreakPoints}`, `cricketConfig{overs,playersPerTeam,…}`, `bracketType: 'league'|'knockout'|'hybrid'|'team_league'`, `hybridConfig`, `teamLeagueConfig{topNPerGroup,pointsForWin,pointsForLoss,pointsForDraw,…}`, `maxRegistrations, registrationFee, isPaidRegistration, status, sport`. Add `role, categoryId, playerId` to the roster player type.

## Shared vocabulary

**Category status label** (accent / text / text3 per DESIGN §5.10 status indicator):

| Category `status` | Label | Colour |
|---|---|---|
| setup | Opens soon | text3 |
| registration | Registration open | accent |
| auction | Auction live · paused · starts soon · ended (from the auction document's status, as `lib/drawRoute.ts` does today) | accent while live, else text2 |
| groups_configured, bracket_configured | Draw is out | text |
| ongoing | In progress (or "{Round} live" when a match is in progress) | text |
| completed | Completed | text3 |

**Format line.** `{bracketType label} · {scoring}`. Labels: knockout "Knockout", league "League", hybrid "League" (the server plays hybrid as one league, #12), team_league "Team league". Scoring: badminton "Best of {bestOf} to {pointsPerGame}"; cricket "{overs} overs · {playersPerTeam} a side". Doubles adds "Doubles" before the label.

**Fee.** "Free" when `!isPaidRegistration` or fee is 0, else "₹{fee}". Breakdown (server formula, `payment.service.ts:67-76`): gateway = round2(fee × 0.02), platform = round2(fee × 0.02), GST = round2((gateway + platform) × 0.18), total = round2(sum). All amounts are rupees; never divide by 100. The amount charged is always the one `create-order` returns.

**Round abbreviations.** "Quarter-Final" QF, "Semi-Final" SF, "Final" Final, "Round of N" R{N}, "Preliminary Round" Prelim. An empty slot names its feeder: the match whose `nextMatchId` is this match and `nextMatchSlot` is this slot → "Winner of {abbr} {positionInRound}". A bye (`winReason: 'bye'`) reads "Bye".

## Screens

### 2a Tournament, `app/tournament/[id].tsx` (rewritten in place)

Order as the mock: banner (16:9 crop, back button; no bookmark or share, #15) → status line → name (condensed 38) → facts grid → tabs → pinned update → Categories → Teams → Results (completed only) → About. One footer CTA.

- **Organiser row:** left out (#14).
- **Stage.** Organisers move a tournament's `status` by hand and skip steps, while categories move on their own (an auction starts per category; generating a bracket sets the category `ongoing`). So 2a works from an effective stage: a category auction that is live or paused counts as auction_in_progress, and a category that is `ongoing` or has a live match counts as ongoing, whatever the tournament `status` says. Otherwise the tournament `status` is used. The status line, tabs and footer all read the effective stage.
- **Status line** by effective stage:
  - registration_open: "Registration open · closes {registrationDeadline}" accent.
  - registration_closed: "Registration closed · starts {startDate}" text3.
  - auction_in_progress: "Team auction live · {category}" accent, naming the category whose auction is in progress; "Team auction paused" when it's paused.
  - ongoing: "In progress", plus " · {Round} live" when a loaded match is `in_progress`. Colour: text.
  - completed: "Completed · {endDate}" text3. cancelled: "Cancelled" text4.
- **Facts grid** (2×2, mock layout): When (start date, "– end" when different) · Where (`venue.name`) · Format ("{n} categories", plus " · {teamsCount} teams" when > 0) · Entries close (deadline; "Entries closed {date}" once past).
- **Tabs:** Overview (current) and links to sub-screens, shown only when they have data. Matches (any category has matches), Auction (any category's auction status call returns 200), Teams (`teamsCount > 0`). Order follows the stage, as in the mock.
- **Pinned update:** the first announcement, if any. Tag "Pinned · {Important | Info | Schedule change}" ("Pinned" only when `pinned`); schedule_change and important in accent, info in text2. Title, message, meta "{authorName} · {relative time}" (no role, #21). Below it, "All updates" when there are more than one, to the announcements screen.
- **Categories:** one row per category: name, format line, status label, fee, chevron → 2b.
- **Teams:** crests (56, on `#F5F5F5`), name below, truncated (#21 no short name). Tap → Teams on that team. "Squads" link → Teams.
- **Results (completed only, preview first):** champions for knockout categories only: the winner of the completed match with `bracketRound: 'Final'` and no `nextMatchId`. League and team-league categories name no champion, because the server can't settle one (its league table ranks by rally points, and its league "Winner of" title takes an arbitrary fixture). They show "Final table" instead, which opens Matches on that category. Then the tournament's `awards[]` (title + player or team).
- **About:** description, then the address line (`venue.name, address, city`) with "Directions" opening Google Maps (`coordinates` if present, else the address).
- **Footer CTA** (one primary):
  - registration_open, and an open category (`status: 'registration'`) I haven't entered: "Register · from {lowest fee | free}" → 2b if one such category, else scrolls to Categories. Logged out → login.
  - registration_open and I've entered every open category: "Your entry" (secondary) → 2b of my newest entry.
  - auction_in_progress: "Watch the auction" → 2c of the live category.
  - ongoing: I have a scheduled or live match → "Your {round} · {time}" → Matches on that category. Otherwise "See matches".
  - completed: "See results" → Matches.
  - registration_closed or cancelled: no CTA, unless I have an entry ("Your entry").
- **States:** skeletons in final shapes; inline error with Retry, keeping cached data.

### 2b Category and entry, `app/category/[categoryId].tsx` (rewritten; `?tournamentId=` required)

Top bar: back, category name, tournament name.

- **Facts grid:** Format (format label + matchType) · Scoring · Eligibility (gender word + `ageGroup.label`, or "Open") · Entries ("Limited to {maxRegistrations}", or "No limit").
- **How it works:** numbered steps written from the real config:
  1. "Register{ and pay}": "Your profile and skill level go to the organiser."
  2. "Organiser approves": "Approved players join the auction pool." when the tournament has teams, else "Approved players are placed in the draw."
  3. Only when the tournament has teams: "Team auction": "{teamsCount} teams bid for players. You join the team that buys you."
  4. By format. Knockout: "Lose once and you're out." League/hybrid: "Everyone plays everyone; the table decides." Team league: "Teams play ties in groups; points decide the table."
- **Your entry:** avatar (`profileImage` or initials), name, "{Gender} · {age} · {phone masked to the last 3}", "Edit profile" → `/profile/edit`. Age comes from `dateOfBirth`. Missing DOB or gender: an inline note "Add your date of birth and gender to enter" with Edit profile, and Pay disabled.
- **Eligibility check (client side, the server doesn't enforce it, #17):** gender mismatch (unless mixed) or age outside `ageGroup` disables Pay with the reason under the button.
- **Skill level:** 2×2 choice of beginner / intermediate / advanced / professional. Nothing preselected; required before Pay.
- **Payment:** the breakdown rows (Entry fee, Payment gateway (2%), Platform fee (2%), GST (18% on fees), Total), then "Paid via Razorpay · UPI, cards, netbanking". Free categories show "Free entry" and no rows.
- **Footer:** "Pay ₹{total} and register" or "Register" (free). Not shown when the category isn't open (`status !== 'registration'`, tournament not `registration_open`, or deadline past); the status label says why instead. Logged out: "Log in to register".
- **Paid flow:** `create-order` → `RazorpayWebView` (existing component, full screen) → on success, save `{orderId, paymentId, signature, categoryId, skillLevel}` with `lib/secureStore.ts` → `verify` with the profile → clear the saved result → refetch my registrations → entered view. Dismissing returns to the form.
- **Verify failure** (money taken, no entry yet; there's no webhook, #11, and `create-order` would happily charge again):
  - Show an inline error that says the payment went through and the entry isn't confirmed yet, with "Try again" (re-sends the saved result), the Razorpay order id and "Contact support" (`mailto:support@kria.club`, as the old payment screen).
  - While a saved result exists for this category, Pay is replaced by "Confirm my entry" (retry). Opening 2b with a saved result retries verify once automatically. A second payment is never offered while one is unconfirmed.
  - If verify answers that the entry already exists, clear the saved result and show the entered view.
- **Free flow:** `POST /registrations/register` → entered view. Server message shown inline on refusal.
- **Entered view** (after paying, and whenever I open a category I've entered):
  - A check (only right after paying) and a condensed heading by status: pending "You're in the queue for approval"; approved "You're approved"; auctioned/assigned "You're on {team}"; rejected "Your entry wasn't accepted"; withdrawn "You withdrew this entry".
  - One line under it: "₹{amount} paid." when paid, plus what happens next.
  - Timeline: Registered (date from `createdAt`) → Pending approval → Approved → In the auction pool (teams only) → Assigned to a team (teams only). Steps done / now / next by status; no invented times (#18).
  - Footer: "Back to tournament".
- Profile's "Pay now" (`RegistrationCard`) and "Retry" (`InvoiceCard`) now open this screen instead of checkout.

### 2c Auction, `app/auction/[tournamentId]/[categoryId].tsx` (rewritten)

Watch-only broadcast. Data from `useAuctionSocket` (status + socket + sold log).

- **Top bar:** back, "Auction · {category}", sub-line "Player {currentPlayerIndex + 1} of {totalPlayers} · {unsoldCount} unsold" ("Unsold round {rotationCount}" when > 0). Status pill on the right: Live (accent dot; also for `sold`), Paused, Tie-breaker (`liveBid.tieBreakerActive`), Starts soon, Finished.
- **Last sale strip:** `lastSoldResult` (SOLD, "{player} → {team}", price). When cleared, the newest sold-log entry.
- **On the block:** photo or initials (104), name (condensed 34), "{Skill} · {age} · Base price ₹{basePrice}".
- **Current bid card:** "Current bid", amount (condensed 72), bidder crest and name. No bid yet: "No bids yet · base ₹{basePrice}". During a tie-breaker: "Tied between {teams}. The organiser breaks the tie." and the winner once `spinWinnerId` is set.
- **Bids:** "Bids · min raise ₹{minBidIncrement}", newest first, up to 5; newest bright, the rest dimmed.
- **Purses:** 2×2 cards: crest, name, purse left (`budget`, condensed 24), spent bar (`totalSpent / initialBudget`), "{playersCount} players · ₹{totalSpent} spent".
- **Your result** (only if I have a registration in this category): auctioned/assigned → "You went to {team}" "Sold for ₹{soldPrice}" → Teams on that team; in `unsold[]` → "You're unsold this round"; in `upcoming[]` → "You're up in {queueIndex − currentPlayerIndex}"; otherwise "You're in the pool". No "player N of M" for me (#20).
- **Not started** (404 or `not_started`): empty state "The auction hasn't started", "It starts when the organiser opens bidding. This screen updates live."
- **Finished (preview first):** "Auction finished", "{totalSold} sold · ₹{totalRevenue}", purses, and the sold list (player → team · price, captains and icons marked).
- **Connection lost:** inline "Reconnecting. Showing the last update." above the content.

### 2d Teams, `app/tournament/[id]/teams.tsx` (new route, `?team=` selects one; replaces `app/team/[teamId].tsx`)

- **Crest row:** every team, 72 wide, selected one on `surface2` with an accent ring. First selected: `?team`, else my team, else the first.
- **Header:** "Your team" (accent) when my registration's `teamId` matches; name (condensed 36); "Owner {owner.name}".
- **People, not entries.** The roster returns one row per registration, and a player can be on one team in several categories. Group rows by `playerId`: one squad row per person, their categories joined ("Men's Singles · Mixed Doubles"), price = the sum of their sold prices, role = captain or icon if any entry has it.
- **Stats:** Players (people, after grouping) · Spent (`initialBudget − budget`) · Purse left (`budget`).
- **WhatsApp row:** only on my own team and only when `whatsappGroupLink` is set. "Join" opens it.
- **Squad:** initials avatar (accent ring for me), name ("(you)" for me), role badge C (captain, text on light) or ICON (gold), category name (from the categories list by `categoryId`), sold price (or "—" for pre-assigned). Captain and icon first, then by price. Tap → `/player/[playerId]` (old screen).
- **Empty roster:** "No players yet", "Players join teams at the auction."

### 2e/2f Matches, `app/tournament/[id]/matches.tsx` (new route, `?category=`; replaces `bracket`, `team-league` and `leaderboard`)

Top bar: "Matches", tournament name. Category chips (all categories past `setup`); `?category` or the first with matches is selected. The view below depends on the selected category's `bracketType`. The mock's Knockouts · Groups switch isn't built: individual categories have no groups (#12).

- **Knockout:**
  - **Your next match** (when I have a scheduled or live match here; matched on my `registrationId`, or my `teamId` for team events): "Your next match · {Round} {n}", court; both names (condensed 20) with team names; "{date} · {time} · Best of {n} to {p}" (cricket: overs).
  - **Bracket:** columns by `roundNumber` with round headers; 200px cards, 36px gutters (DESIGN §5.10). Card header "{abbr} {n} · Final score | Live · Court {c} | {time} · Court {c}". Rows: name, team name, per-game scores (cricket: `result.team{1,2}Summary`). Winner bright, loser text4, my matches ringed in accent, empty slots "Winner of …". Tap a live or finished match → `/live/[matchId]` (old screen).
  - Legend under the bracket: Your matches · Live.
  - One bracket component shared with the knockout room. Generalise `components/knockout/Bracket.tsx` to take neutral columns and cards, with each caller mapping its own data. Its look must not change in the knockout room.
- **League and hybrid:** one table for the whole category in the 2f style, without group tabs or a qualifying line. My row (or my team's) lifted. Below it, "Results" (completed matches: "{winner} d. {loser}", scores, "{round} · Court {c}") and "Coming up" (scheduled ones).
  - **Players compete** (badminton singles/doubles): the server leaderboard. Columns rank, player + team, P, W, L (= P − W), "Pts" = rally points scored. Rule line: "Ranked by points scored, then point difference".
  - **Teams compete** (every cricket category, badminton `matchType: 'team'`): the server leaderboard comes back empty for these (#22), so count the table from the category's completed matches: P, W, L, and D for `winReason: 'draw'`, by `teams.team1Id/team2Id` and `winnerId`. Ranked by wins, then fewer losses; no Pts column. Rule line: "Ranked by wins".
- **Team league (badminton):**
  - Group segmented control (Group A, B, …) from standings. A stage switch appears only if more than one stage exists.
  - Table: rank, crest + team, P W L D, Pts (condensed 20). Rule line from `teamLeagueConfig`: "Win {w} · Draw {d} · Loss {l} points". A "Top {topNPerGroup} go through" line after that row when `topNPerGroup` is set. My team lifted.
  - "Group {X} ties": "{team1} v {team2}", sub-matches won each, status. Tap → tie screen.
- **Tie screen (preview first), `app/tournament/[id]/tie/[tieId].tsx`:** both teams with crests and the tie score (sub-matches won); one row per sub-match: slot label, players each side, game scores, winner bright; status.
- **Cricket categories:** a "Player stats" link under the view opens the old `/cricket/leaderboard/[categoryId]`.
- **Empty (no matches yet):** account_tree icon, title and line by category status. setup/registration: "Draw after entries close", "The organiser draws the matches once entries close." auction: "Draw after the auction", "Matches appear once the auction is done." Drawn but nothing scheduled: "No matches yet".

### Announcements, `app/tournament/[id]/announcements.tsx` (rewritten)

The 2a pinned card, repeated for every announcement, newest pinned first. Pull to refresh. Empty: "No updates yet", "The organiser's updates show here."

## Routes

- **Kept and rewritten:** `tournament/[id]`, `tournament/[id]/announcements`, `category/[categoryId]`, `auction/[tournamentId]/[categoryId]`.
- **New:** `tournament/[id]/teams`, `tournament/[id]/matches`, `tournament/[id]/tie/[tieId]`.
- **Removed:** `checkout/[tournamentId]/[categoryId]`, `bracket/[tournamentId]/[categoryId]`, `team-league/[tournamentId]/[categoryId]`, `leaderboard/[categoryId]`, `team/[teamId]`. Remove their `Stack.Screen` entries in `app/_layout.tsx` and repoint every caller (grep first; known callers: `RegistrationCard` Pay now, `InvoiceCard` Retry).
- **Untouched (old UI):** `payment/[orderId]`, `cricket/*`, `live/*`, `player/[playerId]`.

## Deletions

Copy each file to `d:/kria/deleted-old-ui/pass8/` (outside `mobile/` so tsc, jest and metro ignore it) before deleting. First, move the earlier backups (`pass1`–`pass7` in the old session scratchpad) into `d:/kria/deleted-old-ui/` so they stop living in a temp folder.

Candidates, each confirmed by grepping for importers first:
- `components/tournament/*` (8), `components/auction/*` (10), `components/bracket/*` (4), `components/teamleague/*` (6), `components/cricket/LiveMatchCard.tsx`, `components/explore/Browse.tsx`, `components/TournamentCard.tsx`, `components/TournamentArt.tsx`.
- `lib/tournamentDetail.ts`, `lib/useCategoryExtras.ts`, `lib/drawRoute.ts` (fold the auction label map into the new view logic), `lib/checkoutView.ts`, `lib/auctionSpin.ts`, `lib/auctionView.ts`, `lib/bracketView.ts`, `lib/useTeamLeague.ts`, `lib/teamLeagueView.ts`, and their tests.
- **Keep:** `lib/useAuctionSocket.ts`, `components/checkout/RazorpayWebView.tsx` (move it beside the new 2b), `lib/paymentVerdict.ts` (payment screen), `api/*`.
- Remove deleted or rewritten files from `test-utils/colourLiterals.ts` `MIGRATED`, with a dated note.

## Tests

- View logic, one test file per lib: lifecycle (status line, CTA, tabs, category labels, format line), fee breakdown (₹600 → 12 / 12 / 4.32 / 628.32), entry rules (eligibility, open/closed, timeline steps per status), auction view (sub-line, pill, your result), bracket mapping (columns, feeder labels, byes, cricket scores, my next match), tables (league rows, team-league line).
- Screen tests in the style of the earlier passes: 2a (registration and ongoing), 2b (paid flow sends the profile on verify; verify failure shows the order id), 2c (not started, live), Matches (knockout and team league), Teams.
- Gates: `npx tsc --noEmit` clean, `npx jest` passing, the Android dev bundle builds with the worklet count intact (HANDOVER Verification).

## Left to the builder

- Component breakdown under `components/tournament/` (new files), view-lib names, and how the shared bracket is generalised.
- Skeleton shapes, exact spacing within DESIGN §4.3, and copy for minor states not named here, in DESIGN §11's voice.
- How the 2a tabs are laid out when only one or two apply.

## Calls made by Claude (not the user)

- Hybrid categories are labelled "League" because that's what the server plays (#12).
- No bookmark, share or organiser row (#14, #15). Full team names, truncated (#21).
- The fee breakdown is computed client-side with the server's formula until a quote route exists (#16).
- Skill level is required, with nothing preselected.
- Eligibility is checked in the app because the server doesn't (#17).
- Confetti and spin wheel are dropped from the auction.
- Badminton league "Pts" is rally points scored, labelled by the rule line, because the server has no league points (#12).
- Cricket stats, ball-by-ball and the payment status screen stay old until their own passes.
- Earlier deletion backups move into `d:/kria/deleted-old-ui/`.
- 2a follows an effective stage (live category auction or matches override the tournament status), because organisers skip status steps.
- A paid result is saved before verify and retried, and a second payment is blocked while one is unconfirmed, so a dropped verify can't lose an entry or charge twice.
- Champions are named for knockout categories only; leagues show their final table.
- Team leagues without a server table (cricket, badminton team mode) count P/W/L/D from completed matches, ranked by wins (#22).
- Squads list people, not entries.
