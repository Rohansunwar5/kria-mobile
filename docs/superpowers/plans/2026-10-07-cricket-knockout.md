# Cricket Quick Knockout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A player hosts a 3–8 team cricket knockout with the same flow as the badminton quick knockout.

**Architecture:** The one `QuickKnockout` model gains `sport: 'cricket'`, named `teams[]`, and a per-player `teamId` / `drawn`. Everything a sport does differently lives in one table, `server/src/services/knockoutSports.ts`. Fixtures stay ordinary quick matches (the cricket discriminator), and `reconcile` is still the only thing that advances the bracket — now with a host tie pick stored on the tied match (`tieWinnerSideId`). Mobile adds a Sport step to the wizard, team cards to the waiting room, a team picker to Join, and a tie picker on the match screen.

**Tech Stack:** Server — Express, Mongoose, express-validator 7, vitest + mongodb-memory-server. Mobile — Expo SDK 57, expo-router, React Native, jest + @testing-library/react-native.

**Spec:** `mobile/docs/superpowers/specs/2026-10-07-cricket-knockout-design.md` (read it with this plan). Background: `mobile/docs/superpowers/specs/2026-10-06-quick-knockout-design.md` (the badminton knockout this extends).

## Global Constraints

- `D:\kria` is not a repo. `D:\kria\server` and `D:\kria\mobile` are separate git repos. Tasks 1–5 are server, 6–10 mobile. Before Task 1 run `git checkout -b feat/cricket-knockout` in `server`; before Task 6 the same in `mobile`. **Never push.** Do not commit anything under `mobile/docs/`.
- Never run commands for both repos in parallel tool calls; put `pwd` in every command.
- Server, from `D:\kria\server`: one test file `RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/<file>`; types `npx tsc --noEmit`; lint `npm run lint:fix` (must exit 0). A full-suite run may flake 1–5 unrelated files on timeouts — re-run those alone.
- Server commits: subject `<verb> <what>`, verb from `fix|feat|chore|perf|bugs|docs|refactor|add|test|tests|updated|changed|added|created|create`, a space, **no colon**; then a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The pre-commit hook runs `npm run lint:fix && npm run build` over the whole repo.
- Server code: no `console` (use `logger`), no explicit `any`, no unused vars; Mongoose calls only in `repository/` and `models/`.
- Mobile, from `D:\kria\mobile`: one test file `npx jest __tests__/<file>`; types `npx tsc --noEmit`; lint `npx eslint <files>`. Commit style as server.
- Mobile code: never `style={({ pressed }) => …}` on `Pressable`; new files use `useTheme()` tokens and are added to `MIGRATED` in `test-utils/colourLiterals.ts`; `Anton_400Regular` needs an integer `lineHeight` ≥ 1.188 × fontSize; import router hooks from `expo-router`; tests that render `Badge` mock `useIsFocused: () => true`.
- Numbers, verbatim from the spec: cricket teams **3–8** (wizard default 4); overs **1–50** (default 8); players per team **2–11** (default 6); team name **1–20** characters, unique ignoring case; every team needs **≥ 2** players at the draw; cricket award badges **iron-player, first-cap, fair-play**.
- Server messages, verbatim: "A cricket knockout needs 3 to 8 teams." · "Teams are for cricket knockouts." · "That team is not in this knockout." · "That team is full." · "A knockout can have at most 8 teams." · "A knockout needs at least 3 teams." · "Remove some players first." · "A team name is 1 to 20 characters." · "Another team already has that name." · "Every team needs at least 2 players." · "This match is not tied." · "The tie is already settled." · "Pick one of the two teams."
- After every task run `git status` in that repo: no scratch files (e.g. `test_run_*.txt`), and the co-author line is a trailer, not on the subject line.

## Review Focus

1. **The next match's first ball is undone, then the feeding match is undone.** "Started" for cricket means a ball is stored, so the undo must be allowed and the next match removed — `liveState` survives a first-ball undo and must not count. Pinned in Task 5 ("…allowed again if that ball is undone") and Task 4 (`hasStarted`).
2. **A tied final.** The knockout stays live with no champion and no honour; the host's pick completes it, gives the champion honour, and (mobile) opens awards — the match-completion auto-open can't, because nothing was decided then. Pinned in Task 5 and Task 10.
3. **Uneven squads (3 v 2).** The match plays to the smaller squad (`playersPerTeam = min`), or the smaller side is stranded with nobody to bat. Pinned in Task 4.
4. **Reshuffle and roster changes.** A reshuffle deals only `drawn` players; any roster change returns `drawn` players to Any team while self-picked / host-placed players stay. Pinned in Task 3.
5. **An older app.** Joining with no `teamId` lands in Any team; creating with no `sport` is a badminton knockout. Pinned in Task 2 ("…older apps send none") and the unchanged badminton tests run in Task 1.

## File Structure

**Server**
- Create `src/services/knockoutSports.ts` — the per-sport table (limits, award badges, side name, match config, "has started").
- Modify `src/models/quickKnockout.model.ts` — `sport`, `format: 'teams'`, per-sport `matchConfig`, `teams[]`, player `teamId` / `drawn`.
- Modify `src/models/quickMatch.model.ts` — `tieWinnerSideId`.
- Modify `src/services/quickKnockout.service.ts` — create, join/move/team methods, cricket draw, reconcile, `settleTie`, awards by sport.
- Modify `src/services/quickMatch.service.ts` — `createForKnockout` takes the sport.
- Modify `src/sports/cricket/services/quickCricketScoring.service.ts` — reconcile after completion, undo guard.
- Modify `src/routes/quickKnockout.route.ts`, `src/controllers/quickKnockout.controller.ts`, `src/middlewares/validators/quickKnockout.validator.ts`.
- Tests: create `test/quickKnockoutCricketCreate.test.ts`, `…CricketTeams`, `…CricketDraw`, `…CricketBracket`, `…CricketScoring`; modify `test/quickKnockoutHttp.test.ts`, `test/quickMatchKnockoutLocks.test.ts`.

**Mobile**
- Modify `src/api/quickKnockout.ts`, `src/api/quickMatch.ts`, `src/lib/quickKnockoutView.ts`, `src/lib/quickCricketView.ts`, `src/lib/useQuickKnockout.ts`.
- Modify `src/app/knockout/new.tsx`; export `Stepper` from `src/components/quick/HostSteps.tsx`.
- Create `src/components/knockout/PlayerLine.tsx` (moved out of the waiting room), `src/components/knockout/CricketTeams.tsx`; modify `KnockoutWaitingRoom.tsx`, `src/app/knockout/[id].tsx`, `KnockoutRow.tsx`, and the format line in `src/app/quick/index.tsx` and `src/components/home/PlayPortal.tsx`.
- Modify `src/app/quick/join.tsx`.
- Create `src/components/knockout/TiePick.tsx`; modify `src/app/quick/[id].tsx`, `src/components/quick/CricketScorePanel.tsx`, `src/app/knockout/awards/[id].tsx`.
- Modify `test-utils/colourLiterals.ts` (`MIGRATED`).

---

### Task 1: Model, sport table, cricket create, awards by sport

**Files:**
- Modify: `server/src/models/quickKnockout.model.ts`
- Create: `server/src/services/knockoutSports.ts`
- Modify: `server/src/services/quickKnockout.service.ts`
- Modify: `server/src/middlewares/validators/quickKnockout.validator.ts`
- Test: create `server/test/quickKnockoutCricketCreate.test.ts`; modify `server/test/quickKnockoutHttp.test.ts`

**Interfaces:**
- Produces: `IKnockoutTeam { teamId: string; name: string }`; `IKnockoutPlayer` gains `teamId?: string; drawn?: boolean`; `IQuickKnockout` gains `sport: 'badminton' | 'cricket'`, `format: 'singles' | 'doubles' | 'teams'`, `matchConfig: { bestOf?; pointsToWin?; maxOvers?; playersPerTeam? }` (all `number | undefined`), `teams: IKnockoutTeam[]`.
- Produces: `knockoutSports: Record<'badminton' | 'cricket', KnockoutSport>` and `CRICKET_TEAM_LIMITS = { minTeams: 3, maxTeams: 8 }` from `services/knockoutSports.ts`, where `KnockoutSport = { minEntrants: number; maxPlayers(k): number; awardBadges: readonly string[]; sideName(k, entrantId, players: IKnockoutPlayer[]): string; matchConfig(k, squadA: number, squadB: number): Record<string, number>; hasStarted(m: IQuickMatch): Promise<boolean> }`.
- Produces: `CreateKnockoutInput` union — badminton `{ sport?: 'badminton'; format; matchConfig: { bestOf; pointsToWin }; name? }` or cricket `{ sport: 'cricket'; matchConfig: { maxOvers: number; playersPerTeam: number }; teamCount: number; name? }`.

- [ ] **Step 1: Write the failing service test**

Create `server/test/quickKnockoutCricketCreate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import Player from '../src/models/player.model';
import { QuickKnockoutModel } from '../src/models/quickKnockout.model';
import { quickKnockoutService } from '../src/services/quickKnockout.service';

let seq = 0;
async function makePlayer(firstName: string, lastName = 'T') {
    seq += 1;
    const p = await Player.create({ firstName, lastName, email: `kc${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true });
    return p._id.toString();
}

const cricket = (teamCount = 4, playersPerTeam = 6) => ({ sport: 'cricket' as const, matchConfig: { maxOvers: 8, playersPerTeam }, teamCount });

describe('creating a cricket knockout', () => {
    it('opens with default-named teams and the host in Any team', async () => {
        const hostId = await makePlayer('Arjun', 'Mehta');
        const k = (await quickKnockoutService.create(hostId, cricket(4))).data!;
        expect(k.sport).toBe('cricket');
        expect(k.format).toBe('teams');
        expect(k.status).toBe('waiting');
        expect(k.matchConfig).toMatchObject({ maxOvers: 8, playersPerTeam: 6 });
        expect(k.teams.map((t) => t.name)).toEqual(['Team 1', 'Team 2', 'Team 3', 'Team 4']);
        expect(new Set(k.teams.map((t) => t.teamId)).size).toBe(4);
        expect(k.players).toHaveLength(1);
        expect(String(k.players[0].playerId)).toBe(hostId);
        expect(k.players[0].teamId).toBeUndefined();
        expect(k.name).toBe('Arjun\'s Knockout');
    });

    it('refuses fewer than 3 or more than 8 teams', async () => {
        const hostId = await makePlayer('Arjun');
        await expect(quickKnockoutService.create(hostId, cricket(2))).rejects.toThrow('A cricket knockout needs 3 to 8 teams.');
        await expect(quickKnockoutService.create(hostId, cricket(9))).rejects.toThrow('A cricket knockout needs 3 to 8 teams.');
    });

    it('is full at teams × players per team', async () => {
        const hostId = await makePlayer('Arjun');
        const id = String((await quickKnockoutService.create(hostId, cricket(3, 2))).data!._id);
        for (let i = 1; i < 6; i++) await quickKnockoutService.addPlayer(id, hostId, { displayName: `G${i}` });
        await expect(quickKnockoutService.addPlayer(id, hostId, { displayName: 'One too many' })).rejects.toThrow('This knockout is full.');
    });
});

describe('awards by sport', () => {
    it('a cricket knockout refuses Ace Serve and gives Fair Play', async () => {
        const hostId = await makePlayer('Arjun');
        const rahul = await makePlayer('Rahul');
        const k = await QuickKnockoutModel.create({
            hostId, joinCode: 'CKAWD2', name: 'Cup', sport: 'cricket', format: 'teams',
            matchConfig: { maxOvers: 8, playersPerTeam: 6 }, status: 'completed', awardsEligible: true,
            players: [{ playerKey: 'a', playerId: hostId, displayName: 'Arjun T' }, { playerKey: 'b', playerId: rahul, displayName: 'Rahul T' }],
        });
        const id = String(k._id);
        await expect(quickKnockoutService.grantAward(id, hostId, { playerId: rahul, badge: 'ace-serve' })).rejects.toThrow('Pick one of the knockout badges.');
        const given = (await quickKnockoutService.grantAward(id, hostId, { playerId: rahul, badge: 'fair-play' })).data!;
        expect(given.awards).toHaveLength(1);
    });
});
```

Append to `server/test/quickKnockoutHttp.test.ts`, inside the `describe('quick knockout HTTP', …)` block, and add the `cricketBody` const next to the existing `body` const at the top:

```ts
const cricketBody = { sport: 'cricket', matchConfig: { maxOvers: 8, playersPerTeam: 6 }, teamCount: 4 };
```

```ts
    it('creates a cricket knockout and validates its config at the edge', async () => {
        const host = await authed('Arjun');
        const ok = await request(app).post('/quick-knockout').set(as(host.token)).send(cricketBody);
        expect(ok.status).toBe(200);
        expect(ok.body.data.data.teams).toHaveLength(4);
        const tooMany = await request(app).post('/quick-knockout').set(as(host.token)).send({ ...cricketBody, teamCount: 9 });
        expect(tooMany.status).toBe(422);
        const noOvers = await request(app).post('/quick-knockout').set(as(host.token)).send({ ...cricketBody, matchConfig: { playersPerTeam: 6 } });
        expect(noOvers.status).toBe(422);
    });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutCricketCreate.test.ts test/quickKnockoutHttp.test.ts`
Expected: FAIL — `sport` `cricket` is not a valid enum value / `format` required / no `teams`.

- [ ] **Step 3: Update the model**

In `server/src/models/quickKnockout.model.ts`:

Replace `playerSchema` with:

```ts
const playerSchema = new mongoose.Schema(
    {
        playerKey: { type: String, required: true },
        playerId: { type: mongoose.Types.ObjectId },
        displayName: { type: String, required: true, trim: true },
        // Cricket: the team this player is in. Absent = Any team.
        teamId: { type: String },
        // Cricket: the draw put them there, so a reshuffle or any roster
        // change deals them again. Self-picked and host-placed players are
        // never `drawn` and stay put.
        drawn: { type: Boolean },
    },
    { _id: false },
);
```

Add after `awardSchema`:

```ts
const teamSchema = new mongoose.Schema(
    {
        teamId: { type: String, required: true },
        name: { type: String, required: true, trim: true, maxLength: 20 },
    },
    { _id: false },
);
```

In `quickKnockoutSchema`, replace the `sport`, `format` and `matchConfig` paths with:

```ts
        sport: { type: String, required: true, enum: ['badminton', 'cricket'], default: 'badminton' },
        // Cricket is always 'teams'.
        format: { type: String, required: true, enum: ['singles', 'doubles', 'teams'] },
        // Each sport's own keys. createKnockoutValidator requires the right
        // ones, so none is schema-required here.
        matchConfig: {
            bestOf: { type: Number, enum: [1, 3, 5] },
            pointsToWin: { type: Number, enum: [11, 15, 21] },
            maxOvers: { type: Number, min: 1, max: 50 },
            playersPerTeam: { type: Number, min: 2, max: 11 },
        },
```

and add, after `awards`:

```ts
        // Cricket only: the teams players pick or are dealt into.
        teams: { type: [teamSchema], default: [] },
```

Replace the interfaces block's `IKnockoutPlayer` line and the `sport`/`format`/`matchConfig` fields of `IQuickKnockout`, and add `IKnockoutTeam` and `teams`:

```ts
export interface IKnockoutPlayer { playerKey: string; playerId?: mongoose.Types.ObjectId; displayName: string; teamId?: string; drawn?: boolean }
export interface IKnockoutTeam { teamId: string; name: string }
```

```ts
    sport: 'badminton' | 'cricket';
    format: 'singles' | 'doubles' | 'teams';
    matchConfig: { bestOf?: number; pointsToWin?: number; maxOvers?: number; playersPerTeam?: number };
```

```ts
    teams: IKnockoutTeam[];
```

- [ ] **Step 4: Create the sport table**

Create `server/src/services/knockoutSports.ts`:

```ts
// server/src/services/knockoutSports.ts
import { IKnockoutPlayer, IQuickKnockout, KNOCKOUT_LIMITS } from '../models/quickKnockout.model';
import { IQuickBadmintonMatch, IQuickMatch } from '../models/quickMatch.model';
import { ballRepository } from '../sports/cricket/repository/ball.repository';

export const CRICKET_TEAM_LIMITS = { minTeams: 3, maxTeams: 8 } as const;

/**
 * Everything a quick knockout does differently per sport. The bracket,
 * reconcile, codes and awards are shared; a new sport is one entry here plus
 * its scoring service calling reconcile.
 */
export interface KnockoutSport {
    /** Fewest entrants a draw accepts. */
    minEntrants: number;
    maxPlayers(k: IQuickKnockout): number;
    /** The low-tier badges a host may hand out (keys of QUICK_AWARD_BADGES). */
    awardBadges: readonly string[];
    /** A match side's name for one entrant. */
    sideName(k: IQuickKnockout, entrantId: string, players: IKnockoutPlayer[]): string;
    /** The quick match's config for a fixture between squads of these sizes. */
    matchConfig(k: IQuickKnockout, squadA: number, squadB: number): Record<string, number>;
    /** Anything scored yet? Decides whether a match may be deleted, or an undo refused. */
    hasStarted(m: IQuickMatch): Promise<boolean>;
}

const firstName = (name: string) => name.split(/\s+/)[0];

export const knockoutSports: Record<IQuickKnockout['sport'], KnockoutSport> = {
    badminton: {
        minEntrants: KNOCKOUT_LIMITS.minEntrants,
        maxPlayers: (k) => KNOCKOUT_LIMITS.maxEntrants * (k.format === 'doubles' ? 2 : 1),
        awardBadges: ['iron-player', 'first-cap', 'ace-serve', 'fair-play'],
        sideName: (_k, _entrantId, players) => (players.length === 1
            ? players[0].displayName
            : players.map((p) => firstName(p.displayName)).join(' & ')),
        matchConfig: (k) => ({ bestOf: k.matchConfig.bestOf as number, pointsToWin: k.matchConfig.pointsToWin as number }),
        hasStarted: async (m) => ((m as IQuickBadmintonMatch).gameScores ?? []).some((g) => g.side1Score + g.side2Score > 0),
    },
    cricket: {
        minEntrants: CRICKET_TEAM_LIMITS.minTeams,
        maxPlayers: (k) => k.teams.length * (k.matchConfig.playersPerTeam ?? 0),
        awardBadges: ['iron-player', 'first-cap', 'fair-play'],
        sideName: (k, entrantId) => k.teams.find((t) => t.teamId === entrantId)?.name ?? 'Team',
        // Both sides play to the smaller squad: the engine has one all-out
        // threshold per match, and a bigger number strands the smaller side
        // with nobody left to bat.
        matchConfig: (k, squadA, squadB) => ({ maxOvers: k.matchConfig.maxOvers as number, playersPerTeam: Math.min(squadA, squadB) }),
        // A stored ball, not liveState: undoing the first ball restores the
        // initLiveState snapshot, so liveState exists with nothing bowled.
        hasStarted: async (m) => Boolean(await ballRepository.getLastBall(String(m._id))),
    },
};
```

- [ ] **Step 5: Update the service — create, cap, awards**

In `server/src/services/quickKnockout.service.ts`:

Add the import:

```ts
import { CRICKET_TEAM_LIMITS, knockoutSports } from './knockoutSports';
```

Replace `CreateKnockoutInput` with:

```ts
export type CreateKnockoutInput =
    | { sport?: 'badminton'; format: 'singles' | 'doubles'; matchConfig: { bestOf: 1 | 3 | 5; pointsToWin: 11 | 15 | 21 }; name?: string }
    | { sport: 'cricket'; matchConfig: { maxOvers: number; playersPerTeam: number }; teamCount: number; name?: string };
```

Replace the body of `_maxPlayers`:

```ts
    private _maxPlayers(k: IQuickKnockout): number {
        return knockoutSports[k.sport].maxPlayers(k);
    }
```

Replace `create` with:

```ts
    async create(hostId: string, input: CreateKnockoutInput): Promise<SuccessResponse<IQuickKnockout>> {
        const hostName = await this._playerName(hostId);
        const name = (input.name?.trim() || `${hostName.split(/\s+/)[0]}'s Knockout`).slice(0, 40);
        // ponytail: a join-code race after allocateJoinCode surfaces as E11000; at 32^6 codes, not worth a retry loop yet.
        const shared = {
            hostId,
            joinCode: await allocateJoinCode(),
            name,
            players: [{ playerKey: newId(), playerId: hostId, displayName: hostName }],
        };
        if (input.sport === 'cricket') {
            const { minTeams, maxTeams } = CRICKET_TEAM_LIMITS;
            if (!Number.isInteger(input.teamCount) || input.teamCount < minTeams || input.teamCount > maxTeams) {
                throw new BadRequestError('A cricket knockout needs 3 to 8 teams.');
            }
            const teams = Array.from({ length: input.teamCount }, (_, i) => ({ teamId: newId(), name: `Team ${i + 1}` }));
            const created = await quickKnockoutRepository.create({ ...shared, sport: 'cricket', format: 'teams', matchConfig: input.matchConfig, teams });
            return new SuccessResponse('Knockout created.', created);
        }
        const created = await quickKnockoutRepository.create({ ...shared, format: input.format, matchConfig: input.matchConfig });
        return new SuccessResponse('Knockout created.', created);
    }
```

In `grantAward`, replace the two badge lines:

```ts
        const badgeName = (QUICK_AWARD_BADGES as Record<string, string>)[input.badge];
        if (!badgeName) throw new BadRequestError('Pick one of the knockout badges.');
```

with:

```ts
        const badgeName = (QUICK_AWARD_BADGES as Record<string, string>)[input.badge];
        if (!badgeName || !knockoutSports[k.sport].awardBadges.includes(input.badge)) {
            throw new BadRequestError('Pick one of the knockout badges.');
        }
```

`matchConfig` fields are now optional, so `reconcile`'s `createForKnockout` call no longer type-checks. Until Task 4 replaces it, change that one line to:

```ts
                        matchConfig: { bestOf: k.matchConfig.bestOf as number, pointsToWin: k.matchConfig.pointsToWin as number },
```

- [ ] **Step 6: Update the create validator**

In `server/src/middlewares/validators/quickKnockout.validator.ts`, change the first import to `import { body, Meta, param } from 'express-validator';` and replace `createKnockoutValidator` with:

```ts
// `.if()` takes a validator-like condition: the rest of the chain runs only
// when it returns truthy. A body with no sport is badminton (older apps).
const cricket = (_value: unknown, { req }: Meta) => req.body?.sport === 'cricket';
const badminton = (_value: unknown, { req }: Meta) => req.body?.sport !== 'cricket';

export const createKnockoutValidator = [
    body('sport').optional().isIn(['badminton', 'cricket']).withMessage('sport must be badminton or cricket.'),
    body('format').if(badminton).isIn(['singles', 'doubles']).withMessage('format must be singles or doubles.'),
    body('matchConfig.bestOf').if(badminton).isIn([1, 3, 5]).withMessage('bestOf must be 1, 3 or 5.'),
    body('matchConfig.pointsToWin').if(badminton).isIn([11, 15, 21]).withMessage('pointsToWin must be 11, 15 or 21.'),
    body('matchConfig.maxOvers').if(cricket).isInt({ min: 1, max: 50 }).withMessage('maxOvers must be 1-50.'),
    body('matchConfig.playersPerTeam').if(cricket).isInt({ min: 2, max: 11 }).withMessage('playersPerTeam must be 2-11.'),
    body('teamCount').if(cricket).isInt({ min: 3, max: 8 }).withMessage('teamCount must be 3-8.'),
    body('name').optional().isString().trim().isLength({ min: 1, max: 40 }).withMessage('name must be 1-40 characters.'),
    ...validateRequest,
];
```

- [ ] **Step 7: Run the tests to verify they pass, badminton included**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutCricketCreate.test.ts test/quickKnockoutHttp.test.ts test/quickKnockoutRoster.test.ts test/quickKnockoutAwards.test.ts test/quickKnockoutScoring.test.ts test/quickKnockoutDrawService.test.ts test/quickJoinCode.test.ts test/careerFeedSummary.test.ts`
Expected: PASS.

- [ ] **Step 8: Types and lint**

Run: `cd /d/kria/server && pwd && npx tsc --noEmit && npm run lint:fix`
Expected: both exit 0.

- [ ] **Step 9: Commit**

```bash
cd /d/kria/server && pwd && git add src/models/quickKnockout.model.ts src/services/knockoutSports.ts src/services/quickKnockout.service.ts src/middlewares/validators/quickKnockout.validator.ts test/quickKnockoutCricketCreate.test.ts test/quickKnockoutHttp.test.ts && git commit -m "feat cricket knockouts can be created, with teams and their own award badges" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git status --short
```

---

### Task 2: Join a team, move players, add / remove / rename teams

**Files:**
- Modify: `server/src/services/quickKnockout.service.ts`
- Modify: `server/src/controllers/quickKnockout.controller.ts`, `server/src/routes/quickKnockout.route.ts`, `server/src/middlewares/validators/quickKnockout.validator.ts`
- Test: create `server/test/quickKnockoutCricketTeams.test.ts`; modify `server/test/quickKnockoutHttp.test.ts`

**Interfaces:**
- Consumes (Task 1): `IQuickKnockout.teams`, `IKnockoutPlayer.teamId`, `CRICKET_TEAM_LIMITS`, `cricketBody` in the HTTP test.
- Produces on `QuickKnockoutService`: `join(code, playerId, teamId?: string)`, `movePlayer(id, hostId, playerKey, teamId: string | null)`, `addTeam(id, hostId)`, `removeTeam(id, hostId, teamId)`, `renameTeam(id, hostId, teamId, name)` — each `Promise<SuccessResponse<IQuickKnockout>>`.
- Produces HTTP: `POST /quick-knockout/join/:joinCode { teamId? }`, `PATCH /quick-knockout/:id/players/:playerKey { teamId: string | null }`, `POST /quick-knockout/:id/teams`, `DELETE /quick-knockout/:id/teams/:teamId`, `PATCH /quick-knockout/:id/teams/:teamId { name }`.

- [ ] **Step 1: Write the failing service test**

Create `server/test/quickKnockoutCricketTeams.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import Player from '../src/models/player.model';
import { quickKnockoutService } from '../src/services/quickKnockout.service';

let seq = 0;
async function makePlayer(firstName: string) {
    seq += 1;
    const p = await Player.create({ firstName, lastName: 'T', email: `kt${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true });
    return p._id.toString();
}

async function cricketKnockout(teamCount = 3, playersPerTeam = 2) {
    const hostId = await makePlayer('Arjun');
    const k = (await quickKnockoutService.create(hostId, { sport: 'cricket', matchConfig: { maxOvers: 1, playersPerTeam }, teamCount })).data!;
    return { hostId, id: String(k._id), code: k.joinCode, teams: k.teams.map((t) => t.teamId), hostKey: k.players[0].playerKey };
}

type Roster = { players: { playerId?: unknown; playerKey: string; teamId?: string }[] };
const playerOf = (k: Roster, playerId: string) => k.players.find((p) => String(p.playerId) === playerId)!;

describe('joining a cricket knockout', () => {
    it('puts a joiner in the team they pick', async () => {
        const { code, teams } = await cricketKnockout();
        const rahul = await makePlayer('Rahul');
        const k = (await quickKnockoutService.join(code, rahul, teams[1])).data!;
        expect(playerOf(k, rahul).teamId).toBe(teams[1]);
    });

    it('puts a joiner who picks no team in Any team (older apps send none)', async () => {
        const { code } = await cricketKnockout();
        const rahul = await makePlayer('Rahul');
        const k = (await quickKnockoutService.join(code, rahul)).data!;
        expect(playerOf(k, rahul).teamId).toBeUndefined();
    });

    it('refuses a full team and an unknown one', async () => {
        const { code, teams } = await cricketKnockout(3, 2);
        await quickKnockoutService.join(code, await makePlayer('A'), teams[0]);
        await quickKnockoutService.join(code, await makePlayer('B'), teams[0]);
        await expect(quickKnockoutService.join(code, await makePlayer('C'), teams[0])).rejects.toThrow('That team is full.');
        await expect(quickKnockoutService.join(code, await makePlayer('D'), 'nope')).rejects.toThrow('That team is not in this knockout.');
    });

    it('refuses a team in a badminton knockout', async () => {
        const hostId = await makePlayer('Arjun');
        const k = (await quickKnockoutService.create(hostId, { format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 } })).data!;
        await expect(quickKnockoutService.join(k.joinCode, await makePlayer('R'), 'any')).rejects.toThrow('Teams are for cricket knockouts.');
    });

    it('a claimed guest keeps the team the host put them in', async () => {
        const { id, hostId, code, teams } = await cricketKnockout();
        const added = (await quickKnockoutService.addPlayer(id, hostId, { displayName: 'Sam' })).data!;
        const guestKey = added.players[added.players.length - 1].playerKey;
        await quickKnockoutService.movePlayer(id, hostId, guestKey, teams[2]);
        const sam = await makePlayer('Sam');
        const k = (await quickKnockoutService.claim(code, sam, guestKey)).data!;
        expect(playerOf(k, sam).teamId).toBe(teams[2]);
    });
});

describe('the host arranging teams', () => {
    it('moves a player into a team and back to Any team', async () => {
        const { id, hostId, teams, hostKey } = await cricketKnockout();
        let k = (await quickKnockoutService.movePlayer(id, hostId, hostKey, teams[0])).data!;
        expect(k.players[0].teamId).toBe(teams[0]);
        k = (await quickKnockoutService.movePlayer(id, hostId, hostKey, null)).data!;
        expect(k.players[0].teamId).toBeUndefined();
    });

    it('refuses a move into a full team, but a player already there may stay', async () => {
        const { id, hostId, code, teams, hostKey } = await cricketKnockout(3, 2);
        await quickKnockoutService.movePlayer(id, hostId, hostKey, teams[0]);
        await quickKnockoutService.join(code, await makePlayer('B'), teams[0]);
        await expect(quickKnockoutService.movePlayer(id, hostId, hostKey, teams[0])).resolves.toBeDefined();
        const added = (await quickKnockoutService.addPlayer(id, hostId, { displayName: 'Sam' })).data!;
        const samKey = added.players[added.players.length - 1].playerKey;
        await expect(quickKnockoutService.movePlayer(id, hostId, samKey, teams[0])).rejects.toThrow('That team is full.');
    });

    it('only the host arranges teams', async () => {
        const { id, teams, hostKey } = await cricketKnockout();
        await expect(quickKnockoutService.movePlayer(id, await makePlayer('R'), hostKey, teams[0])).rejects.toThrow('Only the host can do that.');
        await expect(quickKnockoutService.addTeam(id, await makePlayer('S'))).rejects.toThrow('Only the host can do that.');
    });

    it('adds a team under the first free default name, up to 8', async () => {
        const { id, hostId, teams } = await cricketKnockout(3);
        let k = (await quickKnockoutService.addTeam(id, hostId)).data!;
        expect(k.teams.map((t) => t.name)).toEqual(['Team 1', 'Team 2', 'Team 3', 'Team 4']);
        await quickKnockoutService.removeTeam(id, hostId, teams[1]);
        k = (await quickKnockoutService.addTeam(id, hostId)).data!;
        expect(k.teams.map((t) => t.name)).toEqual(['Team 1', 'Team 3', 'Team 4', 'Team 5']);
        for (let i = k.teams.length; i < 8; i++) await quickKnockoutService.addTeam(id, hostId);
        await expect(quickKnockoutService.addTeam(id, hostId)).rejects.toThrow('A knockout can have at most 8 teams.');
    });

    it('removing a team sends its players to Any team, never below 3 teams', async () => {
        const { id, hostId, teams, hostKey } = await cricketKnockout(4);
        await quickKnockoutService.movePlayer(id, hostId, hostKey, teams[3]);
        const k = (await quickKnockoutService.removeTeam(id, hostId, teams[3])).data!;
        expect(k.teams).toHaveLength(3);
        expect(k.players[0].teamId).toBeUndefined();
        await expect(quickKnockoutService.removeTeam(id, hostId, teams[0])).rejects.toThrow('A knockout needs at least 3 teams.');
    });

    it('refuses to remove a team when the rest cannot hold everyone', async () => {
        const { id, hostId, teams } = await cricketKnockout(4, 2);
        for (let i = 1; i < 7; i++) await quickKnockoutService.addPlayer(id, hostId, { displayName: `G${i}` });
        // 7 players; 3 teams of 2 hold 6.
        await expect(quickKnockoutService.removeTeam(id, hostId, teams[0])).rejects.toThrow('Remove some players first.');
    });

    it('renames a team: trimmed, 1-20 characters, unique ignoring case', async () => {
        const { id, hostId, teams } = await cricketKnockout();
        const k = (await quickKnockoutService.renameTeam(id, hostId, teams[0], '  Strikers ')).data!;
        expect(k.teams[0].name).toBe('Strikers');
        await expect(quickKnockoutService.renameTeam(id, hostId, teams[1], 'STRIKERS')).rejects.toThrow('Another team already has that name.');
        await expect(quickKnockoutService.renameTeam(id, hostId, teams[1], '   ')).rejects.toThrow('A team name is 1 to 20 characters.');
        await expect(quickKnockoutService.renameTeam(id, hostId, teams[1], 'x'.repeat(21))).rejects.toThrow('A team name is 1 to 20 characters.');
        await expect(quickKnockoutService.renameTeam(id, hostId, teams[1], 'Team 2')).resolves.toBeDefined(); // its own name
    });
});
```

Append to `server/test/quickKnockoutHttp.test.ts` (inside the describe):

```ts
    it('cricket teams over HTTP: join a team, move, add, rename, remove', async () => {
        const host = await authed('Arjun');
        const k = (await request(app).post('/quick-knockout').set(as(host.token)).send(cricketBody)).body.data.data;
        const [t1, t2] = k.teams.map((t: { teamId: string }) => t.teamId);
        const rahul = await authed('Rahul');
        const joined = await request(app).post(`/quick-knockout/join/${k.joinCode}`).set(as(rahul.token)).send({ teamId: t1 });
        expect(joined.status).toBe(200);
        const rahulKey = joined.body.data.data.players.find((p: { playerId?: string }) => p.playerId === rahul.id).playerKey;

        expect((await request(app).patch(`/quick-knockout/${k._id}/players/${rahulKey}`).set(as(host.token)).send({})).status).toBe(422);
        expect((await request(app).patch(`/quick-knockout/${k._id}/players/${rahulKey}`).set(as(host.token)).send({ teamId: null })).status).toBe(200);
        expect((await request(app).post(`/quick-knockout/${k._id}/teams`).set(as(host.token))).body.data.data.teams).toHaveLength(5);
        expect((await request(app).patch(`/quick-knockout/${k._id}/teams/${t2}`).set(as(host.token)).send({ name: '' })).status).toBe(422);
        const renamed = await request(app).patch(`/quick-knockout/${k._id}/teams/${t2}`).set(as(host.token)).send({ name: 'Royals' });
        expect(renamed.body.data.data.teams[1].name).toBe('Royals');
        expect((await request(app).delete(`/quick-knockout/${k._id}/teams/${t2}`).set(as(host.token))).body.data.data.teams).toHaveLength(4);
    });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutCricketTeams.test.ts test/quickKnockoutHttp.test.ts`
Expected: FAIL — `movePlayer` / `addTeam` / … are not functions; join ignores `teamId`.

- [ ] **Step 3: Implement the service methods**

In `server/src/services/quickKnockout.service.ts`, add these private helpers after `_hasAccount`:

```ts
    private _assertCricket(k: IQuickKnockout): void {
        if (k.sport !== 'cricket') throw new BadRequestError('Teams are for cricket knockouts.');
    }

    private _assertTeamExists(k: IQuickKnockout, teamId: string): void {
        if (!k.teams.some((t) => t.teamId === teamId)) throw new NotFoundError('That team is not in this knockout.');
    }

    /**
     * Room for one more, not counting `exceptKey` (a player already in it).
     * Called after _clearDraw, so the draw's own placements don't count.
     */
    private _assertTeamHasRoom(k: IQuickKnockout, teamId: string, exceptKey?: string): void {
        this._assertTeamExists(k, teamId);
        const size = k.players.filter((p) => p.teamId === teamId && p.playerKey !== exceptKey).length;
        if (size >= (k.matchConfig.playersPerTeam ?? 0)) throw new BadRequestError('That team is full.');
    }
```

Replace `join` with:

```ts
    async join(code: string, playerId: string, teamId?: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await quickKnockoutRepository.getByJoinCode(code);
        if (!k) throw new NotFoundError('Knockout not found.');
        this._assertWaiting(k);
        if (this._hasAccount(k, playerId)) throw new BadRequestError('You are already in this knockout.');
        if (k.players.length >= this._maxPlayers(k)) throw new BadRequestError('This knockout is full.');

        this._clearDraw(k);
        // No teamId is Any team — and what an older app always sends.
        if (teamId !== undefined) {
            this._assertCricket(k);
            this._assertTeamHasRoom(k, teamId);
        }
        k.players.push({
            playerKey: newId(),
            playerId: new mongoose.Types.ObjectId(playerId),
            displayName: await this._playerName(playerId),
            ...(teamId ? { teamId } : {}),
        });
        return new SuccessResponse('Joined.', await this.persist(k));
    }
```

Add after `unpair`:

```ts
    /** Cricket: put a player in a team, or back in Any team (`null`). */
    async movePlayer(id: string, hostId: string, playerKey: string, teamId: string | null): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        this._assertWaiting(k);
        this._assertCricket(k);
        const player = k.players.find((p) => p.playerKey === playerKey);
        if (!player) throw new NotFoundError('That player is not in this knockout.');

        this._clearDraw(k);
        if (teamId !== null) this._assertTeamHasRoom(k, teamId, playerKey);
        player.teamId = teamId ?? undefined;
        player.drawn = undefined;
        return new SuccessResponse('Player moved.', await this.persist(k));
    }

    async addTeam(id: string, hostId: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        this._assertWaiting(k);
        this._assertCricket(k);
        if (k.teams.length >= CRICKET_TEAM_LIMITS.maxTeams) throw new BadRequestError('A knockout can have at most 8 teams.');

        const taken = new Set(k.teams.map((t) => t.name.toLowerCase()));
        let n = k.teams.length + 1;
        while (taken.has(`team ${n}`)) n++;
        k.teams.push({ teamId: newId(), name: `Team ${n}` });
        this._clearDraw(k);
        return new SuccessResponse('Team added.', await this.persist(k));
    }

    async removeTeam(id: string, hostId: string, teamId: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        this._assertWaiting(k);
        this._assertCricket(k);
        this._assertTeamExists(k, teamId);
        if (k.teams.length <= CRICKET_TEAM_LIMITS.minTeams) throw new BadRequestError('A knockout needs at least 3 teams.');
        // Otherwise the draw could never place everyone.
        if (k.players.length > (k.teams.length - 1) * (k.matchConfig.playersPerTeam ?? 0)) {
            throw new BadRequestError('Remove some players first.');
        }

        k.teams = k.teams.filter((t) => t.teamId !== teamId).map((t) => ({ teamId: t.teamId, name: t.name }));
        for (const p of k.players) {
            if (p.teamId !== teamId) continue;
            p.teamId = undefined;
            p.drawn = undefined;
        }
        this._clearDraw(k);
        return new SuccessResponse('Team removed.', await this.persist(k));
    }

    /** A rename moves nobody, so the draw stands. */
    async renameTeam(id: string, hostId: string, teamId: string, name: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        this._assertWaiting(k);
        this._assertCricket(k);
        const team = k.teams.find((t) => t.teamId === teamId);
        if (!team) throw new NotFoundError('That team is not in this knockout.');
        const trimmed = name.trim();
        if (trimmed.length < 1 || trimmed.length > 20) throw new BadRequestError('A team name is 1 to 20 characters.');
        if (k.teams.some((t) => t.teamId !== teamId && t.name.toLowerCase() === trimmed.toLowerCase())) {
            throw new BadRequestError('Another team already has that name.');
        }
        team.name = trimmed;
        return new SuccessResponse('Team renamed.', await this.persist(k));
    }
```

- [ ] **Step 4: Wire the routes**

In `server/src/middlewares/validators/quickKnockout.validator.ts`, replace `export const knockoutCodeValidator = [joinCode, ...validateRequest];` with:

```ts
export const joinKnockoutValidator = [
    joinCode,
    body('teamId').optional().isString().trim().notEmpty().withMessage('teamId must be a team id.'),
    ...validateRequest,
];
```

and append:

```ts
export const moveKnockoutPlayerValidator = [
    id,
    param('playerKey').isString().trim().notEmpty().withMessage('playerKey is required.'),
    body('teamId').custom((v: unknown) => v === null || (typeof v === 'string' && v.trim().length > 0))
        .withMessage('teamId must be a team id or null.'),
    ...validateRequest,
];

const teamIdParam = param('teamId').isString().trim().notEmpty().withMessage('teamId is required.');
export const knockoutTeamValidator = [id, teamIdParam, ...validateRequest];
export const renameKnockoutTeamValidator = [
    id,
    teamIdParam,
    body('name').isString().trim().isLength({ min: 1, max: 20 }).withMessage('name must be 1-20 characters.'),
    ...validateRequest,
];
```

In `server/src/controllers/quickKnockout.controller.ts`, replace `joinKnockout` and append the four handlers:

```ts
export const joinKnockout = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.join(req.params.joinCode, req.player._id, req.body?.teamId));
};
```

```ts
export const moveKnockoutPlayer = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.movePlayer(req.params.id, req.player._id, req.params.playerKey, req.body.teamId));
};
export const addKnockoutTeam = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.addTeam(req.params.id, req.player._id));
};
export const removeKnockoutTeam = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.removeTeam(req.params.id, req.player._id, req.params.teamId));
};
export const renameKnockoutTeam = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.renameTeam(req.params.id, req.player._id, req.params.teamId, req.body.name));
};
```

In `server/src/routes/quickKnockout.route.ts`, change the join route's validator to `v.joinKnockoutValidator`, and add after the `DELETE /:id/players/:playerKey` route:

```ts
quickKnockoutRouter.patch('/:id/players/:playerKey', v.moveKnockoutPlayerValidator, isPlayerLoggedIn, asyncHandler(c.moveKnockoutPlayer));
quickKnockoutRouter.post('/:id/teams', v.knockoutIdValidator, isPlayerLoggedIn, asyncHandler(c.addKnockoutTeam));
quickKnockoutRouter.delete('/:id/teams/:teamId', v.knockoutTeamValidator, isPlayerLoggedIn, asyncHandler(c.removeKnockoutTeam));
quickKnockoutRouter.patch('/:id/teams/:teamId', v.renameKnockoutTeamValidator, isPlayerLoggedIn, asyncHandler(c.renameKnockoutTeam));
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutCricketTeams.test.ts test/quickKnockoutHttp.test.ts test/quickKnockoutRoster.test.ts`
Expected: PASS.

- [ ] **Step 6: Types and lint**

Run: `cd /d/kria/server && pwd && npx tsc --noEmit && npm run lint:fix`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
cd /d/kria/server && pwd && git add src/services/quickKnockout.service.ts src/controllers/quickKnockout.controller.ts src/routes/quickKnockout.route.ts src/middlewares/validators/quickKnockout.validator.ts test/quickKnockoutCricketTeams.test.ts test/quickKnockoutHttp.test.ts && git commit -m "feat cricket knockout players pick a team and the host arranges teams" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git status --short
```

---

### Task 3: The cricket draw

**Files:**
- Modify: `server/src/services/quickKnockout.service.ts`
- Test: create `server/test/quickKnockoutCricketDraw.test.ts`

**Interfaces:**
- Consumes (Tasks 1–2): `movePlayer`, `renameTeam`, `join`, `knockoutSports[sport].minEntrants`.
- Produces: `draw(id, hostId)` for `format: 'teams'` — entrants are the teams (`entrantId === teamId`); `drawn: true` on dealt players. `_clearDraw` now also returns `drawn` players to Any team.

- [ ] **Step 1: Write the failing test**

Create `server/test/quickKnockoutCricketDraw.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import Player from '../src/models/player.model';
import { quickKnockoutService } from '../src/services/quickKnockout.service';

let seq = 0;
async function makePlayer(firstName: string) {
    seq += 1;
    const p = await Player.create({ firstName, lastName: 'T', email: `kdc${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true });
    return p._id.toString();
}

/** Host plus `guests`, everyone in Any team. `keys[0]` is the host. */
async function cricketKnockout(teamCount: number, playersPerTeam: number, guests: number) {
    const hostId = await makePlayer('Arjun');
    const created = (await quickKnockoutService.create(hostId, { sport: 'cricket', matchConfig: { maxOvers: 1, playersPerTeam }, teamCount })).data!;
    const id = String(created._id);
    for (let i = 1; i <= guests; i++) await quickKnockoutService.addPlayer(id, hostId, { displayName: `G${i}` });
    const k = (await quickKnockoutService.getById(id, hostId)).data!;
    return { hostId, id, code: created.joinCode, teams: k.teams.map((t) => t.teamId), keys: k.players.map((p) => p.playerKey) };
}

type Roster = { teams: { teamId: string }[]; players: { playerKey: string; teamId?: string; drawn?: boolean }[] };
const sizes = (k: Roster) => k.teams.map((t) => k.players.filter((p) => p.teamId === t.teamId).length);

describe('the cricket draw', () => {
    it('deals Any-team players evenly and makes the teams the entrants', async () => {
        const { id, hostId, teams } = await cricketKnockout(3, 4, 8); // 9 players
        const k = (await quickKnockoutService.draw(id, hostId)).data!;
        expect(sizes(k)).toEqual([3, 3, 3]);
        expect(k.players.every((p) => p.drawn)).toBe(true);
        expect(k.entrants.map((e) => e.entrantId)).toEqual(teams);
        for (const e of k.entrants) {
            expect(e.playerKeys).toEqual(k.players.filter((p) => p.teamId === e.entrantId).map((p) => p.playerKey));
        }
        expect(k.fixtures.filter((f) => f.round === 1 && f.bye)).toHaveLength(1);
        expect(k.status).toBe('waiting');
    });

    it('fills the smallest team first and never overfills', async () => {
        const { id, hostId, teams, keys } = await cricketKnockout(3, 3, 6); // 7 players
        for (const key of keys.slice(0, 3)) await quickKnockoutService.movePlayer(id, hostId, key, teams[0]);
        await quickKnockoutService.movePlayer(id, hostId, keys[3], teams[1]);
        const k = (await quickKnockoutService.draw(id, hostId)).data!;
        expect(sizes(k)).toEqual([3, 2, 2]);
        expect(k.players.filter((p) => p.teamId === teams[0]).map((p) => p.playerKey)).toEqual(keys.slice(0, 3));
    });

    it('refuses when a team would have fewer than 2', async () => {
        const { id, hostId } = await cricketKnockout(3, 4, 4); // 5 players
        await expect(quickKnockoutService.draw(id, hostId)).rejects.toThrow('Every team needs at least 2 players.');
    });

    it('a reshuffle deals only the drawn players again', async () => {
        const { id, hostId, teams, keys } = await cricketKnockout(3, 3, 5); // 6 players
        await quickKnockoutService.movePlayer(id, hostId, keys[0], teams[2]);
        await quickKnockoutService.draw(id, hostId);
        const k = (await quickKnockoutService.draw(id, hostId)).data!;
        const host = k.players.find((p) => p.playerKey === keys[0])!;
        expect(host.teamId).toBe(teams[2]);
        expect(host.drawn).toBeFalsy();
        expect(k.players.filter((p) => p.drawn)).toHaveLength(5);
        expect(sizes(k)).toEqual([2, 2, 2]);
    });

    it('a roster change sends drawn players back to Any team and clears the bracket', async () => {
        const { id, hostId, code, teams, keys } = await cricketKnockout(3, 3, 5);
        await quickKnockoutService.movePlayer(id, hostId, keys[0], teams[0]);
        await quickKnockoutService.draw(id, hostId);
        const k = (await quickKnockoutService.join(code, await makePlayer('Late'))).data!;
        expect(k.entrants).toHaveLength(0);
        expect(k.fixtures).toHaveLength(0);
        expect(k.players.filter((p) => p.teamId).map((p) => p.playerKey)).toEqual([keys[0]]);
        expect(k.players.some((p) => p.drawn)).toBe(false);
    });

    it('a move after the draw clears it, but a rename keeps it', async () => {
        const { id, hostId, teams, keys } = await cricketKnockout(3, 3, 5);
        await quickKnockoutService.draw(id, hostId);
        expect((await quickKnockoutService.renameTeam(id, hostId, teams[0], 'Strikers')).data!.entrants).toHaveLength(3);
        expect((await quickKnockoutService.movePlayer(id, hostId, keys[0], teams[1])).data!.entrants).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutCricketDraw.test.ts`
Expected: FAIL — the draw makes one entrant per player.

- [ ] **Step 3: Implement**

In `server/src/services/quickKnockout.service.ts`:

Change the bracket import to `import { buildBracket, pairUp, shuffle } from '../shared/bracket/knockoutDraw';` and change the model import to `import { IQuickKnockout } from '../models/quickKnockout.model';` (`KNOCKOUT_LIMITS` is no longer used here).

Replace `_clearDraw` with:

```ts
    /**
     * Who is where changed, so the preview is wrong: draw again. Host-made
     * pairs and chosen teams stay; the draw's own team placements go back to
     * Any team.
     */
    private _clearDraw(k: IQuickKnockout): void {
        k.entrants = [];
        k.fixtures = [];
        k.roundNames = [];
        k.pairs = k.pairs
            .filter((p) => p.byHost)
            .map((p) => ({ pairId: p.pairId, playerKeys: [...p.playerKeys], byHost: true }));
        this._undeal(k);
    }

    private _undeal(k: IQuickKnockout): void {
        for (const p of k.players) {
            if (!p.drawn) continue;
            p.teamId = undefined;
            p.drawn = undefined;
        }
    }

    /**
     * Cricket: deal the draw's placements again from scratch — each Any-team
     * player to the smallest team with room, so sizes even out. Self-picked
     * and host-placed players stay. The teams are the entrants.
     */
    private _dealTeams(k: IQuickKnockout): { entrantId: string; playerKeys: string[] }[] {
        this._undeal(k);
        const cap = k.matchConfig.playersPerTeam ?? 0;
        const size = new Map(k.teams.map((t) => [t.teamId, 0]));
        const sizeOf = (teamId: string) => size.get(teamId) ?? 0;
        for (const p of k.players) if (p.teamId) size.set(p.teamId, sizeOf(p.teamId) + 1);

        for (const p of shuffle(k.players.filter((x) => !x.teamId))) {
            // Shuffled first, so equal sizes break at random; then the smallest wins.
            const open = shuffle(k.teams.filter((t) => sizeOf(t.teamId) < cap));
            if (open.length === 0) throw new BadRequestError('Too many players for these teams.');
            const team = open.reduce((a, b) => (sizeOf(b.teamId) < sizeOf(a.teamId) ? b : a));
            p.teamId = team.teamId;
            p.drawn = true;
            size.set(team.teamId, sizeOf(team.teamId) + 1);
        }
        if ([...size.values()].some((n) => n < 2)) throw new BadRequestError('Every team needs at least 2 players.');

        return k.teams.map((t) => ({
            entrantId: t.teamId,
            playerKeys: k.players.filter((p) => p.teamId === t.teamId).map((p) => p.playerKey),
        }));
    }
```

Replace `draw` with:

```ts
    /** Draw, or reshuffle: a preview only — nothing is played until Start. */
    async draw(id: string, hostId: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        this._assertWaiting(k);

        let entrants: { entrantId: string; playerKeys: string[] }[];
        if (k.format === 'teams') {
            entrants = this._dealTeams(k);
        } else {
            let teams: string[][];
            if (k.format === 'doubles') {
                if (k.players.length % 2 !== 0) throw new BadRequestError('Add one more player or remove one to draw.');
                const hostPairs = k.pairs.filter((p) => p.byHost).map((p) => ({ pairId: p.pairId, playerKeys: [...p.playerKeys], byHost: true }));
                const taken = new Set(hostPairs.flatMap((p) => p.playerKeys));
                const loose = k.players.map((p) => p.playerKey).filter((key) => !taken.has(key));
                const drawn = pairUp(loose).map((keys) => ({ pairId: newId(), playerKeys: keys, byHost: false }));
                k.pairs = [...hostPairs, ...drawn];
                teams = k.pairs.map((p) => [...p.playerKeys]);
            } else {
                teams = k.players.map((p) => [p.playerKey]);
            }
            entrants = teams.map((playerKeys) => ({ entrantId: newId(), playerKeys }));
        }
        if (entrants.length < knockoutSports[k.sport].minEntrants) throw new BadRequestError('A knockout needs at least 3 entrants.');

        const { fixtures, roundNames } = buildBracket(entrants.map((e) => e.entrantId));
        k.entrants = entrants;
        k.fixtures = fixtures.map((f) => ({ ...f, fixtureId: newId() }));
        k.roundNames = roundNames;
        return new SuccessResponse('Drawn.', await this.persist(k));
    }
```

- [ ] **Step 4: Run the tests to verify they pass, badminton draw included**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutCricketDraw.test.ts test/quickKnockoutCricketTeams.test.ts test/quickKnockoutDrawService.test.ts test/quickKnockoutRoster.test.ts`
Expected: PASS.

- [ ] **Step 5: Types and lint**

Run: `cd /d/kria/server && pwd && npx tsc --noEmit && npm run lint:fix`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
cd /d/kria/server && pwd && git add src/services/quickKnockout.service.ts test/quickKnockoutCricketDraw.test.ts && git commit -m "feat cricket knockout draw deals the rest into teams and brackets the teams" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git status --short
```

---

### Task 4: Cricket fixture matches, reconcile, and the tie pick

**Files:**
- Modify: `server/src/models/quickMatch.model.ts`
- Modify: `server/src/services/quickMatch.service.ts`
- Modify: `server/src/services/quickKnockout.service.ts`
- Modify: `server/src/controllers/quickKnockout.controller.ts`, `server/src/routes/quickKnockout.route.ts`, `server/src/middlewares/validators/quickKnockout.validator.ts`
- Test: create `server/test/quickKnockoutCricketBracket.test.ts`; modify `server/test/quickKnockoutHttp.test.ts`, `server/test/quickMatchKnockoutLocks.test.ts`

**Interfaces:**
- Consumes (Tasks 1–3): `knockoutSports[sport].sideName / matchConfig / hasStarted`, `movePlayer`, cricket `draw`.
- Produces: `IQuickMatch.tieWinnerSideId?: string`; `quickMatchService.createForKnockout({ sport: 'badminton' | 'cricket'; hostId; knockoutId; fixtureId; sides; matchConfig: Record<string, number> })`; `quickKnockoutService.settleTie(id, hostId, { fixtureId, entrantId }): Promise<SuccessResponse<IQuickKnockout>>`; HTTP `POST /quick-knockout/:id/tie { fixtureId, entrantId }`.

- [ ] **Step 1: Write the failing test**

Create `server/test/quickKnockoutCricketBracket.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import Player from '../src/models/player.model';
import QuickMatchModel from '../src/models/quickMatch.model';
import { QuickKnockoutModel } from '../src/models/quickKnockout.model';
import { quickKnockoutService } from '../src/services/quickKnockout.service';
import { knockoutSports } from '../src/services/knockoutSports';
import { quickCricketScoringService } from '../src/sports/cricket/services/quickCricketScoring.service';

let seq = 0;
async function makePlayer(firstName: string) {
    seq += 1;
    const p = await Player.create({ firstName, lastName: 'T', email: `kcb${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true });
    return p._id.toString();
}

/** A started cricket knockout of Kria players whose teams have exactly these squad sizes. */
async function startedCricket(sizes: number[]) {
    const hostId = await makePlayer('Host');
    const created = (await quickKnockoutService.create(hostId, { sport: 'cricket', matchConfig: { maxOvers: 1, playersPerTeam: 3 }, teamCount: sizes.length, name: 'Cup' })).data!;
    const id = String(created._id);
    const total = sizes.reduce((a, b) => a + b, 0);
    for (let i = 1; i < total; i++) await quickKnockoutService.addPlayer(id, hostId, { playerId: await makePlayer(`P${i}`) });
    const k = (await quickKnockoutService.getById(id, hostId)).data!;
    const keys = k.players.map((p) => p.playerKey);
    let next = 0;
    for (const [t, size] of sizes.entries()) {
        for (let n = 0; n < size; n++) await quickKnockoutService.movePlayer(id, hostId, keys[next++], k.teams[t].teamId);
    }
    await quickKnockoutService.draw(id, hostId);
    await quickKnockoutService.start(id, hostId);
    return { id, hostId };
}

const live = (id: string) => QuickMatchModel.find({ knockoutId: id, status: 'live' });
const fixtureOf = async (id: string, fixtureId?: string) => (await QuickKnockoutModel.findById(id))!.fixtures.find((f) => f.fixtureId === fixtureId)!;

/** Finish a match without playing it: this task is the bracket, not scoring. */
async function finish(matchId: unknown, outcome: 'side1' | 'side2' | 'tied') {
    await QuickMatchModel.updateOne({ _id: matchId }, { $set: { status: 'completed', outcome } });
}

/** Toss, both lineups from the slots, and one dot ball. */
async function bowlOne(matchId: string, hostId: string) {
    const m = (await QuickMatchModel.findById(matchId))!;
    await quickCricketScoringService.recordToss(matchId, hostId, { winnerSideId: m.sides[0].sideId, decision: 'bat' });
    for (const side of m.sides) {
        await quickCricketScoringService.recordLineup(matchId, hostId, {
            sideId: side.sideId,
            players: side.slots.map((s) => ({ slotId: s.slotId, playerId: s.playerId ? String(s.playerId) : undefined, name: s.displayName })),
        });
    }
    await quickCricketScoringService.recordBall(matchId, hostId, { batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'bowlB', runs: 0 });
}

type CricketShape = { sport: string; teams: { team1Id: string; team2Id: string }; matchConfig: { maxOvers: number; playersPerTeam: number }; honoursSquadSize?: boolean };

describe('cricket knockout fixtures', () => {
    it('are cricket quick matches between two teams, played to the smaller squad', async () => {
        const { id } = await startedCricket([3, 2, 2, 2]);
        const k = (await QuickKnockoutModel.findById(id))!;
        const matches = await live(id);
        expect(matches).toHaveLength(2);
        // The 3-player team plays a 2-player one somewhere.
        expect(matches.some((m) => m.sides[0].slots.length !== m.sides[1].slots.length)).toBe(true);
        for (const m of matches) {
            const c = m as unknown as CricketShape;
            const f = k.fixtures.find((x) => x.fixtureId === m.fixtureId)!;
            expect(c.sport).toBe('cricket');
            expect([c.teams.team1Id, c.teams.team2Id]).toEqual([f.entrantA, f.entrantB]);
            expect(m.sides.map((s) => s.name)).toEqual([f.entrantA, f.entrantB].map((e) => k.teams.find((t) => t.teamId === e)!.name));
            expect(c.matchConfig.maxOvers).toBe(1);
            expect(c.matchConfig.playersPerTeam).toBe(Math.min(m.sides[0].slots.length, m.sides[1].slots.length));
            expect(c.honoursSquadSize).toBe(true);
            expect(m.sides.flatMap((s) => s.slots).every((s) => s.playerId)).toBe(true);
        }
    });

    it('a win sends the winning team on', async () => {
        const { id } = await startedCricket([2, 2, 2, 2]);
        const [m1, m2] = await live(id);
        await finish(m1._id, 'side2');
        await finish(m2._id, 'side1');
        const k = await quickKnockoutService.reconcile(id);
        expect((await fixtureOf(id, m1.fixtureId)).winnerEntrantId).toBe(m1.sides[1].sideId);
        expect((await fixtureOf(id, m2.fixtureId)).winnerEntrantId).toBe(m2.sides[0].sideId);
        const final = k.fixtures.find((f) => f.round === 2)!;
        expect([final.entrantA, final.entrantB].sort()).toEqual([m1.sides[1].sideId, m2.sides[0].sideId].sort());
        expect(final.quickMatchId).toBeDefined();
    });

    it('a tie sends nobody on until the host picks, and stays a tie', async () => {
        const { id, hostId } = await startedCricket([2, 2, 2]);
        const [m] = await live(id);
        await finish(m._id, 'tied');
        await quickKnockoutService.reconcile(id);
        expect((await fixtureOf(id, m.fixtureId)).winnerEntrantId).toBeUndefined();
        expect(await live(id)).toHaveLength(0);

        const picked = m.sides[1].sideId;
        await quickKnockoutService.settleTie(id, hostId, { fixtureId: m.fixtureId!, entrantId: picked });
        expect((await fixtureOf(id, m.fixtureId)).winnerEntrantId).toBe(picked);
        const after = (await QuickMatchModel.findById(m._id))!;
        expect(after.outcome).toBe('tied');
        expect(after.tieWinnerSideId).toBe(picked);
        expect(await live(id)).toHaveLength(1); // the final
    });

    it('refuses the tie pick for an untied match, a non-host, another team, or a second pick', async () => {
        const { id, hostId } = await startedCricket([2, 2, 2]);
        const [m] = await live(id);
        const pick = { fixtureId: m.fixtureId!, entrantId: m.sides[0].sideId };
        await expect(quickKnockoutService.settleTie(id, hostId, pick)).rejects.toThrow('This match is not tied.');
        await finish(m._id, 'tied');
        await expect(quickKnockoutService.settleTie(id, await makePlayer('R'), pick)).rejects.toThrow('Only the host can do that.');
        await expect(quickKnockoutService.settleTie(id, hostId, { ...pick, entrantId: 'someone-else' })).rejects.toThrow('Pick one of the two teams.');
        await quickKnockoutService.settleTie(id, hostId, pick);
        await expect(quickKnockoutService.settleTie(id, hostId, pick)).rejects.toThrow('The tie is already settled.');
    });

    it('a cricket match has started only while a ball is stored — not after the first ball is undone', async () => {
        const { id, hostId } = await startedCricket([2, 2, 2]);
        const [m] = await live(id);
        const started = async () => knockoutSports.cricket.hasStarted((await QuickMatchModel.findById(m._id))!);
        expect(await started()).toBe(false);
        await bowlOne(String(m._id), hostId);
        expect(await started()).toBe(true);
        await quickCricketScoringService.undoLastBall(String(m._id), hostId);
        expect(await started()).toBe(false);
    });
});
```

Append to `server/test/quickKnockoutHttp.test.ts` (inside the describe):

```ts
    it('the tie pick validates its body', async () => {
        const host = await authed('Arjun');
        const k = (await request(app).post('/quick-knockout').set(as(host.token)).send(cricketBody)).body.data.data;
        expect((await request(app).post(`/quick-knockout/${k._id}/tie`).set(as(host.token)).send({})).status).toBe(422);
    });
```

In `server/test/quickMatchKnockoutLocks.test.ts`, add `sport: 'badminton',` as the first key of both `createForKnockout({ … })` calls.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutCricketBracket.test.ts`
Expected: FAIL — fixture matches are badminton; `settleTie` is not a function.

- [ ] **Step 3: Add `tieWinnerSideId` to the quick match**

In `server/src/models/quickMatch.model.ts`, add to the base schema after `fixtureId`:

```ts
        // Set only by a knockout's tie pick (QuickKnockoutService.settleTie):
        // the side that went through a tied match. `outcome` stays 'tied',
        // so careers still record the tie.
        tieWinnerSideId: { type: String },
```

and to `IQuickMatch` after `fixtureId?: string;`:

```ts
    tieWinnerSideId?: string;
```

- [ ] **Step 4: Generalise `createForKnockout`**

In `server/src/services/quickMatch.service.ts`, replace `createForKnockout` with:

```ts
    async createForKnockout(input: {
        sport: 'badminton' | 'cricket';
        hostId: string;
        knockoutId: string;
        fixtureId: string;
        sides: (CreateQuickMatchInput['sides'][number] & { sideId: string })[];
        matchConfig: Record<string, number>;
    }): Promise<IQuickMatch | null> {
        const sides = this._buildSides(input.sides, input.sides.map((s) => s.sideId));
        const doc: Record<string, unknown> = {
            hostId: input.hostId,
            sides,
            matchConfig: input.matchConfig,
            knockoutId: input.knockoutId,
            fixtureId: input.fixtureId,
        };
        // teams mirrors the side ids so processBall can read team1Id/team2Id —
        // the only two match fields it reads for logic.
        if (input.sport === 'cricket') doc.teams = { team1Id: sides[0].sideId, team2Id: sides[1].sideId };
        for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
            try {
                return await this._repository.create(input.sport, { ...doc, joinCode: await allocateJoinCode() });
            } catch (err) {
                const e = err as { code?: number; keyPattern?: Record<string, unknown> };
                if (e.code !== 11000) throw err;
                if (e.keyPattern?.knockoutId) return null;
                // Join code collided — try another.
            }
        }
        throw new BadRequestError('Could not allocate a join code. Please retry.');
    }
```

Keep its existing doc comment above it.

- [ ] **Step 5: Reconcile by sport, the tie, and `settleTie`**

In `server/src/services/quickKnockout.service.ts`:

Change the model import to `import { IKnockoutFixture, IQuickKnockout } from '../models/quickKnockout.model';` and the quick-match import to `import { IQuickMatch } from '../models/quickMatch.model';`. Delete the `hasPoints` function. Add, where `hasPoints` was:

```ts
/** Who a finished match sends on. A tie sends nobody until the host picks (settleTie). */
function winnerOf(m: IQuickMatch, f: IKnockoutFixture): string | undefined {
    if (m.outcome === 'side1') return f.entrantA;
    if (m.outcome === 'side2') return f.entrantB;
    if (m.outcome === 'tied' && (m.tieWinnerSideId === f.entrantA || m.tieWinnerSideId === f.entrantB)) return m.tieWinnerSideId;
    return undefined;
}
```

Replace `_side` with:

```ts
    /** A match side for an entrant, named by the sport: a player, a pair, or a team. */
    private _side(k: IQuickKnockout, entrantId: string) {
        const players = this._entrantPlayers(k, entrantId);
        return {
            name: knockoutSports[k.sport].sideName(k, entrantId, players),
            slots: players.map((p) => ({ playerId: p.playerId ? String(p.playerId) : undefined, displayName: p.displayName })),
        };
    }
```

In `reconcile`, add `const sport = knockoutSports[k.sport];` right after the `if (k.status !== 'live' && k.status !== 'completed') return k;` line, then replace the inner fixture body from `let m = matches.get(f.fixtureId);` through the `f.winnerEntrantId = …;` statement with:

```ts
                let m = matches.get(f.fixtureId);
                if (m && !fits(m) && !(await sport.hasStarted(m))) {
                    await quickMatchService.deleteForKnockout(String(m._id));
                    matches.delete(f.fixtureId);
                    m = undefined;
                }
                if (!m && f.entrantA && f.entrantB) {
                    const sideA = { sideId: f.entrantA, ...this._side(k, f.entrantA) };
                    const sideB = { sideId: f.entrantB, ...this._side(k, f.entrantB) };
                    m = (await quickMatchService.createForKnockout({
                        sport: k.sport,
                        hostId: String(k.hostId),
                        knockoutId: id,
                        fixtureId: f.fixtureId,
                        sides: [sideA, sideB],
                        matchConfig: sport.matchConfig(k, sideA.slots.length, sideB.slots.length),
                    })) ?? (await quickMatchService.listForKnockout(id)).find((x) => x.fixtureId === f.fixtureId);
                    if (m) matches.set(f.fixtureId, m);
                }

                let live: IQuickMatch | undefined;
                if (m && fits(m)) live = m;
                else if (m) logger.error(`quickKnockout.reconcile ${id}: fixture ${f.fixtureId} has a played match for other entrants`);
                f.quickMatchId = live?._id;
                f.winnerEntrantId = f.bye
                    ? (f.entrantA ?? f.entrantB)
                    : live?.status === 'completed' ? winnerOf(live, f) : undefined;
```

In `assertUndoAllowed`, replace the line `if (nextMatch && hasPoints(nextMatch)) throw new BadRequestError('The next match has already started.');` with:

```ts
        if (nextMatch && await knockoutSports[k.sport].hasStarted(nextMatch)) throw new BadRequestError('The next match has already started.');
```

Add after `assertUndoAllowed`:

```ts
    /**
     * A knockout match cannot end level, but cricket can tie. The teams settle
     * it on the ground (super over, bowl-out, toss) and the host records who
     * went through. Stored on the match, so reconcile still reads the bracket
     * from results; `outcome` stays 'tied' for careers.
     */
    async settleTie(id: string, hostId: string, input: { fixtureId: string; entrantId: string }): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        if (k.status !== 'live') throw new BadRequestError('This knockout is not live.');
        const f = k.fixtures.find((x) => x.fixtureId === input.fixtureId);
        if (!f) throw new NotFoundError('That match is not in this knockout.');
        const m = (await quickMatchService.listForKnockout(id)).find((x) => x.fixtureId === input.fixtureId);
        const fits = m && m.sides[0]?.sideId === f.entrantA && m.sides[1]?.sideId === f.entrantB;
        if (!m || !fits || m.status !== 'completed' || m.outcome !== 'tied') throw new BadRequestError('This match is not tied.');
        if (m.tieWinnerSideId) throw new BadRequestError('The tie is already settled.');
        if (input.entrantId !== f.entrantA && input.entrantId !== f.entrantB) throw new BadRequestError('Pick one of the two teams.');

        m.tieWinnerSideId = input.entrantId;
        await quickMatchService.persist(m);
        return new SuccessResponse('Tie settled.', await this.reconcile(id));
    }
```

- [ ] **Step 6: Wire the route**

Validator (append to `server/src/middlewares/validators/quickKnockout.validator.ts`):

```ts
export const knockoutTieValidator = [
    id,
    body('fixtureId').isString().trim().notEmpty().withMessage('fixtureId is required.'),
    body('entrantId').isString().trim().notEmpty().withMessage('entrantId is required.'),
    ...validateRequest,
];
```

Controller (append to `server/src/controllers/quickKnockout.controller.ts`):

```ts
export const settleKnockoutTie = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.settleTie(req.params.id, req.player._id, { fixtureId: req.body.fixtureId, entrantId: req.body.entrantId }));
};
```

Route (in `server/src/routes/quickKnockout.route.ts`, after the `/cancel` route):

```ts
quickKnockoutRouter.post('/:id/tie', v.knockoutTieValidator, isPlayerLoggedIn, asyncHandler(c.settleKnockoutTie));
```

- [ ] **Step 7: Run the tests to verify they pass, badminton bracket included**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutCricketBracket.test.ts test/quickKnockoutHttp.test.ts test/quickMatchKnockoutLocks.test.ts test/quickKnockoutScoring.test.ts test/quickKnockoutBracket.test.ts test/quickKnockoutAwards.test.ts`
Expected: PASS.

- [ ] **Step 8: Types and lint**

Run: `cd /d/kria/server && pwd && npx tsc --noEmit && npm run lint:fix`
Expected: both exit 0.

- [ ] **Step 9: Commit**

```bash
cd /d/kria/server && pwd && git add src/models/quickMatch.model.ts src/services/quickMatch.service.ts src/services/quickKnockout.service.ts src/controllers/quickKnockout.controller.ts src/routes/quickKnockout.route.ts src/middlewares/validators/quickKnockout.validator.ts test/quickKnockoutCricketBracket.test.ts test/quickKnockoutHttp.test.ts test/quickMatchKnockoutLocks.test.ts && git commit -m "feat cricket knockout fixtures are cricket matches and a tie waits for the host's pick" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git status --short
```

---

### Task 5: Cricket scoring moves the bracket

**Files:**
- Modify: `server/src/sports/cricket/services/quickCricketScoring.service.ts`
- Test: create `server/test/quickKnockoutCricketScoring.test.ts`

**Interfaces:**
- Consumes (Tasks 1–4): `quickKnockoutService.reconcile(id)`, `assertUndoAllowed(knockoutId, fixtureId)`, `settleTie`, `IQuickMatch.tieWinnerSideId`.
- Produces: `recordBall` reconciles after a knockout match completes; `undoLastBall` guards and reconciles a finished knockout match and clears its tie pick.

- [ ] **Step 1: Write the failing test**

Create `server/test/quickKnockoutCricketScoring.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import Player from '../src/models/player.model';
import QuickMatchModel from '../src/models/quickMatch.model';
import { QuickKnockoutModel } from '../src/models/quickKnockout.model';
import { quickKnockoutService } from '../src/services/quickKnockout.service';
import { quickCricketScoringService } from '../src/sports/cricket/services/quickCricketScoring.service';

let seq = 0;
async function makePlayer(firstName: string) {
    seq += 1;
    const p = await Player.create({ firstName, lastName: 'T', email: `kcs${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true });
    return p._id.toString();
}

/** Three teams of two Kria players (one bye), one-over matches, started. */
async function startedCricket() {
    const hostId = await makePlayer('Host');
    const created = (await quickKnockoutService.create(hostId, { sport: 'cricket', matchConfig: { maxOvers: 1, playersPerTeam: 2 }, teamCount: 3, name: 'Cup' })).data!;
    const id = String(created._id);
    for (let i = 1; i < 6; i++) await quickKnockoutService.addPlayer(id, hostId, { playerId: await makePlayer(`P${i}`) });
    await quickKnockoutService.draw(id, hostId);
    await quickKnockoutService.start(id, hostId);
    return { id, hostId };
}

const live = (id: string) => QuickMatchModel.find({ knockoutId: id, status: 'live' });
/** Innings 1: side 1 bats. Innings 2: side 2 bats. */
const bat1 = { batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'bowlB', runs: 0 };
const bat2 = { batsmanOnStrikeId: 'b1', nonStrikerId: 'b2', bowlerId: 'bowlA', runs: 0 };

async function setUp(matchId: string, hostId: string) {
    const m = (await QuickMatchModel.findById(matchId))!;
    await quickCricketScoringService.recordToss(matchId, hostId, { winnerSideId: m.sides[0].sideId, decision: 'bat' });
    for (const side of m.sides) {
        await quickCricketScoringService.recordLineup(matchId, hostId, {
            sideId: side.sideId,
            players: side.slots.map((s) => ({ slotId: s.slotId, playerId: s.playerId ? String(s.playerId) : undefined, name: s.displayName })),
        });
    }
}

/** A one-over match to the given result. Side 1 bats first. */
async function play(matchId: string, hostId: string, result: 'side1' | 'side2' | 'tied') {
    await setUp(matchId, hostId);
    for (const runs of result === 'side1' ? [1, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0]) {
        await quickCricketScoringService.recordBall(matchId, hostId, { ...bat1, runs });
    }
    for (const runs of result === 'side2' ? [1] : [0, 0, 0, 0, 0, 0]) {
        await quickCricketScoringService.recordBall(matchId, hostId, { ...bat2, runs });
    }
}

describe('cricket scoring inside a knockout', () => {
    it('finishing a match moves the winner on with no extra call', async () => {
        const { id, hostId } = await startedCricket();
        const [semi] = await live(id);
        await play(String(semi._id), hostId, 'side2');
        const k = (await QuickKnockoutModel.findById(id))!;
        expect(k.fixtures.find((f) => f.fixtureId === semi.fixtureId)!.winnerEntrantId).toBe(semi.sides[1].sideId);
        const [final] = await live(id);
        expect(final.sides.map((s) => s.sideId)).toContain(semi.sides[1].sideId);
    });

    it('a tied final waits for the host, then crowns the picked team', async () => {
        const { id, hostId } = await startedCricket();
        const [semi] = await live(id);
        await play(String(semi._id), hostId, 'side1');
        const [final] = await live(id);
        await play(String(final._id), hostId, 'tied');
        let k = (await QuickKnockoutModel.findById(id))!;
        expect(k.status).toBe('live');
        expect(k.championEntrantId).toBeUndefined();

        const picked = final.sides[1].sideId;
        k = (await quickKnockoutService.settleTie(id, hostId, { fixtureId: final.fixtureId!, entrantId: picked })).data!;
        expect(k.status).toBe('completed');
        expect(k.championEntrantId).toBe(picked);
        for (const slot of final.sides[1].slots) {
            const honors = (await Player.findById(slot.playerId).lean())!.honors;
            expect(honors).toContainEqual({ title: 'Won Cup', badge: 'knockout-winner', ref: id });
        }
    });

    it('undo of a finished match is allowed while the next has no ball, and pulls the winner back', async () => {
        const { id, hostId } = await startedCricket();
        const [semi] = await live(id);
        await play(String(semi._id), hostId, 'side1');
        expect(await live(id)).toHaveLength(1);
        await quickCricketScoringService.undoLastBall(String(semi._id), hostId);
        expect((await QuickMatchModel.findById(semi._id))!.status).toBe('live');
        const k = (await QuickKnockoutModel.findById(id))!;
        expect(k.fixtures.find((f) => f.fixtureId === semi.fixtureId)!.winnerEntrantId).toBeUndefined();
        expect((await live(id)).map((m) => String(m._id))).toEqual([String(semi._id)]); // the final is gone
    });

    it('undo is refused once a ball is bowled in the next match, and allowed again if that ball is undone', async () => {
        const { id, hostId } = await startedCricket();
        const [semi] = await live(id);
        await play(String(semi._id), hostId, 'side1');
        const [final] = await live(id);
        await setUp(String(final._id), hostId);
        await quickCricketScoringService.recordBall(String(final._id), hostId, bat1);
        await expect(quickCricketScoringService.undoLastBall(String(semi._id), hostId)).rejects.toThrow('The next match has already started.');
        expect((await QuickMatchModel.findById(semi._id))!.status).toBe('completed');

        // The final's only ball undone: its liveState remains, but nothing is bowled.
        await quickCricketScoringService.undoLastBall(String(final._id), hostId);
        await expect(quickCricketScoringService.undoLastBall(String(semi._id), hostId)).resolves.toBeDefined();
        expect((await live(id)).map((m) => String(m._id))).toEqual([String(semi._id)]);
    });

    it('undoing a tied match clears the tie pick', async () => {
        const { id, hostId } = await startedCricket();
        const [semi] = await live(id);
        await play(String(semi._id), hostId, 'tied');
        await quickKnockoutService.settleTie(id, hostId, { fixtureId: semi.fixtureId!, entrantId: semi.sides[0].sideId });
        expect(await live(id)).toHaveLength(1);
        await quickCricketScoringService.undoLastBall(String(semi._id), hostId);
        const reopened = (await QuickMatchModel.findById(semi._id))!;
        expect(reopened.status).toBe('live');
        expect(reopened.tieWinnerSideId).toBeUndefined();
        expect((await live(id)).map((m) => String(m._id))).toEqual([String(semi._id)]);
    });

    it('undo of a finished match in a cancelled knockout is refused', async () => {
        const { id, hostId } = await startedCricket();
        const [semi] = await live(id);
        await play(String(semi._id), hostId, 'side1');
        await quickKnockoutService.cancel(id, hostId);
        await expect(quickCricketScoringService.undoLastBall(String(semi._id), hostId)).rejects.toThrow('This knockout was cancelled.');
        expect((await QuickMatchModel.findById(semi._id))!.status).toBe('completed');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutCricketScoring.test.ts`
Expected: FAIL — no final appears after the semi completes; undo is not guarded.

- [ ] **Step 3: Implement**

In `server/src/sports/cricket/services/quickCricketScoring.service.ts`, add imports:

```ts
import { quickKnockoutService } from '../../../services/quickKnockout.service';
import logger from '../../../utils/logger';
```

In `recordBall`, replace the final `if (result.matchEnded) { … }` block (the one after `await quickMatchService.persist(match);`) with:

```ts
        if (result.matchEnded) {
            // Awaited and swallowed: a career-stats failure must never fail the
            // match it describes. Same contract as every other completion path.
            await careerStatsService.recordQuickMatchCompletion(matchId).catch(() => undefined);

            // A knockout match finishing moves its winner on. Logged, never
            // thrown: the ball is saved, and GET /quick-knockout/:id heals.
            if (match.knockoutId) {
                await quickKnockoutService.reconcile(String(match.knockoutId)).catch((err) => {
                    logger.error(`quickCricket.recordBall reconcile ${String(match.knockoutId)} failed: ${String(err)}`);
                });
            }
        }
```

In `undoLastBall`, right after `const wasCompleted = match.status === 'completed';`, add:

```ts
        // A finished knockout match may only be reopened while the match its
        // winner moved into has no ball bowled — checked before anything changes.
        if (wasCompleted && match.knockoutId && match.fixtureId) {
            await quickKnockoutService.assertUndoAllowed(String(match.knockoutId), match.fixtureId);
        }
```

In the un-completion block (`if (wasCompleted) { match.status = 'live'; … }`), after `match.set('lockedAt', undefined);` add:

```ts
            // The tie pick belongs to the result being undone.
            match.set('tieWinnerSideId', undefined);
```

At the end of `undoLastBall`, after the `if (wasCompleted) { … invalidateProfile … }` block and before the `return`, add:

```ts
        if (wasCompleted && match.knockoutId) {
            await quickKnockoutService.reconcile(String(match.knockoutId)).catch((err) => {
                logger.error(`quickCricket.undoLastBall reconcile ${String(match.knockoutId)} failed: ${String(err)}`);
            });
        }
```

- [ ] **Step 4: Run the tests to verify they pass, plain cricket included**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutCricketScoring.test.ts test/quickCricketScoring.test.ts test/quickCricketHttp.test.ts test/quickCricketAllOut.test.ts test/quickKnockoutScoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Full server gates**

Run: `cd /d/kria/server && pwd && npx tsc --noEmit && npm run lint:fix && npm run build && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run`
Expected: all exit 0; the suite passes (baseline was 102 files / 691 tests; now 107 files). Re-run any timeout flake alone.

- [ ] **Step 6: Commit**

```bash
cd /d/kria/server && pwd && git add src/sports/cricket/services/quickCricketScoring.service.ts test/quickKnockoutCricketScoring.test.ts && git commit -m "feat cricket scoring advances the knockout and guards undo of a finished match" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git status --short
```

---

### Task 6: Mobile API, types, view helpers, hook

**Files:**
- Modify: `mobile/src/api/quickKnockout.ts`, `mobile/src/api/quickMatch.ts`
- Modify: `mobile/src/lib/quickKnockoutView.ts`, `mobile/src/lib/quickCricketView.ts`, `mobile/src/lib/useQuickKnockout.ts`
- Test: modify `mobile/__tests__/quickKnockoutApi.test.ts`, `mobile/__tests__/quickKnockoutView.test.ts`, `mobile/__tests__/quickCricketView.test.ts`, `mobile/__tests__/useQuickKnockout.test.tsx`

**Interfaces:**
- Consumes (server, Tasks 1–4): the endpoints and JSON shapes above.
- Produces types: `KnockoutTeam { teamId: string; name: string }`; `KnockoutPlayer` + `teamId?: string; drawn?: boolean`; `QuickKnockout.sport: 'badminton' | 'cricket'`, `.format: 'singles' | 'doubles' | 'teams'`, `.matchConfig: { bestOf?; pointsToWin?; maxOvers?: number; playersPerTeam?: number }`, `.teams?: KnockoutTeam[]`; `QuickMatch.tieWinnerSideId?: string`; `CreateKnockoutBody` union.
- Produces API: `joinQuickKnockout(code, teamId?)`, `moveKnockoutPlayer(id, playerKey, teamId: string | null)`, `addKnockoutTeam(id)`, `removeKnockoutTeam(id, teamId)`, `renameKnockoutTeam(id, teamId, name)`, `settleKnockoutTie(id, { fixtureId, entrantId })` — each `Promise<QuickKnockout>`.
- Produces view: `formatLabel(k): string`, `teamPlayers(k, teamId?): KnockoutPlayer[]`, `awardBadges(k): [string, string][]`; `entrantName` / `entrantShortName` / `drawBlocker` handle cricket; `cricketOutcomeLabel` names the team a tie sent through.
- Produces hook actions: `moveToTeam(playerKey, teamId | null)`, `addTeam()`, `removeTeam(teamId)`, `renameTeam(teamId, name)` — each `Promise<boolean>`.

- [ ] **Step 1: Write the failing tests**

Append to `mobile/__tests__/quickKnockoutApi.test.ts` (extend its import with `moveKnockoutPlayer, addKnockoutTeam, removeKnockoutTeam, renameKnockoutTeam, settleKnockoutTie`):

```ts
it('joins a cricket team, and sends no body without one', async () => {
  mock.onPost('/quick-knockout/join/KX4P9M').reply(200, envelope({ _id: 'k1' }));
  await joinQuickKnockout('KX4P9M', 't2');
  await joinQuickKnockout('KX4P9M');
  expect(JSON.parse(mock.history.post[0].data)).toEqual({ teamId: 't2' });
  expect(mock.history.post[1].data).toBeUndefined();
});

it('arranges teams and settles a tie', async () => {
  mock.onAny().reply(200, envelope({ _id: 'k1' }));
  await moveKnockoutPlayer('k1', 'pk', null);
  await addKnockoutTeam('k1');
  await renameKnockoutTeam('k1', 't1', 'Royals');
  await removeKnockoutTeam('k1', 't1');
  await settleKnockoutTie('k1', { fixtureId: 'f1', entrantId: 't2' });
  expect(mock.history.patch.map((r) => [r.url, JSON.parse(r.data)])).toEqual([
    ['/quick-knockout/k1/players/pk', { teamId: null }],
    ['/quick-knockout/k1/teams/t1', { name: 'Royals' }],
  ]);
  expect(mock.history.post.map((r) => r.url)).toEqual(['/quick-knockout/k1/teams', '/quick-knockout/k1/tie']);
  expect(JSON.parse(mock.history.post[1].data)).toEqual({ fixtureId: 'f1', entrantId: 't2' });
  expect(mock.history.delete.map((r) => r.url)).toEqual(['/quick-knockout/k1/teams/t1']);
});
```

Append to `mobile/__tests__/quickKnockoutView.test.ts` (extend its import with `formatLabel, teamPlayers, awardBadges`):

```ts
const cricket = (over: Partial<QuickKnockout> = {}) => k({
  sport: 'cricket', format: 'teams', matchConfig: { maxOvers: 8, playersPerTeam: 3 },
  teams: [{ teamId: 't1', name: 'Strikers' }, { teamId: 't2', name: 'Royals' }, { teamId: 't3', name: 'Team 3' }],
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta', teamId: 't1' },
    { playerKey: 'b', playerId: 'p2', displayName: 'Priya Rao', teamId: 't1' },
    { playerKey: 'c', displayName: 'Sam' },
  ],
  pairs: [],
  entrants: [{ entrantId: 't1', playerKeys: ['a', 'b'] }],
  ...over,
});

it('names a cricket entrant by its team', () => {
  expect(entrantName(cricket(), 't1')).toBe('Strikers');
  expect(entrantShortName(cricket(), 't1')).toBe('Strikers');
  expect(championName(cricket({ championEntrantId: 't1' }))).toBe('Strikers');
});

it('labels the format', () => {
  expect(formatLabel(cricket())).toBe('Cricket · 8 overs');
  expect(formatLabel(k())).toBe('Doubles');
  expect(formatLabel(k({ format: 'singles' }))).toBe('Singles');
});

it('lists a team, or the Any-team pool', () => {
  expect(teamPlayers(cricket(), 't1').map((p) => p.playerKey)).toEqual(['a', 'b']);
  expect(teamPlayers(cricket()).map((p) => p.playerKey)).toEqual(['c']);
});

it('blocks a cricket Draw only when the loose players cannot lift every team to 2', () => {
  // Royals and Team 3 need 2 each; only Sam is loose.
  expect(drawBlocker(cricket())).toBe('Every team needs at least 2 players.');
  const three = ['d', 'e', 'f'].map((key) => ({ playerKey: key, displayName: key }));
  expect(drawBlocker(cricket({ players: [...cricket().players, ...three] }))).toBeNull();
  // The draw deals its own earlier placements again, so they count as loose.
  const players = [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta', teamId: 't1' },
    { playerKey: 'x', displayName: 'Xavi', teamId: 't1' },
    { playerKey: 'b', displayName: 'Bo', teamId: 't1', drawn: true },
    ...['c', 'd', 'e'].map((key) => ({ playerKey: key, displayName: key })),
  ];
  expect(drawBlocker(cricket({ players }))).toBeNull();
});

it('offers cricket three award badges, without Ace Serve', () => {
  expect(awardBadges(cricket()).map(([key]) => key)).toEqual(['iron-player', 'first-cap', 'fair-play']);
  expect(awardBadges(k()).map(([key]) => key)).toEqual(['iron-player', 'first-cap', 'ace-serve', 'fair-play']);
});
```

Append inside `describe('cricketOutcomeLabel', …)` in `mobile/__tests__/quickCricketView.test.ts`:

```ts
  it('names the team a tied knockout match sent through', () => {
    const m = { ...ready(), status: 'completed', outcome: 'tied', tieWinnerSideId: 's2' } as QuickMatch;
    expect(cricketOutcomeLabel(m)).toBe('Tied · Blues went through');
  });
```

Append to `mobile/__tests__/useQuickKnockout.test.tsx`:

```ts
it('arranges cricket teams through the endpoints', async () => {
  const { result } = await opened();
  mock.onAny().reply(200, envelope(knockout({ sport: 'cricket' })));
  await act(async () => { await result.current.moveToTeam('a', 't1'); });
  await act(async () => { await result.current.addTeam(); });
  await act(async () => { await result.current.renameTeam('t1', 'Royals'); });
  await act(async () => { await result.current.removeTeam('t1'); });
  expect(mock.history.patch.map((r) => r.url)).toEqual(['/quick-knockout/k1/players/a', '/quick-knockout/k1/teams/t1']);
  expect(mock.history.post.map((r) => r.url)).toEqual(['/quick-knockout/k1/teams']);
  expect(mock.history.delete.map((r) => r.url)).toEqual(['/quick-knockout/k1/teams/t1']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/quickKnockoutApi.test.ts __tests__/quickKnockoutView.test.ts __tests__/quickCricketView.test.ts __tests__/useQuickKnockout.test.tsx`
Expected: FAIL — the new functions are not exported.

- [ ] **Step 3: Types and API**

In `mobile/src/api/quickKnockout.ts`:

Replace the `KnockoutPlayer` line and add `KnockoutTeam`:

```ts
export interface KnockoutPlayer {
  playerKey: string;
  playerId?: string;
  displayName: string;
  /** Cricket: absent = Any team. */
  teamId?: string;
  /** Cricket: placed by the draw, so a reshuffle deals them again. */
  drawn?: boolean;
}
export interface KnockoutTeam { teamId: string; name: string }
```

In `QuickKnockout`, replace `sport`, `format`, `matchConfig` and add `teams`:

```ts
  sport: 'badminton' | 'cricket';
  format: 'singles' | 'doubles' | 'teams';
  matchConfig: { bestOf?: 1 | 3 | 5; pointsToWin?: 11 | 15 | 21; maxOvers?: number; playersPerTeam?: number };
  /** Cricket only. */
  teams?: KnockoutTeam[];
```

Replace `CreateKnockoutBody`:

```ts
export type CreateKnockoutBody =
  | { sport?: 'badminton'; format: 'singles' | 'doubles'; matchConfig: { bestOf: 1 | 3 | 5; pointsToWin: 11 | 15 | 21 }; name?: string }
  | { sport: 'cricket'; matchConfig: { maxOvers: number; playersPerTeam: number }; teamCount: number; name?: string };
```

Replace `joinQuickKnockout` and append the new calls:

```ts
/** No team is Any team — the draw places them. */
export async function joinQuickKnockout(code: string, teamId?: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/join/${code.toUpperCase()}`, teamId ? { teamId } : undefined));
}
```

```ts
export async function moveKnockoutPlayer(id: string, playerKey: string, teamId: string | null): Promise<QuickKnockout> {
  return asKnockout(await API.patch(`/quick-knockout/${id}/players/${playerKey}`, { teamId }));
}
export async function addKnockoutTeam(id: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/teams`));
}
export async function removeKnockoutTeam(id: string, teamId: string): Promise<QuickKnockout> {
  return asKnockout(await API.delete(`/quick-knockout/${id}/teams/${teamId}`));
}
export async function renameKnockoutTeam(id: string, teamId: string, name: string): Promise<QuickKnockout> {
  return asKnockout(await API.patch(`/quick-knockout/${id}/teams/${teamId}`, { name }));
}
export async function settleKnockoutTie(id: string, body: { fixtureId: string; entrantId: string }): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/tie`, body));
}
```

In `mobile/src/api/quickMatch.ts`, add to `QuickMatch` after `fixtureId?: string;`:

```ts
  /** A tied knockout match: the side the host said went through. */
  tieWinnerSideId?: string;
```

- [ ] **Step 4: View helpers**

In `mobile/src/lib/quickKnockoutView.ts`:

Add after `playersOf`:

```ts
const teamName = (k: QuickKnockout, entrantId?: string) => (k.teams ?? []).find((t) => t.teamId === entrantId)?.name ?? '';
```

Make `entrantName` and `entrantShortName` start with a cricket branch:

```ts
export function entrantName(k: QuickKnockout, entrantId?: string): string {
  if (k.sport === 'cricket') return teamName(k, entrantId);
  const players = playersOf(k, entrantId);
  if (players.length === 1) return players[0].displayName;
  return players.map((p) => firstName(p.displayName)).join(' & ');
}

/** First names only, for the narrow bracket boxes; a cricket team keeps its name. */
export function entrantShortName(k: QuickKnockout, entrantId?: string): string {
  if (k.sport === 'cricket') return teamName(k, entrantId);
  return playersOf(k, entrantId).map((p) => firstName(p.displayName)).join(' & ');
}
```

Add after `isKnockoutHost`:

```ts
/** "Singles", "Doubles", or "Cricket · 8 overs" — the line under a knockout's name. */
export function formatLabel(k: QuickKnockout): string {
  if (k.sport === 'cricket') return `Cricket · ${k.matchConfig.maxOvers} overs`;
  return k.format === 'doubles' ? 'Doubles' : 'Singles';
}

/** A cricket team's players, or the Any-team pool when `teamId` is absent. */
export const teamPlayers = (k: QuickKnockout, teamId?: string) => k.players.filter((p) => p.teamId === teamId);
```

Replace `drawBlocker` with:

```ts
/** Mirrors the server's refusals, so Draw can say why it is disabled. */
export function drawBlocker(k: QuickKnockout): string | null {
  if (k.sport === 'cricket') {
    // The draw deals the loose players (Any team, plus its own earlier
    // placements) to the smallest teams first, so it fails only when there
    // are too few to lift every team to 2.
    const fixed = k.players.filter((p) => p.teamId && !p.drawn);
    const loose = k.players.length - fixed.length;
    const short = (k.teams ?? []).reduce((n, t) => n + Math.max(0, 2 - fixed.filter((p) => p.teamId === t.teamId).length), 0);
    return short > loose ? 'Every team needs at least 2 players.' : null;
  }
  if (k.format === 'doubles' && k.players.length % 2 !== 0) return 'Add one more player or remove one to draw.';
  const entrants = k.format === 'doubles' ? k.players.length / 2 : k.players.length;
  if (entrants < 3) return 'A knockout needs at least 3 entrants.';
  return null;
}
```

Add after `QUICK_AWARD_BADGES`:

```ts
/** The badges this knockout's host may give: cricket has no Ace Serve. Mirrors the server's knockoutSports. */
export const awardBadges = (k: QuickKnockout): [string, string][] =>
  Object.entries(QUICK_AWARD_BADGES).filter(([key]) => k.sport !== 'cricket' || key !== 'ace-serve');
```

In `mobile/src/lib/quickCricketView.ts`, in `cricketOutcomeLabel` replace `if (match.outcome === 'tied') return 'Tied';` with:

```ts
  if (match.outcome === 'tied') {
    // A tied knockout match goes on with the team the host picked.
    const through = match.sides.find((s) => s.sideId === match.tieWinnerSideId);
    return through ? `Tied · ${through.name} went through` : 'Tied';
  }
```

- [ ] **Step 5: Hook actions**

In `mobile/src/lib/useQuickKnockout.ts`, add `addKnockoutTeam, moveKnockoutPlayer, removeKnockoutTeam, renameKnockoutTeam` to the `@/api/quickKnockout` import, and add to the returned object after `unpair`:

```ts
    moveToTeam: (playerKey: string, teamId: string | null) => withId((k) => moveKnockoutPlayer(k, playerKey, teamId)),
    addTeam: () => withId(addKnockoutTeam),
    removeTeam: (teamId: string) => withId((k) => removeKnockoutTeam(k, teamId)),
    renameTeam: (teamId: string, name: string) => withId((k) => renameKnockoutTeam(k, teamId, name)),
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/quickKnockoutApi.test.ts __tests__/quickKnockoutView.test.ts __tests__/quickCricketView.test.ts __tests__/useQuickKnockout.test.tsx`
Expected: PASS.

- [ ] **Step 7: Types and lint**

Run: `cd /d/kria/mobile && pwd && npx tsc --noEmit && npx eslint src/api/quickKnockout.ts src/api/quickMatch.ts src/lib/quickKnockoutView.ts src/lib/quickCricketView.ts src/lib/useQuickKnockout.ts`
Expected: both exit 0.

- [ ] **Step 8: Commit**

```bash
cd /d/kria/mobile && pwd && git add src/api/quickKnockout.ts src/api/quickMatch.ts src/lib/quickKnockoutView.ts src/lib/quickCricketView.ts src/lib/useQuickKnockout.ts __tests__/quickKnockoutApi.test.ts __tests__/quickKnockoutView.test.ts __tests__/quickCricketView.test.ts __tests__/useQuickKnockout.test.tsx && git commit -m "feat cricket knockout api, labels and team actions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git status --short
```

---

### Task 7: Wizard — Sport step and cricket format

**Files:**
- Modify: `mobile/src/app/knockout/new.tsx`
- Modify: `mobile/src/components/quick/HostSteps.tsx` (export `Stepper`)
- Test: modify `mobile/__tests__/NewKnockoutScreen.test.tsx`

**Interfaces:**
- Consumes (Task 6): `CreateKnockoutBody` union, `createQuickKnockout`.
- Consumes: `ChoiceCard`, `Segmented`, `Stepper` from `@/components/quick/HostSteps` (`Stepper` props: `{ title, value, min, max, presets: number[], onChange, hint }`; its buttons are labelled `More <title lower>` / `Fewer <title lower>`).

- [ ] **Step 1: Write the failing tests**

In `mobile/__tests__/NewKnockoutScreen.test.tsx`:

In the first test, replace `expect(screen.getByText('Set the format')).toBeTruthy();` with:

```ts
  expect(screen.getByText('Pick a sport')).toBeTruthy();
  fireEvent.press(screen.getByText('Continue'));
  expect(screen.getByText('Set the format')).toBeTruthy();
```

In the second test (`leaves the name out…`), add one more `fireEvent.press(screen.getByText('Continue'));` before the existing two.

Append:

```ts
it('creates a cricket knockout with overs, squad and teams', async () => {
  render(<NewKnockoutScreen />);
  fireEvent.press(screen.getByText('Cricket'));
  fireEvent.press(screen.getByText('Continue'));
  expect(screen.getByText('Overs per innings')).toBeTruthy();
  expect(screen.queryByText('Points per game')).toBeNull();
  fireEvent.press(screen.getByLabelText('More teams'));
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('Continue'));
  expect(screen.getByText('8 overs · up to 6 a side · 5 teams')).toBeTruthy();
  fireEvent.press(screen.getByText('Create knockout'));
  await waitFor(() => expect(createQuickKnockout).toHaveBeenLastCalledWith({
    sport: 'cricket', matchConfig: { maxOvers: 8, playersPerTeam: 6 }, teamCount: 5,
  }));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/NewKnockoutScreen.test.tsx`
Expected: FAIL — "Pick a sport" not found.

- [ ] **Step 3: Export `Stepper`**

In `mobile/src/components/quick/HostSteps.tsx`, change `function Stepper({` to `export function Stepper({`.

- [ ] **Step 4: Rewrite the wizard**

In `mobile/src/app/knockout/new.tsx`:

Change the HostSteps import to `import { ChoiceCard, Segmented, Stepper } from '@/components/quick/HostSteps';`.

Replace `STEPS` and `COPY` with:

```ts
const STEPS = ['sport', 'format', 'name', 'review'] as const;
const COPY: Record<(typeof STEPS)[number], { title: string; sub: string }> = {
  sport: { title: 'Pick a sport', sub: 'Every match in the knockout is this sport.' },
  format: { title: 'Set the format', sub: 'Every match in the knockout uses it.' },
  name: { title: 'Name it', sub: 'Optional. The winner gets "Won <name>" on their profile.' },
  review: { title: 'Ready to go?', sub: 'Next, you get a code to share. Players join themselves.' },
};
```

Add state after `const [index, setIndex] = useState(0);`:

```ts
  const [sport, setSport] = useState<'badminton' | 'cricket'>('badminton');
  const [maxOvers, setMaxOvers] = useState(8);
  const [squad, setSquad] = useState(6);
  const [teamCount, setTeamCount] = useState(4);
```

In `create`, replace the `const body: CreateKnockoutBody = …;` line with:

```ts
    const body: CreateKnockoutBody = sport === 'cricket'
      ? { sport: 'cricket', matchConfig: { maxOvers, playersPerTeam: squad }, teamCount }
      : { format, matchConfig: { bestOf, pointsToWin } };
```

Replace the step counter text `{`0${index + 1} / 03`}` with `{`0${index + 1} / 0${STEPS.length}`}`.

Before `{step === 'format' ? (`, add the sport step:

```tsx
          {step === 'sport' ? (
            <View style={{ gap: 12 }}>
              <ChoiceCard icon="shuttlecock" title="Badminton" hint="Singles or doubles, 3 to 16 entrants" selected={sport === 'badminton'} onPress={() => setSport('badminton')} />
              <ChoiceCard icon="cricket-bat" title="Cricket" hint="Teams of up to 11, 3 to 8 teams" selected={sport === 'cricket'} onPress={() => setSport('cricket')} />
            </View>
          ) : null}
```

Replace the format block (`{step === 'format' ? ( <> …badminton Segmented… </> ) : null}`) with:

```tsx
          {step === 'format' && sport === 'cricket' ? (
            <>
              <Stepper title="Overs per innings" value={maxOvers} min={1} max={50} presets={[5, 8, 10, 20]} onChange={setMaxOvers} hint="Each team bats for this many overs." />
              <Stepper title="Players per team" value={squad} min={2} max={11} presets={[4, 6, 8, 11]} onChange={setSquad} hint="The most a team can have. A team a player short still plays." />
              <Stepper title="Teams" value={teamCount} min={3} max={8} presets={[3, 4, 6, 8]} onChange={setTeamCount} hint="Players pick a team when they join. You can add or remove teams later." />
            </>
          ) : null}

          {step === 'format' && sport === 'badminton' ? (
            <>
              <Segmented title="Format" options={[{ value: 'singles' as const, label: 'Singles', sub: '1 v 1' }, { value: 'doubles' as const, label: 'Doubles', sub: '2 v 2' }]} value={format} onChange={setFormat} />
              <Segmented title="Match length" options={([1, 3, 5] as const).map((n) => ({ value: n, label: BEST_OF[n].label }))} value={bestOf} onChange={setBestOf} hint={BEST_OF[bestOf].hint} />
              <Segmented title="Points per game" options={([11, 15, 21] as const).map((n) => ({ value: n, label: String(n), sub: POINTS[n] }))} value={pointsToWin} onChange={setPointsToWin} />
            </>
          ) : null}
```

In the review card, replace the two texts that read `{`Knockout · ${format}`}` and `{`${BEST_OF[bestOf].label} · ${pointsToWin} points · 3 to 16 entrants`}` with:

```tsx
              <Text style={{ ...label, color: t.brandInk }}>{`Knockout · ${sport === 'cricket' ? 'cricket' : format}`}</Text>
```

```tsx
                {sport === 'cricket'
                  ? `${maxOvers} overs · up to ${squad} a side · ${teamCount} teams`
                  : `${BEST_OF[bestOf].label} · ${pointsToWin} points · 3 to 16 entrants`}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/NewKnockoutScreen.test.tsx __tests__/NewQuickMatchScreen.test.tsx __tests__/fontLeading.test.ts __tests__/pressableStyleFence.test.ts __tests__/colourLiterals.test.ts`
Expected: PASS.

- [ ] **Step 6: Types and lint**

Run: `cd /d/kria/mobile && pwd && npx tsc --noEmit && npx eslint src/app/knockout/new.tsx src/components/quick/HostSteps.tsx`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
cd /d/kria/mobile && pwd && git add src/app/knockout/new.tsx src/components/quick/HostSteps.tsx __tests__/NewKnockoutScreen.test.tsx && git commit -m "feat knockout wizard picks a sport and sets up cricket" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git status --short
```

---

### Task 8: Waiting room — cricket team cards

**Files:**
- Create: `mobile/src/components/knockout/PlayerLine.tsx` (moved verbatim out of `KnockoutWaitingRoom.tsx`)
- Create: `mobile/src/components/knockout/CricketTeams.tsx`
- Modify: `mobile/src/components/knockout/KnockoutWaitingRoom.tsx`, `mobile/src/app/knockout/[id].tsx`, `mobile/src/components/knockout/KnockoutRow.tsx`, `mobile/src/app/quick/index.tsx`, `mobile/src/components/home/PlayPortal.tsx`
- Modify: `mobile/test-utils/colourLiterals.ts`
- Test: create `mobile/__tests__/CricketTeams.test.tsx`; modify `mobile/__tests__/KnockoutWaitingRoom.test.tsx`

**Interfaces:**
- Consumes (Task 6): `teamPlayers`, `formatLabel`, `isKnockoutHost`, hook actions `moveToTeam`, `addTeam`, `removeTeam`, `renameTeam`.
- Produces: `PlayerLine({ player, viewerId?, tone?: 'selected', onPress?, onRemove?, a11y? })`; `CricketTeams({ knockout, playerId?, busy?, onRemove, onMove(playerKey, teamId | null), onAddTeam, onRemoveTeam(teamId), onRenameTeam(teamId, name) })`; `KnockoutWaitingRoom` gains required props `onMove`, `onAddTeam`, `onRemoveTeam`, `onRenameTeam`.
- Accessibility labels the tests rely on: `Select <name>`, `Move <name> to <team or "Any team">`, `Rename <team>`, `Remove <team>`, `New name for <team>`.

- [ ] **Step 1: Write the failing tests**

Create `mobile/__tests__/CricketTeams.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CricketTeams } from '@/components/knockout/CricketTeams';
import type { QuickKnockout } from '@/api/quickKnockout';

const knockout = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k1', hostId: 'h1', joinCode: 'KX4P9M', name: 'Sunday Cup', sport: 'cricket', format: 'teams',
  matchConfig: { maxOvers: 8, playersPerTeam: 2 }, status: 'waiting',
  teams: [{ teamId: 't1', name: 'Strikers' }, { teamId: 't2', name: 'Team 2' }, { teamId: 't3', name: 'Team 3' }],
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta', teamId: 't1' },
    { playerKey: 'b', playerId: 'p2', displayName: 'Priya Rao', teamId: 't1' },
    { playerKey: 'c', displayName: 'Sam' },
  ],
  pairs: [], entrants: [], fixtures: [], roundNames: [], awards: [], createdAt: '2026-10-07T00:00:00.000Z',
  ...over,
});
const handlers = () => ({ onRemove: jest.fn(), onMove: jest.fn(), onAddTeam: jest.fn(), onRemoveTeam: jest.fn(), onRenameTeam: jest.fn() });

it('shows each team with its count, then the Any-team pool', () => {
  render(<CricketTeams knockout={knockout()} playerId="h1" {...handlers()} />);
  expect(screen.getByText('Strikers')).toBeTruthy();
  expect(screen.getByText('2/2')).toBeTruthy();
  expect(screen.getAllByText('0/2')).toHaveLength(2);
  expect(screen.getByText('Any team')).toBeTruthy();
  expect(screen.getByText('Sam')).toBeTruthy();
});

it('host moves a player: tap them, then Move here — never into a full team', () => {
  const h = handlers();
  render(<CricketTeams knockout={knockout()} playerId="h1" {...h} />);
  fireEvent.press(screen.getByLabelText('Select Sam'));
  expect(screen.queryByLabelText('Move Sam to Strikers')).toBeNull();
  fireEvent.press(screen.getByLabelText('Move Sam to Team 2'));
  expect(h.onMove).toHaveBeenCalledWith('c', 't2');

  fireEvent.press(screen.getByLabelText('Select Priya Rao'));
  fireEvent.press(screen.getByLabelText('Move Priya Rao to Any team'));
  expect(h.onMove).toHaveBeenLastCalledWith('b', null);
});

it('host renames a team', () => {
  const h = handlers();
  render(<CricketTeams knockout={knockout()} playerId="h1" {...h} />);
  fireEvent.press(screen.getByLabelText('Rename Strikers'));
  fireEvent.changeText(screen.getByLabelText('New name for Strikers'), ' Royals ');
  fireEvent.press(screen.getByText('Save'));
  expect(h.onRenameTeam).toHaveBeenCalledWith('t1', 'Royals');
});

it('offers Remove only above 3 teams, and Add team only below 8', () => {
  const h = handlers();
  const { rerender } = render(<CricketTeams knockout={knockout()} playerId="h1" {...h} />);
  expect(screen.queryByLabelText('Remove Team 2')).toBeNull();
  fireEvent.press(screen.getByText('+ Add team'));
  expect(h.onAddTeam).toHaveBeenCalled();

  const eight = Array.from({ length: 8 }, (_, i) => ({ teamId: `t${i + 1}`, name: `Team ${i + 1}` }));
  rerender(<CricketTeams knockout={knockout({ teams: eight })} playerId="h1" {...h} />);
  fireEvent.press(screen.getByLabelText('Remove Team 8'));
  expect(h.onRemoveTeam).toHaveBeenCalledWith('t8');
  expect(screen.queryByText('+ Add team')).toBeNull();
});

it('a joined player sees the teams but cannot arrange them', () => {
  render(<CricketTeams knockout={knockout()} playerId="p2" {...handlers()} />);
  expect(screen.getByText('Strikers')).toBeTruthy();
  expect(screen.queryByLabelText('Select Sam')).toBeNull();
  expect(screen.queryByLabelText('Rename Strikers')).toBeNull();
  expect(screen.queryByText('+ Add team')).toBeNull();
});
```

In `mobile/__tests__/KnockoutWaitingRoom.test.tsx`, change `handlers` to:

```ts
const handlers = () => ({
  onAddGuest: jest.fn(), onAddPlayer: jest.fn(), onRemove: jest.fn(), onPair: jest.fn(), onUnpair: jest.fn(),
  onMove: jest.fn(), onAddTeam: jest.fn(), onRemoveTeam: jest.fn(), onRenameTeam: jest.fn(),
});
```

and append:

```tsx
it('a cricket knockout shows team cards instead of the player list', () => {
  const cricket = knockout({
    sport: 'cricket', format: 'teams', matchConfig: { maxOvers: 8, playersPerTeam: 6 },
    teams: [{ teamId: 't1', name: 'Strikers' }, { teamId: 't2', name: 'Team 2' }, { teamId: 't3', name: 'Team 3' }],
  });
  render(<KnockoutWaitingRoom knockout={cricket} playerId="h1" {...handlers()} />);
  expect(screen.getByText('Knockout · Cricket · 8 overs')).toBeTruthy();
  expect(screen.getByText('Any team')).toBeTruthy();
  expect(screen.queryByText('Tap two players to pair them')).toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/CricketTeams.test.tsx __tests__/KnockoutWaitingRoom.test.tsx`
Expected: FAIL — cannot find module `CricketTeams`.

- [ ] **Step 3: Move `PlayerLine` into its own file**

Create `mobile/src/components/knockout/PlayerLine.tsx` with the `PlayerLine` function cut verbatim from `KnockoutWaitingRoom.tsx` (lines 16–35 today), exported, and its imports:

```tsx
import { View, Text, Pressable } from 'react-native';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';
import { useTheme } from '@/lib/theme';
import type { KnockoutPlayer } from '@/api/quickKnockout';

/** One person in a waiting room: name, You / Joined / Guest, optional select and remove. */
export function PlayerLine({ player, viewerId, tone, onPress, onRemove, a11y }: {
  player: KnockoutPlayer; viewerId?: string; tone?: 'selected'; onPress?: () => void; onRemove?: () => void; a11y?: string;
}) {
  const t = useTheme();
  const tag = player.playerId && player.playerId === viewerId ? (['You', 'auction'] as const)
    : player.playerId ? (['Joined', 'open'] as const) : (['Guest', 'end'] as const);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: 1.5, borderBottomColor: t.lineSoft, backgroundColor: tone === 'selected' ? t.brandTint : undefined }}>
      <Pressable accessibilityRole="button" accessibilityLabel={a11y} disabled={!onPress} onPress={onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 4 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.text }}>{player.displayName}</Text>
        <Tag label={tag[0]} variant={tag[1]} />
      </Pressable>
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${player.displayName}`} onPress={onRemove} hitSlop={8} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={t.textMeta} />
        </Pressable>
      ) : null}
    </View>
  );
}
```

In `KnockoutWaitingRoom.tsx`, delete the local `PlayerLine`, add `import { PlayerLine } from './PlayerLine';`, and change the type import to `import type { QuickKnockout } from '@/api/quickKnockout';` (`KnockoutPlayer` was only used by `PlayerLine`; `Tag` and `Icon` are still used by the header and the Share button, so keep them).

- [ ] **Step 4: Create `CricketTeams`**

Create `mobile/src/components/knockout/CricketTeams.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import type { KnockoutPlayer, KnockoutTeam, QuickKnockout } from '@/api/quickKnockout';
import { isKnockoutHost, teamPlayers } from '@/lib/quickKnockoutView';
import { PlayerLine } from './PlayerLine';

const MIN_TEAMS = 3;
const MAX_TEAMS = 8;
const label = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });

/**
 * The cricket waiting room's roster: one card per team, then Any team. The
 * host taps a player, then "Move here" on a card — the doubles tap-to-pair
 * pattern, since an Android alert holds three buttons and there can be eight
 * teams.
 */
export function CricketTeams({ knockout: k, playerId, busy, onRemove, onMove, onAddTeam, onRemoveTeam, onRenameTeam }: {
  knockout: QuickKnockout;
  playerId?: string;
  busy?: boolean;
  onRemove: (playerKey: string) => void;
  onMove: (playerKey: string, teamId: string | null) => void;
  onAddTeam: () => void;
  onRemoveTeam: (teamId: string) => void;
  onRenameTeam: (teamId: string, name: string) => void;
}) {
  const t = useTheme();
  const host = isKnockoutHost(k, playerId) && !busy;
  const teams = k.teams ?? [];
  const cap = k.matchConfig.playersPerTeam ?? 0;
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ teamId: string; name: string } | null>(null);
  const picked = k.players.find((p) => p.playerKey === selected);

  const move = (teamId: string | null) => {
    if (!picked) return;
    onMove(picked.playerKey, teamId);
    setSelected(null);
  };
  const saveName = () => {
    if (renaming && renaming.name.trim()) onRenameTeam(renaming.teamId, renaming.name.trim());
    setRenaming(null);
  };

  const tools = (team: KnockoutTeam) => {
    if (!host) return null;
    if (renaming?.teamId === team.teamId) {
      return (
        <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
          <TextInput
            value={renaming.name}
            onChangeText={(name) => setRenaming({ teamId: team.teamId, name })}
            accessibilityLabel={`New name for ${team.name}`}
            maxLength={20}
            autoFocus
            style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 15, color: t.text, borderWidth: 1.5, borderColor: t.line, borderRadius: 5, backgroundColor: t.fillSoft, paddingHorizontal: 12, minHeight: 44 }}
          />
          <Pressable accessibilityRole="button" onPress={saveName} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
            <Text style={{ ...label(t), color: t.brandInk }}>Save</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={{ flexDirection: 'row', gap: 16, paddingBottom: 6 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Rename ${team.name}`} onPress={() => setRenaming({ teamId: team.teamId, name: team.name })} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
          <Text style={{ ...label(t), color: t.textMeta }}>Rename</Text>
        </Pressable>
        {teams.length > MIN_TEAMS ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${team.name}`} onPress={() => onRemoveTeam(team.teamId)} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
            <Text style={{ ...label(t), color: t.failInk }}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const card = (key: string, title: string, players: KnockoutPlayer[], teamId: string | null, extra?: ReactNode) => {
    const full = teamId !== null && players.length >= cap;
    const canMoveHere = host && Boolean(picked) && (picked?.teamId ?? null) !== teamId && !full;
    return (
      <View key={key} style={{ marginTop: 12, borderRadius: 6, borderWidth: 1.5, borderColor: canMoveHere ? t.brand : t.line, paddingHorizontal: 8, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: t.text }}>{title}</Text>
          <Text style={label(t)}>{teamId === null ? String(players.length) : `${players.length}/${cap}`}</Text>
          {canMoveHere ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Move ${picked?.displayName} to ${title}`} onPress={() => move(teamId)} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
              <Text style={{ ...label(t), color: t.brandInk }}>Move here</Text>
            </Pressable>
          ) : null}
        </View>
        {extra}
        {players.map((p) => (
          <PlayerLine
            key={p.playerKey}
            player={p}
            viewerId={playerId}
            tone={selected === p.playerKey ? 'selected' : undefined}
            a11y={host ? `Select ${p.displayName}` : undefined}
            onPress={host ? () => setSelected(selected === p.playerKey ? null : p.playerKey) : undefined}
            onRemove={host ? () => onRemove(p.playerKey) : undefined}
          />
        ))}
      </View>
    );
  };

  return (
    <View>
      {host ? <Text style={{ ...label(t), marginTop: 8 }}>Tap a player, then Move here on a team</Text> : null}
      {teams.map((team) => card(team.teamId, team.name, teamPlayers(k, team.teamId), team.teamId, tools(team)))}
      {card('any', 'Any team', teamPlayers(k), null)}
      {host && teams.length < MAX_TEAMS ? (
        <Pressable accessibilityRole="button" onPress={onAddTeam} style={{ marginTop: 12, minHeight: 44, borderRadius: 5, borderWidth: 1.5, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: t.textBody }}>+ Add team</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 5: Use it in the waiting room and wire the screen**

In `mobile/src/components/knockout/KnockoutWaitingRoom.tsx`:
- Import `CricketTeams` from `./CricketTeams` and add `formatLabel` to the `@/lib/quickKnockoutView` import.
- Add to the props type and destructuring: `onMove: (playerKey: string, teamId: string | null) => void; onAddTeam: () => void; onRemoveTeam: (teamId: string) => void; onRenameTeam: (teamId: string, name: string) => void;`
- Replace `{`Knockout · ${k.format}`}` with `{`Knockout · ${formatLabel(k)}`}`.
- Replace the joined player's sub-line expression with:

```tsx
            {k.sport === 'cricket' ? 'The host or the draw settles the teams.'
              : doubles ? 'Your partner is decided by the host or the draw.' : 'The bracket appears here once the host draws it.'}
```

- Wrap the roster — the `hostPairs.map(…)` block and the `(doubles ? unpairedPlayers(k) : k.players).map(…)` block — so cricket gets team cards instead:

```tsx
      {k.sport === 'cricket' ? (
        <CricketTeams
          knockout={k} playerId={playerId} busy={busy}
          onRemove={onRemove} onMove={onMove} onAddTeam={onAddTeam} onRemoveTeam={onRemoveTeam} onRenameTeam={onRenameTeam}
        />
      ) : (
        <>
          {/* the existing hostPairs.map(…) block, unchanged */}
          {/* the existing (doubles ? unpairedPlayers(k) : k.players).map(…) block, unchanged */}
        </>
      )}
```

In `mobile/src/app/knockout/[id].tsx`:
- Add `formatLabel` to the `@/lib/quickKnockoutView` import.
- Pass the new handlers: `onMove={ko.moveToTeam} onAddTeam={ko.addTeam} onRemoveTeam={ko.removeTeam} onRenameTeam={ko.renameTeam}` on `<KnockoutWaitingRoom …>`.
- Replace `{`Knockout · ${k.format} · ${k.status}`}` with `{`Knockout · ${formatLabel(k)} · ${k.status}`}`.

In `mobile/src/components/knockout/KnockoutRow.tsx`, import `formatLabel` alongside `championName` and replace `{k.format}{champion ? …}` with `{formatLabel(k)}{champion ? ` · Champion ${champion}` : ''}`.

Two more places print the raw format (a cricket knockout would read "teams · 6 players"). In `mobile/src/app/quick/index.tsx` (line ~67) and `mobile/src/components/home/PlayPortal.tsx` (line ~301), import `formatLabel` from `@/lib/quickKnockoutView` and replace `${knockout.format} · ${knockout.players.length} players` with `${formatLabel(knockout)} · ${knockout.players.length} players`.

In `mobile/test-utils/colourLiterals.ts`, add to `MIGRATED`:

```ts
  'src/components/knockout/PlayerLine.tsx',
  'src/components/knockout/CricketTeams.tsx',
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/CricketTeams.test.tsx __tests__/KnockoutWaitingRoom.test.tsx __tests__/KnockoutScreen.test.tsx __tests__/KnockoutListScreen.test.tsx __tests__/QuickMatchesScreen.test.tsx __tests__/PlayPortal.test.tsx __tests__/colourLiterals.test.ts __tests__/fontLeading.test.ts __tests__/pressableStyleFence.test.ts`
Expected: PASS.

- [ ] **Step 7: Types and lint**

Run: `cd /d/kria/mobile && pwd && npx tsc --noEmit && npx eslint src/components/knockout/PlayerLine.tsx src/components/knockout/CricketTeams.tsx src/components/knockout/KnockoutWaitingRoom.tsx "src/app/knockout/[id].tsx" src/components/knockout/KnockoutRow.tsx src/app/quick/index.tsx src/components/home/PlayPortal.tsx test-utils/colourLiterals.ts`
Expected: both exit 0.

- [ ] **Step 8: Commit**

```bash
cd /d/kria/mobile && pwd && git add src/components/knockout/PlayerLine.tsx src/components/knockout/CricketTeams.tsx src/components/knockout/KnockoutWaitingRoom.tsx "src/app/knockout/[id].tsx" src/components/knockout/KnockoutRow.tsx src/app/quick/index.tsx src/components/home/PlayPortal.tsx test-utils/colourLiterals.ts __tests__/CricketTeams.test.tsx __tests__/KnockoutWaitingRoom.test.tsx && git commit -m "feat cricket knockout waiting room shows team cards the host arranges" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git status --short
```

---

### Task 9: Join — pick a team

**Files:**
- Modify: `mobile/src/app/quick/join.tsx`
- Test: modify `mobile/__tests__/JoinScreen.test.tsx`

**Interfaces:**
- Consumes (Task 6): `joinQuickKnockout(code, teamId?)`, `teamPlayers`, `formatLabel`.

- [ ] **Step 1: Write the failing tests**

Append to `mobile/__tests__/JoinScreen.test.tsx`:

```ts
const cricket = {
  _id: 'k2', hostId: 'h1', name: 'Sunday Cup', sport: 'cricket', format: 'teams', status: 'waiting',
  matchConfig: { maxOvers: 8, playersPerTeam: 2 },
  teams: [{ teamId: 't1', name: 'Strikers' }, { teamId: 't2', name: 'Royals' }, { teamId: 't3', name: 'Team 3' }],
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta', teamId: 't1' },
    { playerKey: 'g', displayName: 'Sam', teamId: 't1' },
  ],
};

it('a cricket knockout: pick a team, then join it', async () => {
  (resolveQuickCode as jest.Mock).mockResolvedValue({ kind: 'knockout', data: cricket });
  await lookUp('KX4P9M');
  expect(await screen.findByText('Knockout · Cricket · 8 overs')).toBeTruthy();
  fireEvent.press(screen.getByText('Royals'));
  fireEvent.press(screen.getByText('Join as Rahul Singh'));
  await waitFor(() => expect(joinQuickKnockout).toHaveBeenCalledWith('KX4P9M', 't2'));
});

it('a cricket knockout: no pick joins Any team, and a full team cannot be picked', async () => {
  (resolveQuickCode as jest.Mock).mockResolvedValue({ kind: 'knockout', data: cricket });
  await lookUp('KX4P9M');
  expect(await screen.findByText('Full')).toBeTruthy();
  fireEvent.press(screen.getByText('Strikers'));
  fireEvent.press(screen.getByText('Join as Rahul Singh'));
  await waitFor(() => expect(joinQuickKnockout).toHaveBeenCalledWith('KX4P9M'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/JoinScreen.test.tsx`
Expected: FAIL — no team list; label reads `Knockout · teams`.

- [ ] **Step 3: Implement**

In `mobile/src/app/quick/join.tsx`:
- Add `import { formatLabel, teamPlayers } from '@/lib/quickKnockoutView';`.
- Add state next to `knockout`: `const [teamId, setTeamId] = useState<string | null>(null);` and in `lookup`, right after `setProblem('');`, add `setTeamId(null);`.
- Replace `{`Knockout · ${knockout.format}`}` with `{`Knockout · ${formatLabel(knockout)}`}`.
- In the waiting, not-yet-in branch (the fragment that starts with the "Join as …" `Pressable`), insert before that `Pressable`:

```tsx
                {knockout.sport === 'cricket' ? (
                  <>
                    <Text style={{ ...LBL, marginTop: 14 }}>Pick your team</Text>
                    {(knockout.teams ?? []).map((team) => {
                      const count = teamPlayers(knockout, team.teamId).length;
                      const full = count >= (knockout.matchConfig.playersPerTeam ?? 0);
                      const on = teamId === team.teamId;
                      return (
                        <Pressable
                          key={team.teamId}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on, disabled: full }}
                          disabled={full || busy}
                          onPress={() => setTeamId(team.teamId)}
                          style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: on ? '#F97316' : 'rgba(255,255,255,0.14)', borderRadius: 4, paddingVertical: 12, paddingHorizontal: 12, opacity: full ? 0.45 : 1 }}
                        >
                          <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: '#fff' }}>{team.name}</Text>
                          <Text style={LBL}>{full ? 'Full' : `${count}/${knockout.matchConfig.playersPerTeam}`}</Text>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: teamId === null }}
                      disabled={busy}
                      onPress={() => setTeamId(null)}
                      style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: teamId === null ? '#F97316' : 'rgba(255,255,255,0.14)', borderRadius: 4, paddingVertical: 12, paddingHorizontal: 12 }}
                    >
                      <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: '#fff' }}>Any team</Text>
                      <Text style={LBL}>The draw places you</Text>
                    </Pressable>
                  </>
                ) : null}
```

- Change the "Join as …" button's `onPress` to:

```tsx
onPress={() => enterKnockout(() => (teamId ? joinQuickKnockout(code, teamId) : joinQuickKnockout(code)))}
```

(Two calls rather than `joinQuickKnockout(code, teamId ?? undefined)`, so an Any-team join is exactly the old single-argument call.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/JoinScreen.test.tsx __tests__/quickBackNavigation.test.tsx __tests__/pressableStyleFence.test.ts`
Expected: PASS.

- [ ] **Step 5: Types and lint**

Run: `cd /d/kria/mobile && pwd && npx tsc --noEmit && npx eslint src/app/quick/join.tsx`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
cd /d/kria/mobile && pwd && git add src/app/quick/join.tsx __tests__/JoinScreen.test.tsx && git commit -m "feat joining a cricket knockout picks a team or any team" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git status --short
```

---

### Task 10: Match screen — knockout-managed cricket panel, tie pick, awards by sport

**Files:**
- Create: `mobile/src/components/knockout/TiePick.tsx`
- Modify: `mobile/src/app/quick/[id].tsx`, `mobile/src/components/quick/CricketScorePanel.tsx`, `mobile/src/app/knockout/awards/[id].tsx`, `mobile/test-utils/colourLiterals.ts`
- Test: modify `mobile/__tests__/QuickMatchScreen.test.tsx`, `mobile/__tests__/CricketScorePanel.test.tsx`, `mobile/__tests__/KnockoutAwardsScreen.test.tsx`

**Interfaces:**
- Consumes (Task 6): `settleKnockoutTie(id, { fixtureId, entrantId })`, `QuickMatch.tieWinnerSideId`, `awardBadges(k)`.
- Produces: `TiePick({ match, isHost, busy, onPick(sideId) })`; host button labels `<side> goes through`; heading `Tied — who goes through?`; non-host text `Tied — waiting for the host to pick who goes through`.

- [ ] **Step 1: Write the failing tests**

In `mobile/__tests__/QuickMatchScreen.test.tsx`:
- Add `Alert` to the `react-native` import and `settleKnockoutTie` to the `@/api/quickKnockout` import.
- In the `jest.mock('@/api/quickKnockout', …)` factory, add `settleKnockoutTie: jest.fn(),`.
- Add `let mockMatchOver: Record<string, unknown> = {};` next to the other `mock*` lets, spread `...mockMatchOver,` as the last key of the mocked `match` object, and add `mockMatchOver = {};` to the `beforeEach`.

Append:

```tsx
describe('a tied knockout match', () => {
  const tied = {
    sport: 'cricket', outcome: 'tied',
    cricketSetup: { toss: { recorded: true, winnerTeamId: 's1', decision: 'bat' }, lineupsSet: true, side1Lineup: [], side2Lineup: [] },
    liveState: { matchStatus: 'completed', currentInnings: 2, runs: 0, wickets: 0, completedOvers: 1, ballsInCurrentOver: 0 },
  };
  beforeEach(() => { mockKnockoutId = 'k1'; mockStatus = 'completed'; mockMatchOver = tied; });
  const confirmEveryAlert = () => jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => { buttons?.[1]?.onPress?.(); });

  it('asks the host who goes through, and records the pick after confirming', async () => {
    mockViewer = 'h1';
    confirmEveryAlert();
    (settleKnockoutTie as jest.Mock).mockResolvedValue({ _id: 'k1', status: 'live', awardsEligible: true, awards: [] });
    render(<QuickMatchScreen />);
    expect(screen.getByText('Tied — who goes through?')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Rahul goes through'));
    await waitFor(() => expect(settleKnockoutTie).toHaveBeenCalledWith('k1', { fixtureId: 'f1', entrantId: 's2' }));
    expect(router.push).not.toHaveBeenCalledWith(expect.objectContaining({ pathname: '/knockout/awards/[id]' }));
  });

  it('opens the awards when the pick decides the final', async () => {
    mockViewer = 'h1';
    confirmEveryAlert();
    (settleKnockoutTie as jest.Mock).mockResolvedValue({ _id: 'k1', status: 'completed', awardsEligible: true, awards: [] });
    render(<QuickMatchScreen />);
    fireEvent.press(screen.getByLabelText('Arjun goes through'));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/knockout/awards/[id]', params: { id: 'k1' } }));
  });

  it('tells a player who is not the host to wait', () => {
    mockViewer = 'p2';
    render(<QuickMatchScreen />);
    expect(screen.getByText('Tied — waiting for the host to pick who goes through')).toBeTruthy();
    expect(screen.queryByLabelText('Rahul goes through')).toBeNull();
  });

  it('shows who went through once picked', () => {
    mockViewer = 'h1';
    mockMatchOver = { ...tied, tieWinnerSideId: 's2' };
    render(<QuickMatchScreen />);
    expect(screen.getByText('Tied · Rahul went through')).toBeTruthy();
    expect(screen.queryByText('Tied — who goes through?')).toBeNull();
  });
});
```

Append inside `describe('CricketScorePanel', …)` in `mobile/__tests__/CricketScorePanel.test.tsx`:

```tsx
  it('a knockout match offers no cancel and no join code — the knockout manages it', () => {
    const plain = render(<CricketScorePanel match={live(midInnings)} playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()} onCancel={jest.fn()} />);
    expect(plain.queryByText('Cancel match')).toBeTruthy();
    expect(plain.queryByTestId('join-code')).toBeTruthy();
    plain.unmount();

    const managed = render(<CricketScorePanel match={live(midInnings, { knockoutId: 'k1' })} playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()} onCancel={jest.fn()} />);
    expect(managed.queryByText('Cancel match')).toBeNull();
    expect(managed.queryByTestId('join-code')).toBeNull();
  });
```

Append to `mobile/__tests__/KnockoutAwardsScreen.test.tsx`:

```tsx
it('a cricket knockout offers its three badges, without Ace Serve', () => {
  mockKo = k({ sport: 'cricket', format: 'teams', matchConfig: { maxOvers: 8, playersPerTeam: 6 } });
  render(<AwardsScreen />);
  expect(screen.getByText('Fair Play')).toBeTruthy();
  expect(screen.queryByText('Ace Serve')).toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/QuickMatchScreen.test.tsx __tests__/CricketScorePanel.test.tsx __tests__/KnockoutAwardsScreen.test.tsx`
Expected: FAIL — no tie picker; cancel shown on a knockout match; Ace Serve offered.

- [ ] **Step 3: `CricketScorePanel` — managed by the knockout**

In `mobile/src/components/quick/CricketScorePanel.tsx`, after `const isHost = …;` add:

```ts
  // Same rule as badminton's MatchPanel: a knockout match is run by its
  // knockout, so it has no join code to hand out and no cancel of its own.
  const managed = Boolean(match.knockoutId);
```

Change the `joinCodeRow` condition to start `isHost && !managed && match.status === 'live' && …`, and change `const cancelRow = (` … `);` to `const cancelRow = managed ? null : (` … `);`.

- [ ] **Step 4: `TiePick`**

Create `mobile/src/components/knockout/TiePick.tsx`:

```tsx
import { Alert, View, Text, Pressable } from 'react-native';
import type { QuickMatch } from '@/api/quickMatch';
import { useTheme } from '@/lib/theme';

/**
 * A tied knockout match still needs a team to go through. The teams settle it
 * on the ground — super over, bowl-out, toss — and the host records who won
 * it. The match itself stays a tie in everyone's record.
 */
export function TiePick({ match, isHost, busy, onPick }: {
  match: QuickMatch;
  isHost: boolean;
  busy: boolean;
  onPick: (sideId: string) => void;
}) {
  const t = useTheme();
  const label = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.brandInk };
  const body = { fontFamily: 'SpaceGrotesk_400Regular' as const, fontSize: 13, lineHeight: 19, color: t.textMeta };

  if (!isHost) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={body}>Tied — waiting for the host to pick who goes through</Text>
      </View>
    );
  }

  const confirm = (side: QuickMatch['sides'][number]) =>
    Alert.alert(`${side.name} go through?`, 'Settle it on the ground first: super over, bowl-out or toss. This cannot be changed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: `${side.name} go through`, onPress: () => onPick(side.sideId) },
    ]);

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 10 }}>
      <Text style={label}>Tied — who goes through?</Text>
      <Text style={body}>Settle it on the ground, then tap the team that won it.</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {match.sides.map((side) => (
          <Pressable
            key={side.sideId}
            accessibilityRole="button"
            accessibilityLabel={`${side.name} goes through`}
            disabled={busy}
            onPress={() => confirm(side)}
            style={{ flex: 1, minHeight: 48, borderRadius: 5, borderWidth: 1.5, borderColor: t.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, opacity: busy ? 0.5 : 1 }}
          >
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: t.text }}>{side.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
```

Add `'src/components/knockout/TiePick.tsx',` to `MIGRATED` in `mobile/test-utils/colourLiterals.ts`.

- [ ] **Step 5: Match screen**

In `mobile/src/app/quick/[id].tsx`:
- Change the knockout API import to `import { getQuickKnockout, settleKnockoutTie } from '@/api/quickKnockout';` and add `import { TiePick } from '@/components/knockout/TiePick';`.
- After the awards auto-open `useEffect`, add:

```tsx
  // A tied knockout match waits for the host to say who went through. When
  // that pick decides the final, it is the moment the knockout finishes, so
  // the awards open here — the completion watcher above saw no champion.
  const [tieBusy, setTieBusy] = useState(false);
  const [tieProblem, setTieProblem] = useState('');
  const tieOpen = Boolean(match?.knockoutId && match.status === 'completed' && match.outcome === 'tied' && !match.tieWinnerSideId);
  const pickTie = async (sideId: string) => {
    if (!match?.knockoutId || !match.fixtureId) return;
    setTieBusy(true);
    setTieProblem('');
    try {
      const k = await settleKnockoutTie(String(match.knockoutId), { fixtureId: match.fixtureId, entrantId: sideId });
      reload();
      if (k.status === 'completed' && k.awardsEligible && k.awards.length === 0) {
        router.push({ pathname: '/knockout/awards/[id]', params: { id: String(match.knockoutId) } });
      }
    } catch (err) {
      setTieProblem((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not record that. Please try again.');
    } finally {
      setTieBusy(false);
    }
  };
```

- After the `cricket-score` panel block, add:

```tsx
        {match && tieOpen ? (
          <TiePick match={match} isHost={isHost(match, user?._id)} busy={tieBusy} onPick={pickTie} />
        ) : null}

        {tieProblem ? (
          <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#FF4438', marginTop: 12, paddingHorizontal: 20 }}>
            {tieProblem}
          </Text>
        ) : null}
```

- [ ] **Step 6: Awards screen by sport**

In `mobile/src/app/knockout/awards/[id].tsx`, replace `QUICK_AWARD_BADGES` with `awardBadges` in the `@/lib/quickKnockoutView` import, and replace `{Object.entries(QUICK_AWARD_BADGES).map(([key, name]) => (` with `{awardBadges(k).map(([key, name]) => (`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/QuickMatchScreen.test.tsx __tests__/CricketScorePanel.test.tsx __tests__/KnockoutAwardsScreen.test.tsx __tests__/colourLiterals.test.ts __tests__/fontLeading.test.ts __tests__/pressableStyleFence.test.ts`
Expected: PASS.

- [ ] **Step 8: Full mobile gates**

Run: `cd /d/kria/mobile && pwd && npx tsc --noEmit && npx eslint src/components/knockout/TiePick.tsx "src/app/quick/[id].tsx" src/components/quick/CricketScorePanel.tsx "src/app/knockout/awards/[id].tsx" test-utils/colourLiterals.ts && npx jest`
Expected: all exit 0; the suite passes (baseline 124 suites / 1170 tests; now 125 suites).

- [ ] **Step 9: Commit**

```bash
cd /d/kria/mobile && pwd && git add src/components/knockout/TiePick.tsx "src/app/quick/[id].tsx" src/components/quick/CricketScorePanel.tsx "src/app/knockout/awards/[id].tsx" test-utils/colourLiterals.ts __tests__/QuickMatchScreen.test.tsx __tests__/CricketScorePanel.test.tsx __tests__/KnockoutAwardsScreen.test.tsx && git commit -m "feat cricket knockout matches settle a tie and offer cricket awards" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git status --short
```

---

## After the last task

- Final whole-branch review (both repos), then `superpowers:finishing-a-development-branch` in each repo — last time the user chose **merge to main locally**. Never push.
- Update `D:\kria\daily-log\2026-10-07.md` in plain language for a non-technical team; engineering leftovers in a short "For the engineers" section (open follow-ups: in-app super over; players switching their own team; the inherited "overs > 4 × squad" bowler limit).
