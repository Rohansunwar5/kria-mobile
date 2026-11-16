# Notifications (SERVER-GAPS #2 and #5): design

Date: 16 November 2026. Status: written after the user approved the preview (16 Nov). It covers the server and the player app; the organiser web client doesn't change.

## Why

Players miss the moments that need them: their match starting, an entry decision, being sold at auction, tournament news, being added to a quick match. Device tokens have been stored since before the redesign, but nothing on the server ever sent a push, and the app has no notification UI (SERVER-GAPS #2). #5 (tell a player a host added them to a quick match) needs the same machinery.

Success: a player gets a push on their phone for each of the five events, can see every notification in the app, and the Home bell shows when something is new.

## Goals

1. Five events create a notification for the players they concern (the user chose all five):
   1. Their entry is approved, or rejected (with the organiser's reason when given).
   2. They are sold at auction, or assigned to a team in it.
   3. Their tournament match is starting.
   4. A tournament they've entered posts an announcement.
   5. A host adds them to a quick match (#5).
2. Every notification is stored and listed in the app. A push is also sent to each of the player's phones.
3. The Home bell shows an orange dot while anything is new.
4. A one-time ask explains the notifications before the system permission dialog (onboarding mock 5h, list changed to these five events).

## Non-goals

- Per-event settings or a mute switch. The phone's own settings cover turning pushes off.
- iOS delivery. It needs an Apple Developer account; nothing in this design blocks adding it later.
- Notifications for quick knockouts, schedule changes, results, awards or anything outside the five events.
- Notifications on the web client.
- Delivery receipts (checking later whether a push actually arrived).

## Anti-goals (would make this a failure even if it works)

- A player receiving another player's notifications. A phone that changes hands must stop getting the previous player's pushes.
- An organiser's action failing or slowing down because a push failed or Expo is slow.
- Promotions or anything not about the player's own entries and matches (5h promises "No promotions").
- The app crashing or erroring in Expo Go, which can't receive pushes.

## What the user approved (preview, 16 Nov)

The preview's source is kept in the scratchpad (`notif-preview/project/*.dc.html`): `Main` (the list), `Bell`, `Empty` (nothing yet, pushes off), `Prompt` (5h) and `Push` (how pushes read). The approved behaviour:

- **Bell** (Home header, right of the greeting): 44px round button, `surface1`, Material Symbol `notifications` 22px wght 300. A 7px `accent` dot with a 2px `surface1` ring at top 11 / right 12 while anything is new. No count. Accessibility label "Notifications, N new" or "Notifications". Tapping opens the list.
- **Notifications screen** (pushed, `TopBar` "Notifications"): two sections, **New** and **Earlier** (Title 17/650). One row per notification, no card, 1px `line` divider, 14 vertical padding: a 40px `surface1` circle with the kind's icon (`text2`), then title (14/600), an optional detail line (13, `text2`, up to 2 lines), and a context line (12, `text3`) ending in the time ("2 min ago", "Yesterday", "Sat 14 Nov"). New rows end with a 7px `accent` dot (with "Unread" for screen readers). Tapping a row opens what it's about.
- **Opening the screen marks everything read.** The bell's dot clears. Rows that were new keep their dot and stay under New until the player leaves the screen.
- **Nothing yet**: outline `notifications` icon (wght 200, 48px, `text3`), "Nothing yet" (condensed 36/800), the line "Enter a tournament and you'll hear when your entry is decided, when you're sold at auction, when your match starts and when the organiser posts news.", and a secondary "Find an event" button that opens Events.
- **Pushes off**: while the phone hasn't granted permission, a `surface1` bar (radius 18) under the top bar: `notifications_off` icon, "Notifications are off on this phone. You'll still find them here.", and a "Turn on" pill. It shows over the list and over the empty state.
- **5h ask**: as the onboarding mock, with this list: "Your entry is decided" (Approved, or not, with the organiser's reason), "You're sold at auction" (Which team picked you, and for how much), "Your match is starting" (The round, who you're playing and the court), "Tournament news" (Announcements from events you've entered), "You're added to a quick match" (When a host puts you on a side). Primary "Turn on notifications", tertiary "Not now".
- Old notifications are deleted after 90 days.

## The notifications, exactly

Each notification has a kind, the text for the row and the push, and a target. `{…}` is a server value; text in brackets is left out when the value is missing.

| Kind | Icon | Title | Detail | Context | Opens |
|---|---|---|---|---|---|
| `entry_approved` | `how_to_reg` | Entry approved: {category} | none | {tournament} | `/category/{categoryId}?tournamentId={tournamentId}` |
| `entry_rejected` | `cancel` | Entry not accepted: {category} | Reason: {rejectionReason} (only when given) | {tournament} | same |
| `sold` | `gavel` | Sold to {team} for ₹{soldPrice}; or Assigned to {team} when the price is 0 or the player was placed without a sale | none | {category} · {tournament} | same |
| `match_starting` | `play_circle` | Your match is starting | {round label} vs {opponent}[ · Court {court}] | {category} · {tournament} | `/live/{matchId}` |
| `announcement` | `campaign` | {announcement title}, or the first line of the message when there is no title | {message}, clamped to 2 lines in the row | {tournament} · {authorName}, {role} | `/tournament/{tournamentId}/announcements` |
| `added_to_quick_match` | `group_add` | {host name} added you to {side 1} vs {side 2} | none | Quick match · {sport} | `/quick/{matchId}` |

- **Round label** is the label the app already uses on 3a/3b: "Quarter-final 2", "Final", "Group A". Build it on the server the same way (round name, plus the position when the round has more than one match). For a team-league sub-match, it's the slot label instead ("Men's Doubles 1 vs Asha & Bina"), not the app's "Team A vs Team B · Men's Doubles 1".
- **Opponent**: the other side's name as the match stores it ("Asha Rao", "Asha / Bina", "Rawnat United").
- **Quick match names**: a quick match has no name field, only side names. The preview's "Sunday doubles" was sample text, so the title uses the two side names.
- **Role** reads "organiser" or "staff", as the app's announcement meta line does.
- **Money** is formatted as the app formats rupees: whole amounts without decimals, Indian grouping (₹16,500).

### Push text

The approved `Push` board wins. Context parts are joined with ", " in a push (not " · " as in the row):

| Kind | Push title | Push body |
|---|---|---|
| `entry_approved` | Entry approved: {category} | {tournament} |
| `entry_rejected` | Entry not accepted: {category} | {tournament}[. Reason: {rejectionReason}] |
| `sold` | (the row's title) | {category}, {tournament} |
| `match_starting` | Your match is starting | {round label} vs {opponent}[ · Court {court}]. {category}, {tournament} |
| `announcement` | {tournament}: {announcement title} (or {tournament} when there is no title) | {message} |
| `added_to_quick_match` | (the row's title) | {Sport} quick match. It's in your matches. |

## Who gets each one, and when

1. **Entry decided**: when an organiser approves or rejects a registration (`POST /registrations/:id/approve` and `/reject`), the registration's player. A registration with no player account (bulk upload) is skipped. Bulk upload's pre-approved rows send nothing.
2. **Sold or assigned**: every way the auction puts a player on a team. Each sends to that registration's player:
   - a sale (`auctionService.sellPlayer`);
   - the pre-assigned players placed when the auction starts (`startAuction`, through `assignCarryOver`);
   - the leftover players spread across teams at price 0 (`distributeEvenly`).

   **Undo** (`undoLast`) deletes the stored notification for the sale it reverses, so the list never shows a sale that no longer stands. The push already sent can't be recalled. A later sale sends a new one. Moving a player between teams outside the auction sends nothing.
3. **Match starting**: once per match, the first time it goes live, never again (not on a reopen):
   - Badminton tournament match: when `startedAt` is first set (live start, or the first point).
   - Badminton team-league sub-match: when its live scoring first starts. Recipients come from the sub-match sides, whose `registrationId` is the lineup's comma-joined **player** ids (`teamLeague.service`, sub-match creation).
   - Cricket tournament match: when the **toss** is first recorded, the earliest moment the players are at the ground. Every player registered to either team in that category.
   - Recipients for a player side are the side's registration and its doubles partner (`partnerRegistrationId`, as `recordCategoryResults` resolves it). For a team side, every live registration on that team in the category.
   - Quick matches send nothing: the host and players are already together.
4. **Announcement**: when an announcement is created (`announcementService.create`), every player with a live entry in that tournament (not withdrawn, not rejected, active), once each. Editing or pinning an announcement sends nothing.
5. **Added to a quick match**: when a quick match is created (`quickMatchService.create`), every slot's `playerId` other than the host's. Joining by code sends nothing; the player did it themselves.

## Approaches considered

**Where notifications get created.**
- **A (chosen).** One notify step, called from the five places above. It stores one row per recipient, then sends the pushes in the background: the request that triggered it doesn't wait, and a failed push is logged and never fails the request.
- B. The five places emit events, and a notifications listener reacts. Looser coupling, but one more moving part for five callers.
- C. A job queue with retries (Redis-backed). A new dependency and a worker process, not worth it while pushes are best effort and the stored list is the record.

**How "new" is tracked.**
- **A (chosen).** One `notificationsSeenAt` time per player. Notifications created after it are new; opening the screen sets it to now. That is the approved behaviour, with no per-row writes.
- B. A read flag on each notification. Only needed if notifications were read one at a time, which isn't the approved behaviour.

The user said "whatever is the best" (16 Nov), so both picks are mine.

## How it's built (decided)

### Server

- **Model `Notification`**: `playerId`, `kind`, `title`, `detail?`, `context`, `target` (`{ path, params }`, what the app opens), `createdAt`. Index `{ playerId: 1, createdAt: -1 }`. A TTL index removes rows 90 days after `createdAt`.
- **Player**: new `notificationsSeenAt?: Date`. A player who has never opened the screen has every notification new.
- **The notify step** (`notificationService.notify(playerIds, notification)`): dedupes the ids, drops empty ones, inserts one row per player, then sends the pushes without awaiting them in the caller. Callers call it after their own write has succeeded, and a failure inside it is logged with `logger.error` and swallowed.
- **Sending**: Expo's push API, `POST https://exp.host/--/api/v2/push/send`, using the built-in `fetch` with no new package. `Authorization: Bearer ${EXPO_ACCESS_TOKEN}`. Messages go in batches of at most 100. Each message: `to` (an Expo token), `title`, `body`, `sound: 'default'`, `data: { notificationId, path, params }`.
  - When a ticket comes back with `details.error === 'DeviceNotRegistered'`, that token is removed from its player.
  - When `EXPO_ACCESS_TOKEN` is unset (local development), rows are stored and no push is sent; this is logged once. Tests never call Expo.
  - `EXPO_ACCESS_TOKEN` is added to the server config (`config/index.ts`). It is already set in the local `.env`, and needs setting on the live server.
- **Tokens**: the existing `POST /player/auth/fcm-token` and `DELETE /player/auth/fcm-token` (`{ token }`) carry Expo push tokens. The field stays `fcmTokens`.
  - **Change**: adding a token first removes it from every other player, so a phone gets only its current player's pushes (anti-goal 1).
  - **An expired session keeps its token.** Sessions expire after 7 days, and the app then clears the session itself without calling the server. The phone keeps getting that player's pushes, which is what its owner wants ("your match is starting" still arrives).
    - Logging out removes the token.
    - Someone else signing in on the phone moves it to them.
    - What's left: a phone handed over with nobody signing in shows the previous player's pushes. That's accepted, as in most apps; closing it would need an unauthenticated unregister route.
- **Routes** (new router, player login required):
  - `GET /player/notifications?before=<ISO>` returns the newest 30 before the cursor, newest first, plus the player's `seenAt`.
  - `GET /player/notifications/unread-count` returns `{ count }`: rows created after `seenAt`.
  - `POST /player/notifications/read` sets `notificationsSeenAt` to now.

### App

- **Push setup** (`expo-notifications`, already installed):
  - On Android, create the default notification channel before asking for a token.
  - When a player is signed in and permission is granted, get the Expo push token (`getExpoPushTokenAsync` with the EAS `projectId` from `app.json`) and save it with `POST /player/auth/fcm-token`.
  - On log out, remove it with `DELETE /player/auth/fcm-token` before the session is cleared.
  - Every call is wrapped so that Expo Go, where push tokens are unavailable, carries on without notifications (anti-goal 4).
- **Foreground**: a push that arrives while the app is open shows as a banner and refreshes the bell.
- **Tapping a push** opens its target, both when the app is running and when the tap launches it (`getLastNotificationResponseAsync`). Pushes that arrive before sign-in finishes wait for it.
- **Bell**: Home reads the unread count on focus, and again when a push arrives.
- **Notifications screen** (new route `/notifications`):
  - **Loading**: it fetches the first page (which carries `seenAt`), then posts `read`. Rows created after that `seenAt` are New.
  - **More**: "Load more" at the end pages with `before`, as Compete › Matches does (#4).
  - **Loading and errors**: skeleton rows while loading; on failure, `InlineError` with Retry.
  - **Pushes off**: the bar shows while permission isn't granted. **Turn on** asks again when the system still allows asking, and otherwise opens the phone's settings for Kria (`Linking.openSettings`).
- **5h ask**: shown once to any signed-in player whose permission is still undetermined and who hasn't tapped Not now. For a new player, it's the step after onboarding's last step (DESIGN §6 order). For an existing player, it appears when Home first opens.
  - Not now is remembered on the device and never asked again on its own.
  - Turn on notifications shows the system dialog, then continues.
- **`app.json`** already points at `google-services.json` and includes the `expo-notifications` plugin (16 Nov). The plugin also needs a monochrome notification `icon` and `color: "#FF5A1F"`.
- **New icons**: add each Material Symbol that isn't in the app's icon set yet to `scripts/icons.mjs` and regenerate.

## Constraints

- **Tests**: server routes are tested against the in-memory Mongo (`server/test/setup.ts`), and the Expo call is mocked. App tests use jest with `--maxWorkers=2`.
- **Gates**: all three repos' gates from the server-gaps handover. The web client doesn't change, but its tests still run.
- **The app is unpublished**, so response shapes can change together with the app.
- **Real data only**: every value in a notification comes from the server record named above.
- **Credentials, done 16 Nov:**
  - Firebase: Android app `club.kria.app` (project `kria-b849d`), with FCM V1 enabled.
  - EAS: the FCM V1 service-account key is uploaded and assigned to `club.kria.app`. The user's `eas credentials` output confirmed it.
  - `google-services.json` is in `mobile/`.
  - `EXPO_ACCESS_TOKEN`, for the robot "kria-server-push", is in `server/.env`. `eas whoami` confirmed it.
- **Testing a real push** needs an installed Android build (`eas build --profile preview --platform android`), because Expo Go can't receive pushes. The first such push also confirms two things only a real send can:
  - the account's "Enhanced security" setting is on;
  - the token's robot role (Runner) is allowed to send. If it isn't, raise it to Developer.

## Calls made after the builder check (16 Nov)

A reviewer read this document cold and asked six questions. All were settled without the user:

1. **Auction placements**: every way the auction puts a player on a team notifies them (sale, pre-assigned at start, even distribution), and undo deletes the stored row. "Sold to … at auction, and to which team" is about which team you're on, however you got there.
2. **Quick match name**: none exists, so "{side 1} vs {side 2}". No model change.
3. **FCM V1 credentials**: already uploaded and assigned (see Constraints).
4. **Push wording**: the approved board wins; the push table above spells out each one.
5. **Team-league sub-match detail**: the slot label, "Men's Doubles 1 vs Asha & Bina".
6. **Expired sessions** keep the phone's token; see Tokens.

## Left to the builder

- File layout and names on the server; follow the repo's route, controller, service and repository pattern.
- The notification icon asset. Check `assets/images/android-icon-monochrome.png` is white on transparent and suitable; otherwise make one from the Kria mark.
- Where exactly the 5h check runs on Home, and how "Not now" is stored (secure store or similar).
- Skeleton and "Load more" details, following existing screens.
- Whether a notification's detail line is stored as text or built on the server per kind, as long as the table above holds.

## Follow-ups (not in this work)

- iOS: an Apple Developer account, then APNs credentials through EAS.
- Delivery receipts, if pushes go missing in practice.
- Mark SERVER-GAPS #2 and #5 closed, with a Done block each, once shipped.
