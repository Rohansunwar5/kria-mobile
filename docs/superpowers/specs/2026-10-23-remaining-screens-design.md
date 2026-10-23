# Remaining screens, other players' profiles and the Awards pass: design

23 October 2026 · player app (`mobile/`) · part of the redesign to `mobile/DESIGN.md` v1.1

## Intent

Almost every screen a player sees is on the new design. This pass rebuilds the ones that are still old, so the old UI layer can start going away. It covers:
- the screens behind Profile (Settings, Edit profile, Change password, My entries, Payments, all Tournaments);
- All matches;
- the Join step that follows a code;
- the cricket player stats;
- other players' profiles;
- a set of Awards fixes found by comparing the Awards tab with `new-ui-designs/Kria Awards.dc.html` (8e).

None of these screens except Awards has a mock. The user approved a preview of them on 23 October 2026 and then deleted it. Its source is kept in `docs/superpowers/specs/2026-10-23-remaining-screens-preview/` (one `.dc.html` per screen). Build from that source and this document. Where the preview shows sample values, they are samples. Every value on screen comes from the server.

Onboarding and sign-in (`(auth)/*`, `(onboarding)/*`) are out of scope. The user has a separate design coming for them.

## Goals

- Every route listed under "Screens" renders on `constants/theme.ts` and `components/ui/*`, with no old theme, old icons or NativeWind.
- Another player's profile shows the same sections as your own Profile, without the parts that are only yours.
- The Awards tab matches 8e on values. Each of the 12 organiser honours gets its own icon.
- The light/dark Appearance setting is gone completely, along with the mode machinery behind it.
- The old components these screens used are deleted once nothing imports them.
- Four new server gaps are logged in `d:/kria/SERVER-GAPS.md`, #31–#34.

## Non-goals

- Onboarding, sign-in, sign-up, OTP and password reset.
- The launch animation (Motion 6a–6c).
- Any server change. Server gaps are logged, not fixed.
- Paging past the server's caps (50 recent matches, newest 20 knockouts).
- Removing NativeWind, the Anton/Barlow fonts or `lib/theme.ts` itself. The auth and onboarding screens still use them.

## Anti-goals

- Showing anything the server doesn't back: sample names or amounts from the preview, a payment status on an entry, failed or refunded payments, "other devices are signed out", a receipt promise from Razorpay.
- Losing a working action a player has today: withdrawing an entry, claiming a quick-match spot, joining a knockout (picking a team, or taking a place the host added).
- Promising a rank or stat the server can't produce.

## Constraints

- `mobile/DESIGN.md` v1.1 is the source of truth for structure. The approved preview fixes the layout of each new screen.
- Real server data only (see the handover, "Rules the user set"). Each element traces to `src/api/*`, then to a server route, then to a model field. The facts below were traced on 23 October 2026.
- New code imports only `constants/theme.ts`, `components/ui/*` and the new shared components. Never import `lib/theme`, `components/icons`, `components/canvas`, `components/states` or `components/Screen` in new code.
- Icons come from `scripts/icons.mjs`: add a name there and regenerate `src/components/ui/iconPaths.ts`.
- No new dependencies.
- Implementer subagents don't run git. Only the controller commits, and only after the user asks.
- After adding or removing a file under `src/app`, regenerate the typed routes (`npx expo start` until `.expo/types/router.d.ts` changes) before `tsc`.

## Shared rules for every screen here

- **Header:** `TopBar` from `components/ui/Bars`. Back goes to the previous screen, with a sensible fallback when there's no history. Screens with a sub-line (All matches for another player, Cricket stats) use TopBar's left-aligned title and sub.
- **Layout:**
  - 20px gutter, 44px between sections, 18px from a section header to its content.
  - Section headers are 17/650.
  - Rows have a 1px `line` divider and a 56px minimum height.
  - Footer buttons sit in `FooterBar`.
- **Fields:**
  - 52px tall, radius 14, `surface1` fill, 1px `surface3` border.
  - The label above is 13/600 in `text2`.
  - The focused field gets an `accent` border.
  - A read-only field has no fill, a `surface2` border and `text3` text.
- **Chips:** 8×14 padding, pill radius. Selected is a `text` fill with `bg` text; idle is `surface1` with `text2`. Compete › Matches already draws chips this way, so match it.
- **States:** a `Skeleton` while loading; `InlineError` with Retry on failure; DESIGN §8 empty states (outline icon, condensed title, one line, one action).
- **Sheets:** `BottomSheet`.
- **Money:** `rupees()` from `lib/format.ts`, two decimals where the preview shows them.
- **Dates:** short day and month in lists ("14 Oct"), plus the time in detail ("14 Oct 2026, 18:42"). Use the existing date helpers where they fit.

## Screens

### Settings: `app/profile/settings.tsx` (rewritten)

The preview's "Settings" board.
- **Account:**
  - "Signed in as" with the user's email (`auth.user.email`).
  - A "Change password" row that opens Change password. It has no sub-line.
- **Get help:**
  - The sub-line reads "Tell us what went wrong. We reply to <email>."
  - A message field ("What happened, and where in the app?") and the helper "At least 10 characters".
  - A secondary "Send message" button, disabled while busy or empty. Under 10 characters it shows "Tell us a little more so we can help."
  - On success the field clears and the screen says "Sent. We'll reply by email." On failure it shows the server's message.
- **Fix the payload.** `POST /contact` (`contactlead.validator.ts`) requires `fullName`, `email`, `subject`, `message` and `iss`. `isdCode` and `phoneNumber` are optional. Today's `sendContactMessage` sends `name/email/phone/message`, so every send returns 422.
  - Change `api/settings.ts` `sendContactMessage` to send:
    - `fullName`: the first and last name.
    - `email`.
    - `subject: 'Help from the player app'`.
    - `message`.
    - `iss: 'Kria player app'`. The email template labels it "Issuer - Site".
    - `phoneNumber` when the user has one.
- **Removed:**
  - The notifications switch, because nothing on the server sends push (gap #2).
  - The Appearance section (see Deletions).
  - The "Not signed in" block: the screen sits behind login.

### Change password: `app/profile/change-password.tsx` (rewritten)

The preview's "Change password" board, without its intro line. The intro said other devices are signed out, and the server doesn't do that (new gap #33).
- **Fields:**
  - Current password, New password and Confirm new password.
  - Each password field has a show/hide icon button (`visibility` / `visibility_off`, 44×44, with an accessibility label).
- **Strength:** a four-segment bar under New password, from `passwordScore`, plus a word.
  - Score 0–1: "Too weak".
  - 2: "Fair".
  - 3: "Strong".
  - 4: "Very strong".
  - Filled segments are `accent`; empty ones are `lineStrong`.
- **Rules:** from `passwordRules`, one line each.
  - A met rule shows a filled `check_circle` in `accent`, with the text in `text2`.
  - An unmet rule shows `radio_button_unchecked` in `text4`, with the text in `text3`.
- **Confirm:** while Confirm is non-empty and different, show "Doesn't match the new password" in `error` with the `error` icon.
- **Footer:** "Update password", enabled once the current password is filled, all rules are met and Confirm matches. It calls `api/settings.ts` `changePassword`.
  - On success the fields clear and the screen says "Password changed."
  - On failure it shows the server's message.
- **A wrong current password must not sign the player out.**
  - The server answers a wrong current password with a 401 whose body always says "Unauthorized" (`errors/unauthorized.error.ts`; new gap #34).
  - Today `api/axios.ts` treats every 401 as an expired session, runs `clearAuth()` and logs the player out.
  - Exempt the change-password request (match on `error.config.url`) from that handling. On that request's 401, the screen shows "Current password is incorrect."
  - Every other request keeps today's 401 behaviour. Add an interceptor test for both cases.
- **Code move:** move `passwordRules` and `passwordScore` from `components/auth/PasswordRules.tsx` to `lib/password.ts`. The old component imports them from there, because the auth screens still use it.

### Edit profile: `app/profile/edit.tsx` (rewritten)

The preview's "Edit profile" board.
- **Photo:**
  - An 80px circle with the photo or initials, and a camera badge.
  - Tapping it runs `usePhotoUpload().pick`, the same upload as Profile. While busy, the badge shows an `Arc`.
  - Beside it: "Profile photo" and "Optional. Organisers and teammates see it."
- **Name and phone:** First name and Last name side by side, then Phone (`phone-pad`).
- **Email:** read-only, with a `lock` icon. Under it: "You sign in with this. Only you see it."
- **Gender:** Male / Female, equal width. The server accepts only these two (`auth.validator.ts`).
  - Use `Segmented`. If it can't fill the width, add a `fill` option and don't make a new control.
- **Date of birth:** opens the platform date picker.
  - Rewrite `components/profile/DobField.tsx` in the new look. Profile edit is its only importer.
  - Keep its local-day ISO conversion and its tests' behaviour.
  - Empty, it reads "Add date" in `text4`.
- **City:** a text field.
- **Main sport:** single-choice chips for `EVENT_SPORTS` (Badminton, Cricket), each with its sport icon. Tapping the selected chip clears it. Under it: "Events and Home open on this sport."
- **Clearing sport or city:** when the player had a value and clears it, send an empty string (`sport: ''`, `location: ''`) so the server clears it. Its validators accept that (`optional().isString()`), and the model trims. Leaving the field out would keep the old value.
- **Footer:** an info line, then "Save" (primary).
  - The info line reads "Add your date of birth and gender to enter tournaments." It names only what's missing (date of birth, gender or both), following `checklist().ready`. When both are present it reads "Your profile is ready for tournaments."
  - First name, last name and phone are required. Missing ones show "First name, last name and phone are required."
  - Blank gender and date of birth are left out of the request, as today, because the server rejects empty strings for them. Sport and city follow the clearing rule above.
  - Save dispatches `updateProfile`. On success it goes back; on failure it shows the slice's error in the footer.

### My entries: `app/profile/registrations.tsx` (rewritten)

The preview's "My entries" board.
- **Data:**
  - `getMyEntries()`, which is `GET /registrations/my-registrations`. It returns bare entries: no tournament name, no category name, no payment status (new gap #31).
  - For each distinct `tournamentId`, also fetch `getTournament(id)` and `getTournamentCategories(id)` in parallel, to get the tournament name and the category name and sport.
  - A failed lookup never blocks the list. That row shows "Tournament" and no category.
- **Groups:**
  - Active: pending, approved, auctioned or assigned entries whose tournament isn't completed or cancelled.
  - Closed: rejected and withdrawn entries, plus any entry whose tournament is completed or cancelled. For the latter, the status line reads "Tournament completed" or "Tournament cancelled" in `text3`.
  - An entry whose tournament lookup failed is grouped by its own status alone.
  - Newest first within each, by `createdAt`. The section meta reads "N entries".
- **Row:**
  - A 36px circle with the sport icon, the tournament name and "<category> · <sport>".
  - A status line:
    - Pending: "Awaiting approval" in `text2`.
    - Approved: "Approved" in `text`.
    - Auctioned or assigned: "Drafted", plus " · sold ₹N" when `auctionData.soldPrice`, in `accentInk`.
    - Rejected: "Not accepted by the organiser" in `lossInk`.
    - Withdrawn: "Withdrawn" in `text4`.
  - Closed rows use `surface1` circles and `text2` names.
  - Tapping a row opens 2b (`/category/[categoryId]` with `tournamentId`).
- **Withdraw:**
  - A small secondary button on pending and approved rows in the Active group only. The server refuses auctioned and assigned entries. It would allow withdrawing from a finished tournament, but that would drop the entry from the player's history.
  - It opens a confirmation `BottomSheet`:
    - Title: "Withdraw from <tournament>?"
    - Line: "The organiser sees that you withdrew. You can't enter this category again." The server keeps a withdrawn entry and refuses a new one for the same category.
    - Buttons: "Withdraw" and "Keep my entry".
  - It calls `POST /registrations/:id/withdraw`. Add `withdrawEntry(id)` to `api/tournaments.ts`.
  - On success, reload. On failure, show the server's message in the sheet.
- **Removed:** the "unpaid" count, payment tags and "Pay now". The server never sends a payment status on an entry, so they never showed.
- **Empty:** "No entries yet", "Enter a tournament category and it shows here.", and "Find an event", which opens the Events tab.

### Payments: `app/profile/invoices.tsx` (rewritten), with a detail sheet

The preview's "Payments" and "Payment detail (sheet)" boards. The `payment/[orderId]` route is deleted.
- **Data:**
  - `getMyPayments()`, which is `GET /payments/my-payments`. It returns paid payments only (`payment.repository.ts` `getByPlayer`), each enriched with `tournament` and `category` (new gap #32).
  - Add `razorpayPaymentId?` and `updatedAt` to the `Invoice` type. The server sends the whole document.
- **Hero:**
  - "Total paid", the sum of `amount` in display type, and "N entry fees".
- **List:** a "Paid entries" section, one row per payment, newest first.
  - Each row has a `receipt_long` circle, the tournament name, "<category> · <date>", the amount and a chevron.
  - The date is `updatedAt`, the moment it became paid. Only paid payments are listed, so nothing changes them afterwards. Fall back to `createdAt`.
- **Detail sheet:** tapping a row opens it, built from the row's own data with no extra fetch.
  - A filled `check_circle` in `accent` and "Paid · 14 Oct 2026, 18:42".
  - The tournament name (display 30) and "<category> · <sport>".
  - The fee breakdown, using the same labels as 2b's entry form:
    - Entry fee: `baseAmount`.
    - Payment gateway (2%): `feeBreakdown.razorpayFee`.
    - Platform fee (2%): `feeBreakdown.platformFee`.
    - GST (18% on fees): `feeBreakdown.gst`.
    - Total: `amount`.
    - Rows with missing data are left out.
  - The order id and payment id in JetBrains Mono, each with a copy button (`expo-clipboard`, as `CopyButton` does).
  - "Get help" opens `mailto:support@kria.club?subject=Payment <orderId>`. "Done" closes the sheet.
- **Removed:**
  - The All, Paid, Failed and Refunds filters, the failed and pending looks, and Retry. The server never lists those payments.
  - The receipt line. Whether Razorpay emails a receipt depends on dashboard settings nobody here has checked.
- **Empty:** "No payments yet", "Entry fees you pay show up here.", and "Find an event".

### Tournaments (all): `app/profile/history.tsx` (rewritten)

The preview's "Tournaments (all)" board. It's reached from Profile › Tournaments › All.
- **Data:** `tournamentHistory` from `fetchPlayerTournamentHistory`, as on Profile. The server leaves out withdrawn and rejected entries, and `category` is null for categories in the sport collections (gap #19).
- **Strip:** Entered (number of entries), Matches (sum of `stats.matchesPlayed`) and Won (sum of `stats.matchesWon`).
- **Sport chips:** shown when the entries cover more than one sport. "All" plus each sport, labelled with `sportName`.
- **Year groups:** newest first, by `tournament.startDate`, falling back to `createdAt`.
- **Row:** Profile's tournament row (`lib/profileView.ts` `tournamentRow`), plus a third line:
  - "N played · M won" when `stats.matchesPlayed` > 0.
  - Otherwise "Not played yet".
- **Tap:** opens the tournament.
- **Removed:** "Earned", the sum of auction sale prices. It isn't money the player received.
- **Empty:** "No tournaments yet" and "Find an event".

### All matches: `app/matches/[playerId].tsx` (rewritten)

The preview's "All matches" board.
- **Data:** `getRecentMatches(playerId, 50)`. 50 is the server's cap.
- **Title:** "All matches". For another player, pass a `name` param and show it as TopBar's sub-line. Home and Profile pass nothing.
- **Sport chips:** "All" plus each sport present in the list.
- **Month groups:** newest first, by `playedAt`.
- **Row:** the same as Profile's recent rows (`ResultBadge`, title, scoreline, context and date). Not tappable, as on Profile. Lift the row into a shared component and don't copy it.
- **Cap note:** with exactly 50 rows, a caption under the list reads "Showing the 50 most recent matches."
- **Empty and error:** "No matches yet". An error shows `InlineError` with Retry.

### Join with a code: `app/quick/join.tsx` (rewritten)

The preview's "Join a match: pick your spot" and "Join a knockout" boards.
- **Entry:**
  - Compete › Matches already resolves the code and opens this screen with `?code=`. There's no code field any more.
  - The screen looks the code up once on mount (`resolveQuickCode`).
  - With no code param, it replaces itself with `/(tabs)/compete?seg=matches`. The back fallback is the same route; the old one was `/quick`.
- **Header:**
  - A small line: "Quick match · <sport>" or "Knockout · <sport>".
  - The title in display 34.
  - A format line from the existing label helpers:
    - A match uses `lib/quickMatchView.ts` `formatLabel`, or whatever newer helper `lib/matchCard.ts` offers.
    - A knockout uses `lib/quickKnockoutView.ts` `formatLabel` plus `playersPerTeam` for cricket, then "hosted by <host's display name>".
  - A quick match also shows its code in a mono chip. A knockout shows "N players in so far".
- **Quick match:**
  - A "Pick your spot" section with "Take the spot the host made for you, or any open one."
  - One group per side, named by the side, with one row per slot:
    - Taken: a muted row with initials, the name and "Taken".
    - Open: an `add` avatar, the slot's display name and "Open" in `accentInk`.
  - Tapping an open row selects it: an `accent` ring, and a `check` avatar.
  - The footer "Take this spot" is enabled once a spot is selected. It calls `claimQuickMatchSlot(code, slotId)`, then replaces the route with `/quick/[id]`.
  - On failure, look the code up again and show the server's message above the footer. The match may have finished, you may already be in it, or someone may have taken the spot.
  - With every slot taken: "Every spot is taken. Ask the host to add you." and no button.
  - If you're already in one of the slots: "You're in this match" and "Open".
  - The old screen claimed on the first tap. Select-then-confirm is deliberate.
- **Knockout:**
  - If you're already a player: "You're in" and "Open".
  - If it isn't waiting: the closed message and no actions.
    - Live: "This knockout has already started."
    - Completed: "This knockout has finished."
    - Cancelled: "This knockout was cancelled."
  - Otherwise:
    - **Cricket only:** "Pick your team" with "Or leave it to the draw." One selectable row per team, with "n/playersPerTeam", or "Full" (disabled and muted) when full. Then "Any team · The draw places you", which is the default.
    - "Already added by the host?" with "Tap your name to take that place." One chip per player with no `playerId`. A chip calls `claimKnockoutGuest(code, playerKey)`.
    - The footer "Join as <your name>" calls `joinQuickKnockout(code, teamId?)`.
    - Both then replace the route with `/knockout/[id]`. A failure shows the server's message.

### Cricket player stats: `app/cricket/leaderboard/[categoryId].tsx` (rewritten), with a stats sheet

The preview's "Cricket player stats" and "… (sheet)" boards. The `cricket/my-stats/[registrationId]` route is deleted. Every leaderboard row already carries the full stats object, so any row opens the sheet.
- **Header:**
  - TopBar title "Player stats". The sub-line is "<tournament> · <category>", from `tournamentName` and `categoryName` params.
  - `tournament/[id]/matches.tsx` passes them; it has both in hand.
  - Don't read the old redux `currentTournament`, because the new tournament screens don't fill it.
- **Sort chips:** one per `SORTS` entry, labelled by `SORT_LABELS`, in a horizontal scroll. Changing the sort refetches (`getCricketLeaderboard(categoryId, sort)`).
- **Leader card:** the first row, on a `surface1` card with radius 24.
  - On the left: the headline (for example "Most runs") in `accentInk` 12/600, the name in display 28, and "<team> · HS n" when the player has a highest score.
  - On the right: the value in display 56 with the unit under it in lower case (runs, wkts, SR, econ, 4s, 6s, high).
  - It uses `lib/cricketSort.ts` `sortMetric`.
- **Table:**
  - Header and rows from `sortColumns`, laid out as `#`, player (name and team), then the three columns.
  - Ranks 1–3 are drawn in gold, silver and bronze; the rest in `text3`.
  - Rows whose `registrationId` is one of your entries (`getMyEntries()`) get an `accentTint` background with `accentInk` text (DESIGN §5.7).
  - Tapping any row or the leader card opens the sheet.
- **Real counts:** widen `CricketPlayerStats` with `batting.matches`, `batting.innings`, `bowling.matches` and `bowling.innings`. The server stores them (`sports/cricket/models/playerStats.model.ts`).
  - The table's "Inn" column reads `batting.innings`. Today it falls back to `outs`, which counts dismissals.
  - Remove the top-level `matches` and `bowling.maidens` from the type. The server has neither.
- **Sheet:**
  - The name in display 30, and "<team> · N matches", where N is the larger of `batting.matches` and `bowling.matches`.
  - **Batting:** Runs, Balls, Average, Strike rate, Highest, Fours, Sixes.
  - **Bowling:** Overs, Wickets, Runs, Economy, Best. There's no Maidens cell: the server never records maidens.
  - **Fielding:** Catches, Run outs, Stumpings.
  - Values come from `batting`, `bowling`, `fielding` and `computed`, laid out as a four-column grid. A missing value or null shows "—" in `text4`.
  - "Done" closes the sheet.
- **Empty and error:**
  - Empty: "Nothing recorded yet" and "Stats fill in as matches are scored."
  - Error: `InlineError` with Retry.

### Other players' profiles: `app/player/[playerId].tsx` (rewritten)

No preview, by agreement: it's your own Profile's sections without the parts that are only yours.
- **Shared sections:** split the Profile tab into shared pieces under `components/profile/`, used by both the tab and this screen. Names are left to the builder.
  - The identity block: photo, name, best-rank chip and honours row.
  - The stat strip.
  - Analytics: the rings, plus the per-sport detail with results bar, form, ranking card and recent rows.
  - The tournament rows.
- **The Profile tab keeps:** Settings, photo upload, Edit profile, the checklist, Account and the new-player state. Its behaviour doesn't change.
- **Data for another player:**
  - `getPublicPlayer(playerId)` gives the player, titles, honours and history.
  - `useCareer(playerId)` and `getRecentMatches(playerId, 50)` give the record.
  - `getTopPlayers(sport, 50)` for each of their rankable sports gives the best rank and the rank cards, using their id where the tab uses yours.
  - Widen `PublicHistoryEntry.tournament` to what the server sends (`startDate`, `endDate`, `status`, `venue`, `bannerImage`) so `tournamentRow` can read the status.
- **Differences from your own Profile:**
  - **Header:** a TopBar with back and no title. No settings gear.
  - **Identity:** the photo isn't tappable and there's no Edit profile. Tapping an honour badge opens `AwardSheet` in place, because the Awards tab is only yours.
  - **"+N more":** opens a `BottomSheet` titled "Honours and titles" with every honour, knockout win and title as an 88px badge grid, built from the Awards tab's grid. Tapping a badge switches the sheet to that badge's `AwardSheet` detail. Career milestones are left out; the Analytics section already shows that record.
  - **Strip:** Matches, Wins, Tournaments. Tournaments is the number of public history entries.
  - **Honours:** knockout honours group by sport only when the viewer's own `/quick-knockout/mine` lists that knockout. Otherwise they fall under "Quick knockouts", as the known limit already says.
  - **Analytics:** for a player with no matches, show "No matches on record yet." in place of the rings.
  - **All matches:** the link opens `/matches/[playerId]` with their name.
  - **Tournaments:** every history row, with no "All" link. Public history isn't paged and is short. Tapping a row opens the tournament.
  - **Not shown:** no checklist and no Account.
- **Your own id:** `router.replace('/(tabs)/profile')`.
- **Missing player:** "Player not found", "This profile isn't available.", and Back.

## Awards changes (mock 8e; no preview needed)

- **Featured badge** (`app/(tabs)/awards.tsx`):
  - A centred column on a radial glow: inner colour `metals[metal].enamel[0]`, outer `#121214`, centred at 50% / 32%. Use react-native-svg `RadialGradient`. Radius 28, padding 26/20/24.
  - The badge is 176px with the shine.
  - The label is in JetBrains Mono 600 10.5px, letter-spacing 0.08em, upper case, coloured `metals[metal].light`. A locked badge uses `text3`.
  - Under it, the name in display 30 and the context in 13 `text3`.
- **Featured order:** the latest title (the last one the server appended), then the latest organiser honour, then the latest knockout win, then the closest milestone. Labels:
  - "Latest title".
  - "Latest honour".
  - "Knockout winner".
  - "Next milestone", or "Closest first award" for a player with nothing earned.
- **Titles** (`lib/awardsView.ts` `titleAward`):
  - The server writes "Winner of <category> at <tournament>". The name becomes "Champion · <category>" and the context is the tournament.
  - The ribbon reads "CHAMPION" everywhere: tab, sheet and Profile.
  - Text that doesn't match the pattern shows as it is.
- **Honour icons:** each organiser badge key gets an icon in `HONOUR_BADGES`:

  | Badge key | Icon |
  |---|---|
  | `player-of-the-match` | `star` |
  | `season-mvp` | `workspace_premium` |
  | `hat-trick` | `counter_3` |
  | `undefeated-run` | `local_fire_department` |
  | `auction-steal` | `gavel` |
  | `centurion` | glyph "100" (no icon) |
  | `clean-sweep` | `cleaning_services` |
  | `rally-king` | `crown` |
  | `ace-serve` | `bolt` |
  | `fair-play` | `handshake` |
  | `iron-player` | `fitness_center` |
  | `first-cap` | `counter_1` |

  - The monogram stays only as the fallback for an unknown key.
  - Add each icon to `scripts/icons.mjs` with the `f` variant, because badge glyphs are filled. Keep the existing `o` variant of `workspace_premium` and `gavel`.
  - `lockedHonours()` uses the same icons.
- **Sizes:** honours grid 88. Milestones grid 72, with 14px side padding and a 6px column gap. Detail sheet badge 176, with the shine.
- **Detail sheet** (`components/awards/AwardSheet.tsx`):
  - Drop the progress bar. The badge's ring already shows progress.
  - A knockout's tier reads "Quick knockout · ×N" when N > 1, and its status label is "Earned at".
- **An earned milestone's "Progress" value** is the real count, not the clamped one:
  - "N played", "N won" or "N sports played", from the career totals (`allSports(played)` in `lib/profileView.ts`).
  - `buildAwards` takes those totals.
  - The server clamps `progress` to `target` (`careerStats.service.ts` `deriveAchievements`).
  - Locked milestones keep "n of target".
- **Kept as built:** silver for every earned milestone (DESIGN §4.1), and the Titles list under the grids. 8e has no place for a second title.

## Deletions

- **Routes:**
  - `app/quick/index.tsx` and `app/knockout/index.tsx`: nothing links to them, and Compete › Matches lists matches and knockouts.
  - `app/payment/[orderId].tsx`: replaced by the Payments sheet.
  - `app/cricket/my-stats/[registrationId].tsx`: replaced by the stats sheet.
- **Appearance:**
  - Delete `components/settings/AppearanceSection.tsx`, `THEME_MODE_KEY` and its storage, `useThemeMode`, `ThemeMode`, `ThemeProvider`, and the `light` palette.
  - `useTheme()` returns the dark palette directly. Remove the provider from `app/_layout.tsx`. The old screens that call `useTheme()` keep working.
  - Delete the colour-literal fence (`test-utils/colourLiterals.ts`, `__tests__/colourLiterals.test.ts`). It existed to make light mode safe, and light mode is gone.
- **Push:** delete `lib/pushToken.ts` and `registerFcmToken` / `unregisterFcmToken` in `api/settings.ts`, whose only importer was Settings. Keep the `expo-notifications` package: push comes back with gap #2.
- **Old components:** once the screens are rebuilt, delete every module under `src/` that nothing imports any more (tests aside), together with its tests. Expected at least:
  - `components/profile/{PlayerCard, SportCards, TrophyCabinet, ProfileHistory, Badge, RecentMatches, HistoryCard, RegistrationCard, InvoiceCard, GenderSegment}`.
  - The `AvatarPicker` component, but keep `usePhotoUpload`.
  - `components/settings/*`.
  - `lib/paymentVerdict.ts`.
  - The registration slice's `myRegistrations`, `fetchMyRegistrations` and `withdrawRegistration`, if nothing else uses them.

  Grep every importer first, list what was deleted, and leave anything the auth or onboarding screens still use.

## Tests

Follow the earlier passes:
- **Logic:** unit tests for every new or changed piece of view logic. That covers:
  - entry grouping and status lines;
  - payment totals and the fee rows;
  - history strip and grouping;
  - month grouping for All matches;
  - join states (taken, open, selected, all taken, already in, closed, cricket team full);
  - the cricket sheet values with "—";
  - the Awards changes (title parsing, featured order, honour icons, milestone status text);
  - `lib/password.ts`;
  - the contact payload.
- **Screens:** a screen test for each rewritten route, covering the loaded state and the main action:
  - Withdraw confirms, then posts.
  - Payments opens the sheet.
  - Join claims and replaces the route.
  - Settings sends the right payload.
  - Change password enables only when valid.
  - Edit saves.
  - The player profile hides your own controls.
- **Housekeeping:** remove or rewrite the tests of deleted files. At the end, `tsc` is clean and the whole jest suite passes.

## Server gaps to log (new, #31–#34)

Each entry uses `SERVER-GAPS.md`'s format: shows on, today, suggested, app follow-up.

31. **My entries has no names or payment state.**
    - **Today:** `GET /registrations/my-registrations` returns raw registrations (`tournamentRegistration.repository.ts` `getByPlayer`).
    - **Suggested:** add the tournament name and sport, the category name, and the entry's payment status.
    - **App follow-up:** drop the per-tournament lookups, and show what's owed.
32. **Payments lists only paid payments.**
    - **Today:** `GET /payments/my-payments` filters `status: paid` (`payment.repository.ts:44`), so a failed or pending payment is invisible to the player.
    - **Suggested:** return every status.
    - **App follow-up:** status looks and Retry, as the old screen had.
33. **Changing the password doesn't sign out other devices, and the server doesn't check the new password's strength.**
    - **Today:** `changePassword` only updates the hash (`playerAuth.service.ts:226`), and the validator only requires `newPassword`.
    - **Suggested:** revoke the other sessions' refresh tokens, and enforce the app's rules (8+ characters, a number, a symbol).
    - **App follow-up:** say that other devices are signed out.
34. **A wrong current password comes back as a bare 401.**
    - **Today:** `changePassword` throws `UnauthorizedError('Current password is incorrect.')`, but `UnauthorizedError.serializeErrors` always sends "Unauthorized". The app has to special-case the route so a typo doesn't log the player out.
    - **Suggested:** answer with a 400 (or a 403) carrying "Current password is incorrect."
    - **App follow-up:** drop the interceptor exemption and show the server's message.

## Left to the builder

- Component and helper names, and how the Profile tab is split, as long as both screens share the pieces.
- Exact skeleton shapes.
- Whether the All matches row moves to `components/` or stays beside Profile's pieces.
- The order of the work, apart from deletions coming after the rebuilds.

## Calls made by Claude (not the user)

The user approved the preview. These are decisions taken in it or while writing this document:

- **My entries:**
  - Names come from per-tournament lookups.
  - Payment labels and "Pay now" are dropped.
  - Active and Closed groups.
- **Payments:**
  - Detail is a sheet, and the payment route goes.
  - Filters, Retry and the receipt line are dropped.
  - `updatedAt` is the paid time.
- **Tournaments (all):** "Earned" is dropped.
- **Join:**
  - No code field.
  - Select, then "Take this spot".
- **Cricket:**
  - One leaderboard plus a sheet for any row.
  - The my-stats route goes.
  - Your rows are tinted.
- **Settings:**
  - The contact payload is fixed (`subject` and `iss` values are mine).
  - "Other devices are signed out" is dropped wherever it appeared.
- **Other players' profiles:**
  - All tournament rows, no All link.
  - Honours open the sheet in place.
- **Awards:**
  - The featured glow uses the metal's enamel colour.
  - The featured labels for non-title badges.
  - The honour icon choices.
- **Appearance:** dropping it removes the colour-literal fence too.
- **Settled from the builder check:**
  - A wrong current password no longer signs the player out.
  - Clearing sport or city really clears it.
  - Entries in finished or cancelled tournaments move to Closed without Withdraw.
  - The cricket sheet has no Maidens, and it shows real match and innings counts.
  - "+N more" on another player's profile opens an honours-and-titles sheet.
