# Tournament details (2a–2f) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old tournament screens in the player app with 2a–2f built on the new design system, backed only by real server data, with paid entry working end to end.

**Architecture:** Typed API functions in `src/api/`, pure view logic in `src/lib/*.ts` (one file per screen concern, each with a jest test), thin screens in `src/app/` that lay out what the view logic returns, and small components in `src/components/tournament/`. Data loads in `useFocusEffect` with local state, as the rebuilt tabs do. One bracket component is shared with the quick-knockout room.

**Tech Stack:** Expo SDK 57, React Native 0.86, expo-router 57, TypeScript 6, jest-expo + @testing-library/react-native, axios-mock-adapter, react-native-webview (Razorpay checkout), expo-secure-store (via `src/lib/secureStore.ts`).

**Spec:** `mobile/docs/superpowers/specs/2026-10-22-tournament-details-design.md` (approved 2026-10-22). Read it with this plan; it holds every copy string and rule this plan refers to as "per spec".

## Global Constraints

- All paths below are under `d:/kria/mobile/` unless they start with `d:/`. Commands run from `d:/kria/mobile/`.
- **No git.** There are no commit steps. Each task ends with its gates instead: `npx tsc --noEmit` clean and the task's jest files passing.
- **Back up before deleting:** copy each file to `d:/kria/deleted-old-ui/pass8/<same relative path>` first, then delete it. Grep for importers before every deletion.
- New code imports tokens from `@/constants/theme` and UI from `@/components/ui/*` only. Never `@/lib/theme`, `@/components/icons`, NativeWind `className`, or hex literals outside `constants/theme.ts`.
- Real data only: no mock sample values, no invented times, counts or notifications.
- All money is rupees. Never divide by 100. Format with `rupees()` (Task 2).
- Copy voice per DESIGN §11: second person, no exclamation marks, no emoji, sentence-case headings.
- Icons: add any missing Material Symbols name to `scripts/icons.mjs` and run `node scripts/icons.mjs`.
- Install nothing new. If something seems to need a package, stop and ask.
- Status tone → colour: `accent` → `colors.accent`, `text` → `colors.text`, `text2` → `colors.text2`, `text3` → `colors.text3`, `text4` → `colors.text4`.

## Review Focus

1. **A paid entry interrupted after Razorpay** (verify times out, app killed). Expect: the next open of 2b retries once and never offers a second Pay. Pinned by Task 4 `confirmPending` tests and Task 10's "saved result shows Confirm my entry" screen test.
2. **A tournament whose status lags its categories** (status `registration_closed` while a category auction is live). Expect: 2a says the auction is live and offers Watch the auction. Pinned by Task 3 `effectiveStage` tests.
3. **Empty or partial brackets** (byes, "TBD" slots, a final with no feeders yet). Expect: "Bye" and "Winner of SF 1", never "TBD". Pinned by Task 5 `bracketColumns` tests.
4. **Team-vs-team categories** (all cricket). Expect: the league table is counted from completed matches, and the bracket shows team names and cricket summaries, not empty rows. Pinned by Task 6 `teamTable` and Task 5 cricket-score tests.
5. **A logged-out viewer.** Expect: every screen renders without calling `/registrations/my-registrations`, and entry buttons send to login. Pinned by Task 9's logged-out screen test and Task 4 `entryBlocker` tests.

---

### Task 1: Previews for the three screens without a mock

The user approves designs without a mock before they are built (standing rule). This task blocks only the parts marked "(after preview)" in Tasks 9, 11 and 13. Everything else proceeds in parallel.

**Files:**
- Create: `<scratchpad>/tournament-preview.html` (the session scratchpad, not the repo)

- [ ] **Step 1: Build one HTML page with three phone frames (390×844, the mock's frame), in the mock's tokens and Archivo / Material Symbols:**
  - **Results section on a completed 2a:** knockout champions (shield-free text rows: category, champion, "Final"), a league row with "Final table ›", then awards rows (title, recipient).
  - **Auction finished (2c):** "Auction finished", "{n} sold · ₹{total}", purses grid, the sold list (player → team · price, C / ICON tags for pre-assigned).
  - **Team-league tie (Matches › tie):** both crests and names, tie score in condensed type, sub-match rows (slot label, players each side, game scores, winner bright), status.
  - Use neutral placeholder names (e.g. "Player A", "Team 1"), never the mock's sample people.
- [ ] **Step 2: Publish it as an Artifact and ask the user to approve or change it.** Keep the source in the scratchpad. Build from the source and the user's reply, never by re-reading the artifact URL.
- [ ] **Step 3: Record the approved decisions** (or changes) as a short note at the end of the spec under "Preview decisions".

---

### Task 2: API layer, money format, backups

**Files:**
- Modify: `src/api/tournaments.ts` (add types and functions below)
- Modify: `src/api/payment.ts` (`verifyPayment` signature)
- Modify: `src/api/profileApi.ts` (`RosterPlayer`)
- Modify: `src/api/teamLeague.ts` (`Tie`)
- Modify: `src/api/auction.ts` (`AuctionStatusResponse.unsold`)
- Modify: `src/api/unwrap.ts` (export `serverMessage`), `src/lib/useQuickKnockout.ts` (import it instead of its local copy)
- Modify: `src/lib/format.ts` (add `rupees`)
- Create: `__tests__/tournamentApi.test.ts`
- Modify: `__tests__/paymentApi.test.ts`, `__tests__/format.test.ts`

**Interfaces:**
- Produces, in `src/api/tournaments.ts`:
  ```ts
  export type TournamentStatus = 'draft' | 'registration_open' | 'registration_closed' | 'auction_in_progress' | 'ongoing' | 'completed' | 'cancelled';
  export type CategoryStatus = 'setup' | 'registration' | 'auction' | 'groups_configured' | 'bracket_configured' | 'ongoing' | 'completed';
  export type BracketType = 'league' | 'knockout' | 'hybrid' | 'team_league';
  export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';
  export interface TournamentAward { title: string; categoryId?: string; badge?: string; player?: { firstName?: string; lastName?: string } | null; team?: { name?: string } | null }
  export interface TournamentDetail {
    _id: string; name: string; description?: string; sport: string; sports?: string[]; bannerImage?: string;
    startDate: string; endDate: string; registrationDeadline: string; status: TournamentStatus; teamsCount?: number;
    venue: { name: string; address?: string; city: string; coordinates?: { lat: number; lng: number } };
    awards?: TournamentAward[];
  }
  export interface TournamentCategory {
    _id: string; tournamentId: string; name: string; sport?: string; status: CategoryStatus;
    gender?: 'male' | 'female' | 'mixed'; ageGroup?: { min?: number; max?: number; label?: string };
    matchType?: 'singles' | 'doubles' | 'team'; bracketType?: BracketType;
    matchFormat?: { bestOf?: number; pointsPerGame?: number; tieBreakPoints?: number };
    cricketConfig?: { overs?: number; playersPerTeam?: number };
    teamLeagueConfig?: { topNPerGroup?: number; pointsForWin?: number; pointsForLoss?: number; pointsForDraw?: number };
    maxRegistrations?: number; registrationFee: number; isPaidRegistration: boolean;
  }
  export interface TournamentTeam { _id: string; name: string; logo?: string; owner?: { name?: string }; budget: number; initialBudget: number; whatsappGroupLink?: string }
  export interface MyEntry {
    _id: string; tournamentId: string; categoryId: string; createdAt: string; teamId?: string;
    status: 'pending' | 'approved' | 'rejected' | 'auctioned' | 'assigned' | 'withdrawn';
    auctionData?: { basePrice?: number; soldPrice?: number };
  }
  export interface EntryProfile { firstName: string; lastName: string; age: number; gender: 'male' | 'female'; phone: string; photo?: string; skillLevel: SkillLevel }
  export function getTournament(id: string): Promise<TournamentDetail>;            // GET /tournament/:id
  export function getTournamentCategories(id: string): Promise<TournamentCategory[]>; // GET /tournaments/:id/categories, non-array → []
  export function getTournamentTeams(id: string): Promise<TournamentTeam[]>;       // GET /tournaments/:id/teams, non-array → []
  export function getMyEntries(): Promise<MyEntry[]>;                              // GET /registrations/my-registrations, non-array → []
  export function registerEntry(body: { tournamentId: string; categoryId: string; profile: EntryProfile }): Promise<void>; // POST /registrations/register
  ```
- Produces, in `src/api/payment.ts`: `export interface VerifyBody { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string; profile: EntryProfile }` and `verifyPayment(body: VerifyBody): Promise<void>` (POST `/payments/verify` with exactly that body).
- Produces, in `src/api/profileApi.ts`: `RosterPlayer` gains `role?: 'normal' | 'captain' | 'icon'; categoryId: string` (`playerId?` already exists).
- Produces, in `src/api/teamLeague.ts`: `Tie` gains `team1SubWins?: number; team2SubWins?: number`; `SubMatch` gains `teams?: { team1Id: string; team2Id: string }`.
- Produces, in `src/api/auction.ts`: `AuctionStatusResponse.unsold?: { registrationId: string; playerName: string }[]`; `AuctionUpcoming` is unchanged.
- Produces, in `src/api/unwrap.ts`: `export function serverMessage(err: unknown): string` (the body now in `useQuickKnockout.ts`).
- Produces, in `src/lib/format.ts`: `export function rupees(n: number): string`.

- [ ] **Step 1: Move the earlier backups into the repo's sibling folder.** Copy `C:\Users\MYPC~1\AppData\Local\Temp\claude\d--kria\6dd547a7-8ed4-43af-9b42-89788be709f8\scratchpad\deleted-old-ui\*` to `d:/kria/deleted-old-ui/` (keep `pass3`…`pass7` folders; root files go to `d:/kria/deleted-old-ui/pass1-2/`), and copy `knockout-preview.html` to `d:/kria/deleted-old-ui/`. Verify with `ls d:/kria/deleted-old-ui` (expect pass folders). Don't delete the originals.
- [ ] **Step 2: Write the failing tests** in `__tests__/tournamentApi.test.ts` (MockAdapter on `API`, as `__tests__/profileApi.test.ts` does):
  - `getTournament unwraps /tournament/t1` → reply `{ data: { data: { _id: 't1', name: 'Open' } } }`, expect `name` `'Open'`.
  - `getTournamentCategories returns [] for a non-array payload`.
  - `getTournamentTeams reads /tournaments/t1/teams`.
  - `getMyEntries reads /registrations/my-registrations`.
  - `registerEntry posts the profile and never a basePrice` → assert `JSON.parse(mock.history.post[0].data)` equals `{ tournamentId: 't1', categoryId: 'c1', profile }` and has no `basePrice` key.
  - In `__tests__/paymentApi.test.ts`, replace the two verify tests: `verifyPayment posts the Razorpay fields and the profile` (assert the posted body deep-equals the `VerifyBody`), and `verifyPayment throws on 400`.
  - In `__tests__/format.test.ts`: `rupees(628.32)` → `'₹628.32'`, `rupees(600)` → `'₹600'`, `rupees(14000)` → `'₹14,000'`, `rupees(4.3)` → `'₹4.30'`.
- [ ] **Step 3: Run them and see them fail.** `npx jest __tests__/tournamentApi.test.ts __tests__/paymentApi.test.ts __tests__/format.test.ts` → FAIL (missing exports).
- [ ] **Step 4: Implement the interfaces above.** Use `unwrap` like the neighbouring functions. `rupees`: whole numbers without decimals, otherwise exactly two, Indian grouping (`toLocaleString('en-IN', …)`).
- [ ] **Step 5: Run the tests and tsc.** Same jest command → PASS. `npx tsc --noEmit` → errors only in `app/checkout/…` (old `verifyPayment` caller, deleted in Task 10). Change that one call to pass a `VerifyBody` with the old screen's user fields so tsc is clean in between.

---

### Task 3: Tournament overview logic (`lib/tournamentView.ts`)

**Files:**
- Create: `src/lib/tournamentView.ts`
- Test: `__tests__/tournamentView.test.ts`

**Interfaces:**
- Consumes: Task 2 types; `dayDate` from `@/lib/matchCard`; `rupees` from `@/lib/format`; `Announcement` from `@/api/profileApi`; `roundLabel` from `@/lib/knockoutRoom`.
- Produces:
  ```ts
  export type Tone = 'accent' | 'text' | 'text2' | 'text3' | 'text4';
  export type AuctionState = 'not_started' | 'in_progress' | 'paused' | 'sold' | 'completed';
  export type Stage = 'registration' | 'closed' | 'auction' | 'ongoing' | 'completed' | 'cancelled';
  export function effectiveStage(i: { status: TournamentStatus; categories: TournamentCategory[]; auctions: Record<string, AuctionState | undefined>; liveMatch: boolean }): Stage;
  export function liveAuctionCategory(categories: TournamentCategory[], auctions: Record<string, AuctionState | undefined>): TournamentCategory | undefined; // first with in_progress | paused | sold
  export function statusLine(stage: Stage, t: TournamentDetail, x: { auctionCategory?: string; auctionPaused?: boolean; liveRound?: string }): { text: string; tone: Tone };
  export function categoryStatus(c: TournamentCategory, auction?: AuctionState, liveRound?: string): { text: string; tone: Tone };
  export function formatLine(c: TournamentCategory): string;
  export function feeLabel(c: TournamentCategory): string;            // 'Free' | '₹600'
  export function lowestFee(categories: TournamentCategory[]): string; // 'free' | '₹600'
  export function facts(t: TournamentDetail, categoryCount: number, now: Date): { label: string; value: string }[];
  export type TabKey = 'matches' | 'auction' | 'teams';
  export function overviewTabs(stage: Stage, has: Record<TabKey, boolean>): TabKey[];
  export type CtaGo = { to: 'category'; categoryId: string } | { to: 'categories' } | { to: 'auction'; categoryId: string } | { to: 'matches'; categoryId?: string } | { to: 'login' };
  export function footerCta(i: { stage: Stage; categories: TournamentCategory[]; mine: MyEntry[]; loggedIn: boolean; auctions: Record<string, AuctionState | undefined>; next?: { categoryId: string; label: string } }): { label: string; variant: 'primary' | 'secondary'; go: CtaGo } | null;
  export function announcementTag(a: Announcement): { text: string; tone: Tone };
  export function timeAgo(iso: string, now: Date): string;
  export function directionsUrl(v: TournamentDetail['venue']): string;
  export function awardRow(a: TournamentAward): { title: string; who: string };
  ```

- [ ] **Step 1: Write the failing tests** in `__tests__/tournamentView.test.ts`. Fixtures: a category builder `cat({...})` defaulting to badminton singles knockout, `matchFormat { bestOf: 3, pointsPerGame: 21 }`, fee 600 paid, status `registration`; a tournament with start/end `2026-10-20`, deadline `2026-10-17`, venue `Tiger Stadium`.
  - `effectiveStage`:
    - `registration_open`, nothing live → `'registration'`; `registration_closed` → `'closed'`; `draft` → `'closed'`.
    - `registration_closed` with `auctions { c1: 'in_progress' }` → `'auction'`; with `'paused'` → `'auction'`; with `'completed'` → `'closed'`.
    - `registration_closed` with a category `status: 'ongoing'` → `'ongoing'`; with `liveMatch: true` → `'ongoing'`.
    - `completed` with a live auction → `'completed'`; `cancelled` → `'cancelled'`.
  - `statusLine`:
    - registration → `{ text: 'Registration open · closes Sat 17 Oct', tone: 'accent' }`.
    - closed → `'Registration closed · starts Tue 20 Oct'`, text3.
    - auction with `auctionCategory: "Men's Singles"` → `"Team auction live · Men's Singles"`, accent; with `auctionPaused` → `"Team auction paused · Men's Singles"`, text.
    - ongoing → `'In progress'`, text; with `liveRound: 'Semi-Final'` → `'In progress · Semi-final live'`.
    - completed → `'Completed · Tue 20 Oct'`, text3. cancelled → `'Cancelled'`, text4.
  - `categoryStatus`: setup → `'Opens soon'` text3; registration → `'Registration open'` accent; auction+`in_progress` → `'Auction live'` accent; +`sold` → `'Auction live'`; +`paused` → `'Auction paused'` text2; +`undefined` or `not_started` → `'Auction starts soon'` text2; +`completed` → `'Auction ended'` text2; `bracket_configured` and `groups_configured` → `'Draw is out'` text; ongoing → `'In progress'` text, with `'Quarter-Final'` → `'Quarter-final live'`; completed → `'Completed'` text3.
  - `formatLine`: knockout singles → `'Knockout · Best of 3 to 21'`; `bestOf: 1` → `'Knockout · 1 game to 21'`; doubles → `'Doubles · Knockout · Best of 3 to 21'`; hybrid → `'League · Best of 3 to 21'`; team_league → `'Team league · Best of 3 to 21'`; cricket league `{ overs: 10, playersPerTeam: 11 }` → `'League · 10 overs · 11 a side'`; no format → `'Knockout'`.
  - `feeLabel`: paid 600 → `'₹600'`; unpaid → `'Free'`; paid with fee 0 → `'Free'`. `lowestFee([600, 400])` → `'₹400'`; any free → `'free'`.
  - `facts(t, 3, now)` before the deadline → `[{When,'Tue 20 Oct 2026'},{Where,'Tiger Stadium'},{Format,'3 categories'},{Entries close,'Sat 17 Oct'}]`; with `teamsCount: 4` Format `'3 categories · 4 teams'`; one category `'1 category'`; end `2026-10-21` → When `'Tue 20 – Wed 21 Oct'`; `now` after the deadline → `{ label: 'Entries closed', value: 'Sat 17 Oct' }`.
  - `overviewTabs`: registration with all → `['teams']`; auction with all → `['auction','teams','matches']`; ongoing with `{matches:true,teams:true,auction:false}` → `['matches','teams']`; completed with all → `['matches','teams','auction']`.
  - `footerCta`:
    - registration, logged out, one open category → `{ label: 'Register · from ₹600', variant: 'primary', go: { to: 'login' } }`.
    - registration, logged in, one open not entered → go `{ to: 'category', categoryId: 'c1' }`; two open not entered → `{ to: 'categories' }`; free open → label `'Register · free'`.
    - registration, every open category entered → `{ label: 'Your entry', variant: 'secondary', go: { to: 'category', categoryId: <newest entry's> } }`.
    - auction with `auctions { c2: 'in_progress' }` → `{ label: 'Watch the auction', go: { to: 'auction', categoryId: 'c2' } }`.
    - ongoing with `next { categoryId: 'c1', label: 'Your semi-final · 4:30 PM' }` → that label, go matches c1; without next → `'See matches'`, go `{ to: 'matches' }`.
    - completed → `'See results'`, go `{ to: 'matches' }`.
    - closed or cancelled with no entry → `null`; closed with an entry → `'Your entry'`.
  - `announcementTag`: pinned important → `'Pinned · Important'` accent; pinned schedule_change → `'Pinned · Schedule change'` accent; unpinned info → `'Info'` text2.
  - `timeAgo` with `now = 2026-10-22T12:00Z`: 30s earlier → `'just now'`; 12 min → `'12 min ago'`; 3 h → `'3 hr ago'`; 30 h → `'yesterday'`; 4 days → `'4 days ago'`; 10 days → `dayDate` of it.
  - `directionsUrl`: coordinates `{12.93, 77.62}` → `'https://www.google.com/maps/search/?api=1&query=12.93,77.62'`; without → query is `encodeURIComponent('Tiger Stadium, Koramangala, Bengaluru')`.
  - `awardRow`: player → `{ title, who: 'Aarav Menon' }`; team → team name; neither → `who: ''`.
- [ ] **Step 2: Run** `npx jest __tests__/tournamentView.test.ts` → FAIL.
- [ ] **Step 3: Implement** `src/lib/tournamentView.ts` to those tests. The `AuctionState` type moves here (it replaces the one in `lib/drawRoute.ts`, which Task 15 deletes).
- [ ] **Step 4: Run** the test → PASS; `npx tsc --noEmit` → clean.

---

### Task 4: Entry logic and the saved-payment safety net

**Files:**
- Create: `src/lib/entryView.ts`, `src/lib/pendingPayment.ts`
- Test: `__tests__/entryView.test.ts`, `__tests__/pendingPayment.test.ts`

**Interfaces:**
- Consumes: Task 2 types and `verifyPayment`; `computeAge` from `@/lib/format`; `dayDate` from `@/lib/matchCard`; `getItem/setItem/deleteItem` from `@/lib/secureStore`.
- Produces, in `entryView.ts`:
  ```ts
  export interface EntryUser { _id: string; firstName: string; lastName: string; phone: string; gender?: string; dateOfBirth?: string; profileImage?: string }
  export function categoryFacts(c: TournamentCategory): { label: string; value: string }[];
  export function howItWorks(c: TournamentCategory, teamsCount: number): { title: string; body: string }[];
  export function entryBlocker(c: TournamentCategory, t: TournamentDetail, user: EntryUser | null, now: Date): string | null;
  export function entryProfile(user: EntryUser, skill: SkillLevel, now: Date): EntryProfile;
  export function maskPhone(phone: string): string;
  export function entryLine(user: EntryUser, now: Date): string;  // "Male · 27 · 98••• ••412"
  export type StepState = 'done' | 'now' | 'next';
  export function timeline(e: MyEntry, hasTeams: boolean, paid: boolean): { title: string; sub?: string; state: StepState }[];
  export function enteredHeading(e: MyEntry, hasTeams: boolean, teamName?: string, paidAmount?: number): { title: string; line: string };
  ```
- Produces, in `pendingPayment.ts`:
  ```ts
  export interface PendingPayment { playerId: string; tournamentId: string; categoryId: string; orderId: string; paymentId: string; signature: string; amount: number; skillLevel: SkillLevel }
  export function savePending(p: PendingPayment): Promise<void>;                 // key `kria.pendingPayment.${playerId}.${categoryId}`
  export function loadPending(playerId: string, categoryId: string): Promise<PendingPayment | null>; // bad JSON → null
  export function clearPending(playerId: string, categoryId: string): Promise<void>;
  export function confirmPending(p: PendingPayment, profile: EntryProfile, refetchMine: () => Promise<MyEntry[]>): Promise<'entered' | 'failed'>;
  ```
  `confirmPending`: call `verifyPayment` with the saved fields and the profile; on success clear and return `'entered'`. On any error, refetch my entries: an entry for `p.categoryId` exists → clear, `'entered'` (the server marks a payment paid before it creates the entry, so a retry can be refused with "already verified" after the entry was made); otherwise keep it saved, `'failed'`.

- [ ] **Step 1: Write the failing tests.**
  - `categoryFacts`: knockout singles, male, `ageGroup { label: 'Open (18+)' }`, max 64 → `[{Format,'Knockout · Singles'},{Scoring,'Best of 3 · 21 points'},{Eligibility,'Men · Open (18+)'},{Entries,'Limited to 64'}]`. No cap → `'No limit'`. Mixed, no age → `'Mixed · Open'`. Female with `{max: 16}` and no label → `'Women · Up to 16'`; `{min: 35}` → `'… · 35 and over'`; `{min: 18, max: 30}` → `'… · 18–30'`. Cricket `{overs: 10, playersPerTeam: 11}` → Scoring `'10 overs · 11 a side'`.
  - `howItWorks`: paid knockout, 4 teams → 4 steps; `[0]` `{ title: 'Register and pay', body: 'Your profile and skill level go to the organiser.' }`; `[1].body` `'Approved players join the auction pool.'`; `[2]` `{ title: 'Team auction', body: '4 teams bid for players. You join the team that buys you.' }`; `[3]` `{ title: 'Knockout', body: "Lose once and you're out." }`. Free league, 0 teams → 3 steps; `[0].title` `'Register'`; `[1].body` `'Approved players are placed in the draw.'`; last `{ title: 'League', body: 'Everyone plays everyone; the table decides.' }`. team_league last `{ title: 'Team league', body: 'Teams play ties in groups; points decide the table.' }`.
  - `entryBlocker` (now `2026-10-10`): null user → `'Log in to register'`; tournament not `registration_open` → `'Entries are closed'`; category not `registration` → `'Entries are closed'`; now after the deadline → `'Entries are closed'`; no DOB → `'Add your date of birth and gender to enter'`; female user, male category → `'This category is for men'`; age 15 with `{min: 18}` → `'This category is for players 18 and over'`; age 20 with `{max: 16}` → `'This category is for players up to 16'`; eligible → `null`; mixed category with either gender → `null`.
  - `entryProfile`: returns `{ firstName, lastName, age: 27, gender: 'male', phone, photo: profileImage, skillLevel: 'advanced' }` for DOB `1999-05-01`, now `2026-10-22`; `photo` absent when no `profileImage`.
  - `maskPhone('9876543412')` → `'98••• ••412'`; `maskPhone('+919876543412')` → `'+91 98••• ••412'`; fewer than 5 digits → returned unchanged.
  - `entryLine` → `'Male · 27 · 98••• ••412'`.
  - `timeline`: pending, teams, paid → titles `['Payment received','Pending approval','Approved','In the auction pool','Assigned to a team']`, states `['done','now','next','next','next']`, `[0].sub` = `dayDate(createdAt)`. Free → first title `'Registered'`. Approved, no teams → 3 steps all `'done'`. Approved, teams → states `['done','done','done','now','next']`. Assigned with soldPrice 16500 → all done, last `sub` `'Sold for ₹16,500'`. Rejected (free) → titles `['Registered','Pending approval','Not accepted']`, states `['done','done','now']`. Withdrawn (free) → `['Registered','Withdrawn']`, `['done','now']`.
  - `enteredHeading`: pending, teams, paidAmount 628.32 → `{ title: "You're in the queue for approval", line: '₹628.32 paid. The organiser reviews entries before the auction.' }`; pending, no teams, no amount → line `'The organiser reviews entries before the draw.'`; approved teams → `{ "You're approved", "You're in the auction pool." }`; approved no teams → line `"You'll be placed in the draw."`; assigned with team 'Sunrise' and soldPrice 16500 → `{ "You're on Sunrise", 'Sold for ₹16,500.' }`; rejected → `{ "Your entry wasn't accepted", 'The organiser turned this entry down.' }`; withdrawn → `{ 'You withdrew this entry', '' }`.
  - `pendingPayment` (mock `@/lib/secureStore` with an in-memory map; mock `@/api/payment`):
    - `save then load returns it`; `load for another player is null`; `clear removes it`; `load of corrupt JSON is null`.
    - `confirmPending verifies and clears` → `'entered'`, `verifyPayment` called with `{ razorpayOrderId, razorpayPaymentId, razorpaySignature, profile }`, store empty.
    - `confirmPending treats an existing entry as entered when verify is refused` → verify rejects, refetch returns `[{ categoryId: 'c1' }]` → `'entered'`, store empty.
    - `confirmPending keeps the payment when there is no entry` → verify rejects, refetch `[]` → `'failed'`, still loadable.
- [ ] **Step 2: Run** `npx jest __tests__/entryView.test.ts __tests__/pendingPayment.test.ts` → FAIL.
- [ ] **Step 3: Implement** both files to the tests.
- [ ] **Step 4: Run** → PASS; `npx tsc --noEmit` → clean.

---

### Task 5: Shared bracket and tournament bracket mapping

**Files:**
- Create: `src/lib/bracket.ts` (types only), `src/components/Bracket.tsx` (moved from `src/components/knockout/Bracket.tsx`), `src/lib/tournamentBracket.ts`
- Modify: `src/lib/knockoutRoom.ts` (add `knockoutColumns`), `src/app/knockout/[id].tsx` (two `<Bracket>` call sites)
- Delete (backup first): `src/components/knockout/Bracket.tsx`
- Test: `__tests__/tournamentBracket.test.ts`; existing `__tests__/knockoutRoom.test.tsx`, `__tests__/KnockoutScreen.test.tsx` must still pass

**Interfaces:**
- Produces, in `src/lib/bracket.ts`:
  ```ts
  export interface BracketScore { v: string; strong: boolean }
  export interface BracketRow { name: string; sub?: string; scores: BracketScore[]; won: boolean; lost: boolean; open: boolean }
  export interface BracketCard { id: string; header?: string; live: boolean; mine: boolean; openId?: string; rows: [BracketRow, BracketRow] }
  export interface BracketColumn { title: string; cards: BracketCard[] }
  ```
- Produces: `Bracket({ columns, onOpen }: { columns: BracketColumn[]; onOpen?: (id: string) => void })` in `src/components/Bracket.tsx`. With `header`, a card shows a header line (accent dot and accent text when `live`); without it, `live` shows the floating "Live" badge as today. Cards are pressable only with `openId` and `onOpen`.
- Produces, in `src/lib/knockoutRoom.ts`: `knockoutColumns(k: QuickKnockout, meId: string, scores: Record<string, [string, string]>): BracketColumn[]`, which reproduces today's knockout cards exactly (no header, one score per row, `strong` = row not lost).
- Produces, in `src/lib/tournamentBracket.ts`:
  ```ts
  export interface Me { registrationIds: string[]; teamId?: string }
  export function sideName(m: Match, slot: 1 | 2): string;   // player name, or team name for team matches
  export function bracketColumns(matches: Match[], me: Me): BracketColumn[];
  export function myNextMatch(matches: Match[], me: Me): Match | undefined;
  export function nextMatchView(m: Match, me: Me): { header: string; court?: string; sides: [{ name: string; sub?: string }, { name: string; sub?: string }]; when: string };
  export function nextMatchLabel(m: Match): string;           // 2a CTA: "Your semi-final · 4:30 PM"
  export function liveRound(matches: Match[]): string | undefined; // bracketRound of the first in_progress match
  export function isMine(m: Match, me: Me): boolean;
  export function champion(matches: Match[]): string | undefined; // winner's sideName of the completed 'Final' with no nextMatchId
  ```
  Rules: columns by `roundNumber` ascending, cards by `positionInRound` (0-based; labels use +1). Column title `roundLabel(bracketRound)`. Header: `"{abbr} {n} · Final score"` (completed), `"{abbr} {n} · Live · Court {c}"` (in_progress; court part only if set), `"{abbr} {n} · {time} · Court {c}"` (scheduled), `"{abbr} {n} · Bye"` (walkover with `winReason: 'bye'`). `abbr` from `roundAbbr` in `knockoutRoom.ts`, except `Final` → `'Final'` with no number. A slot named `'TBD'` (or empty) is `open` and reads `"Winner of {abbr} {n}"` of the feeder (the match whose `nextMatchId` is this match's `_id` and whose `nextMatchSlot` is `player1`/`team1` for slot 1, `player2`/`team2` for slot 2); a bye's empty side reads `'Bye'`. Scores: badminton `gameScores` per game, `strong` when that side won the game; cricket (any `matchConfig.maxOvers`) one score from `result.team{1,2}Summary`, `strong` for the winner. `won/lost` from `winnerId` against `player{n}.registrationId` or `teams.team{n}Id`. `openId` for `in_progress` and `completed`. `myNextMatch`: my first `in_progress` match, else my earliest `scheduled` one by `roundNumber`, then `schedule.date`.

- [ ] **Step 1: Write the failing tests** in `__tests__/tournamentBracket.test.ts`, with a 4-player knockout fixture (2 Semi-Finals at positions 0 and 1, both feeding the Final at `player1`/`player2`):
  - `columns are rounds in order with lower-case titles` → titles `['Semi-final','Final']`.
  - `a finished semi shows its games, winner strong` → header `'SF 1 · Final score'`, `rows[0].scores.map(s=>s.v)` `['21','21']`, `rows[0].won` true, `rows[1].lost` true.
  - `an unfilled final names its feeders` → final rows `'Winner of SF 1'` / `'Winner of SF 2'`, both `open`, header starts `'Final'`.
  - `a live match says Live and its court` → header `'SF 2 · Live · Court 2'`, `live` true, `openId` set.
  - `a scheduled match shows time and court` → `'SF 2 · 4:30 PM · Court 1'`, no `openId`.
  - `a bye reads Bye` → R1 walkover with `winReason: 'bye'`: header ends `'· Bye'`, empty side `'Bye'`.
  - `my matches are marked by registration or team` → `mine` true for a match with my registrationId; for a team match with my teamId.
  - `cricket shows innings summaries` → team match with `matchConfig.maxOvers: 20`, `result { team1Summary: '142/6 (20)', team2Summary: '120/9 (20)' }`, winner team1 → `rows[0].scores` `[{v:'142/6 (20)', strong:true}]`, row names are team names.
  - `myNextMatch prefers live, then earliest scheduled`; `nextMatchLabel` of a scheduled Semi-Final at `4:30 PM` → `'Your semi-final · 4:30 PM'`; Final with no time → `'Your final'`.
  - `nextMatchView` → `header 'Your next match · Semi-final 1'`, `court 'Court 1'`, `when` `'Tue 20 Oct · 4:30 PM · Best of 3 to 21'`.
  - `liveRound` → `'Semi-Final'` when one is in progress; `undefined` otherwise.
  - `champion` → the final's winner name once it's completed; `undefined` while the final is scheduled; the team name for a team final.
- [ ] **Step 2: Run** `npx jest __tests__/tournamentBracket.test.ts` → FAIL.
- [ ] **Step 3: Implement** `lib/bracket.ts`, `lib/tournamentBracket.ts`, `knockoutColumns`, and move the component to `components/Bracket.tsx` taking `columns`. Update both call sites in `app/knockout/[id].tsx` to `<Bracket columns={knockoutColumns(k, meId, scores)} onOpen={…} />`. Back up and delete `components/knockout/Bracket.tsx`.
- [ ] **Step 4: Run** `npx jest __tests__/tournamentBracket.test.ts __tests__/knockoutRoom.test.tsx __tests__/KnockoutScreen.test.tsx` → PASS; `npx tsc --noEmit` → clean.

---

### Task 6: Tables and results (`lib/standingsView.ts`)

**Files:**
- Create: `src/lib/standingsView.ts`
- Test: `__tests__/standingsView.test.ts`

**Interfaces:**
- Consumes: `LeaderboardEntry` (`@/api/leaderboard`), `GroupStandings`, `Tie` (`@/api/teamLeague`), `Match` (`@/api/match`), `sideName`, `Me` (Task 5), `roundLabel`.
- Produces:
  ```ts
  export interface TableRow { key: string; rank: number; name: string; sub?: string; p: number; w: number; l: number; d?: number; pts?: number; mine: boolean }
  export type TableKind = 'players' | 'teams' | 'teamLeague';
  export function tableKind(c: TournamentCategory): TableKind; // team_league → teamLeague; matchType team or sport cricket → teams; else players
  export function playerTable(entries: LeaderboardEntry[], myRegIds: string[]): TableRow[];   // server order and rank; l = p − w; pts = totalPointsScored
  export function teamTable(matches: Match[], myTeamId?: string): TableRow[];               // counted from completed team matches
  export function teamLeagueTable(s: GroupStandings, myTeamId?: string): TableRow[];        // server order; rank = index + 1
  export function ruleLine(c: TournamentCategory, kind: TableKind): string;
  export function resultRows(matches: Match[]): { key: string; winner: string; loser: string; score: string; meta: string }[];
  export function comingUp(matches: Match[]): { key: string; a: string; b: string; meta: string }[];
  export function tieRow(t: Tie): { key: string; a: string; b: string; score: string; status: string };
  ```
  `teamTable`: every completed match with `teams.team1Id/team2Id`; `winReason: 'draw'` counts a draw for both; otherwise `winnerId` wins. Rank by W desc, then L asc, then name. `ruleLine`: players → `'Ranked by points scored, then point difference'`; teams → `'Ranked by wins'`; teamLeague → `'Win {w} · Draw {d} · Loss {l} points'` from `teamLeagueConfig`, defaulting to 2 / 1 / 0. `resultRows`: completed matches, newest first by `schedule.date` then `matchNumber`; badminton score games from the winner's side (`'21-14, 21-17'`), cricket `'{winner summary} v {loser summary}'`; meta `'{roundLabel} · Court {c}'` (court part only if set). `comingUp`: scheduled, earliest first; meta `'{dayDate} · {time}'` from what's set. `tieRow`: score `'{team1SubWins}–{team2SubWins}'`; status `'Final'` (completed), `'Live'` (in_progress), `'{completedCount} of {subMatchCount} played'` otherwise.

- [ ] **Step 1: Write the failing tests:**
  - `tableKind`: team_league → teamLeague; cricket knockout → teams; badminton `matchType: 'team'` → teams; badminton singles → players.
  - `playerTable` keeps server rank, computes L, sets Pts and mine: entry `{ matchesPlayed: 3, matchesWon: 2, totalPointsScored: 120, rank: 1 }` → `{ rank 1, p 3, w 2, l 1, pts 120 }`; `mine` for my registration `_id`.
  - `teamTable` counts W/L/D: A beat B, B beat C, A drew C → A `{p 2, w 1, l 0, d 1}` rank 1, B `{p 2, w 1, l 1}` rank 2, C `{p 2, w 0, l 1, d 1}` rank 3; scheduled matches ignored; `mine` by teamId.
  - `teamLeagueTable` → ranks 1..n in server order, `d` and `pts` copied.
  - `ruleLine` for each kind; teamLeague with `{ pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 }` → `'Win 3 · Draw 1 · Loss 0 points'`; missing config → `'Win 2 · Draw 1 · Loss 0 points'`.
  - `resultRows`: badminton winner player2 with games `[{team1Score:14,team2Score:21},{team1Score:17,team2Score:21}]` → `{ winner: <p2>, loser: <p1>, score: '21-14, 21-17', meta: 'League · Court 2' }`; cricket → `'142/6 (20) v 120/9 (20)'`.
  - `comingUp` order and meta `'Tue 20 Oct · 4:30 PM'`.
  - `tieRow` `{ team1SubWins: 3, team2SubWins: 2, status: 'completed' }` → score `'3–2'`, status `'Final'`; in progress with 2 of 5 → `'Live'`; scheduled → `'0 of 5 played'`.
- [ ] **Step 2: Run** `npx jest __tests__/standingsView.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS; `npx tsc --noEmit` → clean.

---

### Task 7: Auction and squad logic

**Files:**
- Create: `src/lib/auctionWatch.ts`, `src/lib/squadView.ts`
- Test: `__tests__/auctionWatch.test.ts`, `__tests__/squadView.test.ts`

**Interfaces:**
- Consumes: `@/api/auction` types (with `unsold`), `RosterPlayer`, Task 2 types, `rupees`, `initials` from `@/lib/matchCard`.
- Produces, in `auctionWatch.ts`:
  ```ts
  export type AuctionPill = 'Live' | 'Paused' | 'Tie-breaker' | 'Starts soon' | 'Finished';
  export function auctionPill(a: AuctionStatus | null): AuctionPill;            // null or not_started → Starts soon; tieBreakerActive wins over status
  export function auctionSubline(a: AuctionStatus): string;
  export function onBlockLine(p: AuctionPlayer): string;                         // "Advanced · 29 · Base price ₹2,000"
  export function lastSale(d: AuctionStatusResponse, soldLog: AuctionSoldLog[]): { player: string; team: string; price: string } | null;
  export function bidRows(a: AuctionStatus, teams: AuctionTeam[]): { key: string; team: string; logo?: string; amount: string; newest: boolean }[];
  export function purseCards(teams: AuctionTeam[]): { key: string; name: string; logo?: string; left: string; spentPct: number; sub: string }[];
  export function tieBreakLine(a: AuctionStatus, teams: AuctionTeam[]): string | null;
  export function myAuctionResult(entry: MyEntry | undefined, d: AuctionStatusResponse, teams: TournamentTeam[]): { title: string; line?: string; teamId?: string } | null;
  ```
- Produces, in `squadView.ts`:
  ```ts
  export interface SquadRow { key: string; playerId?: string; name: string; initials: string; categories: string; price: number; role?: 'captain' | 'icon'; me: boolean }
  export function squad(roster: RosterPlayer[], categories: TournamentCategory[], meId?: string): SquadRow[];
  export function teamStats(team: TournamentTeam, rows: SquadRow[]): { players: number; spent: number; left: number };
  export function pickTeam(teams: TournamentTeam[], param?: string, myTeamId?: string): string | undefined;
  ```

- [ ] **Step 1: Write the failing tests:**
  - `auctionPill`: `null` → `'Starts soon'`; `not_started` → `'Starts soon'`; `in_progress` and `sold` → `'Live'`; `paused` → `'Paused'`; `completed` → `'Finished'`; `in_progress` with `liveBid.tieBreakerActive` → `'Tie-breaker'`.
  - `auctionSubline`: `{ currentPlayerIndex: 17, totalPlayers: 32, unsoldCount: 3, rotationCount: 0 }` → `'Player 18 of 32 · 3 unsold'`; `rotationCount: 1`, index 0 of 3 → `'Unsold round 1 · Player 1 of 3'`.
  - `onBlockLine` `{ skillLevel: 'advanced', age: 29 }`, base 2000 → `'Advanced · 29 · Base price ₹2,000'`; no skill → `'29 · Base price ₹2,000'`.
  - `lastSale`: from `lastSoldResult` → `{ player, team, price: '₹14,000' }`; when cleared → newest by `timestamp` from the sold log (`finalPrice`); neither → `null`.
  - `bidRows`: 7 bids → 5 rows, newest first, only the first `newest`; logo from the matching team.
  - `purseCards`: `{ budget: 18500, initialBudget: 100000, totalSpent: 81500, playersCount: 6 }` → `{ left: '₹18,500', spentPct: 81.5, sub: '6 players · ₹81,500 spent' }`; `initialBudget: 0` → `spentPct: 0`.
  - `tieBreakLine`: tied teams t1,t2 → `'Tied between Titans and Tigr. The organiser breaks the tie.'`; with `spinWinnerId: 't2'` → `'Tigr won the tie-break.'`; no tie → `null`.
  - `myAuctionResult`: no entry → `null`; assigned with teamId and soldPrice 16500 → `{ title: 'You went to Sunrise', line: 'Sold for ₹16,500', teamId }`; registrationId in `unsold` → `{ title: "You're unsold this round" }`; in `upcoming` with `queueIndex` 20 while `currentPlayerIndex` 17 → `{ title: "You're up in 3" }`; on the block now → `{ title: "You're on the block" }`; otherwise pending/approved → `{ title: "You're in the pool" }`.
  - `squad`: two roster rows with the same `playerId` (Men's Singles 16500, Mixed Doubles 4000) → one row, `categories: "Men's Singles · Mixed Doubles"`, `price: 20500`; captain first, then icon, then price desc; `me` by my playerId; a row without `playerId` stays its own row (key = registration `_id`).
  - `teamStats` → `{ players: rows.length, spent: initialBudget − budget, left: budget }`.
  - `pickTeam`: valid param wins; else my team; else first; unknown param falls through.
- [ ] **Step 2: Run** `npx jest __tests__/auctionWatch.test.ts __tests__/squadView.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Skill words capitalised (`'advanced'` → `'Advanced'`).
- [ ] **Step 4: Run** → PASS; `npx tsc --noEmit` → clean.

---

### Task 8: Tournament data hook and shared tournament components

**Files:**
- Create: `src/lib/useTournament.ts`
- Create: `src/components/tournament/Crest.tsx`, `FactsGrid.tsx`, `AnnouncementCard.tsx`, `StatusDot.tsx`
- Test: `__tests__/useTournament.test.tsx`

**Interfaces:**
- Consumes: Task 2 API, `listAnnouncements`, `getAuctionStatus`, `getCategoryBracket`, `useAppSelector`.
- Produces:
  ```ts
  export interface TournamentBase { tournament: TournamentDetail; categories: TournamentCategory[]; mine: MyEntry[] } // mine filtered to this tournament; [] when logged out
  export function useTournament(id: string): { data: TournamentBase | null; loading: boolean; error: boolean; reload: () => void };
  export interface OverviewExtras { teams: TournamentTeam[]; announcements: Announcement[]; auctions: Record<string, AuctionState | undefined>; matches: Record<string, Match[]> }
  export function useOverviewExtras(id: string, categories: TournamentCategory[] | undefined): OverviewExtras;
  ```
  `useTournament` loads in `useFocusEffect`, skips `getMyEntries` when `auth.user` is null, keeps the last data on a failed reload (`error` true). `useOverviewExtras`: teams and announcements once; auction status for categories with `status: 'auction'` or later (a 404 → `undefined`, never an error); matches for categories with status `groups_configured | bracket_configured | ongoing | completed`. Each failure leaves its part empty.
- Produces components:
  - `Crest({ uri, name, size }: { uri?: string; name: string; size: number })`: round, `colors.text` (#F5F5F5) background per DESIGN §12, initials when no logo.
  - `FactsGrid({ items }: { items: { label: string; value: string }[] })`: 2×2 with hairlines, mock 2a/2b.
  - `AnnouncementCard({ a, now }: { a: Announcement; now: Date })`: tag (push_pin icon + `announcementTag`), title, message, meta `"{authorName} · {timeAgo}"`.
  - `StatusDot({ text, tone }: { text: string; tone: Tone })`: 7px dot + word.

- [ ] **Step 1: Write the failing test** `__tests__/useTournament.test.tsx` (mock `@/api/tournaments`, render the hook inside a Redux `Provider` like `OwnProfileScreen.test.tsx`):
  - `logged out it never asks for my entries` → `getMyEntries` not called, `mine` `[]`.
  - `logged in it keeps only this tournament's entries` → entries for t1 and t2 → `mine` has the t1 one only.
  - `a failed reload keeps the last data and flags the error`.
- [ ] **Step 2: Run** `npx jest __tests__/useTournament.test.tsx` → FAIL.
- [ ] **Step 3: Implement** the hook and the four components (components are covered by the screen tests in Tasks 9–14).
- [ ] **Step 4: Run** → PASS; `npx tsc --noEmit` → clean.

---

### Task 9: 2a Tournament screen

**Files:**
- Rewrite: `src/app/tournament/[id].tsx`
- Create: `src/components/tournament/CategoryRows.tsx`, `src/components/tournament/Results.tsx`
- Rewrite: `__tests__/TournamentDetailScreen.test.tsx`
- Delete (backup first, grep importers): `src/components/tournament/{AboutSection,CategoryCard,ChampionsBlock,JumpBar,LiveNowBanner,TeamsGrid,TournamentHero,YourTeam}.tsx`, `src/components/cricket/LiveMatchCard.tsx`, `src/components/explore/Browse.tsx`, `src/components/TournamentCard.tsx`, `src/components/TournamentArt.tsx`, `src/lib/tournamentDetail.ts`, `src/lib/useCategoryExtras.ts`, and their tests (`ChampionsBlock.test.tsx`, `tournamentDetail.test.ts`, `tournamentArt.test.ts`, plus any other test that only imports a deleted file)
- Modify: `test-utils/colourLiterals.ts` (remove the deleted and rewritten paths from `MIGRATED`, with a dated 2026-10-22 note in the existing style)

**Interfaces:**
- Consumes: Tasks 3, 5 (`myNextMatch`, `nextMatchLabel`, `liveRound`, `champion`), 6 (`tableKind`, for "Final table" on league categories), 8.
- Produces navigation targets used by later tasks: `/category/[categoryId]?tournamentId=`, `/auction/[tournamentId]/[categoryId]`, `/tournament/[id]/teams?team=`, `/tournament/[id]/matches?category=`, `/tournament/[id]/announcements`.

- [ ] **Step 1: Write the failing screen tests** (mock `@/lib/useTournament` to return fixtures; mock `expo-router` as `OwnProfileScreen.test.tsx` does):
  - `registration stage shows the open status, facts, categories and Register` → `'Registration open · closes Sat 17 Oct'`, `'Tiger Stadium'`, the category name with `'₹600'`, button `'Register · from ₹600'`; pressing it while logged out pushes `'/(auth)/login'`.
  - `a live category auction overrides a closed tournament` → status `registration_closed`, `auctions { c1: 'in_progress' }` → `"Team auction live · Men's Singles"` and `'Watch the auction'` pushing the auction route.
  - `the pinned update shows with All updates when there are more` → tag `'Pinned · Important'`, title, and `'All updates'` pushing the announcements route.
  - `tabs show only with data` → no teams and no matches → no `'Teams'` or `'Matches'` tab.
  - `no mock-only elements` → no `'Organised by'`, no Bookmark or Share labels.
  - `completed shows champions and awards (after preview)` → knockout champion name, `'Final table'` for a league category, award title and recipient.
  - `logged out it renders without my entries` (Review Focus 5).
- [ ] **Step 2: Run** `npx jest __tests__/TournamentDetailScreen.test.tsx` → FAIL.
- [ ] **Step 3: Build the screen** per spec 2a, top to bottom: banner (`bannerImage`, 16:9, back `IconButton` on a `colors.bg` circle), `StatusDot`, name (`display(38)`), `FactsGrid(facts(...))`, tab row (Overview + `overviewTabs`), `AnnouncementCard` for the first announcement, `CategoryRows` (name, `formatLine`, `categoryStatus`, `feeLabel`, chevron), crest row (`Crest` 56), `Results` when stage is completed, About (description, address line, "Directions" → `Linking.openURL(directionsUrl(...))`), `FooterBar` + `Button` from `footerCta`. Skeletons on first load, `InlineError` with Retry on error. The "categories" CTA scrolls to the Categories section.
- [ ] **Step 4: Delete the old files** listed above (backup, grep, delete), and update `MIGRATED`.
- [ ] **Step 5: Run** `npx jest __tests__/TournamentDetailScreen.test.tsx __tests__/colourLiterals.test.ts` → PASS; `npx tsc --noEmit` → clean.

---

### Task 10: 2b Category and entry screen, with Razorpay

**Files:**
- Rewrite: `src/app/category/[categoryId].tsx`
- Create: `src/components/tournament/EntryForm.tsx`, `src/components/tournament/EntryStatus.tsx`
- Move: `src/components/checkout/RazorpayWebView.tsx` → `src/components/tournament/RazorpayWebView.tsx` (change only the import paths and its `#111` background to `colors.bg`)
- Modify: `src/components/profile/RegistrationCard.tsx:67-70`, `src/components/profile/InvoiceCard.tsx:38` (push `/category/[categoryId]` with `tournamentId` instead of checkout)
- Delete (backup first): `src/app/checkout/[tournamentId]/[categoryId].tsx`, `src/lib/checkoutView.ts`, `__tests__/checkoutView.test.ts`; remove its `Stack.Screen` from `src/app/_layout.tsx`
- Create: `__tests__/CategoryScreen.test.tsx`

**Interfaces:**
- Consumes: Tasks 2, 3 (`feeLabel`, `formatLine`), 4, 8 (`useTournament`, `FactsGrid`), `feeBreakdown` from `@/lib/format`, `createPaymentOrder`.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing screen tests** (mock `@/lib/useTournament`, `@/api/payment`, `@/api/tournaments`, `@/lib/secureStore` in-memory; mock `RazorpayWebView` as a component exposing `onSuccess`/`onDismiss` buttons):
  - `shows facts, how it works, your entry and the fee maths` → `'Limited to 64'`, `'Register and pay'`, `'Male · 27 · 98••• ••412'`, breakdown values `'₹600'`, `'₹12'` (twice), `'₹4.32'`, `'₹628.32'`, button `'Pay ₹628.32 and register'`.
  - `Pay is disabled until a skill level is picked`.
  - `missing DOB blocks entry and links to Edit profile`.
  - `paid flow verifies with the profile and shows the queue` → pick Advanced, Pay, `onSuccess('pay_1','sig_1')` → `verifyPayment` called with `{ razorpayOrderId: 'ord_1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig_1', profile: { …, gender: 'male', skillLevel: 'advanced' } }` → `"You're in the queue for approval"` and `'₹628.32 paid. The organiser reviews entries before the auction.'`.
  - `a failed verify keeps the payment and offers Confirm my entry, not Pay` → verify rejects, my entries `[]` → text containing `'ord_1'`, a `'Confirm my entry'` button, no `'Pay ₹628.32 and register'`.
  - `a saved result shows Confirm my entry on open and retries once` → pre-saved pending payment → `verifyPayment` called once on mount.
  - `free category registers without payment` → `registerEntry` called, no `createPaymentOrder`.
  - `an entered category opens on the status timeline` → my entry approved → `"You're approved"` and the timeline titles.
  - `closed entries show why, with no Pay` → `'Entries are closed'`.
- [ ] **Step 2: Run** `npx jest __tests__/CategoryScreen.test.tsx` → FAIL.
- [ ] **Step 3: Build** per spec 2b: `TopBar` (category name, tournament name sub-line), form view (`FactsGrid(categoryFacts)`, How it works numbered rows, Your entry card + Edit profile, 2×2 skill choice, breakdown rows from `feeBreakdown(fee)` formatted with `rupees`, "Paid via Razorpay · UPI, cards, netbanking"), `FooterBar` with one primary button or the blocker text, Razorpay full-screen in a `Modal`. Paid success → `savePending` → `confirmPending(...)` with `refetchMine = getMyEntries` filtered → entered view or the failure state. On mount, `loadPending(user._id, categoryId)` → if present, `confirmPending` once, show "Confirm my entry" while it's unresolved. Free → `registerEntry`, server refusals via `serverMessage`. Entered view = `EntryStatus` (check only right after paying, `enteredHeading`, `timeline`, "Back to tournament").
- [ ] **Step 4: Repoint** the two Profile cards, then back up and delete checkout, `checkoutView.ts` and its test, and the `Stack.Screen`.
- [ ] **Step 5: Run** `npx jest __tests__/CategoryScreen.test.tsx` and any Profile card tests → PASS; `npx tsc --noEmit` → clean; `grep -rn "checkout/" src` → no matches.

---

### Task 11: 2c Auction screen

**Files:**
- Rewrite: `src/app/auction/[tournamentId]/[categoryId].tsx`
- Create: `src/components/tournament/AuctionBoard.tsx` (on-block, current bid, bids, purses, your result), `src/components/tournament/AuctionFinished.tsx` (after preview)
- Delete (backup first): `src/components/auction/*` (10 files), `src/lib/auctionSpin.ts`, and tests that only cover them (`auctionSpin.test.ts`, `upNextList.test.tsx`)
- Create: `__tests__/AuctionScreen.test.tsx`

**Interfaces:**
- Consumes: `useAuctionSocket` (unchanged), Task 7 `auctionWatch`, Task 8 `useTournament` (for my entry and teams), `Crest`, `rupees`.

- [ ] **Step 1: Write the failing screen tests** (mock `@/lib/useAuctionSocket` and `@/lib/useTournament`):
  - `not started shows the empty state` → `"The auction hasn't started"`.
  - `live shows sub-line, pill, block, bid, bids, purses` → `'Player 18 of 32 · 3 unsold'`, `'Live'`, player name, current bid `'₹13,000'`, `'Bids · min raise ₹500'`, a purse `'₹18,500'`.
  - `no bids yet shows the base` → `'No bids yet · base ₹2,000'`.
  - `tie-breaker shows the pill and the line`.
  - `your result is pinned when you were sold` → `'You went to Sunrise'`, press → pushes `/tournament/t1/teams?team=…`.
  - `a dropped connection says so` → `connected: false` → `'Reconnecting. Showing the last update.'`.
  - `finished shows the summary (after preview)`.
  - No confetti or spin wheel: `queryByTestId('spin-wheel')` null.
- [ ] **Step 2: Run** `npx jest __tests__/AuctionScreen.test.tsx` → FAIL.
- [ ] **Step 3: Build** per spec 2c (top bar with sub-line and pill, last-sale strip, `AuctionBoard`, finished view). The current-bid number uses `display(72)`; no animation beyond what the existing components use.
- [ ] **Step 4: Delete** the old auction components and `auctionSpin.ts` (backup, grep).
- [ ] **Step 5: Run** the test → PASS; `npx tsc --noEmit` → clean.

---

### Task 12: 2d Teams screen and Announcements

**Files:**
- Create: `src/app/tournament/[id]/teams.tsx`, `src/components/tournament/Squad.tsx`
- Rewrite: `src/app/tournament/[id]/announcements.tsx`
- Delete (backup first): `src/app/team/[teamId].tsx`; remove its `Stack.Screen`; add `Stack.Screen` for `tournament/[id]/teams`
- Create: `__tests__/TeamsScreen.test.tsx`, `__tests__/AnnouncementsScreen.test.tsx`

**Interfaces:**
- Consumes: `getTournamentTeams`, `getTeamRoster`, Task 7 `squad`/`teamStats`/`pickTeam`, Task 8 `useTournament`, `Crest`, `AnnouncementCard`, `listAnnouncements`.

- [ ] **Step 1: Write the failing screen tests:**
  - Teams: `selects the team from the param, else mine` → `?team=t2` shows t2's name; no param + my entry on t1 → `'Your team'` and t1.
  - Teams: `stats and squad` → `'Owner Priya'`, players count from grouped rows, `'Spent'` `'₹91,000'`, `'Purse left'` `'₹9,000'`; a player with two entries listed once with `"Men's Singles · Mixed Doubles"`; `'C'` and `'ICON'` badges.
  - Teams: `WhatsApp only on my own team` → present on mine (press → `Linking.openURL(link)`), absent on another team even when it has a link.
  - Teams: `empty roster` → `'No players yet'`.
  - Announcements: `lists every update newest pinned first` and `empty` → `'No updates yet'`.
- [ ] **Step 2: Run** both → FAIL.
- [ ] **Step 3: Build** per spec 2d and Announcements. Squad rows press → `/player/[playerId]` when `playerId` is set.
- [ ] **Step 4: Delete** `team/[teamId].tsx` (backup; grep shows its only caller was the deleted `TeamsGrid`).
- [ ] **Step 5: Run** both → PASS; `npx tsc --noEmit` → clean.

---

### Task 13: Matches screen (2e/2f) and the tie screen

**Files:**
- Create: `src/app/tournament/[id]/matches.tsx`, `src/app/tournament/[id]/tie/[tieId].tsx` (after preview)
- Create: `src/components/tournament/NextMatchCard.tsx`, `StandingsTable.tsx`, `ResultRows.tsx`
- Delete (backup first): `src/app/bracket/[tournamentId]/[categoryId].tsx`, `src/app/team-league/[tournamentId]/[categoryId].tsx`, `src/app/leaderboard/[categoryId].tsx`, `src/components/bracket/*` (4), `src/components/teamleague/*` (6), `src/lib/bracketView.ts`, `src/lib/useTeamLeague.ts`, `src/lib/teamLeagueView.ts`, and tests that only cover them (`bracketView.test.ts`, `bracketSport.test.ts`, `teamLeagueView.test.ts`); remove their `Stack.Screen`s, add ones for `tournament/[id]/matches` and `tournament/[id]/tie/[tieId]`
- Create: `__tests__/MatchesScreen.test.tsx`, `__tests__/TieScreen.test.tsx`

**Interfaces:**
- Consumes: Tasks 5, 6, 8; `getCategoryBracket`, `getCategoryLeaderboard`, `getGroupStandings`, `getTiesByGroup`, `getTieDetails`; `Bracket`; `Segmented`.

- [ ] **Step 1: Write the failing screen tests:**
  - `knockout shows my next match and the bracket` → `'Your next match · Semi-final 1'`, column title `'Semi-final'`, `'Winner of SF 1'`, legend `'Your matches'`; pressing a live card pushes `/live/[matchId]`.
  - `no matches yet explains when` → category `registration` → `'Draw after entries close'`; category `auction` → `'Draw after the auction'`.
  - `player league shows the server table` → rule line `'Ranked by points scored, then point difference'`, my row present, `'Results'` and `'Coming up'`.
  - `cricket league counts the table from matches` → empty leaderboard, two completed team matches → team rows with W counts, rule `'Ranked by wins'`, a `'Player stats'` link pushing `/cricket/leaderboard/c1`.
  - `team league shows groups, the line and ties` → `'Group A'`/`'Group B'` segments, `'Win 2 · Draw 1 · Loss 0 points'`, `'Top 2 go through'`, a tie row `'3–2'` pushing `/tournament/t1/tie/tie1`.
  - `category chips switch the view` and honour `?category=`.
  - Tie screen: `shows both teams, the tie score and each sub-match` → slot label, players, game scores (after preview).
- [ ] **Step 2: Run** both → FAIL.
- [ ] **Step 3: Build** per spec 2e/2f and the approved tie preview. View by `bracketType` then `tableKind`: knockout → `NextMatchCard` + `Bracket(bracketColumns)` + legend; league/hybrid → `StandingsTable` + `ResultRows`; team_league → stage switch (only if >1 stage), group `Segmented`, `StandingsTable` with the "Top N go through" line after row N, tie rows.
- [ ] **Step 4: Delete** the old routes, components, libs and tests listed (backup, grep). `lib/drawRoute.ts` stays until Task 15 if anything still imports it.
- [ ] **Step 5: Run** both tests → PASS; `npx tsc --noEmit` → clean.

---

### Task 14: Remaining links and leftovers

**Files:**
- Modify: any caller still pushing `/team/`, `/bracket/`, `/team-league/`, `/leaderboard/` (grep `src/`)
- Delete (backup first) if no importer remains: `src/lib/drawRoute.ts`, `src/lib/auctionView.ts`, and tests that only cover deleted code (`drawRoute.test.ts`, `auctionView.test.ts`, `auctionPurse.test.ts`, `teamMoney.test.ts`, `leaderboardApi.test.ts` stays because `api/leaderboard.ts` stays)
- Modify: `test-utils/colourLiterals.ts` (final pass over `MIGRATED` for deleted paths, dated note)
- Modify: `src/lib/theme/palette.ts:240-252` note if it names deleted screens

- [ ] **Step 1: Find leftovers.** `grep -rnE "/team/|/bracket/|/team-league/|/leaderboard/|checkout/|drawRoute|auctionView|bracketView|teamLeagueView|components/(tournament/(AboutSection|CategoryCard|ChampionsBlock|JumpBar|LiveNowBanner|TeamsGrid|TournamentHero|YourTeam)|auction/|bracket/|teamleague/|checkout/)" src __tests__ test-utils` → fix or delete each hit. `/cricket/leaderboard/` and `/live/` hits are expected and stay.
- [ ] **Step 2: Run** `npx tsc --noEmit` → clean; `npx jest` → all suites pass (rerun `TournamentDetailScreen.test.tsx` alone if it times out under load, per HANDOVER).

---

### Task 15: Verification and handover

**Files:**
- Modify: `d:/kria/HANDOVER-mobile-redesign.md`, `C:/Users/MY PC/.claude/projects/d--kria/memory/mobile-redesign.md`

- [ ] **Step 1: Full gates.** `npx tsc --noEmit` → clean. `npx jest` → all pass; note the suite and test counts. `npx expo start --port 8081`, then `curl -s -o b.js "http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=android&dev=true&transform.routerRoot=src%2Fapp"` and `grep -c "__workletHash" b.js` → about 580, not near zero. Delete `b.js`.
- [ ] **Step 2: Update the handover**: status table (Tournament details done), what was built per screen, the calls from the spec, Server gaps now 22, new known limits (verify retry relies on the device store; Pts for player leagues is rally points), backups now in `d:/kria/deleted-old-ui/` (pass8 added), new counts under Verification, file map additions.
- [ ] **Step 3: Update the memory note** `mobile-redesign.md` with a dated line for this pass and the next step (Live Matches design).
