# Table Tennis Quick Host Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players can host a table tennis quick match or quick knockout, scored point by point, recorded as `table_tennis`.

**Architecture:** Table tennis is a rally sport like badminton. The server gets one `RALLY_FORMATS` table (per-sport best-of sets, points sets, defaults, cap) and a `table_tennis` discriminator built from the same schema factory as badminton; the existing badminton quick scorer serves both, passing table tennis `cap: Infinity`. The mobile wizards add a third sport card and read a mirrored `RALLY_FORMATS` for their format step.

**Tech Stack:** Server — Node/Express, Mongoose 8, express-validator 7, vitest + mongodb-memory-server. Mobile — Expo SDK 57, React Native 0.86, TypeScript 6, jest-expo + @testing-library/react-native.

**Spec:** `mobile/docs/superpowers/specs/2026-10-15-quick-table-tennis-design.md`

## Global Constraints

- Two git repos: `D:\kria\server` (tasks 1–4) and `D:\kria\mobile` (tasks 5–10). Run commands from that repo's root.
- Badminton formats unchanged: best of `1, 3, 5`; points `11, 15, 21`; cap `30`; quick-match defaults best of 3, 21 points.
- Table tennis formats: best of `1, 3, 5, 7`; points `11, 21`; **no cap** (win by 2 forever); quick-match defaults best of 3, 11 points.
- Knockout wizard defaults stay one game (`bestOf: 1`); points default to the sport's (badminton 21, table tennis 11).
- Scoring routes are not renamed: `POST /quick-match/:id/badminton/point` and `/undo` serve both rally sports.
- A knockout body with no `sport` is badminton (older apps).
- No new dependencies in either repo. Mobile installs (none expected) need `--legacy-peer-deps`.
- Mobile: never write `style={({ pressed }) => …}` on a Pressable (NativeWind drops it on native; `__tests__/pressableStyleFence.test.ts` guards this).
- Server commit messages must match `^(feat|fix|test|…) .*$` — verb, then a space: `feat : …`. The pre-commit hook runs `npm run lint:fix && npm run build`.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Commit steps run only if the user has OK'd committing; otherwise skip them and leave the changes uncommitted.

## Review Focus

1. Knockout wizard: host picks table tennis, sets best of 7, then switches back to badminton — the body must carry a badminton-valid format (best of 1, 21 points), not the 7 the server would 422. → test in Task 8.
2. An older app posts a knockout with no `sport` — it must still be stored as badminton. → test in Task 4.
3. A table tennis game that ends without deuce (11-9) must complete, while 11-10 must not. → test in Task 3.
4. The review step must never show the raw key `table_tennis`. → test in Task 7.
5. Four best-of buttons on a 360 dp-wide phone must not wrap or clip. Not testable in jest → manual check in Task 10.

---

## Server (`D:\kria\server`)

### Task 1: Rally formats and the table tennis model

**Files:**
- Modify: `src/models/quickMatch.model.ts:114-182` (sport union; replace the `// ── Badminton` section)
- Modify: `src/repository/quickMatch.repository.ts:1-34`
- Test: `test/quickTableTennisModel.test.ts` (create)

**Interfaces:**
- Produces (from `src/models/quickMatch.model.ts`):
  - `RALLY_FORMATS: Record<'badminton' | 'table_tennis', { bestOf: number[]; pointsToWin: number[]; defaults: { bestOf: number; pointsToWin: number }; cap: number }>`
  - `type RallySport = 'badminton' | 'table_tennis'`
  - `isRallySport(sport: unknown): sport is RallySport`
  - `IQuickMatch['sport']` = `'badminton' | 'table_tennis' | 'cricket'`
  - `IQuickTableTennisMatch`, `QuickTableTennisMatchModel`
- Produces (repository): `QuickMatchRepository.create(sport: IQuickMatch['sport'], doc)`

- [ ] **Step 1: Write the failing test**

Create `test/quickTableTennisModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { QuickMatchRepository } from '../src/repository/quickMatch.repository';
import { RALLY_FORMATS, isRallySport } from '../src/models/quickMatch.model';

const oid = () => new mongoose.Types.ObjectId().toString();
const repo = new QuickMatchRepository();
const sides = () => [
    { sideId: oid(), name: 'A', slots: [{ slotId: oid(), displayName: 'A' }] },
    { sideId: oid(), name: 'B', slots: [{ slotId: oid(), displayName: 'B' }] },
];
type Rally = { sport: string; matchConfig: { bestOf: number; pointsToWin: number }; gameScores: unknown[] };

describe('table tennis quick match model', () => {
    it('stores its own sport with table tennis defaults', async () => {
        const m = await repo.create('table_tennis', { hostId: oid(), sides: sides(), joinCode: 'TTAB23' }) as unknown as Rally;
        expect(m.sport).toBe('table_tennis');
        expect(m.matchConfig.bestOf).toBe(3);
        expect(m.matchConfig.pointsToWin).toBe(11);
        expect(m.gameScores).toEqual([]);
    });

    it('leaves badminton defaults alone', async () => {
        const m = await repo.create('badminton', { hostId: oid(), sides: sides(), joinCode: 'BDAB23' }) as unknown as Rally;
        expect(m.sport).toBe('badminton');
        expect(m.matchConfig.bestOf).toBe(3);
        expect(m.matchConfig.pointsToWin).toBe(21);
    });

    it('knows the rally sports and their caps', () => {
        expect(isRallySport('badminton')).toBe(true);
        expect(isRallySport('table_tennis')).toBe(true);
        expect(isRallySport('cricket')).toBe(false);
        expect(RALLY_FORMATS.badminton.cap).toBe(30);
        expect(RALLY_FORMATS.table_tennis.cap).toBe(Infinity);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/quickTableTennisModel.test.ts`
Expected: FAIL — `isRallySport is not a function`, and the first test stores `sport: 'badminton'`.

- [ ] **Step 3: Implement the model**

In `src/models/quickMatch.model.ts`, change the base interface's sport (line 117):

```ts
    sport: 'badminton' | 'table_tennis' | 'cricket';
```

Replace everything from `// ── Badminton ──` down to the end of the `QuickBadmintonMatchModel` declaration (lines 138-182) with:

```ts
// ── Rally sports: badminton and table tennis ─────────────────────────────
// Scored point by point, game by game, by one scorer
// (sports/badminton/services/quickBadmintonScoring.service.ts). All that
// differs per sport is these numbers. The quick-match and knockout validators,
// the knockout schema and the scorer's cap read them; the mobile host wizard
// mirrors them (mobile/src/lib/quickHostWizard.ts).
type RallyFormat = {
    bestOf: number[];
    pointsToWin: number[];
    defaults: { bestOf: number; pointsToWin: number };
    cap: number;
};

export const RALLY_FORMATS: Record<'badminton' | 'table_tennis', RallyFormat> = {
    badminton: { bestOf: [1, 3, 5], pointsToWin: [11, 15, 21], defaults: { bestOf: 3, pointsToWin: 21 }, cap: 30 },
    // No cap: a table tennis game goes on until someone leads by 2.
    table_tennis: { bestOf: [1, 3, 5, 7], pointsToWin: [11, 21], defaults: { bestOf: 3, pointsToWin: 11 }, cap: Infinity },
};
export type RallySport = keyof typeof RALLY_FORMATS;
export const isRallySport = (sport: unknown): sport is RallySport => sport === 'badminton' || sport === 'table_tennis';

const quickGameScoreSchema = new mongoose.Schema(
    {
        gameNumber: { type: Number, required: true, min: 1 },
        side1Score: { type: Number, required: true, min: 0, default: 0 },
        side2Score: { type: Number, required: true, min: 0, default: 0 },
        winnerSideId: { type: String },
    },
    { _id: false }
);

type QuickGameScore = { gameNumber: number; side1Score: number; side2Score: number; winnerSideId?: string };

interface IQuickRallyFields {
    gameScores: QuickGameScore[];
    /** The score the most recent point was played from — see the schema note. */
    previousGameScores?: QuickGameScore[];
    matchConfig: { bestOf: number; pointsToWin: number };
}

export interface IQuickBadmintonMatch extends IQuickMatch, IQuickRallyFields {
    sport: 'badminton';
}

export interface IQuickTableTennisMatch extends IQuickMatch, IQuickRallyFields {
    sport: 'table_tennis';
}

/** A fresh schema per sport, so two discriminators never share one Schema instance. */
const rallySchema = (defaults: RallyFormat['defaults']) => new mongoose.Schema({
    gameScores: { type: [quickGameScoreSchema], default: [] },
    // One level of undo, and only one.
    //
    // Rally sports store cumulative scores only — unlike cricket, where
    // every Ball carries its own `liveStateBefore` and undo simply reads
    // the ledger back. There is no per-point history here at all, so the
    // undo has to create what it restores from: `recordPoint` copies the
    // pre-point `gameScores` in here on every point, and `undoLastPoint`
    // restores it and clears it again.
    //
    // `default: undefined` is load-bearing. Mongoose gives every array
    // path a default of `[]`, and `[]` is a LEGITIMATE snapshot — it is
    // exactly what the very first point of a match is undone to. Without
    // this, "nothing to undo" and "undo back to 0-0" would be the same
    // stored value and a second consecutive undo would silently no-op
    // instead of being refused.
    previousGameScores: { type: [quickGameScoreSchema], default: undefined },
    matchConfig: {
        bestOf: { type: Number, default: defaults.bestOf },
        pointsToWin: { type: Number, default: defaults.pointsToWin },
    },
});

export const QuickBadmintonMatchModel = QuickMatchModel.discriminator<IQuickBadmintonMatch>(
    'badminton',
    rallySchema(RALLY_FORMATS.badminton.defaults)
);

export const QuickTableTennisMatchModel = QuickMatchModel.discriminator<IQuickTableTennisMatch>(
    'table_tennis',
    rallySchema(RALLY_FORMATS.table_tennis.defaults)
);
```

In `src/repository/quickMatch.repository.ts`, replace lines 1-7:

```ts
import QuickMatchModel, {
    IQuickMatch,
    QuickBadmintonMatchModel,
    QuickCricketMatchModel,
    QuickTableTennisMatchModel,
} from '../models/quickMatch.model';

type SportKey = IQuickMatch['sport'];
```

and in `create`, replace the final `return QuickBadmintonMatchModel.create(doc);` with:

```ts
        if (sport === 'table_tennis') return QuickTableTennisMatchModel.create(doc);
        return QuickBadmintonMatchModel.create(doc);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/quickTableTennisModel.test.ts test/quickMatchModel.test.ts test/quickMatchRepository.test.ts test/quickBadmintonUndo.test.ts`
Expected: PASS (the badminton suites prove the schema factory changed nothing for badminton).

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/models/quickMatch.model.ts src/repository/quickMatch.repository.ts test/quickTableTennisModel.test.ts
git commit -m "feat : add table tennis quick match model and rally formats" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Creating a table tennis quick match

**Files:**
- Modify: `src/middlewares/validators/quickMatch.validator.ts:1-17`
- Modify: `src/services/quickMatch.service.ts:3,11-23,79,182`
- Test: `test/quickTableTennisHttp.test.ts` (create)

**Interfaces:**
- Consumes: `RALLY_FORMATS`, `RallySport`, `isRallySport`, `IQuickMatch['sport']` (Task 1).
- Produces: `CreateQuickMatchInput.sport: IQuickMatch['sport']`; `createForKnockout(input: { sport: IQuickMatch['sport']; … })`. `POST /quick-match` accepts `sport: 'table_tennis'`.

- [ ] **Step 1: Write the failing test**

Create `test/quickTableTennisHttp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import Player from '../src/models/player.model';

let seq = 0;
async function authed() {
    seq += 1;
    const player = await Player.create({
        firstName: 'Table', lastName: `Host${seq}`,
        email: `tt${seq}-${Date.now()}@kria.test`,
        phone: '9999999999', status: 'verified', isActive: true,
    });
    return {
        token: jwt.sign({ _id: player._id.toString(), type: 'player' }, process.env.JWT_SECRET as string),
        playerId: player._id.toString(),
    };
}

const body = (sport: string, playerId: string, matchConfig?: Record<string, number>) => ({
    sport,
    sides: [
        { name: 'A', slots: [{ playerId, displayName: 'Host' }] },
        { name: 'B', slots: [{ displayName: 'Open' }] },
    ],
    ...(matchConfig ? { matchConfig } : null),
});

const create = (token: string, payload: Record<string, unknown>) =>
    request(app).post('/quick-match').set('Authorization', `Bearer ${token}`).send(payload);

describe('quick match create — table tennis', () => {
    it('creates a table tennis match on its own defaults', async () => {
        const { token, playerId } = await authed();
        const res = await create(token, body('table_tennis', playerId));
        expect(res.status).toBe(200);
        expect(res.body.data.data.sport).toBe('table_tennis');
        expect(res.body.data.data.matchConfig).toEqual({ bestOf: 3, pointsToWin: 11 });
    });

    it('accepts best of 7 to 21 for table tennis', async () => {
        const { token, playerId } = await authed();
        const res = await create(token, body('table_tennis', playerId, { bestOf: 7, pointsToWin: 21 }));
        expect(res.status).toBe(200);
        expect(res.body.data.data.matchConfig).toEqual({ bestOf: 7, pointsToWin: 21 });
    });

    it('422s best of 7 for badminton', async () => {
        const { token, playerId } = await authed();
        const res = await create(token, body('badminton', playerId, { bestOf: 7 }));
        expect(res.status).toBe(422);
    });

    it('422s 15 points for table tennis', async () => {
        const { token, playerId } = await authed();
        const res = await create(token, body('table_tennis', playerId, { pointsToWin: 15 }));
        expect(res.status).toBe(422);
    });

    it('422s a sport quick matches do not host', async () => {
        const { token, playerId } = await authed();
        const res = await create(token, body('tennis', playerId));
        expect(res.status).toBe(422);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/quickTableTennisHttp.test.ts`
Expected: FAIL — table tennis creates 422 (`sport must be badminton or cricket.`); best of 7 for badminton already 422s (that case passes).

- [ ] **Step 3: Implement validator and service**

In `src/middlewares/validators/quickMatch.validator.ts`, replace lines 1-17 (imports through the two badminton `matchConfig` lines) with:

```ts
import { body, param } from 'express-validator';
import { validateRequest } from './index';
import { RALLY_FORMATS, RallySport } from '../../models/quickMatch.model';

// A rally sport's format key, checked against that sport's own set. Gated on
// sport exactly as cricket's are below, so a create carrying another sport's
// format is accepted and ignored rather than 422'd (Spec 3a decision 6).
const rallyFormat = (key: 'bestOf' | 'pointsToWin') => body(`matchConfig.${key}`)
    .if(body('sport').isIn(Object.keys(RALLY_FORMATS))).optional()
    .custom((value, { req }) => RALLY_FORMATS[req.body.sport as RallySport][key].includes(value))
    .withMessage((_value, { req }) => `${key} must be one of ${RALLY_FORMATS[req.body.sport as RallySport][key].join(', ')}.`);

export const createQuickMatchValidator = [
    body('sport').isIn(['badminton', 'table_tennis', 'cricket']).withMessage('sport must be badminton, table_tennis or cricket.'),
    // Exactly two sides at launch, every sport. Settled in the plan.
    body('sides').isArray({ min: 2, max: 2 }).withMessage('A quick match needs exactly two sides.'),
    body('sides.*.name').isString().trim().notEmpty().withMessage('Each side needs a name.'),
    body('sides.*.slots').isArray({ min: 1 }).withMessage('Each side needs at least one slot.'),
    body('sides.*.slots.*.displayName').isString().trim().notEmpty().withMessage('Each slot needs a display name.'),
    body('sides.*.slots.*.playerId').optional().isMongoId().withMessage('playerId must be a valid id.'),
    body('waitForPlayers').optional().isBoolean({ strict: true }).withMessage('waitForPlayers must be true or false.'),
    // Rally format. Optional — omitted, the sport's schema defaults (best of 3,
    // to 21 for badminton or 11 for table tennis) still apply.
    body('matchConfig').optional().isObject().withMessage('matchConfig must be an object.'),
    rallyFormat('bestOf'),
    rallyFormat('pointsToWin'),
```

(The cricket lines that follow — the comment starting `// Cricket format.` through `...validateRequest` — stay as they are.)

In `src/services/quickMatch.service.ts`:

Line 3 becomes:

```ts
import { IQuickMatch, isRallySport } from '../models/quickMatch.model';
```

Lines 11-16 (`CreateQuickMatchInput` head and its matchConfig note) become:

```ts
export type CreateQuickMatchInput = {
    sport: IQuickMatch['sport'];
    sides: { name: string; slots: { playerId?: string; displayName: string }[] }[];
    /** Rally sports (badminton, table tennis): { bestOf, pointsToWin }.
     *  Cricket: { maxOvers, maxOversPerBowler, playersPerTeam }. Each is
     *  written only for its own sport; the other sport's keys are ignored,
     *  never rejected. */
```

Line 79 becomes:

```ts
        if (isRallySport(input.sport) && input.matchConfig) {
```

Line 182 (inside `createForKnockout`'s input type) becomes:

```ts
        sport: IQuickMatch['sport'];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/quickTableTennisHttp.test.ts test/quickMatchCreateConfig.test.ts test/quickMatchHttp.test.ts test/quickMatchCreate.test.ts test/quickCricketConfig.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/middlewares/validators/quickMatch.validator.ts src/services/quickMatch.service.ts test/quickTableTennisHttp.test.ts
git commit -m "feat : accept table tennis quick matches with their own formats" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Scoring table tennis with no cap

**Files:**
- Modify: `src/sports/badminton/services/quickBadmintonScoring.service.ts:1-2,36,63,82,180`
- Modify: `src/routes/quickMatch.route.ts:38` (comment only)
- Modify: `test/quickBadmintonUndo.test.ts:281` (message regex)
- Test: `test/quickTableTennisScoring.test.ts` (create)

**Interfaces:**
- Consumes: `isRallySport`, `RALLY_FORMATS`, `RallySport` (Task 1); `quickMatchService.create` with `sport: 'table_tennis'` (Task 2).
- Produces: `quickBadmintonScoringService.recordPoint` / `undoLastPoint` accept table tennis matches; refusal message for other sports is `This is not a badminton or table tennis match.`

- [ ] **Step 1: Write the failing test**

Create `test/quickTableTennisScoring.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { quickMatchService } from '../src/services/quickMatch.service';
import { quickBadmintonScoringService as scorer } from '../src/sports/badminton/services/quickBadmintonScoring.service';
import { MatchParticipationRepository } from '../src/repository/matchParticipation.repository';

const participation = new MatchParticipationRepository();
const oid = () => new mongoose.Types.ObjectId().toString();
type Rally = { status: string; outcome?: string; gameScores: { side1Score: number; side2Score: number }[] };

/** One game, so the first game decided is the match. */
async function seed(sport: 'badminton' | 'table_tennis', pointsToWin: 11 | 21) {
    const hostId = oid();
    const opponentId = oid();
    const m = (await quickMatchService.create(hostId, {
        sport,
        sides: [
            { name: 'A', slots: [{ playerId: hostId, displayName: 'H' }] },
            { name: 'B', slots: [{ playerId: opponentId, displayName: 'O' }] },
        ],
        matchConfig: { bestOf: 1, pointsToWin },
    })).data!;
    return { hostId, opponentId, matchId: String(m._id) };
}

const point = async (matchId: string, hostId: string, side: 1 | 2) =>
    (await scorer.recordPoint(matchId, hostId, side, 1)).data as unknown as Rally;

/** Level the game at n-n, one point each way — neither side ever leads by 2. */
async function levelAt(matchId: string, hostId: string, n: number) {
    for (let i = 0; i < n; i++) {
        await point(matchId, hostId, 1);
        await point(matchId, hostId, 2);
    }
}

describe('quick table tennis scoring', () => {
    it('ends at 11-9 without deuce, but not at 11-10', async () => {
        const a = await seed('table_tennis', 11);
        for (let i = 0; i < 9; i++) await point(a.matchId, a.hostId, 2);
        for (let i = 0; i < 10; i++) await point(a.matchId, a.hostId, 1);
        const won = await point(a.matchId, a.hostId, 1); // 11-9
        expect(won.status).toBe('completed');
        expect(won.gameScores[0]).toMatchObject({ side1Score: 11, side2Score: 9 });

        const b = await seed('table_tennis', 11);
        await levelAt(b.matchId, b.hostId, 10);
        const ahead = await point(b.matchId, b.hostId, 1); // 11-10
        expect(ahead.status).toBe('live');
    });

    it('has no cap: 30-30 plays on, and a 2-point lead wins', async () => {
        const { matchId, hostId } = await seed('table_tennis', 11);
        await levelAt(matchId, hostId, 30);
        expect((await point(matchId, hostId, 1)).status).toBe('live'); // 31-30
        const m = await point(matchId, hostId, 1); // 32-30
        expect(m.status).toBe('completed');
        expect(m.outcome).toBe('side1');
        expect(m.gameScores[0]).toMatchObject({ side1Score: 32, side2Score: 30 });
    });

    it('badminton keeps its 30 cap', async () => {
        const { matchId, hostId } = await seed('badminton', 21);
        await levelAt(matchId, hostId, 29);
        const m = await point(matchId, hostId, 1); // 30-29
        expect(m.status).toBe('completed');
        expect(m.gameScores[0]).toMatchObject({ side1Score: 30, side2Score: 29 });
    });

    it('records careers as table tennis, and undo reopens the match', async () => {
        const { matchId, hostId, opponentId } = await seed('table_tennis', 11);
        for (let i = 0; i < 11; i++) await point(matchId, hostId, 2);

        const rows = await participation.findByPlayer(opponentId);
        expect(rows).toHaveLength(1);
        expect(rows[0].sport).toBe('table_tennis');
        expect(rows[0].result).toBe('won');

        const undone = (await scorer.undoLastPoint(matchId, hostId)).data as unknown as Rally;
        expect(undone.status).toBe('live');
        expect(undone.gameScores[0]).toMatchObject({ side1Score: 0, side2Score: 10 });
        expect(await participation.findByPlayer(opponentId)).toHaveLength(0);
    });

    it('still refuses a cricket match', async () => {
        const hostId = oid();
        const m = (await quickMatchService.create(hostId, {
            sport: 'cricket',
            sides: [
                { name: 'A', slots: [{ playerId: hostId, displayName: 'H' }, { displayName: 'H2' }] },
                { name: 'B', slots: [{ displayName: 'O' }, { displayName: 'O2' }] },
            ],
        })).data!;
        await expect(scorer.recordPoint(String(m._id), hostId, 1, 1))
            .rejects.toThrow(/not a badminton or table tennis match/i);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/quickTableTennisScoring.test.ts`
Expected: FAIL — every table tennis case throws `This is not a badminton match.`; the cricket case fails on the message.

- [ ] **Step 3: Implement**

In `src/sports/badminton/services/quickBadmintonScoring.service.ts`, line 2 becomes:

```ts
import { IQuickMatch, RALLY_FORMATS, RallySport, isRallySport } from '../../../models/quickMatch.model';
```

Directly above `export class QuickBadmintonScoringService {` (line 36) add:

```ts
/**
 * Scores both rally sports — badminton and table tennis. They differ only in
 * RALLY_FORMATS (best-of and points sets, and the cap), so one scorer, one
 * undo and one pair of routes serve both.
 */
```

Line 63 and line 180 (the two sport guards) each become:

```ts
        if (!isRallySport(match.sport)) throw new BadRequestError('This is not a badminton or table tennis match.');
```

Line 82 becomes:

```ts
        const cfg = {
            bestOf: match.matchConfig?.bestOf,
            pointsToWin: match.matchConfig?.pointsToWin,
            // Badminton stops at 30; table tennis has no cap (Infinity).
            cap: RALLY_FORMATS[match.sport as RallySport].cap,
        };
```

In `src/routes/quickMatch.route.ts`, directly above line 38 add:

```ts
// Both rally sports, badminton and table tennis, score here.
```

In `test/quickBadmintonUndo.test.ts` line 281, change the regex to:

```ts
        ).rejects.toThrow(/not a badminton or table tennis match/i);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/quickTableTennisScoring.test.ts test/quickBadmintonScoring.test.ts test/quickBadmintonUndo.test.ts test/quickBadmintonHttp.test.ts test/quickBadmintonUndoHttp.test.ts test/quickMatchCareer.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/sports/badminton/services/quickBadmintonScoring.service.ts src/routes/quickMatch.route.ts test/quickBadmintonUndo.test.ts test/quickTableTennisScoring.test.ts
git commit -m "feat : score table tennis quick matches with no cap" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Table tennis knockouts

**Files:**
- Modify: `src/models/quickKnockout.model.ts:79,85,131`
- Modify: `src/middlewares/validators/quickKnockout.validator.ts:1-17`
- Modify: `src/services/quickKnockout.service.ts:38-40,185`
- Modify: `src/services/knockoutSports.ts:29-39`
- Test: `test/quickKnockoutTableTennis.test.ts` (create)

**Interfaces:**
- Consumes: `RALLY_FORMATS`, `RallySport` (Task 1); `createForKnockout` sport type (Task 2); scorer accepts table tennis (Task 3).
- Produces: `IQuickKnockout['sport']` = `'badminton' | 'table_tennis' | 'cricket'`; `CreateKnockoutInput` rally variant `{ sport?: RallySport; format; matchConfig: { bestOf: 1 | 3 | 5 | 7; pointsToWin: 11 | 15 | 21 }; name? }`; `knockoutSports.table_tennis`.

- [ ] **Step 1: Write the failing test**

Create `test/quickKnockoutTableTennis.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import Player from '../src/models/player.model';
import QuickMatchModel from '../src/models/quickMatch.model';
import { quickKnockoutService } from '../src/services/quickKnockout.service';
import { quickBadmintonScoringService } from '../src/sports/badminton/services/quickBadmintonScoring.service';

let seq = 0;
async function makePlayer(firstName: string) {
    seq += 1;
    const p = await Player.create({ firstName, lastName: 'T', email: `ktt${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true });
    return p._id.toString();
}
const as = (playerId: string) => ({ Authorization: `Bearer ${jwt.sign({ _id: playerId, type: 'player' }, process.env.JWT_SECRET as string)}` });

describe('table tennis knockout', () => {
    it('stores the sport and plays table tennis matches in its format', async () => {
        const hostId = await makePlayer('Host');
        const k = (await quickKnockoutService.create(hostId, {
            sport: 'table_tennis', format: 'singles', matchConfig: { bestOf: 7, pointsToWin: 11 },
        })).data!;
        expect(k.sport).toBe('table_tennis');

        const id = String(k._id);
        for (let i = 1; i < 4; i++) await quickKnockoutService.addPlayer(id, hostId, { playerId: await makePlayer(`P${i}`) });
        await quickKnockoutService.draw(id, hostId);
        await quickKnockoutService.start(id, hostId);

        const matches = await QuickMatchModel.find({ knockoutId: id, status: 'live' });
        expect(matches).toHaveLength(2);
        for (const m of matches) {
            const cfg = (m as unknown as { matchConfig: { bestOf: number; pointsToWin: number } }).matchConfig;
            expect(m.sport).toBe('table_tennis');
            expect(cfg.bestOf).toBe(7);
            expect(cfg.pointsToWin).toBe(11);
        }
        const scored = await quickBadmintonScoringService.recordPoint(String(matches[0]._id), hostId, 1, 1);
        expect((scored.data as unknown as { gameScores: { side1Score: number }[] }).gameScores[0].side1Score).toBe(1);
    });

    it('validates formats per sport at the edge', async () => {
        const hostId = await makePlayer('Host');
        const post = (b: Record<string, unknown>) => request(app).post('/quick-knockout').set(as(hostId)).send(b);

        expect((await post({ sport: 'table_tennis', format: 'singles', matchConfig: { bestOf: 7, pointsToWin: 21 } })).status).toBe(200);
        expect((await post({ sport: 'table_tennis', format: 'singles', matchConfig: { bestOf: 3, pointsToWin: 15 } })).status).toBe(422);
        expect((await post({ format: 'singles', matchConfig: { bestOf: 7, pointsToWin: 21 } })).status).toBe(422);
        expect((await post({ sport: 'tennis', format: 'singles', matchConfig: { bestOf: 3, pointsToWin: 11 } })).status).toBe(422);
    });

    it('keeps a body with no sport as badminton (older apps)', async () => {
        const hostId = await makePlayer('Host');
        const res = await request(app).post('/quick-knockout').set(as(hostId))
            .send({ format: 'doubles', matchConfig: { bestOf: 1, pointsToWin: 21 } });
        expect(res.status).toBe(200);
        expect(res.body.data.data.sport).toBe('badminton');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/quickKnockoutTableTennis.test.ts`
Expected: FAIL — the first case stores `sport: 'badminton'` (and its matches are badminton); the table tennis HTTP create 422s on `sport`.

- [ ] **Step 3: Implement**

`src/models/quickKnockout.model.ts`:

Line 79:

```ts
        sport: { type: String, required: true, enum: ['badminton', 'table_tennis', 'cricket'], default: 'badminton' },
```

Line 85:

```ts
            // Every rally sport's best-of; createKnockoutValidator checks the sport's own set.
            bestOf: { type: Number, enum: [1, 3, 5, 7] },
```

Line 131:

```ts
    sport: 'badminton' | 'table_tennis' | 'cricket';
```

`src/middlewares/validators/quickKnockout.validator.ts`, replace lines 1-17 (imports through the `pointsToWin` line) with:

```ts
import { body, Meta, param } from 'express-validator';
import { validateRequest } from './index';
import { QUICK_AWARD_BADGES } from '../../services/quickKnockout.service';
import { RALLY_FORMATS, RallySport } from '../../models/quickMatch.model';

const id = param('id').isMongoId().withMessage('id must be a valid id.');
const joinCode = param('joinCode').isString().trim().isLength({ min: 6, max: 6 }).withMessage('joinCode must be 6 characters.');

// `.if()` takes a validator-like condition: the rest of the chain runs only
// when it returns truthy. Anything not cricket is a rally sport, and a body
// with no sport is badminton (older apps).
const cricket = (_value: unknown, { req }: Meta) => req.body?.sport === 'cricket';
const rally = (_value: unknown, { req }: Meta) => req.body?.sport !== 'cricket';
/** The rally sport's allowed values for one format key; empty for an unknown sport. */
const rallySet = (req: Meta['req'], key: 'bestOf' | 'pointsToWin'): number[] =>
    RALLY_FORMATS[(req.body?.sport ?? 'badminton') as RallySport]?.[key] ?? [];

export const createKnockoutValidator = [
    body('sport').optional().isIn(['badminton', 'table_tennis', 'cricket']).withMessage('sport must be badminton, table_tennis or cricket.'),
    body('format').if(rally).isIn(['singles', 'doubles']).withMessage('format must be singles or doubles.'),
    body('matchConfig.bestOf').if(rally).custom((value, { req }) => rallySet(req, 'bestOf').includes(value))
        .withMessage((_value, { req }) => `bestOf must be one of ${rallySet(req, 'bestOf').join(', ')}.`),
    body('matchConfig.pointsToWin').if(rally).custom((value, { req }) => rallySet(req, 'pointsToWin').includes(value))
        .withMessage((_value, { req }) => `pointsToWin must be one of ${rallySet(req, 'pointsToWin').join(', ')}.`),
```

(The cricket lines, `name` and `...validateRequest` that follow stay as they are.)

`src/services/quickKnockout.service.ts`:

Line 11 (the existing `quickMatch.model` import) becomes:

```ts
import { IQuickMatch, RallySport } from '../models/quickMatch.model';
```

Lines 38-40 become:

```ts
export type CreateKnockoutInput =
    | { sport?: RallySport; format: 'singles' | 'doubles'; matchConfig: { bestOf: 1 | 3 | 5 | 7; pointsToWin: 11 | 15 | 21 }; name?: string }
    | { sport: 'cricket'; matchConfig: { maxOvers: number; playersPerTeam: number }; teamCount: number; name?: string };
```

Line 185 becomes:

```ts
        // No sport is badminton: older apps never sent one.
        const created = await quickKnockoutRepository.create({ ...shared, sport: input.sport ?? 'badminton', format: input.format, matchConfig: input.matchConfig });
```

`src/services/knockoutSports.ts`, replace lines 29-39 (the `knockoutSports` head and the whole `badminton` entry) with:

```ts
/** Badminton and table tennis knockouts differ only in their matches' format. */
const rally: KnockoutSport = {
    minEntrants: KNOCKOUT_LIMITS.minEntrants,
    maxPlayers: (k) => KNOCKOUT_LIMITS.maxEntrants * (k.format === 'doubles' ? 2 : 1),
    awardBadges: ['iron-player', 'first-cap', 'ace-serve', 'fair-play'],
    sideName: (_k, _entrantId, players) => (players.length === 1
        ? players[0].displayName
        : players.map((p) => firstName(p.displayName)).join(' & ')),
    matchConfig: (k) => ({ bestOf: k.matchConfig.bestOf as number, pointsToWin: k.matchConfig.pointsToWin as number }),
    // Both rally sports store the same gameScores shape.
    hasStarted: async (m) => ((m as IQuickBadmintonMatch).gameScores ?? []).some((g) => g.side1Score + g.side2Score > 0),
};

export const knockoutSports: Record<IQuickKnockout['sport'], KnockoutSport> = {
    badminton: rally,
    table_tennis: rally,
```

(The `cricket: { … }` entry and closing `};` stay as they are.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/quickKnockoutTableTennis.test.ts test/quickKnockoutHttp.test.ts test/quickKnockoutScoring.test.ts test/quickKnockoutCricketCreate.test.ts test/quickKnockoutAwards.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Server gates**

Run: `npx vitest run`
Expected: every suite passes.

Run: `npx eslint --ext .ts .`
Expected: 0 errors.

Run: `npm run build`
Expected: completes.

- [ ] **Step 6: Commit**

```bash
git add src/models/quickKnockout.model.ts src/middlewares/validators/quickKnockout.validator.ts src/services/quickKnockout.service.ts src/services/knockoutSports.ts test/quickKnockoutTableTennis.test.ts
git commit -m "feat : add table tennis quick knockouts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Mobile (`D:\kria\mobile`)

### Task 5: Types and wizard logic

**Files:**
- Modify: `src/api/quickMatch.ts:27,110,120`
- Modify: `src/api/quickKnockout.ts:35,37,55`
- Modify: `src/lib/quickHostWizard.ts:4,20,47-51,79-80,116-123`
- Test: `__tests__/quickHostWizard.test.ts`

**Interfaces:**
- Produces (from `@/lib/quickHostWizard`):
  - `type Sport = 'badminton' | 'table_tennis' | 'cricket'`
  - `type RallySport = Exclude<Sport, 'cricket'>`
  - `HostDraft['bestOf']` = `1 | 3 | 5 | 7`
  - `BEST_OF[7]` = `{ label: 'Best of 7', hint: 'First to win 4 games takes the match' }`
  - `RALLY_FORMATS: Record<RallySport, { bestOf: HostDraft['bestOf'][]; points: { value: HostDraft['pointsToWin']; sub: string }[]; defaults: Pick<HostDraft, 'bestOf' | 'pointsToWin'> }>`
  - `pickSport(d: HostDraft, sport: Sport): Partial<HostDraft>`
  - `POINTS` stays exported until Task 8 removes it.
- Produces (API types): `QuickMatch.sport`, `CreateQuickMatchBody.sport`, `QuickKnockout.sport` include `'table_tennis'`; `bestOf` unions include `7`; `CreateKnockoutBody` rally variant `{ sport?: 'badminton' | 'table_tennis'; … }`.

- [ ] **Step 1: Write the failing tests**

In `__tests__/quickHostWizard.test.ts`, extend the import to:

```ts
import {
  BEST_OF,
  INITIAL_DRAFT,
  RALLY_FORMATS,
  activeSlots,
  buildCreateBody,
  formatChips,
  pickSport,
  playersBlocker,
  sideLabels,
  teamNames,
  type HostDraft,
} from '@/lib/quickHostWizard';
```

Add inside `describe('formatChips', …)`:

```ts
  it('reads table tennis best of 7 in words too', () => {
    expect(formatChips(draft({ sport: 'table_tennis', bestOf: 7, pointsToWin: 11 }))).toEqual(['Singles', 'Best of 7', '11 points']);
  });
```

Add inside `describe('buildCreateBody', …)`:

```ts
  it('sends table tennis as its own sport, with names built from players', () => {
    const body = buildCreateBody(draft({
      sport: 'table_tennis', bestOf: 7, pointsToWin: 11,
      side2: [{ displayName: 'Rahul Singh' }, { displayName: '' }],
    }), host);
    expect(body).toEqual({
      sport: 'table_tennis',
      sides: [
        { name: 'Arjun Mehta', slots: [{ playerId: 'h1', displayName: 'Arjun Mehta' }] },
        { name: 'Rahul Singh', slots: [{ displayName: 'Rahul Singh' }] },
      ],
      matchConfig: { bestOf: 7, pointsToWin: 11 },
      waitForPlayers: true,
    });
  });
```

Append at the end of the file:

```ts
describe('pickSport', () => {
  it('starts a newly picked rally sport on its own usual format', () => {
    expect(pickSport(draft({ bestOf: 5, pointsToWin: 15 }), 'table_tennis'))
      .toEqual({ sport: 'table_tennis', bestOf: 3, pointsToWin: 11 });
    expect(pickSport(draft({ sport: 'table_tennis', bestOf: 7, pointsToWin: 11 }), 'badminton'))
      .toEqual({ sport: 'badminton', bestOf: 3, pointsToWin: 21 });
  });

  it('keeps the format on a re-tap of the same sport, and for cricket', () => {
    expect(pickSport(draft({ pointsToWin: 15 }), 'badminton')).toEqual({ sport: 'badminton' });
    expect(pickSport(draft({ pointsToWin: 15 }), 'cricket')).toEqual({ sport: 'cricket' });
  });
});

describe('RALLY_FORMATS', () => {
  it('offers each sport its own sets, and defaults it can actually pick', () => {
    expect(RALLY_FORMATS.badminton.bestOf).toEqual([1, 3, 5]);
    expect(RALLY_FORMATS.badminton.points.map((p) => p.value)).toEqual([11, 15, 21]);
    expect(RALLY_FORMATS.table_tennis.bestOf).toEqual([1, 3, 5, 7]);
    expect(RALLY_FORMATS.table_tennis.points.map((p) => p.value)).toEqual([11, 21]);
    for (const f of Object.values(RALLY_FORMATS)) {
      expect(f.bestOf).toContain(f.defaults.bestOf);
      expect(f.points.map((p) => p.value)).toContain(f.defaults.pointsToWin);
      for (const n of f.bestOf) expect(BEST_OF[n]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/quickHostWizard.test.ts`
Expected: FAIL — `pickSport is not a function`, `RALLY_FORMATS` undefined, `BEST_OF[7]` undefined, table tennis body sends `sport: 'badminton'`.

- [ ] **Step 3: Implement**

`src/api/quickMatch.ts`:
- Line 27 (`QuickMatch.sport`) and line 110 (`CreateQuickMatchBody.sport`) each become `sport: 'badminton' | 'table_tennis' | 'cricket';`
- Line 120 becomes `bestOf?: 1 | 3 | 5 | 7;`
- In the doc comment above `matchConfig` (lines 113-118), change "The badminton pair are closed sets" to "The rally pair (badminton, table tennis) are closed sets".

`src/api/quickKnockout.ts`:
- Line 35: `sport: 'badminton' | 'table_tennis' | 'cricket';`
- Line 37: `matchConfig: { bestOf?: 1 | 3 | 5 | 7; pointsToWin?: 11 | 15 | 21; maxOvers?: number; playersPerTeam?: number };`
- Line 55: `| { sport?: 'badminton' | 'table_tennis'; format: 'singles' | 'doubles'; matchConfig: { bestOf: 1 | 3 | 5 | 7; pointsToWin: 11 | 15 | 21 }; name?: string }`

`src/lib/quickHostWizard.ts`:

Line 4 becomes:

```ts
export type Sport = 'badminton' | 'table_tennis' | 'cricket';
/** Scored point by point, game by game, on the same panel. */
export type RallySport = Exclude<Sport, 'cricket'>;
```

Line 20 (`bestOf` in `HostDraft`) becomes:

```ts
  bestOf: 1 | 3 | 5 | 7;
```

Replace `BEST_OF` (lines 47-51) with, and add `RALLY_FORMATS` and `pickSport` right after it:

```ts
export const BEST_OF: Record<HostDraft['bestOf'], { label: string; hint: string }> = {
  1: { label: 'One game', hint: 'A single game decides it' },
  3: { label: 'Best of 3', hint: 'First to win 2 games takes the match' },
  5: { label: 'Best of 5', hint: 'First to win 3 games takes the match' },
  7: { label: 'Best of 7', hint: 'First to win 4 games takes the match' },
};

/**
 * What each rally sport lets a host pick. Mirrors RALLY_FORMATS on the server
 * (server/src/models/quickMatch.model.ts), whose validators refuse anything else.
 */
export const RALLY_FORMATS: Record<RallySport, {
  bestOf: HostDraft['bestOf'][];
  points: { value: HostDraft['pointsToWin']; sub: string }[];
  defaults: Pick<HostDraft, 'bestOf' | 'pointsToWin'>;
}> = {
  badminton: {
    bestOf: [1, 3, 5],
    points: [{ value: 11, sub: 'Quick' }, { value: 15, sub: 'Short' }, { value: 21, sub: 'Standard' }],
    defaults: { bestOf: 3, pointsToWin: 21 },
  },
  table_tennis: {
    bestOf: [1, 3, 5, 7],
    points: [{ value: 11, sub: 'Standard' }, { value: 21, sub: 'Classic' }],
    defaults: { bestOf: 3, pointsToWin: 11 },
  },
};

/** The draft change for a sport tap. A newly picked rally sport starts on its
 *  own usual format, so badminton's 15 points never reach table tennis. */
export function pickSport(d: HostDraft, sport: Sport): Partial<HostDraft> {
  if (sport === d.sport || sport === 'cricket') return { sport };
  return { sport, ...RALLY_FORMATS[sport].defaults };
}
```

(Leave `POINTS` where it is for now; Task 8 removes it.)

In `teamNames`, change the doc comment's "(badminton)" to "(rally sports)" and line 80 to:

```ts
  const [s1, s2] = d.sport !== 'cricket' ? activeSlots(d, host) : [[], []];
```

In `buildCreateBody`, change `sport: 'badminton',` (line 119) to:

```ts
    sport: d.sport,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/quickHostWizard.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/api/quickMatch.ts src/api/quickKnockout.ts src/lib/quickHostWizard.ts __tests__/quickHostWizard.test.ts
git commit -m "feat: add table tennis to the host wizard's formats" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Paddle icon

**Files:**
- Modify: `src/components/icons/index.tsx:118` (after `shuttlecock`)
- Modify: `src/lib/sports.ts:11-16`
- Test: `__tests__/icons.test.tsx:56-59`, `__tests__/sports.test.ts`

**Interfaces:**
- Produces: `IconName` includes `'paddle'`; `SPORT_ICON.table_tennis === 'paddle'`.

- [ ] **Step 1: Write the failing tests**

In `__tests__/icons.test.tsx`, the brand glyph list (line 57) becomes:

```ts
    for (const n of ['shuttlecock', 'paddle', 'cricket-bat', 'stumps', 'court', 'gavel', 'bracket', 'ball']) {
```

In `__tests__/sports.test.ts`, change the import to `import { tournamentSports, isLiveMatch, SPORT_ICON } from '../src/lib/sports';` and append:

```ts
describe('SPORT_ICON', () => {
  it('gives table tennis its own paddle, not the badminton court', () => {
    expect(SPORT_ICON.table_tennis).toBe('paddle');
    expect(SPORT_ICON.badminton).toBe('shuttlecock');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/icons.test.tsx __tests__/sports.test.ts`
Expected: FAIL — `paddle` missing from `ICON_NAMES`; `SPORT_ICON.table_tennis` is `'court'`.

- [ ] **Step 3: Implement**

In `src/components/icons/index.tsx`, after the `shuttlecock` entry's closing `},` add:

```ts
  /** Table tennis paddle: round blade, angled handle, ball. */
  paddle: {
    paths: [
      'M10 3.5 A6.5 6.5 0 1 1 10 16.5 A6.5 6.5 0 1 1 10 3.5 Z',
      'M15.7 13.5 L20.6 18.4 L18.4 20.6 L13.5 15.7',
      'M20 3 A1.75 1.75 0 1 1 20 6.5 A1.75 1.75 0 1 1 20 3 Z',
    ],
  },
```

In `src/lib/sports.ts`, replace `SPORT_ICON` (lines 10-16):

```ts
/** Glyph per sport, for history rows and roster headers. */
export const SPORT_ICON: Record<string, 'shuttlecock' | 'paddle' | 'ball' | 'court'> = {
  badminton: 'shuttlecock',
  cricket: 'ball',
  table_tennis: 'paddle',
  tennis: 'court',
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/icons.test.tsx __tests__/sports.test.ts`
Expected: PASS (the geometry tests also check the new paths: absolute moveto, valid syntax, inside the 24 grid, one rendered path per string).

- [ ] **Step 5: Commit**

```bash
git add src/components/icons/index.tsx src/lib/sports.ts __tests__/icons.test.tsx __tests__/sports.test.ts
git commit -m "feat: add a table tennis paddle icon" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Host wizard screens

**Files:**
- Modify: `src/components/quick/HostSteps.tsx:10-20,375-382,418-440,497-540`
- Modify: `src/app/quick/new.tsx:15,26-28,134`
- Test: `__tests__/NewQuickMatchScreen.test.tsx`

**Interfaces:**
- Consumes: `RALLY_FORMATS`, `BEST_OF`, `pickSport`, `Sport` (Task 5); `'paddle'` icon (Task 6); `SPORT_LABELS` from `@/lib/sports` (existing: `table_tennis: 'Table Tennis'`).

- [ ] **Step 1: Write the failing test**

Append inside `describe('New quick match wizard', …)` in `__tests__/NewQuickMatchScreen.test.tsx`:

```tsx
  it('hosts table tennis on its own formats, and names it properly on review', async () => {
    render(<NewQuickMatchScreen />);
    fireEvent.press(screen.getByText('Table tennis'));
    fireEvent.press(screen.getByText("I'm playing"));

    // Table tennis points are 11 or 21 — badminton's 15 is not offered.
    expect(screen.queryByText('15')).toBeNull();
    fireEvent.press(screen.getByText('7'));
    fireEvent.press(screen.getByText('Continue'));

    fireEvent.changeText(screen.getByPlaceholderText("Opponent's name"), 'Rahul Singh');
    fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('Ready to go?')).toBeTruthy();
    expect(screen.getAllByText('Table Tennis').length).toBeGreaterThan(0);
    expect(screen.queryByText('table_tennis')).toBeNull();

    fireEvent.press(screen.getByText('Create match'));
    await waitFor(() => expect(createQuickMatch).toHaveBeenCalled());
    expect((createQuickMatch as jest.Mock).mock.calls[0][0]).toMatchObject({
      sport: 'table_tennis',
      matchConfig: { bestOf: 7, pointsToWin: 11 },
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/NewQuickMatchScreen.test.tsx`
Expected: FAIL — `Unable to find an element with text: Table tennis`.

- [ ] **Step 3: Implement**

`src/components/quick/HostSteps.tsx`:

In the `@/lib/quickHostWizard` import (lines 10-20) replace `POINTS,` with `RALLY_FORMATS,`, and add below that import:

```ts
import { SPORT_LABELS } from '@/lib/sports';
```

`SportStep` (lines 375-382) becomes:

```tsx
export function SportStep({ draft, onPick }: { draft: HostDraft; onPick: (sport: Sport) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <ChoiceCard icon="shuttlecock" title="Badminton" hint="Singles or doubles, rally scoring" selected={draft.sport === 'badminton'} onPress={() => onPick('badminton')} />
      <ChoiceCard icon="paddle" title="Table tennis" hint="Singles or doubles, games to 11" selected={draft.sport === 'table_tennis'} onPress={() => onPick('table_tennis')} />
      <ChoiceCard icon="cricket-bat" title="Cricket" hint="Limited overs, ball by ball" selected={draft.sport === 'cricket'} onPress={() => onPick('cricket')} />
    </View>
  );
}
```

In `FormatStep`, replace the rally `return ( <> … </> );` after the cricket branch (lines 418-440) with:

```tsx
  const formats = RALLY_FORMATS[draft.sport];
  return (
    <>
      <Segmented
        title="Format"
        options={[{ value: false, label: 'Singles', sub: '1 v 1' }, { value: true, label: 'Doubles', sub: '2 v 2' }]}
        value={draft.doubles}
        onChange={(doubles) => patch({ doubles })}
      />
      {/* The number leads so four choices fit a narrow phone; the hint spells it out. */}
      <Segmented
        title="Match length"
        options={formats.bestOf.map((n) => ({ value: n, label: String(n), sub: n === 1 ? 'One game' : 'Best of' }))}
        value={draft.bestOf}
        onChange={(bestOf) => patch({ bestOf })}
        hint={BEST_OF[draft.bestOf].hint}
      />
      <Segmented
        title="Points per game"
        options={formats.points.map((p) => ({ value: p.value, label: String(p.value), sub: p.sub }))}
        value={draft.pointsToWin}
        onChange={(pointsToWin) => patch({ pointsToWin })}
      />
    </>
  );
```

In `ReviewStep`:
- Line 500: `const people = draft.sport !== 'cricket' ? activeSlots(draft, host).map((side) => side.map((s) => s.displayName.trim()).join(' & ')) : null;`
- Line 522: `<Text style={{ ...label(t), color: t.brandInk }}>{SPORT_LABELS[draft.sport]}</Text>`
- Line 535: `{row('Sport', SPORT_LABELS[draft.sport], 0)}`
- Line 538: `{row(draft.sport === 'cricket' ? 'Teams' : 'Players', `${name1} v ${name2}`, 3)}`

`src/app/quick/new.tsx`:
- Line 15: add `pickSport` to the `@/lib/quickHostWizard` import.
- Lines 26-28 become:

```tsx
      return d.sport === 'cricket'
        ? { title: 'Name the teams', sub: 'Or skip it — they go out as Team A and Team B.' }
        : { title: "Who's playing?", sub: 'Find someone on Kria, or just type a name.' };
```

- Line 134 becomes:

```tsx
            {step === 'sport' ? <SportStep draft={draft} onPick={(sport) => { patch(pickSport(draft, sport)); go(1); }} /> : null}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/NewQuickMatchScreen.test.tsx __tests__/quickHostWizard.test.ts __tests__/pressableStyleFence.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/quick/HostSteps.tsx src/app/quick/new.tsx __tests__/NewQuickMatchScreen.test.tsx
git commit -m "feat: let hosts pick table tennis for a quick match" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Knockout wizard

**Files:**
- Modify: `src/app/knockout/new.tsx:12,29-35,46-48,82-103,118`
- Modify: `src/lib/quickHostWizard.ts` (remove `POINTS`)
- Test: `__tests__/NewKnockoutScreen.test.tsx`

**Interfaces:**
- Consumes: `BEST_OF`, `RALLY_FORMATS`, `HostDraft`, `Sport` (Task 5); `'paddle'` (Task 6); `CreateKnockoutBody` rally variant with `sport` (Task 5); `SPORT_LABELS`.
- Produces: the rally knockout body always carries `sport`.

- [ ] **Step 1: Write the failing tests**

In `__tests__/NewKnockoutScreen.test.tsx`, the first test's expectation (lines 28-30) becomes:

```tsx
  expect(createQuickKnockout).toHaveBeenCalledWith({
    sport: 'badminton', format: 'doubles', matchConfig: { bestOf: 1, pointsToWin: 21 }, name: 'Sunday Smash',
  });
```

Append:

```tsx
it('creates a table tennis knockout on table tennis formats', async () => {
  render(<NewKnockoutScreen />);
  fireEvent.press(screen.getByText('Table tennis'));
  fireEvent.press(screen.getByText('Continue'));
  expect(screen.queryByText('15')).toBeNull();
  fireEvent.press(screen.getByText('7'));
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('Create knockout'));
  await waitFor(() => expect(createQuickKnockout).toHaveBeenCalled());
  expect((createQuickKnockout as jest.Mock).mock.calls.at(-1)[0]).toEqual({
    sport: 'table_tennis', format: 'singles', matchConfig: { bestOf: 7, pointsToWin: 11 },
  });
});

it('resets to a badminton format when the host switches back from table tennis', async () => {
  render(<NewKnockoutScreen />);
  fireEvent.press(screen.getByText('Table tennis'));
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('7'));
  fireEvent.press(screen.getByLabelText('Back'));
  fireEvent.press(screen.getByText('Badminton'));
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('Create knockout'));
  await waitFor(() => expect((createQuickKnockout as jest.Mock).mock.calls.at(-1)[0].sport).toBe('badminton'));
  expect((createQuickKnockout as jest.Mock).mock.calls.at(-1)[0].matchConfig).toEqual({ bestOf: 1, pointsToWin: 21 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/NewKnockoutScreen.test.tsx`
Expected: FAIL — the badminton body has no `sport`; `Table tennis` not found.

- [ ] **Step 3: Implement**

`src/app/knockout/new.tsx`:

Line 12 becomes:

```tsx
import { BEST_OF, RALLY_FORMATS, type HostDraft, type Sport } from '@/lib/quickHostWizard';
import { SPORT_LABELS } from '@/lib/sports';
```

Lines 29-35 (sport through pointsToWin state) become:

```tsx
  const [sport, setSport] = useState<Sport>('badminton');
  const [maxOvers, setMaxOvers] = useState(8);
  const [squad, setSquad] = useState(6);
  const [teamCount, setTeamCount] = useState(4);
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles');
  const [bestOf, setBestOf] = useState<HostDraft['bestOf']>(1);
  const [pointsToWin, setPointsToWin] = useState<HostDraft['pointsToWin']>(21);
```

Directly below `const back = …` add:

```tsx
  // A newly picked rally sport starts on one game to its own usual points, so
  // table tennis's best of 7 never reaches a badminton knockout.
  const pick = (next: Sport) => {
    if (next !== sport && next !== 'cricket') {
      setBestOf(1);
      setPointsToWin(RALLY_FORMATS[next].defaults.pointsToWin);
    }
    setSport(next);
  };
```

Lines 46-48 (the body) become:

```tsx
    const body: CreateKnockoutBody = sport === 'cricket'
      ? { sport: 'cricket', matchConfig: { maxOvers, playersPerTeam: squad }, teamCount }
      : { sport, format, matchConfig: { bestOf, pointsToWin } };
```

The sport step (lines 82-87) becomes:

```tsx
          {step === 'sport' ? (
            <View style={{ gap: 12 }}>
              <ChoiceCard icon="shuttlecock" title="Badminton" hint="Singles or doubles, 3 to 16 entrants" selected={sport === 'badminton'} onPress={() => pick('badminton')} />
              <ChoiceCard icon="paddle" title="Table tennis" hint="Singles or doubles, 3 to 16 entrants" selected={sport === 'table_tennis'} onPress={() => pick('table_tennis')} />
              <ChoiceCard icon="cricket-bat" title="Cricket" hint="Teams of up to 11, 3 to 8 teams" selected={sport === 'cricket'} onPress={() => pick('cricket')} />
            </View>
          ) : null}
```

The rally format step (lines 97-103) becomes:

```tsx
          {step === 'format' && sport !== 'cricket' ? (
            <>
              <Segmented title="Format" options={[{ value: 'singles' as const, label: 'Singles', sub: '1 v 1' }, { value: 'doubles' as const, label: 'Doubles', sub: '2 v 2' }]} value={format} onChange={setFormat} />
              <Segmented title="Match length" options={RALLY_FORMATS[sport].bestOf.map((n) => ({ value: n, label: String(n), sub: n === 1 ? 'One game' : 'Best of' }))} value={bestOf} onChange={setBestOf} hint={BEST_OF[bestOf].hint} />
              <Segmented title="Points per game" options={RALLY_FORMATS[sport].points.map((p) => ({ value: p.value, label: String(p.value), sub: p.sub }))} value={pointsToWin} onChange={setPointsToWin} />
            </>
          ) : null}
```

Line 118 (review label) becomes:

```tsx
              <Text style={{ ...label, color: t.brandInk }}>{`Knockout · ${sport === 'cricket' ? 'cricket' : `${SPORT_LABELS[sport]} · ${format}`}`}</Text>
```

`src/lib/quickHostWizard.ts`: delete the `POINTS` export (`export const POINTS: Record<…> = { 11: 'Quick', 15: 'Short', 21: 'Standard' };`) — `RALLY_FORMATS` carries those captions now. Confirm nothing else uses it:

Run: `grep -rn "POINTS\b" src __tests__ | grep -v RALLY`
Expected: no output.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/NewKnockoutScreen.test.tsx __tests__/NewQuickMatchScreen.test.tsx __tests__/quickHostWizard.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/knockout/new.tsx src/lib/quickHostWizard.ts __tests__/NewKnockoutScreen.test.tsx
git commit -m "feat: let hosts run a table tennis knockout" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Sport in labels, and copy

**Files:**
- Modify: `src/lib/quickMatchView.ts:1,52-57`
- Modify: `src/lib/quickKnockoutView.ts:1,30-34`
- Modify: `src/components/home/HomeHero.tsx:246,402`
- Modify: `src/app/quick/host.tsx:26`
- Modify: `src/components/navigation/HostSheet.tsx:14`
- Test: `__tests__/quickMatchView.test.ts:134-135`, `__tests__/quickKnockoutView.test.ts:89-90`

**Interfaces:**
- Consumes: `SPORT_LABELS` (`badminton: 'Badminton'`, `table_tennis: 'Table Tennis'`, `cricket: 'Cricket'`).
- Produces: `formatLabel(match)` → `"<Sport> · Best of 3 · to 21"`; knockout `formatLabel(k)` → `"<Sport> · Singles|Doubles"` (cricket unchanged).

- [ ] **Step 1: Write the failing tests**

`__tests__/quickMatchView.test.ts` lines 134-135 become:

```ts
    expect(formatLabel(base())).toBe('Badminton · Best of 3 · to 21');
    expect(formatLabel(base({ matchConfig: { bestOf: 1, pointsToWin: 11 } }))).toBe('Badminton · Single game · to 11');
    expect(formatLabel(base({ sport: 'table_tennis', matchConfig: { bestOf: 7, pointsToWin: 11 } }))).toBe('Table Tennis · Best of 7 · to 11');
```

`__tests__/quickKnockoutView.test.ts` lines 89-90 become:

```ts
  expect(formatLabel(k())).toBe('Badminton · Doubles');
  expect(formatLabel(k({ format: 'singles' }))).toBe('Badminton · Singles');
  expect(formatLabel(k({ sport: 'table_tennis', format: 'singles' }))).toBe('Table Tennis · Singles');
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/quickMatchView.test.ts __tests__/quickKnockoutView.test.ts`
Expected: FAIL — labels lack the sport.

- [ ] **Step 3: Implement**

`src/lib/quickMatchView.ts`: add `import { SPORT_LABELS } from '@/lib/sports';` after line 2, and replace `formatLabel` (lines 52-57):

```ts
/** "Table Tennis · Best of 3 · to 11" — the sport first, so the two rally sports never look alike. */
export function formatLabel(match: QuickMatch): string {
  const bestOf = match.matchConfig?.bestOf ?? 3;
  const pointsToWin = match.matchConfig?.pointsToWin ?? 21;
  const games = bestOf === 1 ? 'Single game' : `Best of ${bestOf}`;
  return `${SPORT_LABELS[match.sport] ?? match.sport} · ${games} · to ${pointsToWin}`;
}
```

`src/lib/quickKnockoutView.ts`: add `import { SPORT_LABELS } from '@/lib/sports';` after line 1, and replace `formatLabel` (lines 30-34):

```ts
/** "Badminton · Singles", "Table Tennis · Doubles", or "Cricket · 8 overs" — the line under a knockout's name. */
export function formatLabel(k: QuickKnockout): string {
  if (k.sport === 'cricket') return `Cricket · ${k.matchConfig.maxOvers} overs`;
  return `${SPORT_LABELS[k.sport] ?? k.sport} · ${k.format === 'doubles' ? 'Doubles' : 'Singles'}`;
}
```

`src/components/home/HomeHero.tsx`:
- Line 246: `'Host a badminton, table tennis or cricket match.',`
- Line 402 becomes (a rally `formatLabel` already names the sport):

```tsx
  const meta = [knockout?.name, round, cricket ? sportLabel(match.sport) : null, format].filter(Boolean).join(' · ');
```

`src/app/quick/host.tsx` line 26: change the Knockout hint to `hint="A badminton, table tennis or cricket knockout."`.

`src/components/navigation/HostSheet.tsx` line 14: change the Knockout hint to `hint: 'Badminton, table tennis or cricket'`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/quickMatchView.test.ts __tests__/quickKnockoutView.test.ts __tests__/HostChooser.test.tsx __tests__/QuickMatchesScreen.test.tsx __tests__/QuickMatchScreen.test.tsx __tests__/KnockoutScreen.test.tsx __tests__/KnockoutListScreen.test.tsx __tests__/KnockoutWaitingRoom.test.tsx`
Expected: PASS. If a screen test asserted the old label text (e.g. `Singles` alone, or `Best of 3 · to 21`), update that assertion to the new sport-prefixed label — the label change is intended.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quickMatchView.ts src/lib/quickKnockoutView.ts src/components/home/HomeHero.tsx src/app/quick/host.tsx src/components/navigation/HostSheet.tsx __tests__/quickMatchView.test.ts __tests__/quickKnockoutView.test.ts
git commit -m "feat: name the sport on quick match and knockout labels" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Add any screen test updated in Step 4 to the `git add`.)

---

### Task 10: Full gates and the narrow-phone check

**Files:** none changed unless a gate fails.

- [ ] **Step 1: Mobile gates**

Run (in `D:\kria\mobile`): `npx tsc --noEmit`
Expected: clean.

Run: `npx jest`
Expected: every suite passes.

- [ ] **Step 2: Server gates (again, after nothing should have changed)**

Run (in `D:\kria\server`): `npx vitest run`
Expected: every suite passes.

- [ ] **Step 3: Narrow-phone check (Review Focus 5)**

Start the app (`npx expo start` in `D:\kria\mobile`), open it on the narrowest phone available (or an emulator at 360 dp width), go Host → Quick match → Table tennis → I'm playing. On the format step, all four Match length buttons (`1 / One game`, `3 / Best of`, `5 / Best of`, `7 / Best of`) must sit on one row with no wrapped or clipped text. Repeat in Host → Knockout → Table tennis. If the sub-line wraps, shorten `'One game'` to `'Game'` in both `FormatStep` and `knockout/new.tsx` and re-check.

If no device or emulator is available, say so in the hand-off rather than claiming the check passed.

- [ ] **Step 4: Hand-off note**

Report: tests and type checks per repo (with counts), whether the narrow-phone check ran, and that the server needs a redeploy before the app's table tennis option works (an old server 422s `sport: 'table_tennis'`).
