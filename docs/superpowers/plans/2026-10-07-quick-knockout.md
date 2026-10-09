# Quick Knockout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player host a small badminton knockout (3–16 entrants, singles or doubles) that runs on ordinary quick matches, with self-join by code, a random draw, a live bracket, and low-tier honours.

**Architecture:** A new `QuickKnockout` record on the server holds players, pairs, entrants and fixtures. Each fixture with two known entrants becomes a normal badminton quick match (`knockoutId` + `fixtureId` on the match), so scoring, undo, live push and career stats are reused. A single idempotent `reconcile(knockoutId)` derives the whole bracket from match results and is the only thing that advances it. The mobile app adds a host chooser, a 3-step knockout wizard, a waiting room, a sideways bracket tree, a join-code resolver and an awards panel.

**Tech Stack:** Server — Node/Express, TypeScript 5.4, Mongoose, express-validator, socket.io, vitest + mongodb-memory-server + supertest. Mobile — Expo SDK 57, React Native 0.86, expo-router, Reanimated 4, jest + @testing-library/react-native + axios-mock-adapter.

**Spec:** `mobile/docs/superpowers/specs/2026-10-06-quick-knockout-design.md`

## Global Constraints

- Two git repos: `D:\kria\server` and `D:\kria\mobile` (the workspace root `D:\kria` is not a repo).
- Server commit messages must match `^(fix|feat|chore|perf|bugs|docs|breaking_changes|refactor|add|Merge|merge|test|tests|updated|changed|added|created|create) .*$` — verb, then a SPACE, **no colon**. The server pre-commit hook runs `npm run lint:fix && npm run build` over the whole repo; both must pass.
- Server lint: no `console` (use `import logger from '../utils/logger'`), no explicit `any` (if truly unavoidable, `// eslint-disable-next-line @typescript-eslint/no-explicit-any` on the line above), no unused vars, single quotes, semicolons.
- Server tests: `cd server && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run <file>` (no `.env` exists locally; any test importing `app` needs those two vars). Full suite under load can flake on 1–5 unrelated files — re-run those files alone before treating them as real.
- Mobile tests: `cd mobile && npx jest <file>`; type check `npx tsc --noEmit`.
- Mobile fences that fail the suite: no `style={(…) => …}` on `Pressable` (`__tests__/pressableStyleFence.test.ts` — NativeWind drops it on native); every `Anton_400Regular` style needs an integer `lineHeight` ≥ 1.188 × `fontSize`; a `SpaceMono_*` style that sets `lineHeight` needs ≥ 1.061 × `fontSize` (omit `lineHeight` on Space Mono); files listed in `test-utils/colourLiterals.ts` `MIGRATED` may not contain colour literals — new screens use `useTheme()` tokens and are added to `MIGRATED`.
- Mobile navigation: import `router`, `useLocalSearchParams`, `useFocusEffect` from `expo-router`; back buttons use `goBack(router, '/quick')` from `@/lib/nav`, never bare `router.back()`.
- Badminton only. Singles or doubles. Entrants 3–16 (doubles: up to 32 players). Knockout `name` 1–40 chars.
- Host-only scoring. One `matchConfig` for every round: `bestOf ∈ {1,3,5}`, `pointsToWin ∈ {11,15,21}`.
- Join code alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, length 6, unique across `quick_matches` and `quick_knockouts`.
- Live push: event `knockout:update`, room `match:<knockoutId>` (existing `join:match` handler), payload `{ knockout }` with `joinCode` removed.
- Awards: champion honour `{ title: 'Won <name>', badge: 'knockout-winner' }`; host extras from `iron-player | first-cap | ace-serve | fair-play` only, title `'<Badge name> · <name>'`, max 3, not to the host, only when `awardsEligible` (≥ 4 players with a `playerId` at Start). Organizers can never grant `knockout-winner`.

## Review Focus

1. **Undo after a winner has advanced** — a person undoing the last point of a quarter-final whose winner already sits in an un-started semi expects the winner pulled back and the semi to disappear; if the semi has points, a clear refusal. (Tests in Task 6.)
2. **Roster change after a draw** — someone joining or being removed after the host drew expects the preview to vanish and Draw to be required again, never a stale bracket missing or duplicating people. (Tests in Task 3 and Task 4.)
3. **Odd doubles count / too few entrants** — the host expects Draw to explain itself ("Add one more player or remove one to draw." / "A knockout needs at least 3 entrants."), not a 500. (Tests in Task 4, UI in Task 12.)
4. **Two completions racing** — two finished quarter-finals reconciling at once must still leave exactly one semi-final match. (Test in Task 5 via the unique index.)
5. **Join code typed for the wrong kind** — a knockout code typed into Join must open the knockout, a match code the match, an unknown code a "not found" message. (Tests in Task 8 and Task 14.)

---

# Part 1 — Server (`D:\kria\server`)

### Task 1: Pure bracket helpers

**Files:**
- Create: `server/src/shared/bracket/knockoutDraw.ts`
- Test: `server/test/quickKnockoutDraw.test.ts`

**Interfaces:**
- Consumes: `byePositions(slots, numByes): Set<number>` from `server/src/shared/bracket/byePositions.ts`; `getRoundNames(totalRounds, numByes): string[]` from `server/src/shared/bracket/roundNames.ts`.
- Produces:
  - `shuffle<T>(items: T[], rng?: () => number): T[]` — new array, Fisher–Yates.
  - `pairUp(keys: string[], rng?: () => number): [string, string][]` — throws `Error` on odd length.
  - `interface DrawnFixture { round: number; position: number; entrantA?: string; entrantB?: string; bye: boolean }`
  - `buildBracket(entrantIds: string[], rng?: () => number): { fixtures: DrawnFixture[]; roundNames: string[] }`

- [ ] **Step 1: Write the failing test**

```ts
// server/test/quickKnockoutDraw.test.ts
import { describe, expect, it } from 'vitest';
import { buildBracket, pairUp, shuffle } from '../src/shared/bracket/knockoutDraw';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `e${i + 1}`);

describe('shuffle', () => {
    it('returns every item exactly once without touching the input', () => {
        const input = ids(8);
        const out = shuffle(input);
        expect([...out].sort()).toEqual([...input].sort());
        expect(input).toEqual(ids(8));
    });
});

describe('pairUp', () => {
    it('pairs every key once', () => {
        const pairs = pairUp(ids(6));
        expect(pairs).toHaveLength(3);
        expect(pairs.flat().sort()).toEqual(ids(6).sort());
    });

    it('refuses an odd count', () => {
        expect(() => pairUp(ids(5))).toThrow(/even/);
    });
});

describe('buildBracket', () => {
    it.each([
        [3, 2, 1, ['Semi-Final', 'Final']],
        [5, 3, 3, ['Quarter-Final', 'Semi-Final', 'Final']],
        [8, 3, 0, ['Quarter-Final', 'Semi-Final', 'Final']],
        [12, 4, 4, ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']],
        [16, 4, 0, ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']],
    ])('%i entrants → %i rounds, %i byes', (n, rounds, byes, names) => {
        const { fixtures, roundNames } = buildBracket(ids(n));
        expect(roundNames).toEqual(names);

        const first = fixtures.filter((f) => f.round === 1);
        expect(first).toHaveLength(2 ** rounds / 2);
        expect(first.filter((f) => f.bye)).toHaveLength(byes);

        // Every entrant appears exactly once in round 1.
        const placed = first.flatMap((f) => [f.entrantA, f.entrantB]).filter(Boolean);
        expect([...placed].sort()).toEqual(ids(n).sort());

        // A bye carries exactly one entrant, a real match two.
        for (const f of first) {
            expect([f.entrantA, f.entrantB].filter(Boolean)).toHaveLength(f.bye ? 1 : 2);
        }

        // Later rounds exist and start empty; positions are 0-based and dense.
        for (let r = 2; r <= rounds; r++) {
            const round = fixtures.filter((f) => f.round === r);
            expect(round.map((f) => f.position)).toEqual(Array.from({ length: 2 ** (rounds - r) }, (_, i) => i));
            expect(round.every((f) => !f.entrantA && !f.entrantB && !f.bye)).toBe(true);
        }
    });

    it('never puts two byes against each other in round 2', () => {
        const { fixtures } = buildBracket(ids(12));
        const first = fixtures.filter((f) => f.round === 1);
        for (let p = 0; p < first.length; p += 2) {
            expect(first[p].bye && first[p + 1].bye).toBe(false);
        }
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run test/quickKnockoutDraw.test.ts`
Expected: FAIL — `Cannot find module '../src/shared/bracket/knockoutDraw'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// server/src/shared/bracket/knockoutDraw.ts
import { byePositions } from './byePositions';
import { getRoundNames } from './roundNames';

/** Fisher–Yates on a copy. `rng` is injectable so tests can pin an order. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** Random pairs for a doubles draw. The caller guarantees an even count. */
export function pairUp(keys: string[], rng: () => number = Math.random): [string, string][] {
    if (keys.length % 2 !== 0) throw new Error('pairUp needs an even number of players.');
    const shuffled = shuffle(keys, rng);
    const pairs: [string, string][] = [];
    for (let i = 0; i < shuffled.length; i += 2) pairs.push([shuffled[i], shuffled[i + 1]]);
    return pairs;
}

export interface DrawnFixture {
    round: number;
    position: number;
    entrantA?: string;
    entrantB?: string;
    bye: boolean;
}

/**
 * A random single-elimination bracket. Byes are spread with the same
 * recursive halving tournaments use (byePositions), so two byes never meet
 * and both halves stay balanced. Rounds after the first start empty —
 * reconcile fills them from results.
 */
export function buildBracket(entrantIds: string[], rng: () => number = Math.random): { fixtures: DrawnFixture[]; roundNames: string[] } {
    const rounds = Math.ceil(Math.log2(entrantIds.length));
    const size = 2 ** rounds;
    const byes = size - entrantIds.length;
    const firstRoundSlots = size / 2;
    const byeAt = byePositions(firstRoundSlots, byes);
    const queue = shuffle(entrantIds, rng);

    const fixtures: DrawnFixture[] = [];
    for (let position = 0; position < firstRoundSlots; position++) {
        if (byeAt.has(position)) {
            fixtures.push({ round: 1, position, entrantA: queue.shift(), bye: true });
        } else {
            fixtures.push({ round: 1, position, entrantA: queue.shift(), entrantB: queue.shift(), bye: false });
        }
    }
    for (let round = 2; round <= rounds; round++) {
        for (let position = 0; position < size / 2 ** round; position++) {
            fixtures.push({ round, position, bye: false });
        }
    }
    return { fixtures, roundNames: getRoundNames(rounds, byes) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run test/quickKnockoutDraw.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
cd server && git add src/shared/bracket/knockoutDraw.ts test/quickKnockoutDraw.test.ts
git commit -m "feat knockout bracket draw helpers"
```

---

### Task 2: Knockout model, shared join codes, knockout-aware quick matches

**Files:**
- Create: `server/src/models/quickKnockout.model.ts`
- Create: `server/src/repository/quickKnockout.repository.ts`
- Create: `server/src/services/quickJoinCode.ts`
- Modify: `server/src/models/quickMatch.model.ts` (base schema fields + index + interface)
- Modify: `server/src/repository/quickMatch.repository.ts` (`codeExists`, `findByKnockout`, `deleteById`, `listForPlayer` filter)
- Modify: `server/src/services/quickMatch.service.ts` (use `allocateJoinCode`, extract `_buildSides`, add `createForKnockout`, `listForKnockout`, `deleteForKnockout`, knockout locks)
- Test: `server/test/quickJoinCode.test.ts`, `server/test/quickMatchKnockoutLocks.test.ts`

**Interfaces:**
- Produces:
  - `QuickKnockoutModel`, `IQuickKnockout`, `IKnockoutPlayer`, `IKnockoutPair`, `IKnockoutEntrant`, `IKnockoutFixture`, `KNOCKOUT_LIMITS = { minEntrants: 3, maxEntrants: 16 }` from `models/quickKnockout.model.ts`.
  - `quickKnockoutRepository` with `create(doc)`, `getById(id)`, `getByJoinCode(code)`, `listForPlayer(playerId, limit?)`, `codeExists(code): Promise<boolean>`, `persist(k)`.
  - `generateJoinCode(rng?)`, `allocateJoinCode(): Promise<string>` from `services/quickJoinCode.ts`.
  - On `quickMatchService`: `createForKnockout(input): Promise<IQuickMatch | null>` (null = the fixture already has its match), `listForKnockout(knockoutId): Promise<IQuickMatch[]>`, `deleteForKnockout(matchId): Promise<void>`.
  - `IQuickMatch.knockoutId?: mongoose.Types.ObjectId`, `IQuickMatch.fixtureId?: string`.

- [ ] **Step 1: Write the failing tests**

```ts
// server/test/quickJoinCode.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { allocateJoinCode } from '../src/services/quickJoinCode';
import { QuickKnockoutModel } from '../src/models/quickKnockout.model';
import { quickMatchService } from '../src/services/quickMatch.service';

afterEach(() => vi.restoreAllMocks());

describe('allocateJoinCode', () => {
    it('skips a code a knockout already holds', async () => {
        await QuickKnockoutModel.create({
            hostId: new mongoose.Types.ObjectId(), joinCode: '222222', name: 'Taken',
            format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 },
        });
        // Six draws of 0 spell '222222'; then 0.5 spells 'JJJJJJ'.
        const random = vi.spyOn(Math, 'random');
        for (let i = 0; i < 6; i++) random.mockReturnValueOnce(0);
        random.mockReturnValue(0.5);

        expect(await allocateJoinCode()).toBe('JJJJJJ');
    });

    it('skips a code a quick match already holds', async () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0);
        const hostId = new mongoose.Types.ObjectId().toString();
        await quickMatchService.create(hostId, {
            sport: 'badminton',
            sides: [{ name: 'A', slots: [{ displayName: 'A' }] }, { name: 'B', slots: [{ displayName: 'B' }] }],
        }); // takes '222222'
        random.mockReset();
        for (let i = 0; i < 6; i++) random.mockReturnValueOnce(0);
        random.mockReturnValue(0.5);

        expect(await allocateJoinCode()).toBe('JJJJJJ');
    });
});
```

```ts
// server/test/quickMatchKnockoutLocks.test.ts
import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import QuickMatchModel from '../src/models/quickMatch.model';
import { quickMatchService } from '../src/services/quickMatch.service';

const oid = () => new mongoose.Types.ObjectId().toString();

async function knockoutMatch() {
    const hostId = oid();
    const knockoutId = oid();
    const m = await quickMatchService.createForKnockout({
        hostId, knockoutId, fixtureId: 'f1',
        sides: [
            { name: 'Arjun', slots: [{ playerId: hostId, displayName: 'Arjun' }] },
            { name: 'Rahul', slots: [{ playerId: oid(), displayName: 'Rahul' }] },
        ],
        matchConfig: { bestOf: 1, pointsToWin: 11 },
    });
    return { hostId, knockoutId, match: m! };
}

describe('quick matches inside a knockout', () => {
    it('are created live with the knockout config and links', async () => {
        const { match, knockoutId } = await knockoutMatch();
        expect(match.status).toBe('live');
        expect(String(match.knockoutId)).toBe(knockoutId);
        expect(match.fixtureId).toBe('f1');
        expect((match as unknown as { matchConfig: { pointsToWin: number } }).matchConfig.pointsToWin).toBe(11);
    });

    it('never get two matches for one fixture', async () => {
        await QuickMatchModel.init();
        const { hostId, knockoutId } = await knockoutMatch();
        const second = await quickMatchService.createForKnockout({
            hostId, knockoutId, fixtureId: 'f1',
            sides: [{ name: 'X', slots: [{ displayName: 'X' }] }, { name: 'Y', slots: [{ displayName: 'Y' }] }],
            matchConfig: { bestOf: 1, pointsToWin: 11 },
        });
        expect(second).toBeNull();
        expect(await quickMatchService.listForKnockout(knockoutId)).toHaveLength(1);
    });

    it('refuse a claim by the match code', async () => {
        const { match } = await knockoutMatch();
        await expect(quickMatchService.claimSlot(match.joinCode, oid(), match.sides[1].slots[0].slotId))
            .rejects.toThrow(/part of a knockout/i);
    });

    it('refuse removing a player', async () => {
        const { match, hostId } = await knockoutMatch();
        await expect(quickMatchService.removePlayer(String(match._id), hostId, String(match.sides[1].slots[0].playerId)))
            .rejects.toThrow(/part of a knockout/i);
    });

    it('refuse a cancel of the single match', async () => {
        const { match, hostId } = await knockoutMatch();
        await expect(quickMatchService.cancel(String(match._id), hostId)).rejects.toThrow(/part of a knockout/i);
    });

    it('stay out of the player’s quick match list', async () => {
        const { hostId } = await knockoutMatch();
        const res = await quickMatchService.listMine(hostId);
        expect(res.data).toHaveLength(0);
    });

    it('can be deleted by the knockout', async () => {
        const { match, knockoutId } = await knockoutMatch();
        await quickMatchService.deleteForKnockout(String(match._id));
        expect(await quickMatchService.listForKnockout(knockoutId)).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run test/quickJoinCode.test.ts test/quickMatchKnockoutLocks.test.ts`
Expected: FAIL — missing modules / `createForKnockout is not a function`.

- [ ] **Step 3: Create the knockout model**

```ts
// server/src/models/quickKnockout.model.ts
import mongoose from 'mongoose';

export const KNOCKOUT_LIMITS = { minEntrants: 3, maxEntrants: 16 } as const;

// Every sub-document carries its own string id and no Mongo _id: the ids are
// referenced across arrays (pairs → players, entrants → players, fixtures →
// entrants) and from quick matches (fixtureId), so they must be stable values
// the service mints, not something Mongoose regenerates.
const playerSchema = new mongoose.Schema(
    {
        playerKey: { type: String, required: true },
        playerId: { type: mongoose.Types.ObjectId },
        displayName: { type: String, required: true, trim: true },
    },
    { _id: false },
);

const pairSchema = new mongoose.Schema(
    {
        pairId: { type: String, required: true },
        playerKeys: { type: [String], required: true },
        // Host-made pairs survive a reshuffle; drawn pairs are replaced by it.
        byHost: { type: Boolean, required: true },
    },
    { _id: false },
);

const entrantSchema = new mongoose.Schema(
    {
        entrantId: { type: String, required: true },
        playerKeys: { type: [String], required: true },
    },
    { _id: false },
);

const fixtureSchema = new mongoose.Schema(
    {
        fixtureId: { type: String, required: true },
        round: { type: Number, required: true },
        position: { type: Number, required: true },
        entrantA: { type: String },
        entrantB: { type: String },
        bye: { type: Boolean, default: false },
        quickMatchId: { type: mongoose.Types.ObjectId },
        // Who the match was created for. When reconcile derives different
        // entrants (an undo pulled a winner back) the match is stale.
        matchEntrants: { type: [String], default: undefined },
        winnerEntrantId: { type: String },
    },
    { _id: false },
);

const awardSchema = new mongoose.Schema(
    {
        playerId: { type: mongoose.Types.ObjectId, required: true },
        badge: { type: String, required: true },
        title: { type: String, required: true },
    },
    { _id: false },
);

const quickKnockoutSchema = new mongoose.Schema(
    {
        hostId: { type: mongoose.Types.ObjectId, required: true },
        joinCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
        name: { type: String, required: true, trim: true, maxLength: 40 },
        sport: { type: String, required: true, enum: ['badminton'], default: 'badminton' },
        format: { type: String, required: true, enum: ['singles', 'doubles'] },
        matchConfig: {
            bestOf: { type: Number, required: true, enum: [1, 3, 5] },
            pointsToWin: { type: Number, required: true, enum: [11, 15, 21] },
        },
        status: { type: String, required: true, enum: ['waiting', 'live', 'completed', 'cancelled'], default: 'waiting' },
        players: { type: [playerSchema], default: [] },
        pairs: { type: [pairSchema], default: [] },
        entrants: { type: [entrantSchema], default: [] },
        fixtures: { type: [fixtureSchema], default: [] },
        roundNames: { type: [String], default: [] },
        championEntrantId: { type: String },
        awardsEligible: { type: Boolean },
        awards: { type: [awardSchema], default: [] },
    },
    { timestamps: true, collection: 'quick_knockouts' },
);

quickKnockoutSchema.index({ hostId: 1, createdAt: -1 });
quickKnockoutSchema.index({ 'players.playerId': 1, createdAt: -1 });

export interface IKnockoutPlayer { playerKey: string; playerId?: mongoose.Types.ObjectId; displayName: string }
export interface IKnockoutPair { pairId: string; playerKeys: string[]; byHost: boolean }
export interface IKnockoutEntrant { entrantId: string; playerKeys: string[] }
export interface IKnockoutFixture {
    fixtureId: string;
    round: number;
    position: number;
    entrantA?: string;
    entrantB?: string;
    bye: boolean;
    quickMatchId?: mongoose.Types.ObjectId;
    matchEntrants?: string[];
    winnerEntrantId?: string;
}

export interface IQuickKnockout extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    hostId: mongoose.Types.ObjectId;
    joinCode: string;
    name: string;
    sport: 'badminton';
    format: 'singles' | 'doubles';
    matchConfig: { bestOf: number; pointsToWin: number };
    status: 'waiting' | 'live' | 'completed' | 'cancelled';
    players: IKnockoutPlayer[];
    pairs: IKnockoutPair[];
    entrants: IKnockoutEntrant[];
    fixtures: IKnockoutFixture[];
    roundNames: string[];
    championEntrantId?: string;
    awardsEligible?: boolean;
    awards: { playerId: mongoose.Types.ObjectId; badge: string; title: string }[];
    createdAt: Date;
    updatedAt: Date;
}

export const QuickKnockoutModel = mongoose.model<IQuickKnockout>('QuickKnockout', quickKnockoutSchema);
```

- [ ] **Step 4: Create the repository and the join code allocator**

```ts
// server/src/repository/quickKnockout.repository.ts
import { IQuickKnockout, QuickKnockoutModel } from '../models/quickKnockout.model';

export class QuickKnockoutRepository {
    private readonly _model = QuickKnockoutModel;

    async create(doc: Record<string, unknown>): Promise<IQuickKnockout> {
        return this._model.create(doc);
    }

    async getById(id: string): Promise<IQuickKnockout | null> {
        return this._model.findById(id);
    }

    async getByJoinCode(joinCode: string): Promise<IQuickKnockout | null> {
        return this._model.findOne({ joinCode: joinCode.toUpperCase() });
    }

    async listForPlayer(playerId: string, limit = 20): Promise<IQuickKnockout[]> {
        return this._model
            .find({ $or: [{ hostId: playerId }, { 'players.playerId': playerId }] })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    async codeExists(joinCode: string): Promise<boolean> {
        return Boolean(await this._model.exists({ joinCode: joinCode.toUpperCase() }));
    }

    /** Save a loaded, mutated document — same contract as QuickMatchRepository.persist. */
    async persist(knockout: IQuickKnockout): Promise<IQuickKnockout> {
        return knockout.save();
    }
}

export const quickKnockoutRepository = new QuickKnockoutRepository();
```

```ts
// server/src/services/quickJoinCode.ts
import { BadRequestError } from '../errors';
import { QuickMatchRepository } from '../repository/quickMatch.repository';
import { quickKnockoutRepository } from '../repository/quickKnockout.repository';

/** No 0/O/1/I — codes get read aloud and retyped. */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;
const ATTEMPTS = 10;

const quickMatches = new QuickMatchRepository();

export function generateJoinCode(rng: () => number = Math.random): string {
    let out = '';
    for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
    return out;
}

/**
 * A code no quick match AND no knockout holds — the Join screen takes one
 * code box for both. Each collection's unique index stays the backstop for
 * the (vanishing) race between this check and the insert.
 */
export async function allocateJoinCode(): Promise<string> {
    for (let i = 0; i < ATTEMPTS; i++) {
        const code = generateJoinCode();
        const [inMatches, inKnockouts] = await Promise.all([
            quickMatches.codeExists(code),
            quickKnockoutRepository.codeExists(code),
        ]);
        if (!inMatches && !inKnockouts) return code;
    }
    throw new BadRequestError('Could not allocate a join code. Please retry.');
}
```

- [ ] **Step 5: Extend the quick match model**

In `server/src/models/quickMatch.model.ts`, add to the base `quickMatchSchema` fields, after `hasBeenCompleted`:

```ts
        // Set only on matches a quick knockout creates (createForKnockout).
        // Such a match is managed by its knockout: no claim, removal or
        // cancel of its own, and it stays out of /quick-match/mine.
        knockoutId: { type: mongoose.Types.ObjectId },
        fixtureId: { type: String },
```

After the existing `live_quick_matches` index add:

```ts
// One match per knockout fixture, however many reconciles race to create it.
quickMatchSchema.index(
    { knockoutId: 1, fixtureId: 1 },
    { unique: true, partialFilterExpression: { knockoutId: { $exists: true } }, name: 'knockout_fixture' },
);
```

In `interface IQuickMatch` add:

```ts
    knockoutId?: mongoose.Types.ObjectId;
    fixtureId?: string;
```

- [ ] **Step 6: Extend the quick match repository**

In `server/src/repository/quickMatch.repository.ts`, replace the body of `listForPlayer` and add three methods inside the class:

```ts
    async listForPlayer(playerId: string, limit = 20): Promise<IQuickMatch[]> {
        return this._model
            // Knockout matches are reached through their knockout.
            .find({ knockoutId: { $exists: false }, $or: [{ hostId: playerId }, { 'sides.slots.playerId': playerId }] })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    async codeExists(joinCode: string): Promise<boolean> {
        return Boolean(await this._model.exists({ joinCode: joinCode.toUpperCase() }));
    }

    async findByKnockout(knockoutId: string): Promise<IQuickMatch[]> {
        return this._model.find({ knockoutId });
    }

    async deleteById(id: string): Promise<void> {
        await this._model.deleteOne({ _id: id });
    }
```

- [ ] **Step 7: Update the quick match service**

In `server/src/services/quickMatch.service.ts`:

1. Delete the local `CODE_ALPHABET`, `CODE_LENGTH` and `generateJoinCode` (keep `CODE_ATTEMPTS`), and add `import { allocateJoinCode } from './quickJoinCode';`.
2. Extract the side building from `create` into a private method and use it:

```ts
    private _buildSides(input: CreateQuickMatchInput['sides']): IQuickMatch['sides'] {
        return input.map((side) => ({
            sideId: new mongoose.Types.ObjectId().toString(),
            name: side.name,
            slots: side.slots.map((slot) => ({
                slotId: new mongoose.Types.ObjectId().toString(),
                playerId: slot.playerId ? new mongoose.Types.ObjectId(slot.playerId) : undefined,
                displayName: slot.displayName,
            })),
        }));
    }
```

   In `create`, replace the `const sides: IQuickMatch['sides'] = input.sides.map(...)` block with `const sides = this._buildSides(input.sides);`, and in the create loop replace `joinCode: generateJoinCode(),` with `joinCode: await allocateJoinCode(),`.

3. Add these methods to the class (after `persist`):

```ts
    /**
     * The match for one knockout fixture. Not reachable over HTTP — only the
     * knockout service calls it, so a client can never mint a "knockout"
     * match. Returns null when the fixture already has its match (the
     * knockout_fixture unique index lost a race); the caller re-reads it.
     */
    async createForKnockout(input: {
        hostId: string;
        knockoutId: string;
        fixtureId: string;
        sides: CreateQuickMatchInput['sides'];
        matchConfig: { bestOf: number; pointsToWin: number };
    }): Promise<IQuickMatch | null> {
        const sides = this._buildSides(input.sides);
        for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
            try {
                return await this._repository.create('badminton', {
                    hostId: input.hostId,
                    sides,
                    matchConfig: input.matchConfig,
                    knockoutId: input.knockoutId,
                    fixtureId: input.fixtureId,
                    joinCode: await allocateJoinCode(),
                });
            } catch (err) {
                const e = err as { code?: number; keyPattern?: Record<string, unknown> };
                if (e.code !== 11000) throw err;
                if (e.keyPattern?.knockoutId) return null;
                // Join code collided — try another.
            }
        }
        throw new BadRequestError('Could not allocate a join code. Please retry.');
    }

    async listForKnockout(knockoutId: string): Promise<IQuickMatch[]> {
        return this._repository.findByKnockout(knockoutId);
    }

    /** Only for a fixture's match with no points — see QuickKnockoutService.reconcile. */
    async deleteForKnockout(matchId: string): Promise<void> {
        await this._repository.deleteById(matchId);
    }
```

4. Add the knockout lock as the first check after the match is loaded in `claimSlot` (after the `NotFoundError` line), in `removePlayer` (after `loadAsHost`), and in `cancel` (after `loadAsHost`):

```ts
        if (match.knockoutId) throw new BadRequestError('This match is part of a knockout.');
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `cd server && npx vitest run test/quickJoinCode.test.ts test/quickMatchKnockoutLocks.test.ts test/quickMatchCreate.test.ts test/quickMatchListMine.test.ts test/quickMatchByCode.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
cd server && git add src/models/quickKnockout.model.ts src/repository/quickKnockout.repository.ts src/services/quickJoinCode.ts src/models/quickMatch.model.ts src/repository/quickMatch.repository.ts src/services/quickMatch.service.ts test/quickJoinCode.test.ts test/quickMatchKnockoutLocks.test.ts
git commit -m "feat knockout model, shared join codes and knockout-aware quick matches"
```

---

### Task 3: Knockout service — create, read, join, claim, roster, pairs

**Files:**
- Create: `server/src/services/quickKnockout.service.ts`
- Test: `server/test/quickKnockoutRoster.test.ts`

**Interfaces:**
- Consumes: `quickKnockoutRepository`, `allocateJoinCode`, `playerRepository.getById(id)` (lean player with `firstName`, `lastName`), `getIo()` from `services/socket`.
- Produces (`quickKnockoutService`, all return `SuccessResponse<…>` unless noted):
  - `create(hostId, input: CreateKnockoutInput)` where `CreateKnockoutInput = { format: 'singles' | 'doubles'; matchConfig: { bestOf: 1 | 3 | 5; pointsToWin: 11 | 15 | 21 }; name?: string }`
  - `getById(id, viewerId?)` (joinCode withheld from outsiders), `getByJoinCode(code)`, `listMine(playerId)`
  - `join(code, playerId)`, `claim(code, playerId, playerKey)`
  - `addPlayer(id, hostId, { displayName?: string; playerId?: string })`, `removePlayer(id, hostId, playerKey)`
  - `pair(id, hostId, playerKeys: [string, string])`, `unpair(id, hostId, pairId)`
  - `loadAsHost(id, userId): Promise<IQuickKnockout>`, `persist(k): Promise<IQuickKnockout>` (saves + broadcasts `knockout:update`)

- [ ] **Step 1: Write the failing test**

```ts
// server/test/quickKnockoutRoster.test.ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'socket.io';
import Player from '../src/models/player.model';
import { setIo } from '../src/services/socket';
import { quickKnockoutService } from '../src/services/quickKnockout.service';

let seq = 0;
async function makePlayer(firstName: string, lastName = 'Test') {
    seq += 1;
    const p = await Player.create({
        firstName, lastName, email: `ko${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true,
    });
    return p._id.toString();
}

async function makeKnockout(format: 'singles' | 'doubles' = 'singles', name?: string) {
    const hostId = await makePlayer('Arjun', 'Mehta');
    const k = (await quickKnockoutService.create(hostId, { format, matchConfig: { bestOf: 1, pointsToWin: 11 }, name })).data!;
    return { hostId, id: String(k._id), code: k.joinCode, k };
}

type Pushed = { room: string; event: string; payload: { knockout: Record<string, unknown> } };
let pushed: Pushed[] = [];
beforeEach(() => {
    pushed = [];
    setIo({ to: (room: string) => ({ emit: (event: string, payload: Pushed['payload']) => pushed.push({ room, event, payload }) }) } as unknown as Server);
});
afterEach(() => setIo(undefined as unknown as Server));

describe('creating a knockout', () => {
    it('puts the host in as the first player and opens it waiting', async () => {
        const { k, hostId } = await makeKnockout();
        expect(k.status).toBe('waiting');
        expect(k.players).toHaveLength(1);
        expect(String(k.players[0].playerId)).toBe(hostId);
        expect(k.players[0].displayName).toBe('Arjun Mehta');
        expect(k.joinCode).toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
    });

    it('names it after the host when no name is given', async () => {
        expect((await makeKnockout()).k.name).toBe('Arjun\'s Knockout');
        expect((await makeKnockout('singles', '  Sunday Smash ')).k.name).toBe('Sunday Smash');
    });
});

describe('joining', () => {
    it('adds a Kria player by code under their account name', async () => {
        const { code } = await makeKnockout();
        const rahul = await makePlayer('Rahul', 'Singh');
        const k = (await quickKnockoutService.join(code, rahul)).data!;
        expect(k.players.map((p) => p.displayName)).toEqual(['Arjun Mehta', 'Rahul Singh']);
    });

    it('refuses someone already in', async () => {
        const { code, hostId } = await makeKnockout();
        await expect(quickKnockoutService.join(code, hostId)).rejects.toThrow(/already in/i);
    });

    it('refuses once full (16 in singles)', async () => {
        const { id, hostId, code } = await makeKnockout();
        for (let i = 0; i < 15; i++) await quickKnockoutService.addPlayer(id, hostId, { displayName: `Guest ${i}` });
        await expect(quickKnockoutService.join(code, await makePlayer('Late'))).rejects.toThrow(/full/i);
    });

    it('lets a Kria player claim a guest name, taking their account name', async () => {
        const { id, hostId, code } = await makeKnockout();
        const added = (await quickKnockoutService.addPlayer(id, hostId, { displayName: 'Sam' })).data!;
        const guestKey = added.players[1].playerKey;
        const sam = await makePlayer('Samir', 'Rao');

        const k = (await quickKnockoutService.claim(code, sam, guestKey)).data!;
        expect(String(k.players[1].playerId)).toBe(sam);
        expect(k.players[1].displayName).toBe('Samir Rao');
        expect(k.players[1].playerKey).toBe(guestKey);
    });

    it('refuses to claim a name that is already an account', async () => {
        const { code, k } = await makeKnockout();
        await expect(quickKnockoutService.claim(code, await makePlayer('X'), k.players[0].playerKey)).rejects.toThrow(/already taken/i);
    });
});

describe('the host managing the roster', () => {
    it('adds a Kria player by id and a guest by name', async () => {
        const { id, hostId } = await makeKnockout();
        const dev = await makePlayer('Dev', 'K');
        await quickKnockoutService.addPlayer(id, hostId, { playerId: dev });
        const k = (await quickKnockoutService.addPlayer(id, hostId, { displayName: 'Sam' })).data!;
        expect(k.players.map((p) => [p.displayName, Boolean(p.playerId)])).toEqual([
            ['Arjun Mehta', true], ['Dev K', true], ['Sam', false],
        ]);
    });

    it('only the host can change the roster', async () => {
        const { id } = await makeKnockout();
        await expect(quickKnockoutService.addPlayer(id, await makePlayer('Z'), { displayName: 'Sam' })).rejects.toThrow(/only the host/i);
    });

    it('removing a player drops any pair they were in', async () => {
        const { id, hostId } = await makeKnockout('doubles');
        const a = (await quickKnockoutService.addPlayer(id, hostId, { displayName: 'Priya' })).data!;
        const [host, priya] = a.players.map((p) => p.playerKey);
        await quickKnockoutService.pair(id, hostId, [host, priya]);

        const k = (await quickKnockoutService.removePlayer(id, hostId, priya)).data!;
        expect(k.players).toHaveLength(1);
        expect(k.pairs).toHaveLength(0);
    });
});

describe('pairs', () => {
    it('pairs two unpaired players in doubles, and unpairs them', async () => {
        const { id, hostId } = await makeKnockout('doubles');
        const a = (await quickKnockoutService.addPlayer(id, hostId, { displayName: 'Priya' })).data!;
        const keys = a.players.map((p) => p.playerKey) as [string, string];

        const paired = (await quickKnockoutService.pair(id, hostId, keys)).data!;
        expect(paired.pairs).toHaveLength(1);
        expect(paired.pairs[0].byHost).toBe(true);

        await expect(quickKnockoutService.pair(id, hostId, keys)).rejects.toThrow(/already paired/i);
        const unpaired = (await quickKnockoutService.unpair(id, hostId, paired.pairs[0].pairId)).data!;
        expect(unpaired.pairs).toHaveLength(0);
    });

    it('refuses pairing in singles', async () => {
        const { id, hostId } = await makeKnockout('singles');
        const a = (await quickKnockoutService.addPlayer(id, hostId, { displayName: 'Priya' })).data!;
        await expect(quickKnockoutService.pair(id, hostId, a.players.map((p) => p.playerKey) as [string, string]))
            .rejects.toThrow(/doubles/i);
    });
});

describe('reading', () => {
    it('withholds the code from an outsider but not from a player', async () => {
        const { id, hostId, code } = await makeKnockout();
        expect((await quickKnockoutService.getById(id, hostId)).data!.joinCode).toBe(code);
        expect((await quickKnockoutService.getById(id, await makePlayer('Out'))).data!.joinCode).toBeUndefined();
    });

    it('lists knockouts the caller hosts or plays in', async () => {
        const { hostId, code } = await makeKnockout();
        const rahul = await makePlayer('Rahul');
        await quickKnockoutService.join(code, rahul);
        expect((await quickKnockoutService.listMine(hostId)).data).toHaveLength(1);
        expect((await quickKnockoutService.listMine(rahul)).data).toHaveLength(1);
    });
});

describe('live push', () => {
    it('pushes each change to the knockout room without the code', async () => {
        const { code, id } = await makeKnockout();
        pushed = [];
        await quickKnockoutService.join(code, await makePlayer('Rahul'));
        expect(pushed).toHaveLength(1);
        expect(pushed[0].room).toBe(`match:${id}`);
        expect(pushed[0].event).toBe('knockout:update');
        expect(pushed[0].payload.knockout).not.toHaveProperty('joinCode');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run test/quickKnockoutRoster.test.ts`
Expected: FAIL — `Cannot find module '../src/services/quickKnockout.service'`.

- [ ] **Step 3: Write the service (roster part)**

```ts
// server/src/services/quickKnockout.service.ts
import mongoose from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';
import { IQuickKnockout, KNOCKOUT_LIMITS } from '../models/quickKnockout.model';
import { quickKnockoutRepository } from '../repository/quickKnockout.repository';
import { playerRepository } from '../repository/player.repository';
import { SuccessResponse } from '../utils/response.util';
import { allocateJoinCode } from './quickJoinCode';
import { getIo } from './socket';

const newId = () => new mongoose.Types.ObjectId().toString();

export type CreateKnockoutInput = {
    format: 'singles' | 'doubles';
    matchConfig: { bestOf: 1 | 3 | 5; pointsToWin: 11 | 15 | 21 };
    name?: string;
};

/** What `getById` returns: a knockout whose join code may have been withheld. */
export type RedactableKnockout = Omit<IQuickKnockout, 'joinCode'> & { joinCode?: string };

export class QuickKnockoutService {
    private async _playerName(playerId: string): Promise<string> {
        const player = await playerRepository.getById(playerId);
        if (!player) throw new NotFoundError('Player not found.');
        return `${player.firstName} ${player.lastName}`.trim();
    }

    private _maxPlayers(k: IQuickKnockout): number {
        return KNOCKOUT_LIMITS.maxEntrants * (k.format === 'doubles' ? 2 : 1);
    }

    private _assertWaiting(k: IQuickKnockout): void {
        if (k.status !== 'waiting') throw new BadRequestError('This knockout has already started.');
    }

    private _hasAccount(k: IQuickKnockout, playerId: string): boolean {
        return k.players.some((p) => p.playerId && String(p.playerId) === playerId);
    }

    /** Who is in changed, so the preview is wrong: draw again. Host-made pairs stay. */
    private _clearDraw(k: IQuickKnockout): void {
        k.entrants = [];
        k.fixtures = [];
        k.roundNames = [];
        k.pairs = k.pairs
            .filter((p) => p.byHost)
            .map((p) => ({ pairId: p.pairId, playerKeys: [...p.playerKeys], byHost: true }));
    }

    async loadAsHost(id: string, userId: string): Promise<IQuickKnockout> {
        const k = await quickKnockoutRepository.getById(id);
        if (!k) throw new NotFoundError('Knockout not found.');
        if (String(k.hostId) !== userId) throw new ForbiddenError('Only the host can do that.');
        return k;
    }

    /** Save and push to everyone watching. Sockets are unauthenticated, so the code is stripped. */
    async persist(k: IQuickKnockout): Promise<IQuickKnockout> {
        const saved = await quickKnockoutRepository.persist(k);
        const io = getIo();
        if (io) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { joinCode, ...redacted } = saved.toObject() as RedactableKnockout;
            io.to(`match:${String(saved._id)}`).emit('knockout:update', { knockout: redacted });
        }
        return saved;
    }

    async create(hostId: string, input: CreateKnockoutInput): Promise<SuccessResponse<IQuickKnockout>> {
        const hostName = await this._playerName(hostId);
        const name = (input.name?.trim() || `${hostName.split(/\s+/)[0]}'s Knockout`).slice(0, 40);
        // ponytail: a join-code race after allocateJoinCode surfaces as E11000; at 32^6 codes, not worth a retry loop yet.
        const created = await quickKnockoutRepository.create({
            hostId,
            joinCode: await allocateJoinCode(),
            name,
            format: input.format,
            matchConfig: input.matchConfig,
            players: [{ playerKey: newId(), playerId: hostId, displayName: hostName }],
        });
        return new SuccessResponse('Knockout created.', created);
    }

    async getById(id: string, viewerId?: string): Promise<SuccessResponse<RedactableKnockout>> {
        const k = await quickKnockoutRepository.getById(id);
        if (!k) throw new NotFoundError('Knockout not found.');
        const insider = viewerId !== undefined && (String(k.hostId) === viewerId || this._hasAccount(k, viewerId));
        if (insider) return new SuccessResponse('Knockout fetched.', k);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { joinCode, ...redacted } = k.toObject() as RedactableKnockout;
        return new SuccessResponse('Knockout fetched.', redacted);
    }

    async getByJoinCode(code: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await quickKnockoutRepository.getByJoinCode(code);
        if (!k) throw new NotFoundError('Knockout not found.');
        return new SuccessResponse('Knockout fetched.', k);
    }

    async listMine(playerId: string): Promise<SuccessResponse<IQuickKnockout[]>> {
        return new SuccessResponse('Knockouts fetched.', await quickKnockoutRepository.listForPlayer(playerId));
    }

    async join(code: string, playerId: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await quickKnockoutRepository.getByJoinCode(code);
        if (!k) throw new NotFoundError('Knockout not found.');
        this._assertWaiting(k);
        if (this._hasAccount(k, playerId)) throw new BadRequestError('You are already in this knockout.');
        if (k.players.length >= this._maxPlayers(k)) throw new BadRequestError('This knockout is full.');

        k.players.push({ playerKey: newId(), playerId: new mongoose.Types.ObjectId(playerId), displayName: await this._playerName(playerId) });
        this._clearDraw(k);
        return new SuccessResponse('Joined.', await this.persist(k));
    }

    /** A Kria player takes a name the host typed for them. Same key, so pairs survive. */
    async claim(code: string, playerId: string, playerKey: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await quickKnockoutRepository.getByJoinCode(code);
        if (!k) throw new NotFoundError('Knockout not found.');
        this._assertWaiting(k);
        if (this._hasAccount(k, playerId)) throw new BadRequestError('You are already in this knockout.');
        const guest = k.players.find((p) => p.playerKey === playerKey);
        if (!guest) throw new NotFoundError('That name is not in this knockout.');
        if (guest.playerId) throw new BadRequestError('That name is already taken.');

        guest.playerId = new mongoose.Types.ObjectId(playerId);
        guest.displayName = await this._playerName(playerId);
        return new SuccessResponse('Name claimed.', await this.persist(k));
    }

    async addPlayer(id: string, hostId: string, input: { displayName?: string; playerId?: string }): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        this._assertWaiting(k);
        if (k.players.length >= this._maxPlayers(k)) throw new BadRequestError('This knockout is full.');

        if (input.playerId) {
            if (this._hasAccount(k, input.playerId)) throw new BadRequestError('That player is already in this knockout.');
            k.players.push({ playerKey: newId(), playerId: new mongoose.Types.ObjectId(input.playerId), displayName: await this._playerName(input.playerId) });
        } else {
            const displayName = input.displayName?.trim();
            if (!displayName) throw new BadRequestError('A guest needs a name.');
            k.players.push({ playerKey: newId(), displayName });
        }
        this._clearDraw(k);
        return new SuccessResponse('Player added.', await this.persist(k));
    }

    async removePlayer(id: string, hostId: string, playerKey: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        this._assertWaiting(k);
        const index = k.players.findIndex((p) => p.playerKey === playerKey);
        if (index === -1) throw new NotFoundError('That player is not in this knockout.');

        k.players.splice(index, 1);
        k.pairs = k.pairs
            .filter((p) => !p.playerKeys.includes(playerKey))
            .map((p) => ({ pairId: p.pairId, playerKeys: [...p.playerKeys], byHost: p.byHost }));
        this._clearDraw(k);
        return new SuccessResponse('Player removed.', await this.persist(k));
    }

    async pair(id: string, hostId: string, playerKeys: [string, string]): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        this._assertWaiting(k);
        if (k.format !== 'doubles') throw new BadRequestError('Pairs are for doubles knockouts.');
        const [a, b] = playerKeys;
        if (a === b) throw new BadRequestError('Pick two different players.');
        for (const key of playerKeys) {
            if (!k.players.some((p) => p.playerKey === key)) throw new NotFoundError('That player is not in this knockout.');
            if (k.pairs.some((p) => p.byHost && p.playerKeys.includes(key))) throw new BadRequestError('That player is already paired.');
        }
        this._clearDraw(k);
        k.pairs.push({ pairId: newId(), playerKeys: [a, b], byHost: true });
        return new SuccessResponse('Paired.', await this.persist(k));
    }

    async unpair(id: string, hostId: string, pairId: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        this._assertWaiting(k);
        if (!k.pairs.some((p) => p.pairId === pairId)) throw new NotFoundError('That pair does not exist.');
        k.pairs = k.pairs
            .filter((p) => p.pairId !== pairId)
            .map((p) => ({ pairId: p.pairId, playerKeys: [...p.playerKeys], byHost: p.byHost }));
        this._clearDraw(k);
        return new SuccessResponse('Unpaired.', await this.persist(k));
    }
}

export const quickKnockoutService = new QuickKnockoutService();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run test/quickKnockoutRoster.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd server && git add src/services/quickKnockout.service.ts test/quickKnockoutRoster.test.ts
git commit -m "feat knockout roster: create, join, claim, add, remove, pairs"
```

---

### Task 4: The draw

**Files:**
- Modify: `server/src/services/quickKnockout.service.ts` (add `draw`)
- Test: `server/test/quickKnockoutDrawService.test.ts`

**Interfaces:**
- Consumes: `buildBracket`, `pairUp` (Task 1); service internals from Task 3.
- Produces: `quickKnockoutService.draw(id, hostId): Promise<SuccessResponse<IQuickKnockout>>`.

- [ ] **Step 1: Write the failing test**

```ts
// server/test/quickKnockoutDrawService.test.ts
import { describe, expect, it } from 'vitest';
import Player from '../src/models/player.model';
import { quickKnockoutService } from '../src/services/quickKnockout.service';

let seq = 0;
async function makePlayer(firstName: string) {
    seq += 1;
    const p = await Player.create({ firstName, lastName: 'T', email: `kd${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true });
    return p._id.toString();
}

async function knockoutWith(format: 'singles' | 'doubles', total: number) {
    const hostId = await makePlayer('Host');
    const k = (await quickKnockoutService.create(hostId, { format, matchConfig: { bestOf: 1, pointsToWin: 11 } })).data!;
    const id = String(k._id);
    for (let i = 1; i < total; i++) await quickKnockoutService.addPlayer(id, hostId, { displayName: `Guest ${i}` });
    return { id, hostId };
}

describe('the draw', () => {
    it('singles: one entrant per player and a full bracket', async () => {
        const { id, hostId } = await knockoutWith('singles', 12);
        const k = (await quickKnockoutService.draw(id, hostId)).data!;
        expect(k.entrants).toHaveLength(12);
        expect(k.roundNames).toEqual(['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']);
        expect(k.fixtures.filter((f) => f.round === 1 && f.bye)).toHaveLength(4);
        expect(new Set(k.fixtures.map((f) => f.fixtureId)).size).toBe(k.fixtures.length);
        expect(k.status).toBe('waiting');
    });

    it('doubles: keeps host pairs and pairs everyone else', async () => {
        const { id, hostId } = await knockoutWith('doubles', 8);
        const before = (await quickKnockoutService.getById(id, hostId)).data!;
        const [a, b] = before.players.map((p) => p.playerKey);
        await quickKnockoutService.pair(id, hostId, [a, b]);

        const k = (await quickKnockoutService.draw(id, hostId)).data!;
        expect(k.pairs).toHaveLength(4);
        expect(k.pairs.filter((p) => p.byHost)).toHaveLength(1);
        expect(k.pairs.find((p) => p.byHost)!.playerKeys).toEqual([a, b]);
        expect(k.pairs.flatMap((p) => p.playerKeys).sort()).toEqual(before.players.map((p) => p.playerKey).sort());
        expect(k.entrants).toHaveLength(4);
    });

    it('doubles: refuses an odd number of people', async () => {
        const { id, hostId } = await knockoutWith('doubles', 7);
        await expect(quickKnockoutService.draw(id, hostId)).rejects.toThrow('Add one more player or remove one to draw.');
    });

    it('refuses fewer than 3 entrants', async () => {
        const { id, hostId } = await knockoutWith('singles', 2);
        await expect(quickKnockoutService.draw(id, hostId)).rejects.toThrow('A knockout needs at least 3 entrants.');
        const doubles = await knockoutWith('doubles', 4);
        await expect(quickKnockoutService.draw(doubles.id, doubles.hostId)).rejects.toThrow('A knockout needs at least 3 entrants.');
    });

    it('reshuffling replaces only the drawn pairs', async () => {
        const { id, hostId } = await knockoutWith('doubles', 8);
        const first = (await quickKnockoutService.draw(id, hostId)).data!;
        const second = (await quickKnockoutService.draw(id, hostId)).data!;
        expect(second.pairs).toHaveLength(4);
        expect(second.entrants.map((e) => e.entrantId)).not.toEqual(first.entrants.map((e) => e.entrantId));
    });

    it('a roster change after the draw clears it', async () => {
        const { id, hostId } = await knockoutWith('singles', 4);
        await quickKnockoutService.draw(id, hostId);
        const k = (await quickKnockoutService.addPlayer(id, hostId, { displayName: 'Late' })).data!;
        expect(k.entrants).toHaveLength(0);
        expect(k.fixtures).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run test/quickKnockoutDrawService.test.ts`
Expected: FAIL — `quickKnockoutService.draw is not a function`.

- [ ] **Step 3: Implement `draw`**

Add `import { buildBracket, pairUp } from '../shared/bracket/knockoutDraw';` to the service imports, then add to the class:

```ts
    /** Draw, or reshuffle: a preview only — nothing is played until Start. */
    async draw(id: string, hostId: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        this._assertWaiting(k);

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
        if (teams.length < KNOCKOUT_LIMITS.minEntrants) throw new BadRequestError('A knockout needs at least 3 entrants.');

        const entrants = teams.map((playerKeys) => ({ entrantId: newId(), playerKeys }));
        const { fixtures, roundNames } = buildBracket(entrants.map((e) => e.entrantId));
        k.entrants = entrants;
        k.fixtures = fixtures.map((f) => ({ ...f, fixtureId: newId() }));
        k.roundNames = roundNames;
        return new SuccessResponse('Drawn.', await this.persist(k));
    }
```

- [ ] **Step 4: Run tests**

Run: `cd server && npx vitest run test/quickKnockoutDrawService.test.ts test/quickKnockoutRoster.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd server && git add src/services/quickKnockout.service.ts test/quickKnockoutDrawService.test.ts
git commit -m "feat knockout draw and reshuffle"
```

---

### Task 5: Start, reconcile, cancel, champion honour

**Files:**
- Modify: `server/src/models/player.model.ts` (`ORGANIZER_BADGE_KEYS`, `BADGE_KEYS` + `knockout-winner`)
- Modify: `server/src/middlewares/validators/tournament.validator.ts` (organizer keys)
- Modify: `server/src/repository/player.repository.ts` (`removeHonor`)
- Modify: `server/src/services/quickKnockout.service.ts` (`start`, `reconcile`, `cancel`, `assertUndoAllowed`; `getById` reconciles while live)
- Test: `server/test/quickKnockoutBracket.test.ts`

**Interfaces:**
- Consumes: `quickMatchService.createForKnockout`, `listForKnockout`, `deleteForKnockout`, `persist` (Task 2); `quickBadmintonScoringService.recordPoint(matchId, hostId, side, delta)`.
- Produces:
  - `quickKnockoutService.start(id, hostId)`, `cancel(id, hostId)`, `reconcile(id): Promise<IQuickKnockout>`, `assertUndoAllowed(knockoutId, fixtureId): Promise<void>`
  - `CHAMPION_BADGE = 'knockout-winner'`, `championTitle(name) => 'Won ' + name` (exported from the service)
  - `ORGANIZER_BADGE_KEYS` (12 keys) from `models/player.model.ts`; `BADGE_KEYS` = those + `'knockout-winner'`.
  - `playerRepository.removeHonor(id, { title, badge })`.

- [ ] **Step 1: Write the failing test**

```ts
// server/test/quickKnockoutBracket.test.ts
import { describe, expect, it } from 'vitest';
import Player from '../src/models/player.model';
import QuickMatchModel from '../src/models/quickMatch.model';
import { quickKnockoutService } from '../src/services/quickKnockout.service';
import { quickBadmintonScoringService } from '../src/sports/badminton/services/quickBadmintonScoring.service';
import { ORGANIZER_BADGE_KEYS } from '../src/models/player.model';

let seq = 0;
async function makePlayer(firstName: string) {
    seq += 1;
    const p = await Player.create({ firstName, lastName: 'T', email: `kb${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true });
    return p._id.toString();
}

/** A started singles knockout. `accounts` of the players are Kria accounts (host included). */
async function started(total: number, accounts = total) {
    const hostId = await makePlayer('Host');
    const k = (await quickKnockoutService.create(hostId, { format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 }, name: 'Sunday Smash' })).data!;
    const id = String(k._id);
    for (let i = 1; i < total; i++) {
        if (i < accounts) await quickKnockoutService.addPlayer(id, hostId, { playerId: await makePlayer(`P${i}`) });
        else await quickKnockoutService.addPlayer(id, hostId, { displayName: `Guest ${i}` });
    }
    await quickKnockoutService.draw(id, hostId);
    const live = (await quickKnockoutService.start(id, hostId)).data!;
    return { id, hostId, k: live };
}

async function win(matchId: string, hostId: string, side: 1 | 2 = 1) {
    for (let i = 0; i < 11; i++) await quickBadmintonScoringService.recordPoint(matchId, hostId, side, 1);
}

const matchesOf = (id: string) => QuickMatchModel.find({ knockoutId: id });

describe('starting', () => {
    it('goes live and creates a match for every round-1 fixture with two entrants', async () => {
        const { k, id } = await started(8);
        expect(k.status).toBe('live');
        expect(await matchesOf(id)).toHaveLength(4);
        expect(k.fixtures.filter((f) => f.round === 1).every((f) => f.quickMatchId)).toBe(true);
    });

    it('moves byes on at once and opens matches whose both entrants had byes', async () => {
        const { k, id } = await started(6); // 8-bracket, 2 byes, never facing each other
        const round1 = k.fixtures.filter((f) => f.round === 1);
        expect(round1.filter((f) => f.bye).every((f) => f.winnerEntrantId)).toBe(true);
        expect(await matchesOf(id)).toHaveLength(2); // the two real round-1 matches
    });

    it('needs a draw first', async () => {
        const hostId = await makePlayer('Host');
        const k = (await quickKnockoutService.create(hostId, { format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 } })).data!;
        await expect(quickKnockoutService.start(String(k._id), hostId)).rejects.toThrow(/draw/i);
    });

    it('records whether awards are allowed (≥ 4 Kria players)', async () => {
        expect((await started(4, 4)).k.awardsEligible).toBe(true);
        expect((await started(4, 3)).k.awardsEligible).toBe(false);
    });
});

describe('advancing', () => {
    it('a finished match fills the next fixture and opens its match', async () => {
        const { id, hostId } = await started(4);
        const [first, second] = await matchesOf(id);
        await win(String(first._id), hostId);
        await win(String(second._id), hostId);

        const k = await quickKnockoutService.reconcile(id);
        const final = k.fixtures.find((f) => f.round === 2)!;
        expect(final.entrantA).toBeDefined();
        expect(final.entrantB).toBeDefined();
        expect(final.quickMatchId).toBeDefined();
    });

    it('the final completes the knockout and crowns the champion with a low-tier honour', async () => {
        const { id, hostId } = await started(4);
        for (const m of await matchesOf(id)) await win(String(m._id), hostId);
        await quickKnockoutService.reconcile(id);
        const final = (await matchesOf(id)).find((m) => m.status === 'live')!;
        await win(String(final._id), hostId);

        const k = await quickKnockoutService.reconcile(id);
        expect(k.status).toBe('completed');
        const champion = k.entrants.find((e) => e.entrantId === k.championEntrantId)!;
        const player = k.players.find((p) => p.playerKey === champion.playerKeys[0])!;
        const honors = (await Player.findById(player.playerId).lean())!.honors;
        expect(honors).toEqual([{ title: 'Won Sunday Smash', badge: 'knockout-winner' }]);
    });

    it('reconcile is idempotent', async () => {
        const { id } = await started(8);
        await quickKnockoutService.reconcile(id);
        await quickKnockoutService.reconcile(id);
        expect(await matchesOf(id)).toHaveLength(4);
    });

    it('two reconciles racing still make one match per fixture', async () => {
        await QuickMatchModel.init();
        const { id, hostId } = await started(4);
        for (const m of await matchesOf(id)) await win(String(m._id), hostId);
        // One racer may lose the knockout save to Mongoose's version check —
        // that is fine: the unique index already stopped a duplicate match,
        // and the next reconcile heals the record.
        await Promise.allSettled([quickKnockoutService.reconcile(id), quickKnockoutService.reconcile(id)]);
        const k = await quickKnockoutService.reconcile(id);
        expect(await matchesOf(id)).toHaveLength(3);
        expect(k.fixtures.find((f) => f.round === 2)!.quickMatchId).toBeDefined();
    });

    it('no honour when fewer than 4 Kria players took part', async () => {
        const { id, hostId } = await started(4, 3);
        for (let round = 0; round < 2; round++) {
            for (const m of (await matchesOf(id)).filter((x) => x.status === 'live')) await win(String(m._id), hostId);
            await quickKnockoutService.reconcile(id);
        }
        const k = await quickKnockoutService.reconcile(id);
        expect(k.status).toBe('completed');
        const honours = await Player.find({ 'honors.badge': 'knockout-winner', _id: { $in: k.players.map((p) => p.playerId).filter(Boolean) } });
        expect(honours).toHaveLength(0);
    });
});

describe('cancelling', () => {
    it('cancels the knockout and every unfinished match', async () => {
        const { id, hostId } = await started(4);
        const k = (await quickKnockoutService.cancel(id, hostId)).data!;
        expect(k.status).toBe('cancelled');
        expect((await matchesOf(id)).every((m) => m.status === 'cancelled')).toBe(true);
    });
});

describe('badges', () => {
    it('organizers cannot pick the knockout badge', () => {
        expect(ORGANIZER_BADGE_KEYS).not.toContain('knockout-winner');
        expect(ORGANIZER_BADGE_KEYS).toHaveLength(12);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run test/quickKnockoutBracket.test.ts`
Expected: FAIL — `quickKnockoutService.start is not a function` / `ORGANIZER_BADGE_KEYS` undefined.

- [ ] **Step 3: Badge keys and `removeHonor`**

In `server/src/models/player.model.ts` replace the `BADGE_KEYS` declaration with:

```ts
// What an organizer may grant from the award form (client/ and the
// tournament award validator). Quick knockouts add their own low-tier badge,
// which only the server's knockout service writes.
export const ORGANIZER_BADGE_KEYS = [
    'player-of-the-match', 'season-mvp',
    'hat-trick', 'undefeated-run', 'auction-steal',
    'centurion', 'clean-sweep', 'rally-king',
    'ace-serve', 'fair-play',
    'iron-player', 'first-cap',
] as const;

export const BADGE_KEYS = [...ORGANIZER_BADGE_KEYS, 'knockout-winner'] as const;
```

In `server/src/middlewares/validators/tournament.validator.ts` change the import to `import { ORGANIZER_BADGE_KEYS } from '../../models/player.model';` and the badge rule to `.isIn([...ORGANIZER_BADGE_KEYS])`.

In `server/src/repository/player.repository.ts`, after `addHonor`, add:

```ts
    /** The exact {title, badge} pair addHonor wrote — used when a knockout final is undone. */
    async removeHonor(id: string, honor: { title: string; badge: string }) {
        return this._model.findByIdAndUpdate(
            id,
            { $pull: { honors: honor } },
            { new: true }
        ).select('-password -otp').lean();
    }
```

- [ ] **Step 4: Start, reconcile, cancel, undo check**

Add to the service imports:

```ts
import logger from '../utils/logger';
import { IQuickMatch, IQuickBadmintonMatch } from '../models/quickMatch.model';
import { quickMatchService } from './quickMatch.service';
```

Add at module level (below `newId`):

```ts
export const CHAMPION_BADGE = 'knockout-winner';
export const championTitle = (name: string) => `Won ${name}`;

function hasPoints(m: IQuickMatch): boolean {
    return ((m as IQuickBadmintonMatch).gameScores ?? []).some((g) => g.side1Score + g.side2Score > 0);
}
```

Add to the class:

```ts
    private _entrantPlayers(k: IQuickKnockout, entrantId: string) {
        const entrant = k.entrants.find((e) => e.entrantId === entrantId);
        return (entrant?.playerKeys ?? [])
            .map((key) => k.players.find((p) => p.playerKey === key))
            .filter((p): p is IQuickKnockout['players'][number] => Boolean(p));
    }

    /** A match side for an entrant: "Arjun Mehta", or "Arjun & Priya" in doubles. */
    private _side(k: IQuickKnockout, entrantId: string) {
        const players = this._entrantPlayers(k, entrantId);
        const name = players.length === 1
            ? players[0].displayName
            : players.map((p) => p.displayName.split(/\s+/)[0]).join(' & ');
        return {
            name,
            slots: players.map((p) => ({ playerId: p.playerId ? String(p.playerId) : undefined, displayName: p.displayName })),
        };
    }

    private async _setChampionHonour(k: IQuickKnockout, entrantId: string, give: boolean): Promise<void> {
        if (!k.awardsEligible) return;
        const honor = { title: championTitle(k.name), badge: CHAMPION_BADGE };
        for (const p of this._entrantPlayers(k, entrantId)) {
            if (!p.playerId) continue;
            if (give) await playerRepository.addHonor(String(p.playerId), honor);
            else await playerRepository.removeHonor(String(p.playerId), honor);
        }
    }

    async start(id: string, hostId: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        this._assertWaiting(k);
        if (k.entrants.length === 0) throw new BadRequestError('Draw the bracket first.');
        k.status = 'live';
        k.awardsEligible = k.players.filter((p) => p.playerId).length >= 4;
        await this.persist(k);
        return new SuccessResponse('Knockout started.', await this.reconcile(id));
    }

    /**
     * The only thing that advances the bracket. Recomputes every fixture from
     * byes and match results, creates matches that became playable, drops a
     * match whose entrants were pulled back by an undo, and crowns or
     * un-crowns the champion. Idempotent, so a reconcile that failed half-way
     * heals on the next one (GET runs one while live).
     */
    async reconcile(id: string): Promise<IQuickKnockout> {
        const k = await quickKnockoutRepository.getById(id);
        if (!k) throw new NotFoundError('Knockout not found.');
        if (k.status !== 'live' && k.status !== 'completed') return k;

        const matches = new Map((await quickMatchService.listForKnockout(id)).map((m) => [m.fixtureId as string, m]));
        const at = (round: number, position: number) => k.fixtures.find((f) => f.round === round && f.position === position);
        const rounds = k.roundNames.length;

        for (let round = 1; round <= rounds; round++) {
            const inRound = k.fixtures.filter((f) => f.round === round).sort((a, b) => a.position - b.position);
            for (const f of inRound) {
                if (round > 1) {
                    f.entrantA = at(round - 1, 2 * f.position)?.winnerEntrantId;
                    f.entrantB = at(round - 1, 2 * f.position + 1)?.winnerEntrantId;
                }

                if (f.quickMatchId && (f.matchEntrants?.[0] !== f.entrantA || f.matchEntrants?.[1] !== f.entrantB)) {
                    const stale = matches.get(f.fixtureId);
                    if (stale && hasPoints(stale)) {
                        // assertUndoAllowed stops this; never destroy a played match to "fix" a bracket.
                        logger.error(`quickKnockout.reconcile ${id}: fixture ${f.fixtureId} has a played match for other entrants`);
                    } else {
                        if (stale) await quickMatchService.deleteForKnockout(String(stale._id));
                        matches.delete(f.fixtureId);
                        f.quickMatchId = undefined;
                        f.matchEntrants = undefined;
                    }
                }

                if (!f.quickMatchId && f.entrantA && f.entrantB) {
                    const created = await quickMatchService.createForKnockout({
                        hostId: String(k.hostId),
                        knockoutId: id,
                        fixtureId: f.fixtureId,
                        sides: [this._side(k, f.entrantA), this._side(k, f.entrantB)],
                        matchConfig: { bestOf: k.matchConfig.bestOf, pointsToWin: k.matchConfig.pointsToWin },
                    }) ?? (await quickMatchService.listForKnockout(id)).find((m) => m.fixtureId === f.fixtureId);
                    if (created) {
                        f.quickMatchId = created._id;
                        f.matchEntrants = [f.entrantA, f.entrantB];
                        matches.set(f.fixtureId, created);
                    }
                }

                const match = f.quickMatchId ? matches.get(f.fixtureId) : undefined;
                f.winnerEntrantId = f.bye
                    ? (f.entrantA ?? f.entrantB)
                    : match?.status === 'completed'
                        ? (match.outcome === 'side1' ? f.entrantA : f.entrantB)
                        : undefined;
            }
        }

        const champion = at(rounds, 0)?.winnerEntrantId;
        if (champion && k.status !== 'completed') {
            k.status = 'completed';
            k.championEntrantId = champion;
            await this._setChampionHonour(k, champion, true);
        } else if (!champion && k.status === 'completed') {
            if (k.championEntrantId) await this._setChampionHonour(k, k.championEntrantId, false);
            k.status = 'live';
            k.championEntrantId = undefined;
        }
        k.markModified('fixtures');
        return this.persist(k);
    }

    /** Undoing a finished match is allowed only while the match it feeds has no points. */
    async assertUndoAllowed(knockoutId: string, fixtureId: string): Promise<void> {
        const k = await quickKnockoutRepository.getById(knockoutId);
        const f = k?.fixtures.find((x) => x.fixtureId === fixtureId);
        if (!k || !f) return;
        const next = k.fixtures.find((x) => x.round === f.round + 1 && x.position === Math.floor(f.position / 2));
        if (!next?.quickMatchId) return;
        const nextMatch = (await quickMatchService.listForKnockout(knockoutId)).find((m) => m.fixtureId === next.fixtureId);
        if (nextMatch && hasPoints(nextMatch)) throw new BadRequestError('The next match has already started.');
    }

    async cancel(id: string, hostId: string): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        if (k.status === 'completed' || k.status === 'cancelled') throw new BadRequestError('This knockout is already over.');
        for (const m of await quickMatchService.listForKnockout(id)) {
            if (m.status !== 'live') continue;
            m.status = 'cancelled';
            await quickMatchService.persist(m);
        }
        k.status = 'cancelled';
        return new SuccessResponse('Knockout cancelled.', await this.persist(k));
    }
```

Finally, make `getById` heal a live bracket — change its first line to:

```ts
        let k = await quickKnockoutRepository.getById(id);
        if (!k) throw new NotFoundError('Knockout not found.');
        if (k.status === 'live') {
            k = await this.reconcile(id).catch((err) => {
                logger.error(`quickKnockout.getById reconcile ${id} failed: ${String(err)}`);
                return k as IQuickKnockout;
            });
        }
```

(and keep the rest of `getById` unchanged, using `k`).

- [ ] **Step 5: Run tests**

Run: `cd server && npx vitest run test/quickKnockoutBracket.test.ts test/quickKnockoutRoster.test.ts test/quickKnockoutDrawService.test.ts test/grantAwardBadge.test.ts`
Expected: PASS. (`grantAwardBadge` proves the organizer path still accepts its 12 keys.)

- [ ] **Step 6: Commit**

```bash
cd server && git add src/models/player.model.ts src/middlewares/validators/tournament.validator.ts src/repository/player.repository.ts src/services/quickKnockout.service.ts test/quickKnockoutBracket.test.ts
git commit -m "feat knockout start, reconcile, cancel and champion honour"
```

---

### Task 6: Scoring integration — advance on completion, guarded undo

**Files:**
- Modify: `server/src/sports/badminton/services/quickBadmintonScoring.service.ts`
- Test: `server/test/quickKnockoutScoring.test.ts`

**Interfaces:**
- Consumes: `quickKnockoutService.reconcile(id)`, `quickKnockoutService.assertUndoAllowed(knockoutId, fixtureId)`.
- Produces: completion of a knockout match advances the bracket without any extra call; `undoLastPoint` enforces the rule and pulls winners back.

- [ ] **Step 1: Write the failing test**

```ts
// server/test/quickKnockoutScoring.test.ts
import { describe, expect, it } from 'vitest';
import Player from '../src/models/player.model';
import QuickMatchModel from '../src/models/quickMatch.model';
import { quickKnockoutService } from '../src/services/quickKnockout.service';
import { quickBadmintonScoringService } from '../src/sports/badminton/services/quickBadmintonScoring.service';
import { QuickKnockoutModel } from '../src/models/quickKnockout.model';

let seq = 0;
async function makePlayer(firstName: string) {
    seq += 1;
    const p = await Player.create({ firstName, lastName: 'T', email: `ks${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true });
    return p._id.toString();
}

async function started(total: number) {
    const hostId = await makePlayer('Host');
    const k = (await quickKnockoutService.create(hostId, { format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 }, name: 'Cup' })).data!;
    const id = String(k._id);
    for (let i = 1; i < total; i++) await quickKnockoutService.addPlayer(id, hostId, { playerId: await makePlayer(`P${i}`) });
    await quickKnockoutService.draw(id, hostId);
    await quickKnockoutService.start(id, hostId);
    return { id, hostId };
}

const live = (id: string) => QuickMatchModel.find({ knockoutId: id, status: 'live' });
async function win(matchId: string, hostId: string) {
    for (let i = 0; i < 11; i++) await quickBadmintonScoringService.recordPoint(matchId, hostId, 1, 1);
}

describe('scoring inside a knockout', () => {
    it('finishing both semis opens the final with no extra call', async () => {
        const { id, hostId } = await started(4);
        for (const m of await live(id)) await win(String(m._id), hostId);
        const k = await QuickKnockoutModel.findById(id);
        expect(k!.fixtures.find((f) => f.round === 2)!.quickMatchId).toBeDefined();
        expect(await live(id)).toHaveLength(1);
    });

    it('undo of a finished semi is allowed while the final has no points, and pulls the winner back', async () => {
        const { id, hostId } = await started(4);
        const [semi1, semi2] = await live(id);
        await win(String(semi1._id), hostId);
        await win(String(semi2._id), hostId);

        await quickBadmintonScoringService.undoLastPoint(String(semi1._id), hostId);

        const k = await QuickKnockoutModel.findById(id);
        const final = k!.fixtures.find((f) => f.round === 2)!;
        expect(final.entrantA).toBeUndefined();
        expect(final.quickMatchId).toBeUndefined();
        expect(await QuickMatchModel.countDocuments({ knockoutId: id })).toBe(2);
    });

    it('undo of a finished semi is refused once the final has points', async () => {
        const { id, hostId } = await started(4);
        const [semi1, semi2] = await live(id);
        await win(String(semi1._id), hostId);
        await win(String(semi2._id), hostId);
        const [final] = await live(id);
        await quickBadmintonScoringService.recordPoint(String(final._id), hostId, 1, 1);

        await expect(quickBadmintonScoringService.undoLastPoint(String(semi1._id), hostId))
            .rejects.toThrow('The next match has already started.');
    });

    it('undo of the final reopens the knockout and takes the honour back', async () => {
        const { id, hostId } = await started(4);
        for (const m of await live(id)) await win(String(m._id), hostId);
        const [final] = await live(id);
        await win(String(final._id), hostId);
        expect((await QuickKnockoutModel.findById(id))!.status).toBe('completed');

        await quickBadmintonScoringService.undoLastPoint(String(final._id), hostId);

        const k = await QuickKnockoutModel.findById(id);
        expect(k!.status).toBe('live');
        expect(k!.championEntrantId).toBeUndefined();
        expect(await Player.countDocuments({ 'honors.badge': 'knockout-winner' })).toBe(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run test/quickKnockoutScoring.test.ts`
Expected: FAIL — the final's match is never created by scoring alone (`quickMatchId` undefined), undo is not refused.

- [ ] **Step 3: Wire scoring to the knockout**

In `server/src/sports/badminton/services/quickBadmintonScoring.service.ts` add imports:

```ts
import logger from '../../../utils/logger';
import { quickKnockoutService } from '../../../services/quickKnockout.service';
```

(If `logger` is already imported in that file, keep the existing import.)

In `recordPoint`, directly after the `careerStatsService.recordQuickMatchCompletion(...)` block inside `if (matchWinner) { … }`, add inside the same `if`:

```ts
            // A knockout match finishing moves its winner on. Logged, never
            // thrown: the point is saved, and GET /quick-knockout/:id heals.
            if (match.knockoutId) {
                await quickKnockoutService.reconcile(String(match.knockoutId)).catch((err) => {
                    logger.error(`quickBadminton.recordPoint reconcile ${String(match.knockoutId)} failed: ${String(err)}`);
                });
            }
```

In `undoLastPoint`, directly after `const wasCompleted = match.status === 'completed';` add:

```ts
        // A finished knockout match may only be reopened while the match its
        // winner moved into has no points — checked before anything changes.
        if (wasCompleted && match.knockoutId && match.fixtureId) {
            await quickKnockoutService.assertUndoAllowed(String(match.knockoutId), match.fixtureId);
        }
```

and directly after `const updated = await quickMatchService.persist(match);` add:

```ts
        if (wasCompleted && match.knockoutId) {
            await quickKnockoutService.reconcile(String(match.knockoutId)).catch((err) => {
                logger.error(`quickBadminton.undoLastPoint reconcile ${String(match.knockoutId)} failed: ${String(err)}`);
            });
        }
```

- [ ] **Step 4: Run tests**

Run: `cd server && npx vitest run test/quickKnockoutScoring.test.ts test/quickBadmintonScoring.test.ts test/quickBadmintonUndo.test.ts test/quickKnockoutBracket.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd server && git add src/sports/badminton/services/quickBadmintonScoring.service.ts test/quickKnockoutScoring.test.ts
git commit -m "feat knockout advances on match completion with guarded undo"
```

---

### Task 7: Host extra awards

**Files:**
- Modify: `server/src/services/quickKnockout.service.ts` (`QUICK_AWARD_BADGES`, `grantAward`)
- Test: `server/test/quickKnockoutAwards.test.ts`

**Interfaces:**
- Produces: `QUICK_AWARD_BADGES: Record<'iron-player' | 'first-cap' | 'ace-serve' | 'fair-play', string>` (display names) and `quickKnockoutService.grantAward(id, hostId, { playerId, badge })`.

- [ ] **Step 1: Write the failing test**

```ts
// server/test/quickKnockoutAwards.test.ts
import { describe, expect, it } from 'vitest';
import Player from '../src/models/player.model';
import QuickMatchModel from '../src/models/quickMatch.model';
import { quickKnockoutService } from '../src/services/quickKnockout.service';
import { quickBadmintonScoringService } from '../src/sports/badminton/services/quickBadmintonScoring.service';

let seq = 0;
async function makePlayer(firstName: string) {
    seq += 1;
    const p = await Player.create({ firstName, lastName: 'T', email: `ka${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true });
    return p._id.toString();
}

async function finished(accounts = 4) {
    const hostId = await makePlayer('Host');
    const k = (await quickKnockoutService.create(hostId, { format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 }, name: 'Cup' })).data!;
    const id = String(k._id);
    const others: string[] = [];
    for (let i = 1; i < 4; i++) {
        if (i < accounts) {
            const pid = await makePlayer(`P${i}`);
            others.push(pid);
            await quickKnockoutService.addPlayer(id, hostId, { playerId: pid });
        } else {
            await quickKnockoutService.addPlayer(id, hostId, { displayName: `Guest ${i}` });
        }
    }
    await quickKnockoutService.draw(id, hostId);
    await quickKnockoutService.start(id, hostId);
    for (let round = 0; round < 2; round++) {
        for (const m of await QuickMatchModel.find({ knockoutId: id, status: 'live' })) {
            for (let i = 0; i < 11; i++) await quickBadmintonScoringService.recordPoint(String(m._id), hostId, 1, 1);
        }
    }
    return { id, hostId, others };
}

describe('host extra awards', () => {
    it('gives a low-tier honour with a fixed title', async () => {
        const { id, hostId, others } = await finished();
        const k = (await quickKnockoutService.grantAward(id, hostId, { playerId: others[0], badge: 'fair-play' })).data!;
        expect(k.awards).toHaveLength(1);
        const honors = (await Player.findById(others[0]).lean())!.honors;
        expect(honors).toContainEqual({ title: 'Fair Play · Cup', badge: 'fair-play' });
    });

    it('refuses a premium badge', async () => {
        const { id, hostId, others } = await finished();
        await expect(quickKnockoutService.grantAward(id, hostId, { playerId: others[0], badge: 'season-mvp' }))
            .rejects.toThrow(/knockout badges/i);
    });

    it('refuses the host awarding themselves', async () => {
        const { id, hostId } = await finished();
        await expect(quickKnockoutService.grantAward(id, hostId, { playerId: hostId, badge: 'fair-play' }))
            .rejects.toThrow(/yourself/i);
    });

    it('refuses a player not in the knockout', async () => {
        const { id, hostId } = await finished();
        await expect(quickKnockoutService.grantAward(id, hostId, { playerId: await makePlayer('Out'), badge: 'fair-play' }))
            .rejects.toThrow(/not in this knockout/i);
    });

    it('allows at most 3, and not the same badge twice to one player', async () => {
        const { id, hostId, others } = await finished();
        await quickKnockoutService.grantAward(id, hostId, { playerId: others[0], badge: 'fair-play' });
        await expect(quickKnockoutService.grantAward(id, hostId, { playerId: others[0], badge: 'fair-play' }))
            .rejects.toThrow(/already/i);
        await quickKnockoutService.grantAward(id, hostId, { playerId: others[1], badge: 'iron-player' });
        await quickKnockoutService.grantAward(id, hostId, { playerId: others[2], badge: 'ace-serve' });
        await expect(quickKnockoutService.grantAward(id, hostId, { playerId: others[0], badge: 'first-cap' }))
            .rejects.toThrow(/at most 3/i);
    });

    it('refuses awards when fewer than 4 Kria players took part', async () => {
        const { id, hostId, others } = await finished(3);
        await expect(quickKnockoutService.grantAward(id, hostId, { playerId: others[0], badge: 'fair-play' }))
            .rejects.toThrow(/at least 4/i);
    });

    it('refuses awards before the knockout is finished', async () => {
        const hostId = await makePlayer('Host');
        const k = (await quickKnockoutService.create(hostId, { format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 } })).data!;
        await expect(quickKnockoutService.grantAward(String(k._id), hostId, { playerId: hostId, badge: 'fair-play' }))
            .rejects.toThrow(/finished/i);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run test/quickKnockoutAwards.test.ts`
Expected: FAIL — `grantAward is not a function`.

- [ ] **Step 3: Implement**

At module level in the service:

```ts
/** Low-tier badges a host may hand out; premium tiers stay organizer-only. */
export const QUICK_AWARD_BADGES = {
    'iron-player': 'Iron Player',
    'first-cap': 'First Cap',
    'ace-serve': 'Ace Serve',
    'fair-play': 'Fair Play',
} as const;
export type QuickAwardBadge = keyof typeof QUICK_AWARD_BADGES;
const MAX_AWARDS = 3;
```

In the class:

```ts
    async grantAward(id: string, hostId: string, input: { playerId: string; badge: string }): Promise<SuccessResponse<IQuickKnockout>> {
        const k = await this.loadAsHost(id, hostId);
        if (k.status !== 'completed') throw new BadRequestError('Awards open once the knockout is finished.');
        if (!k.awardsEligible) throw new BadRequestError('Awards need at least 4 Kria players in the knockout.');
        const badgeName = (QUICK_AWARD_BADGES as Record<string, string>)[input.badge];
        if (!badgeName) throw new BadRequestError('Pick one of the knockout badges.');
        if (input.playerId === hostId) throw new BadRequestError('You cannot award yourself.');
        if (!this._hasAccount(k, input.playerId)) throw new BadRequestError('That player is not in this knockout.');
        if (k.awards.some((a) => String(a.playerId) === input.playerId && a.badge === input.badge)) {
            throw new BadRequestError('That player already has this award.');
        }
        if (k.awards.length >= MAX_AWARDS) throw new BadRequestError('A knockout can give at most 3 awards.');

        const title = `${badgeName} · ${k.name}`;
        await playerRepository.addHonor(input.playerId, { title, badge: input.badge });
        k.awards.push({ playerId: new mongoose.Types.ObjectId(input.playerId), badge: input.badge, title });
        return new SuccessResponse('Award given.', await this.persist(k));
    }
```

- [ ] **Step 4: Run tests**

Run: `cd server && npx vitest run test/quickKnockoutAwards.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd server && git add src/services/quickKnockout.service.ts test/quickKnockoutAwards.test.ts
git commit -m "feat knockout host awards with low-tier badges"
```

---

### Task 8: HTTP — validators, controller, routes, code resolver

**Files:**
- Create: `server/src/middlewares/validators/quickKnockout.validator.ts`
- Create: `server/src/controllers/quickKnockout.controller.ts`
- Create: `server/src/routes/quickKnockout.route.ts` (default `quickKnockoutRouter`, named `quickCodeRouter`)
- Modify: `server/src/routes/v1.route.ts`
- Modify: `server/src/services/quickKnockout.service.ts` (`resolveCode`)
- Test: `server/test/quickKnockoutHttp.test.ts`

**Interfaces:**
- Consumes: every service method from Tasks 3–7; `quickMatchService.getByJoinCode(code)`.
- Produces: the endpoints in spec §1.4 plus `GET /quick-code/:code` → `{ kind: 'match' | 'knockout', data }`. Responses nest as `res.body.data.data`.

- [ ] **Step 1: Write the failing test**

```ts
// server/test/quickKnockoutHttp.test.ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import Player from '../src/models/player.model';

let seq = 0;
async function authed(firstName: string) {
    seq += 1;
    const p = await Player.create({ firstName, lastName: 'T', email: `kh${seq}${Date.now()}@kria.test`, phone: '9999999999', status: 'verified', isActive: true });
    return { id: p._id.toString(), token: jwt.sign({ _id: p._id.toString(), type: 'player' }, process.env.JWT_SECRET as string) };
}
const as = (token: string) => ({ Authorization: `Bearer ${token}` });
const body = { format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 }, name: 'Sunday Smash' };

describe('quick knockout HTTP', () => {
    it('creates, joins by code, draws and starts', async () => {
        const host = await authed('Arjun');
        const created = await request(app).post('/quick-knockout').set(as(host.token)).send(body);
        expect(created.status).toBe(200);
        const k = created.body.data.data;
        expect(k.status).toBe('waiting');

        for (const name of ['Rahul', 'Priya']) {
            const p = await authed(name);
            const joined = await request(app).post(`/quick-knockout/join/${k.joinCode}`).set(as(p.token));
            expect(joined.status).toBe(200);
        }
        const drawn = await request(app).post(`/quick-knockout/${k._id}/draw`).set(as(host.token));
        expect(drawn.body.data.data.entrants).toHaveLength(3);
        const started = await request(app).post(`/quick-knockout/${k._id}/start`).set(as(host.token));
        expect(started.body.data.data.status).toBe('live');
    });

    it('rejects a bad format with 422', async () => {
        const host = await authed('Arjun');
        const res = await request(app).post('/quick-knockout').set(as(host.token)).send({ ...body, format: 'triples' });
        expect(res.status).toBe(422);
    });

    it('add player needs exactly one of displayName or playerId', async () => {
        const host = await authed('Arjun');
        const k = (await request(app).post('/quick-knockout').set(as(host.token)).send(body)).body.data.data;
        const res = await request(app).post(`/quick-knockout/${k._id}/players`).set(as(host.token)).send({});
        expect(res.status).toBe(422);
    });

    it('lists mine', async () => {
        const host = await authed('Arjun');
        await request(app).post('/quick-knockout').set(as(host.token)).send(body);
        const res = await request(app).get('/quick-knockout/mine').set(as(host.token));
        expect(res.body.data.data).toHaveLength(1);
    });

    it('/quick-code resolves a knockout, a match, and 404s the rest', async () => {
        const host = await authed('Arjun');
        const k = (await request(app).post('/quick-knockout').set(as(host.token)).send(body)).body.data.data;
        const m = (await request(app).post('/quick-match').set(as(host.token)).send({
            sport: 'badminton',
            sides: [{ name: 'A', slots: [{ playerId: host.id, displayName: 'A' }] }, { name: 'B', slots: [{ displayName: 'B' }] }],
        })).body.data.data;

        const knockout = await request(app).get(`/quick-code/${k.joinCode}`).set(as(host.token));
        expect(knockout.body.data.data.kind).toBe('knockout');
        const match = await request(app).get(`/quick-code/${m.joinCode}`).set(as(host.token));
        expect(match.body.data.data.kind).toBe('match');
        const none = await request(app).get('/quick-code/ZZZZZZ').set(as(host.token));
        expect(none.status).toBe(404);
    });

    it('awards validate the badge at the edge', async () => {
        const host = await authed('Arjun');
        const k = (await request(app).post('/quick-knockout').set(as(host.token)).send(body)).body.data.data;
        const res = await request(app).post(`/quick-knockout/${k._id}/awards`).set(as(host.token))
            .send({ playerId: host.id, badge: 'season-mvp' });
        expect(res.status).toBe(422);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutHttp.test.ts`
Expected: FAIL — 404s on `/quick-knockout`.

- [ ] **Step 3: Validators**

```ts
// server/src/middlewares/validators/quickKnockout.validator.ts
import { body, param } from 'express-validator';
import { validateRequest } from './index';
import { QUICK_AWARD_BADGES } from '../../services/quickKnockout.service';

const id = param('id').isMongoId().withMessage('id must be a valid id.');
const joinCode = param('joinCode').isString().trim().isLength({ min: 6, max: 6 }).withMessage('joinCode must be 6 characters.');

export const createKnockoutValidator = [
    body('format').isIn(['singles', 'doubles']).withMessage('format must be singles or doubles.'),
    body('matchConfig.bestOf').isIn([1, 3, 5]).withMessage('bestOf must be 1, 3 or 5.'),
    body('matchConfig.pointsToWin').isIn([11, 15, 21]).withMessage('pointsToWin must be 11, 15 or 21.'),
    body('name').optional().isString().trim().isLength({ min: 1, max: 40 }).withMessage('name must be 1-40 characters.'),
    ...validateRequest,
];

export const knockoutIdValidator = [id, ...validateRequest];
export const knockoutCodeValidator = [joinCode, ...validateRequest];
export const quickCodeValidator = [
    param('code').isString().trim().isLength({ min: 6, max: 6 }).withMessage('code must be 6 characters.'),
    ...validateRequest,
];

export const claimKnockoutValidator = [
    joinCode,
    body('playerKey').isString().trim().notEmpty().withMessage('playerKey is required.'),
    ...validateRequest,
];

export const addKnockoutPlayerValidator = [
    id,
    body('displayName').optional().isString().trim().isLength({ min: 1, max: 40 }).withMessage('displayName must be 1-40 characters.'),
    body('playerId').optional().isMongoId().withMessage('playerId must be a valid id.'),
    body().custom((b: { displayName?: unknown; playerId?: unknown }) => Boolean(b.displayName) !== Boolean(b.playerId))
        .withMessage('Send a displayName or a playerId.'),
    ...validateRequest,
];

export const removeKnockoutPlayerValidator = [
    id,
    param('playerKey').isString().trim().notEmpty().withMessage('playerKey is required.'),
    ...validateRequest,
];

export const pairKnockoutValidator = [
    id,
    body('playerKeys').isArray({ min: 2, max: 2 }).withMessage('playerKeys must name two players.'),
    body('playerKeys.*').isString().trim().notEmpty().withMessage('playerKeys must be ids.'),
    ...validateRequest,
];

export const unpairKnockoutValidator = [
    id,
    param('pairId').isString().trim().notEmpty().withMessage('pairId is required.'),
    ...validateRequest,
];

export const knockoutAwardValidator = [
    id,
    body('playerId').isMongoId().withMessage('playerId must be a valid id.'),
    body('badge').isIn(Object.keys(QUICK_AWARD_BADGES)).withMessage('Pick one of the knockout badges.'),
    ...validateRequest,
];
```

- [ ] **Step 4: Resolver, controller, routes, mount**

Add to the service class:

```ts
    /** One code box on the Join screen: which kind of thing does this code open? */
    async resolveCode(code: string): Promise<SuccessResponse<{ kind: 'match' | 'knockout'; data: unknown }>> {
        const knockout = await quickKnockoutRepository.getByJoinCode(code);
        if (knockout) return new SuccessResponse('Code resolved.', { kind: 'knockout', data: knockout });
        const match = await quickMatchService.getByJoinCode(code).then((r) => r.data).catch(() => null);
        if (match) return new SuccessResponse('Code resolved.', { kind: 'match', data: match });
        throw new NotFoundError('No match or knockout has that code.');
    }
```

```ts
// server/src/controllers/quickKnockout.controller.ts
import { Request, Response, NextFunction } from 'express';
import { quickKnockoutService } from '../services/quickKnockout.service';

export const createKnockout = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.create(req.player._id, req.body));
};
export const listMyKnockouts = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.listMine(req.player._id));
};
export const getKnockout = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.getById(req.params.id, req.player._id));
};
export const joinKnockout = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.join(req.params.joinCode, req.player._id));
};
export const claimKnockoutGuest = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.claim(req.params.joinCode, req.player._id, req.body.playerKey));
};
export const addKnockoutPlayer = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.addPlayer(req.params.id, req.player._id, { displayName: req.body.displayName, playerId: req.body.playerId }));
};
export const removeKnockoutPlayer = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.removePlayer(req.params.id, req.player._id, req.params.playerKey));
};
export const pairKnockoutPlayers = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.pair(req.params.id, req.player._id, req.body.playerKeys));
};
export const unpairKnockoutPlayers = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.unpair(req.params.id, req.player._id, req.params.pairId));
};
export const drawKnockout = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.draw(req.params.id, req.player._id));
};
export const startKnockout = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.start(req.params.id, req.player._id));
};
export const cancelKnockout = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.cancel(req.params.id, req.player._id));
};
export const grantKnockoutAward = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.grantAward(req.params.id, req.player._id, { playerId: req.body.playerId, badge: req.body.badge }));
};
export const resolveQuickCode = async (req: Request, res: Response, next: NextFunction) => {
    next(await quickKnockoutService.resolveCode(req.params.code));
};
```

```ts
// server/src/routes/quickKnockout.route.ts
import { Router } from 'express';
import * as c from '../controllers/quickKnockout.controller';
import { isPlayerLoggedIn } from '../middlewares/isPlayerLoggedIn.middleware';
import { asyncHandler } from '../utils/asynchandler';
import * as v from '../middlewares/validators/quickKnockout.validator';

const quickKnockoutRouter = Router();

// isPlayerLoggedIn attached bare, as in quickMatch.route.ts. Literal routes
// sit above '/:id' so they are never shadowed by it.
quickKnockoutRouter.post('/', v.createKnockoutValidator, isPlayerLoggedIn, asyncHandler(c.createKnockout));
quickKnockoutRouter.get('/mine', isPlayerLoggedIn, asyncHandler(c.listMyKnockouts));
quickKnockoutRouter.post('/join/:joinCode', v.knockoutCodeValidator, isPlayerLoggedIn, asyncHandler(c.joinKnockout));
quickKnockoutRouter.post('/join/:joinCode/claim', v.claimKnockoutValidator, isPlayerLoggedIn, asyncHandler(c.claimKnockoutGuest));
quickKnockoutRouter.get('/:id', v.knockoutIdValidator, isPlayerLoggedIn, asyncHandler(c.getKnockout));
quickKnockoutRouter.post('/:id/players', v.addKnockoutPlayerValidator, isPlayerLoggedIn, asyncHandler(c.addKnockoutPlayer));
quickKnockoutRouter.delete('/:id/players/:playerKey', v.removeKnockoutPlayerValidator, isPlayerLoggedIn, asyncHandler(c.removeKnockoutPlayer));
quickKnockoutRouter.post('/:id/pairs', v.pairKnockoutValidator, isPlayerLoggedIn, asyncHandler(c.pairKnockoutPlayers));
quickKnockoutRouter.delete('/:id/pairs/:pairId', v.unpairKnockoutValidator, isPlayerLoggedIn, asyncHandler(c.unpairKnockoutPlayers));
quickKnockoutRouter.post('/:id/draw', v.knockoutIdValidator, isPlayerLoggedIn, asyncHandler(c.drawKnockout));
quickKnockoutRouter.post('/:id/start', v.knockoutIdValidator, isPlayerLoggedIn, asyncHandler(c.startKnockout));
quickKnockoutRouter.post('/:id/cancel', v.knockoutIdValidator, isPlayerLoggedIn, asyncHandler(c.cancelKnockout));
quickKnockoutRouter.post('/:id/awards', v.knockoutAwardValidator, isPlayerLoggedIn, asyncHandler(c.grantKnockoutAward));

export const quickCodeRouter = Router();
quickCodeRouter.get('/:code', v.quickCodeValidator, isPlayerLoggedIn, asyncHandler(c.resolveQuickCode));

export default quickKnockoutRouter;
```

In `server/src/routes/v1.route.ts` add the import next to `quickMatchRouter`:

```ts
import quickKnockoutRouter, { quickCodeRouter } from './quickKnockout.route';
```

and directly after `v1Router.use('/quick-match', quickMatchRouter);`:

```ts
v1Router.use('/quick-knockout', quickKnockoutRouter);
v1Router.use('/quick-code', quickCodeRouter);
```

- [ ] **Step 5: Run the test and the whole server gate**

Run: `cd server && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickKnockoutHttp.test.ts`
Expected: PASS.

Run: `cd server && npx tsc --noEmit && npm run lint:fix && npm run build && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run`
Expected: tsc silent, lint exit 0, build exit 0, all test files pass (re-run any single unrelated flaky file alone).

- [ ] **Step 6: Commit**

```bash
cd server && git add src/middlewares/validators/quickKnockout.validator.ts src/controllers/quickKnockout.controller.ts src/routes/quickKnockout.route.ts src/routes/v1.route.ts src/services/quickKnockout.service.ts test/quickKnockoutHttp.test.ts
git commit -m "feat quick knockout HTTP endpoints and join code resolver"
```

---

# Part 2 — Mobile (`D:\kria\mobile`)

### Task 9: API client, view helpers, badge

**Files:**
- Create: `mobile/src/api/quickKnockout.ts`
- Create: `mobile/src/lib/quickKnockoutView.ts`
- Modify: `mobile/src/api/quickMatch.ts` (`QuickMatch.knockoutId?`, `QuickMatch.fixtureId?`)
- Modify: `mobile/src/lib/badges.ts` (`knockout-winner`)
- Test: `mobile/__tests__/quickKnockoutApi.test.ts`, `mobile/__tests__/quickKnockoutView.test.ts`

**Interfaces:**
- Produces (types): `QuickKnockout`, `KnockoutPlayer`, `KnockoutPair`, `KnockoutEntrant`, `KnockoutFixture`, `KnockoutAward`, `QuickCode`.
- Produces (calls): `createQuickKnockout(body)`, `getQuickKnockout(id)`, `listMyQuickKnockouts()`, `joinQuickKnockout(code)`, `claimKnockoutGuest(code, playerKey)`, `addKnockoutPlayer(id, body)`, `removeKnockoutPlayer(id, playerKey)`, `pairKnockoutPlayers(id, playerKeys)`, `unpairKnockoutPlayers(id, pairId)`, `drawQuickKnockout(id)`, `startQuickKnockout(id)`, `cancelQuickKnockout(id)`, `grantKnockoutAward(id, body)`, `resolveQuickCode(code)` — all `Promise<QuickKnockout>` except list (`QuickKnockout[]`) and resolver (`QuickCode`).
- Produces (view): `entrantName(k, entrantId?)`, `entrantShortName(k, entrantId?)`, `isKnockoutHost(k, playerId?)`, `drawBlocker(k): string | null`, `unpairedPlayers(k)`, `bracketColumns(k)`, `isPlayable(f)`, `championName(k)`, `QUICK_AWARD_BADGES`, `awardablePlayers(k, hostId)`.

- [ ] **Step 1: Write the failing tests**

```ts
// mobile/__tests__/quickKnockoutApi.test.ts
import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { createQuickKnockout, joinQuickKnockout, resolveQuickCode, addKnockoutPlayer } from '@/api/quickKnockout';

const mock = new MockAdapter(API);
const envelope = (payload: unknown) => ({ data: { data: payload } });
afterEach(() => mock.reset());

it('creates a knockout', async () => {
  mock.onPost('/quick-knockout').reply(200, envelope({ _id: 'k1', name: 'Cup' }));
  const k = await createQuickKnockout({ format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 }, name: 'Cup' });
  expect(k._id).toBe('k1');
  expect(JSON.parse(mock.history.post[0].data)).toEqual({ format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 }, name: 'Cup' });
});

it('joins by code, uppercased', async () => {
  mock.onPost('/quick-knockout/join/KX4P9M').reply(200, envelope({ _id: 'k1' }));
  await joinQuickKnockout('kx4p9m');
  expect(mock.history.post[0].url).toBe('/quick-knockout/join/KX4P9M');
});

it('adds a guest or a Kria player', async () => {
  mock.onPost('/quick-knockout/k1/players').reply(200, envelope({ _id: 'k1' }));
  await addKnockoutPlayer('k1', { displayName: 'Sam' });
  await addKnockoutPlayer('k1', { playerId: 'p9' });
  expect(mock.history.post.map((r) => JSON.parse(r.data))).toEqual([{ displayName: 'Sam' }, { playerId: 'p9' }]);
});

it('resolves a code to its kind', async () => {
  mock.onGet('/quick-code/KX4P9M').reply(200, envelope({ kind: 'knockout', data: { _id: 'k1' } }));
  expect(await resolveQuickCode('kx4p9m')).toEqual({ kind: 'knockout', data: { _id: 'k1' } });
});
```

```ts
// mobile/__tests__/quickKnockoutView.test.ts
import {
  bracketColumns, championName, drawBlocker, entrantName, entrantShortName, isPlayable, unpairedPlayers, awardablePlayers,
} from '@/lib/quickKnockoutView';
import type { QuickKnockout } from '@/api/quickKnockout';

const k = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k1', hostId: 'h1', name: 'Sunday Smash', sport: 'badminton', format: 'doubles',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, status: 'waiting',
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta' },
    { playerKey: 'b', playerId: 'p2', displayName: 'Priya Rao' },
    { playerKey: 'c', displayName: 'Sam' },
  ],
  pairs: [{ pairId: 'x', playerKeys: ['a', 'b'], byHost: true }],
  entrants: [{ entrantId: 'e1', playerKeys: ['a', 'b'] }, { entrantId: 'e2', playerKeys: ['c'] }],
  fixtures: [
    { fixtureId: 'f2', round: 2, position: 0, bye: false },
    { fixtureId: 'f1', round: 1, position: 0, entrantA: 'e1', entrantB: 'e2', bye: false, quickMatchId: 'm1' },
  ],
  roundNames: ['Semi-Final', 'Final'],
  awards: [],
  createdAt: '2026-10-07T00:00:00.000Z',
  ...over,
});

it('names entrants: full name alone, first names for pairs', () => {
  expect(entrantName(k(), 'e1')).toBe('Arjun & Priya');
  expect(entrantName(k(), 'e2')).toBe('Sam');
  expect(entrantName(k(), undefined)).toBe('');
  expect(entrantShortName(k({ format: 'singles', entrants: [{ entrantId: 'e3', playerKeys: ['a'] }] }), 'e3')).toBe('Arjun');
});

it('explains why Draw is blocked', () => {
  expect(drawBlocker(k())).toBe('Add one more player or remove one to draw.');
  expect(drawBlocker(k({ format: 'singles' }))).toBe(null);
  expect(drawBlocker(k({ format: 'singles', players: k().players.slice(0, 2) }))).toBe('A knockout needs at least 3 entrants.');
  const four = [...k().players, { playerKey: 'd', displayName: 'Dev' }];
  expect(drawBlocker(k({ players: four }))).toBe('A knockout needs at least 3 entrants.');
});

it('lists players not in a host pair', () => {
  expect(unpairedPlayers(k()).map((p) => p.playerKey)).toEqual(['c']);
});

it('lays the bracket out by round with names', () => {
  const cols = bracketColumns(k());
  expect(cols.map((c) => c.name)).toEqual(['Semi-Final', 'Final']);
  expect(cols[0].fixtures.map((f) => f.fixtureId)).toEqual(['f1']);
});

it('marks a fixture with a match and no winner as playable', () => {
  const [f2, f1] = k().fixtures;
  expect(isPlayable(f1)).toBe(true);
  expect(isPlayable(f2)).toBe(false);
  expect(isPlayable({ ...f1, winnerEntrantId: 'e1' })).toBe(false);
});

it('names the champion', () => {
  expect(championName(k({ championEntrantId: 'e1' }))).toBe('Arjun & Priya');
  expect(championName(k())).toBe('');
});

it('offers awards to Kria players other than the host', () => {
  expect(awardablePlayers(k(), 'h1').map((p) => p.playerId)).toEqual(['p2']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/quickKnockoutApi.test.ts __tests__/quickKnockoutView.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the API client**

```ts
// mobile/src/api/quickKnockout.ts
import API from './axios';
import { unwrap } from './unwrap';
import type { QuickMatch } from './quickMatch';

export interface KnockoutPlayer { playerKey: string; playerId?: string; displayName: string }
export interface KnockoutPair { pairId: string; playerKeys: [string, string]; byHost: boolean }
export interface KnockoutEntrant { entrantId: string; playerKeys: string[] }
export interface KnockoutFixture {
  fixtureId: string;
  round: number;
  position: number;
  entrantA?: string;
  entrantB?: string;
  bye: boolean;
  quickMatchId?: string;
  winnerEntrantId?: string;
}
export interface KnockoutAward { playerId: string; badge: string; title: string }

export interface QuickKnockout {
  _id: string;
  hostId: string;
  /** Withheld by the server from anyone not in the knockout. */
  joinCode?: string;
  name: string;
  sport: 'badminton';
  format: 'singles' | 'doubles';
  matchConfig: { bestOf: 1 | 3 | 5; pointsToWin: 11 | 15 | 21 };
  status: 'waiting' | 'live' | 'completed' | 'cancelled';
  players: KnockoutPlayer[];
  pairs: KnockoutPair[];
  entrants: KnockoutEntrant[];
  fixtures: KnockoutFixture[];
  roundNames: string[];
  championEntrantId?: string;
  awardsEligible?: boolean;
  awards: KnockoutAward[];
  createdAt: string;
}

export type QuickCode = { kind: 'match'; data: QuickMatch } | { kind: 'knockout'; data: QuickKnockout };

export interface CreateKnockoutBody {
  format: 'singles' | 'doubles';
  matchConfig: { bestOf: 1 | 3 | 5; pointsToWin: 11 | 15 | 21 };
  name?: string;
}

const asKnockout = (res: unknown) => unwrap(res) as QuickKnockout;

export async function createQuickKnockout(body: CreateKnockoutBody): Promise<QuickKnockout> {
  return asKnockout(await API.post('/quick-knockout', body));
}
export async function getQuickKnockout(id: string): Promise<QuickKnockout> {
  return asKnockout(await API.get(`/quick-knockout/${id}`));
}
export async function listMyQuickKnockouts(): Promise<QuickKnockout[]> {
  return (unwrap(await API.get('/quick-knockout/mine')) as QuickKnockout[] | null) ?? [];
}
export async function joinQuickKnockout(code: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/join/${code.toUpperCase()}`));
}
export async function claimKnockoutGuest(code: string, playerKey: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/join/${code.toUpperCase()}/claim`, { playerKey }));
}
export async function addKnockoutPlayer(id: string, body: { displayName: string } | { playerId: string }): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/players`, body));
}
export async function removeKnockoutPlayer(id: string, playerKey: string): Promise<QuickKnockout> {
  return asKnockout(await API.delete(`/quick-knockout/${id}/players/${playerKey}`));
}
export async function pairKnockoutPlayers(id: string, playerKeys: [string, string]): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/pairs`, { playerKeys }));
}
export async function unpairKnockoutPlayers(id: string, pairId: string): Promise<QuickKnockout> {
  return asKnockout(await API.delete(`/quick-knockout/${id}/pairs/${pairId}`));
}
export async function drawQuickKnockout(id: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/draw`));
}
export async function startQuickKnockout(id: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/start`));
}
export async function cancelQuickKnockout(id: string): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/cancel`));
}
export async function grantKnockoutAward(id: string, body: { playerId: string; badge: string }): Promise<QuickKnockout> {
  return asKnockout(await API.post(`/quick-knockout/${id}/awards`, body));
}
export async function resolveQuickCode(code: string): Promise<QuickCode> {
  return unwrap(await API.get(`/quick-code/${code.toUpperCase()}`)) as QuickCode;
}
```

- [ ] **Step 4: Implement the view helpers, types and badge**

```ts
// mobile/src/lib/quickKnockoutView.ts
import type { KnockoutFixture, KnockoutPlayer, QuickKnockout } from '@/api/quickKnockout';

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

function playersOf(k: QuickKnockout, entrantId?: string): KnockoutPlayer[] {
  const entrant = k.entrants.find((e) => e.entrantId === entrantId);
  return (entrant?.playerKeys ?? [])
    .map((key) => k.players.find((p) => p.playerKey === key))
    .filter((p): p is KnockoutPlayer => Boolean(p));
}

/** "Arjun Mehta" alone, "Arjun & Priya" as a pair — the name a match side carries. */
export function entrantName(k: QuickKnockout, entrantId?: string): string {
  const players = playersOf(k, entrantId);
  if (players.length === 1) return players[0].displayName;
  return players.map((p) => firstName(p.displayName)).join(' & ');
}

/** First names only, for the narrow bracket boxes. */
export function entrantShortName(k: QuickKnockout, entrantId?: string): string {
  return playersOf(k, entrantId).map((p) => firstName(p.displayName)).join(' & ');
}

export const isKnockoutHost = (k: QuickKnockout, playerId?: string) => Boolean(playerId) && k.hostId === playerId;

/** Mirrors the server's refusals, so Draw can say why it is disabled. */
export function drawBlocker(k: QuickKnockout): string | null {
  if (k.format === 'doubles' && k.players.length % 2 !== 0) return 'Add one more player or remove one to draw.';
  const entrants = k.format === 'doubles' ? k.players.length / 2 : k.players.length;
  if (entrants < 3) return 'A knockout needs at least 3 entrants.';
  return null;
}

export function unpairedPlayers(k: QuickKnockout): KnockoutPlayer[] {
  const paired = new Set(k.pairs.filter((p) => p.byHost).flatMap((p) => p.playerKeys));
  return k.players.filter((p) => !paired.has(p.playerKey));
}

export function bracketColumns(k: QuickKnockout): { name: string; fixtures: KnockoutFixture[] }[] {
  return k.roundNames.map((name, i) => ({
    name,
    fixtures: k.fixtures.filter((f) => f.round === i + 1).sort((a, b) => a.position - b.position),
  }));
}

/** Has a match and no winner yet — what the host scores next. */
export const isPlayable = (f: KnockoutFixture) => Boolean(f.quickMatchId) && !f.winnerEntrantId;

export const championName = (k: QuickKnockout) => (k.championEntrantId ? entrantName(k, k.championEntrantId) : '');

/** Low-tier badges a host may hand out; matches the server's QUICK_AWARD_BADGES. */
export const QUICK_AWARD_BADGES = {
  'iron-player': 'Iron Player',
  'first-cap': 'First Cap',
  'ace-serve': 'Ace Serve',
  'fair-play': 'Fair Play',
} as const;

export const awardablePlayers = (k: QuickKnockout, hostId: string) =>
  k.players.filter((p) => p.playerId && p.playerId !== hostId);
```

In `mobile/src/api/quickMatch.ts` add to `interface QuickMatch`:

```ts
  /** Set when a quick knockout created this match; the knockout manages it. */
  knockoutId?: string;
  fixtureId?: string;
```

In `mobile/src/lib/badges.ts` add to `BADGES` after `'first-cap'`:

```ts
  // Quick knockout champion. Never organizer-selectable (server ORGANIZER_BADGE_KEYS).
  'knockout-winner': { tier: 'steel', emblem: 'trophy' },
```

- [ ] **Step 5: Run tests**

Run: `cd mobile && npx jest __tests__/quickKnockoutApi.test.ts __tests__/quickKnockoutView.test.ts && npx tsc --noEmit`
Expected: PASS, tsc silent.

- [ ] **Step 6: Commit**

```bash
cd mobile && git add src/api/quickKnockout.ts src/lib/quickKnockoutView.ts src/api/quickMatch.ts src/lib/badges.ts __tests__/quickKnockoutApi.test.ts __tests__/quickKnockoutView.test.ts
git commit -m "feat quick knockout api client and view helpers"
```

---

### Task 10: `useQuickKnockout` hook with live updates

**Files:**
- Create: `mobile/src/lib/useQuickKnockout.ts`
- Test: `mobile/__tests__/useQuickKnockout.test.tsx`

**Interfaces:**
- Consumes: API calls from Task 9; `socket` from `@/lib/socket`.
- Produces: `useQuickKnockout(id?: string)` → `{ knockout, loading, error, busy, problem, reload, addGuest(name), addPlayer(playerId), removePlayer(key), pair(a, b), unpair(pairId), draw(), start(), cancel(), award(playerId, badge) }`. `problem` is the last server message from a refused action ('' when none).

- [ ] **Step 1: Write the failing test**

```tsx
// mobile/__tests__/useQuickKnockout.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { socket } from '@/lib/socket';
import { useQuickKnockout } from '@/lib/useQuickKnockout';

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/lib/socket', () => {
  const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
  return {
    socket: {
      connected: true, connect: jest.fn(), disconnect: jest.fn(), emit: jest.fn(),
      on: jest.fn((e: string, fn: (...a: unknown[]) => void) => { (handlers[e] ||= []).push(fn); }),
      off: jest.fn((e: string, fn: (...a: unknown[]) => void) => { handlers[e] = (handlers[e] || []).filter((h) => h !== fn); }),
      __emit: (e: string, payload?: unknown) => (handlers[e] || []).forEach((h) => h(payload)),
    },
  };
});
const server = socket as unknown as { __emit: (e: string, p?: unknown) => void; emit: jest.Mock };

const mock = new MockAdapter(API);
const envelope = (payload: unknown) => ({ data: { data: payload } });
const knockout = (over: Record<string, unknown> = {}) => ({
  _id: 'k1', hostId: 'h1', joinCode: 'KX4P9M', name: 'Cup', sport: 'badminton', format: 'singles',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, status: 'waiting',
  players: [{ playerKey: 'a', playerId: 'h1', displayName: 'Arjun' }], pairs: [], entrants: [], fixtures: [], roundNames: [],
  awards: [], createdAt: '2026-10-07T00:00:00.000Z', ...over,
});

beforeEach(() => jest.clearAllMocks());
afterEach(() => mock.reset());

async function opened() {
  mock.onGet('/quick-knockout/k1').reply(200, envelope(knockout()));
  const hook = renderHook(() => useQuickKnockout('k1'));
  await waitFor(() => expect(hook.result.current.knockout).not.toBeNull());
  return hook;
}

it('joins the room and shows a pushed change, keeping the host’s code', async () => {
  const { result } = await opened();
  expect(server.emit).toHaveBeenCalledWith('join:match', { matchId: 'k1' });
  const { joinCode: _x, ...pushed } = knockout({ players: [{ playerKey: 'a', playerId: 'h1', displayName: 'Arjun' }, { playerKey: 'b', displayName: 'Sam' }] });

  act(() => server.__emit('knockout:update', { knockout: pushed }));

  expect(result.current.knockout?.players).toHaveLength(2);
  expect(result.current.knockout?.joinCode).toBe('KX4P9M');
});

it('ignores a push for another knockout', async () => {
  const { result } = await opened();
  act(() => server.__emit('knockout:update', { knockout: knockout({ _id: 'other', status: 'live' }) }));
  expect(result.current.knockout?.status).toBe('waiting');
});

it('adopts an action’s response and surfaces a refusal', async () => {
  const { result } = await opened();
  mock.onPost('/quick-knockout/k1/draw').reply(400, { message: 'A knockout needs at least 3 entrants.' });
  await act(async () => { await result.current.draw(); });
  expect(result.current.problem).toBe('A knockout needs at least 3 entrants.');

  mock.onPost('/quick-knockout/k1/players').reply(200, envelope(knockout({ players: [{ playerKey: 'a', displayName: 'Arjun' }, { playerKey: 'c', displayName: 'Sam' }] })));
  await act(async () => { await result.current.addGuest('Sam'); });
  expect(result.current.problem).toBe('');
  expect(result.current.knockout?.players).toHaveLength(2);
});

it('leaves the room on close', async () => {
  const { unmount } = await opened();
  unmount();
  expect(server.emit).toHaveBeenCalledWith('leave:match', { matchId: 'k1' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest __tests__/useQuickKnockout.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// mobile/src/lib/useQuickKnockout.ts
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { socket } from '@/lib/socket';
import {
  addKnockoutPlayer, cancelQuickKnockout, drawQuickKnockout, getQuickKnockout, grantKnockoutAward,
  pairKnockoutPlayers, removeKnockoutPlayer, startQuickKnockout, unpairKnockoutPlayers, type QuickKnockout,
} from '@/api/quickKnockout';

const serverMessage = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Something went wrong. Please try again.';

/**
 * One quick knockout plus the host's actions, live. Same shape as
 * useQuickMatch: each action adopts the knockout its endpoint returns, and the
 * server pushes every save as `knockout:update` (QuickKnockoutService.persist).
 */
export function useQuickKnockout(id?: string) {
  const [knockout, setKnockout] = useState<QuickKnockout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      setKnockout(await getQuickKnockout(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!id) return;
    const onUpdate = (payload?: { knockout?: QuickKnockout }) => {
      const next = payload?.knockout;
      if (!next || next._id !== id) return;
      // The push never carries the code; keep the one our own read returned.
      setKnockout((prev) => ({ ...next, joinCode: prev?.joinCode ?? next.joinCode }));
    };
    const join = () => socket.emit('join:match', { matchId: id });
    const onConnect = () => { join(); load(); };

    if (!socket.connected) socket.connect();
    join();
    socket.on('knockout:update', onUpdate);
    socket.on('connect', onConnect);
    return () => {
      socket.emit('leave:match', { matchId: id });
      socket.off('knockout:update', onUpdate);
      socket.off('connect', onConnect);
      socket.disconnect();
    };
  }, [id, load]);

  const run = useCallback(async (action: () => Promise<QuickKnockout>) => {
    setBusy(true);
    setProblem('');
    try {
      const next = await action();
      setKnockout((prev) => ({ ...next, joinCode: next.joinCode ?? prev?.joinCode }));
    } catch (err) {
      setProblem(serverMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const withId = useCallback(
    (fn: (knockoutId: string) => Promise<QuickKnockout>) => (id ? run(() => fn(id)) : Promise.resolve()),
    [id, run],
  );

  return {
    knockout, loading, error, busy, problem, reload: load,
    addGuest: (displayName: string) => withId((k) => addKnockoutPlayer(k, { displayName })),
    addPlayer: (playerId: string) => withId((k) => addKnockoutPlayer(k, { playerId })),
    removePlayer: (playerKey: string) => withId((k) => removeKnockoutPlayer(k, playerKey)),
    pair: (a: string, b: string) => withId((k) => pairKnockoutPlayers(k, [a, b])),
    unpair: (pairId: string) => withId((k) => unpairKnockoutPlayers(k, pairId)),
    draw: () => withId(drawQuickKnockout),
    start: () => withId(startQuickKnockout),
    cancel: () => withId(cancelQuickKnockout),
    award: (playerId: string, badge: string) => withId((k) => grantKnockoutAward(k, { playerId, badge })),
  };
}
```

- [ ] **Step 4: Run test**

Run: `cd mobile && npx jest __tests__/useQuickKnockout.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/lib/useQuickKnockout.ts __tests__/useQuickKnockout.test.tsx
git commit -m "feat useQuickKnockout hook with live updates"
```

---

### Task 11: Host chooser, knockout wizard, entry points, routes

**Files:**
- Modify: `mobile/src/components/quick/HostSteps.tsx` (export `ChoiceCard`, `Segmented`, `PersonRow`)
- Create: `mobile/src/app/quick/host.tsx`
- Create: `mobile/src/app/knockout/new.tsx`
- Modify: `mobile/src/app/_layout.tsx` (register `quick/host`, `knockout/new`, `knockout/[id]`)
- Modify: `mobile/src/components/navigation/FloatingTabBar.tsx` (Host → `/quick/host`), `mobile/__tests__/FloatingTabBar.test.tsx`
- Modify: `mobile/src/components/home/PlayPortal.tsx` (Host → `/quick/host`)
- Modify: `mobile/test-utils/colourLiterals.ts` (`MIGRATED` += `src/app/quick/host.tsx`, `src/app/knockout/new.tsx`)
- Test: `mobile/__tests__/HostChooser.test.tsx`, `mobile/__tests__/NewKnockoutScreen.test.tsx`

**Interfaces:**
- Consumes: `createQuickKnockout` (Task 9); `ChoiceCard`, `Segmented` from HostSteps.
- Produces: routes `/quick/host` and `/knockout/new`; after create, `router.replace({ pathname: '/knockout/[id]', params: { id } })`.

- [ ] **Step 1: Write the failing tests**

```tsx
// mobile/__tests__/HostChooser.test.tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import HostChooser from '../src/app/quick/host';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));

it('offers a quick match or a knockout', () => {
  render(<HostChooser />);
  fireEvent.press(screen.getByText('Quick match'));
  expect(router.push).toHaveBeenCalledWith('/quick/new');
  fireEvent.press(screen.getByText('Knockout'));
  expect(router.push).toHaveBeenCalledWith('/knockout/new');
});
```

```tsx
// mobile/__tests__/NewKnockoutScreen.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import NewKnockoutScreen from '../src/app/knockout/new';
import { createQuickKnockout } from '@/api/quickKnockout';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'h1', firstName: 'Arjun', lastName: 'Mehta' } } }),
}));
jest.mock('@/api/quickKnockout', () => ({ createQuickKnockout: jest.fn(async () => ({ _id: 'k9' })) }));

it('walks format → name → review and creates the knockout', async () => {
  render(<NewKnockoutScreen />);
  expect(screen.getByText('Set the format')).toBeTruthy();
  fireEvent.press(screen.getByText('Doubles'));
  fireEvent.press(screen.getByText('Continue'));

  expect(screen.getByText('Name it')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText("Arjun's Knockout"), 'Sunday Smash');
  fireEvent.press(screen.getByText('Continue'));

  expect(screen.getByText('Ready to go?')).toBeTruthy();
  fireEvent.press(screen.getByText('Create knockout'));

  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k9' } }));
  expect(createQuickKnockout).toHaveBeenCalledWith({
    format: 'doubles', matchConfig: { bestOf: 1, pointsToWin: 21 }, name: 'Sunday Smash',
  });
});

it('leaves the name out when the host keeps the default', async () => {
  render(<NewKnockoutScreen />);
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('Create knockout'));
  await waitFor(() => expect(createQuickKnockout).toHaveBeenCalled());
  expect((createQuickKnockout as jest.Mock).mock.calls.at(-1)[0]).not.toHaveProperty('name');
});
```

In `mobile/__tests__/FloatingTabBar.test.tsx` change the Host test's expectation and title:

```tsx
  it('pushes the host chooser from Host', () => {
    // …unchanged setup…
    expect(mockPush).toHaveBeenCalledWith('/quick/host');
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/HostChooser.test.tsx __tests__/NewKnockoutScreen.test.tsx __tests__/FloatingTabBar.test.tsx`
Expected: FAIL — modules not found; FloatingTabBar still pushes `/quick/new`.

- [ ] **Step 3: Export the shared wizard parts**

In `mobile/src/components/quick/HostSteps.tsx` change `function ChoiceCard(` → `export function ChoiceCard(`, `function Segmented<` → `export function Segmented<`, `function PersonRow(` → `export function PersonRow(`.

- [ ] **Step 4: The chooser**

```tsx
// mobile/src/app/quick/host.tsx
import { ScrollView, Text, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { ChoiceCard } from '@/components/quick/HostSteps';
import { useTheme } from '@/lib/theme';
import { goBack } from '@/lib/nav';

/** What the Host button opens: one quick match, or a knockout for a group. */
export default function HostChooser() {
  const t = useTheme();
  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goBack(router, '/quick')} hitSlop={8} style={{ width: 44, height: 44, justifyContent: 'center' }}>
          <Icon name="arrow-left" size={22} color={t.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: t.brandInk }}>Host</Text>
        <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 32, lineHeight: 39, textTransform: 'uppercase', color: t.text }}>
          What are you hosting?
        </Text>
        <ChoiceCard icon="shuttlecock" title="Quick match" hint="One match: singles, doubles or cricket." selected={false} onPress={() => router.push('/quick/new')} />
        <ChoiceCard icon="bracket" title="Knockout" hint="A badminton knockout for 3 to 16 entrants." selected={false} onPress={() => router.push('/knockout/new')} />
      </ScrollView>
    </Screen>
  );
}
```

- [ ] **Step 5: The knockout wizard**

```tsx
// mobile/src/app/knockout/new.tsx
import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Segmented } from '@/components/quick/HostSteps';
import { createQuickKnockout, type CreateKnockoutBody } from '@/api/quickKnockout';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/lib/theme';
import { goBack } from '@/lib/nav';
import { BEST_OF, POINTS } from '@/lib/quickHostWizard';

const STEPS = ['format', 'name', 'review'] as const;
const COPY: Record<(typeof STEPS)[number], { title: string; sub: string }> = {
  format: { title: 'Set the format', sub: 'Every match in the knockout uses it.' },
  name: { title: 'Name it', sub: 'Optional. The winner gets "Won <name>" on their profile.' },
  review: { title: 'Ready to go?', sub: 'Next, you get a code to share. Players join themselves.' },
};

export default function NewKnockoutScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector((s) => s.auth);
  const defaultName = `${user?.firstName ?? 'My'}'s Knockout`;

  const [index, setIndex] = useState(0);
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles');
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(1);
  const [pointsToWin, setPointsToWin] = useState<11 | 15 | 21>(21);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const step = STEPS[index];
  const back = () => (index === 0 ? goBack(router, '/quick') : setIndex(index - 1));

  const create = async () => {
    setBusy(true);
    setProblem('');
    const body: CreateKnockoutBody = { format, matchConfig: { bestOf, pointsToWin } };
    if (name.trim()) body.name = name.trim();
    try {
      const created = await createQuickKnockout(body);
      router.replace({ pathname: '/knockout/[id]', params: { id: created._id } });
    } catch (err) {
      setProblem((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not create the knockout. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const label = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={8} style={{ width: 44, height: 44, justifyContent: 'center' }}>
              <Icon name="arrow-left" size={22} color={t.text} />
            </Pressable>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.14 * 11, color: t.textMeta }}>{`0${index + 1} / 03`}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
            {STEPS.map((s, n) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 1, backgroundColor: n <= index ? t.brand : t.fill }} />)}
          </View>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 32 }}>
          <Text style={{ ...label, color: t.brandInk }}>New knockout</Text>
          <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 32, lineHeight: 39, textTransform: 'uppercase', color: t.text, marginTop: 6 }}>{COPY[step].title}</Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: t.textMeta, marginTop: 4, marginBottom: 24 }}>{COPY[step].sub}</Text>

          {step === 'format' ? (
            <>
              <Segmented title="Format" options={[{ value: 'singles' as const, label: 'Singles', sub: '1 v 1' }, { value: 'doubles' as const, label: 'Doubles', sub: '2 v 2' }]} value={format} onChange={setFormat} />
              <Segmented title="Match length" options={([1, 3, 5] as const).map((n) => ({ value: n, label: BEST_OF[n].label }))} value={bestOf} onChange={setBestOf} hint={BEST_OF[bestOf].hint} />
              <Segmented title="Points per game" options={([11, 15, 21] as const).map((n) => ({ value: n, label: String(n), sub: POINTS[n] }))} value={pointsToWin} onChange={setPointsToWin} />
            </>
          ) : null}

          {step === 'name' ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={defaultName}
              placeholderTextColor={t.textFaint}
              maxLength={40}
              style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 15, color: t.text, borderWidth: 1.5, borderColor: t.line, borderRadius: 5, backgroundColor: t.fillSoft, paddingHorizontal: 12, minHeight: 48 }}
            />
          ) : null}

          {step === 'review' ? (
            <View style={{ borderRadius: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface, padding: 18 }}>
              <Text style={{ ...label, color: t.brandInk }}>{`Knockout · ${format}`}</Text>
              <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 28, lineHeight: 34, textTransform: 'uppercase', color: t.text, marginTop: 8 }}>{name.trim() || defaultName}</Text>
              <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: t.textMeta, marginTop: 6 }}>
                {`${BEST_OF[bestOf].label} · ${pointsToWin} points · 3 to 16 entrants`}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 + insets.bottom, borderTopWidth: 1.5, borderTopColor: t.lineSoft, backgroundColor: t.bg }}>
          {problem ? <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: t.failInk, marginBottom: 10 }}>{problem}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={step === 'review' ? create : () => setIndex(index + 1)}
            style={{ minHeight: 52, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
          >
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, letterSpacing: 0.14 * 13, textTransform: 'uppercase', color: t.onBrand }}>
              {step === 'review' ? 'Create knockout' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
```

- [ ] **Step 6: Routes and entry points**

In `mobile/src/app/_layout.tsx`, after `<Stack.Screen name="quick/[id]" />` add:

```tsx
        <Stack.Screen name="quick/host" />
        <Stack.Screen name="knockout/new" />
        <Stack.Screen name="knockout/[id]" />
```

In `mobile/src/components/navigation/FloatingTabBar.tsx` change the Host item to `href: '/quick/host'` (and its comment "it pushes /quick/new" → "it pushes /quick/host"). In `mobile/src/components/home/PlayPortal.tsx` change the Host button's `router.push('/quick/new')` to `router.push('/quick/host')`. Add both new screen files to `MIGRATED` in `mobile/test-utils/colourLiterals.ts`.

- [ ] **Step 7: Run tests**

Run: `cd mobile && npx jest __tests__/HostChooser.test.tsx __tests__/NewKnockoutScreen.test.tsx __tests__/FloatingTabBar.test.tsx __tests__/PlayPortal.test.tsx __tests__/colourLiterals.test.ts __tests__/pressableStyleFence.test.ts && npx tsc --noEmit`
Expected: PASS. (`/knockout/[id]` does not exist yet; tests never navigate for real. If expo-router's typed routes reject the href in tsc, Task 13 creates the file — run tsc again after it.)

- [ ] **Step 8: Commit**

```bash
cd mobile && git add src/components/quick/HostSteps.tsx src/app/quick/host.tsx src/app/knockout/new.tsx src/app/_layout.tsx src/components/navigation/FloatingTabBar.tsx src/components/home/PlayPortal.tsx test-utils/colourLiterals.ts __tests__/HostChooser.test.tsx __tests__/NewKnockoutScreen.test.tsx __tests__/FloatingTabBar.test.tsx
git commit -m "feat host chooser and knockout creation wizard"
```

---

### Task 12: Knockout waiting room

**Files:**
- Create: `mobile/src/components/knockout/KnockoutWaitingRoom.tsx` (exports `KnockoutWaitingRoom`, `KnockoutDrawBar`)
- Modify: `mobile/test-utils/colourLiterals.ts` (`MIGRATED` += this file)
- Test: `mobile/__tests__/KnockoutWaitingRoom.test.tsx`

**Interfaces:**
- Consumes: `QuickKnockout` (Task 9); `isKnockoutHost`, `drawBlocker`, `unpairedPlayers`, `bracketColumns`, `entrantShortName` (Task 9); `PersonRow` (HostSteps); `searchPlayers` from `@/api/playerSearch`; `Tag` from `@/components/StatusPill`.
- Produces:
  - `KnockoutWaitingRoom({ knockout, playerId, busy, onAddGuest, onAddPlayer, onRemove, onPair, onUnpair })`
  - `KnockoutDrawBar({ knockout, busy, onDraw, onStart })` — pinned under the scroll by the screen (Task 13); host only.

- [ ] **Step 1: Write the failing test**

```tsx
// mobile/__tests__/KnockoutWaitingRoom.test.tsx
import { Share } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { KnockoutDrawBar, KnockoutWaitingRoom } from '@/components/knockout/KnockoutWaitingRoom';
import type { QuickKnockout } from '@/api/quickKnockout';

jest.mock('@/api/playerSearch', () => ({ searchPlayers: jest.fn(async () => [{ _id: 'p7', firstName: 'Dev', lastName: 'K' }]) }));

const knockout = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k1', hostId: 'h1', joinCode: 'KX4P9M', name: 'Sunday Smash', sport: 'badminton', format: 'doubles',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, status: 'waiting',
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta' },
    { playerKey: 'b', playerId: 'p2', displayName: 'Priya Rao' },
    { playerKey: 'c', displayName: 'Sam' },
  ],
  pairs: [], entrants: [], fixtures: [], roundNames: [], awards: [], createdAt: '2026-10-07T00:00:00.000Z',
  ...over,
});
const handlers = () => ({ onAddGuest: jest.fn(), onAddPlayer: jest.fn(), onRemove: jest.fn(), onPair: jest.fn(), onUnpair: jest.fn() });

describe('host', () => {
  it('shows the code, shares it, and lists who is in', () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    render(<KnockoutWaitingRoom knockout={knockout()} playerId="h1" {...handlers()} />);
    expect(screen.getByText('KX4P9M')).toBeTruthy();
    expect(screen.getByText('3 players')).toBeTruthy();
    fireEvent.press(screen.getByText('Share code'));
    expect(share.mock.calls[0][0]).toMatchObject({ message: expect.stringContaining('KX4P9M') });
    share.mockRestore();
  });

  it('pairs two players by tapping them, in doubles', () => {
    const h = handlers();
    render(<KnockoutWaitingRoom knockout={knockout()} playerId="h1" {...h} />);
    fireEvent.press(screen.getByLabelText('Select Priya Rao'));
    fireEvent.press(screen.getByLabelText('Select Sam'));
    expect(h.onPair).toHaveBeenCalledWith('b', 'c');
  });

  it('shows a host pair and can split it', () => {
    const h = handlers();
    render(<KnockoutWaitingRoom knockout={knockout({ pairs: [{ pairId: 'x', playerKeys: ['a', 'b'], byHost: true }] })} playerId="h1" {...h} />);
    fireEvent.press(screen.getByLabelText('Split Arjun Mehta and Priya Rao'));
    expect(h.onUnpair).toHaveBeenCalledWith('x');
  });

  it('adds a guest by name and a Kria player from search', async () => {
    const h = handlers();
    render(<KnockoutWaitingRoom knockout={knockout()} playerId="h1" {...h} />);
    fireEvent.changeText(screen.getByPlaceholderText('Name, or search Kria players'), 'Dev');
    fireEvent.press(screen.getByText('Add as guest'));
    expect(h.onAddGuest).toHaveBeenCalledWith('Dev');

    fireEvent.changeText(screen.getByPlaceholderText('Name, or search Kria players'), 'Dev K');
    fireEvent.press(await screen.findByText('Dev K'));
    expect(h.onAddPlayer).toHaveBeenCalledWith('p7');
  });

  it('removes a player', () => {
    const h = handlers();
    render(<KnockoutWaitingRoom knockout={knockout()} playerId="h1" {...h} />);
    fireEvent.press(screen.getByLabelText('Remove Sam'));
    expect(h.onRemove).toHaveBeenCalledWith('c');
  });
});

describe('joined player', () => {
  it('waits, with no host controls and no code', () => {
    render(<KnockoutWaitingRoom knockout={knockout({ joinCode: undefined })} playerId="p2" {...handlers()} />);
    expect(screen.getByText('Waiting for Arjun Mehta to start')).toBeTruthy();
    expect(screen.queryByText('Share code')).toBeNull();
    expect(screen.queryByLabelText('Remove Sam')).toBeNull();
  });
});

describe('draw bar', () => {
  it('explains why Draw is disabled', () => {
    const onDraw = jest.fn();
    render(<KnockoutDrawBar knockout={knockout()} onDraw={onDraw} onStart={jest.fn()} />);
    expect(screen.getByText('Add one more player or remove one to draw.')).toBeTruthy();
    fireEvent.press(screen.getByText('Draw'));
    expect(onDraw).not.toHaveBeenCalled();
  });

  it('offers Reshuffle and Start once drawn', () => {
    const onDraw = jest.fn();
    const onStart = jest.fn();
    const drawn = knockout({ format: 'singles', entrants: [{ entrantId: 'e1', playerKeys: ['a'] }, { entrantId: 'e2', playerKeys: ['b'] }, { entrantId: 'e3', playerKeys: ['c'] }] });
    render(<KnockoutDrawBar knockout={drawn} onDraw={onDraw} onStart={onStart} />);
    fireEvent.press(screen.getByText('Reshuffle'));
    fireEvent.press(screen.getByText('Start knockout'));
    expect(onDraw).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest __tests__/KnockoutWaitingRoom.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// mobile/src/components/knockout/KnockoutWaitingRoom.tsx
import { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Share, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { searchPlayers, type PlayerHit } from '@/api/playerSearch';
import type { KnockoutPlayer, QuickKnockout } from '@/api/quickKnockout';
import { bracketColumns, drawBlocker, entrantShortName, isKnockoutHost, unpairedPlayers } from '@/lib/quickKnockoutView';

const label = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });
const body = (t: Palette) => ({ fontFamily: 'SpaceGrotesk_400Regular' as const, fontSize: 13, lineHeight: 19, color: t.textMeta });
const button = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase' as const };

function PlayerLine({ player, viewerId, tone, onPress, onRemove, a11y }: {
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

/** Type a guest's name, or 3+ letters to find a Kria player. */
function AddPlayer({ onAddGuest, onAddPlayer, excludeIds }: { onAddGuest: (name: string) => void; onAddPlayer: (id: string) => void; excludeIds: string[] }) {
  const t = useTheme();
  const [text, setText] = useState('');
  const [hits, setHits] = useState<PlayerHit[]>([]);
  const latest = useRef('');

  const type = async (next: string) => {
    setText(next);
    const q = next.trim();
    latest.current = q;
    if (q.length < 3) { setHits([]); return; }
    let found: PlayerHit[] = [];
    try { found = await searchPlayers(q); } catch { /* a failed search still allows a guest */ }
    if (latest.current === q) setHits(found.filter((h) => !excludeIds.includes(h._id)).slice(0, 4));
  };
  const reset = () => { setText(''); setHits([]); latest.current = ''; };

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={text}
          onChangeText={type}
          placeholder="Name, or search Kria players"
          placeholderTextColor={t.textFaint}
          maxLength={40}
          style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 15, color: t.text, borderWidth: 1.5, borderColor: t.line, borderRadius: 5, backgroundColor: t.fillSoft, paddingHorizontal: 12, minHeight: 48 }}
        />
        <Pressable accessibilityRole="button" disabled={!text.trim()} onPress={() => { onAddGuest(text.trim()); reset(); }}
          style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1.5, borderColor: t.line, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.4 }}>
          <Text style={{ ...button, fontSize: 10, color: t.textBody }}>Add as guest</Text>
        </Pressable>
      </View>
      {hits.map((hit) => (
        <Pressable key={hit._id} accessibilityRole="button" onPress={() => { onAddPlayer(hit._id); reset(); }}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4, borderBottomWidth: 1.5, borderBottomColor: t.lineSoft }}>
          <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.text }}>{`${hit.firstName} ${hit.lastName}`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function KnockoutWaitingRoom({ knockout: k, playerId, busy, onAddGuest, onAddPlayer, onRemove, onPair, onUnpair }: {
  knockout: QuickKnockout;
  playerId?: string;
  busy?: boolean;
  onAddGuest: (name: string) => void;
  onAddPlayer: (playerId: string) => void;
  onRemove: (playerKey: string) => void;
  onPair: (a: string, b: string) => void;
  onUnpair: (pairId: string) => void;
}) {
  const t = useTheme();
  const host = isKnockoutHost(k, playerId);
  const [selected, setSelected] = useState<string | null>(null);
  const hostName = k.players.find((p) => p.playerId === k.hostId)?.displayName ?? 'the host';
  const byKey = (key: string) => k.players.find((p) => p.playerKey === key)!;
  const doubles = k.format === 'doubles';
  const hostPairs = k.pairs.filter((p) => p.byHost);

  const tapToPair = (key: string) => {
    if (!selected) return setSelected(key);
    if (selected === key) return setSelected(null);
    onPair(selected, key);
    setSelected(null);
  };

  const share = () => {
    Share.share({ message: `Join my knockout "${k.name}" on Kria. Open Kria, tap Join by code and enter ${k.joinCode}.` }).catch(() => undefined);
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Tag label="waiting" variant="open" />
        <Text style={label(t)}>{`Knockout · ${k.format}`}</Text>
      </View>
      <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 28, lineHeight: 34, textTransform: 'uppercase', color: t.text, marginTop: 10 }}>{k.name}</Text>

      {host && k.joinCode ? (
        <View style={{ marginTop: 16, padding: 16, borderRadius: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface }}>
          <Text style={label(t)}>Code</Text>
          <Text selectable style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 34, letterSpacing: 0.2 * 34, color: t.brandInk, marginTop: 4 }}>{k.joinCode}</Text>
          <Pressable accessibilityRole="button" onPress={share} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 12, borderRadius: 5, borderWidth: 1.5, borderColor: t.brand }}>
            <Icon name="share" size={16} color={t.brandInk} />
            <Text style={{ ...button, color: t.brandInk }}>Share code</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: 16, padding: 16, borderRadius: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface }}>
          <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 20, lineHeight: 24, textTransform: 'uppercase', color: t.text }}>{`Waiting for ${hostName} to start`}</Text>
          <Text style={{ ...body(t), marginTop: 6 }}>
            {doubles ? 'Your partner is decided by the host or the draw.' : 'The bracket appears here once the host draws it.'}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
        <Text style={label(t)}>{`${k.players.length} players`}</Text>
        {host && doubles ? <Text style={label(t)}>Tap two players to pair them</Text> : null}
      </View>

      {hostPairs.map((pair) => {
        const [a, b] = pair.playerKeys.map(byKey);
        return (
          <View key={pair.pairId} style={{ marginTop: 8, borderRadius: 6, borderWidth: 1.5, borderColor: t.brand, paddingHorizontal: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
              <Text style={{ ...label(t), color: t.brandInk }}>Pair</Text>
              {host ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Split ${a.displayName} and ${b.displayName}`} onPress={() => onUnpair(pair.pairId)} disabled={busy} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
                  <Text style={{ ...label(t), color: t.textMeta }}>Split</Text>
                </Pressable>
              ) : null}
            </View>
            <PlayerLine player={a} viewerId={playerId} />
            <PlayerLine player={b} viewerId={playerId} />
          </View>
        );
      })}

      {(doubles ? unpairedPlayers(k) : k.players).map((p) => (
        <PlayerLine
          key={p.playerKey}
          player={p}
          viewerId={playerId}
          tone={selected === p.playerKey ? 'selected' : undefined}
          a11y={host && doubles ? `Select ${p.displayName}` : undefined}
          onPress={host && doubles && !busy ? () => tapToPair(p.playerKey) : undefined}
          onRemove={host && !busy ? () => onRemove(p.playerKey) : undefined}
        />
      ))}

      {host ? <AddPlayer onAddGuest={onAddGuest} onAddPlayer={onAddPlayer} excludeIds={k.players.map((p) => p.playerId).filter((x): x is string => Boolean(x))} /> : null}

      {k.entrants.length > 0 ? (
        <View style={{ marginTop: 24 }}>
          <Text style={label(t)}>Draw preview — nothing is played until the host starts</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
            {bracketColumns(k).map((col) => (
              <View key={col.name} style={{ width: 140, gap: 8, justifyContent: 'space-around' }}>
                <Text style={label(t)}>{col.name}</Text>
                {col.fixtures.map((f) => (
                  <View key={f.fixtureId} style={{ borderRadius: 5, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface, padding: 6 }}>
                    <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, color: f.entrantA ? t.text : t.textFaint }}>{entrantShortName(k, f.entrantA) || '—'}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, color: f.entrantB ? t.text : t.textFaint }}>{f.bye ? 'Bye' : entrantShortName(k, f.entrantB) || '—'}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

/** Host only, pinned under the scroll by the screen. */
export function KnockoutDrawBar({ knockout: k, busy, onDraw, onStart }: { knockout: QuickKnockout; busy?: boolean; onDraw: () => void; onStart: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const blocker = drawBlocker(k);
  const drawn = k.entrants.length > 0;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 + insets.bottom, borderTopWidth: 1.5, borderTopColor: t.lineSoft, backgroundColor: t.bg, gap: 8 }}>
      {blocker ? <Text style={{ ...body(t), fontSize: 12, lineHeight: 17 }}>{blocker}</Text> : null}
      {drawn ? (
        <Pressable accessibilityRole="button" onPress={onDraw} disabled={busy} style={{ minHeight: 44, borderRadius: 5, borderWidth: 1.5, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...button, color: t.textBody }}>Reshuffle</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={drawn ? onStart : () => { if (!blocker) onDraw(); }}
        disabled={busy}
        style={{ minHeight: 52, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', opacity: busy || (!drawn && blocker) ? 0.45 : 1 }}
      >
        <Text style={{ ...button, fontSize: 13, color: t.onBrand }}>{drawn ? 'Start knockout' : 'Draw'}</Text>
      </Pressable>
    </View>
  );
}
```

Add `'src/components/knockout/KnockoutWaitingRoom.tsx'` to `MIGRATED`.

- [ ] **Step 4: Run tests**

Run: `cd mobile && npx jest __tests__/KnockoutWaitingRoom.test.tsx __tests__/colourLiterals.test.ts __tests__/pressableStyleFence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/components/knockout/KnockoutWaitingRoom.tsx test-utils/colourLiterals.ts __tests__/KnockoutWaitingRoom.test.tsx
git commit -m "feat knockout waiting room with pairing and draw bar"
```

---

### Task 13: Bracket tree, champion, awards, the knockout screen

**Files:**
- Create: `mobile/src/components/knockout/BracketTree.tsx`
- Create: `mobile/src/components/knockout/KnockoutAwards.tsx`
- Create: `mobile/src/app/knockout/[id].tsx`
- Modify: `mobile/test-utils/colourLiterals.ts` (`MIGRATED` += the three files)
- Test: `mobile/__tests__/BracketTree.test.tsx`, `mobile/__tests__/KnockoutAwards.test.tsx`, `mobile/__tests__/KnockoutScreen.test.tsx`

**Interfaces:**
- Consumes: `useQuickKnockout` (Task 10), `KnockoutWaitingRoom`, `KnockoutDrawBar` (Task 12), view helpers (Task 9), `Badge({ badge?: string; size?: number })` from `@/components/profile/Badge` — it calls `useIsFocused` from `expo-router`, so any test that mocks `expo-router` and renders it must include `useIsFocused: () => true`.
- Produces: `BracketTree({ knockout, onOpenMatch })`, `KnockoutAwards({ knockout, hostId, busy, onAward })`, route `/knockout/[id]`.

- [ ] **Step 1: Write the failing tests**

```tsx
// mobile/__tests__/BracketTree.test.tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { BracketTree } from '@/components/knockout/BracketTree';
import type { QuickKnockout } from '@/api/quickKnockout';

const k: QuickKnockout = {
  _id: 'k1', hostId: 'h1', name: 'Cup', sport: 'badminton', format: 'singles',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, status: 'live',
  players: [
    { playerKey: 'a', displayName: 'Arjun Mehta' }, { playerKey: 'b', displayName: 'Rahul Singh' },
    { playerKey: 'c', displayName: 'Priya Rao' }, { playerKey: 'd', displayName: 'Dev K' },
  ],
  pairs: [],
  entrants: ['a', 'b', 'c', 'd'].map((key) => ({ entrantId: `e${key}`, playerKeys: [key] })),
  fixtures: [
    { fixtureId: 'f1', round: 1, position: 0, entrantA: 'ea', entrantB: 'eb', bye: false, quickMatchId: 'm1', winnerEntrantId: 'ea' },
    { fixtureId: 'f2', round: 1, position: 1, entrantA: 'ec', entrantB: 'ed', bye: false, quickMatchId: 'm2' },
    { fixtureId: 'f3', round: 2, position: 0, entrantA: 'ea', bye: false },
  ],
  roundNames: ['Semi-Final', 'Final'],
  awards: [], createdAt: '2026-10-07T00:00:00.000Z',
};

it('draws one column per round with first names', () => {
  render(<BracketTree knockout={k} onOpenMatch={jest.fn()} />);
  expect(screen.getByText('Semi-Final')).toBeTruthy();
  expect(screen.getByText('Final')).toBeTruthy();
  expect(screen.getAllByText('Arjun')).toHaveLength(2);
});

it('opens a fixture’s match, and only fixtures that have one', () => {
  const open = jest.fn();
  render(<BracketTree knockout={k} onOpenMatch={open} />);
  fireEvent.press(screen.getByLabelText('Open Priya v Dev'));
  expect(open).toHaveBeenCalledWith('m2');
  expect(screen.queryByLabelText(/Open Arjun v/)).toBeTruthy(); // finished matches still open their scoreboard
  expect(screen.queryByLabelText('Open Arjun v —')).toBeNull(); // the final has no match yet
});
```

```tsx
// mobile/__tests__/KnockoutAwards.test.tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { KnockoutAwards } from '@/components/knockout/KnockoutAwards';
import type { QuickKnockout } from '@/api/quickKnockout';

const k = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k1', hostId: 'h1', name: 'Cup', sport: 'badminton', format: 'singles',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, status: 'completed', awardsEligible: true,
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta' },
    { playerKey: 'b', playerId: 'p2', displayName: 'Rahul Singh' },
    { playerKey: 'c', displayName: 'Sam' },
  ],
  pairs: [], entrants: [], fixtures: [], roundNames: [], awards: [], createdAt: '2026-10-07T00:00:00.000Z',
  ...over,
});

it('gives an award: pick a player, pick a badge', () => {
  const onAward = jest.fn();
  render(<KnockoutAwards knockout={k()} hostId="h1" onAward={onAward} />);
  expect(screen.queryByText('Arjun Mehta')).toBeNull(); // not the host
  expect(screen.queryByText('Sam')).toBeNull();          // guests have no profile
  fireEvent.press(screen.getByText('Rahul Singh'));
  fireEvent.press(screen.getByText('Fair Play'));
  fireEvent.press(screen.getByText('Give award'));
  expect(onAward).toHaveBeenCalledWith('p2', 'fair-play');
});

it('lists given awards and stops at 3', () => {
  const awards = [1, 2, 3].map((n) => ({ playerId: 'p2', badge: 'fair-play', title: `Award ${n}` }));
  render(<KnockoutAwards knockout={k({ awards })} hostId="h1" onAward={jest.fn()} />);
  expect(screen.getByText('Award 3')).toBeTruthy();
  expect(screen.queryByText('Give award')).toBeNull();
});

it('explains when awards are not available', () => {
  render(<KnockoutAwards knockout={k({ awardsEligible: false })} hostId="h1" onAward={jest.fn()} />);
  expect(screen.getByText(/at least 4 Kria players/i)).toBeTruthy();
});
```

```tsx
// mobile/__tests__/KnockoutScreen.test.tsx
import { ScrollView } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import KnockoutScreen from '../src/app/knockout/[id]';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'k1' }),
  useIsFocused: () => true, // Badge (champion banner) reads it
}));
let mockViewer = 'h1';
let mockStatus = 'waiting';
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: mockViewer } } }),
}));
const mockActions = { draw: jest.fn(), start: jest.fn(), cancel: jest.fn(), award: jest.fn(), addGuest: jest.fn(), addPlayer: jest.fn(), removePlayer: jest.fn(), pair: jest.fn(), unpair: jest.fn() };
jest.mock('@/lib/useQuickKnockout', () => ({
  useQuickKnockout: () => ({
    knockout: {
      _id: 'k1', hostId: 'h1', joinCode: 'KX4P9M', name: 'Cup', sport: 'badminton', format: 'singles',
      matchConfig: { bestOf: 1, pointsToWin: 21 }, status: mockStatus, awardsEligible: true,
      players: [{ playerKey: 'a', playerId: 'h1', displayName: 'Arjun' }, { playerKey: 'b', playerId: 'p2', displayName: 'Rahul' }, { playerKey: 'c', displayName: 'Sam' }],
      pairs: [],
      entrants: [{ entrantId: 'e1', playerKeys: ['a'] }, { entrantId: 'e2', playerKeys: ['b'] }, { entrantId: 'e3', playerKeys: ['c'] }],
      fixtures: [
        { fixtureId: 'f1', round: 1, position: 0, entrantA: 'e1', bye: true, winnerEntrantId: 'e1' },
        { fixtureId: 'f2', round: 1, position: 1, entrantA: 'e2', entrantB: 'e3', bye: false, quickMatchId: 'm2' },
        { fixtureId: 'f3', round: 2, position: 0, entrantA: 'e1', bye: false },
      ],
      roundNames: ['Semi-Final', 'Final'], awards: [], createdAt: '2026-10-07T00:00:00.000Z',
      championEntrantId: mockStatus === 'completed' ? 'e1' : undefined,
    },
    loading: false, error: false, busy: false, problem: '', reload: jest.fn(), ...mockActions,
  }),
}));

beforeEach(() => jest.clearAllMocks());

it('waiting: the host gets the draw bar pinned outside the scroll', () => {
  mockViewer = 'h1'; mockStatus = 'waiting';
  render(<KnockoutScreen />);
  // The first ScrollView in the tree is the page; the draw preview adds a second, horizontal one.
  const [page] = screen.UNSAFE_getAllByType(ScrollView);
  expect(within(page).queryByText('Start knockout')).toBeNull();
  fireEvent.press(screen.getByText('Start knockout'));
  expect(mockActions.start).toHaveBeenCalled();
});

it('waiting: a joined player gets no draw bar', () => {
  mockViewer = 'p2'; mockStatus = 'waiting';
  render(<KnockoutScreen />);
  expect(screen.queryByText('Start knockout')).toBeNull();
});

it('live: the tree opens a match', () => {
  mockViewer = 'h1'; mockStatus = 'live';
  render(<KnockoutScreen />);
  fireEvent.press(screen.getByLabelText('Open Rahul v Sam'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/quick/[id]', params: { id: 'm2' } });
});

it('completed: champion banner and the host’s awards', () => {
  mockViewer = 'h1'; mockStatus = 'completed';
  render(<KnockoutScreen />);
  expect(screen.getByText('Arjun won Cup')).toBeTruthy();
  expect(screen.getByText('Give award')).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/BracketTree.test.tsx __tests__/KnockoutAwards.test.tsx __tests__/KnockoutScreen.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the three files**

```tsx
// mobile/src/components/knockout/BracketTree.tsx
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme';
import type { QuickKnockout } from '@/api/quickKnockout';
import { bracketColumns, entrantShortName, isPlayable } from '@/lib/quickKnockoutView';

const BOX_WIDTH = 132;

/**
 * The bracket, scrolled sideways (design option B). One column per round,
 * first names in each box. A fixture with a match opens its scoreboard;
 * a playable one (match, no winner) is outlined in brand orange.
 */
export function BracketTree({ knockout: k, onOpenMatch }: { knockout: QuickKnockout; onOpenMatch: (matchId: string) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 12 }}>
      {bracketColumns(k).map((col) => (
        <View key={col.name} style={{ width: BOX_WIDTH, gap: 10, justifyContent: 'space-around' }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: t.textFaint }}>{col.name}</Text>
          {col.fixtures.map((f) => {
            const a = entrantShortName(k, f.entrantA) || '—';
            const b = f.bye ? 'Bye' : entrantShortName(k, f.entrantB) || '—';
            const line = (name: string, entrantId?: string) => (
              <Text numberOfLines={1} style={{
                fontFamily: f.winnerEntrantId && f.winnerEntrantId === entrantId ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_500Medium',
                fontSize: 12,
                color: !entrantId ? t.textFaint : f.winnerEntrantId && f.winnerEntrantId !== entrantId ? t.textFaint : t.text,
              }}>{name}</Text>
            );
            const box = {
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: isPlayable(f) ? t.brand : t.line,
              backgroundColor: t.surface,
              padding: 7,
              gap: 2,
            };
            return f.quickMatchId ? (
              <Pressable key={f.fixtureId} accessibilityRole="button" accessibilityLabel={`Open ${a} v ${b}`} onPress={() => onOpenMatch(f.quickMatchId!)} style={box}>
                {line(a, f.entrantA)}
                {line(b, f.bye ? undefined : f.entrantB)}
              </Pressable>
            ) : (
              <View key={f.fixtureId} style={box}>
                {line(a, f.entrantA)}
                {line(b, f.bye ? undefined : f.entrantB)}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
```

```tsx
// mobile/src/components/knockout/KnockoutAwards.tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme';
import type { QuickKnockout } from '@/api/quickKnockout';
import { QUICK_AWARD_BADGES, awardablePlayers } from '@/lib/quickKnockoutView';

const MAX_AWARDS = 3;

/** Host only, once the knockout is finished. Low-tier badges; the server enforces every rule again. */
export function KnockoutAwards({ knockout: k, hostId, busy, onAward }: {
  knockout: QuickKnockout; hostId: string; busy?: boolean; onAward: (playerId: string, badge: string) => void;
}) {
  const t = useTheme();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const label = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint };
  const chip = (on: boolean) => ({ minHeight: 40, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1.5, borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.fillSoft, justifyContent: 'center' as const });
  const chipText = (on: boolean) => ({ fontFamily: 'SpaceGrotesk_500Medium' as const, fontSize: 13, color: on ? t.onBrand : t.textBody });

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      <Text style={label}>Awards</Text>
      {!k.awardsEligible ? (
        <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: t.textMeta, marginTop: 6 }}>
          Awards need at least 4 Kria players in the knockout.
        </Text>
      ) : (
        <>
          {k.awards.map((a) => (
            <Text key={`${a.playerId}-${a.badge}`} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.text, marginTop: 8 }}>{a.title}</Text>
          ))}
          {k.awards.length < MAX_AWARDS ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {awardablePlayers(k, hostId).map((p) => (
                  <Pressable key={p.playerKey} accessibilityRole="button" onPress={() => setPlayerId(p.playerId!)} style={chip(playerId === p.playerId)}>
                    <Text style={chipText(playerId === p.playerId)}>{p.displayName}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {Object.entries(QUICK_AWARD_BADGES).map(([key, name]) => (
                  <Pressable key={key} accessibilityRole="button" onPress={() => setBadge(key)} style={chip(badge === key)}>
                    <Text style={chipText(badge === key)}>{name}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={busy || !playerId || !badge}
                onPress={() => { onAward(playerId!, badge!); setPlayerId(null); setBadge(null); }}
                style={{ minHeight: 48, marginTop: 12, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', opacity: busy || !playerId || !badge ? 0.45 : 1 }}
              >
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: t.onBrand }}>Give award</Text>
              </Pressable>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}
```

```tsx
// mobile/src/app/knockout/[id].tsx
import { ScrollView, View, Text, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Skeleton, ErrorBlock } from '@/components/states';
import { Badge } from '@/components/profile/Badge';
import { BracketTree } from '@/components/knockout/BracketTree';
import { KnockoutAwards } from '@/components/knockout/KnockoutAwards';
import { KnockoutDrawBar, KnockoutWaitingRoom } from '@/components/knockout/KnockoutWaitingRoom';
import { useQuickKnockout } from '@/lib/useQuickKnockout';
import { championName, isKnockoutHost } from '@/lib/quickKnockoutView';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/lib/theme';
import { goBack } from '@/lib/nav';

export default function KnockoutScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppSelector((s) => s.auth);
  const ko = useQuickKnockout(id);
  const k = ko.knockout;
  const host = k ? isKnockoutHost(k, user?._id) : false;

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goBack(router, '/quick')} hitSlop={8} style={{ width: 44, height: 44, justifyContent: 'center' }}>
          <Icon name="arrow-left" size={22} color={t.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={ko.loading && Boolean(k)} onRefresh={ko.reload} tintColor={t.brand} />}>
        {ko.loading && !k ? <View style={{ paddingHorizontal: 20, gap: 12 }}><Skeleton h={28} w="45%" line /><Skeleton h={160} /></View> : null}
        {ko.error && !k ? <View style={{ paddingHorizontal: 20 }}><ErrorBlock label="Knockout" onRetry={ko.reload} /></View> : null}

        {k && k.status === 'waiting' ? (
          <KnockoutWaitingRoom
            knockout={k} playerId={user?._id} busy={ko.busy}
            onAddGuest={ko.addGuest} onAddPlayer={ko.addPlayer} onRemove={ko.removePlayer} onPair={ko.pair} onUnpair={ko.unpair}
          />
        ) : null}

        {k && k.status !== 'waiting' ? (
          <>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: t.brandInk }}>
                {`Knockout · ${k.format} · ${k.status}`}
              </Text>
              <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 28, lineHeight: 34, textTransform: 'uppercase', color: t.text, marginTop: 6 }}>{k.name}</Text>
            </View>

            {k.status === 'completed' && k.championEntrantId ? (
              <View style={{ marginHorizontal: 20, marginTop: 14, padding: 14, borderRadius: 6, borderWidth: 1.5, borderColor: t.brand, backgroundColor: t.brandTint, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Badge badge="knockout-winner" size={44} />
                <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', fontSize: 20, lineHeight: 24, textTransform: 'uppercase', color: t.text }}>{`${championName(k)} won ${k.name}`}</Text>
              </View>
            ) : null}

            <BracketTree knockout={k} onOpenMatch={(matchId) => router.push({ pathname: '/quick/[id]', params: { id: matchId } })} />

            {host && k.status === 'completed' ? <KnockoutAwards knockout={k} hostId={user!._id} busy={ko.busy} onAward={ko.award} /> : null}

            {host && k.status === 'live' ? (
              <Pressable accessibilityRole="button" onPress={ko.cancel} disabled={ko.busy} style={{ marginHorizontal: 20, marginTop: 24, minHeight: 48, borderRadius: 5, borderWidth: 1.5, borderColor: t.fail, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: t.failInk }}>Cancel knockout</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {ko.problem ? <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: t.failInk, marginTop: 16, paddingHorizontal: 20 }}>{ko.problem}</Text> : null}
      </ScrollView>

      {k && k.status === 'waiting' && host ? <KnockoutDrawBar knockout={k} busy={ko.busy} onDraw={ko.draw} onStart={ko.start} /> : null}
    </Screen>
  );
}
```

Add the three files to `MIGRATED`.

- [ ] **Step 4: Run tests**

Run: `cd mobile && npx jest __tests__/BracketTree.test.tsx __tests__/KnockoutAwards.test.tsx __tests__/KnockoutScreen.test.tsx __tests__/colourLiterals.test.ts __tests__/pressableStyleFence.test.ts __tests__/fontLeading.test.ts && npx tsc --noEmit`
Expected: PASS, tsc silent.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/components/knockout/BracketTree.tsx src/components/knockout/KnockoutAwards.tsx "src/app/knockout/[id].tsx" test-utils/colourLiterals.ts __tests__/BracketTree.test.tsx __tests__/KnockoutAwards.test.tsx __tests__/KnockoutScreen.test.tsx
git commit -m "feat knockout screen with bracket tree, champion and awards"
```

---

### Task 14: Join by code resolves knockouts

**Files:**
- Modify: `mobile/src/app/quick/join.tsx`
- Test: `mobile/__tests__/JoinScreen.test.tsx`

**Interfaces:**
- Consumes: `resolveQuickCode`, `joinQuickKnockout`, `claimKnockoutGuest` (Task 9); `claimQuickMatchSlot` (existing).
- Produces: a knockout code shows the knockout card with **Join as <name>** and the guest list; a match code keeps today's slot picker.

- [ ] **Step 1: Write the failing test**

```tsx
// mobile/__tests__/JoinScreen.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import JoinQuickMatchScreen from '../src/app/quick/join';
import { claimKnockoutGuest, joinQuickKnockout, resolveQuickCode } from '@/api/quickKnockout';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'p5', firstName: 'Rahul', lastName: 'Singh' } } }),
}));
jest.mock('@/api/quickKnockout', () => ({
  resolveQuickCode: jest.fn(),
  joinQuickKnockout: jest.fn(async () => ({ _id: 'k1' })),
  claimKnockoutGuest: jest.fn(async () => ({ _id: 'k1' })),
}));

const knockout = {
  _id: 'k1', hostId: 'h1', name: 'Sunday Smash', format: 'doubles', status: 'waiting',
  players: [{ playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta' }, { playerKey: 'g', displayName: 'Sam' }],
};

beforeEach(() => jest.clearAllMocks());

async function lookUp(code: string) {
  render(<JoinQuickMatchScreen />);
  fireEvent.changeText(screen.getByPlaceholderText('ABC234'), code);
  fireEvent.press(screen.getByText('Find'));
}

it('a knockout code: join as yourself', async () => {
  (resolveQuickCode as jest.Mock).mockResolvedValue({ kind: 'knockout', data: knockout });
  await lookUp('KX4P9M');
  fireEvent.press(await screen.findByText('Join as Rahul Singh'));
  await waitFor(() => expect(joinQuickKnockout).toHaveBeenCalledWith('KX4P9M'));
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k1' } });
});

it('a knockout code: take a name the host typed', async () => {
  (resolveQuickCode as jest.Mock).mockResolvedValue({ kind: 'knockout', data: knockout });
  await lookUp('KX4P9M');
  fireEvent.press(await screen.findByText('Sam'));
  await waitFor(() => expect(claimKnockoutGuest).toHaveBeenCalledWith('KX4P9M', 'g'));
});

it('a match code keeps the slot picker', async () => {
  (resolveQuickCode as jest.Mock).mockResolvedValue({
    kind: 'match',
    data: { _id: 'm1', hostId: 'h1', status: 'live', sides: [
      { sideId: 's1', name: 'Arjun', slots: [{ slotId: 'a1', playerId: 'h1', displayName: 'Arjun' }] },
      { sideId: 's2', name: 'Rahul', slots: [{ slotId: 'b1', displayName: 'Rahul' }] },
    ] },
  });
  await lookUp('ABC234');
  expect(await screen.findByText('Pick a slot')).toBeTruthy();
});

it('an unknown code says so', async () => {
  (resolveQuickCode as jest.Mock).mockRejectedValue({ response: { data: { message: 'No match or knockout has that code.' } } });
  await lookUp('ZZZZZZ');
  expect(await screen.findByText('No match or knockout has that code.')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest __tests__/JoinScreen.test.tsx`
Expected: FAIL — no "Find" button / resolver never called.

- [ ] **Step 3: Implement**

In `mobile/src/app/quick/join.tsx`:

1. Imports: replace `getQuickMatchByCode` with nothing (keep `claimQuickMatchSlot`, `QuickMatch`), and add:

```ts
import { claimKnockoutGuest, joinQuickKnockout, resolveQuickCode, type QuickKnockout } from '@/api/quickKnockout';
import { useAppSelector } from '@/store/hooks';
```

2. State and lookup — replace the `lookup` function and add knockout state:

```ts
  const { user } = useAppSelector((s) => s.auth);
  const [knockout, setKnockout] = useState<QuickKnockout | null>(null);

  const lookup = async () => {
    setBusy(true);
    setProblem('');
    try {
      const found = await resolveQuickCode(code);
      setMatch(found.kind === 'match' ? found.data : null);
      setKnockout(found.kind === 'knockout' ? found.data : null);
    } catch (err) {
      setMatch(null);
      setKnockout(null);
      setProblem(serverMessage(err, 'No match or knockout found for that code.'));
    } finally {
      setBusy(false);
    }
  };

  const enterKnockout = async (action: () => Promise<QuickKnockout>) => {
    setBusy(true);
    setProblem('');
    try {
      const joined = await action();
      router.replace({ pathname: '/knockout/[id]', params: { id: joined._id } });
    } catch (err) {
      setProblem(serverMessage(err, 'Could not join that knockout.'));
    } finally {
      setBusy(false);
    }
  };
```

3. Rename the lookup button's label from `Find match` to `Find`.

4. Below the existing `{match ? (…) : null}` block, add the knockout card:

```tsx
        {knockout ? (
          <View style={{ marginTop: 26, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, padding: 14 }}>
            <Text style={{ ...LBL, color: '#16C46A' }}>{`Knockout · ${knockout.format}`}</Text>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 27, color: '#fff', marginTop: 6 }}>{knockout.name}</Text>
            <Text style={{ ...LBL, marginTop: 4 }}>
              {`Hosted by ${knockout.players.find((p) => p.playerId === knockout.hostId)?.displayName ?? 'the host'} · ${knockout.players.length} in so far`}
            </Text>
            {knockout.status !== 'waiting' ? (
              <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#d4d4d4', marginTop: 12 }}>This knockout has already started.</Text>
            ) : knockout.players.some((p) => p.playerId === user?._id) ? (
              <Pressable onPress={() => router.replace({ pathname: '/knockout/[id]', params: { id: knockout._id } })} style={{ marginTop: 14, backgroundColor: '#F97316', borderRadius: 4, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: '#0B0B0B' }}>You are in · Open</Text>
              </Pressable>
            ) : (
              <>
                <Pressable disabled={busy} onPress={() => enterKnockout(() => joinQuickKnockout(code))} style={{ marginTop: 14, backgroundColor: '#F97316', opacity: busy ? 0.5 : 1, borderRadius: 4, paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: '#0B0B0B' }}>
                    {`Join as ${user ? `${user.firstName} ${user.lastName}` : 'yourself'}`}
                  </Text>
                </Pressable>
                {knockout.players.some((p) => !p.playerId) ? (
                  <Text style={{ ...LBL, marginTop: 16 }}>Already added by the host? Tap your name</Text>
                ) : null}
                {knockout.players.filter((p) => !p.playerId).map((p) => (
                  <Pressable key={p.playerKey} disabled={busy} onPress={() => enterKnockout(() => claimKnockoutGuest(code, p.playerKey))}
                    style={{ marginTop: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 4, paddingVertical: 12, paddingHorizontal: 12 }}>
                    <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: '#fff' }}>{p.displayName}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        ) : null}
```

(`join.tsx` is not in `MIGRATED`, so its existing literal-colour style is kept; migrating it is out of scope.)


- [ ] **Step 4: Run tests**

Run: `cd mobile && npx jest __tests__/JoinScreen.test.tsx __tests__/quickBackNavigation.test.tsx`
Expected: PASS. (`quickBackNavigation` renders `join.tsx`; it must still find "Back".)

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/app/quick/join.tsx __tests__/JoinScreen.test.tsx
git commit -m "feat join by code opens knockouts"
```

---

### Task 15: Knockout matches and lists; full verification

**Files:**
- Modify: `mobile/src/app/quick/[id].tsx` (knockout bar)
- Modify: `mobile/src/components/quick/MatchPanel.tsx` (hide cancel / remove / join code for knockout matches)
- Modify: `mobile/src/app/quick/index.tsx` (list knockouts above matches)
- Modify: `mobile/src/components/home/PlayPortal.tsx` (`knockouts` prop, rows), `mobile/src/app/(tabs)/home.tsx` (load them)
- Test: `mobile/__tests__/QuickMatchScreen.test.tsx` (extend), `mobile/__tests__/MatchPanel.test.tsx` (extend), `mobile/__tests__/PlayPortal.test.tsx` (extend)

**Interfaces:**
- Consumes: `listMyQuickKnockouts` (Task 9); `QuickMatch.knockoutId`.
- Produces: `PlayPortalProps.knockouts?: QuickKnockout[]`.

- [ ] **Step 1: Write the failing tests**

Append to `mobile/__tests__/MatchPanel.test.tsx` (it already has `base()` and `panel(match, playerId)`; `base()` has no joined non-host player, so the test supplies one plus an open slot — without them the assertions would pass for the wrong reason):

```tsx
describe('inside a knockout', () => {
  it('offers no cancel, no remove and no join code', () => {
    const sides = [
      { sideId: 's1', name: 'Reds', slots: [{ slotId: 'sl1', playerId: 'h1', displayName: 'Host' }] },
      { sideId: 's2', name: 'Blues', slots: [{ slotId: 'sl2', playerId: 'p2', displayName: 'Rahul' }, { slotId: 'sl3', displayName: 'Open' }] },
    ];
    // Control: the same match outside a knockout does show all three.
    const outside = panel(base({ sides }), 'h1');
    expect(outside.queryByTestId('cancel')).toBeTruthy();
    expect(outside.queryByTestId('join-code')).toBeTruthy();
    expect(outside.queryByText('Remove')).toBeTruthy();
    outside.unmount();

    const { queryByTestId, queryByText } = panel(base({ sides, knockoutId: 'k1', fixtureId: 'f1' }), 'h1');
    expect(queryByTestId('cancel')).toBeNull();
    expect(queryByTestId('join-code')).toBeNull();
    expect(queryByText('Remove')).toBeNull();
  });
});
```

Append to `mobile/__tests__/PlayPortal.test.tsx` (add `import type { QuickKnockout } from '@/api/quickKnockout';` at the top):

```tsx
  it('lists an unfinished knockout you are in', () => {
    const ko: QuickKnockout = {
      _id: 'k1', hostId: 'p1', name: 'Sunday Smash', sport: 'badminton', format: 'singles', status: 'live',
      matchConfig: { bestOf: 1, pointsToWin: 21 }, players: [], pairs: [], entrants: [], fixtures: [], roundNames: [], awards: [],
      createdAt: '2026-10-07T00:00:00.000Z',
    };
    const { getByText } = render(<PlayPortal {...props({ knockouts: [ko] })} />);
    expect(getByText('Sunday Smash')).toBeTruthy();
    expect(getByText('Knockout')).toBeTruthy();
  });
```

In `mobile/__tests__/QuickMatchScreen.test.tsx`:
1. In the `expo-router` mock's `router`, add `push: jest.fn(),`.
2. Below `let mockViewer = 'h1';` add `let mockKnockoutId: string | undefined;`.
3. In the mocked `match` object add `knockoutId: mockKnockoutId,` (the factory body runs at render time, so the current value is read).
4. In `beforeEach(() => jest.clearAllMocks());` → `beforeEach(() => { jest.clearAllMocks(); mockKnockoutId = undefined; });`
5. Append:

```tsx
it('a knockout match links back to its bracket', () => {
  mockViewer = 'h1';
  mockKnockoutId = 'k1';
  render(<QuickMatchScreen />);
  fireEvent.press(screen.getByLabelText('Back to bracket'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k1' } });
});
```

(Import `router` from `expo-router` at the top of that file if it is not imported yet.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/MatchPanel.test.tsx __tests__/PlayPortal.test.tsx __tests__/QuickMatchScreen.test.tsx`
Expected: FAIL on the three new cases.

- [ ] **Step 3: Implement**

`mobile/src/components/quick/MatchPanel.tsx`: after `const host = isHost(match, playerId);` add

```ts
  // A knockout manages its own matches: no cancel, removal or sharing here.
  const managed = Boolean(match.knockoutId);
```

and change the three conditions:
- the cancel action: `{match.status === 'live' ? (` → `{match.status === 'live' && !managed ? (`
- the join-code block: `{host && match.status === 'live' && open.length > 0 ? (` → `{host && !managed && match.status === 'live' && open.length > 0 ? (`
- the remove button: `{host && match.status === 'live' && slot.playerId && …` → `{host && !managed && match.status === 'live' && slot.playerId && …`

`mobile/src/app/quick/[id].tsx`: inside the `<ScrollView>`, before the loading skeleton, add

```tsx
        {match?.knockoutId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to bracket"
            onPress={() => router.push({ pathname: '/knockout/[id]', params: { id: String(match.knockoutId) } })}
            style={{ marginHorizontal: 20, marginBottom: 12, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.14 * 10, textTransform: 'uppercase', color: '#F97316' }}>← Bracket</Text>
          </Pressable>
        ) : null}
```

`mobile/src/components/home/PlayPortal.tsx`:
1. `import type { QuickKnockout } from '@/api/quickKnockout';`
2. Add to `PlayPortalProps`: `/** Unfinished knockouts you host or play in. */ knockouts?: QuickKnockout[];` and destructure `knockouts = []` in the component.
3. Add a row component next to `LiveRow`:

```tsx
function KnockoutRow({ knockout }: { knockout: QuickKnockout }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/knockout/[id]', params: { id: knockout._id } })}
      style={{ ...CARD, borderLeftWidth: 4, borderLeftColor: colors.brand, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 9, minHeight: 44 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Tag label={knockout.status} variant={knockout.status === 'live' ? 'live' : 'open'} dot={knockout.status === 'live'} />
        <Tag label="Knockout" variant="up" />
      </View>
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, lineHeight: 22, color: colors.white, marginTop: 8 }}>{knockout.name}</Text>
      <Text style={MONO(theme)}>{`${knockout.format} · ${knockout.players.length} players`}</Text>
    </Pressable>
  );
}
```

4. In `recentBody`'s returned list, render `{knockouts.filter((x) => x.status === 'waiting' || x.status === 'live').map((x) => <KnockoutRow key={x._id} knockout={x} />)}` before `{live.map(…)}`, and include `knockouts.length > 0` in `showRecent`.

`mobile/src/app/(tabs)/home.tsx`: next to `listMyQuickMatches`, load knockouts:

```ts
import { listMyQuickKnockouts, type QuickKnockout } from '@/api/quickKnockout';
// …
const [knockouts, setKnockouts] = useState<QuickKnockout[]>([]);
// where matches are loaded:
setKnockouts(await listMyQuickKnockouts().catch(() => []));
// and pass to <PlayPortal … knockouts={knockouts} />
```

(If `HomeScreen.test.tsx` mocks `../src/api/quickMatch` only, add `jest.mock('../src/api/quickKnockout', () => ({ listMyQuickKnockouts: jest.fn(async () => []) }));` there.)

`mobile/src/app/quick/index.tsx`:

1. Imports: `import { listMyQuickKnockouts, type QuickKnockout } from '@/api/quickKnockout';`
2. State, under `const [matches, setMatches] = …`: `const [knockouts, setKnockouts] = useState<QuickKnockout[]>([]);`
3. In `load`, replace `setMatches(await listMyQuickMatches());` with:

```ts
      const [mine, ko] = await Promise.all([listMyQuickMatches(), listMyQuickKnockouts()]);
      setMatches(mine);
      setKnockouts(ko);
```

4. Add this component above `export default function QuickMatchesScreen`:

```tsx
function KnockoutListRow({ knockout }: { knockout: QuickKnockout }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/knockout/[id]', params: { id: knockout._id } })}
      style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', borderLeftWidth: 4, borderLeftColor: '#F97316', borderRadius: 6, backgroundColor: '#151515', padding: 14, marginBottom: 10 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Tag label={knockout.status} variant={knockout.status === 'live' ? 'live' : knockout.status === 'waiting' ? 'open' : statusVariant(knockout.status === 'cancelled' ? 'cancelled' : 'completed')} dot={knockout.status === 'live'} />
        <Tag label="Knockout" variant="up" />
      </View>
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, lineHeight: 22, color: '#fff', marginTop: 8 }}>{knockout.name}</Text>
      <Text style={{ ...LBL, marginTop: 4 }}>{`${knockout.format} · ${knockout.players.length} players`}</Text>
    </Pressable>
  );
}
```

5. Above `{matches.map((match) => (`, render `{knockouts.map((k) => <KnockoutListRow key={k._id} knockout={k} />)}`.
6. Change the empty-state condition `matches.length === 0` (in that `EmptyState` block only) to `matches.length === 0 && knockouts.length === 0`.

- [ ] **Step 4: Run tests and the full mobile gate**

Run: `cd mobile && npx jest __tests__/MatchPanel.test.tsx __tests__/PlayPortal.test.tsx __tests__/QuickMatchScreen.test.tsx __tests__/HomeScreen.test.tsx`
Expected: PASS.

Run: `cd mobile && npx tsc --noEmit && npx jest`
Expected: tsc silent; every suite passes (baseline before this plan: 110 suites / 1083 tests, plus the new ones).

Run: `cd server && npx tsc --noEmit && npm run lint:fix && npm run build && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run`
Expected: all green (server baseline before this plan: 93 files / 612 tests, plus the new ones).

- [ ] **Step 5: Commit**

```bash
cd mobile && git add "src/app/quick/[id].tsx" src/components/quick/MatchPanel.tsx src/app/quick/index.tsx src/components/home/PlayPortal.tsx "src/app/(tabs)/home.tsx" __tests__/MatchPanel.test.tsx __tests__/PlayPortal.test.tsx __tests__/QuickMatchScreen.test.tsx __tests__/HomeScreen.test.tsx
git commit -m "feat knockout matches link to their bracket, knockouts listed on Home and Quick matches"
```

- [ ] **Step 6: Manual check on a device (the user)**

Restart the server with the new code, open the app in Expo Go, and walk: Host → Knockout → create → share code → second phone joins → Draw → Start → score a semi to the end → watch the final appear on both phones → finish the final → champion banner → give one award → see it on the player's profile.
