# Quick knockout

Spans two repos: `server/` and `mobile/`. `client/` (organizer web) is untouched: the organizer
badge picker keeps its own twelve keys, and the server stops accepting anything else from it.

Mockups from the design session: `mobile/.superpowers/brainstorm/1136-1791290577/content/`
(`knockout-hub.html` option B, `waiting-room.html`). Git-ignored; kept for reference only.

## Goal

A player hosts a small badminton knockout for friends — 3 to 16 entrants — with the same low
effort as a quick match. A single quick match holds at most four people, which does not serve a
group of eight or twelve.

## Decisions (settled in the design session)

| Topic | Decision |
|---|---|
| Sport / format | Badminton only. Singles or doubles. |
| Who scores | The host only, as in quick matches. |
| The draw | Random, host can reshuffle until Start. |
| Match length | One format for every round, set at creation (`bestOf`, `pointsToWin`). |
| Joining | A Kria player joins *themselves* by code — no hunting for a name. The host types names only for guests, or adds a Kria player by search. A guest can be claimed by code while waiting. |
| Doubles pairs | Everyone joins solo. The host may pair people by hand; the draw randomly pairs the rest. |
| Implementation | Approach A: a knockout record whose fixtures are ordinary quick matches. |
| Bracket UI | Sideways-scrolling tree (mockup option B). |
| Awards | Champion gets an automatic low-tier honour; host can grant up to 3 extra low-tier awards. Premium badges stay organizer-only. |

## Out of scope (v1)

Cricket; walkovers / retirements; players scoring their own matches; seeding; third-place match;
per-round formats; changing entrants after Start; claiming a guest after Start; a
"won a knockout" career statistic beyond the honour.

---

## 1. Server

### 1.1 Model: `QuickKnockout` (collection `quick_knockouts`)

```ts
{
  hostId: ObjectId,
  joinCode: string,            // unique, uppercase; unique across quick_matches too (§1.3)
  name: string,                // 1–40 chars, trimmed; default "<host first name>'s Knockout"
  sport: 'badminton',
  format: 'singles' | 'doubles',
  matchConfig: { bestOf: 1 | 3 | 5, pointsToWin: 11 | 15 | 21 },
  status: 'waiting' | 'live' | 'completed' | 'cancelled',

  players: [{ playerKey: string, playerId?: ObjectId, displayName: string }],
  pairs:   [{ pairId: string, playerKeys: [string, string], byHost: boolean }], // doubles only
  entrants:[{ entrantId: string, playerKeys: string[] }],   // written by the draw; [] = no draw
  fixtures:[{
    fixtureId: string,
    round: number,             // 1 = first round
    position: number,          // 0-based within the round
    entrantA?: string, entrantB?: string,   // entrantIds; derived for rounds ≥ 2
    bye: boolean,              // round-1 slot with exactly one entrant
    quickMatchId?: ObjectId,
    winnerEntrantId?: string,  // derived (§1.6)
  }],
  roundNames: string[],        // from shared/bracket/roundNames.getRoundNames
  championEntrantId?: string,
  awardsEligible?: boolean,    // fixed at Start: ≥ 4 players with a playerId
  awards: [{ playerId: ObjectId, badge: string, title: string }],   // host extras only
  createdAt, updatedAt
}
```

- `playerKey` is a generated id, stable for the life of the knockout, so a guest claimed by an
  account keeps its pairs and entrant membership.
- Next fixture is computed, not stored: round `r` position `p` feeds round `r+1` position
  `floor(p/2)`, slot A when `p` is even, B when odd.
- Indexes: `{ hostId: 1, createdAt: -1 }`, `{ 'players.playerId': 1, createdAt: -1 }`,
  `joinCode` unique.

### 1.2 `QuickMatch` additions

- `knockoutId?: ObjectId`, `fixtureId?: string`.
- Partial unique index `{ knockoutId: 1, fixtureId: 1 }` where `knockoutId` exists — two
  concurrent advances can never create two matches for one fixture; the loser of the race sees
  E11000 and treats the fixture as already created.
- Knockout matches are created **live** (no waiting room), sport badminton, with the knockout's
  `matchConfig`. Side name = the entrant's display name (`"Arjun Mehta"`, or `"Arjun & Priya"`
  — first names joined, as in the quick-match wizard). Slots carry each player's `playerId` and
  `displayName`, so career credit works unchanged.

### 1.3 Join codes

One code space for both kinds. Creation of either a quick match or a knockout generates a code
and retries while it exists in **either** collection (plus the existing unique index per
collection as the backstop).

New resolver: `GET /quick-code/:code` → `{ kind: 'match' | 'knockout', data }` (logged-in).
`GET /quick-match/by-code/:code` stays for older app builds.

### 1.4 Endpoints (`/quick-knockout`, all `isPlayerLoggedIn`)

| Method & path | Who | When | Effect |
|---|---|---|---|
| `POST /` | anyone | — | Create `{ format, matchConfig, name? }`. Host is added as the first player. Status `waiting`. |
| `GET /mine` | anyone | — | Knockouts the caller hosts or plays in, newest first. |
| `GET /:id` | anyone | — | Read. `joinCode` withheld unless caller is host or a player (as `QuickMatchService.getById`). Runs reconcile (§1.6) first when `live`. |
| `POST /join/:code` | Kria player | waiting | Add caller as a player. Refused if already in, or at the cap. |
| `POST /join/:code/claim` `{ playerKey }` | Kria player | waiting | Turn a guest (no `playerId`) into the caller. Refused if caller already in. |
| `POST /:id/players` `{ displayName }` or `{ playerId }` | host | waiting | Add a guest or a Kria player. |
| `DELETE /:id/players/:playerKey` | host | waiting | Remove anyone, including the host. Removes any pair containing them. |
| `POST /:id/pairs` `{ playerKeys: [a, b] }` | host | waiting, doubles | Pair two unpaired players (`byHost: true`). |
| `DELETE /:id/pairs/:pairId` | host | waiting, doubles | Unpair. |
| `POST /:id/draw` | host | waiting | Draw or reshuffle (§1.5). |
| `POST /:id/start` | host | waiting, drawn | Start (§1.5). |
| `POST /:id/cancel` | host | waiting / live | Cancel; cancels every unfinished knockout match. |
| `POST /:id/awards` `{ playerId, badge }` | host | completed, eligible | Extra award (§1.8). |

**Caps.** Entrants 3–16: singles up to 16 players, doubles up to 32. Joining or adding past the
cap is refused.

**Any change to who is in** — join, add, remove — clears `entrants`, `fixtures`, `roundNames` and
every pair with `byHost: false`. A claim does not (same person count, same key).

### 1.5 Draw and Start

**Draw** (host, waiting):
1. Doubles: odd player count → 400 "Add one more player or remove one to draw." Delete pairs with
   `byHost: false`; shuffle the unpaired players and pair them in order (`byHost: false`).
2. Entrants: singles = one per player; doubles = one per pair. Fewer than 3 → refused.
3. Shuffle entrants (Fisher–Yates). Bracket size `S` = next power of two ≥ N, byes `S − N`,
   placed with `shared/bracket/byePositions(S/2, byes)` over the round-1 slots. Round names from
   `getRoundNames(log2 S, byes)`.
4. Write `entrants`, `fixtures` (all rounds, rounds ≥ 2 empty), `roundNames`. Status stays
   `waiting`. Reshuffle = draw again.

**Start** (host, waiting, `entrants` non-empty): `status = 'live'`, `awardsEligible` fixed, then
reconcile (§1.6) — byes advance and every fixture with two known entrants gets its quick match.

### 1.6 Reconcile — the only thing that advances the bracket

`reconcile(knockoutId)` recomputes the bracket from first principles and is idempotent:

1. For each fixture, round by round:
   - Rounds ≥ 2: `entrantA/B` = the winners of the two feeding fixtures (or empty).
   - `winnerEntrantId` = the lone entrant of a bye; else, if its quick match is `completed`, the
     side that won (`outcome`); else empty.
   - Both entrants known and no `quickMatchId` → create the quick match (§1.2).
   - A `quickMatchId` whose entrants no longer match the fixture (an undo pulled a winner back) →
     delete that quick match (it has no points — §1.7 guarantees it) and clear `quickMatchId`.
2. Final has a winner → `status = 'completed'`, `championEntrantId`, and the champion honour
   (§1.8) for each champion with a `playerId`. Final lost its winner → back to `live`, clear
   `championEntrantId`, remove that honour.
3. Persist and broadcast (§1.9).

Called after a knockout match completes (`recordPoint`), after a knockout match's completion is
undone (`undoLastPoint`), on Start, and on `GET /:id` while live — so a reconcile that failed
half-way (logged, never thrown into the scoring response) heals on the next read.

### 1.7 Rules on knockout matches (quick matches with `knockoutId`)

- `undoLastPoint` that would un-complete the match: refused with "The next match has already
  started." when the fixture it feeds has a quick match with any point scored. Otherwise allowed;
  reconcile then pulls the winner back. Undoing within an unfinished match is unaffected.
- `claimSlot` (joining by the match's own code), `removePlayer`, and `cancel` are refused
  ("This match is part of a knockout."). The match still carries a `joinCode` because the field
  is required; nothing hands it out.
- `GET /quick-match/mine` excludes knockout matches; they are reached through the knockout.
  Career rows, the recent-matches ledger and the Live tab treat them as ordinary quick matches.

### 1.8 Awards

- **Badge keys.** `BADGE_KEYS` (the honour enum) gains `knockout-winner`. The organizer grant
  validator switches to an explicit `ORGANIZER_BADGE_KEYS` — the existing twelve — so organizers
  cannot grant it. `QUICK_AWARD_BADGES = ['iron-player', 'first-cap', 'ace-serve', 'fair-play']`
  with server-side display names for titles.
- **Champion honour** (automatic, only when `awardsEligible`): `{ title: "Won <name>", badge:
  'knockout-winner' }` via `playerRepository.addHonor` for each champion with a `playerId`.
  Undone by a new `playerRepository.removeHonor(id, honor)` (`$pull` of the exact pair).
- **Host extras** (`POST /:id/awards`): knockout `completed` and `awardsEligible`; `badge` in
  `QUICK_AWARD_BADGES`; `playerId` must be a player in the knockout and not the host; at most 3
  per knockout; title fixed to `"<Badge name> · <name>"`. Recorded in `awards[]` and written with
  `addHonor`. Not removed by a later undo of the final.

### 1.9 Live updates

The knockout service broadcasts after every save, as `QuickMatchService._broadcast` does: event
`knockout:update`, room `match:<knockoutId>` (joined with the existing `join:match` handler),
payload `{ knockout }` with `joinCode` stripped. Knockout matches keep broadcasting their own
`quick:update`.

---

## 2. Mobile

### 2.1 Entry

- The Host button opens a new `/quick/host` chooser: **Quick match** → existing `/quick/new`;
  **Knockout** → `/knockout/new`.
- `/knockout/new`: three steps reusing the wizard's parts (`HostSteps` exports `Segmented`,
  `ChoiceCard`; `new.tsx` chrome pattern): **Format** (singles/doubles, match length, points),
  **Name** (optional), **Review** → "Create knockout" → `/knockout/[id]`.

### 2.2 `/knockout/[id]`

`useQuickKnockout(id)`: load, focus refetch, socket subscription (`join:match`, `knockout:update`,
keep own `joinCode`, re-join + re-read on reconnect — as `useQuickMatch`), and one action per
endpoint. Panels by status:

- **Waiting** (`waiting-room.html`): code + Share; live player list (`You` / `Joined` / `Guest`);
  `+ Add player` (guest name or Kria search, reusing `PlayerField`); doubles pairing by tapping
  two players, made pairs shown grouped; after a draw, the tree preview. Pinned bar: **Draw**
  (disabled with the reason while doubles count is odd or entrants < 3), then **Reshuffle** +
  **Start knockout**. Joined players see the list and "Waiting for <host> to start".
- **Live** (`knockout-hub.html` option B): sideways-scrolling tree, one column per round headed
  by its round name, first names in boxes; ready matches outlined in brand orange; tapping a box
  with a match opens `/quick/[id]`. Host cancel at the bottom.
- **Completed**: champion banner ("Arjun & Priya won Sunday Smash") with the Knockout Winner
  badge above the tree; for the host, when eligible, an **Awards** section: pick a player (not
  self), pick one of four badges, max 3; given awards listed.

### 2.3 Elsewhere

- `/quick/[id]` for a match with `knockoutId`: a top bar "Sunday Smash · Semi-Final · ← Bracket";
  cancel, remove-player and the join-code block hidden.
- `/quick/join`: calls `GET /quick-code/:code`; `kind: 'knockout'` shows the knockout card with
  **Join as <name>** and the "Already added by the host? Tap your name" guest list; `match`
  keeps today's flow.
- Quick matches list and Home: unfinished knockouts listed above single matches with a
  `Knockout` tag (waiting / live); Home counts only `live` ones in "N live", as today.
- `src/lib/badges.ts`: `'knockout-winner': { tier: 'steel', emblem: 'trophy' }`. Older builds
  fall back to the gold Champion art for an unknown key — acceptable.
- New screens use `useTheme()` tokens and join `MIGRATED`; no function `style` on Pressables
  (`pressableStyleFence`).

---

## 3. Testing

**Server** (vitest, in-memory Mongo):
- Draw: bye count and placement for 3, 5, 8, 12, 16 entrants; doubles host pairs kept, the rest
  paired; odd doubles count refused; reshuffle replaces only non-host pairs.
- Roster changes clear the draw; claim does not.
- Start: byes advance; round-2 fixtures with two bye winners get matches immediately.
- Reconcile: completing a match creates the next one; final → completed + champion honour;
  idempotent on repeat; concurrent advance creates one match (unique index).
- Undo: allowed when the next match has no points (winner pulled back, next match deleted);
  refused when it has points; undoing the final reverts to live and removes the honour.
- Knockout matches: claim / remove / cancel refused; excluded from `/quick-match/mine`.
- Awards: eligibility (< 4 Kria players → none), not self, max 3, only the four keys,
  organizers cannot grant `knockout-winner`.
- Codes: a knockout code never collides with a quick-match code; `/quick-code` resolves both.
- Broadcast carries no `joinCode`.

**Mobile** (jest): hook live updates; waiting room (pair, draw disabled reasons, start pinned
outside the scroll); tree renders rounds and opens matches; join resolver both kinds; awards rules
in the UI; knockout bar on the match screen.

## 4. Rollout

Server and app ship together. Older app builds: knockout codes fail to resolve on the old
`by-code` endpoint (404 "Quick match not found") and knockout matches show as plain quick
matches — no breakage, just no knockout UI.
