# Kria Player — design system

The visual language for the player app. This file is the **reference**; the build handoff is
[`docs/design-canvas/IMPLEMENTATION.md`](docs/design-canvas/IMPLEMENTATION.md), and the screen
designs are the 22 artboards in [`docs/design-canvas/`](docs/design-canvas/) (open
`docs/design-canvas/kria-player-app-screens.html` in a browser to view them all on one canvas).

The direction is **maximalist and industrial** — sports-broadcast, not consumer-soft. Heavy type,
flat colour blocks, hard edges, visible texture. It deliberately replaces the earlier rounded
dark-card look.

---

## 1. Type — three faces, three jobs

Separating display, interface and data is what makes the app feel designed rather than assembled.

| Face | Job | Weights |
|---|---|---|
| **Anton** | Display. Screen titles, player and team names, buttons, section heads. Always uppercase, always tight leading (`line-height` ≈ 0.88 × size). | 400 |
| **Space Grotesk** | Interface. Body copy, row titles, descriptions, form labels. | 400, 500, 700 |
| **Space Mono** | Data. Every score, price, over, timestamp, and all overline labels. Tabular figures. | 400, 700 |

They are complementary by construction: all three are grotesques, so the skeletons agree, but
Anton is ultra-condensed against Grotesk's width. Space Grotesk and Space Mono are companion
designs, so the data layer sits *inside* the interface layer rather than beside it.

**Use Space Mono for anything numeric.** Live scores tick; tabular figures stop columns jittering.

Fallbacks matter — PNG/PDF export and first paint show them:

```
Anton         → 'Arial Narrow', Haettenschweiler, Impact, sans-serif
Space Grotesk → 'Segoe UI', system-ui, sans-serif
Space Mono    → ui-monospace, 'Cascadia Mono', Menlo, monospace
```

### Scale

| Role | Size / leading | Face |
|---|---|---|
| Screen title | 30–40 / 27–36 | Anton |
| Section head | 18–22 | Anton |
| Row title | 14–16 | Anton |
| Body | 13 / 19 | Space Grotesk 400 |
| Row label, emphasis | 12–13 | Space Grotesk 700 |
| Meta | 11–12 | Space Grotesk 400 |
| Overline label | 9 / 0.18em tracking | Space Mono 700 |
| Big data | 26–52 | Space Mono 700 |

> Two-line Anton names run at tighter leading than their glyph box, so they extend a few px past
> it. That paints fine, but never wrap one in a container with `overflow: hidden`.

---

## 2. Colour

```
ink      #0B0B0B   app background
panel    #151515   blocks, cards, rows
panel2   #1E1E1E   insets, nested tiles
line     rgba(255,255,255,0.14)   every border
```

Three accents, **one lightness and chroma, hue rotated** — `oklch(0.70 0.19 h)`:

| Token | Hex | Hue | Means |
|---|---|---|---|
| `brand` | `#F97316` | 46 | Live, primary action, the brand itself |
| `auction` | `#FA4C93` | 350 | The auction, and "you" in any list |
| `open` | `#16C46A` | 145 | Entry open, won, money received |
| `fail` | `#FF4438` | — | Failed payment, lost, destructive |

Because they share L and C, all three carry equal weight beside each other — none shouts. **Derive
any future accent the same way** rather than picking a hex by eye.

Text: `#FFFFFF` → `#d4d4d4` (body) → `#a3a3a3` (meta) → `#7d7d7d` (labels, disabled).

**Status is a solid fill in mono caps, never a tinted outline** — readable at 9px on a phone in
daylight. Only `live` carries a dot.

---

## 3. Surfaces

- **Radii 5–6px.** Blocks 6, controls and tags 5, small squares 3–4. Nothing is a soft card.
- **Borders 1.5px** at `rgba(255,255,255,0.14)`. In React Native this is `borderWidth: 1.5`, not
  a `box-shadow` inset.
- **Screen padding 16px** (the previous system used 20).
- **No drop shadows** except the bottom nav.
- **Avatars and team badges are squares**, 4px radius — players on brand orange, teams in their
  own colour. Circles are used only for genuinely round things (a cricket ball, a live dot).

### Texture — four devices, used sparingly

| Device | What it is | Where |
|---|---|---|
| Grain | Fractal-noise overlay at 16% | Whole screen, always last child |
| Hairlines | 115° 1px lines at 5% white | Hero and scoreboard panels |
| Hazard rule | 115° orange bars, 5px tall | Section breaks that need weight |
| Ghost type | Oversized Anton at 9% (outline) or 4.5% (fill), bleeding off frame edges | Behind heroes and empty states |

The shared 115° angle across hairlines and hazard rules is what ties them into one family.

**In React Native:** hazard rules want `expo-linear-gradient` or a tiled image; grain wants one
low-opacity image or nothing. Ghost type has no `-webkit-text-stroke` equivalent — use low-opacity
`<Text>`. If a device can't be done cheaply, **drop it rather than approximate it badly.**

---

## 4. Icons

`src/components/icons/` — a custom set, not a library. Drawn to the same rules as the type:

- **24×24 grid, 2px stroke** (scales with `size`)
- **square caps, mitred joins** — no round terminals anywhere. This is the single biggest
  departure from Ionicons and what makes the set read industrial rather than friendly.
- **angular construction**: chevron-bowl trophy, straight-sided map pin, square inner details
  where a library would use a circle.
- **sport glyphs no generic set has** — `shuttlecock`, `cricket-bat`, `stumps`, `ball`, `court`,
  `gavel` (the auction), `bracket` (the knockout draw). These carry most of the brand character.

```tsx
import { Icon } from '@/components/icons';

<Icon name="trophy" size={20} color="#F97316" />
<Icon name="trophy" size={20} color="#F97316" filled />   // active / selected
```

The API mirrors Ionicons, so migrating a screen is close to a find-and-replace. `filled` only
reads correctly on closed shapes — `SOLID_CAPABLE` is the authoritative list, and
`__tests__/icons.test.tsx` enforces it. Open-stroke glyphs (`stumps`, `court`, `shuttlecock`)
would collapse into a blob if filled.

**Reference sheet:** open `docs/icon-sheet.html` — every glyph at 36px and 20px, plus the filled
form where one exists. It is generated from the source, so regenerate it rather than hand-editing.

Requires `react-native-svg` (installed via `npx expo install`, pinned by SDK 54).

**Third-party logos are not in this set.** Anything like the WhatsApp mark should keep using
`@expo/vector-icons` or the vendor's official asset — do not redraw trademarks.

---

## 5. State patterns

Designed in `docs/design-canvas/Patterns.dc.html`. This is the highest-value part of the system.

Every screen currently does `if (loading) return <ActivityIndicator />`, which blanks the whole
view — header, hero and nav — then snaps back. Replace that with:

| Pattern | Rule |
|---|---|
| **Skeleton** | Keep the chrome. Render masthead and avatar from cached auth state; block shapes match the real geometry so nothing shifts when data lands. |
| **Empty** | Name what *would* appear here, and offer the single action that fills it. |
| **Error** | Scope the failure to the section that failed. Hero, tabs and back button survive; retry sits in place. Never a dead-end screen. |
| **Stale** | Live data (auction, scores) dims and states how old the number is. Never blank, and never silently show a wrong price. |

---

## 6. Accessibility & platform

- **44px minimum hit target**, even where an artboard draws a control smaller.
- **No fake chrome.** Never draw an iOS status bar or virtual keyboard — the real ones render on
  top, and the artboards leave that space empty on purpose.
- Colour is never the only signal: status carries a word as well as a fill.
- The three accents are tuned for the dark ground only. This app has **no light theme** — don't
  add one without re-deriving the palette.

---

## 7. Status

| | |
|---|---|
| Designed | 22 screens covering the full player journey for badminton and cricket |
| Built | Icon set + tests. Screens are pre-migration — see `IMPLEMENTATION.md` Phase 1. |
| Sport scope | Badminton and cricket only. `src/lib/tournamentConstants.ts` still offers bowling, basketball and volleyball, which `SportConfig` cannot serve. |
