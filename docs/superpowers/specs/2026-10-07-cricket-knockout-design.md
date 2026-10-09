# Cricket quick knockout

Spans two repos: `server/` and `mobile/`. Extends the badminton quick knockout
(`2026-10-06-quick-knockout-design.md`, implemented on `main`) to cricket. Everything that spec
settled carries over unless this one says otherwise. Note: that spec's §1.8 text is stale — the
champion honour is removed by `{ badge, ref: knockoutId }`, not by exact title.

## Goal

A player hosts a small cricket knockout for friends — 3 to 8 teams — with the same low effort as
the badminton one. A single quick cricket match holds only two teams.

## Decisions (settled in the design session)

| Topic | Decision |
|---|---|
| Model | One knockout model for both sports (`sport` chosen first in the wizard). Sport differences live in one small server file keyed by sport. |
| Teams | Host sets the team count. A joiner picks a team or **Any team**. Host can move anyone. The draw deals the Any-team players at random. |
| Team names | Default `Team 1` … `Team N`; host renames while waiting. |
| Team count | 3–8. Host can add or remove a team while waiting. |
| Squads | `playersPerTeam` is the max squad. Teams may be uneven; each needs ≥ 2 at the draw. Each match plays to the **smaller** squad (`playersPerTeam = min`), so the bigger side's extra player bowls and fields. |
| Match format | Exactly the quick cricket match's knobs: overs 1–50 (default 8), players per team 2–11 (default 6). Overs per bowler not exposed (server default 4). One format for every round. |
| Ties | Host picks who goes through ("Tied — who goes through?") after settling it on the ground. Final after confirm. Careers still record a tie. |
| Toss / lineups | The existing per-match cricket setup (toss, confirm batting order from the team's slots). |
| Awards | As badminton, but cricket offers `iron-player`, `first-cap`, `fair-play` (no `ace-serve`). |
| Undo after a match ends | Not offered in the cricket UI (as cricket quick matches today). The server still guards it. |

## Out of scope (v1)

In-app super over; players switching their own team (the host moves them); captains / picking
turns; a per-match bowler limit; plus everything the badminton spec left out (seeding, walkovers,
third place, per-round formats, edits after Start, claiming a guest after Start).

---

## 1. Server

### 1.1 Model: `QuickKnockout` changes

```ts
{
  sport: 'badminton' | 'cricket',                 // was ['badminton']
  format: 'singles' | 'doubles' | 'teams',        // cricket is always 'teams'
  matchConfig: {                                  // fields no longer schema-required;
    bestOf?: 1 | 3 | 5, pointsToWin?: 11 | 15 | 21,   // badminton (validator-required)
    maxOvers?: number, playersPerTeam?: number,       // cricket (validator-required)
  },
  teams: [{ teamId: string, name: string }],      // cricket only; default []
  players: [{ playerKey, playerId?, displayName,
              teamId?: string,                    // cricket: absent = Any team
              drawn?: boolean }],                 // true = the draw placed them
  // pairs, entrants, fixtures, roundNames, championEntrantId, awardsEligible, awards: unchanged
}
```

- Cricket entrants use the team's id: `entrantId = teamId`, `playerKeys` = the team's players at
  draw time. Entrant names come from `teams[].name`.
- `KNOCKOUT_LIMITS` becomes per sport: badminton 3–16 entrants (unchanged); cricket 3–8 teams.

### 1.2 Sport differences in one place

New `server/src/services/knockoutSports.ts`: a plain object keyed by sport, read by the knockout
service. Per sport:

| Key | Badminton | Cricket |
|---|---|---|
| `maxPlayers(k)` | 16 × (doubles ? 2 : 1) | `teams.length × playersPerTeam` |
| `awardBadges` | iron-player, first-cap, ace-serve, fair-play | iron-player, first-cap, fair-play |
| `sideName(k, entrantId)` | name, or first names joined with " & " | the team's name |
| `matchConfig(k, sideA, sideB)` | `{ bestOf, pointsToWin }` | `{ maxOvers, playersPerTeam: min(squadA, squadB) }` |
| `hasStarted(match)` (async) | any game score > 0 | at least one ball stored (`ballRepository.getLastBall`) |

`hasStarted` replaces `hasPoints`. For cricket it must not read `liveState`: undoing the first
ball restores the `initLiveState` snapshot, so `liveState` exists with nothing bowled.

### 1.3 `QuickMatch` additions

- `tieWinnerSideId?: string` on the base schema — set only by the tie pick (§1.6) on a knockout
  match. `outcome` stays `tied`, so career stats are unchanged.
- `createForKnockout` takes `sport` and the sport's `matchConfig`. Cricket: `repository.create('cricket', …)`
  with `teams: { team1Id: sideA.sideId, team2Id: sideB.sideId }` (side ids = entrant ids, as
  today). The repository already stamps `honoursSquadSize`. Status `live`.

### 1.4 Endpoints (`/quick-knockout`, all `isPlayerLoggedIn`)

Changed:

| Method & path | Change |
|---|---|
| `POST /` | Also accepts `{ sport: 'cricket', matchConfig: { maxOvers, playersPerTeam }, teamCount (3–8), name? }`. Creates `Team 1` … `Team N`, `format: 'teams'`. `sport` absent = badminton (older app). |
| `POST /join/:code` | Optional `{ teamId }` (cricket). Absent = Any team. Refused when that team is full ("That team is full.") or the knockout is full. |
| `POST /:id/players` | Unchanged: a host-added player lands in Any team; the host then moves them. |
| `POST /:id/awards` | Badge must be in the sport's `awardBadges`. |

New (host, waiting, cricket):

| Method & path | Effect |
|---|---|
| `PATCH /:id/players/:playerKey` `{ teamId: string \| null }` | Move to a team (refused if full) or to Any team (`null`). Sets `drawn: false`. |
| `POST /:id/teams` | Add a team named the first unused `Team N`. Refused at 8. |
| `DELETE /:id/teams/:teamId` | Remove; its players go to Any team. Refused at 3 teams, and when the remaining teams cannot hold everyone ("Remove some players first."). |
| `PATCH /:id/teams/:teamId` `{ name }` | Rename: trimmed, 1–20 chars, unique among the teams ignoring case. |

New (host, live, any sport):

| Method & path | Effect |
|---|---|
| `POST /:id/tie` `{ fixtureId, entrantId }` | §1.6. |

**A player change** — join, add, remove, move — **keeps the draw**: the teams are the entrants,
so the bracket stands and only `entrants[].playerKeys` are re-read from the teams. A team counts as
full with its `drawn` players. **Adding or removing a team** clears `entrants`, `fixtures`,
`roundNames`, and returns every `drawn` player to Any team (`teamId` and `drawn` unset). A player
placed by join, add or move is never `drawn`. A claim keeps the guest's team. A rename keeps the
draw. *(Changed 8 Oct after phone testing: a move used to clear the whole draw.)*

### 1.5 Draw (cricket)

1. Every `drawn` player goes back to Any team.
2. Shuffle the Any-team players. Deal them one at a time to the team with the fewest players
   that is not full (ties broken at random); mark them `drawn: true`.
3. Any team with fewer than 2 players → 400 "Every team needs at least 2 players."
4. Entrants = the teams (§1.1). Bracket, byes and round names as badminton. Reshuffle = draw
   again: only `drawn` players move; self-picked and host-placed players stay.

Start (cricket) refuses while anyone is in Any team ("Put everyone in a team, or reshuffle.") or a
team has fewer than 2 ("Every team needs at least 2 players."), since the draw outlives player
changes; the app's `startBlocker` mirrors it. `awardsEligible` is unchanged (≥ 4 players with a
`playerId`).

### 1.6 Reconcile and ties

Reconcile is unchanged except:

- A fixture's match is created with `knockoutSports[sport].matchConfig` and `sideName`; slots are
  the entrant's players (as today).
- `hasPoints` → `await knockoutSports[sport].hasStarted(m)` (deleting an unfitting match, and
  `assertUndoAllowed`).
- Winner of a completed, fitting match: `side1` → A, `side2` → B, `tied` → `tieWinnerSideId` when
  it is A or B, else **no winner** (the bracket waits). Fixes the current bug where a tie advances B.

**Tie pick** `POST /:id/tie { fixtureId, entrantId }`: host only; knockout `live`; the fixture's
match exists, fits, is `completed` with `outcome: 'tied'` and no `tieWinnerSideId`; `entrantId` is
the fixture's A or B. Sets `tieWinnerSideId` via `quickMatchService.persist` (broadcasts the
match), then returns `reconcile(id)`. Errors: "This match is not tied." / "The tie is already
settled." / "Pick one of the two teams."

### 1.7 Cricket scoring wiring (`quickCricketScoring.service.ts`)

Mirror `quickBadmintonScoring.service.ts`:

- `recordBall`: after a completing ball is persisted and career stats recorded, if `knockoutId` →
  `quickKnockoutService.reconcile` (logged, never thrown).
- `undoLastBall`: when the match was completed and has `knockoutId`/`fixtureId`,
  `assertUndoAllowed` runs **before anything changes** (before `clearParticipation`). On
  un-completing, also unset `tieWinnerSideId`. After persist → reconcile (logged, never thrown).

Claim, remove-player and cancel already refuse knockout matches, and `/quick-match/mine` already
excludes them — sport-agnostic, no change.

---

## 2. Mobile

### 2.1 Types and helpers

- `QuickKnockout` type: `sport`, `format` incl. `'teams'`, optional per-sport `matchConfig`,
  `teams`, players' `teamId` / `drawn`. `QuickMatch`: `tieWinnerSideId?`.
- `src/lib/quickKnockoutView.ts`: `entrantName` returns the team name for cricket;
  `formatLabel(k)` → `Singles` / `Doubles` / `Cricket · 8 overs` (used by `KnockoutRow`, the
  `/knockout/[id]` header and the join card, which show `k.format` today); `drawBlocker` for
  cricket → "Every team needs at least 2 players."; award badges by sport.

### 2.2 Create (`/knockout/new`)

New first step **Sport** (Badminton / Cricket). Badminton keeps its steps. Cricket: **Format** —
overs (1–50, default 8) and players per team (2–11, default 6) with the quick-match cricket
steppers from `HostSteps`, plus **Teams** (3–8, default 4); **Name**; **Review** → "Create
knockout".

### 2.3 Waiting room (cricket)

A new component `src/components/knockout/CricketTeams.tsx` replaces the player list inside
`KnockoutWaitingRoom` when `sport === 'cricket'`; code, Share and the pinned Draw bar stay shared.

- Team cards: name, `4/6`, players. Then an **Any team** card.
- Host: tap a player to select them, then **Move here** on a team card (or Any team) — the doubles
  tap-to-pair pattern, no sheet (Android alerts hold three buttons, too few for 8 teams). Remove
  with the player's ×. **Rename** / **Remove** on each team card; **+ Add team**; **+ Add player**
  (guest or Kria search) lands in Any team.
- Draw disabled with the `drawBlocker` reason. After a draw the cards show where everyone landed
  and the tree preview shows below, as today.
- Joined players: same cards, read-only, "Waiting for <host> to start".

### 2.4 Join (`/quick/join`)

A cricket knockout card lists the teams with counts (full ones disabled) and **Any team**; pick,
then **Join**. The guest list ("Already added by the host? Tap your name") is unchanged.

### 2.5 Match screen (`/quick/[id]`, cricket knockout match)

- `CricketScorePanel`: hide **Cancel match** and the join-code row when `knockoutId` is set
  (badminton's `MatchPanel` does this via `managed`).
- Completed, `outcome: 'tied'`, `knockoutId`, no `tieWinnerSideId`: host sees **"Tied — who goes
  through?"** with the two team buttons and a confirm dialog; others see "Tied — waiting for the
  host". Once picked, everyone sees "Tied · <team> went through".
- After a successful tie pick, if the knockout is now `completed` and `awardsEligible`, the host
  is taken to the awards screen (the existing auto-open fires on the match completing, when a
  tied final has no champion yet).

### 2.6 Elsewhere

Bracket tree and champion banner show team names via `entrantName`. Awards screen lists the
sport's badges. Home, lists, profile Knockouts and the recent-matches label need no change beyond
`formatLabel`. New screens/components use `useTheme()` tokens and join `MIGRATED`; no function
`style` on Pressables.

---

## 3. Testing

**Server** (vitest, in-memory Mongo):
- Create cricket: N default teams, `format: 'teams'`, config validated per sport; badminton
  create unchanged.
- Join a team / Any team; full team refused; cap = teams × squad; claim keeps the team and
  does not clear the draw.
- Move, add, remove (≥ 3, capacity check, players → Any team), rename (unique, length); every
  roster change clears the draw and returns drawn players; rename does not.
- Draw: smallest team first, never overfilled; < 2 refused; reshuffle moves only drawn players;
  entrants = teams.
- Fixture match: cricket discriminator, `teams` = entrant ids, team names, slots from the roster,
  `playersPerTeam` = smaller squad.
- Reconcile: win advances the right team; tie advances nobody until picked, then the picked one.
- Tie pick: host only; tied + completed only; once; must be A or B.
- Undo: allowed while the next match has no ball (tie pick cleared, next match deleted); refused
  after one ball; first-ball-undone next match counts as not started; undoing the final removes
  the champion honour.
- Awards: cricket refuses `ace-serve`.

**Mobile** (jest): wizard sport step + cricket config; `formatLabel`, `entrantName`, cricket
`drawBlocker`; team cards render and host actions call the hook; join card team picker with full
teams disabled; cricket knockout match hides cancel + code; tie picker host-only and only when
unpicked; awards list by sport.

## 4. Rollout

Server and app ship together. An older app: `POST /` without `sport` stays badminton; joining a
cricket knockout without `teamId` lands in Any team (works); its screens show a cricket knockout
without team cards — no breakage.
