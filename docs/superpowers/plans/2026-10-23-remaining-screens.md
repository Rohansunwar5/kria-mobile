# Remaining screens, other players' profiles and the Awards pass: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every remaining old screen outside sign-in and onboarding on the new design, give other players the new Profile, apply the Awards 8e fixes, remove the Appearance setting, and delete the old components that become unused.

**Architecture:** View logic lives in pure libs: `lib/entriesView.ts`, `lib/paymentsView.ts`, `lib/joinView.ts`, `lib/password.ts`, `lib/profileForm.ts`, plus additions to `lib/profileView.ts`, `lib/awardsView.ts` and `lib/cricketSort.ts`. Screens stay thin and are built from `components/ui/*`. The Profile tab is split into shared pieces under `components/profile/`, which `app/player/[playerId].tsx` reuses. Deletions come last.

**Tech Stack:** Expo SDK 57, React Native 0.86, expo-router 57 (typed routes), TypeScript 6, Redux Toolkit, jest-expo with @testing-library/react-native, axios-mock-adapter, react-native-svg, expo-clipboard, @react-native-community/datetimepicker.

**Spec:** `mobile/docs/superpowers/specs/2026-10-23-remaining-screens-design.md` (approved 2026-10-23). The approved preview source is in `mobile/docs/superpowers/specs/2026-10-23-remaining-screens-preview/*.dc.html`. Read both. The spec holds every copy string and rule; this plan says "per spec" where it does.

## Global Constraints

- **Paths:** relative to `d:/kria/mobile/` unless they start with `d:/`. Commands run from `d:/kria/mobile/`.
- **Git:** `d:/kria/mobile` is the user's repo. Never run any git command. Each task ends with `npx tsc --noEmit` clean and its jest files passing; the controller handles commits.
- **Imports:**
  - New code uses tokens from `@/constants/theme` and UI from `@/components/ui/*` and the new shared components only.
  - Never import `@/lib/theme`, `@/components/icons`, `@/components/canvas`, `@/components/states` or `@/components/Screen` in new code.
  - No NativeWind `className`. No hex literals outside `constants/theme.ts`.
- **Real data only:**
  - No sample values from the preview.
  - Nothing the spec's anti-goals list: a payment state on an entry, failed or refunded payments, "other devices are signed out", a receipt promise, maidens.
- **Copy:** exactly as the spec words it. Sentence case, no exclamation marks (DESIGN §11).
- **Layout:** per the spec's "Shared rules for every screen here": 20px gutter, 44px section gap, 18px header-to-content, 56px minimum row height, 52px fields with radius 14, chips as in Compete › Matches.
- **Typed routes:** after adding or removing a file under `src/app`, regenerate `.expo/types/router.d.ts`. Start `npx expo start --port 8081` in the background, wait until that file's modification time changes, then stop it.
- **Icons:** add missing Material Symbols names to `scripts/icons.mjs` and run `node scripts/icons.mjs`. Only additions may appear in `iconPaths.ts`.
- **Packages:** install nothing new.
- **Deletions:** grep for importers first. Delete a file's tests with it.
- **Async actions:**
  - Every action button (Send, Update password, Save, Withdraw, Take this spot, Join as …, guest chips) ignores presses while its request is in flight, and shows `busy`.
  - Every screen ignores responses that arrive after it unmounted, or after a newer request for the same data.

## Review Focus

1. **One tournament lookup fails on My entries.** The list still renders, and that row reads "Tournament" with no category. It is grouped by its own status. Pinned by a Task 6 test.
2. **Someone takes your selected spot before you confirm.** "Take this spot" fails. The screen re-reads the code, shows the server's message, marks that spot Taken and clears the selection. Pinned by a Task 9 test.
3. **A double tap on an action.** One request only, for Withdraw, Take this spot, Send message and Save. Pinned by tests in Tasks 3, 5, 6 and 9.
4. **Switching the cricket sort quickly.** The chips show the last sort chosen, and a slower earlier response never replaces the table. Pinned by a Task 10 test.
5. **Another player with no matches, no honours and no history.** The profile renders the identity, "No matches on record yet." and no tournament rows, with no crash. Pinned by a Task 11 test.

---

### Task 1: API layer, server gaps and icons

**Files:**
- Modify: `src/api/axios.ts`
  - In the 401 branch, skip `clearAuth()` and `onUnauthorized()` when `error.config?.url` contains `/player/auth/change-password`.
- Modify: `src/api/settings.ts`
  - `sendContactMessage` gets a new payload, per spec.
  - `changePassword` maps a 401 to `Error('Current password is incorrect.')`.
- Modify: `src/api/tournaments.ts`: add `withdrawEntry`.
- Modify: `src/api/payment.ts`
  - `Invoice` gains `razorpayPaymentId?: string; updatedAt?: string`.
  - `feeBreakdown` stays optional.
- Modify: `src/api/cricketStats.ts`
  - `batting` and `bowling` each gain `matches: number; innings: number`.
  - Remove the top-level `matches?` and `bowling.maidens?`.
- Modify: `src/lib/cricketSort.ts`: the "Inn" column reads `batting.innings`.
- Modify: `src/api/profileApi.ts`
  - `PublicHistoryEntry.tournament` becomes `{ _id: string; name: string; sport?: string; startDate?: string; endDate?: string; status?: string; venue?: { name?: string; city?: string }; bannerImage?: string }`.
- Modify: `scripts/icons.mjs`, then regenerate `src/components/ui/iconPaths.ts`. Add:
  - `o` variant: `mail`, `lock`, `visibility`, `visibility_off`, `radio_button_unchecked`, `calendar_today`.
  - `of` (both variants): `check_circle`.
  - `f` (filled), the award glyphs: `star`, `counter_3`, `local_fire_department`, `cleaning_services`, `crown`, `bolt`, `handshake`, `fitness_center`, `counter_1`.
  - Change `workspace_premium` and `gavel` from `o` to `of`.
- Modify: `d:/kria/SERVER-GAPS.md`: append #31–#34 from the spec's "Server gaps to log", in the existing format (Shows on / Today / Suggested / App follow-up).
- Test: `__tests__/axiosUnauthorized.test.ts` (create), `__tests__/profileApi.test.ts` or wherever `sendContactMessage` and `changePassword` are tested today (`grep -l sendContactMessage __tests__`), `__tests__/leaderboardApi.test.ts`.

**Interfaces:**
- Produces:
  ```ts
  // api/settings.ts
  export async function sendContactMessage(p: { fullName: string; email: string; message: string; phone?: string }): Promise<void>;
  // posts { fullName, email, subject: 'Help from the player app', message, iss: 'Kria player app', phoneNumber?: phone }
  export async function changePassword(currentPassword: string, newPassword: string): Promise<void>; // 401 → Error('Current password is incorrect.'), else the server message
  // api/tournaments.ts
  export async function withdrawEntry(id: string): Promise<void>; // POST /registrations/:id/withdraw
  ```
  The new icon names are typed in `IconName`.

- [ ] **Step 1: Write the failing tests:**
  - Axios: a 401 from `/player/auth/change-password` does not call `clearAuth` or the unauthorized handler. A 401 from `/player/auth/profile` calls both. Use axios-mock-adapter on the `API` instance, with `@/lib/storage` mocked.
  - `sendContactMessage({ fullName: 'Priya Nair', email: 'p@x.in', message: 'The app froze on…', phone: '98' })` posts exactly `{ fullName: 'Priya Nair', email: 'p@x.in', subject: 'Help from the player app', message: 'The app froze on…', iss: 'Kria player app', phoneNumber: '98' }`. Without `phone`, there's no `phoneNumber` key.
  - `changePassword` rejects with message `'Current password is incorrect.'` on 401. On 422 with `{ message: 'x' }` it rejects with `'x'`.
  - `withdrawEntry('r1')` posts to `/registrations/r1/withdraw`.
  - `sortColumns('runs')[0].value({ batting: { innings: 4, outs: 2 } … })` is `'4'`.
- [ ] **Step 2:** Run `npx jest __tests__/axiosUnauthorized.test.ts __tests__/leaderboardApi.test.ts` plus the contact/password test file, and confirm it FAILS.
- [ ] **Step 3:** Implement the changes above. Run `node scripts/icons.mjs` and append the server gaps.
- [ ] **Step 4:** The same jest files PASS. `npx tsc --noEmit` is clean. The old screens that read `matches` or `maidens` may need a `?? '—'` to compile; Tasks 10 and 13 replace them.

---

### Task 2: Awards pass (mock 8e)

**Files:**
- Modify: `src/lib/awardsView.ts`
- Create: `src/components/awards/AwardGrid.tsx` (the `Badge` and `Grid` now inside `app/(tabs)/awards.tsx`, exported)
- Modify: `src/app/(tabs)/awards.tsx` (featured card, sizes; uses `AwardGrid`)
- Modify: `src/components/awards/AwardSheet.tsx` (176 badge with `shine`, no progress bar, ribbon `CHAMPION`)
- Modify: `src/app/(tabs)/profile.tsx`: pass `totals` to `buildAwards`
- Test: `__tests__/awardsView.test.ts`, `__tests__/AwardsScreen.test.tsx` (create if absent)

**Interfaces:**
- Consumes: the `f` icons from Task 1; `allSports` from `@/lib/profileView`.
- Produces:
  ```ts
  export const HONOUR_BADGES: Record<string, { name: string; icon?: IconName; glyph?: string }>; // icons per spec table; centurion → glyph '100'
  export interface MilestoneTotals { played: number; won: number; sports: number }
  export function milestoneAwards(achievements: Achievement[], totals: MilestoneTotals): Award[];
  export function buildAwards(input: { titles: string[]; honors: Honor[]; achievements: Achievement[]; knockouts: QuickKnockout[]; totals: MilestoneTotals }): {
    titles: Award[]; honours: Award[]; knockouts: Award[]; milestones: Award[]; earned: number;
    featured: { award: Award; label: 'Latest title' | 'Latest honour' | 'Knockout winner' | 'Next milestone' | 'Closest first award' } | null;
  };
  // components/awards/AwardGrid.tsx
  export function AwardBadgeFor({ award, size, shine }: { award: Award; size: number; shine?: boolean }): JSX.Element; // ribbon 'CHAMPION' + laurel for titles
  export function AwardGrid({ items, size, columns, onOpen }: { items: Award[]; size: number; columns: number; onOpen: (a: Award) => void }): JSX.Element;
  ```
  `totals` comes from `allSports(played)`: `played`, `won`, and the number of sports with `played > 0`.

- [ ] **Step 1: Write the failing tests** in `awardsView.test.ts`:
  - **Titles:**
    - `titleAward("Winner of Men's Doubles at HSR Shuttle Cup", 0)` has name `"Champion · Men's Doubles"`, context `'HSR Shuttle Cup'` and status `{ label: 'Won at', value: 'HSR Shuttle Cup' }`.
    - Unparseable text keeps the raw string as its name.
  - **Honours:**
    - `honourAward({ title: 'Player of the Match', badge: 'player-of-the-match' }, 0, [])` has icon `'star'` and no glyph.
    - `centurion` has glyph `'100'` and no icon.
    - An unknown key `'mystery'` titled `'Smash King'` has glyph `'SK'`.
    - `lockedHonours()` items carry the same icons.
  - **Knockouts:** two knockout wins in one sport give tier `'Quick knockout · ×2'` and status label `'Earned at'`. One win gives tier `'Quick knockout'`.
  - **Milestones:**
    - `matches-50` earned with totals `{ played: 85, won: 53, sports: 3 }` gives status value `'85 played'`.
    - `wins-25` gives `'53 won'`.
    - `sports-2` gives `'3 sports played'`.
    - Locked `matches-100` (progress 85, target 100) gives `'85 of 100'`.
  - **Featured order:**
    - With a title, an honour and a knockout, it's the last title, labelled `'Latest title'`.
    - With no title, it's the last honour, labelled `'Latest honour'`.
    - With only knockouts, it's `'Knockout winner'`.
    - With nothing earned, it's the closest milestone, labelled `'Closest first award'`.
    - With only milestones earned, it's the closest locked one, labelled `'Next milestone'`.
- [ ] **Step 2:** Run `npx jest __tests__/awardsView.test.ts` and confirm it FAILS.
- [ ] **Step 3:** Implement the libs, then the screen and sheet per the spec's "Awards changes":
  - The featured card is a radial glow drawn with `react-native-svg` (`RadialGradient`, inner `metals[metal].enamel[0]`, outer `#121214` added to `constants/theme.ts` as `colors.glowOut`).
  - The badge is 176 with `shine`.
  - Label: mono 10.5, 0.08em, upper case, coloured `metals[metal].light`, or `text3` when locked.
  - Name in display 30, context 13 in `text3`.
  - Honours grid 88. Milestones grid 72 with 14px side padding and a 6px gap.
  - Profile's honours row keeps 36px badges.
- [ ] **Step 4:** Add `AwardsScreen.test.tsx`: with one title, the screen shows `'Latest title'` (the label in upper case is a style, not text) and `"Champion · Men's Doubles"`. Tapping a grid badge opens the sheet showing its tier.
- [ ] **Step 5:** Both files PASS, `__tests__/OwnProfileScreen.test.tsx` still PASSES, and `tsc` is clean.

---

### Task 3: Settings

**Files:**
- Rewrite: `src/app/profile/settings.tsx`
- Test: `__tests__/SettingsScreen.test.tsx` (create)

**Interfaces:**
- Consumes: `sendContactMessage` (Task 1); `TopBar` and `Button`; `auth.user`.
- Produces: the screen only. It no longer imports `AppearanceSection`, `pushToken` or the FCM functions; Task 12 deletes them.

- [ ] **Step 1: Write the failing tests:**
  - It shows `'Signed in as'` and the user's email. "Change password" pushes `/profile/change-password`.
  - With an empty message, "Send message" is disabled.
  - With `'too short'` (9 characters), pressing it shows `'Tell us a little more so we can help.'` and makes no call.
  - With a valid message:
    - It calls `sendContactMessage` once with `{ fullName: 'Priya Nair', email, message, phone }`.
    - A second press while pending doesn't call again.
    - On resolve the field is empty and `"Sent. We'll reply by email."` shows.
  - A rejection with `Error('Server said no')` shows `'Server said no'`.
  - No text `'Notifications'` or `'Appearance'` is rendered.
- [ ] **Step 2:** Run `npx jest __tests__/SettingsScreen.test.tsx` and confirm it FAILS.
- [ ] **Step 3:** Implement per spec, with the layout from `Settings.dc.html`. The message field is a multiline `TextInput` 132px tall, styled as a field.
- [ ] **Step 4:** PASS; `tsc` clean.

---

### Task 4: Change password

**Files:**
- Create: `src/lib/password.ts`
- Modify: `src/components/auth/PasswordRules.tsx`: import `passwordRules` and `passwordScore` from `@/lib/password` and re-export them, so the auth screens are untouched.
- Rewrite: `src/app/profile/change-password.tsx`
- Test: `__tests__/password.test.ts` (create), `__tests__/ChangePasswordScreen.test.tsx` (create)

**Interfaces:**
- Produces:
  ```ts
  export interface Rule { label: string; met: boolean }
  export function passwordRules(pw: string): Rule[];          // the 3 existing rules, same labels
  export function passwordScore(pw: string): number;          // 0–4, unchanged
  export function strengthLabel(score: number): string;       // 0–1 'Too weak', 2 'Fair', 3 'Strong', 4 'Very strong'
  export function passwordFormReady(f: { current: string; next: string; confirm: string }): boolean;
  export const mismatch = (next: string, confirm: string) => confirm.length > 0 && confirm !== next;
  ```

- [ ] **Step 1: Write the failing tests:**
  - `strengthLabel` for 0 through 4.
  - `passwordFormReady`:
    - `{ current: 'a', next: 'smash2026!', confirm: 'smash2026!' }` → true.
    - The same with `current: ''` → false.
    - `next: 'smash2026'` (no symbol) → false.
    - A mismatched confirm → false.
  - Screen:
    - "Update password" is disabled until ready.
    - Each password field has a "Show password" button that toggles `secureTextEntry`.
    - A mismatch shows `"Doesn't match the new password"`.
    - On resolve the fields clear and `'Password changed.'` shows.
    - On rejection with `Error('Current password is incorrect.')`, that text shows.
    - There's no text containing `'other devices'`.
- [ ] **Step 2:** Run both files and confirm they FAIL.
- [ ] **Step 3:** Implement per spec and `ChangePassword.dc.html`, without its intro line. Rule icons are `check_circle` (variant `f`, `accent`) and `radio_button_unchecked` (`text4`).
- [ ] **Step 4:** PASS. The existing auth tests that use `PasswordRules` still pass. `tsc` clean.

---

### Task 5: Edit profile

**Files:**
- Create: `src/lib/profileForm.ts`
- Rewrite: `src/components/profile/DobField.tsx` (new look, same `{ value, onChange }` contract and local-day ISO conversion)
- Modify: `src/components/ui/Segmented.tsx`: add `fill?: boolean` (equal-width segments on the default dark track)
- Rewrite: `src/app/profile/edit.tsx`
- Test: `__tests__/profileForm.test.ts` (create), `__tests__/DobField.test.tsx` (update the visuals; keep the date behaviour cases), `__tests__/EditProfileScreen.test.tsx` (create)

**Interfaces:**
- Consumes: `usePhotoUpload` (`@/components/profile/AvatarPicker`); `updateProfile` (authSlice); `checklist` and `EVENT_SPORTS`; `Segmented` with `fill`.
- Produces:
  ```ts
  export interface ProfileFormValues { firstName: string; lastName: string; phone: string; gender: string; dateOfBirth: string; location: string; sport: string }
  export function profileUpdate(form: ProfileFormValues, before: { sport?: string; location?: string }):
    { ok: true; data: Record<string, string> } | { ok: false; error: 'First name, last name and phone are required.' };
  export function readinessLine(form: Pick<ProfileFormValues, 'gender' | 'dateOfBirth'>): string;
  ```
  - `profileUpdate` trims values.
  - It always sends `firstName`, `lastName` and `phone`.
  - It sends `gender` and `dateOfBirth` only when non-empty.
  - It sends `sport` and `location` when non-empty, or as `''` when empty but `before` had a value.
  - `readinessLine` returns one of:
    - `'Add your date of birth and gender to enter tournaments.'`
    - `'Add your date of birth to enter tournaments.'`
    - `'Add your gender to enter tournaments.'`
    - `'Your profile is ready for tournaments.'`

- [ ] **Step 1: Write the failing tests:**
  - `profileUpdate`:
    - Blank `firstName` → the error.
    - All fields filled → the data has all 7 keys.
    - `sport: ''` with `before.sport: 'cricket'` → `data.sport === ''`.
    - `sport: ''` with no `before.sport` → no `sport` key.
    - `gender: ''` → no `gender` key.
  - `readinessLine` for all four cases.
  - Screen:
    - Fields are prefilled from `auth.user`.
    - Email is not editable.
    - Tapping the selected Badminton chip clears it.
    - Save dispatches `updateProfile` once (a double tap is ignored) with the `profileUpdate` data, and goes back on success.
    - A blank first name shows the required-fields error and dispatches nothing.
- [ ] **Step 2:** Run the three files and confirm they FAIL.
- [ ] **Step 3:** Implement per spec and `EditProfile.dc.html`.
- [ ] **Step 4:** PASS; `tsc` clean.

---

### Task 6: My entries

**Files:**
- Create: `src/lib/entriesView.ts`
- Rewrite: `src/app/profile/registrations.tsx`
- Test: `__tests__/entriesView.test.ts` (create), `__tests__/MyEntriesScreen.test.tsx` (create)

**Interfaces:**
- Consumes: `getMyEntries`, `getTournament`, `getTournamentCategories`, `withdrawEntry` (Task 1), `MyEntry`, `TournamentCategory`; `sportName`; `sportIcon`.
- Produces:
  ```ts
  export interface EntryLookup { tournament: { name: string; status?: string; sport?: string }; categories: TournamentCategory[] }
  export type Tone = 'text' | 'text2' | 'text3' | 'text4' | 'accentInk' | 'lossInk';
  export interface EntryRow {
    id: string; tournamentId: string; categoryId: string; createdAt: string;
    name: string;            // tournament name, or 'Tournament' when the lookup failed
    sub: string;             // '<category> · <sport>', '' when unknown
    sport?: string;
    status: string; tone: Tone;
    canWithdraw: boolean;
  }
  export function entryRows(entries: MyEntry[], lookups: Record<string, EntryLookup | null>): { active: EntryRow[]; closed: EntryRow[] };
  ```
  Status text, tones and grouping are per spec ("My entries"), including the completed and cancelled tournament rule. Within each group, newest `createdAt` first.

- [ ] **Step 1: Write the failing tests** (`entryRows`):
  - **Status lines:**
    - pending → `'Awaiting approval'` / `text2` / `canWithdraw` true.
    - approved → `'Approved'` / `text`.
    - auctioned with `soldPrice: 12000` → `'Drafted · sold ₹12,000'` / `accentInk` / `canWithdraw` false.
    - assigned without a price → `'Drafted'`.
    - rejected → closed, `'Not accepted by the organiser'` / `lossInk`.
    - withdrawn → closed, `'Withdrawn'` / `text4`.
  - **Finished tournaments:** an approved entry whose lookup tournament is `completed` is closed, `'Tournament completed'` / `text3`, with `canWithdraw` false. With `cancelled` it reads `'Tournament cancelled'`.
  - **Lookup failed** (`null`): `name` is `'Tournament'`, `sub` is `''`, grouped by entry status (pending stays active).
  - **Names:** `sub` uses the category's name and its `sport`, falling back to the tournament's.
- [ ] **Step 2: Write the failing screen tests:**
  - Two tournaments, one `getTournament` rejects: both rows render.
  - "Withdraw" opens the sheet with `'Withdraw from <name>?'`. "Withdraw" in the sheet calls `withdrawEntry` once (double tap ignored), then reloads the entries.
  - A rejection shows the server message in the sheet.
  - "Keep my entry" closes the sheet with no call.
  - Tapping a row pushes `{ pathname: '/category/[categoryId]', params: { categoryId, tournamentId } }`.
  - With no entries: `'No entries yet'`.
- [ ] **Step 3:** Run both files and confirm they FAIL.
- [ ] **Step 4:** Implement:
  - Lookups run once per distinct tournament with `Promise.allSettled`.
  - Layout per `MyEntries.dc.html`.
  - The sheet uses `BottomSheet` with primary "Withdraw" and secondary "Keep my entry".
- [ ] **Step 5:** PASS; `tsc` clean.

---

### Task 7: Payments and the payment sheet

**Files:**
- Create: `src/lib/paymentsView.ts`
- Rewrite: `src/app/profile/invoices.tsx` (list plus a `BottomSheet` detail)
- Delete: `src/app/payment/[orderId].tsx`. Regenerate typed routes.
- Modify: `src/components/tournament/EntryForm.tsx`: export its fee label list as `FEE_LABELS`, and import it in `paymentsView`
- Test: `__tests__/paymentsView.test.ts` (create), `__tests__/PaymentsScreen.test.tsx` (create)

**Interfaces:**
- Consumes: `getMyPayments`, `Invoice` (Task 1); `rupees`; `CopyButton` (`@/components/room/Roster`) or `expo-clipboard` directly.
- Produces:
  ```ts
  export function paidAt(inv: Invoice): string;                         // updatedAt ?? createdAt
  export function paymentsSummary(list: Invoice[]): { total: number; count: number };
  export function sortPayments(list: Invoice[]): Invoice[];             // newest paidAt first
  export function feeLines(inv: Invoice): { label: string; value: string; total?: true }[];
  // Entry fee (baseAmount), Payment gateway (2%), Platform fee (2%), GST (18% on fees), Total (amount, total: true).
  // A line whose number is missing is omitted; Total is always present.
  ```

- [ ] **Step 1: Write the failing tests:**
  - `paymentsSummary` of amounts 1047.2 and 523.6 → `{ total: 1570.8, count: 2 }`, with no float noise (round to 2 decimals).
  - `sortPayments` orders by `updatedAt`, falling back to `createdAt`.
  - `feeLines` for base 1000, fees 20/20/7.2 and amount 1047.2 → five lines with values `'₹1,000'`, `'₹20'`, `'₹20'`, `'₹7.20'`, `'₹1,047.20'`. With no `feeBreakdown` → only Entry fee and Total. With no `baseAmount` either → only Total.
  - Screen:
    - It shows `'Total paid'` and the total.
    - Rows show the tournament name and amount.
    - Tapping a row opens the sheet with `'Paid · '`, the order id and the payment id.
    - "Get help" opens `mailto:support@kria.club?subject=Payment <orderId>` (`Linking.openURL` mocked).
    - No `'Failed'`, `'Refunds'` or `'Retry'` text.
    - Empty list: `'No payments yet'`.
- [ ] **Step 2:** Run both files and confirm they FAIL.
- [ ] **Step 3:** Implement per spec, `Payments.dc.html` and `PaymentSheet.dc.html`, without the receipt line. Delete the route (grep `/payment/` first: only `InvoiceCard` links to it, and Task 13 deletes `InvoiceCard`). Regenerate routes.
- [ ] **Step 4:** PASS; `tsc` clean.

---

### Task 8: Tournaments (all), All matches and the shared recent row

**Files:**
- Modify: `src/lib/profileView.ts` (history helpers, month grouping)
- Create: `src/components/profile/RecentRow.tsx` (the recent-match row now inline in `app/(tabs)/profile.tsx` `SportDetail`). Profile uses it.
- Rewrite: `src/app/profile/history.tsx`
- Rewrite: `src/app/matches/[playerId].tsx`
- Test: `__tests__/profileView.test.ts` (extend), `__tests__/HistoryScreen.test.tsx` (create), `__tests__/AllMatchesScreen.test.tsx` (rewrite)

**Interfaces:**
- Produces:
  ```ts
  export function historyStrip(list: TournamentHistoryEntry[]): { entered: number; matches: number; won: number };
  export function historySports(list: TournamentHistoryEntry[]): string[];               // distinct tournament.sport, first-seen order
  export function groupByYear<T extends { createdAt: string; tournament?: { startDate?: string } }>(list: T[]): { year: string; items: T[] }[]; // newest first
  export function recordLine(e: { stats?: { matchesPlayed?: number; matchesWon?: number } }): string; // 'N played · M won' | 'Not played yet'
  export function groupByMonth(list: RecentMatch[]): { month: string; items: RecentMatch[] }[];     // 'October 2026', newest first
  export function matchSports(list: RecentMatch[]): string[];
  // components/profile/RecentRow.tsx
  export function RecentRow({ match, now }: { match: RecentMatch; now: Date }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing tests:**
  - `historyStrip` sums the stats and treats missing ones as 0.
  - `groupByYear` uses `startDate`, falling back to `createdAt`, with years and items newest first.
  - `recordLine` for `{ matchesPlayed: 4, matchesWon: 3 }` → `'4 played · 3 won'`; for `{}` → `'Not played yet'`.
  - `groupByMonth` gives month labels like `'October 2026'`, newest first.
  - History screen:
    - The strip shows Entered, Matches and Won.
    - Sport chips appear only with two or more sports, and selecting one filters the rows.
    - No `'Earned'` text.
    - Tapping a row pushes `/tournament/<id>`.
  - All matches screen:
    - With a `name` param it shows that sub-line.
    - Chips filter by sport.
    - Exactly 50 rows shows `'Showing the 50 most recent matches.'`; 49 rows doesn't.
    - Empty: `'No matches yet'`. An error shows Retry.
- [ ] **Step 2:** Run the three files and confirm they FAIL.
- [ ] **Step 3:** Implement per spec, `TournamentHistory.dc.html` and `AllMatches.dc.html`. Profile's recent rows switch to `RecentRow`.
- [ ] **Step 4:** PASS, with `OwnProfileScreen.test.tsx` still passing. `tsc` clean.

---

### Task 9: Join with a code

**Files:**
- Create: `src/lib/joinView.ts`
- Rewrite: `src/app/quick/join.tsx`
- Test: `__tests__/joinView.test.ts` (create), `__tests__/JoinScreen.test.tsx` (rewrite), `__tests__/quickBackNavigation.test.tsx` (the join fallback becomes `/(tabs)/compete?seg=matches`)

**Interfaces:**
- Consumes: `resolveQuickCode` and `QuickCode`, `claimQuickMatchSlot`, `joinQuickKnockout`, `claimKnockoutGuest`; `formatLabel` from `lib/quickMatchView` and `lib/quickKnockoutView`; `teamPlayers`; `initials`; `sportName`.
- Produces:
  ```ts
  export interface SlotView { slotId: string; name: string; ini: string; taken: boolean }
  export type JoinView =
    | { kind: 'match'; kicker: string; title: string; format: string; code: string;
        sides: { name: string; slots: SlotView[] }[]; mine: boolean; full: boolean }
    | { kind: 'knockout'; kicker: string; title: string; format: string; host: string; count: number;
        mine: boolean; closed: string | null;
        teams: { teamId: string; name: string; count: string; full: boolean }[] | null;   // null unless cricket
        guests: { playerKey: string; name: string }[] };
  export function joinView(found: QuickCode, meId: string): JoinView;
  ```
  - `kicker` is `'Quick match · Badminton'` or `'Knockout · Cricket'`.
  - A knockout's `format` is `formatLabel(k)`, plus `' · N a side'` for cricket.
  - `host` is the host player's display name, or `'the host'`.
  - `closed` is per spec's three messages.
  - A team's `count` is `'n/playersPerTeam'`, or `'Full'`.

- [ ] **Step 1: Write the failing tests** (`joinView`):
  - **Match:**
    - Taken and open slots map correctly.
    - `full` is true when no slot is open.
    - `mine` is true when a slot's `playerId` is `meId`.
  - **Knockout:**
    - `closed` is `'This knockout has already started.'` for live, and so on for completed and cancelled.
    - `mine` holds even when closed.
    - A cricket team at capacity has `full: true` and `'Full'`.
    - A badminton knockout has `teams` null.
    - `guests` are the players without `playerId`.
- [ ] **Step 2: Write the failing screen tests:**
  - With no `code` param it calls `router.replace('/(tabs)/compete?seg=matches')`.
  - **Match:**
    - Selecting an open slot enables "Take this spot". Pressing it calls `claimQuickMatchSlot(code, slotId)` once and then `router.replace` to `/quick/[id]`.
    - On rejection, `resolveQuickCode` is called again, the server message shows, the selection clears, and that slot now shows `'Taken'` from the fresh lookup.
    - All taken: `'Every spot is taken. Ask the host to add you.'` with no button.
    - Already in: `"You're in this match"` and "Open".
  - **Knockout:**
    - A cricket team pick plus "Join as Priya Nair" calls `joinQuickKnockout(code, teamId)`.
    - "Any team" calls `joinQuickKnockout(code)`.
    - A guest chip calls `claimKnockoutGuest(code, playerKey)`.
    - Each then replaces the route with `/knockout/[id]`.
    - A closed knockout shows its message and no join button.
- [ ] **Step 3:** Run the three files and confirm they FAIL.
- [ ] **Step 4:** Implement per spec, `JoinMatch.dc.html` and `JoinKnockout.dc.html`. No code field.
- [ ] **Step 5:** PASS; `tsc` clean.

---

### Task 10: Cricket player stats and the stats sheet

**Files:**
- Modify: `src/lib/cricketSort.ts`
  - `sortMetric` units become lower case: `runs`, `wkts`, `SR`, `econ`, `4s`, `6s`, `high`.
  - Add `statsSheet` and `matchesOf`.
- Rewrite: `src/app/cricket/leaderboard/[categoryId].tsx`. It reads `tournamentName` and `categoryName` params, and marks your rows from `getMyEntries()`.
- Modify: `src/app/tournament/[id]/matches.tsx`: the Player stats link also passes `tournamentName` and `categoryName`.
- Delete: `src/app/cricket/my-stats/[registrationId].tsx`. Regenerate typed routes.
- Test: `__tests__/cricketSort.test.ts` (create or extend), `__tests__/CricketLeaderboardScreen.test.tsx` (create)

**Interfaces:**
- Consumes: `getCricketLeaderboard`, `SORTS`, `SORT_LABELS`, `CricketPlayerStats` (Task 1 shape); `getMyEntries`.
- Produces:
  ```ts
  export function matchesOf(s: CricketPlayerStats): number; // max(batting.matches, bowling.matches), 0 when absent
  export function statsSheet(s: CricketPlayerStats): {
    title: string; sub: string; // '<team> · N matches' (no team → 'N matches')
    groups: { title: 'Batting' | 'Bowling' | 'Fielding'; cells: { k: string; v: string }[] }[];
  };
  ```
  - Cells and order are per spec.
  - Average and strike rate use 1 decimal; economy uses 1 decimal.
  - Best is `computed.bestFigures`.
  - Null or undefined values show `'—'`.

- [ ] **Step 1: Write the failing tests:**
  - `matchesOf({ batting: { matches: 5 }, bowling: { matches: 3 } … })` → 5.
  - `statsSheet`:
    - Gives 7 batting, 5 bowling and 3 fielding cells.
    - There's no `'Maidens'`.
    - `computed.economy: null` → `'—'`.
    - Missing `fielding` → three `'—'`.
  - `sortMetric('wickets', …).unit` → `'wkts'`.
  - Screen:
    - The header sub is `'<tournamentName> · <categoryName>'`.
    - The leader card shows `'Most runs'` and the value.
    - The row whose `registrationId` is in `getMyEntries()` is tinted (assert via its accessibility label containing `'you'`, or a `testID`).
    - Tapping any row opens the sheet with that player's name.
    - Sort race: press Wickets, then Runs. The Wickets request resolves after Runs, and the table still shows the Runs order.
    - Empty: `'Nothing recorded yet'`.
- [ ] **Step 2:** Run both files and confirm they FAIL.
- [ ] **Step 3:** Implement per spec, `CricketLeaderboard.dc.html` and `CricketStats.dc.html`. Delete the my-stats route and regenerate routes.
- [ ] **Step 4:** PASS; `tsc` clean.

---

### Task 11: Shared Profile pieces and other players' profiles

**Files:**
- Create under `src/components/profile/` the pieces split out of `app/(tabs)/profile.tsx`:
  - the identity block (photo, name, best-rank chip, honours row);
  - the stat strip;
  - the analytics (rings plus `SportDetail`, which uses `RecentRow` from Task 8);
  - the tournament rows;
  - `HonoursSheet.tsx`, the "+N more" sheet.

  Component names are the implementer's choice. The props must let the tab pass photo upload and Edit, and let another player's profile pass neither.
- Modify: `src/app/(tabs)/profile.tsx`: uses the pieces. No behaviour change.
- Rewrite: `src/app/player/[playerId].tsx`
- Test: `__tests__/OwnProfileScreen.test.tsx` (must pass unchanged, apart from mock paths for moved modules), `__tests__/PlayerProfileScreen.test.tsx` (rewrite)

**Interfaces:**
- Consumes: `AwardGrid`, `AwardBadgeFor` and the `buildAwards` totals (Task 2); `AwardSheet`; `RecentRow` (Task 8); `getPublicPlayer`, the widened `PublicHistoryEntry` (Task 1); `useCareer`; `getRecentMatches`; `getTopPlayers`; `listMyQuickKnockouts`; `bestRank`, `tournamentRow`, `allSports`, `ringFor`.
- Produces: `HonoursSheet({ open, onClose, awards }: { open: boolean; onClose: () => void; awards: Award[] })`. It's titled "Honours and titles", shows an 88px `AwardGrid`, and tapping a badge shows that award's detail (the `AwardSheet` body) in the same sheet.

- [ ] **Step 1: Write the failing tests** for `PlayerProfileScreen`:
  - It shows the player's name and the strip `Matches`, `Wins`, `Tournaments`, where Tournaments is the history length.
  - There's no Settings button, no "Edit profile", no `'Account'`, no `'Complete your profile'`, and no photo button.
  - With 5 honours, `'+2 more'` opens a sheet titled `'Honours and titles'`. Tapping a badge in it shows the badge's tier.
  - Tournament rows render for every history entry (6 entries → 6 rows) with no `'All'` link.
  - "All matches" pushes `/matches/[playerId]` with `name`.
  - `playerId` equal to my id calls `router.replace('/(tabs)/profile')`.
  - `getPublicPlayer` resolving `null` shows `'Player not found'` and Back.
  - A player with no sports played, no honours and no history shows `'No matches on record yet.'` and renders without errors.
- [ ] **Step 2:** Run it and confirm it FAILS.
- [ ] **Step 3:** Split the tab into the pieces with no visual change; `OwnProfileScreen.test.tsx` passes. Then build the player screen per the spec's "Other players' profiles".
- [ ] **Step 4:** Both PASS; `tsc` clean.

---

### Task 12: Remove Appearance, theme mode and push

**Files:**
- Delete:
  - `src/components/settings/AppearanceSection.tsx`, and `src/components/settings/Section.tsx` if it has no other importer.
  - `src/lib/theme/ThemeProvider.tsx`.
  - `src/lib/pushToken.ts`.
  - `test-utils/colourLiterals.ts` and `__tests__/colourLiterals.test.ts`.
  - `__tests__/appearanceSection.test.tsx` and `__tests__/themeProvider.test.tsx`.
- Modify: `src/lib/theme.ts`
  - Export `useTheme(): Palette` returning `dark`.
  - Drop `useThemeMode`, `ThemeProvider`, `THEME_MODE_KEY`, `ThemeMode`, `light` and `ThemeName`.
- Modify: `src/lib/theme/palette.ts`: delete the `light` palette.
- Modify: `src/app/_layout.tsx`: remove the provider.
- Modify: `src/api/settings.ts`: delete `registerFcmToken` and `unregisterFcmToken`.
- Test: `__tests__/useTheme.test.tsx` (rewrite: `useTheme()` returns `dark` with no provider)

- [ ] **Step 1:** Grep every name above across `src`, `__tests__` and `test-utils`. Every importer must be a file in this list, or an old screen that only calls `useTheme()`.
- [ ] **Step 2:** Rewrite `useTheme.test.tsx` and confirm it FAILS against the current provider-based hook.
- [ ] **Step 3:** Make the deletions and changes. The `expo-notifications` package stays.
- [ ] **Step 4:** `npx tsc --noEmit` clean; `npx jest` (whole suite) passes.

---

### Task 13: Route deletions, orphan sweep, gates and handover

**Files:**
- Delete: `src/app/quick/index.tsx`, `src/app/knockout/index.tsx`, `__tests__/QuickMatchesScreen.test.tsx`, `__tests__/KnockoutListScreen.test.tsx`. Regenerate typed routes.
- Delete: every module under `src/` that no longer has an importer, with its tests. Expected at least the spec's list:
  - `components/profile/{PlayerCard, SportCards, TrophyCabinet, ProfileHistory, Badge, RecentMatches, HistoryCard, RegistrationCard, InvoiceCard, GenderSegment}`.
  - The `AvatarPicker` component, keeping `usePhotoUpload` (move the hook to `components/profile/usePhotoUpload.ts` if the component file would otherwise be empty, and update the importers).
  - `lib/paymentVerdict.ts`.
  - `registrationSlice`'s `myRegistrations`, `fetchMyRegistrations` and `withdrawRegistration` if unused.
- Modify: `d:/kria/HANDOVER-mobile-redesign.md`:
  - Status table, "What we built" (a new section for this pass), Decisions (the spec's "Calls made by Claude"), Known limits, Still old UI (now only auth, onboarding and the launch animation), the file map and the test counts.
  - It also notes that Profile › My entries "Pay now" and the payment route are gone.

- [ ] **Step 1:** List orphan candidates:
  ```bash
  for f in $(find src/components src/lib src/api src/store src/hooks -name '*.ts' -o -name '*.tsx' 2>/dev/null); do m=${f#src/}; m=${m%.*}; grep -rqE "@/${m}['\"]" src --include=*.ts --include=*.tsx || echo "$f"; done
  ```
  Confirm each candidate by grepping its basename for relative imports. Keep anything the `(auth)`, `(onboarding)`, `cricket/*` or other kept screens use.
- [ ] **Step 2:** Delete the confirmed orphans and their tests. Repeat Step 1 until no new candidates appear, because deleting can orphan more.
- [ ] **Step 3: Gates:**
  - `npx tsc --noEmit` is clean.
  - `npx jest` passes the whole suite. Record the suite and test counts.
  - `npx expo config --json` resolves.
  - The Android dev bundle check from the handover's Verification section shows `grep -c "__workletHash"` near its hand-over value (573), not near zero.
- [ ] **Step 4:** Update the handover. Report the deleted files list and the gate output to the controller.
