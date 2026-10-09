# Handover — Cricket quick knockout

For the session that designs and builds the **cricket** version of the quick knockout. The badminton quick knockout is finished, merged to `main` in both repos, and played on a phone. The user's ask, in their words: *"whatever rules and system we proposed and created for the badminton quick knockout, similarly we need to do for cricket."*

Read this first, then the badminton spec (the rules being mirrored), then the code it points to.

## What to read

| Doc | Path | Why |
|---|---|---|
| Badminton knockout spec (approved, implemented) | `mobile/docs/superpowers/specs/2026-10-06-quick-knockout-design.md` | The rules to mirror. Note §1.8 text is stale: the champion honour is now removed by `{badge, ref: knockoutId}`, not by exact title. |
| Badminton knockout plan | `mobile/docs/superpowers/plans/2026-10-07-quick-knockout.md` | Shape of a good plan for this codebase (TDD, full code, per-task commits). The implemented code moved past it in places — trust the code. |
| Badminton handover | `mobile/docs/superpowers/plans/2026-10-07-quick-knockout-handover.md` | Original gotchas list (still valid). |
| Design system | `mobile/DESIGN.md`, `mobile/AGENTS.md` | Tokens, type, motion; Expo SDK 57 rules. |
| Daily log | `D:\kria\daily-log\2026-10-07.md` | What shipped, in plain language. |

These three docs and this handover are **untracked** in `mobile/` on purpose (the user chose not to commit them). Ask before committing any of them.

## Status at handover

- Badminton knockout + refinements are on `main`, not pushed by me (the user pushes):
  - `server` @ `0c7ff0f` (2 commits ahead of `origin/main` at handover)
  - `mobile` @ `907daf0` (6 commits ahead of `origin/main` at handover)
- Test baselines on `main`: **server 102 files / 691 tests**, **mobile 124 suites / 1170 tests**; tsc, lint, build clean.
- The refinements (awards screen, knockout label in recent matches, profile Knockouts section, 5 + See all recent matches) have **not** been tried on a phone yet.
- Cricket knockout: **nothing designed or built yet.** Start with brainstorming.

## How to run this session (the user's established preferences)

1. **Brainstorming → spec → plan → execution**, the same way the badminton knockout was built. This is an **architectural** change: ask the open questions below **one at a time**, propose approaches, present the design in sections, write the spec to `mobile/docs/superpowers/specs/<date>-cricket-knockout-design.md`, get it approved, then `writing-plans`.
2. At execution start, ask the user (as last time): **subagent-driven** (they chose it last time — fresh implementer + reviewer per task, opus for the core-logic review and the final review) or native; **per-task commits** (yes last time); **feature branch** in both repos (yes last time); whether to commit the docs (no last time).
3. **Never push.** At the end, use `finishing-a-development-branch`; last two times the user chose **merge to main locally**.
4. Keep the **daily log** at `D:\kria\daily-log\<date>.md` in **plain language for a non-technical team** (the user asked for this rewrite). Engineering leftovers go in a short "For the engineers" section at the end.

## Repos and commands

`D:\kria` is **not** a repo. `D:\kria\server` and `D:\kria\mobile` are separate git repos. Windows; Git Bash and PowerShell both available.

| | Server | Mobile |
|---|---|---|
| One test file | `RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/<file>` | `npx jest __tests__/<file>` |
| Types | `npx tsc --noEmit` | `npx tsc --noEmit` |
| Lint | `npm run lint:fix` (whole repo, must exit 0) | `npx eslint <files>` |
| Build | `npm run build` | — |

## What carries over unchanged from badminton (don't re-open)

- Host-only scoring. One match format for every round, set at creation. Random draw; host can reshuffle until Start. No seeding, no third-place match, no per-round formats, no editing after Start, no claiming a guest after Start, no walkovers (all out of scope for v1, as for badminton).
- Players join **themselves** by code; the host types names only for guests or adds Kria players by search; a guest can be claimed by code while waiting.
- One record per knockout whose fixtures are ordinary quick matches (`knockoutId` + `fixtureId`). **`reconcile(knockoutId)` is the only thing that advances the bracket** — idempotent, heals on `GET` while live.
- Undo of a finished knockout match is allowed only while the match it feeds has had nothing scored; otherwise refused ("The next match has already started."). Undo is refused in a cancelled knockout.
- Knockout matches: no claim, remove-player or cancel of their own; excluded from `/quick-match/mine`; counted as ordinary quick matches in career stats.
- Awards: champion gets an automatic low-tier honour `Won <name>` (steel `knockout-winner` badge, carries `ref: knockoutId`); host can give up to 3 extra low-tier awards, not to themselves, only when ≥ 4 Kria players took part; organizers can never grant `knockout-winner`.
- Mobile: host chooser → knockout wizard; waiting room with code + Share + live list + draw bar pinned outside the scroll; sideways bracket tree; separate awards screen that auto-opens once for the host after the final (plus a Give awards button); knockouts on Home, the Quick matches list and the profile Knockouts section; join-by-code resolver; recent matches label "Knockout · <name> · <round>".

## Open questions for cricket (ask the user, one at a time)

Decide these in brainstorming; each has a cricket-specific reason it can't just be copied.

1. **How teams form.** Entrants are teams of N players, not singles/pairs. The closest mirror of doubles ("everyone joins solo; the host may pair by hand; the draw pairs the rest") is: *everyone joins solo; the host may group players into teams by hand; the draw fills the remaining teams at random; a player count that isn't a multiple of the team size blocks the draw* (like the odd-doubles block). Alternatives: host creates named teams and players pick a team when joining; captains pick. Recommend the mirror.
2. **Ties.** A knockout match needs a winner, but a cricket quick match can end `outcome: 'tied'` (engine: equal runs → no winner; there is **no super over** implemented). Options: host picks the winner of a tied knockout match (simplest); a tie-break rule (fewer wickets lost, then more boundaries — needs data the engine may not keep); build a super over (big). Must be decided — the current reconcile would wrongly advance `entrantB` on a tie.
3. **Size limits.** Badminton allows 3–16 entrants (up to 32 players). Cricket teams of up to 11 make that unrealistic. Decide entrant range (e.g. 3–8 teams?) and a total player cap.
4. **Match format.** Existing cricket quick-match config: overs per innings (1–50, wizard default 8), players per team (2–11, wizard default 6), overs per bowler (server default 4, not exposed). One format for every round — which knobs does the knockout wizard expose?
5. **Team names.** Auto ("Team 1…", or "<captain>'s XI") vs. host-editable. Match side names come from these.
6. **Awards for cricket.** The host's extra-award list is `iron-player, first-cap, ace-serve, fair-play`; `ace-serve` is a badminton badge. Which four low-tier badges does a cricket knockout offer? Premium cricket badges (`centurion`, `hat-trick`, …) are organizer-only today — keep them so unless the user says otherwise.
7. **Toss and lineups in knockout matches.** Every cricket quick match needs a toss and both lineups before the first ball (host-only, `CricketSetupPanel`). Proposed: same per-match flow, lineups pre-filled from the team roster. Confirm.
8. **Mixed knockouts?** Can one knockout record be badminton or cricket (sport chosen in the wizard) — recommended — vs. a separate cricket model.

## Facts found in the code (verified at handover; file:line approximate)

**Server**
- Cricket discriminator `server/src/models/quickMatch.model.ts:234-284`: `teams{team1Id, team2Id}` (required, mirror the sideIds), `cricketSetup{toss{winnerTeamId, decision, recorded}, lineupsSet, side1Lineup[], side2Lineup[]}`, `liveState` (Mixed), `inningsScores[]`, `matchConfig{maxOvers=20, maxOversPerBowler=4, playersPerTeam 2–11 =11}`. Base `outcome` enum: `side1 | side2 | tied | no_result` (`no_result` never written).
- `quickMatchService.createForKnockout` (`server/src/services/quickMatch.service.ts:~180-206`) is **badminton-hardcoded**: `matchConfig {bestOf, pointsToWin}`, `repository.create('badminton', …)`, and it does **not** set cricket `teams` (required) — must be generalised. `_buildSides(sides, sideIds?)` already lets side ids equal entrant ids (the reconcile "fit" relies on this).
- `QuickKnockoutModel` (`server/src/models/quickKnockout.model.ts`): `sport` enum `['badminton']`, `format` `singles|doubles`, `matchConfig {bestOf enum, pointsToWin enum}` required, `optimisticConcurrency: true`, `KNOCKOUT_LIMITS {min 3, max 16}`.
- `server/src/services/quickKnockout.service.ts` badminton assumptions: `hasPoints` reads `gameScores` (always false for cricket — needs "any ball bowled", e.g. `liveState`/innings/balls); `CreateKnockoutInput` shape; reconcile passes badminton `matchConfig`; winner = `outcome === 'side1' ? A : B` (**tie bug for cricket**); `_side` builds 1–2 slots and joins first names with " & "; `draw`/`pair`/`unpair` are singles/doubles; `_maxPlayers` 16/32; `QUICK_AWARD_BADGES` has `ace-serve`.
- Cricket scoring `server/src/sports/cricket/services/quickCricketScoring.service.ts`: `recordToss` (needs `status === 'live'`), `recordLineup` (one side per call; `lineupsSet` when both non-empty), `recordBall` (needs toss + lineups). Completion on `result.matchEnded` → `outcome` side1/side2/**tied** → `careerStatsService.recordQuickMatchCompletion`. **No knockout wiring yet**: needs `reconcile` after completion (log-and-continue, like `quickBadmintonScoring.service.ts`), and in `undoLastBall` an `assertUndoAllowed` check **before** anything changes when the match was completed, then `reconcile` after persist. `undoLastBall` can reopen a completed match (clears participation first).
- Career stats for cricket quick matches come from `sides[].slots[].playerId` (`careerStats.service.ts` `recordQuickMatchCompletion`); tied → `tied` result. Knockout cricket matches will work if slots carry playerIds.
- `claimSlot` already refuses knockout matches (players don't claim match slots; slots are built from the knockout roster).

**Mobile**
- Cricket quick-match creation: `src/lib/quickHostWizard.ts` (overs default 8, squad 6, team names), `src/lib/quickCricketCreate.ts` (`validateCricketConfig` overs 1–50, squad 2–11; placeholder "Player N" slots), `src/components/quick/HostSteps.tsx` (overs/players steppers, team names).
- Cricket match screen `src/app/quick/[id].tsx` + `src/lib/quickCricketView.ts` `panelFor`: waiting → `CricketSetupPanel` (toss + lineups from `lineupFromSlots`) → `CricketScorePanel`. **Not knockout-aware**: `CricketScorePanel` shows "Cancel match" and the join-code row for knockout matches (badminton's `MatchPanel` hides them via `managed = Boolean(match.knockoutId)` — mirror that). After completion the panel hides undo (so "undo a finished knockout match" is not reachable from the cricket UI today — decide whether that's fine or add it).
- Already sport-agnostic: the "<knockout> · <round> · ← Bracket" bar and the host-only awards auto-open on `quick/[id].tsx`; `useQuickKnockout`; the bracket tree (shows entrant names); join resolver; lists.
- Knockout UI that is badminton-shaped: `src/app/knockout/new.tsx` (format = singles/doubles, bestOf, points), `src/components/knockout/KnockoutWaitingRoom.tsx` (doubles pairing by tapping two players; `drawBlocker` in `src/lib/quickKnockoutView.ts` mirrors the server's odd-doubles/≥3 rules), `src/lib/quickKnockoutView.ts` (`QUICK_AWARD_BADGES`, `entrantName` " & " join).

## Hard-won lessons from the badminton build (apply them)

- **Reconcile must recompute from first principles**: find each fixture's match by `fixtureId` and check it "fits" (`sides[0].sideId === entrantA && sides[1].sideId === entrantB`); delete an unfitting match only if nothing has been scored; recompute the champion every time and move the honour; skip the write when nothing changed. Never trust a stored pointer.
- **Knockout saves are version-checked** (`optimisticConcurrency`); `quickKnockoutRepository.persist` maps `VersionError` to "Someone just changed this knockout. Try again." Reconcile calls from scoring and from `GET` log-and-continue; `getById` re-reads after a failed heal.
- **Public `POST /quick-match` must never accept client side ids** — only `createForKnockout` sets them.
- **Shared socket**: always `acquireSocket`/`releaseSocket` from `@/lib/socket`; never `socket.disconnect()`.
- **typedRoutes is on**: a new route type-checks only after `.expo/types/router.d.ts` is regenerated — start `npx expo start --offline` in the background briefly, stop it, leave nothing running. Never cast an href.
- **Don't run Bash commands for both repos in parallel tool calls** — they shared a working directory once and jest ran against the server tree. Run cross-repo gates one after another, with `pwd` in the command.
- Subagents occasionally leave scratch files (e.g. `test_run_*.txt`) in a repo or a co-author trailer on the subject line — check `git status` after each task.
- Plan text is not compiled code: three plan-mandated defects were caught only by review (a tautological reshuffle test, the pointer-based reconcile, a `Promise.all` that blanked a list on a secondary failure). Keep the per-task review.

## Gotchas (unchanged, still bite)

**Server**
- No `server/.env`: any test importing `app` needs the two dummy Razorpay vars. Full vitest under load can flake on 1–5 unrelated files (timeouts) — re-run those alone.
- Commit-message hook: `^(fix|feat|chore|perf|bugs|docs|breaking_changes|refactor|add|Merge|merge|test|tests|updated|changed|added|created|create) .*$` — verb, space, **no colon**. Pre-commit runs `npm run lint:fix && npm run build` over the whole repo. No `console` (use `logger`), no explicit `any`, no unused vars.
- No Mongoose calls outside `repository/` and `models/`. Tests relying on a unique index `await Model.init()` first. Collections are cleared after each test.
- We do not use AWS for logging (CloudWatch transport is dead weight; its SDK prints a deprecation note in test output).

**Mobile**
- Never `style={({ pressed }) => …}` on `Pressable` (`__tests__/pressableStyleFence.test.ts`); press feedback via `usePress()` (`src/lib/motion.ts`).
- `className` on Reanimated `Animated.View` is ignored — inline styles.
- Font fence (`__tests__/fontLeading.test.ts`): `Anton_400Regular` needs an integer `lineHeight` ≥ 1.188 × fontSize; Space Mono with a `lineHeight` needs ≥ 1.061 × fontSize (prefer none).
- Colour fence: files in `test-utils/colourLiterals.ts` `MIGRATED` may not contain colour literals; new screens use `useTheme()` tokens and join `MIGRATED`.
- Back buttons: `goBack(router, fallback)` from `@/lib/nav`, never bare `router.back()`. Import router hooks from `expo-router`; tests that mock `expo-router` and render `Badge` need `useIsFocused: () => true`.
- `npm install` needs `--legacy-peer-deps`.

## After the build

- The user pushes and restarts the server, then tests on two phones.
- Update the daily log (plain language).
- Open follow-ups carried from before: walkovers for knockouts; quick matches letting players join themselves; remove the unused CloudWatch logger; dummy Razorpay vars in `server/test/setup.ts` (ask first); two lint errors in `mobile/src/components/auth/AuthInput.tsx`; spec §1.8 wording (honour removal by `ref`).
