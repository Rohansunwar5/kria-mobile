# Quick play invites: accept before it counts

25 November 2026. Covers the server (`D:\kria\server`) and the player app (`D:\kria\mobile`). The web has no quick matches or knockouts.

## Why

A host can put any Kria player into a quick knockout or a quick match by searching for them, with no consent. LAUNCH-AUDIT section 5 (Server, "Quick knockout") flags the worst case: a host adds three accounts, which makes the knockout "awards eligible" (4+ Kria players), wins it, and collects a Champion honour. It also lets anyone put wins and losses on a stranger's career record, because quick matches feed career stats.

The fix: a player added by search is **invited**, and nothing reaches their account (honours, career stats, award eligibility) until they tap Accept.

## Goals

- A host-added Kria player counts as that player only after they accept.
- Covers both quick knockouts and plain quick matches.
- Joining with the code, claiming a guest name, and the host adding themselves ("Add me") stay as they are. Those already mean the player chose to be there.

## Non-goals

- The web client (no quick play there).
- Tournaments (organiser entries are a separate flow).
- Invite expiry, invite limits, or blocking a host.
- Re-inviting into a quick match. A knockout host can invite again through Add player. A quick match has no way to add a Kria player after it's created today, and that stays as it is.
- Taking back an invite notification, or telling the host when someone accepts or declines.
- Changing how claim-by-code works for ordinary guest names.

## Anti-goals (a failure even if it technically works)

- Any path that links someone's account to a result or honour without their own tap.
- Someone other than the invited player taking an invited spot (by code, by claim, or by a race).
- Making a plain quick match wait before it can start.

## Constraints

- The app is unpublished, so there's no old-app compatibility to keep. Server and app deploy together.
- No data migrations or backfills; existing quick matches and knockouts are test data.
- Accepting into a quick match must be one conditional write, like `claimSlot` (LAUNCH-AUDIT M16), so two writes can't both land on one slot.

## Approaches considered

1. **A placeholder that remembers who was invited (chosen).** The knockout player row, or the quick-match slot, gets an `invitedPlayerId` and no `playerId` until accept. Everything that counts accounts already reads only `playerId` (honours, `awardsEligible`, career participation, the join-code insider check, duplicate checks), so a pending invite is left out by default. Accept reuses the claim logic.
2. **Linked, but flagged "pending".** Keeps `playerId` set and adds a flag. Every reader of `playerId` would have to learn to skip pending rows; one missed reader reopens the hole.
3. **A separate invites collection.** Easy to list pending invites, but more moving parts, and the roster still needs a placeholder.

Chosen: 1, by the user. Smallest change, and safe even when a reader is overlooked.

## Decided by the user

- **Knockouts: Start waits (rule B).** While any invite is pending, Start is refused. The host can wait, remove the player, or play them as a guest.
- **Both features** get invites.
- **Approach 1.**

## Calls I made (check these)

- **Quick matches don't wait.** An invite can be accepted any time a code claim is allowed today: status `waiting` or `live`, and not `hasBeenCompleted`. So "Start now" still works. Slots still pending at completion get no participation row, because they have no `playerId`. Why: a quick match already lets players claim a name mid-match and writes stats only at the end. A knockout fixes its bracket, its matches' slots and its honours at Start, so it has to wait.
- **Decline removes them by name.** In a knockout, the row is removed, exactly like the host's Remove. In a quick match, the slot becomes a plain placeholder named `Player N` (N = the slot's 1-based position in its side, the app's existing convention in `mobile/src/lib/hostMatch.ts` `buildBody`). Why: someone who declines shouldn't have their real name left in a stranger's bracket or match.
- **"Play as guest"** (host action on a pending invite) clears `invitedPlayerId` and keeps the name. The row or slot is then an ordinary guest, claimable with the code like any host-typed name.
- **Joining with the code while invited means accept.** If an invited player joins the knockout by code, or claims their own invited quick-match slot by code, that accepts the invite: no duplicate row. Claiming a *different* guest name or slot while invited is refused ("You're invited to this one. Accept the invite instead.").
- **Invites show in the invitee's lists.** `GET /quick-knockout/mine` and `GET /quick-match/mine` include knockouts and matches where they hold a pending invite, so someone with push turned off can still find it. Each needs an index on the new field.
- **Notifications:** a new kind `knockout_invite` for knockouts. The quick-match one keeps its kind `added_to_quick_match`, with new copy that says it's an invite. Both push and in-app, through the existing `notificationService.deliver`.
- **An invite that can no longer be accepted keeps the name until the invitee removes it.** This covers a quick match that finished or was cancelled, and a knockout that was cancelled. The invitee can still decline. After the accept window, declining only renames (no stats ever change). Nothing scrubs it automatically. Why: a pending name is no different from a name the host typed for a guest, and a scrub would touch every completion and cancel path in the scoring services.
- **Lists show only invites that can still be accepted:**
  - a knockout that's `waiting`;
  - a quick match that's `waiting` or `live` and not `hasBeenCompleted`.

  A player's match history never fills up with matches they didn't play.
- **Quick-match hosts see invites in the waiting room only.** The live screens have no player list today and don't get one. Mid-match, a pending slot already scores as a guest, so Play as guest isn't needed there. A match started without the waiting room never shows the host who accepted. That's fine, because accepting is the invitee's business.
- **The server looks up the invitee's name** from their account; it doesn't trust the name the app sends.

## How it behaves

### Knockouts (`server/src/services/quickKnockout.service.ts`)

- **Model:** player rows gain `invitedPlayerId?: ObjectId`. A row is a *pending invite* when it has `invitedPlayerId` and no `playerId`. Add an index on `players.invitedPlayerId` (for the list).
- **Add by search** (`addPlayer` with `playerId`):
  - The host adding themselves links directly, as today.
  - Anyone else gets a pending row with their real name.
  - Refuse when that account is already linked or already invited in this knockout.
  - Send the `knockout_invite` notification: "<Host> invited you to <knockout name>", targeting the knockout.
  - A pending row holds a spot: it counts toward the player limit and can be paired, moved to a team, and drawn, like any row.
- **Accept** (`POST /quick-knockout/:id/invite/accept`, invitee only):
  - Allowed only while the knockout is `waiting`.
  - Sets `playerId` to the invitee and clears `invitedPlayerId`.
  - Same `playerKey`, so pairs, teams and the drawn preview stay, as with `claim`.
  - Persist and broadcast. Refuse if the caller has no pending row there.
- **Decline** (`POST /quick-knockout/:id/invite/decline`, invitee only):
  - While `waiting`, it removes the row the same way `removePlayer` does: pairs are dropped and the roster change runs.
  - On a cancelled knockout, it renames the row to "Guest" and clears `invitedPlayerId`.
- **Play as guest** (host only, while `waiting`): clears `invitedPlayerId` on that row.
- **Remove** (existing): works on pending rows unchanged.
- **Join by code:** if the caller has a pending row, accept it instead of adding a row.
- **Claim by code:**
  - A row with `invitedPlayerId` can't be claimed by anyone else.
  - An invitee claiming another row is refused.
- **Draw:** allowed with pending invites.
- **Start:** refused while any row is pending. The message names them: "Waiting for Asha and Ravi to accept. Remove them or play them as guests to start." Because of this, `awardsEligible` (computed at Start), the knockout's quick matches (`createForKnockout`) and honours never see a pending row.
- **Cancel:** pending invites simply end with the knockout.
- **getById:** an invitee who isn't otherwise in the knockout isn't an insider, so the join code stays withheld. Accept works by id, so they don't need it.

### Quick matches (`server/src/services/quickMatch.service.ts`)

- **Model:** slots gain `invitedPlayerId?: ObjectId`. A slot is pending when it has `invitedPlayerId` and no `playerId`. Add an index on `sides.slots.invitedPlayerId` (for the list).
- **Create** (public `create` only):
  - A slot sent with a `playerId` that isn't the host becomes a pending invite with that player's name. The host's own slot links directly.
  - The duplicate-player check covers invited ids too.
  - The notification goes to the invitees, with invite copy: "<Host> invited you to a quick match: <side1> vs <side2>. Accept to keep the result on your profile."
  - `createForKnockout` must keep linking directly: its players have already accepted.
- **Accept** (`POST /quick-match/:id/invite/accept`, invitee only):
  - Same window as `claimSlot`: `waiting` or `live`, not `hasBeenCompleted`, not a knockout match.
  - One conditional write (a sibling of the repository's `claimSlot`): the slot still has this `invitedPlayerId` and no `playerId`, and the caller holds no other slot. It sets `playerId` and clears `invitedPlayerId`. Broadcast.
  - After completion: "This match finished before you accepted."
- **Decline** (`POST /quick-match/:id/invite/decline`, invitee only, any status):
  - Clears `invitedPlayerId` and renames the slot to `Player N`.
  - If the side's name equals the decliner's name (a singles side named after them), rename the side to the same placeholder.
  - After the toss in cricket, rename them in the lineups too (`cricketSetup.side*Lineup[].name`).
- **Play as guest** (host only): clears `invitedPlayerId`, keeps the name.
- **Claim by code:**
  - `claimSlot` and the repository's conditional write must also require no `invitedPlayerId`, so nobody else can take an invited slot.
  - An invitee claiming their own invited slot accepts it. Claiming another slot is refused.
- **Remove** (existing, by `playerId`): unchanged for linked players. A pending slot is handled by Play as guest instead.
- **Completion:** unchanged. Pending slots have no `playerId`, so they get no participation row.

### Account deletion (`server/src/services/accountDeletion.service.ts`, `scrubQuickPlay`)

Pending invites carry the deleted player's id and real name. Rename those rows and slots to "Deleted player" and clear `invitedPlayerId`, matching how linked rows are scrubbed today.

### App (`D:\kria\mobile`)

- **Knockout room** (`src/app/knockout/[id].tsx`, `src/lib/knockoutRoom.ts`):
  - The host sees pending rows marked "Invited · waiting", with Play as guest and Remove.
  - Start's blocker hint names the pending players.
  - The search sheet's subtitle says players are invited: "Find a Kria player to invite, or type a guest's name."
- **Invitee view:** on the knockout or quick-match screen, an invitee sees a card: "<Host> invited you to <name>", with Accept and Decline. After accepting they see the normal player view. After declining they go back. A match or knockout that's past accepting shows "This finished before you accepted", with "Remove my name" (which calls decline).
- **Quick match host screens:** in the waiting room, invited slots read "Invited", with Play as guest. The live screens are unchanged.
- **Notifications:** `knockout_invite` gets an icon and opens `/knockout/[id]` (`src/lib/notificationsView.ts`, `src/api/notifications.ts`). The quick-match notification already opens the match.
- **Lists:** knockouts and matches with an invite that can still be accepted show an "Invited" label in the player's lists.
- Follow `DESIGN.md` and the existing components. No new design language.

## Tests (by the builder, at the usual level)

- **Server:**
  - Each rule above: add→pending, accept, decline, play as guest, Start refused, join-by-code accepts, others can't claim an invited spot, quick-match accept window and the after-completion refusal.
  - Honours and `awardsEligible` ignore pending rows.
  - Career rows skip pending slots.
  - Two accepts or an accept racing a claim land once.
  - Account deletion scrubs invites.
  - `createForKnockout` still links directly.
- **App:** the invite card (accept, decline), the host's pending-row actions, the Start blocker text, the notification route and the list label.

## Left to the builder

- Exact route shapes for Play as guest (a new POST, or an extension of the existing PATCH).
- Exact copy beyond the lines above, and the invite card's layout within DESIGN.md.
- Whether the `/mine` lists need a separate "invited" flag in the response, or the app derives it from `invitedPlayerId`.
- Socket payloads: `invitedPlayerId` rides along like `playerId` does. No new events are needed.
