# Handover — Quick Knockout execution

For the session that builds the quick knockout. Read this first, then the plan, then the spec.

## What to read

| Doc | Path |
|---|---|
| Plan (15 tasks, TDD, full code) | `mobile/docs/superpowers/plans/2026-10-07-quick-knockout.md` |
| Spec (approved by the user 2026-10-07) | `mobile/docs/superpowers/specs/2026-10-06-quick-knockout-design.md` |
| UI mockups (git-ignored, reference only) | `mobile/.superpowers/brainstorm/1136-1791290577/content/knockout-hub.html` (option **B**, sideways tree, chosen) and `waiting-room.html` (approved) |
| Design system | `mobile/DESIGN.md`, `mobile/AGENTS.md` |

## Status at handover

- Brainstorm → spec → plan: **done and approved**. Implementation: **not started**.
- **Execution method: not chosen yet.** Ask the user at the start: *subagent-driven* (fresh implementer + reviewer per task) or *native* (one session implements, one final review). Recommendation given: subagent-driven — 15 tasks, later tasks consume exact signatures from earlier ones, and a wrong bracket advance or a leaked honour is costly to unwind.
- **Commits:** the plan has a commit step per task. Confirm with the user that per-task commits are wanted before making the first one; never push.
- Both repos are on `main`, clean, with the previous feature (live quick-match updates + waiting room + lint cleanup) already committed:
  - `server` @ `edf1580`
  - `mobile` @ `cefeb5d` — untracked: this handover, the plan and the spec (ask whether to commit them).
- Ask the user whether to work on `main` or a feature branch in each repo before Task 1.

## Repos and commands

`D:\kria` is **not** a repo. `D:\kria\server` and `D:\kria\mobile` are separate git repos. Windows; Git Bash and PowerShell are both available.

| | Server | Mobile |
|---|---|---|
| One test file | `RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/<file>` | `npx jest __tests__/<file>` |
| Types | `npx tsc --noEmit` | `npx tsc --noEmit` |
| Lint | `npm run lint:fix` (whole repo, must exit 0) | `npx eslint <files>` |
| Build | `npm run build` | — |
| Baseline before this work | 93 files / 612 tests green | 110 suites / 1083 tests green |

## Gotchas that will bite

**Server**
- No `server/.env` exists locally. Any test importing `app` dies at load without the two dummy Razorpay vars above.
- The full vitest suite under load occasionally fails 1–5 *unrelated* files (timeouts). Re-run those files alone before believing them.
- **Commit message hook:** `^(fix|feat|chore|perf|bugs|docs|breaking_changes|refactor|add|Merge|merge|test|tests|updated|changed|added|created|create) .*$`. That means verb, then space, **no colon**: `feat knockout draw`, never `feat: knockout draw`.
- **Pre-commit hook** runs `npm run lint:fix && npm run build` over the whole repo, so all of it must be lint-clean. Rules: no `console` (use `import logger from '…/utils/logger'`), no explicit `any`, no unused vars.
- No Mongoose calls outside `repository/` and `models/`. Services go through repositories.
- Tests that rely on a unique index must `await Model.init()` first, because in-memory Mongo builds indexes lazily.
- Concurrent `reconcile` saves can hit Mongoose's version check. The plan's race test uses `Promise.allSettled` plus a healing reconcile on purpose; don't "fix" it with retries.
- We do **not** use AWS for logging. The CloudWatch transport in `src/utils/logger` is dead weight; never rely on it.

**Mobile**
- **Never** `style={({ pressed }) => …}` on `Pressable`. NativeWind drops it on native, so buttons vanish on iPhone. `__tests__/pressableStyleFence.test.ts` enforces this. For press feedback use `usePress()` from `src/lib/motion.ts`.
- `className` on a Reanimated `Animated.View` is silently ignored. Use inline styles there.
- Font fence (`__tests__/fontLeading.test.ts`):
  - every `Anton_400Regular` style needs an integer `lineHeight` ≥ 1.188 × `fontSize`
  - Space Mono with a `lineHeight` needs ≥ 1.061 × `fontSize`; leave `lineHeight` off Space Mono
- Colour fence: files in `test-utils/colourLiterals.ts` → `MIGRATED` may not contain colour literals. New screens use `useTheme()` tokens and get added to `MIGRATED`, as the plan says per task.
- Back buttons use `goBack(router, '/quick')` from `@/lib/nav`, never bare `router.back()`. A bare one throws "GO_BACK not handled" after a web refresh.
- `expo-router` 57 vendors react-navigation, so import hooks from `expo-router`. Tests that mock `expo-router` and render `Badge` must include `useIsFocused: () => true`.
- Socket: the app shares one `socket` (`src/lib/socket.ts`). Hooks join `match:<id>` via `join:match` and disconnect on unmount (the established pattern).

## How the feature fits together (one paragraph)

`QuickKnockout` (server) holds players → pairs (doubles) → entrants → fixtures. Draw = preview only. Start = live, then `reconcile`. `reconcile(knockoutId)` is the **only** thing that advances the bracket:
- it derives every fixture's entrants and winner from byes and quick-match outcomes
- it creates a quick match (`knockoutId` + `fixtureId`) for any fixture with two entrants
- it deletes a match whose entrants an undo pulled back (only if it has no points)
- it crowns or un-crowns the champion, and gives or takes the low-tier `knockout-winner` honour

It runs after a knockout match completes, after a completed one is undone, on Start, and on `GET /quick-knockout/:id` while live, which is the self-heal path. Scoring stays host-only on the existing quick match screen.

## Decisions already made (don't re-open)

- Badminton only; singles or doubles; 3–16 entrants; one match format for every round; host-only scoring.
- Players join themselves by code. The host types names only for guests, and a guest can be claimed by code while the knockout is waiting.
- Doubles: everyone joins solo. Pairs the host makes survive a reshuffle; the draw pairs the rest at random. An odd count blocks the draw.
- Bracket UI: sideways-scrolling tree.
- Awards are low-tier only. The champion gets "Won <name>" with the new steel `knockout-winner` badge (organizers can't grant it). The host can give up to 3 extras from iron-player, first-cap, ace-serve and fair-play, not to themselves. No awards unless ≥ 4 Kria players took part.
- Out of scope for v1: cricket, walkovers, player self-scoring, seeding, third-place match, per-round formats, editing after Start, claiming a guest after Start.

## After the build

- The user must **redeploy/restart the server** and test on a phone (plan Task 15, Step 6).
- Add a line to `D:\kria\daily-log\<date>.md` (the user keeps a daily log there).
- Open follow-ups noted by the user or along the way:
  - walkovers for knockouts
  - quick matches should also let players join themselves rather than find their name
  - remove the unused CloudWatch logger
  - add dummy Razorpay vars to `server/test/setup.ts` (ask first)
  - two lint errors left in `mobile/src/components/auth/AuthInput.tsx` (`focus.value =` under `react-hooks/immutability`), predating this work
