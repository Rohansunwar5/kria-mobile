# Quick Cricket Match Screen Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every cricket quick match a real scoreboard for watchers, a pinned scoring pad for
the host, and a one-step toss. The squads fill themselves.

**Architecture:**
- **Server:** gains `GET /quick-match/:id/scorecard`, which reuses the tournament scorecard
  builder over the balls already stored under the quick match's id. Recording the toss now also
  fills both squads from the slots.
- **Mobile:** a new view-only `QuickCricketLive` reuses the tournament live components (score
  band, at the crease, overs, scorecard). `CricketScorePanel` keeps its state machine but becomes
  a pad pinned under the scroll. Cancel and the join code move into a `CricketHostTools`
  component in the scroll. `CricketSetupPanel` becomes toss cards.

**Tech Stack:**
- Server: Node + Express + Mongoose + vitest (`D:\kria\server`).
- Mobile: Expo SDK 57 / React Native 0.86 + jest + @testing-library/react-native
  (`D:\kria\mobile`).

**Spec:** `mobile/docs/superpowers/specs/2026-10-08-quick-cricket-ui-design.md`

## Global Constraints

**Repos**
- Tasks 1–2 run in `D:\kria\server`, tasks 3–6 in `D:\kria\mobile`. `D:\kria` itself is not a
  repo.
- Put `pwd` in every command. Never run commands for both repos in parallel tool calls.

**Server**
- Commit messages must match `^(fix|feat|chore|perf|bugs|docs|breaking_changes|refactor|add|Merge|merge|test|tests|updated|changed|added|created|create) .*$`.
  That's a verb, a space, and **no colon**.
- Pre-commit runs `npm run lint:fix && npm run build` over the whole repo.
- No `console` (use `logger`). No explicit `any`. No unused vars.
- No Mongoose calls outside `src/repository/` and `src/models/`.
- Files are CRLF on disk; keep them CRLF.
- Commands:
  - Test: `RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/<file>`
  - Types: `npx tsc --noEmit`

**Mobile**
- Never `style={({ pressed }) => …}` on `Pressable`.
- `Anton_400Regular` needs an **integer** `lineHeight` ≥ 1.188 × `fontSize`. Space Mono gets no
  `lineHeight`.
- Files listed in `test-utils/colourLiterals.ts` `MIGRATED` may not contain colour literals. New
  and rewritten components use `useTheme()` tokens and join `MIGRATED`.
- Router hooks come from `expo-router`.
- Commands: test `npx jest __tests__/<file>`, types `npx tsc --noEmit`, lint
  `npx eslint <files>`.

**Pad labels must stay exactly:** `0 1 2 3 4 6`, `Extras`, `Wicket`, `Undo`, `Back`, `Wide`,
`No ball`, `Bye`, `Leg bye`, `Bowled`, `Caught`, `LBW`, `Run out`, `Stumped`, `Hit wicket`,
`Retired hurt`, `+ Wicket too`, `✓ Wicket too`, `Who is on strike?`,
`Who is at the non-striker's end?`, `Who is bowling?`, `Who was dismissed?`, and player display
names.

**Process**
- Docs under `mobile/docs/superpowers/` are never committed.
- Never push.

## Review Focus

1. **A refused delivery** (server 400, e.g. a bowler with no overs left) must show where the
   host is looking: at the top of the pinned pad, not at the top of a long scroll. This was not
   in the spec; it's the same lesson as the knockout draw bar.
   - Task 5: a pad test.
   - Task 5: a screen test that the message shows once, outside the scroll.
2. **The scorecard read fails, or the server predates the endpoint.** The score band still shows
   from `liveState`, there's no Scorecard chip, and nothing crashes.
   - Task 4: a test with `scorecard={null}`.
   - Task 3: a test that a failed read keeps the last card.
3. **The match finishes or is cancelled while the host is on the pad.** The pad disappears and
   the result or "Match cancelled" shows.
   - Task 5: "renders nothing once completed".
   - Task 4: the cancelled test.
4. **A toss recorded by an older app,** so the squads are empty. "Confirm teams" fills only the
   empty sides, one after the other.
   - Task 6 tests.
5. **A watcher opens the match before the toss.** They see "Waiting for the toss" and the squads,
   never host controls.
   - Task 4: the setup test.
   - Task 6: the non-host test.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `server/src/sports/cricket/services/quickCricketScoring.service.ts` | modify | `recordToss` fills empty squads |
| `server/src/sports/cricket/services/scorecard.service.ts` | modify | `getQuickScorecard` |
| `server/src/controllers/quickMatch.controller.ts` | modify | `getQuickCricketScorecard` |
| `server/src/routes/quickMatch.route.ts` | modify | `GET /:id/scorecard` |
| `server/test/quickCricketScoring.test.ts` | modify | toss-fills-squads tests; lineup-gate test seeds empty squads |
| `server/test/quickCricketScorecard.test.ts` | create | endpoint tests |
| `mobile/src/api/quickMatch.ts` | modify | `getQuickScorecard` |
| `mobile/src/lib/useQuickScorecard.ts` | create | fetch the scorecard, and again when the score moves |
| `mobile/src/lib/quickCricketView.ts` | modify | `tossLine` |
| `mobile/src/components/cricket/HeroScore.tsx` | modify | narrow `match` type; `resultLabel` |
| `mobile/src/components/quick/QuickCricketLive.tsx` | create | everyone's view: setup squads, or the live parts plus tabs |
| `mobile/src/components/quick/CricketScorePanel.tsx` | rewrite render | the pinned pad; plus `CricketHostTools` (join code, Cancel) |
| `mobile/src/components/quick/CricketSetupPanel.tsx` | rewrite | toss cards; "Confirm teams" fallback |
| `mobile/src/app/quick/[id].tsx` | modify | header, live view, host tools, pinned pad, problem placement |
| `mobile/test-utils/colourLiterals.ts` | modify | add the 3 component files to `MIGRATED` |
| `mobile/__tests__/…` | create or modify | per task |

---

### Task 1: The toss fills both squads (server)

**Files:**
- Modify: `D:\kria\server\src\sports\cricket\services\quickCricketScoring.service.ts`
  (`recordToss`, around lines 73–90)
- Test: `D:\kria\server\test\quickCricketScoring.test.ts`

**Interfaces:**
- Produces: after `recordToss`, `cricketSetup.lineupsSet === true` and each empty
  `sideNLineup` equals that side's slots as `{ slotId, playerId?, name: displayName }`, in slot
  order. Tasks 2 and 6 rely on this.

- [ ] **Step 1: Write the failing tests.** In `test/quickCricketScoring.test.ts`, inside
  `describe('quick cricket scoring', …)`, add after the `it('records the toss', …)` test:

```ts
    type Squad = { slotId: string; playerId?: unknown; name?: string }[];
    const squadsOf = async (matchId: string) =>
        ((await QuickCricketMatchModel.findById(matchId).lean()) as unknown as {
            cricketSetup: { lineupsSet: boolean; side1Lineup: Squad; side2Lineup: Squad };
        }).cricketSetup;

    it('fills both squads from the slots when the toss is recorded', async () => {
        const { hostId, matchId, match } = await seedCricket();
        await quickCricketScoringService.recordToss(matchId, hostId, {
            winnerSideId: match.sides[0].sideId, decision: 'bat',
        });

        const setup = await squadsOf(matchId);
        const plain = (squad: Squad) => squad.map((p) => ({ slotId: p.slotId, playerId: String(p.playerId), name: p.name }));
        const fromSlots = (i: 0 | 1) => match.sides[i].slots.map((s) => ({ slotId: s.slotId, playerId: String(s.playerId), name: s.displayName }));
        expect(setup.lineupsSet).toBe(true);
        expect(plain(setup.side1Lineup)).toEqual(fromSlots(0));
        expect(plain(setup.side2Lineup)).toEqual(fromSlots(1));
    });

    it('leaves a guest in the squad without a playerId', async () => {
        const hostId = oid();
        const m = (await quickMatchService.create(hostId, {
            sport: 'cricket',
            sides: [
                { name: 'A', slots: [{ playerId: hostId, displayName: 'H' }, { displayName: 'Guest' }] },
                { name: 'B', slots: [{ playerId: oid(), displayName: 'B0' }, { playerId: oid(), displayName: 'B1' }] },
            ],
        })).data!;
        await quickCricketScoringService.recordToss(String(m._id), hostId, { winnerSideId: m.sides[0].sideId, decision: 'bat' });

        const guest = (await squadsOf(String(m._id))).side1Lineup[1];
        expect(guest.slotId).toBe(m.sides[0].slots[1].slotId);
        expect(guest.name).toBe('Guest');
        expect(guest.playerId).toBeUndefined();
    });
```

- [ ] **Step 2: Keep the lineup gate covered.** The toss now fills the squads, so the existing
  test `it('refuses a ball until both lineups are set', …)` would no longer reach its gate. In
  that test, insert right after its `recordToss` call:

```ts
        // The toss fills both squads now; a toss recorded before that left them empty.
        await QuickCricketMatchModel.updateOne({ _id: ctx.matchId }, {
            $set: { 'cricketSetup.lineupsSet': false, 'cricketSetup.side1Lineup': [], 'cricketSetup.side2Lineup': [] },
        });
```

- [ ] **Step 3: Run to verify the new tests fail.**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickCricketScoring.test.ts`
Expected: FAIL in "fills both squads…" (`lineupsSet` false) and "leaves a guest…" (`guest` is
undefined). Everything else passes.

- [ ] **Step 4: Implement.** In `recordToss`, replace

```ts
        match.cricketSetup.toss = { winnerTeamId: data.winnerSideId, decision: data.decision, recorded: true };
        match.markModified('cricketSetup');
```

with

```ts
        match.cricketSetup.toss = { winnerTeamId: data.winnerSideId, decision: data.decision, recorded: true };
        // Each squad is its side's slots, as the app always sent: the host names
        // every batter at the crease anyway, so confirming the order was a step
        // with no choice in it. A squad an older app already sent is kept.
        const squad = (side: IQuickMatchSide) =>
            side.slots.map((s) => ({ slotId: s.slotId, ...(s.playerId ? { playerId: s.playerId } : {}), name: s.displayName }));
        if (match.cricketSetup.side1Lineup.length === 0) match.cricketSetup.side1Lineup = squad(match.sides[0]);
        if (match.cricketSetup.side2Lineup.length === 0) match.cricketSetup.side2Lineup = squad(match.sides[1]);
        match.cricketSetup.lineupsSet = true;
        match.markModified('cricketSetup');
```

and change the model import at the top of the file to:

```ts
import { IQuickMatch, IQuickMatchSide } from '../../../models/quickMatch.model';
```

- [ ] **Step 5: Run the file, then everything that records a toss.**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickCricket test/quickKnockoutCricket test/cricketDismissedBatsman.test.ts test/cricketNonStrikerRunOut.test.ts test/quickMatchRosterLock.test.ts`
Expected: all PASS.

- [ ] **Step 6: Types, then commit.** Check the file is still CRLF (`file <path>`).

```bash
cd /d/kria/server && pwd && npx tsc --noEmit && git add src/sports/cricket/services/quickCricketScoring.service.ts test/quickCricketScoring.test.ts && git commit -m "feat quick cricket toss fills both squads from the slots"
```

---

### Task 2: `GET /quick-match/:id/scorecard` (server)

**Files:**
- Modify: `D:\kria\server\src\sports\cricket\services\scorecard.service.ts` (add
  `getQuickScorecard`, export it)
- Modify: `D:\kria\server\src\controllers\quickMatch.controller.ts`
- Modify: `D:\kria\server\src\routes\quickMatch.route.ts`
- Create: `D:\kria\server\test\quickCricketScorecard.test.ts`

**Interfaces:**
- Consumes: Task 1, which makes the toss alone enough to score.
- Produces: `cricketScorecardService.getQuickScorecard(matchId: string): Promise<SuccessResponse<{ innings1: InningsScorecard | null; innings2: InningsScorecard | null }>>`.
  - `GET /quick-match/:id/scorecard` returns it in the usual envelope (`body.data.data`).
  - Player ids in the cards (`registrationId`) are **slot ids**. Mobile Tasks 3–4 rely on this.

- [ ] **Step 1: Write the failing test file** `test/quickCricketScorecard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import Player from '../src/models/player.model';
import { QuickCricketMatchModel } from '../src/models/quickMatch.model';
import { quickMatchService } from '../src/services/quickMatch.service';
import { quickCricketScoringService } from '../src/sports/cricket/services/quickCricketScoring.service';
import { cricketScorecardService } from '../src/sports/cricket/services/scorecard.service';

const oid = () => new mongoose.Types.ObjectId().toString();

/** Reds bat first against Blues, one over a side. Blues' opening bowler is a guest. */
async function tossed() {
    const hostId = oid();
    const m = (await quickMatchService.create(hostId, {
        sport: 'cricket',
        sides: [
            { name: 'Reds', slots: [{ playerId: hostId, displayName: 'Kohli' }, { playerId: oid(), displayName: 'Rahul' }] },
            { name: 'Blues', slots: [{ displayName: 'Bumrah' }, { playerId: oid(), displayName: 'Shami' }] },
        ],
    })).data!;
    await QuickCricketMatchModel.updateOne({ _id: m._id }, { $set: { 'matchConfig.maxOvers': 1 } });
    const id = String(m._id);
    const [reds, blues] = m.sides;
    await quickCricketScoringService.recordToss(id, hostId, { winnerSideId: reds.sideId, decision: 'bat' });

    type Side = typeof reds;
    const ball = (bat: Side, bowl: Side, runs: number) => quickCricketScoringService.recordBall(id, hostId, {
        batsmanOnStrikeId: bat.slots[0].slotId, nonStrikerId: bat.slots[1].slotId, bowlerId: bowl.slots[0].slotId, runs,
    });
    return { id, reds, blues, ball };
}

describe('quick cricket scorecard', () => {
    it('names batters and bowlers from the slots, guests included', async () => {
        const { id, reds, blues, ball } = await tossed();
        await ball(reds, blues, 4);
        await ball(reds, blues, 2);

        const { innings1, innings2 } = (await cricketScorecardService.getQuickScorecard(id)).data!;
        expect(innings2).toBeNull();
        expect([innings1!.battingTeamName, innings1!.bowlingTeamName]).toEqual(['Reds', 'Blues']);
        const kohli = innings1!.battingCard.find((b) => b.registrationId === reds.slots[0].slotId)!;
        expect([kohli.name, kohli.runs, kohli.ballsFaced, kohli.fours]).toEqual(['Kohli', 6, 2, 1]);
        expect(innings1!.bowlingCard[0]).toMatchObject({ name: 'Bumrah', runs: 6, overs: '0.2' });
    });

    it('returns both innings once the chase has begun', async () => {
        const { id, reds, blues, ball } = await tossed();
        for (let i = 0; i < 6; i++) await ball(reds, blues, 1);
        await ball(blues, reds, 0);

        const { innings1, innings2 } = (await cricketScorecardService.getQuickScorecard(id)).data!;
        expect(innings1!.totals.runs).toBe(6);
        expect(innings2!.battingTeamName).toBe('Blues');
    });

    it('refuses a badminton match and an unknown id', async () => {
        const badminton = (await quickMatchService.create(oid(), {
            sport: 'badminton',
            sides: [
                { name: 'A', slots: [{ playerId: oid(), displayName: 'Ana' }] },
                { name: 'B', slots: [{ playerId: oid(), displayName: 'Bo' }] },
            ],
        })).data!;
        await expect(cricketScorecardService.getQuickScorecard(String(badminton._id))).rejects.toThrow('This is not a cricket match.');
        await expect(cricketScorecardService.getQuickScorecard(oid())).rejects.toThrow('Match not found.');
    });

    it('serves a logged-in player over HTTP, and nobody else', async () => {
        const { id, reds, blues, ball } = await tossed();
        await ball(reds, blues, 1);
        const player = await Player.create({
            firstName: 'Card', lastName: 'Reader',
            email: `card${Date.now()}${Math.round(performance.now())}@kria.test`,
            phone: '9999999999', status: 'verified', isActive: true,
        });
        const token = jwt.sign({ _id: player._id.toString(), type: 'player' }, process.env.JWT_SECRET as string);

        const res = await request(app).get(`/quick-match/${id}/scorecard`).set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.data.data.innings1.battingTeamName).toBe('Reds');
        expect((await request(app).get(`/quick-match/${id}/scorecard`)).status).toBe(401);
    });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickCricketScorecard.test.ts`
Expected: FAIL. `getQuickScorecard` is not a function, and the HTTP test gets 404.

- [ ] **Step 3: Implement the service.** In `scorecard.service.ts`:

  - Change the error import to `import { BadRequestError, NotFoundError } from '../../../errors';`
  - Add `import { quickMatchRepository } from '../../../repository/quickMatch.repository';`
  - Replace the last line (`export const cricketScorecardService = { getScorecard };`) with:

```ts
/**
 * A quick match's scorecard. Its balls sit in the same collection under the
 * quick match's id and carry slot ids where a tournament ball carries
 * registration ids, so the names come from the sides' slots.
 */
async function getQuickScorecard(matchId: string) {
    const match = await quickMatchRepository.getById(matchId);
    if (!match) throw new NotFoundError('Match not found.');
    if (match.sport !== 'cricket') throw new BadRequestError('This is not a cricket match.');

    const [innings1Balls, innings2Balls] = await Promise.all([
        ballRepository.getByMatchAndInnings(matchId, 1),
        ballRepository.getByMatchAndInnings(matchId, 2),
    ]);

    const lookup: Record<string, PlayerInfo> = {};
    for (const side of match.sides) {
        for (const slot of side.slots) lookup[slot.slotId] = { name: slot.displayName, teamId: side.sideId, teamName: side.name };
    }
    const [side1, side2] = match.sides;
    const fallback = { team1Id: side1.sideId, team1Name: side1.name, team2Id: side2.sideId, team2Name: side2.name };

    return new SuccessResponse('Scorecard fetched.', {
        innings1: buildInnings(1, innings1Balls, lookup, fallback),
        innings2: buildInnings(2, innings2Balls, lookup, fallback),
    });
}

export const cricketScorecardService = { getScorecard, getQuickScorecard };
```

- [ ] **Step 4: Controller and route.**

In `src/controllers/quickMatch.controller.ts`, add the import
`import { cricketScorecardService } from '../sports/cricket/services/scorecard.service';` and
this handler:

```ts
export const getQuickCricketScorecard = async (req: Request, res: Response, next: NextFunction) => {
    const response = await cricketScorecardService.getQuickScorecard(req.params.id);
    next(response);
};
```

In `src/routes/quickMatch.route.ts`, add directly after the `quickMatchRouter.get('/:id', …)`
line:

```ts
quickMatchRouter.get('/:id/scorecard', quickMatchIdValidator, isPlayerLoggedIn, asyncHandler(quickMatchController.getQuickCricketScorecard));
```

- [ ] **Step 5: Run to verify it passes.**

Run: `cd /d/kria/server && pwd && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/quickCricketScorecard.test.ts test/quickCricketHttp.test.ts test/quickMatchHttp.test.ts`
Expected: all PASS.

- [ ] **Step 6: Full suite, then commit.** The full run takes about 2 minutes and can flake 1–5
  unrelated files on timeouts; re-run those alone. Check the files are still CRLF.

```bash
cd /d/kria/server && pwd && npx tsc --noEmit && RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run 2>&1 | grep -E "FAIL|Test Files|Tests "
git add src/sports/cricket/services/scorecard.service.ts src/controllers/quickMatch.controller.ts src/routes/quickMatch.route.ts test/quickCricketScorecard.test.ts && git commit -m "feat quick cricket matches serve a scorecard built from their balls"
```

---

### Task 3: Read the scorecard on mobile (`getQuickScorecard`, `useQuickScorecard`)

**Files:**
- Modify: `D:\kria\mobile\src\api\quickMatch.ts`
- Create: `D:\kria\mobile\src\lib\useQuickScorecard.ts`
- Test: `D:\kria\mobile\__tests__\quickCricketApi.test.ts` (add a describe)
- Test: `D:\kria\mobile\__tests__\useQuickScorecard.test.tsx` (create)

**Interfaces:**
- Consumes: `GET /quick-match/:id/scorecard` (Task 2).
- Produces:
  - `getQuickScorecard(id: string): Promise<Scorecard>` from `@/api/quickMatch`. An empty body
    becomes `{ innings1: null, innings2: null }`.
  - `useQuickScorecard(match: QuickMatch | null): Scorecard | null` from
    `@/lib/useQuickScorecard`.
  - `Scorecard` / `InningsScorecard` come from `@/api/cricketMatch`.

- [ ] **Step 1: Write the failing tests.**

Append to `__tests__/quickCricketApi.test.ts`, and add `getQuickScorecard` to its import from
`@/api/quickMatch`:

```ts
describe('getQuickScorecard', () => {
  it('reads the cards, and an empty body as no innings', async () => {
    mock.onGet('/quick-match/m1/scorecard').replyOnce(200, envelope({ innings1: { inningsNumber: 1 }, innings2: null }));
    expect(await getQuickScorecard('m1')).toEqual({ innings1: { inningsNumber: 1 }, innings2: null });

    mock.onGet('/quick-match/m1/scorecard').replyOnce(200, envelope(null));
    expect(await getQuickScorecard('m1')).toEqual({ innings1: null, innings2: null });
  });
});
```

Create `__tests__/useQuickScorecard.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { useQuickScorecard } from '@/lib/useQuickScorecard';
import { getQuickScorecard, type QuickMatch } from '@/api/quickMatch';

jest.mock('@/api/quickMatch', () => ({ getQuickScorecard: jest.fn() }));

const card = (runs: number) => ({ innings1: { totals: { runs } }, innings2: null });
const match = (live: Record<string, unknown>, over: Record<string, unknown> = {}) => ({
  _id: 'm1', sport: 'cricket', status: 'live',
  liveState: { currentInnings: 1, runs: 0, wickets: 0, completedOvers: 0, ballsInCurrentOver: 0, ...live },
  ...over,
}) as unknown as QuickMatch;

beforeEach(() => jest.clearAllMocks());

it('reads the card again when the score moves, and not otherwise', async () => {
  (getQuickScorecard as jest.Mock).mockResolvedValueOnce(card(0)).mockResolvedValueOnce(card(4));
  const { result, rerender } = renderHook(({ m }: { m: QuickMatch }) => useQuickScorecard(m), { initialProps: { m: match({}) } });
  await waitFor(() => expect(result.current).toEqual(card(0)));

  rerender({ m: match({}, { joinCode: 'NEW' }) }); // same score: no read
  expect(getQuickScorecard).toHaveBeenCalledTimes(1);

  rerender({ m: match({ runs: 4, ballsInCurrentOver: 1 }) });
  await waitFor(() => expect(result.current).toEqual(card(4)));
  expect(getQuickScorecard).toHaveBeenCalledTimes(2);
  expect(getQuickScorecard).toHaveBeenLastCalledWith('m1');
});

it('keeps the last card when a read fails', async () => {
  (getQuickScorecard as jest.Mock).mockResolvedValueOnce(card(0)).mockRejectedValueOnce(new Error('offline'));
  const { result, rerender } = renderHook(({ m }: { m: QuickMatch }) => useQuickScorecard(m), { initialProps: { m: match({}) } });
  await waitFor(() => expect(result.current).toEqual(card(0)));

  rerender({ m: match({ runs: 1, ballsInCurrentOver: 1 }) });
  await waitFor(() => expect(getQuickScorecard).toHaveBeenCalledTimes(2));
  expect(result.current).toEqual(card(0));
});

it('reads nothing for a badminton match, a waiting match, or no match', () => {
  renderHook(() => useQuickScorecard(match({}, { sport: 'badminton' })));
  renderHook(() => useQuickScorecard(match({}, { status: 'waiting' })));
  renderHook(() => useQuickScorecard(null));
  expect(getQuickScorecard).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify they fail.**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/quickCricketApi.test.ts __tests__/useQuickScorecard.test.tsx`
Expected: FAIL. `getQuickScorecard` is not a function, and `@/lib/useQuickScorecard` can't be
found.

- [ ] **Step 3: Implement.**

In `src/api/quickMatch.ts`, change `import type { LiveState } from './cricketMatch';` to
`import type { LiveState, Scorecard } from './cricketMatch';` and append:

```ts
/** Batting and bowling cards per innings, built by the server from the stored balls. */
export async function getQuickScorecard(id: string): Promise<Scorecard> {
  return (unwrap(await API.get(`/quick-match/${id}/scorecard`)) as Scorecard | null) ?? { innings1: null, innings2: null };
}
```

Create `src/lib/useQuickScorecard.ts`:

```ts
import { useEffect, useState } from 'react';
import type { Scorecard } from '@/api/cricketMatch';
import { getQuickScorecard, type QuickMatch } from '@/api/quickMatch';

/**
 * A cricket quick match's batting and bowling cards, read again whenever the
 * score moves. Every delivery and every undo changes a part of the key, and
 * `useQuickMatch` already receives each one as a `quick:update` push. A failed
 * read keeps the last card: the score band reads `liveState` regardless.
 */
export function useQuickScorecard(match: QuickMatch | null): Scorecard | null {
  const [card, setCard] = useState<Scorecard | null>(null);
  const id = match?._id;
  const live = match?.liveState;
  const key = match && match.sport === 'cricket' && match.status !== 'waiting'
    ? [match.status, live?.currentInnings, live?.runs, live?.wickets, live?.completedOvers, live?.ballsInCurrentOver].join(':')
    : null;

  useEffect(() => {
    if (!id || key === null) return;
    let alive = true;
    getQuickScorecard(id).then((next) => { if (alive) setCard(next); }).catch(() => undefined);
    return () => { alive = false; };
  }, [id, key]);

  return card;
}
```

- [ ] **Step 4: Run to verify they pass.**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/quickCricketApi.test.ts __tests__/useQuickScorecard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Gates and commit.**

```bash
cd /d/kria/mobile && pwd && npx tsc --noEmit && npx eslint src/api/quickMatch.ts src/lib/useQuickScorecard.ts __tests__/quickCricketApi.test.ts __tests__/useQuickScorecard.test.tsx
git add src/api/quickMatch.ts src/lib/useQuickScorecard.ts __tests__/quickCricketApi.test.ts __tests__/useQuickScorecard.test.tsx && git commit -m "feat quick cricket screen reads the match scorecard and re-reads it as the score moves"
```

---

### Task 4: `QuickCricketLive`, the view everyone sees

**Files:**
- Modify: `D:\kria\mobile\src\lib\quickCricketView.ts` (append `tossLine`)
- Modify: `D:\kria\mobile\src\components\cricket\HeroScore.tsx`
- Create: `D:\kria\mobile\src\components\quick\QuickCricketLive.tsx`
- Modify: `D:\kria\mobile\test-utils\colourLiterals.ts` (`MIGRATED`)
- Test: `__tests__/quickCricketView.test.ts` (append), `__tests__/HeroScore.test.tsx` (create),
  `__tests__/QuickCricketLive.test.tsx` (create)

**Interfaces:**
- Consumes: `Scorecard` (`@/api/cricketMatch`), `panelFor` and `cricketOutcomeLabel`
  (`@/lib/quickCricketView`, existing).
- Produces:
  - `tossLine(match: QuickMatch): string | null`.
  - `HeroScore` props:
    `match: { matchConfig?: { maxOvers?: number }; teams?: { team1Id?: string; team2Id?: string; team1Name?: string; team2Name?: string }; winnerId?: string; result?: { marginOfVictory?: string } }`,
    plus `resultLabel?: string`.
  - `QuickCricketLive({ match, scorecard, playerId }: { match: QuickMatch; scorecard: Scorecard | null; playerId?: string })`.

- [ ] **Step 1: Write the failing tests.**

Append to `__tests__/quickCricketView.test.ts`, and add `tossLine` to its import from
`@/lib/quickCricketView`:

```ts
describe('tossLine', () => {
  const m = (toss: Record<string, unknown>) => ({
    sides: [{ sideId: 's1', name: 'Reds', slots: [] }, { sideId: 's2', name: 'Blues', slots: [] }],
    cricketSetup: { toss, lineupsSet: false, side1Lineup: [], side2Lineup: [] },
  }) as unknown as QuickMatch;

  it('says who won the toss and what they chose', () => {
    expect(tossLine(m({ recorded: true, winnerTeamId: 's2', decision: 'bowl' }))).toBe('Blues won the toss and chose to bowl');
  });

  it('is null until the toss is recorded', () => {
    expect(tossLine(m({ recorded: false }))).toBeNull();
  });
});
```

If `QuickMatch` isn't already imported there, add `import type { QuickMatch } from '@/api/quickMatch';`.

Create `__tests__/HeroScore.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { HeroScore } from '@/components/cricket/HeroScore';
import type { LiveState } from '@/api/cricketMatch';

const live = { runs: 120, wickets: 4, completedOvers: 20, ballsInCurrentOver: 0, currentInnings: 2, matchStatus: 'completed' } as LiveState;
const match = { teams: { team1Id: 't1', team2Id: 't2', team1Name: 'Reds', team2Name: 'Blues' }, winnerId: 't2', result: { marginOfVictory: '6 wickets' } };

it('says who won by default, and a given label instead', () => {
  const { rerender } = render(<HeroScore match={match} live={live} innings={null} completed />);
  expect(screen.getByText('Blues won · 6 wickets')).toBeTruthy();

  rerender(<HeroScore match={match} live={live} innings={null} completed resultLabel="Tied · Reds went through" />);
  expect(screen.getByText('Tied · Reds went through')).toBeTruthy();
  expect(screen.queryByText(/Blues won/)).toBeNull();
});
```

Create `__tests__/QuickCricketLive.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QuickCricketLive } from '@/components/quick/QuickCricketLive';
import type { QuickMatch } from '@/api/quickMatch';
import type { InningsScorecard, Scorecard } from '@/api/cricketMatch';

const sides = [
  { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', playerId: 'p1', displayName: 'Kohli' }, { slotId: 'a2', displayName: 'Rahul' }] },
  { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', playerId: 'p3', displayName: 'Bumrah' }] },
];
const tossed = { toss: { recorded: true, winnerTeamId: 's1', decision: 'bat' }, lineupsSet: true, side1Lineup: [], side2Lineup: [] };
const match = (over: Record<string, unknown> = {}): QuickMatch => ({
  _id: 'm1', hostId: 'p1', sport: 'cricket', joinCode: 'ABC123', status: 'live', sides,
  createdAt: '2026-10-08T00:00:00.000Z', matchConfig: { maxOvers: 20 }, cricketSetup: tossed,
  liveState: {
    runs: 42, wickets: 3, completedOvers: 6, ballsInCurrentOver: 2, currentInnings: 1, matchStatus: 'innings1',
    battingTeamId: 's1', bowlingTeamId: 's2', strikerId: 'a1', nonStrikerId: 'a2', currentBowlerId: 'b1',
  },
  ...over,
}) as unknown as QuickMatch;

const innings1: InningsScorecard = {
  inningsNumber: 1, battingTeamId: 's1', battingTeamName: 'Reds', bowlingTeamId: 's2', bowlingTeamName: 'Blues',
  totals: { runs: 42, wickets: 3, overs: '6.2', extras: { wides: 1, noBalls: 0, byes: 0, legByes: 0, total: 1 } },
  battingCard: [
    { registrationId: 'a1', name: 'Kohli', runs: 20, ballsFaced: 15, fours: 2, sixes: 0, strikeRate: 133.3 },
    { registrationId: 'a2', name: 'Rahul', runs: 5, ballsFaced: 9, fours: 0, sixes: 0, strikeRate: 55.6 },
  ],
  bowlingCard: [{ registrationId: 'b1', name: 'Bumrah', overs: '6.2', maidens: 0, runs: 42, wickets: 3, economy: 6.6 }],
  oversTimeline: [], currentPartnership: null, fallOfWickets: [], partnerships: [],
};
const card: Scorecard = { innings1, innings2: null };

it('shows the score band, the toss and who is at the crease', () => {
  render(<QuickCricketLive match={match()} scorecard={card} />);
  expect(screen.getByText('Reds won the toss and chose to bat')).toBeTruthy();
  expect(screen.getByText('Reds batting')).toBeTruthy();
  expect(screen.getByText('Kohli')).toBeTruthy();
  expect(screen.getByText('20 (15)')).toBeTruthy();
  expect(screen.getByText('Bumrah')).toBeTruthy();
});

it('switches to the full scorecard', () => {
  render(<QuickCricketLive match={match()} scorecard={card} />);
  expect(screen.queryByText('Stands')).toBeNull();
  fireEvent.press(screen.getByText('Scorecard'));
  expect(screen.getByText('Stands')).toBeTruthy();
});

it('still shows the score with no scorecard, and offers no Scorecard tab', () => {
  render(<QuickCricketLive match={match()} scorecard={null} />);
  expect(screen.getByText('Reds v Blues')).toBeTruthy();
  expect(screen.queryByText('Scorecard')).toBeNull();
});

it('opens a finished match on its scorecard, with the result', () => {
  render(<QuickCricketLive match={match({ status: 'completed', outcome: 'side1' })} scorecard={card} />);
  expect(screen.getByText('Reds won')).toBeTruthy();
  expect(screen.getByText('Stands')).toBeTruthy();
});

it('says a cancelled match was cancelled', () => {
  render(<QuickCricketLive match={match({ status: 'cancelled' })} scorecard={null} />);
  expect(screen.getByText('Match cancelled')).toBeTruthy();
});

it('before the toss, shows the squads and marks the viewer', () => {
  const setup = { toss: { recorded: false }, lineupsSet: false, side1Lineup: [], side2Lineup: [] };
  render(<QuickCricketLive match={match({ cricketSetup: setup, liveState: undefined })} scorecard={null} playerId="p3" />);
  expect(screen.getByText('Waiting for the toss')).toBeTruthy();
  expect(screen.getByText('Squads')).toBeTruthy();
  expect(screen.getByText('Kohli')).toBeTruthy();
  expect(screen.getByText('Bumrah (you)')).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify they fail.**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/quickCricketView.test.ts __tests__/HeroScore.test.tsx __tests__/QuickCricketLive.test.tsx`
Expected: FAIL. `tossLine` is not a function, the `resultLabel` text isn't found, and
`QuickCricketLive` can't be found.

- [ ] **Step 3: `tossLine`.** Append to `src/lib/quickCricketView.ts`:

```ts
/** "Reds won the toss and chose to bat", or null until the toss is recorded. */
export function tossLine(match: QuickMatch): string | null {
  const toss = match.cricketSetup?.toss;
  const winner = match.sides.find((s) => s.sideId === toss?.winnerTeamId);
  if (!toss?.recorded || !winner || !toss.decision) return null;
  return `${winner.name} won the toss and chose to ${toss.decision}`;
}
```

- [ ] **Step 4: `HeroScore`.** In `src/components/cricket/HeroScore.tsx`:

  - Change the import to `import { InningsScorecard, LiveState, TeamBrand } from '@/api/cricketMatch';`
    (`CricketMatch` is no longer used).
  - Add above the component:

```tsx
/** The fields read here: a tournament CricketMatch, or one a quick match builds from its sides. */
type HeroMatch = {
  matchConfig?: { maxOvers?: number };
  teams?: { team1Id?: string; team2Id?: string; team1Name?: string; team2Name?: string };
  winnerId?: string;
  result?: { marginOfVictory?: string };
};
```

  - Change the props: `match: CricketMatch;` becomes `match: HeroMatch;`, add
    `resultLabel?: string;` to the prop type, and add `resultLabel,` to the destructuring after
    `brands = {},`.
  - Replace the two children of the result `<Text>` (the
    `{winnerName ? `${winnerName} won` : 'Match complete'}` line and the
    `{match.result?.marginOfVictory ? … : ''}` line) with one expression:

```tsx
            {resultLabel ?? `${winnerName ? `${winnerName} won` : 'Match complete'}${match.result?.marginOfVictory ? ` · ${match.result.marginOfVictory}` : ''}`}
```

- [ ] **Step 5: `QuickCricketLive`.** Create `src/components/quick/QuickCricketLive.tsx`:

```tsx
import { useState } from 'react';
import { View, Text } from 'react-native';
import type { Scorecard } from '@/api/cricketMatch';
import type { QuickMatch } from '@/api/quickMatch';
import { Chip } from '@/components/canvas';
import { HeroScore } from '@/components/cricket/HeroScore';
import { AtTheCrease } from '@/components/cricket/AtTheCrease';
import { RecentOvers } from '@/components/cricket/RecentOvers';
import { ScorecardTabs } from '@/components/cricket/ScorecardTabs';
import { Innings1Panel, MatchStateBanner, PartnershipCard } from '@/components/cricket/LivePanels';
import { cricketOutcomeLabel, panelFor, tossLine } from '@/lib/quickCricketView';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';

const label = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });

type Section = 'live' | 'card';

/**
 * What everyone sees of a cricket quick match, host included: the toss and
 * squads while it is set up, then the tournament live screen's parts — score
 * band, at the crease, overs, and the scorecard. View only; the host's pad
 * sits under the screen's scroll.
 */
export function QuickCricketLive({ match, scorecard, playerId }: { match: QuickMatch; scorecard: Scorecard | null; playerId?: string }) {
  const t = useTheme();
  const [section, setSection] = useState<Section | null>(null);
  const toss = tossLine(match);

  if (panelFor(match) === 'cricket-setup') {
    return (
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.textBody }}>{toss ?? 'Waiting for the toss'}</Text>
        <Text style={label(t)}>Squads</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {match.sides.map((side) => (
            <View key={side.sideId} style={{ flex: 1, padding: 12, gap: 6, borderRadius: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface }}>
              <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', fontSize: 16, lineHeight: 20, textTransform: 'uppercase', color: t.text }}>{side.name}</Text>
              {side.slots.map((slot) => {
                const you = Boolean(playerId) && slot.playerId === playerId;
                return (
                  <Text key={slot.slotId} numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: you ? t.brandInk : t.textBody }}>
                    {you ? `${slot.displayName} (you)` : slot.displayName}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  }

  const live = match.liveState ?? null;
  const completed = match.status === 'completed';
  const currentInnings = (live?.currentInnings ?? 1) as 1 | 2;
  const innings = (currentInnings === 1 ? scorecard?.innings1 : scorecard?.innings2) ?? null;
  const hasCard = Boolean(scorecard?.innings1 || scorecard?.innings2);
  // A finished match opens on its scorecard; the live parts are history by then.
  const active: Section = hasCard ? (section ?? (completed ? 'card' : 'live')) : 'live';
  const [side1, side2] = match.sides;

  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      {toss ? <Text style={{ ...label(t), color: t.textMeta }}>{toss}</Text> : null}
      {match.status === 'cancelled' ? <Text style={{ ...label(t), color: t.failInk }}>Match cancelled</Text> : null}
      <HeroScore
        match={{ matchConfig: match.matchConfig, teams: { team1Name: side1.name, team2Name: side2.name } }}
        live={live}
        innings={innings}
        completed={completed}
        resultLabel={cricketOutcomeLabel(match) ?? undefined}
      />
      {match.status === 'live' ? <MatchStateBanner live={live} /> : null}
      {hasCard ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip label="Live" selected={active === 'live'} onPress={() => setSection('live')} />
          <Chip label="Scorecard" selected={active === 'card'} onPress={() => setSection('card')} />
        </View>
      ) : null}
      {active === 'live' ? (
        <>
          <AtTheCrease live={live} innings={innings} />
          <PartnershipCard partnership={innings?.currentPartnership ?? null} />
          <Innings1Panel innings1={scorecard?.innings1 ?? null} live={live} />
          <RecentOvers innings={innings} />
        </>
      ) : (
        <ScorecardTabs innings1={scorecard?.innings1 ?? null} innings2={scorecard?.innings2 ?? null} currentInnings={currentInnings} live={live} />
      )}
    </View>
  );
}
```

- [ ] **Step 6: Colour fence.** Append `'src/components/quick/QuickCricketLive.tsx',` to
  `MIGRATED` in `test-utils/colourLiterals.ts`.

- [ ] **Step 7: Run to verify everything passes, the fences included.**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/quickCricketView.test.ts __tests__/HeroScore.test.tsx __tests__/QuickCricketLive.test.tsx __tests__/paletteFences.test.ts __tests__/fontLeadingFence.test.ts __tests__/pressableStyleFence.test.ts`
Expected: PASS. If a `getByText` finds several matches, read the rendered tree
(`screen.debug()`) and narrow the query. Don't loosen the behaviour.

- [ ] **Step 8: Gates and commit.**

```bash
cd /d/kria/mobile && pwd && npx tsc --noEmit && npx eslint src/lib/quickCricketView.ts src/components/cricket/HeroScore.tsx src/components/quick/QuickCricketLive.tsx test-utils/colourLiterals.ts __tests__/quickCricketView.test.ts __tests__/HeroScore.test.tsx __tests__/QuickCricketLive.test.tsx
git add src/lib/quickCricketView.ts src/components/cricket/HeroScore.tsx src/components/quick/QuickCricketLive.tsx test-utils/colourLiterals.ts __tests__/quickCricketView.test.ts __tests__/HeroScore.test.tsx __tests__/QuickCricketLive.test.tsx && git commit -m "feat quick cricket live view with score band, at the crease and scorecard for everyone"
```

---

### Task 5: The pinned scoring pad, `CricketHostTools`, and the screen

One task on purpose. Once the pad stops rendering a finished match's result, the screen must
show it through `QuickCricketLive` in the same commit, or the existing screen test "shows who
went through once picked" goes red.

**Files:**
- Modify (rewrite the render; keep the logic): `D:\kria\mobile\src\components\quick\CricketScorePanel.tsx`
- Modify: `D:\kria\mobile\src\app\quick\[id].tsx`
- Modify: `test-utils/colourLiterals.ts` (`MIGRATED`)
- Test: modify `__tests__/CricketScorePanel.test.tsx`, `__tests__/CricketPanelAffordances.test.tsx`,
  `__tests__/CricketExtrasWicket.test.tsx`, `__tests__/CricketDismissedBatsman.test.tsx` and
  `__tests__/QuickMatchScreen.test.tsx`; create `__tests__/CricketHostTools.test.tsx`

**Interfaces:**
- Consumes:
  - `useQuickScorecard` (Task 3)
  - `QuickCricketLive` (Task 4)
  - `Tag` from `@/components/StatusPill`, with `variant="live"`
  - `CricketSetupPanel` as it stands. Task 6 rewrites it later, with a prop type the screen
    already satisfies.
- Produces:
  - `CricketScorePanel({ match, playerId, busy, problem, onBall, onUndo }: { match: QuickMatch; playerId?: string; busy: boolean; problem?: string; onBall: (entry: BallEntry) => void; onUndo: () => void })`.
    `onCancel` is removed. It renders `null` unless the viewer is the host and
    `match.status === 'live'`.
  - `CricketHostTools({ match, playerId, busy, onCancel }: { match: QuickMatch; playerId?: string; busy: boolean; onCancel: () => void })`,
    exported from the same file. It renders `null` for a non-host, a knockout match
    (`knockoutId`), or a match that isn't live.

- [ ] **Step 1: Drop the removed prop from the tests.**

```bash
cd /d/kria/mobile && pwd && sed -i 's/ onCancel={jest.fn()}//g' __tests__/CricketScorePanel.test.tsx __tests__/CricketExtrasWicket.test.tsx __tests__/CricketDismissedBatsman.test.tsx __tests__/CricketPanelAffordances.test.tsx && grep -c "onCancel" __tests__/CricketScorePanel.test.tsx
```

Expected: `1`. The one left is `onCancel={onCancel}` in the cancel test that Step 2 deletes.

- [ ] **Step 2: Rewrite the tests that pinned the old panel.** In `__tests__/CricketScorePanel.test.tsx`:

  - **Delete** `it('shows the score line', …)` and `it('shows the chase line in the second innings', …)`.
    The score band now lives in `QuickCricketLive` (Task 4).
  - **Delete** `it('lets the host cancel the match', …)`, `it('gives a non-host no cancel control', …)`
    and `it('a knockout match offers no cancel and no join code — the knockout manages it', …)`.
    They move to `CricketHostTools.test.tsx` below.
  - **Replace** `it('shows the outcome and no controls once completed', …)` with:

```tsx
  it('renders nothing once completed — the result shows in the live view', () => {
    const { toJSON } = render(
      <CricketScorePanel
        match={live({ ...midInnings, matchStatus: 'completed' }, { status: 'completed', outcome: 'side1' })}
        playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()}
      />
    );
    expect(toJSON()).toBeNull();
  });
```

  - **Replace** `it('gives a non-host the score and no controls', …)` with:

```tsx
  it('renders nothing for a non-host', () => {
    const { toJSON } = render(
      <CricketScorePanel match={live(midInnings)} playerId="someone-else" busy={false} onBall={jest.fn()} onUndo={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });
```

  - **Add**, before the final `});` of the describe:

```tsx
  it('names the striker and the bowler above the keys', () => {
    const { getByText } = render(
      <CricketScorePanel match={live(midInnings)} playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()} />
    );
    expect(getByText('Kohli on strike · Bumrah bowling')).toBeTruthy();
  });

  it('hides Undo when there is nothing to undo', () => {
    const { queryByText } = render(
      <CricketScorePanel match={live({ ...midInnings, matchStatus: undefined })} playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()} />
    );
    expect(queryByText('Extras')).toBeTruthy();
    expect(queryByText('Undo')).toBeNull();
  });

  it('shows a refused delivery at the top of the pad, where the host is looking', () => {
    const { getByText } = render(
      <CricketScorePanel match={live(midInnings)} playerId="host" busy={false} problem="That bowler has no overs left." onBall={jest.fn()} onUndo={jest.fn()} />
    );
    expect(getByText('That bowler has no overs left.')).toBeTruthy();
  });
```

In `__tests__/CricketPanelAffordances.test.tsx`, **delete** the whole
`describe('the cricket panel surfaces the join code, as badminton does', …)` block. It moves to
the new file.

Create `__tests__/CricketHostTools.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CricketHostTools } from '@/components/quick/CricketScorePanel';
import type { QuickMatch } from '@/api/quickMatch';

const open = [
  { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', playerId: 'host', displayName: 'Kohli' }] },
  { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'Bumrah' }] },
];
const full = [open[0], { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', playerId: 'p2', displayName: 'Bumrah' }] }];
const match = (over: Record<string, unknown> = {}): QuickMatch => ({
  _id: 'm1', hostId: 'host', sport: 'cricket', joinCode: 'ABC123', status: 'live', sides: open,
  createdAt: '2026-09-10T00:00:00.000Z', ...over,
}) as unknown as QuickMatch;
const tools = (m: QuickMatch, playerId = 'host', onCancel = jest.fn(), busy = false) =>
  render(<CricketHostTools match={m} playerId={playerId} busy={busy} onCancel={onCancel} />);

it('shows the code while a slot is open, and not once every slot is taken', () => {
  const view = tools(match());
  expect(screen.getByTestId('join-code')).toBeTruthy();
  expect(screen.getByText('ABC123')).toBeTruthy();
  view.unmount();

  tools(match({ sides: full }));
  expect(screen.queryByText('ABC123')).toBeNull();
});

it('lets the host cancel, but not mid-request', () => {
  const onCancel = jest.fn();
  const view = tools(match(), 'host', onCancel, true);
  fireEvent.press(screen.getByText('Cancel match'));
  expect(onCancel).not.toHaveBeenCalled();
  view.unmount();

  tools(match(), 'host', onCancel);
  fireEvent.press(screen.getByText('Cancel match'));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('gives a non-host, a knockout match and a finished match nothing', () => {
  expect(tools(match(), 'someone-else').toJSON()).toBeNull();
  expect(tools(match({ knockoutId: 'k1' })).toJSON()).toBeNull();
  expect(tools(match({ status: 'completed' })).toJSON()).toBeNull();
});
```

- [ ] **Step 3: Run to verify the new tests fail.**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/CricketScorePanel.test.tsx __tests__/CricketHostTools.test.tsx __tests__/CricketPanelAffordances.test.tsx __tests__/CricketExtrasWicket.test.tsx __tests__/CricketDismissedBatsman.test.tsx`
Expected: FAIL in "renders nothing once completed", "renders nothing for a non-host", "names the
striker…", "shows a refused delivery…", and every `CricketHostTools` test (export missing).
"hides Undo…" already passes, because today's rule is the same; it pins that rule through the
rewrite. All the step and picker tests pass.

- [ ] **Step 4: Implement.** In `src/components/quick/CricketScorePanel.tsx`:

**(a)** Replace everything from the top of the file down to the end of the `Btn` function
(lines 1–45) with:

```tsx
import { useState, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BallEntry, QuickMatch, QuickMatchSlot, WicketType } from '@/api/quickMatch';
import { freeSlots } from '@/lib/quickMatchView';
import { battingSideId, bowlingSideId, canUndoBall, isFirstBallOfInnings, whoIsNeeded } from '@/lib/quickCricketView';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';

const label = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });
const button = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase' as const };

// Key faces, as literal objects so the font-leading fence can read them.
const RUN_FACE = { fontFamily: 'Anton_400Regular' as const, fontSize: 24, lineHeight: 29, textTransform: 'uppercase' as const };
const WORD_FACE = { fontFamily: 'Anton_400Regular' as const, fontSize: 16, lineHeight: 20, textTransform: 'uppercase' as const };
const NAME_FACE = { fontFamily: 'SpaceGrotesk_700Bold' as const, fontSize: 14 };
const FACES = { run: RUN_FACE, word: WORD_FACE, name: NAME_FACE };

/** One key on the pad. `onPress` is undefined while busy, as every control here has always been. */
function Key({ text, face = 'word', height = 48, brand, onPress }: {
  text: string; face?: keyof typeof FACES; height?: number; brand?: boolean; onPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ flex: 1, minHeight: height, paddingHorizontal: 6, borderRadius: 5, borderWidth: 1.5, borderColor: brand ? t.brand : t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text numberOfLines={1} style={{ ...FACES[face], color: brand ? t.brandInk : t.text }}>{text}</Text>
    </Pressable>
  );
}

/** Keys in rows of `cols`; a short last row keeps the same key width. */
function Grid({ cols, keys }: { cols: number; keys: ReactNode[] }) {
  const rows: ReactNode[][] = [];
  keys.forEach((key, i) => {
    if (i % cols === 0) rows.push([]);
    rows[rows.length - 1].push(key);
  });
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
          {row}
          {Array.from({ length: cols - row.length }, (_, i) => <View key={`gap-${i}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
}

/**
 * The host's match-level controls, in the screen's scroll rather than the pad:
 * the join code while a slot is open, and Cancel. A knockout match has
 * neither — the knockout manages it, as badminton's MatchPanel rules.
 */
export function CricketHostTools({ match, playerId, busy, onCancel }: {
  match: QuickMatch; playerId?: string; busy: boolean; onCancel: () => void;
}) {
  const t = useTheme();
  const isHost = Boolean(playerId) && playerId === match.hostId;
  if (!isHost || match.knockoutId || match.status !== 'live') return null;
  const code = freeSlots(match).length > 0 ? match.joinCode : undefined;
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 24, gap: 14 }}>
      {code ? (
        <View>
          <Text style={label(t)}>Share this code to fill the open slots</Text>
          <Text testID="join-code" selectable style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 24, letterSpacing: 0.2 * 24, color: t.brandInk, marginTop: 4 }}>{code}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={busy ? undefined : onCancel}
        style={{ minHeight: 48, borderRadius: 5, borderWidth: 1.5, borderColor: t.fail, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
      >
        <Text style={{ ...button, color: t.failInk }}>Cancel match</Text>
      </Pressable>
    </View>
  );
}
```

Keep `EXTRAS`, `WICKETS`, `FIELDER_TYPES`, `EITHER_END_TYPES`, `EXTRAS_RUNS` and the types
unchanged. Replace the doc comment above `CricketScorePanel` with:

```tsx
/**
 * The host's scoring pad, pinned under the screen's scroll: a name-picking
 * prompt (first ball of an innings, or whenever the engine asks for a new
 * batsman/bowler), the run keys, or one entry step at a time. `recordBall`
 * needs batsmanOnStrikeId/nonStrikerId/bowlerId on every delivery; mid-innings
 * they come from `liveState`, but on the first ball and whenever
 * `nextBatsmanNeeded` / `nextBowlerNeeded` fires there is no id to read yet,
 * so the pad collects them before any run key is reachable. The score itself
 * shows in QuickCricketLive; Cancel and the join code in CricketHostTools.
 */
```

**(b)** Replace the component's signature and its opening, from `export function CricketScorePanel(`
down to and including the `if (!isHost) { return <View>{header}</View>; }` block, with the code
below. That removes `managed`, `score`, `chase`, `openSlots`, `joinCodeRow`, `header` and the
outcome branch. Keep all the `useState` lines in between exactly as they are.

```tsx
export function CricketScorePanel({ match, playerId, busy, problem, onBall, onUndo }: {
  match: QuickMatch;
  playerId?: string;
  busy: boolean;
  /** A refused delivery's reason, shown where the host is looking. */
  problem?: string;
  onBall: (entry: BallEntry) => void;
  onUndo: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // …the existing useState lines, unchanged…

  const isHost = Boolean(playerId) && playerId === match.hostId;
  if (!isHost || match.status !== 'live') return null;

  // Dimmed while a delivery is in flight; every key's onPress is already
  // undefined then.
  const shell = (title: string | null, body: ReactNode, context?: string) => (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 + insets.bottom, gap: 10, borderTopWidth: 1.5, borderTopColor: t.lineSoft, backgroundColor: t.bg, opacity: busy ? 0.5 : 1 }}>
      {problem ? <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: t.failInk }}>{problem}</Text> : null}
      {context ? <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: t.textMeta }}>{context}</Text> : null}
      {title ? <Text style={label(t)}>{title}</Text> : null}
      {body}
    </View>
  );
  const nameKeys = (slots: QuickMatchSlot[], pick: (slotId: string) => void) => (
    <Grid cols={2} keys={slots.map((slot) => (
      <Key key={slot.slotId} text={slot.displayName} face="name" height={52} onPress={busy ? undefined : () => pick(slot.slotId)} />
    ))} />
  );
```

**(c)** Delete the `cancelRow` constant and its comment block.

**(d)** Replace the three picker `return (…)` blocks inside `if (promptOutstanding) { … }`.
Keep every line before them (the `needs…`/`excluded…`/`dismissed`/`available` logic) as it is.

```tsx
    if (needsStriker && !pending.strikerId) {
      return shell('Who is on strike?', nameKeys(
        battingLineup.filter((slot) => available(slot.slotId, excludedFromStriker)),
        (slotId) => setPending((p) => ({ ...p, strikerId: slotId })),
      ));
    }

    if (needsNonStriker && !pending.nonStrikerId) {
      return shell('Who is at the non-striker\'s end?', nameKeys(
        battingLineup.filter((slot) => available(slot.slotId, excludedFromNonStriker)),
        (slotId) => setPending((p) => ({ ...p, nonStrikerId: slotId })),
      ));
    }

    if (needsBowler && !pending.bowlerId) {
      return shell('Who is bowling?', nameKeys(bowlingLineup, (slotId) => setPending((p) => ({ ...p, bowlerId: slotId }))));
    }
```

**(e)** Replace `const backBtn = <Btn label="Back" disabled={busy} onPress={busy ? undefined : back} />;`
with:

```tsx
  const backKey = <Key key="back" text="Back" onPress={busy ? undefined : back} />;
```

**(f)** Keep `post`, `strikerName`, `nonStrikerName` and `dismissedChoices` as they are. Replace
the final `return ( <View …> {header} … {cancelRow} </View> );` with:

```tsx
  const bowlerName = bowlingLineup.find((s) => s.slotId === bowlerId)?.displayName;
  const context = [strikerName && `${strikerName} on strike`, bowlerName && `${bowlerName} bowling`].filter(Boolean).join(' · ');

  if (mode === 'extras') {
    return shell('Extra — which kind?', (
      <Grid cols={3} keys={[
        backKey,
        // A run-out off a wide or a bye is routine in casual play, and the
        // server has always accepted both fields on one ball. Armed here rather
        // than asked afterwards so the extra-only case takes the same taps.
        <Key key="also" text={alsoWicket ? '✓ Wicket too' : '+ Wicket too'} onPress={busy ? undefined : () => setAlsoWicket((on) => !on)} />,
        ...EXTRAS.map((e) => (
          <Key key={e.type} text={e.label} onPress={busy ? undefined : () => { setChosenExtrasType(e.type); setMode('extras-runs'); }} />
        )),
      ]} />
    ), context);
  }

  if (mode === 'extras-runs' && chosenExtrasType) {
    const kind = EXTRAS.find((e) => e.type === chosenExtrasType)?.label ?? 'Extra';
    return shell(`${kind} — how many runs?`, (
      <Grid cols={4} keys={[
        backKey,
        ...EXTRAS_RUNS.map((n) => (
          <Key key={n} text={String(n)} face="run" height={56} onPress={busy ? undefined : () => {
            if (!alsoWicket) {
              post({ extrasType: chosenExtrasType, extrasRuns: n });
              return;
            }
            setPendingExtras({ extrasType: chosenExtrasType, extrasRuns: n });
            setMode('wicket');
          }} />
        )),
      ]} />
    ), context);
  }

  if (mode === 'wicket') {
    return shell('How out?', (
      <Grid cols={3} keys={[
        backKey,
        ...WICKETS.map((w) => (
          <Key key={w.type} text={w.label} onPress={busy ? undefined : () => {
            if (EITHER_END_TYPES.includes(w.type)) {
              setChosenWicketType(w.type);
              setMode('wicket-who');
              return;
            }
            if (FIELDER_TYPES.includes(w.type)) {
              setChosenWicketType(w.type);
              setMode('fielder');
              return;
            }
            post({ wicketType: w.type, dismissedPlayerId: strikerId });
          }} />
        )),
      ]} />
    ), context);
  }

  if (mode === 'wicket-who' && chosenWicketType) {
    return shell('Who was dismissed?', (
      <Grid cols={2} keys={[
        backKey,
        ...dismissedChoices.map((choice) => (
          <Key key={choice.id} text={choice.label} face="name" height={52} onPress={busy ? undefined : () => {
            setChosenDismissedId(choice.id);
            // run_out is also a fielding action; retired_hurt is not.
            if (chosenWicketType === 'run_out') {
              setMode('fielder');
              return;
            }
            post({ wicketType: chosenWicketType, dismissedPlayerId: choice.id });
          }} />
        )),
      ]} />
    ), context);
  }

  if (mode === 'fielder' && chosenWicketType) {
    return shell('Who fielded?', (
      <Grid cols={2} keys={[
        backKey,
        ...bowlingLineup.map((slot) => (
          <Key key={slot.slotId} text={slot.displayName} face="name" height={52} onPress={busy ? undefined : () => post({
            wicketType: chosenWicketType,
            dismissedPlayerId: chosenDismissedId ?? strikerId,
            fielderId: slot.slotId,
          })} />
        )),
      ]} />
    ), context);
  }

  return shell(null, (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[0, 1, 2, 3].map((n) => <Key key={n} text={String(n)} face="run" height={56} onPress={busy ? undefined : () => post({ runs: n })} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[4, 6].map((n) => <Key key={n} text={String(n)} face="run" height={56} brand onPress={busy ? undefined : () => post({ runs: n })} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Key text="Extras" onPress={busy ? undefined : () => setMode('extras')} />
        <Key text="Wicket" onPress={busy ? undefined : () => setMode('wicket')} />
        {canUndoBall(match) ? <Key text="Undo" onPress={busy ? undefined : () => onUndo()} /> : null}
      </View>
    </View>
  ), context);
}
```

**(g)** `HAIRLINE` and `LBL` are now unused, so delete them. The file must contain no colour
literals.

**(h)** Append `'src/components/quick/CricketScorePanel.tsx',` to `MIGRATED` in
`test-utils/colourLiterals.ts`.

- [ ] **Step 5: Run the pad tests.**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/CricketScorePanel.test.tsx __tests__/CricketHostTools.test.tsx __tests__/CricketPanelAffordances.test.tsx __tests__/CricketExtrasWicket.test.tsx __tests__/CricketDismissedBatsman.test.tsx __tests__/paletteFences.test.ts __tests__/fontLeadingFence.test.ts __tests__/pressableStyleFence.test.ts`
Expected: PASS. Don't commit yet: the screen still passes `onCancel` and still renders the pad
inside its scroll.

- [ ] **Step 6: Write the failing screen tests.** In `__tests__/QuickMatchScreen.test.tsx`:

  - After the existing `jest.mock('@/lib/useQuickMatch', …)` block, add:

```tsx
jest.mock('@/lib/useQuickScorecard', () => ({ useQuickScorecard: () => null }));
```

  - Append at the end of the file:

```tsx
describe('a live cricket match', () => {
  const cricket = {
    sport: 'cricket', matchConfig: { maxOvers: 5 },
    sides: [
      { sideId: 's1', name: 'Arjun', slots: [{ slotId: 'a1', playerId: 'h1', displayName: 'Arjun Mehta' }, { slotId: 'a2', displayName: 'Open seat' }] },
      { sideId: 's2', name: 'Rahul', slots: [{ slotId: 'b1', playerId: 'p2', displayName: 'Rahul Singh' }] },
    ],
    cricketSetup: { toss: { recorded: true, winnerTeamId: 's1', decision: 'bat' }, lineupsSet: true, side1Lineup: [], side2Lineup: [] },
    liveState: {
      matchStatus: 'innings1', currentInnings: 1, runs: 12, wickets: 1, completedOvers: 2, ballsInCurrentOver: 3,
      battingTeamId: 's1', bowlingTeamId: 's2', strikerId: 'a1', nonStrikerId: 'a2', currentBowlerId: 'b1',
    },
  };
  beforeEach(() => { mockStatus = 'live'; mockMatchOver = cricket; });
  const scroll = () => screen.UNSAFE_getAllByType(ScrollView)[0];

  it('names both sides and the overs in the header', () => {
    mockViewer = 'h1';
    render(<QuickMatchScreen />);
    // The header, and the score band (which names both sides until the scorecard arrives).
    expect(screen.getAllByText('Arjun v Rahul')).toHaveLength(2);
    expect(within(scroll()).getAllByText('Arjun v Rahul')).toHaveLength(1);
    expect(screen.getByText('5 overs a side')).toBeTruthy();
  });

  it('pins the pad outside the scroll for the host', () => {
    mockViewer = 'h1';
    render(<QuickMatchScreen />);
    expect(screen.getByText('Extras')).toBeTruthy();
    expect(within(scroll()).queryByText('Extras')).toBeNull();
  });

  it('gives a watcher the live view and no pad', () => {
    mockViewer = 'p2';
    render(<QuickMatchScreen />);
    expect(screen.getByText('Arjun won the toss and chose to bat')).toBeTruthy();
    expect(screen.queryByText('Extras')).toBeNull();
  });

  it('shows a refused delivery once, in the pad', () => {
    mockViewer = 'h1';
    mockProblem = 'That bowler has no overs left.';
    render(<QuickMatchScreen />);
    expect(screen.getAllByText('That bowler has no overs left.')).toHaveLength(1);
    expect(within(scroll()).queryByText('That bowler has no overs left.')).toBeNull();
  });

  it('keeps Cancel and the join code in the scroll for an ordinary match', () => {
    mockViewer = 'h1';
    render(<QuickMatchScreen />);
    expect(within(scroll()).getByText('Cancel match')).toBeTruthy();
    expect(within(scroll()).getByTestId('join-code')).toBeTruthy();
  });

  it('a knockout match has neither', () => {
    mockViewer = 'h1';
    mockKnockoutId = 'k1';
    render(<QuickMatchScreen />);
    expect(screen.queryByText('Cancel match')).toBeNull();
    expect(screen.queryByTestId('join-code')).toBeNull();
  });
});
```

- [ ] **Step 7: Run to verify they fail.**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/QuickMatchScreen.test.tsx`
Expected: FAIL in the new describe: no "Arjun v Rahul", no toss line, no Cancel or join code.
"shows who went through once picked" also fails now, because the pad no longer prints the
result. Step 8 brings it back through the score band.

- [ ] **Step 8: Wire the screen.** In `src/app/quick/[id].tsx`:

**(a)** Change the imports:
  - Replace `import { CricketScorePanel } from '@/components/quick/CricketScorePanel';` with
    `import { CricketHostTools, CricketScorePanel } from '@/components/quick/CricketScorePanel';`
  - Add:

```tsx
import { QuickCricketLive } from '@/components/quick/QuickCricketLive';
import { Tag } from '@/components/StatusPill';
import { useQuickScorecard } from '@/lib/useQuickScorecard';
```

**(b)** After the `useQuickMatch(id)` destructuring, add:

```tsx
  const scorecard = useQuickScorecard(match);
  // A cricket match past its waiting room gets the live view, the sides in
  // the header, and, for its host, the pinned pad.
  const cricket = match && match.sport === 'cricket' && match.status !== 'waiting' ? match : null;
  const padShown = Boolean(cricket && panelFor(cricket) === 'cricket-score' && cricket.status === 'live' && isHost(cricket, user?._id));
```

**(c)** Replace the header `<View …>` (the row holding "Back" and "Quick match") with:

```tsx
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <Pressable onPress={() => goBack(router, '/quick')} hitSlop={12}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
            Back
          </Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 27, color: '#fff' }}>
            {cricket ? `${cricket.sides[0].name} v ${cricket.sides[1].name}` : 'Quick match'}
          </Text>
          {cricket?.matchConfig?.maxOvers ? (
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 2 }}>
              {`${cricket.matchConfig.maxOvers} overs a side`}
            </Text>
          ) : null}
        </View>
        {cricket?.status === 'live' ? <Tag label="Live" variant="live" dot /> : null}
      </View>
```

**(d)** The problem text shows in the pad when the pad is up. Change `{problem ? (` (the block
at the top of the scroll) to `{problem && !padShown ? (`.

**(e)** Replace the two cricket blocks inside the `ScrollView`, the `panelFor(match) === 'cricket-setup'`
one and the `panelFor(match) === 'cricket-score'` one, with:

```tsx
        {cricket ? <QuickCricketLive match={cricket} scorecard={scorecard} playerId={user?._id} /> : null}

        {match && panelFor(match) === 'cricket-setup' ? (
          <View style={{ marginTop: 16 }}>
            <CricketSetupPanel match={match} playerId={user?._id} busy={busy} onToss={toss} onLineup={lineup} />
          </View>
        ) : null}

        {cricket ? <CricketHostTools match={cricket} playerId={user?._id} busy={busy} onCancel={cancel} /> : null}
```

**(f)** After the closing `</ScrollView>` and before the `StartBar` block, add:

```tsx
      {padShown && match ? (
        <CricketScorePanel match={match} playerId={user?._id} busy={busy} problem={problem} onBall={ball} onUndo={undoBall} />
      ) : null}
```

- [ ] **Step 9: Run to verify the screen passes.**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/QuickMatchScreen.test.tsx`
Expected: PASS, all of it. "shows who went through once picked" now finds
"Tied · Rahul went through" in the score band's result.

- [ ] **Step 10: Full gates.**

```bash
cd /d/kria/mobile && pwd && npx tsc --noEmit && npx eslint src/components/quick/CricketScorePanel.tsx "src/app/quick/[id].tsx" test-utils/colourLiterals.ts __tests__/CricketScorePanel.test.tsx __tests__/CricketHostTools.test.tsx __tests__/CricketPanelAffordances.test.tsx __tests__/CricketExtrasWicket.test.tsx __tests__/CricketDismissedBatsman.test.tsx __tests__/QuickMatchScreen.test.tsx && npx jest 2>&1 | grep -E "✕|Tests:|Test Suites:"
```

Expected: `tsc` clean, eslint clean, and every suite passing. Mention any failure by name.

- [ ] **Step 11: Commit.**

```bash
cd /d/kria/mobile && pwd && git add src/components/quick/CricketScorePanel.tsx "src/app/quick/[id].tsx" test-utils/colourLiterals.ts __tests__/CricketScorePanel.test.tsx __tests__/CricketHostTools.test.tsx __tests__/CricketPanelAffordances.test.tsx __tests__/CricketExtrasWicket.test.tsx __tests__/CricketDismissedBatsman.test.tsx __tests__/QuickMatchScreen.test.tsx && git commit -m "feat quick cricket live view for everyone and a pinned scoring pad for the host"
```

---

### Task 6: Toss cards and the "Confirm teams" fallback (`CricketSetupPanel`)

**Files:**
- Rewrite: `D:\kria\mobile\src\components\quick\CricketSetupPanel.tsx`
- Modify: `test-utils/colourLiterals.ts` (`MIGRATED`)
- Test: rewrite `__tests__/CricketSetupPanel.test.tsx`

**Interfaces:**
- Consumes: `lineupFromSlots` and `setupStage` (`@/lib/quickCricketView`, existing).
- Produces: `CricketSetupPanel({ match, playerId, busy, onToss, onLineup })`, where
  - `onToss: (input: { winnerSideId: string; decision: 'bat' | 'bowl' }) => void`
  - `onLineup: (input: { sideId: string; players: QuickCricketLineupEntry[] }) => Promise<unknown> | void`.
    The panel awaits it between sides.
  - It renders `null` for a non-host.

- [ ] **Step 1: Write the failing tests.** Replace the whole of `__tests__/CricketSetupPanel.test.tsx` with:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { CricketSetupPanel } from '@/components/quick/CricketSetupPanel';
import type { QuickMatch } from '@/api/quickMatch';

const match = (over: Record<string, unknown> = {}): QuickMatch => ({
  _id: 'm1', hostId: 'host', sport: 'cricket', joinCode: 'ABC123', status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', playerId: 'p1', displayName: 'Kohli' }] },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'Guest' }] },
  ],
  createdAt: '2026-09-10T00:00:00.000Z',
  cricketSetup: { toss: { recorded: false }, lineupsSet: false, side1Lineup: [], side2Lineup: [] },
  ...over,
}) as QuickMatch;

/** A toss recorded by an app older than the server filling the squads. */
const tossed = (side1Lineup: unknown[] = []) => match({
  cricketSetup: { toss: { winnerTeamId: 's1', decision: 'bat', recorded: true }, lineupsSet: false, side1Lineup, side2Lineup: [] },
});

const panel = (m: QuickMatch, over: Record<string, unknown> = {}) =>
  render(<CricketSetupPanel match={m} playerId="host" busy={false} onToss={jest.fn()} onLineup={jest.fn()} {...over} />);

describe('the toss', () => {
  it('offers both sides as cards with their player counts', () => {
    panel(match());
    expect(screen.getByText('Toss — who won it?')).toBeTruthy();
    expect(screen.getByText('Reds')).toBeTruthy();
    expect(screen.getByText('Blues')).toBeTruthy();
    expect(screen.getAllByText('1 players')).toHaveLength(2);
    expect(screen.queryByText(/^bat$/i)).toBeNull();
  });

  it('reports the picked side and decision', () => {
    const onToss = jest.fn();
    panel(match(), { onToss });
    fireEvent.press(screen.getByText('Reds'));
    expect(screen.getByText('Reds chose to…')).toBeTruthy();
    fireEvent.press(screen.getByText(/^bat$/i));
    expect(onToss).toHaveBeenCalledWith({ winnerSideId: 's1', decision: 'bat' });
  });

  it('switches the pick when the other card is tapped', () => {
    const onToss = jest.fn();
    panel(match(), { onToss });
    fireEvent.press(screen.getByText('Reds'));
    fireEvent.press(screen.getByText('Blues'));
    fireEvent.press(screen.getByText(/^bowl$/i));
    expect(onToss).toHaveBeenCalledWith({ winnerSideId: 's2', decision: 'bowl' });
  });

  it('records nothing while a request is in flight', () => {
    const onToss = jest.fn();
    panel(match(), { onToss, busy: true });
    fireEvent.press(screen.getByText('Reds'));
    fireEvent.press(screen.getByText(/^bat$/i));
    expect(onToss).not.toHaveBeenCalled();
  });

  it('gives a non-host nothing — their setup view is the live view', () => {
    expect(panel(match(), { playerId: 'someone-else' }).toJSON()).toBeNull();
  });
});

describe('a toss recorded before the squads were filled for it', () => {
  it('asks to confirm the teams instead of the toss', () => {
    panel(tossed());
    expect(screen.getByText('Confirm teams')).toBeTruthy();
    expect(screen.queryByText('Toss — who won it?')).toBeNull();
  });

  it('confirms each empty side from its slots, one after the other', async () => {
    let release: () => void = () => undefined;
    const onLineup = jest.fn((input: { sideId: string }) =>
      input.sideId === 's1' ? new Promise<void>((resolve) => { release = resolve; }) : undefined);
    panel(tossed(), { onLineup });

    fireEvent.press(screen.getByText('Confirm teams'));
    expect(onLineup).toHaveBeenCalledTimes(1); // waits for side 1's save
    await act(async () => { release(); });

    expect(onLineup).toHaveBeenNthCalledWith(1, { sideId: 's1', players: [{ slotId: 'a1', playerId: 'p1', name: 'Kohli' }] });
    expect(onLineup).toHaveBeenNthCalledWith(2, { sideId: 's2', players: [{ slotId: 'b1', name: 'Guest' }] });
  });

  it('skips a side that already has its squad', async () => {
    const onLineup = jest.fn();
    panel(tossed([{ slotId: 'a1', name: 'Kohli' }]), { onLineup });
    await act(async () => { fireEvent.press(screen.getByText('Confirm teams')); });
    expect(onLineup).toHaveBeenCalledTimes(1);
    expect(onLineup).toHaveBeenCalledWith({ sideId: 's2', players: [{ slotId: 'b1', name: 'Guest' }] });
  });
});
```

- [ ] **Step 2: Run to verify they fail.**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/CricketSetupPanel.test.tsx`
Expected: FAIL. There's no "1 players", no "Reds chose to…", no "Confirm teams", and the non-host
render isn't null.

- [ ] **Step 3: Implement.** Replace the whole of `src/components/quick/CricketSetupPanel.tsx` with:

```tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { QuickCricketLineupEntry, QuickMatch } from '@/api/quickMatch';
import { lineupFromSlots, setupStage } from '@/lib/quickCricketView';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';

const label = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });
const button = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 14, letterSpacing: 0.14 * 14, textTransform: 'uppercase' as const };

/**
 * The host's setup: the toss. Recording it fills both squads on the server,
 * so play goes straight to the opening batters. "Confirm teams" is only for a
 * match whose toss an older app recorded, which has no squads yet. Watchers
 * get nothing here; their setup view is QuickCricketLive.
 *
 * Picking the toss winner is local state, not a request, so it is not gated by
 * `busy`; Bat and Bowl, which call `onToss`, are.
 */
export function CricketSetupPanel({ match, playerId, busy, onToss, onLineup }: {
  match: QuickMatch;
  playerId?: string;
  busy: boolean;
  onToss: (input: { winnerSideId: string; decision: 'bat' | 'bowl' }) => void;
  onLineup: (input: { sideId: string; players: QuickCricketLineupEntry[] }) => Promise<unknown> | void;
}) {
  const t = useTheme();
  const [tossWinner, setTossWinner] = useState<string | null>(null);
  const isHost = Boolean(playerId) && playerId === match.hostId;
  if (!isHost) return null;

  if (setupStage(match) === 'needs_toss') {
    const winner = match.sides.find((s) => s.sideId === tossWinner);
    return (
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <Text style={label(t)}>Toss — who won it?</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {match.sides.map((side) => {
            const on = side.sideId === tossWinner;
            return (
              <Pressable
                key={side.sideId}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setTossWinner(side.sideId)}
                style={{ flex: 1, minHeight: 96, padding: 14, gap: 8, justifyContent: 'space-between', borderRadius: 6, borderWidth: 1.5, borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brandTint : t.surface }}
              >
                <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', fontSize: 20, lineHeight: 24, textTransform: 'uppercase', color: t.text }}>{side.name}</Text>
                <Text style={label(t)}>{`${side.slots.length} players`}</Text>
              </Pressable>
            );
          })}
        </View>
        {winner ? (
          <>
            <Text style={label(t)}>{`${winner.name} chose to…`}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['bat', 'bowl'] as const).map((decision) => (
                <Pressable
                  key={decision}
                  accessibilityRole="button"
                  onPress={busy ? undefined : () => onToss({ winnerSideId: winner.sideId, decision })}
                  style={{ flex: 1, minHeight: 56, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
                >
                  <Text style={{ ...button, color: t.onBrand }}>{decision === 'bat' ? 'Bat' : 'Bowl'}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </View>
    );
  }

  // One side at a time: two saves in flight together could each write over the other.
  const confirm = async () => {
    const lineups = [match.cricketSetup?.side1Lineup ?? [], match.cricketSetup?.side2Lineup ?? []];
    for (let i = 0; i < match.sides.length; i++) {
      if (lineups[i].length === 0) await onLineup({ sideId: match.sides[i].sideId, players: lineupFromSlots(match.sides[i]) });
    }
  };

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Pressable
        accessibilityRole="button"
        onPress={busy ? undefined : () => { confirm(); }}
        style={{ minHeight: 56, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
      >
        <Text style={{ ...button, color: t.onBrand }}>Confirm teams</Text>
      </Pressable>
    </View>
  );
}
```

Append `'src/components/quick/CricketSetupPanel.tsx',` to `MIGRATED` in `test-utils/colourLiterals.ts`.

- [ ] **Step 4: Run to verify they pass.**

Run: `cd /d/kria/mobile && pwd && npx jest __tests__/CricketSetupPanel.test.tsx __tests__/paletteFences.test.ts __tests__/fontLeadingFence.test.ts __tests__/pressableStyleFence.test.ts`
Expected: PASS.

- [ ] **Step 5: Gates and commit.** `useQuickMatch`'s `lineup` returns `Promise<void> | undefined`,
  which fits the widened `onLineup`.

```bash
cd /d/kria/mobile && pwd && npx tsc --noEmit && npx eslint src/components/quick/CricketSetupPanel.tsx test-utils/colourLiterals.ts __tests__/CricketSetupPanel.test.tsx && npx jest 2>&1 | grep -E "✕|Tests:|Test Suites:"
git add src/components/quick/CricketSetupPanel.tsx test-utils/colourLiterals.ts __tests__/CricketSetupPanel.test.tsx && git commit -m "feat quick cricket toss as two team cards, and one Confirm teams for an older toss"
```

---

## After the last task

- A whole-branch review, then a fast-forward merge to `main` in both repos, with the branches
  deleted. Don't push.
- Update `D:\kria\daily-log\2026-10-08.md`: a plain-language section, plus a line in "For the
  engineers".
- Update the handover's "Behaviour worth knowing": the toss fills the squads, and the screen has
  a scorecard endpoint.
- Phone check (the user does this):
  - Host: toss cards → opening pickers → keys → an extra plus a wicket → undo.
  - Watcher on a second phone: score band, At the crease, Scorecard tab, result at the end.
