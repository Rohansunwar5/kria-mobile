# Handover — quick knockouts (badminton + cricket), for the next round of changes

For the next session, whatever it changes about quick knockouts. Both sports are built, reviewed, merged to `main` in both repos, and pushed. Nothing is in flight. Read this first, then whichever doc in the table matches the change you're asked for.

## Status at handover (8 Oct 2026)

| | Server (`D:\kria\server`) | Mobile (`D:\kria\mobile`) |
|---|---|---|
| Branch | `main` @ `3f94837` | `main` @ `c0dfe88` |
| Remote | local `main` 3 ahead of `origin/main` (draw fix + match-screen redesign, not pushed) | local `main` 5 ahead (same) |
| Tests | 108 files / **739** tests (vitest) | 129 suites / **1222** tests (jest) |
| Types / lint | `tsc` clean, `npm run lint:fix` clean, build clean | `tsc` clean, eslint clean (1 old warning in `test-utils/colourLiterals.ts`) |

- **Cricket on a phone:** first tried 8 Oct. Its waiting room had a draw-reset bug, now fixed (server `4e7bea5`, mobile `6aca775`). The rest of the cricket flow is still untested on a phone. The badminton knockout was played once on a phone on 7 Oct (that produced the awards screen, recent-matches label, profile Knockouts section).
- Feature branches `feat/cricket-knockout` were merged (fast-forward) and deleted.
- Untracked on purpose in `mobile/docs/superpowers/`: the specs, plans and handovers for both knockouts (incl. this file). **The user chose not to commit docs — ask before committing any.**
- Daily log: `D:\kria\daily-log\2026-10-07.md` (badminton) and `2026-10-08.md` (cricket), plain language.

## What to read

| Doc | Path | When |
|---|---|---|
| Cricket knockout spec (approved, implemented) | `mobile/docs/superpowers/specs/2026-10-07-cricket-knockout-design.md` | Any cricket change. Note: one later ruling is not in it — fixtures derive `maxOversPerBowler` (see "Behaviour worth knowing"). |
| Badminton knockout spec | `mobile/docs/superpowers/specs/2026-10-06-quick-knockout-design.md` | The shared rules. §1.8 text is stale: honours are removed by `{badge, ref: knockoutId}`, not by title. |
| Cricket plan (10 tasks, full code) | `mobile/docs/superpowers/plans/2026-10-07-cricket-knockout.md` | Shape of a good plan here; trust the code where they differ. |
| Earlier handovers | `…/plans/2026-10-07-quick-knockout-handover.md`, `…/2026-10-07-cricket-knockout-handover.md` | Background only; this file supersedes them. |
| Quick cricket match screen spec + plan | `mobile/docs/superpowers/specs/2026-10-08-quick-cricket-ui-design.md`, `…/plans/2026-10-08-quick-cricket-ui.md` | Any change to the cricket match screen (setup, pad, live view, scorecard). |
| Design system / Expo rules | `mobile/DESIGN.md`, `mobile/AGENTS.md` | Any UI change. |

## How it works (map)

**One model for both sports.** A `QuickKnockout` record (`server/src/models/quickKnockout.model.ts`) whose fixtures are ordinary quick matches (`knockoutId` + `fixtureId` on `QuickMatch`).

- `sport: 'badminton' | 'cricket'`; `format: 'singles' | 'doubles' | 'teams'` (cricket = `teams`); `matchConfig` keys per sport (badminton `bestOf/pointsToWin`, cricket `maxOvers/playersPerTeam`), validated per sport in `createKnockoutValidator`.
- Cricket: `teams: [{ teamId, name }]`; each player has optional `teamId` (absent = Any team) and `drawn` (true = the draw placed them). Entrants are the teams (`entrantId === teamId`).
- **Everything a sport does differently** lives in `server/src/services/knockoutSports.ts`: `minEntrants`, `maxPlayers(k)`, `awardBadges`, `sideName`, `matchConfig(k, squadA, squadB)`, `hasStarted(m)`. A new sport = one entry there + its scoring service calling `reconcile`.
- `server/src/services/quickKnockout.service.ts`: create, join (`teamId?`), claim, add/remove player, pair/unpair (doubles), `movePlayer`, `addTeam/removeTeam/renameTeam` (cricket), `draw` (`_dealTeams` for cricket, `_undeal`, `_clearDraw`), `start`, **`reconcile`** (the only thing that advances the bracket), `assertUndoAllowed`, **`settleTie`**, `cancel`, `grantAward`.
- Scoring hooks: `server/src/sports/badminton/services/quickBadmintonScoring.service.ts` and `server/src/sports/cricket/services/quickCricketScoring.service.ts`. Each one calls `reconcile` after a knockout match completes, logging failures and carrying on. On undo of a finished knockout match it calls `assertUndoAllowed` before anything changes, then reconciles afterwards. Cricket also clears `tieWinnerSideId`.
- `quickMatchService.createForKnockout({ sport, … })` is the only way a knockout match is made; it sets cricket `teams` from the side ids. Public `POST /quick-match` never accepts client side ids.
- Routes: `server/src/routes/quickKnockout.route.ts` (`/quick-knockout/...`, plus `GET /quick-code/:code` resolver).

**Mobile.**
- Data: `src/api/quickKnockout.ts` (types and calls), `src/lib/useQuickKnockout.ts` (load, socket `knockout:update`, one action per endpoint), and `src/lib/quickKnockoutView.ts`. The view helpers are `entrantName/ShortName`, `formatLabel`, `teamPlayers`, `drawBlocker` (mirrors the server's deal), `awardBadges`, `bracketColumns` and `isPlayable`.
- Screens:
  - Wizard: `src/app/knockout/new.tsx` (Sport → Format → Name → Review).
  - Knockout screen: `src/app/knockout/[id].tsx` (waiting room / bracket / champion).
  - Awards: `src/app/knockout/awards/[id].tsx`.
  - Join: `src/app/quick/join.tsx` (team picker for cricket).
  - Match screen: `src/app/quick/[id].tsx` (knockout bar, awards auto-open, `TiePick`).
- Components (`src/components/knockout/`): `KnockoutWaitingRoom` (+ `KnockoutDrawBar`), `CricketTeams`, `PlayerLine`, `BracketTree`, `KnockoutRow`, `TiePick`.
- `src/components/quick/CricketScorePanel.tsx` hides Cancel and the join code when `match.knockoutId` is set (`managed`), as `MatchPanel` does for badminton.

## Behaviour worth knowing (decided, don't re-open without the user)

- Host-only scoring; one format for every round; random draw with reshuffle until Start; no seeding, third place, per-round formats, editing after Start, or walkovers.
- Cricket: 3–8 teams; overs 1–50 (default 8); players per team 2–11 (default 6). Teams may be uneven, but each needs ≥ 2 players at the draw. Each match plays to the **smaller** squad (`playersPerTeam = min`).
- **Bowler limit:** each cricket fixture gets `maxOversPerBowler = max(4, ceil(maxOvers / smaller squad))`. That stays 4 unless the small team couldn't otherwise finish its overs. This was a ruling after the final review, because without it a match could stall for good. Ordinary cricket quick matches still use a flat 4 (see follow-ups).
- **Ties:** cricket `outcome: 'tied'` advances nobody until the host's `POST /:id/tie { fixtureId, entrantId }`. That stores `tieWinnerSideId` on the match; careers still record a tie. The pick is final (confirm dialog), and if the pick decides the final, the host's awards screen opens.
- "Has this match started?" — badminton: any point; cricket: **a stored ball** (not `liveState`, which survives a first-ball undo).
- Cricket: a player change (join, add, remove, move) **keeps the draw**, so only that player changes. A team counts as full including its `drawn` players. Start refuses while anyone is in Any team or a team has fewer than 2 (mobile `startBlocker` mirrors this). Adding or removing a team clears the draw and sends `drawn` players back to Any team. Badminton: any roster change clears the draw. Claim and rename never clear it. Reshuffle re-deals `drawn` players plus Any team. *(Changed 8 Oct after the first phone test: a move used to wipe the whole draw.)*
- **Cricket match screen (redesigned 8 Oct)** — spec `specs/2026-10-08-quick-cricket-ui-design.md`, plan `plans/2026-10-08-quick-cricket-ui.md`:
  - **Server:**
    - Recording the toss fills both squads from the slots, so there is no batting-order step.
    - `GET /quick-match/:id/scorecard` serves `{ innings1, innings2 }` via `buildInnings`. The ids in it are slot ids.
  - **App:**
    - Everyone sees `QuickCricketLive`, which reuses the tournament `HeroScore`, `AtTheCrease`, `RecentOvers` and `ScorecardTabs`.
    - The host scores on `CricketScorePanel`, pinned under the scroll. Refusals show at the top of the pad.
    - Cancel and the join code sit in `CricketHostTools`, in the scroll.
- Refused host actions show in the pinned draw bar. A host who removed themselves gets an **Add me** button, because player search never returns the person searching.
- Awards: champion team's Kria players get `Won <name>` (`knockout-winner`, `ref: knockoutId`); host gives up to 3 extras, not to self, only if ≥ 4 Kria players. Badminton: Iron Player, First Cap, Ace Serve, Fair Play. Cricket: the same minus Ace Serve.
- No undo after a cricket match ends in the UI (same as cricket quick matches); the server still guards it.

## Open follow-ups (none started)

From the final review, in suggested order:
1. **Show team rosters after Start** (cricket). The live bracket shows team names only, so a player whose team has a first-round bye can't see which team they're on. Mobile only: e.g. a collapsible list on `src/app/knockout/[id].tsx` using `teamPlayers`.
2. **Hide the tie picker in a cancelled knockout.** `src/app/quick/[id].tsx` shows `TiePick` for any tied knockout match; the server then refuses ("This knockout is not live."). The screen already fetches the knockout for the bar title, so it can check `status === 'live'`.
3. **Ordinary cricket quick matches can stall** when overs > 4 × squad (the host can cancel there). Fix: send a derived `maxOversPerBowler` from `src/lib/quickCricketCreate.ts` / `buildCricketCreateBody`, or derive it on the server in `quickMatchService.create`.

Parked minors (low risk, pick up when touching the area):
- `settleTie` is check-then-set without a lock. In the app, the confirm dialog plus the busy state make a double tap harmless; the race only exists API-only. A conditional update would close it.
- Join screen: a "That team is full." refusal doesn't re-run the lookup, so the picked team stays highlighted.
- Validators accept numeric strings (`isInt`) but the service's `Number.isInteger` would 400 them. The app always sends numbers; add `.toInt()` if it matters.
- Test gaps: validator sport branch (e.g. `sport: 'football'` → 422); clear-draw for addPlayer/removePlayer/addTeam/removeTeam (behaviour verified by a scratch test, not committed); cricket undo-the-final; reconcile log-and-continue in scoring; mobile tie-pick error path; wizard switching cricket → badminton.
- Small duplication: the `fits` predicate (reconcile + settleTie); the cricket `teams` mirror (create + createForKnockout).
- Match screen redesign leftovers:
  - Pull-to-refresh doesn't re-read the scorecard. `useQuickScorecard` only re-reads when the score key changes.
  - A cancelled match keeps the orange "live" border on `HeroScore`.
  - `getQuickScorecard`'s unwrap guard uses `as any`.
  - No server test that a squad an older app already sent survives the toss.
  - The stale "Btn" comment in `CricketScorePanel`.
  - Busy keys and toss buttons have no `accessibilityState.disabled`.

Product ideas the user has mentioned (not designed):
- Walkovers / retirements.
- Players joining ordinary quick matches by code.
- In-app super over.
- Players switching their own team.

Older engineering leftovers:
- Remove the unused CloudWatch logger.
- Dummy Razorpay vars in `server/test/setup.ts` (ask first).
- Two lint errors in `mobile/src/components/auth/AuthInput.tsx`.
- Update the badminton spec's §1.8 wording.

## How the user works

- Small fix → bounded path (short design in chat, approve, build). New feature / restructure → **brainstorming → spec → plan → execution**, questions one at a time, multiple choice with a recommendation. The user said "don't make it very complex" and judges on UX, not effort; when unsure they ask "which is better technically" — give a clear pick with reasons.
- Execution last two times: **subagent-driven**, **per-task commits**, **feature branch in both repos**, **docs not committed**, finish with **merge to main locally**. Ask again at execution start; don't assume.
- **Never push** — the user pushes and restarts the server, then tests on two phones.
- Keep the **daily log** `D:\kria\daily-log\<date>.md` in plain language for a non-technical team; engineering notes in a short "For the engineers" section at the end.
- The user often interrupts a dispatch and says "continue"/"proceed": check `git status` in the repo first. Interrupted agents have left partial files twice (a whole test file once, two import lines once); hand those to the next implementer to reuse.

## Repos and commands

`D:\kria` is **not** a repo. Windows; Git Bash and PowerShell both available.

| | Server | Mobile |
|---|---|---|
| One test file | `RAZORPAY_KEY_ID=rzp_test_dummy RAZORPAY_KEY_SECRET=dummy npx vitest run test/<file>` | `npx jest __tests__/<file>` |
| Full suite | same without a file (~2 min) | `npx jest` (~1 min) |
| Types | `npx tsc --noEmit` | `npx tsc --noEmit` (covers `__tests__` too) |
| Lint | `npm run lint:fix` (whole repo, must exit 0) | `npx eslint <files>` |
| Build | `npm run build` | — |

Cricket knockout test files: server `test/quickKnockoutCricket{Create,Teams,Draw,Bracket,Scoring}.test.ts`; mobile `__tests__/CricketTeams.test.tsx`, plus cricket cases in `JoinScreen`, `NewKnockoutScreen`, `QuickMatchScreen`, `KnockoutWaitingRoom`, `KnockoutAwardsScreen`, `CricketScorePanel`, `quickKnockoutView`, `quickKnockoutApi`, `useQuickKnockout`.

## Gotchas (all still bite)

**Server**
- No `server/.env`: tests importing `app` need the two dummy Razorpay vars. A full run can flake 1–5 unrelated files on timeouts; re-run those alone. The AWS SDK prints a deprecation note in test output (the CloudWatch transport is unused).
- Commit-msg hook: `^(fix|feat|chore|perf|bugs|docs|breaking_changes|refactor|add|Merge|merge|test|tests|updated|changed|added|created|create) .*$` — verb, space, **no colon**. Pre-commit runs `lint:fix && build` over the whole repo. No `console` (use `logger`), no explicit `any`, no unused vars (args before a used one are allowed).
- No Mongoose calls outside `repository/` and `models/`. Tests relying on a unique index `await Model.init()` first. Collections are cleared after each test.
- Server files are CRLF on disk; keep them that way.
- Knockout saves are version-checked (`optimisticConcurrency`); `persist` maps `VersionError` to "Someone just changed this knockout. Try again." Reconcile from scoring / GET / settleTie logs and carries on.
- Reconcile recomputes from first principles: it finds each fixture's match by `fixtureId`, checks that it "fits" (side ids = entrant ids), deletes an unfitting match only if it hasn't started, and recomputes and moves the champion honour. Never trust a stored pointer.

**Mobile**
- Never `style={({ pressed }) => …}` on `Pressable` (`__tests__/pressableStyleFence.test.ts`); press feedback via `usePress()`.
- `className` on Reanimated `Animated.View` is ignored — inline styles.
- Font fence: `Anton_400Regular` needs an integer `lineHeight` ≥ 1.188 × fontSize; Space Mono with a lineHeight ≥ 1.061 × (prefer none).
- Colour fence: files in `test-utils/colourLiterals.ts` `MIGRATED` may not contain colour literals; new screens/components use `useTheme()` tokens and join `MIGRATED`. (`src/app/quick/join.tsx` and `src/app/quick/[id].tsx` are not migrated and use literals.)
- `src/app/quick/index.tsx` and `src/components/home/PlayPortal.tsx` define their own `formatLabel` (quick matches) — import the knockout one as `formatLabel as knockoutFormatLabel`.
- Back buttons: `goBack(router, fallback)` from `@/lib/nav`. Router hooks from `expo-router` (never `@react-navigation/*`). Tests that mock `expo-router` and render `Badge` need `useIsFocused: () => true`.
- Android `Alert` shows at most 3 buttons — use inline pickers (as `CricketTeams` does) for longer choices.
- Shared socket: `acquireSocket`/`releaseSocket` from `@/lib/socket`; never `socket.disconnect()`.
- typedRoutes is on: a new route type-checks only after `.expo/types/router.d.ts` regenerates — start `npx expo start --offline` briefly, stop it, leave nothing running. Never cast an href.
- `npm install` needs `--legacy-peer-deps`.

**Process (subagent-driven)**
- Don't run commands for both repos in parallel tool calls; put `pwd` in commands.
- When a plan's docs live in `mobile` but a task runs in `server`, pass an explicit OUTFILE to the review-package script (it uses the cwd's repo).
- Implementers write their own model in the co-author trailer (10 of 13 cricket commits say "Claude Sonnet 5.5"); the user accepted that.
- Reviews keep catching what plans miss. The reshuffle test needed a "prove it bites" step, and the bowler-limit stall was a spec gap. Keep the per-task review and the final opus review.
