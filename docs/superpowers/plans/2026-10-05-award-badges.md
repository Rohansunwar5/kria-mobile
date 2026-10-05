# Award Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organizers grant an honour with one of twelve preset badges; mobile renders badge + title in the player's Honours section.

**Architecture:** Server adds `Player.honors: [{ title, badge }]` beside the untouched `titles`, guarded by a fixed `BADGE_KEYS` list (schema enum + request validator). The organizer modal in `client/` gets a badge grid that prefills the title. Mobile gets a `react-native-svg` badge and one `HonorsList` component that both profile screens use; legacy titles render with a default `champion` badge.

**Tech Stack:** Express + Mongoose 8 + express-validator 7 + vitest/supertest (server); React 18 + Vite + Tailwind (client); Expo 57 / React Native + react-native-svg 15 + Reanimated 4 + jest/RNTL (mobile).

**Spec:** `mobile/docs/superpowers/specs/2026-10-05-award-badges-design.md`

## Global Constraints

- Three separate git repos: `D:\kria\server`, `D:\kria\client`, `D:\kria\mobile`. Each is on `main`; create branch `feat/award-badges` in a repo before its first commit (`git switch -c feat/award-badges`).
- Never stage `package-lock.json` (pre-existing local modifications in server and mobile). Always `git add` explicit paths.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Badge keys (exact, all three packages): `player-of-the-match`, `season-mvp`, `hat-trick`, `undefeated-run`, `auction-steal`, `centurion`, `clean-sweep`, `rally-king`, `ace-serve`, `fair-play`, `iron-player`, `first-cap`.
- Title: trimmed, 1–60 chars. Invalid body → **422** (`validateRequest` convention), message in `response.data.message`.
- `Player.titles` and every auto-award / `removeTitle` path stay unchanged.
- Player-facing pages in `client/` are not touched.
- Mobile: Anton `lineHeight >= 1.188 × fontSize`; SpaceMono `>= 1.061 ×` or no lineHeight (`__tests__/fontLeading*.test.ts` fence).
- Mobile: theme tokens via `useTheme()` for all chrome; badge art colours are fixed literals and live only in `Badge.tsx`.
- Mobile motion: halo pulse only, legendary/elite/gold only, `INOUT` curve, off under reduce-motion, off when the screen is unfocused (DESIGN.md §6).

## Review Focus

- Organizer double-clicks Confirm → player shows one honour, not two (Task 1 test "granted twice").
- Title typed with padding or only spaces → stored trimmed / rejected with 422, nothing written (Task 1 tests).
- Award granted to a team row (no `playerId`) → award stored with its badge, no player touched, no crash (Task 1 test "team award").
- Stored badge key the app doesn't know (old build, hand-edited data, `constructor`) → champion art, no crash (Task 2 test `badgeFor`).
- Player with only legacy titles, or with nothing → titles render with champion art / section absent (Task 2 tests; Task 3 keeps `PlayerProfileAchievements` green).

---

### Task 1: Server — honours with badges

**Files:**
- Modify: `server/src/models/player.model.ts` (add `BADGE_KEYS`, `honorSchema`, `honors` field, interface)
- Modify: `server/src/models/tournament.model.ts:129-135` and `:176-182` (award `badge`)
- Modify: `server/src/repository/player.repository.ts` (add `addHonor` after `removeTitle`)
- Modify: `server/src/repository/tournament.repository.ts:203` (`addAward` type)
- Modify: `server/src/middlewares/validators/tournament.validator.ts` (add `grantAwardValidator`)
- Modify: `server/src/routes/tournament.route.ts:5-12,92`
- Modify: `server/src/services/tournament.service.ts:313-327` (`grantAward`)
- Modify: `server/src/services/playerAuth.service.ts:379` (`getPublicProfile` payload)
- Test: `server/test/grantAwardBadge.test.ts`

**Interfaces:**
- Produces: `BADGE_KEYS` (readonly tuple, exported from `src/models/player.model.ts`); `playerRepository.addHonor(id: string, honor: { title: string; badge: string })`; `POST /tournament/:id/awards` body `{ title: string; badge: string; playerId?: string; teamId?: string; categoryId?: string; description?: string }`; `GET /player/auth/public/:playerId` → `data.data.player.honors: { title: string; badge: string }[]`. `/player/auth/me`-style profile returns the whole document, so `honors` appears there with no change.

- [ ] **Step 1: Branch**

```bash
cd /d/kria/server && git switch -c feat/award-badges
```

- [ ] **Step 2: Write the failing test** — create `server/test/grantAwardBadge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import app from '../src/app';
import Organizer, {
    IOrganizerRole,
    IOrganizerStatus,
    IOrganizerAuthProvider,
} from '../src/models/organizer.model';
import Player from '../src/models/player.model';
import Tournament from '../src/models/tournament.model';

// Fixtures follow test/announcement.test.ts: a real organizer token and a
// tournament created through the API, so the award route runs end to end.
async function makeOrganizerAndToken() {
    const org = await Organizer.create({
        firstName: 'Anna',
        lastName: 'Organizer',
        email: `org${Date.now()}${Math.round(performance.now())}@kria.test`,
        phone: '9999999999',
        role: IOrganizerRole.ORGANIZER,
        status: IOrganizerStatus.VERIFIED,
        authProvider: IOrganizerAuthProvider.EMAIL,
        isActive: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    return jwt.sign(
        { _id: org._id.toString(), type: 'organizer', role: 'organizer' },
        process.env.JWT_SECRET as string,
    );
}

async function makeTournament(token: string) {
    const now = Date.now();
    const day = 86400000;
    const res = await request(app)
        .post('/tournament')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Badge Cup',
            sports: ['badminton'],
            startDate: new Date(now + 30 * day).toISOString(),
            endDate: new Date(now + 32 * day).toISOString(),
            registrationDeadline: new Date(now + 10 * day).toISOString(),
            venue: { name: 'Court', city: 'BLR' },
        });
    return String(res.body.data.data._id);
}

async function setup() {
    const token = await makeOrganizerAndToken();
    const tournamentId = await makeTournament(token);
    const player = await Player.create({
        firstName: 'Badge', lastName: 'Player',
        email: `badge${Date.now()}@kria.test`,
        phone: '9999999999', status: 'verified', isActive: true,
    });
    const playerId = player._id.toString();
    const grant = (body: Record<string, unknown>) =>
        request(app)
            .post(`/tournament/${tournamentId}/awards`)
            .set('Authorization', `Bearer ${token}`)
            .send(body);
    return { tournamentId, playerId, grant };
}

describe('POST /tournament/:id/awards with a badge', () => {
    it('stores the honour on the player and the badge on the award', async () => {
        const { tournamentId, playerId, grant } = await setup();

        const res = await grant({ playerId, title: '  Season MVP  ', badge: 'season-mvp' });

        expect(res.status).toBe(200);
        const player = await Player.findById(playerId).lean();
        expect(player!.honors).toEqual([{ title: 'Season MVP', badge: 'season-mvp' }]);
        // Manual grants no longer write the badge-less titles list.
        expect(player!.titles ?? []).toEqual([]);
        const tournament = await Tournament.findById(tournamentId).lean();
        expect(tournament!.awards).toMatchObject([{ title: 'Season MVP', badge: 'season-mvp', playerId }]);
    });

    it('keeps one honour when the same title and badge are granted twice', async () => {
        const { playerId, grant } = await setup();

        await grant({ playerId, title: 'Centurion', badge: 'centurion' });
        await grant({ playerId, title: 'Centurion', badge: 'centurion' });

        const player = await Player.findById(playerId).lean();
        expect(player!.honors).toEqual([{ title: 'Centurion', badge: 'centurion' }]);
    });

    it('stores a team award with its badge and touches no player', async () => {
        const { tournamentId, playerId, grant } = await setup();

        const res = await grant({ teamId: 'team-1', title: 'Fair Play', badge: 'fair-play' });

        expect(res.status).toBe(200);
        const tournament = await Tournament.findById(tournamentId).lean();
        expect(tournament!.awards).toMatchObject([{ title: 'Fair Play', badge: 'fair-play', teamId: 'team-1' }]);
        expect((await Player.findById(playerId).lean())!.honors ?? []).toEqual([]);
    });

    it.each([
        ['an unknown badge', { title: 'MVP', badge: 'golden-boot' }],
        ['a missing badge', { title: 'MVP' }],
        ['a blank title', { title: '   ', badge: 'season-mvp' }],
        ['a missing title', { badge: 'season-mvp' }],
        ['a 61-character title', { title: 'x'.repeat(61), badge: 'season-mvp' }],
    ])('rejects %s with 422 and writes nothing', async (_label, body) => {
        const { tournamentId, playerId, grant } = await setup();

        const res = await grant({ playerId, ...body });

        expect(res.status).toBe(422);
        expect(typeof res.body.message).toBe('string');
        expect((await Player.findById(playerId).lean())!.honors ?? []).toEqual([]);
        expect((await Tournament.findById(tournamentId).lean())!.awards ?? []).toEqual([]);
    });

    it('returns honours on the public profile', async () => {
        const { playerId, grant } = await setup();
        await grant({ playerId, title: 'Centurion', badge: 'centurion' });

        const res = await request(app).get(`/player/auth/public/${playerId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.data.player.honors).toEqual([{ title: 'Centurion', badge: 'centurion' }]);
    });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd /d/kria/server && npx vitest run test/grantAwardBadge.test.ts`
Expected: FAIL — `honors` is `undefined`, invalid bodies return 200 not 422.

- [ ] **Step 4: Player model** — in `server/src/models/player.model.ts`, directly above `const playerSchema = ...`, add:

```ts
// Organizer-grantable award badges. The art lives in the apps (client
// src/pages/organizer/components/badges.tsx, mobile src/lib/badges.ts); the
// server only guards the key. A new badge is added in all three.
export const BADGE_KEYS = [
    'player-of-the-match', 'season-mvp',
    'hat-trick', 'undefeated-run', 'auction-steal',
    'centurion', 'clean-sweep', 'rally-king',
    'ace-serve', 'fair-play',
    'iron-player', 'first-cap',
] as const;

// No _id: addHonor dedupes with $addToSet on the whole {title, badge} pair,
// and an auto _id would make every pair unique.
const honorSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        badge: { type: String, required: true, enum: [...BADGE_KEYS] },
    },
    { _id: false },
);
```

In the schema, right after the `titles: [{ type: String }],` field, add:

```ts
        // Organizer-granted honours, each with a badge. `titles` above keeps
        // the auto-awarded "Winner of …" strings, which carry no badge.
        honors: [honorSchema],
```

In `IPlayer`, after `titles?: string[];`, add:

```ts
    honors?: { title: string; badge: string }[];
```

- [ ] **Step 5: Tournament award badge** — in `server/src/models/tournament.model.ts`, inside `awards: [{ ... }]` after `description: { type: String },` add `badge: { type: String },`; in the `ITournament.awards` type after `description?: string;` add `badge?: string;`. In `server/src/repository/tournament.repository.ts:203`, change the `addAward` parameter type to:

```ts
    async addAward(id: string, award: { title: string; badge?: string; playerId?: string; teamId?: string; categoryId?: string; description?: string }): Promise<ITournament | null> {
```

- [ ] **Step 6: Repository** — in `server/src/repository/player.repository.ts`, after `removeTitle`, add:

```ts
    /**
     * $addToSet on the whole {title, badge} pair, so a double-submitted grant
     * stays one honour — the same dedupe addTitle gives a title string. Relies
     * on honorSchema's `_id: false`.
     */
    async addHonor(id: string, honor: { title: string; badge: string }) {
        return this._model.findByIdAndUpdate(
            id,
            { $addToSet: { honors: honor } },
            { new: true }
        ).select('-password -otp').lean();
    }
```

- [ ] **Step 7: Validator** — in `server/src/middlewares/validators/tournament.validator.ts`, add the import `import { BADGE_KEYS } from '../../models/player.model';` below the existing imports, and after `getTournamentValidator` add:

```ts
export const grantAwardValidator = [
    param('id')
        .isMongoId().withMessage('Invalid tournament ID.'),
    body('title')
        .isString().withMessage('Award title is required.')
        .bail()
        .trim()
        .isLength({ min: 1, max: 60 }).withMessage('Award title must be 1–60 characters.'),
    body('badge')
        .isIn([...BADGE_KEYS]).withMessage('Pick one of the preset badges.'),
];
```

- [ ] **Step 8: Route** — in `server/src/routes/tournament.route.ts`, add `grantAwardValidator,` to the validator import list and change line 92 to:

```ts
tournamentRouter.post('/:id/awards', isOrganizerLoggedIn, grantAwardValidator, validateRequest, asyncHandler(grantAward));
```

- [ ] **Step 9: Service** — in `server/src/services/tournament.service.ts`, replace `grantAward` with:

```ts
    async grantAward(tournamentId: string, data: { title: string, badge: string, playerId?: string, teamId?: string, categoryId?: string, description?: string }, userId: string) {
        const tournament = await tournamentRepository.getById(tournamentId);
        if (!tournament) throw new NotFoundError('Tournament not found.');

        const isAuthorized = await tournamentRepository.isOrganizerOrStaff(tournamentId, userId);
        if (!isAuthorized) throw new ForbiddenError('Not authorized.');

        const updated = await tournamentRepository.addAward(tournamentId, data);

        if (data.playerId) {
            await playerRepository.addHonor(data.playerId, { title: data.title, badge: data.badge });
        }

        return new SuccessResponse('Award granted successfully.', updated);
    }
```

- [ ] **Step 10: Public profile** — in `server/src/services/playerAuth.service.ts` `getPublicProfile`, after `titles: player.titles || [],` add:

```ts
                honors: player.honors || [],
```

- [ ] **Step 11: Run the test to verify it passes**

Run: `cd /d/kria/server && npx vitest run test/grantAwardBadge.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 12: Run the full server suite and typecheck**

Run: `cd /d/kria/server && npx vitest run && npx tsc --noEmit`
Expected: all tests PASS (including `badmintonReopen*.test.ts`, which pin `titles`); tsc exits 0. If tsc reports errors, confirm with `git stash && npx tsc --noEmit; git stash pop` that any error not in a touched file is pre-existing, and fix every error in a touched file.

- [ ] **Step 13: Commit**

```bash
cd /d/kria/server && git add src/models/player.model.ts src/models/tournament.model.ts src/repository/player.repository.ts src/repository/tournament.repository.ts src/middlewares/validators/tournament.validator.ts src/routes/tournament.route.ts src/services/tournament.service.ts src/services/playerAuth.service.ts test/grantAwardBadge.test.ts
git commit -m "feat: grant honours with a preset badge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Mobile — badge art and HonorsList

**Files:**
- Create: `mobile/src/lib/badges.ts`
- Modify: `mobile/src/lib/motion.ts` (add `DUR.halo`, `useHaloPulse`)
- Create: `mobile/src/components/profile/Badge.tsx`
- Create: `mobile/src/components/profile/HonorsList.tsx`
- Test: `mobile/__tests__/HonorsList.test.tsx`

**Interfaces:**
- Consumes: badge keys from Global Constraints; server honour shape `{ title: string; badge: string }`.
- Produces: `type Honor = { title: string; badge: string }`, `type Tier`, `badgeFor(key?: string): BadgeDef`, `CHAMPION` (from `@/lib/badges`); `useHaloPulse(active: boolean): SharedValue<number>` (from `@/lib/motion`); `<Badge badge?: string size?: number />`; `<HonorsList label: string honors?: Honor[] titles?: string[] style?: ViewStyle />` (renders `null` when both lists are empty).

- [ ] **Step 1: Branch**

```bash
cd /d/kria/mobile && git switch feat/award-badges  # created with the plan commit
```

- [ ] **Step 2: Write the failing test** — create `mobile/__tests__/HonorsList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { HonorsList } from '@/components/profile/HonorsList';
import { badgeFor, CHAMPION } from '@/lib/badges';

// Badge stops its halo off-screen through expo-router's useIsFocused; a bare
// render has no navigator around it.
jest.mock('expo-router', () => ({ useIsFocused: () => true }));

describe('HonorsList', () => {
  it('lists granted honours newest first, then legacy titles', () => {
    render(
      <HonorsList
        label="Honors"
        honors={[
          { title: 'First Cap', badge: 'first-cap' },
          { title: 'Season MVP', badge: 'season-mvp' },
        ]}
        titles={['Winner of Mens Singles at Bandra Cup']}
      />,
    );

    const titles = screen
      .getAllByText(/first cap|season mvp|winner of/i)
      .map((n) => n.props.children);
    expect(titles).toEqual(['Season MVP', 'First Cap', 'Winner of Mens Singles at Bandra Cup']);
    expect(screen.getByText('Honors')).toBeTruthy();
    // Tier words, not colour alone, carry the rarity.
    expect(screen.getByText('legendary')).toBeTruthy();
    expect(screen.getByText('steel')).toBeTruthy();
    expect(screen.getByText('gold')).toBeTruthy(); // legacy title → champion art
  });

  it('renders legacy titles alone', () => {
    render(<HonorsList label="Titles" titles={['Grand Slam Champion']} />);
    expect(screen.getByText('Grand Slam Champion')).toBeTruthy();
  });

  it('renders nothing when there is nothing to show', () => {
    const { toJSON } = render(<HonorsList label="Honors" honors={[]} titles={[]} />);
    expect(toJSON()).toBeNull();
  });
});

describe('badgeFor', () => {
  it('resolves a known key', () => {
    expect(badgeFor('hat-trick')).toEqual({ tier: 'elite', emblem: 'stumps' });
  });

  // `constructor` is the trap: a plain BADGES[key] returns Object's own
  // function for it, which would render as a broken badge.
  it.each(['', undefined, 'retired-badge', 'constructor'])('falls back to champion art for %p', (key) => {
    expect(badgeFor(key)).toBe(CHAMPION);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd /d/kria/mobile && npx jest __tests__/HonorsList.test.tsx`
Expected: FAIL — `Cannot find module '@/components/profile/HonorsList'`.

- [ ] **Step 4: Catalogue** — create `mobile/src/lib/badges.ts`:

```ts
// The award-badge catalogue. Keys are the server's BADGE_KEYS
// (server/src/models/player.model.ts) — the three packages share no code, so
// a new badge is added in server, client and here. Art: Badge.tsx.
export type Tier = 'legendary' | 'elite' | 'gold' | 'rare' | 'steel';
export type Emblem =
  | 'star' | 'trophy' | 'stumps' | 'shield' | 'gavel' | 'bat'
  | 'bracket' | 'racket' | 'shuttle' | 'flag' | 'medal' | 'target';
export interface BadgeDef { tier: Tier; emblem: Emblem }
export interface Honor { title: string; badge: string }

export const BADGES: Record<string, BadgeDef> = {
  'player-of-the-match': { tier: 'legendary', emblem: 'star' },
  'season-mvp': { tier: 'legendary', emblem: 'trophy' },
  'hat-trick': { tier: 'elite', emblem: 'stumps' },
  'undefeated-run': { tier: 'elite', emblem: 'shield' },
  'auction-steal': { tier: 'elite', emblem: 'gavel' },
  centurion: { tier: 'gold', emblem: 'bat' },
  'clean-sweep': { tier: 'gold', emblem: 'bracket' },
  'rally-king': { tier: 'gold', emblem: 'racket' },
  'ace-serve': { tier: 'rare', emblem: 'shuttle' },
  'fair-play': { tier: 'rare', emblem: 'flag' },
  'iron-player': { tier: 'steel', emblem: 'medal' },
  'first-cap': { tier: 'steel', emblem: 'target' },
};

/** Legacy `titles` (the auto "Winner of …" strings) and any key this build has never seen. */
export const CHAMPION: BadgeDef = { tier: 'gold', emblem: 'trophy' };

export function badgeFor(key?: string): BadgeDef {
  return key && Object.prototype.hasOwnProperty.call(BADGES, key) ? BADGES[key] : CHAMPION;
}
```

- [ ] **Step 5: Motion hook** — in `mobile/src/lib/motion.ts`, add `halo: 1800,` to `DUR` (after `ambient`), and append:

```ts
/**
 * Award-badge halo: opacity/scale breathing on the three top tiers, reversing
 * so the loop has no seam. Rests at the midpoint, so under reduce-motion or on
 * an unfocused screen the halo is still drawn — the badge is complete without
 * motion.
 */
export function useHaloPulse(active: boolean) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0.5);
  useEffect(() => {
    if (reduced || !active) {
      cancelAnimation(v);
      v.value = 0.5;
      return;
    }
    v.value = withSequence(
      withTiming(0, { duration: DUR.halo / 2, easing: INOUT }),
      withRepeat(withTiming(1, { duration: DUR.halo, easing: INOUT }), -1, true)
    );
    return () => cancelAnimation(v);
  }, [active, reduced, v]);
  return v;
}
```

- [ ] **Step 6: Badge art** — create `mobile/src/components/profile/Badge.tsx`:

```tsx
import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useIsFocused } from 'expo-router';
import { badgeFor, type Emblem, type Tier } from '@/lib/badges';
import { useHaloPulse } from '@/lib/motion';

// Fixed art, identical in both palettes: a badge is an object, not chrome, so
// these are deliberately not theme tokens (the same call as a seeded hue).
// Source: Kria Award Badges.dc.html. At profile-row size the design drops the
// orbit ring, sparks, facets and sweep — frame, emblem and halo only.
type StopDef = [offset: number, color: string, opacity?: number];

const TIER_STROKE: Record<Tier, StopDef[]> = {
  legendary: [[0, '#FFD37A'], [0.38, '#F97316'], [0.72, '#FA4C93'], [1, '#7A1E3C']],
  elite: [[0, '#FF8FC0'], [0.5, '#FA4C93'], [1, '#5E1533']],
  gold: [[0, '#FFD37A'], [0.48, '#F97316'], [1, '#6B2C07']],
  rare: [[0, '#7BF2B4'], [0.5, '#16C46A'], [1, '#0A4428']],
  steel: [[0, '#EDEDED'], [0.5, '#9A9A9A'], [1, '#3A3A3A']],
};

// The design's 44px row draws a halo for the top three tiers only.
const TIER_HALO: Partial<Record<Tier, StopDef[]>> = {
  legendary: [[0, '#F97316', 0.95], [0.6, '#FA4C93', 0.35], [1, '#FA4C93', 0]],
  elite: [[0, '#FA4C93', 0.9], [1, '#FA4C93', 0]],
  gold: [[0, '#F97316', 0.9], [1, '#F97316', 0]],
};

// 24×24 emblem strokes. A string strokes in the tier gradient; a tuple keeps
// the design's fixed accent colour.
type Stroke = string | [d: string, color: string];
const EMBLEM: Record<Emblem, Stroke[]> = {
  star: ['M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z', 'M12 8.5l1.2 2.3 2.3 1.2-2.3 1.2L12 15.5l-1.2-2.3L8.5 12l2.3-1.2z'],
  trophy: ['M6 4h12v4l-6 7-6-7z', 'M6 5.5H3v3l3 2M18 5.5h3v3l-3 2M12 15v4M8 20.5h8'],
  stumps: ['M7 8v13M12 8v13M17 8v13', ['M5.8 6.6h6.4M11.8 6.6h6.4', '#FF8FC0']],
  shield: ['M12 3l8 3v7l-8 8-8-8V6z', 'M9 12l2.5 2.5L16 10'],
  gavel: ['M12.5 2.5l9 9-3 3-9-9z', 'M10.5 8.5 3 16l2.5 2.5L13 11M13 21h8'],
  bat: ['M10 2.5h4v4h-4z', 'M8.5 6.5h7l-.5 10-3 5-3-5z', ['M12 8v12', '#FFD37A']],
  bracket: ['M3 6h4M3 11h4M7 6v5M7 8.5h5M3 15h4M3 20h4M7 15v5M7 17.5h5M12 8.5v9M12 13h9'],
  racket: ['M12 3l6 5-6 5-6-5z', 'M9 5.5h6M8.6 8.2h6.8M12 3v18M10 21h4'],
  shuttle: ['M9.5 3h5l1 4h-7z', 'M7.5 7 4 19l8 2 8-2L16.5 7z', 'M10 7 8.4 19M14 7l1.6 12M12 7v14'],
  flag: [['M6 3v18', '#7BF2B4'], 'M6 4h12l-2.5 4L18 12H6z'],
  medal: ['M8 3l2 5.5M16 3l-2 5.5', 'M8 9h8v8H8zM11 12h2v2h-2z'],
  target: ['M4 4h16v16H4zM8.5 8.5h7v7h-7zM11.3 11.3h1.4v1.4h-1.4z'],
};

const OUTER = 'M120 6 214 60v120l-94 54-94-54V60z';
const INNER = 'M120 22 200 68v104l-80 46-80-46V68z';

const stops = (s: StopDef[]) =>
  s.map(([offset, color, opacity = 1]) => (
    <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
  ));

/** One honour badge. Unknown or missing key → champion art. Decorative: the row carries the label. */
export function Badge({ badge, size = 44 }: { badge?: string; size?: number }) {
  const { tier, emblem } = badgeFor(badge);
  const halo = TIER_HALO[tier];
  const focused = useIsFocused();
  const pulse = useHaloPulse(!!halo && focused);
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + pulse.value * 0.48,
    transform: [{ scale: 0.94 + pulse.value * 0.12 }],
  }));

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {halo ? (
        <Animated.View style={[{ position: 'absolute', width: size, height: size }, haloStyle]}>
          <Svg width={size} height={size} viewBox="0 0 240 240">
            <Defs>
              <RadialGradient id="halo" cx="50%" cy="50%" r="50%">{stops(halo)}</RadialGradient>
            </Defs>
            <Circle cx={120} cy={120} r={98} fill="url(#halo)" />
          </Svg>
        </Animated.View>
      ) : null}
      <Svg width={size} height={size} viewBox="0 0 240 240">
        <Defs>
          <LinearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">{stops(TIER_STROKE[tier])}</LinearGradient>
          <LinearGradient id="plate" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset={0} stopColor="#1E1E1E" />
            <Stop offset={1} stopColor="#0B0B0B" />
          </LinearGradient>
        </Defs>
        <Path d={OUTER} fill="url(#plate)" stroke="url(#stroke)" strokeWidth={5} />
        <Path d={INNER} fill="url(#plate)" fillOpacity={0.65} stroke="url(#stroke)" strokeWidth={1.5} strokeOpacity={0.5} />
        {/* = translate(120,118) scale(3.4) translate(-12,-12) from the design */}
        <G transform="translate(79.2 77.2) scale(3.4)" fill="none" strokeWidth={1.7} strokeLinecap="square" strokeLinejoin="miter">
          {EMBLEM[emblem].map((s, i) =>
            typeof s === 'string' ? (
              <Path key={i} d={s} stroke="url(#stroke)" />
            ) : (
              <Path key={i} d={s[0]} stroke={s[1]} />
            )
          )}
        </G>
      </Svg>
    </View>
  );
}
```

- [ ] **Step 7: HonorsList** — create `mobile/src/components/profile/HonorsList.tsx`:

```tsx
import { View, Text, type ViewStyle } from 'react-native';
import { Badge } from '@/components/profile/Badge';
import { badgeFor, type Honor } from '@/lib/badges';
import { useTheme } from '@/lib/theme';

/**
 * The Honours section: organizer-granted honours (badge + title), newest
 * first, then legacy `titles` — the auto "Winner of …" strings, which carry no
 * badge and render with the champion art. Nothing at all when both are empty.
 */
export function HonorsList({
  label,
  honors,
  titles,
  style,
}: {
  label: string;
  honors?: Honor[];
  titles?: string[];
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const rows: Honor[] = [...(honors ?? [])]
    .reverse()
    .concat((titles ?? []).map((title) => ({ title, badge: '' })));
  if (!rows.length) return null;

  return (
    <View style={style}>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: theme.textFaint, marginBottom: 8 }}>
        {label}
      </Text>
      <View style={{ gap: 7 }}>
        {rows.map((h, i) => {
          const { tier } = badgeFor(h.badge);
          return (
            <View
              key={i}
              accessible
              accessibilityLabel={`${h.title}, ${tier} honour`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.line, borderRadius: 6 }}
            >
              <Badge badge={h.badge} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: theme.textMeta }}>
                  {tier}
                </Text>
                <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 18, color: theme.text, marginTop: 2 }}>
                  {h.title}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd /d/kria/mobile && npx jest __tests__/HonorsList.test.tsx`
Expected: PASS (8 tests). If jest hangs after passing (an open infinite animation), the `cancelAnimation` cleanup in `useHaloPulse` is the place to look — `useShimmer` uses the identical pattern and its suites exit cleanly.

- [ ] **Step 9: Commit**

```bash
cd /d/kria/mobile && git add src/lib/badges.ts src/lib/motion.ts src/components/profile/Badge.tsx src/components/profile/HonorsList.tsx __tests__/HonorsList.test.tsx
git commit -m "feat: award badge art and honours list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Mobile — profile screens render HonorsList

**Files:**
- Modify: `mobile/src/app/(tabs)/profile.tsx:152-166`
- Modify: `mobile/src/app/player/[playerId].tsx:150-165`
- Modify: `mobile/src/api/profileApi.ts:4-12` (`PublicPlayer`)
- Modify: `mobile/src/store/slices/authSlice.ts:8-21` (`User`)
- Modify: `mobile/test-utils/colourLiterals.ts` (`MIGRATED`)
- Modify: `mobile/__tests__/PlayerProfileAchievements.test.tsx:10-13` (expo-router mock)

**Interfaces:**
- Consumes: `HonorsList`, `Honor` from Task 2; `honors` on `/player/auth/me` and `/player/auth/public/:id` from Task 1.

- [ ] **Step 1: Types** — in `mobile/src/api/profileApi.ts`, add `import type { Honor } from '@/lib/badges';` after the existing imports and, in `PublicPlayer` after `titles: string[];`, add `honors?: Honor[];`. In `mobile/src/store/slices/authSlice.ts`, add `import type { Honor } from '@/lib/badges';` after the existing imports and, in `User` after `titles?: string[];`, add `honors?: Honor[];`. (Optional: an older server omits the field.)

- [ ] **Step 2: Own profile** — in `mobile/src/app/(tabs)/profile.tsx`, add `import { HonorsList } from '@/components/profile/HonorsList';` after the `MenuRow` import, and replace the whole `{user?.titles?.length ? ( ... ) : null}` block (lines 152-166) with:

```tsx
          <HonorsList label="Honors" honors={user?.honors} titles={user?.titles} style={{ marginBottom: 16 }} />
```

`Icon` stays imported — the settings button still uses it.

- [ ] **Step 3: Public profile** — in `mobile/src/app/player/[playerId].tsx`, add `import { HonorsList } from '@/components/profile/HonorsList';` after the `PlayedForCard` import, and replace the whole `{player.titles.length ? ( ... ) : null}` block (lines 150-165) with:

```tsx
          <HonorsList label="Titles" honors={player.honors} titles={player.titles} style={{ marginTop: 22 }} />
```

`Icon` stays imported — the back button still uses it.

- [ ] **Step 4: Fence ratchet** — in `mobile/test-utils/colourLiterals.ts`, append `'src/components/profile/HonorsList.tsx',` to the end of `MIGRATED`. (`Badge.tsx` is deliberately not added: its literals are fixed art, explained in its header comment.)

- [ ] **Step 5: Run the screen suite to see the mock gap**

Run: `cd /d/kria/mobile && npx jest __tests__/PlayerProfileAchievements.test.tsx`
Expected: FAIL — `useIsFocused is not a function` (that suite's player has `titles: ['Grand Slam Champion']`, so a champion `Badge` now renders, and its expo-router mock has no `useIsFocused`).

- [ ] **Step 6: Fix the mock** — in `mobile/__tests__/PlayerProfileAchievements.test.tsx`, change the `jest.mock('expo-router', ...)` factory to:

```tsx
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ playerId: 'p1' }),
  useRouter: () => ({ push: jest.fn() }),
  // The titles section renders a Badge, which pauses its halo off-screen.
  useIsFocused: () => true,
}));
```

- [ ] **Step 7: Run the full mobile suite, lint and typecheck**

Run: `cd /d/kria/mobile && npx jest && npx tsc --noEmit && npx expo lint`
Expected: all suites PASS — including `colourLiterals`, `fontLeading*`, `OwnProfileScreen`, `PlayerProfileAchievements`; tsc exits 0; lint reports no errors in touched files. Pre-existing failures/errors unrelated to touched files: confirm with `git stash` the same way as Task 1 Step 12 before moving on.

- [ ] **Step 8: Commit**

```bash
cd /d/kria/mobile && git add "src/app/(tabs)/profile.tsx" "src/app/player/[playerId].tsx" src/api/profileApi.ts src/store/slices/authSlice.ts test-utils/colourLiterals.ts __tests__/PlayerProfileAchievements.test.tsx
git commit -m "feat: show award badges in profile honours

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Client — badge picker in the Grant Award form

**Files:**
- Create: `client/src/pages/organizer/components/badges.tsx`
- Modify: `client/src/pages/organizer/components/CategoryAnalyticsModal.tsx:19-22,63-84,214-257`

**Interfaces:**
- Consumes: `POST /tournament/:id/awards` with `{ title, badge, ... }` from Task 1; 422 `{ message }` on a bad body.
- Produces: `BADGES: BadgeDef[]` (`{ key, name, tier, emblem }`), `<BadgeArt badge: BadgeDef size?: number />`.

- [ ] **Step 1: Branch**

```bash
cd /d/kria/client && git switch -c feat/award-badges
```

- [ ] **Step 2: Catalogue + art** — create `client/src/pages/organizer/components/badges.tsx`:

```tsx
import { useId } from 'react';

// The award-badge catalogue, organizer side. Keys must match the server's
// BADGE_KEYS (server/src/models/player.model.ts); mobile renders the same keys
// from src/lib/badges.ts. Art: Kria Award Badges.dc.html.
type Tier = 'legendary' | 'elite' | 'gold' | 'rare' | 'steel';
type Emblem =
    | 'star' | 'trophy' | 'stumps' | 'shield' | 'gavel' | 'bat'
    | 'bracket' | 'racket' | 'shuttle' | 'flag' | 'medal' | 'target';
export interface BadgeDef { key: string; name: string; tier: Tier; emblem: Emblem }

export const BADGES: BadgeDef[] = [
    { key: 'player-of-the-match', name: 'Player of the Match', tier: 'legendary', emblem: 'star' },
    { key: 'season-mvp', name: 'Season MVP', tier: 'legendary', emblem: 'trophy' },
    { key: 'hat-trick', name: 'Hat-Trick', tier: 'elite', emblem: 'stumps' },
    { key: 'undefeated-run', name: 'Undefeated Run', tier: 'elite', emblem: 'shield' },
    { key: 'auction-steal', name: 'Auction Steal', tier: 'elite', emblem: 'gavel' },
    { key: 'centurion', name: 'Centurion', tier: 'gold', emblem: 'bat' },
    { key: 'clean-sweep', name: 'Clean Sweep', tier: 'gold', emblem: 'bracket' },
    { key: 'rally-king', name: 'Rally King', tier: 'gold', emblem: 'racket' },
    { key: 'ace-serve', name: 'Ace Serve', tier: 'rare', emblem: 'shuttle' },
    { key: 'fair-play', name: 'Fair Play', tier: 'rare', emblem: 'flag' },
    { key: 'iron-player', name: 'Iron Player', tier: 'steel', emblem: 'medal' },
    { key: 'first-cap', name: 'First Cap', tier: 'steel', emblem: 'target' },
];

type StopDef = [offset: number, color: string, opacity?: number];

const TIER_STROKE: Record<Tier, StopDef[]> = {
    legendary: [[0, '#FFD37A'], [0.38, '#F97316'], [0.72, '#FA4C93'], [1, '#7A1E3C']],
    elite: [[0, '#FF8FC0'], [0.5, '#FA4C93'], [1, '#5E1533']],
    gold: [[0, '#FFD37A'], [0.48, '#F97316'], [1, '#6B2C07']],
    rare: [[0, '#7BF2B4'], [0.5, '#16C46A'], [1, '#0A4428']],
    steel: [[0, '#EDEDED'], [0.5, '#9A9A9A'], [1, '#3A3A3A']],
};

const TIER_HALO: Partial<Record<Tier, StopDef[]>> = {
    legendary: [[0, '#F97316', 0.95], [0.6, '#FA4C93', 0.35], [1, '#FA4C93', 0]],
    elite: [[0, '#FA4C93', 0.9], [1, '#FA4C93', 0]],
    gold: [[0, '#F97316', 0.9], [1, '#F97316', 0]],
};

// 24×24 emblem strokes. A string strokes in the tier gradient; a tuple keeps
// the design's fixed accent colour.
type Stroke = string | [d: string, color: string];
const EMBLEM: Record<Emblem, Stroke[]> = {
    star: ['M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z', 'M12 8.5l1.2 2.3 2.3 1.2-2.3 1.2L12 15.5l-1.2-2.3L8.5 12l2.3-1.2z'],
    trophy: ['M6 4h12v4l-6 7-6-7z', 'M6 5.5H3v3l3 2M18 5.5h3v3l-3 2M12 15v4M8 20.5h8'],
    stumps: ['M7 8v13M12 8v13M17 8v13', ['M5.8 6.6h6.4M11.8 6.6h6.4', '#FF8FC0']],
    shield: ['M12 3l8 3v7l-8 8-8-8V6z', 'M9 12l2.5 2.5L16 10'],
    gavel: ['M12.5 2.5l9 9-3 3-9-9z', 'M10.5 8.5 3 16l2.5 2.5L13 11M13 21h8'],
    bat: ['M10 2.5h4v4h-4z', 'M8.5 6.5h7l-.5 10-3 5-3-5z', ['M12 8v12', '#FFD37A']],
    bracket: ['M3 6h4M3 11h4M7 6v5M7 8.5h5M3 15h4M3 20h4M7 15v5M7 17.5h5M12 8.5v9M12 13h9'],
    racket: ['M12 3l6 5-6 5-6-5z', 'M9 5.5h6M8.6 8.2h6.8M12 3v18M10 21h4'],
    shuttle: ['M9.5 3h5l1 4h-7z', 'M7.5 7 4 19l8 2 8-2L16.5 7z', 'M10 7 8.4 19M14 7l1.6 12M12 7v14'],
    flag: [['M6 3v18', '#7BF2B4'], 'M6 4h12l-2.5 4L18 12H6z'],
    medal: ['M8 3l2 5.5M16 3l-2 5.5', 'M8 9h8v8H8zM11 12h2v2h-2z'],
    target: ['M4 4h16v16H4zM8.5 8.5h7v7h-7zM11.3 11.3h1.4v1.4h-1.4z'],
};

const OUTER = 'M120 6 214 60v120l-94 54-94-54V60z';
const INNER = 'M120 22 200 68v104l-80 46-80-46V68z';

const stops = (s: StopDef[]) =>
    s.map(([offset, color, opacity = 1]) => (
        <stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
    ));

/** Static thumbnail — the picker needs recognition, not motion. */
export function BadgeArt({ badge, size = 40 }: { badge: BadgeDef; size?: number }) {
    // Gradient ids are document-global on the web, so twelve thumbnails need
    // their own. React 18's useId contains colons, which break url(#…).
    const id = useId().replace(/:/g, '');
    const halo = TIER_HALO[badge.tier];
    return (
        <svg viewBox="0 0 240 240" width={size} height={size} aria-hidden="true">
            <defs>
                <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">{stops(TIER_STROKE[badge.tier])}</linearGradient>
                <linearGradient id={`${id}p`} x1="0" y1="0" x2="0.6" y2="1">
                    <stop offset="0" stopColor="#1E1E1E" />
                    <stop offset="1" stopColor="#0B0B0B" />
                </linearGradient>
                {halo && <radialGradient id={`${id}h`}>{stops(halo)}</radialGradient>}
            </defs>
            {halo && <circle cx="120" cy="120" r="98" fill={`url(#${id}h)`} opacity={0.6} />}
            <path d={OUTER} fill={`url(#${id}p)`} stroke={`url(#${id}s)`} strokeWidth={5} />
            <path d={INNER} fill={`url(#${id}p)`} fillOpacity={0.65} stroke={`url(#${id}s)`} strokeWidth={1.5} strokeOpacity={0.5} />
            <g transform="translate(79.2 77.2) scale(3.4)" fill="none" strokeWidth={1.7} strokeLinecap="square" strokeLinejoin="miter">
                {EMBLEM[badge.emblem].map((s, i) =>
                    typeof s === 'string'
                        ? <path key={i} d={s} stroke={`url(#${id}s)`} />
                        : <path key={i} d={s[0]} stroke={s[1]} />
                )}
            </g>
        </svg>
    );
}
```

- [ ] **Step 3: Modal state** — in `CategoryAnalyticsModal.tsx`, add `import { BADGES, BadgeArt } from './badges';` after the `fetchTournament` import, and replace the award state block (lines 19-22) with:

```tsx
    // Award State
    const [grantingToId, setGrantingToId] = useState<string | null>(null);
    const [awardBadge, setAwardBadge] = useState<string | null>(null);
    const [awardTitle, setAwardTitle] = useState('');
    const [isGranting, setIsGranting] = useState(false);
    const canGrant = !!awardBadge && awardTitle.trim().length > 0 && !isGranting;
```

- [ ] **Step 4: Payload** — in `handleGrantAward`, replace the `payload` object with:

```tsx
            const payload = {
                title: awardTitle.trim(),
                badge: awardBadge,
                playerId: entry.playerId || null,
                teamId: entry.teamId || null,
                categoryId: category._id,
                description: `Awarded during ${category.name}`
            };
```

- [ ] **Step 5: Form** — replace the `{grantingToId === entry._id ? ( ... ) : ( ... )}` expression inside the Actions `<td>` (lines 215-257) with:

```tsx
                                                    {grantingToId === entry._id ? (
                                                        <div className="flex flex-col gap-2 animate-in slide-in-from-right-2">
                                                            {/* Pick a badge; its name prefills the title, which stays editable. */}
                                                            <div className="grid grid-cols-4 gap-1" role="group" aria-label="Badge">
                                                                {BADGES.map((b) => (
                                                                    <button
                                                                        key={b.key}
                                                                        type="button"
                                                                        title={`${b.name} · ${b.tier}`}
                                                                        aria-label={b.name}
                                                                        aria-pressed={awardBadge === b.key}
                                                                        onClick={() => { setAwardBadge(b.key); setAwardTitle(b.name); }}
                                                                        className={`rounded p-0.5 border transition-colors ${awardBadge === b.key ? 'border-purple-400 bg-purple-500/20' : 'border-transparent hover:bg-white/10'}`}
                                                                    >
                                                                        <BadgeArt badge={b} size={36} />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <input
                                                                value={awardTitle}
                                                                onChange={(e) => setAwardTitle(e.target.value)}
                                                                maxLength={60}
                                                                placeholder="Pick a badge…"
                                                                aria-label="Award title"
                                                                className="h-8 rounded bg-black/50 border border-purple-500/50 text-xs text-white px-2 outline-none focus:border-purple-400"
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleGrantAward(entry)}
                                                                    disabled={!canGrant}
                                                                    className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white text-xs font-medium rounded transition-colors flex items-center justify-center"
                                                                >
                                                                    {isGranting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setGrantingToId(null)}
                                                                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setGrantingToId(entry._id); setAwardBadge(null); setAwardTitle(''); }}
                                                            className="flex items-center gap-2 w-full justify-center px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg text-sm font-medium transition-all group-hover:border-purple-500/40"
                                                        >
                                                            <Medal className="h-4 w-4" /> Grant Award
                                                        </button>
                                                    )}
```

Opening the form resets badge and title, so a previous row's pick never carries over; that covers both cancel and success.

- [ ] **Step 6: Typecheck and lint the touched files**

Run: `cd /d/kria/client && npx tsc --noEmit -p . 2>&1 | grep -E "CategoryAnalyticsModal|organizer/components/badges" ; npx eslint src/pages/organizer/components/badges.tsx src/pages/organizer/components/CategoryAnalyticsModal.tsx`
Expected: the grep prints nothing (no type errors in touched files — the repo has pre-existing tsc output in `tsc.txt`, so filter, don't require exit 0); eslint reports no errors (a `react-refresh/only-export-components` warning on `badges.tsx` is acceptable).

- [ ] **Step 7: Run the client suite**

Run: `cd /d/kria/client && npx vitest run`
Expected: same pass/fail set as on `main` (no client test covers this modal; this guards against an import-time break).

- [ ] **Step 8: Manual check** (server from Task 1 running locally)

Run the client (`npm run dev`), open an organizer tournament → Categories → **Awards** on a completed category → **Grant Award** on a player row. Verify: 12 badges render with gradients (not black/blank); clicking one fills the title; Confirm is disabled until a badge is picked and when the title is cleared; Confirm succeeds and the alert shows; reopening the form on another row starts empty.

- [ ] **Step 9: Commit**

```bash
cd /d/kria/client && git add src/pages/organizer/components/badges.tsx src/pages/organizer/components/CategoryAnalyticsModal.tsx
git commit -m "feat: pick a preset badge when granting an award

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: End-to-end check

- [ ] **Step 1:** With server (Task 1) and client (Task 4) running, grant `Season MVP` (legendary) and `First Cap` (steel) to one player via the modal.
- [ ] **Step 2:** In the mobile app logged in as that player, open Profile: Honors shows Season MVP first with a pulsing halo, First Cap with no halo, then any "Winner of …" titles with the gold trophy badge. Switch to light mode (Settings → Appearance): text stays legible, badges keep their dark plate.
- [ ] **Step 3:** Open the same player from Explore (public profile): the Titles section shows the same rows.
- [ ] **Step 4:** Enable the OS Reduce Motion setting: the halo stays drawn and stops pulsing.
