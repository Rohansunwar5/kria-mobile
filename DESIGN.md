# Kria Player App — Design System & Implementation Spec

Version 1.1 · 21 October 2026 · Dark-first · Player app only (organiser tools live in the organiser portal)

Kria is a player's sporting career in their pocket. Every screen answers at least one of: *Where do I stand? What have I achieved? Who can I play? What's next?*

> **Precedence:** where this doc and an older note disagree, this doc wins. Where this doc and a `.dc.html` mock disagree on a value, the mock wins — flag it so the doc can be fixed.

---

## 1. Source files

| File | What it covers |
|---|---|
| `Kria Onboarding.dc.html` | 7a–7c sign-up intros · 5a–5h welcome, log in, register, OTP, password, sport + city, DOB + gender, notifications |
| `Kria Player App.dc.html` | 1a–1h Home, Rankings, Quick matches, Host a match, Match room (swipe scoring), Events, Awards, Profile — established player |
| `Kria Player App - New Player.dc.html` | 4a–4e same screens for a player with zero matches |
| `Kria Tournament Details.dc.html` | 2a–2f overview, category + registration + payment, live auction, teams, bracket, group standings |
| `Kria Live Matches.dc.html` | 3a–3c live feed, badminton scoreboard, cricket live / scorecard / overs |
| `Kria Motion.dc.html` | 6a–6c launch animations, loaders, micro-interactions, motion tokens |
| `Kria Awards.dc.html` | 8a–8e badge families, metals, sizes, locked/progress, detail sheet |
| `AwardBadge.dc.html` | Reusable badge (`shape`, `metal`, `glyph`, `size`, `progress`, `count`, `laurel`, `shine`) |
| `assets/` | Logo, tournament banners, team crests |
| `github.md` | Screen → backend file map (`Rohansunwar5/kria-server`) |

---

## 2. Principles

1. **Backend truth only.** Never show a number the API can't produce. No invented ratings, rank movement, registration counts or "trending" labels. Missing data → the UI says how to get it.
2. **One focal point per screen.** Rank on Home, the score in a live match, the chase in cricket, the coin in an award.
3. **Typography does the work.** Hierarchy from condensed display type, scale and spacing — not boxes or gradients.
4. **Orange is earned.** Primary action, selected state, live, the player's own position, and "won". Never decoration.
5. **Empty means "here's how".** Every empty slot names the shortest real path to filling it ("0 of 10 decided matches").
6. **Players watch, staff operate.** Approvals, bidding and bracket edits are not in this app. The only scoring a player does is as host of their own quick match.

---

## 3. Information architecture

Bottom navigation (5 tabs, floating bar):

| Tab | Icon (Material Symbols) | Contains |
|---|---|---|
| Home | `home` | Status hero, Host a match / Join, Up next, Tournaments rail, milestone, Recent matches |
| Compete | `leaderboard` | Segmented: **Rankings** · **Matches** |
| Events | `stadium` | Official tournaments → Tournament detail → Live matches |
| Awards | `military_tech` | Titles, organiser honours, quick knockouts, milestones |
| Profile | avatar | Identity, per-sport win-rate circles, analytics, tournaments, settings |

Pushed (full-screen, no tab bar): Host a match, Match room, Tournament detail + sub-screens, live match screens, onboarding.

**Quick matches ≠ Official events.** Quick matches: player-hosted, join-by-code, no venue/time, under Compete. Official events: organiser-run, banners, dates, venues, lifecycles, under Events. They never share a feed.

---

## 4. Tokens

### 4.1 Colour

**Neutrals**

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0B0B0D` | App background, date-pill fill on images |
| `surface1` | `#151518` | Cards, sheets, nav bar, inputs |
| `surface2` | `#1D1D21` | Secondary buttons, chips (off), flip-card lower half |
| `surface3` | `#2A2A30` | Active segment, active nav pill, avatars |
| `line` | `#18181B` | List dividers |
| `lineStrong` | `#26262B` | Section rules, input outlines, empty progress track |
| `text` | `#F5F5F5` | Primary text |
| `text2` | `#C6C6CC` | Secondary emphasis |
| `text3` | `#92929A` | Labels, meta (≥4.5:1 on bg) |
| `text4` | `#6E6E76` | Non-essential hints only |
| `disabled` | `#5E5E66` | Disabled labels/icons |

**Brand + state**

| Token | Value | Use |
|---|---|---|
| `accent` | `#FF5A1F` | Primary CTA fill (Host a match, Continue, Pay), selected, live dot, own-row highlight, win-rate ring, Won segment |
| `onAccent` | `#0B0B0D` | Text on solid orange |
| `accentTint` | `rgba(255,90,31,.16)` | Orange pill background (Auction live, price, Won badge) |
| `accentInk` | `#FF7A45` | Text/icon on `accentTint` |
| `loss` | `#F0525F` | Lost segment in W/L bar |
| `lossTint` | `rgba(240,68,82,.14)` | Lost badge background |
| `lossInk` | `#F26B76` | Text on `lossTint` |
| `tie` | `#3B9EFF` (tint `rgba(59,158,255,.16)`) | Tied — profile bar + form only |
| `noResult` | `#4A4A52` | No-result segment |
| `error` | `#FF7A4D` | Inline validation |

**Metals** — `gold #C9A35A` (glyph `#E6CB8E`) rank #1 / honours · `silver #A9AFB7` rank #2 / milestones · `bronze #A8714A` rank #3 / knockouts · `platinum #C3CAD6` top milestone tier. Full ramps in §5.12.

**Colour rules**
- One **solid** orange fill per viewport (the primary CTA). Orange *tint pills* may repeat.
- Results: Won = `accentTint`/`accentInk`, Lost = `lossTint`/`lossInk`, always with the W/L letter (never colour alone).
- Status = dot + word; never a coloured card background.

### 4.2 Typography

Family **Archivo** (variable, `wdth 62–125`, `wght 100–900`). Mono **JetBrains Mono** (join codes only). Icons **Material Symbols Outlined** (wght 300, FILL 1 when active).

| Style | Size / line-height | Width · weight | Use |
|---|---|---|---|
| Hero numeral | 112–132 / .78 | 62% · 800 | Rank on Home |
| Flip score | 104 / 1 | 62% · 800 | Match room score cards |
| Display XL | 56–64 / .88 | 62% · 800 | Onboarding, profile name |
| Display L | 36–44 / .92 | 62% · 800 | Screen titles |
| Display M | 24–34 / 1 | 62% · 800 | Card titles, stat values, win-rate % |
| Title | 17 / 1.3 | 100% · 650 | Section headings |
| Body strong | 14–16 / 1.4 | 100% · 600 | Row titles, buttons, card names (16 / 650) |
| Body | 13–14 / 1.5 | 100% · 400 | Descriptions |
| Label | 12 / 1.4 | 100% · 400–600 | Meta, status words |
| Pill | 11–12 | 100% · 700 | Date, price, Live, Auction live, format/sport |
| Micro | 10.5–11 | 100% · 600 | Nav labels, chart axes |

All numbers `tabular-nums`. No uppercase headings (uppercase only for month abbreviations in date pills and "SOLD").

### 4.3 Spacing

| Token | px | Rule |
|---|---|---|
| `gutter` | **20** | Screen side padding (onboarding 24) |
| `sectionGap` | **44** | Between top-level sections on every scrolling screen |
| `headerToContent` | **18** | Section header → its first content |
| `cardInner` | 14–16 | Padding inside cards |
| `rowY` | 12–16 | Vertical padding of list rows |
| `stack` | 5–10 | Title ↔ meta inside a card |

Scale: 2 · 4 · 5 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24 · 28 · 32 · 44.

### 4.4 Radius & elevation

- Radius: pills `999` (date pill on images `9`) · inputs `14` · buttons `16` · flip cards `16` · cards `18–24` (rail 20, featured 24) · sheets `30` top · nav `24`.
- Flat by default. Shadows only on things that float: nav bar, bottom sheets, flip score cards (`0 10px 24px rgba(0,0,0,.45)`).
- Touch targets ≥ 44×44; buttons 52–56 tall.

### 4.5 `constants/theme.ts`

```ts
export const colors = {
  bg: '#0B0B0D', surface1: '#151518', surface2: '#1D1D21', surface3: '#2A2A30',
  line: '#18181B', lineStrong: '#26262B',
  text: '#F5F5F5', text2: '#C6C6CC', text3: '#92929A', text4: '#6E6E76', disabled: '#5E5E66',
  accent: '#FF5A1F', onAccent: '#0B0B0D', accentTint: 'rgba(255,90,31,0.16)', accentInk: '#FF7A45',
  loss: '#F0525F', lossTint: 'rgba(240,68,82,0.14)', lossInk: '#F26B76',
  tie: '#3B9EFF', tieTint: 'rgba(59,158,255,0.16)', noResult: '#4A4A52',
  error: '#FF7A4D',
  gold: '#C9A35A', silver: '#A9AFB7', bronze: '#A8714A', platinum: '#C3CAD6',
};
export const space = { gutter: 20, sectionGap: 44, headerToContent: 18, cardInner: 16, rowY: 14 };
export const radius = { pill: 999, datePill: 9, input: 14, button: 16, card: 20, cardLg: 24, sheet: 30, nav: 24 };
export const font = { family: 'Archivo', mono: 'JetBrainsMono', condensed: { fontStretch: '62%', fontWeight: '800' } };
export const motion = { fast: 100, base: 160, flipHalf: 170, enter: 220, slow: 320, launch: 620 };
```

---

## 5. Components

### 5.1 Navigation bar
Floating, inset 12, height 64, radius 24, `surface1` + 1px `#24242A` ring, fade to `bg` behind. Active item: one `surface3` pill (radius 18) covering icon + label; icon accent, FILL 1; label 700. Profile tab = avatar with accent ring when active. 52px hit area per item.

### 5.2 Buttons
| Variant | Fill / text | Use |
|---|---|---|
| Primary | accent / onAccent | Host a match, Continue, Pay, Register — one per screen |
| Secondary | surface2 / text | Join with code, Copy, alternatives |
| Tertiary | none / text3 | Skip, Not now, Clear |
| Destructive | surface1 / error | Cancel match |
| Disabled | surface2 / disabled | Until valid; never hidden |

Labels state the outcome ("Pay ₹628.32 and register"), never "Next".

### 5.3 Pills
| Pill | Style | Where |
|---|---|---|
| Date | `bg` fill, radius 9, 11/700, uppercase month ("12 OCT") | Top-left on event/tournament images |
| Price | `accentTint` + `accentInk`, radius 999 | Top-right on event cards (when not live) |
| Live | `accentTint` + `accentInk` + 6px accent dot | Top-right on event cards / Up next right slot |
| Auction live | `accentTint` + `accentInk` | Bottom-left of event card body |
| Format / Sport | surface2 + text2, sport icon 16px | Up next card, top-left |
| W / L badge | `accentTint`/`accentInk` or `lossTint`/`lossInk`, 1 letter, 700 | Recent matches, right-aligned |

### 5.4 Event / tournament card (one layout everywhere: Home rail, Events list, featured)
```
┌─────────────────────────────┐
│ [12 OCT]          [₹500|●Live]│  image 160 (rail) / 196 (featured), cover
│                             │
└─────────────────────────────┘
Name (16/650, featured 30 condensed)
📍 Venue (12, text3, pin icon `location_on`)
[Auction live]                    ← only when auction running
```
- Top-left: date pill. Top-right: Live pill if ongoing, else price pill (price hidden while Live).
- No status lines ("Registration open", "x days left") — removed.
- Missing banner → sport cover: radial `#232328 → #141416`, 56px outline sport icon + sport name.
- Rail card width 300, scroll-snap start, gap 12. Past events collapse to compact date-led rows.

### 5.5 Up next card (Home)
```
[Doubles] [🏸 Badminton]              ABX-42K | ●Live | Sat 19 Oct
Title (condensed 22)
2 slots left                                       (AM)(RK)(SS)
```
- Top-left: format + sport pills. Top-right: join code (mono) when waiting, Live pill when live, else date.
- Bottom-left: "N slots left" (text3; hide when full). Bottom-right: overlapping avatars (28px, −6px overlap, `bg` 2px ring).
- Show up to 3 avatars; "+N" chip only when 4 or more players have joined.

### 5.6 Recent matches row
Title (14/600) · score (text2, tabular) · context (12, text3, "Quick match · Cricket · Sat"). Right-aligned W/L badge (§5.3). Divider `line`. Max 3 on Home, then "See all".

### 5.7 Rankings (Compete › Rankings)
- Max **6 rows** visible per sport, top of list; "See full rankings" below.
- Row: rank (condensed 20; top 3 at 26 in metal colour) · 40px avatar (metal hairline for top 3) · name + "W won · D decided" · win rate (condensed 24).
- **Your row** highlighted: `accentTint` background, rank + rate in `accentInk`, radius 14. If you're outside the visible 6, append your row as the 7th with a `…` gap row above.
- **No pinned "You" bar** — removed.
- Always state the metric above the list ("Win rate · min 10 decided matches").

### 5.8 Profile win-rate circles
- One circle per sport played (sideways scroll, sorted by volume), plus "All sports".
- Ring 72–88px, stroke 6, track `lineStrong`, progress `accent`, round caps; animate fill 0 → value in 620ms on first view.
- Centre: percentage only (Display M, condensed). Sport name below (12, text3).
- **No W-L record** inside or under the circle. Detailed W/L/T/NR bar and last-10 form live in the per-sport section below.
- Unranked / <10 decided: ring shows progress to 10 ("4/10") in text3 instead of %.

### 5.9 Match room — swipe scoring (host only)
- Two score cards side by side (grid 1fr 1fr, gap 8): side name (13/600, text2), flip score (120×140 card, 104px numeral), hint "Swipe up +1 · down −1" (11.5, text4).
- Gesture: pointer down → up; `dy < −28px` = +1, `dy > 28px` = −1. Score can't go below 0. Tap does nothing.
- **Flip-calendar animation:** split card (top `#222227`, bottom `#1D1D21`, 2px `bg` seam). +1 flips top half down; −1 flips bottom half up. Each half 170ms (`cubic-bezier(.5,0,1,1)` out, `cubic-bezier(0,0,.3,1.4)` in), perspective 420. Reduced motion → instant swap.
- One-level **Undo** (disabled colour when nothing to undo). Header: "Game N · first to 21" and games tally.
- Light haptic on each accepted swipe. Non-hosts see the score read-only with "Only the host can score".

### 5.10 Other components
- **Inputs** — 54 tall, surface1, no border; error = 1.5px `error` inner ring + message below. Validate as typed; persist on Back. OTP = 6 boxes over one `one-time-code` input.
- **Chips / filters** — on: text fill + bg text; off: surface2. ▾ opens a bottom sheet. Show "Clear" when any filter is active.
- **Segmented control** — surface1 track, surface3 thumb. 2–4 peers.
- **List row** — no card; 1px `line`; 12–16 vertical padding.
- **Bottom sheet** — surface1, radius 30 top, 36×5 grabber, 62% black scrim, title + one-line explanation, options with accent check.
- **Status indicator** — 6–7px dot + word. Accent = live / waiting / registration open; text = in progress; text3 = completed; text4 = cancelled.
- **Bracket** — horizontal columns (200px cards, 36px gutter), connectors from `nextMatchId`, 1.5px `#34343B`. Winner bright, loser text4. Own matches accent ring. Unfilled = "Winner of QF 4".
- **Standings table** — rank, player + team, P W L Pts (Pts condensed 20); accent "Quarter-final line" after `topN`. Points-rule line above the table (see §14, open).

### 5.11 Award badge
| Family | Shape | Glyph | Source |
|---|---|---|---|
| Title | Shield + laurel + ribbon | Trophy / placement | Tournament winner, runner-up |
| Honour | Rosette | Organiser icon or 2-letter monogram | MVP, Best Player |
| Knockout | Hexagon | Sport icon, ×N repeats | Quick-match knockout win |
| Milestone | Coin | Numeral + MATCHES / WINS / SPORTS | Career counts |

Below 64px: drop laurel, ribbon, hairline, sub-label. Shine: 4.2s sweep, one badge per viewport, off under reduced motion. Tap → detail sheet (tier, name, description, criteria, progress).

### 5.12 Metal ramps
| Metal | Highlight · light · base · dark · deep | Enamel |
|---|---|---|
| Bronze | `#FFE3CC` `#E2A77D` `#A8714A` `#6E4428` `#3A2213` | `#2A1A10` → `#0E0805` |
| Silver | `#FFFFFF` `#E3E7EC` `#A9AFB7` `#676D76` `#33373D` | `#1F242B` → `#0A0C0F` |
| Gold | `#FFF5D6` `#F0D592` `#C9A35A` `#8C6A2F` `#4D3A17` | `#2C2213` → `#0F0B06` |
| Platinum | `#FFFFFF` `#EEF2F8` `#C3CAD6` `#7C8695` `#3A414C` + faint iridescence | `#18202C` → `#06080C` |
| Locked | `#6A6A72` `#55555D` `#3A3A42` `#2A2A30` `#18181B` + white progress ring | `#17171A` → `#0E0E10` |

---

## 6. Screen rules

- **Home** — order: status hero → Host a match (primary) / Join with code (secondary) → Up next → Tournaments rail → milestone → Recent matches. 44 between sections, 18 header → content. Hero opens on the most recently played sport; sport button opens a sheet of sports played, each with rank.
- **Rankings** — win rate among players with ≥10 decided matches, top 50 per sport, refreshed ~5 min. Outside top 50 → "Outside top 50". Unranked → distance to 10.
- **Quick matches** — join-with-code + your matches. Host flow: sport → format (badminton best of 1/3/5 to 11/15/21; cricket overs 1–50, 2–11 a side) → sides + slots → review + waiting-room toggle. Placeholder slots earn no stats.
- **Profile** — win-rate circles (§5.8), then per sport: rank, W/L/T/NR bar, last-10 form, ranking note, recent matches. "Best sport" only past 10 decided.
- **Events** — filters mirror the API (sport, status, city). Featured = most relevant open event with a banner. All cards per §5.4.
- **Tournament detail** — status, pinned announcement, tabs and single CTA follow lifecycle (registration → auction → matches → completed). Tabs appear only once data exists. Fee = fee + 2% gateway + 2% platform + 18% GST on those two fees.
- **Auction** — watch-only: player on the block, live bid, history, last sold, purses, your result.
- **New player** — same layouts, honest blanks ("—", 0/10). Profile checklist (DOB + gender required for tournament entry) on Home and Profile.
- **Onboarding** — Welcome → Create account → 3 intros (dots + Skip) → register → OTP → password (8+) → sport + city → DOB + gender (skippable, cost stated) → notification pre-prompt → new-player Home. Log in / Google bypass intros.
- **Awards** — grouped by source; earned first, then locked with progress; one shining badge (most recent).

---

## 7. Live matches

Feed row (`/live-feed`) → sport scoreboard → detail tabs.
- **Badminton:** current-game points 68px condensed hero; finished games small beside (winner bright). Game / match point chip only when true.
- **Cricket:** hero is the chase ("Need 32 off 22") + required and current rate from `cricketLiveState`. Live tab: batters (striker *), bowler, this-over ball chips (4/6 white, W accent, extras grey). Scorecard per innings. Overs tab: runs-per-over bars, wicket overs ringed.
- Updates via socket room `match:{id}`; only motion is the digit flip (§5.9 timing).

---

## 8. States

| State | Pattern |
|---|---|
| Loading | Skeletons in final shapes; fixed heights |
| Empty | Outline icon (wght 200) + condensed title + one line on how to fill it + one action |
| Error | Inline above content: what failed + Retry; keep cached data |
| Success | Check + condensed statement + next action (code shown huge after hosting) |
| Permission denied | Explain why ("Only the host can score") instead of hiding |
| Validation | Inline under field, server message where available |

---

## 9. Motion

150–250ms, ease-out. Tokens 100 / 160 / 220 / 320 / 620ms. Allowed: selection feedback, sheet slide-up, segment thumb slide, score digit flip, win-rate ring fill, progress fill, one award-unlock reveal. Not allowed: floating cards, parallax, confetti, animated gradients, looping pulses. `prefers-reduced-motion` → opacity only. Full demos in `Kria Motion.dc.html`.

---

## 10. Accessibility

- Text ≥ 4.5:1; text4 only for non-essential hints.
- Never colour alone: status = dot + word; results = W/L letters.
- Targets ≥ 44px. Swipe score cards expose `accessibilityActions` increment/decrement (VoiceOver/TalkBack adjustable) as a non-gesture alternative.
- Dynamic Type: condensed display caps at 1.3×; rows wrap rather than truncate numbers.
- Icon-only buttons have labels.

---

## 11. Voice

Short, direct, sporting. Second person. Numbers over adjectives ("7 more decided matches"). Explain why when asking for data. No exclamation marks, emoji or hype.

---

## 12. Imagery & assets

- Photography only on Welcome, event banners and tournament heroes. Gradients only for text legibility over photos.
- Crests on a `#F5F5F5` circle.
- Banners 16:9, cropped via `object-position`; never a poster with baked-in text as a background.
- Logo `assets/kria-logo.png`, 40px tall in headers.

---

## 13. Don'ts

Glassmorphism · neon glows · podium graphics · cards for every section · solid orange backgrounds on cards · status lines on event cards · W-L record on win-rate circles · pinned You bar · "+N" avatar chip under 4 players · tap-to-score · fake stats · lorem ipsum · emoji · more than one primary button per screen · uppercase headings · organiser controls in the player app.

---

## 14. Open items

- [ ] **Points-rule line above group tables** — keep or move to a tooltip/info icon? (Currently shown.)
- [ ] Milestone tiers pending backend: 10 · 50 · 100 · 250 matches; 10 · 50 · 100 wins; Runner-up title.

---

## 15. Implementation checklist

1. Add `constants/theme.ts` (§4.5); load Archivo (variable) + JetBrains Mono + Material Symbols.
2. Build primitives: `Pill`, `Button`, `SectionHeader` (enforces 18 below), `Screen` (gutter 20, sectionGap 44), `StatusDot`, `ResultBadge`, `Avatar`/`AvatarStack`.
3. Build composites: `EventCard`, `UpNextCard`, `RecentMatchRow`, `RankingList` (6 + own row), `WinRateRing`, `FlipScore` + `SwipeScoreCard`, `BottomSheet`, `AwardBadge`.
4. Wire screens in IA order (§3) against the endpoints in `github.md`.
5. QA against each `.dc.html` mock: spacing 44/18, one solid orange per viewport, W/L letters present, reduced-motion paths.
