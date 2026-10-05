# Award badges on player honours

Spans three repos: `server/`, `client/` (organizer UI only), `mobile/` (player UI).
Design source: `Kria Award Badges.dc.html` at the workspace root.

## Goal

When an organizer grants an honour, they pick one of twelve preset badges. The badge and the
title render together in the Honours section of the player's profile on mobile. Player-facing
pages in `client/` are not touched.

## Today

- `Player.titles: string[]`. Written two ways:
  - auto: category completion adds `Winner of <category> at <tournament>` (cricket, badminton,
    team-league); a reopened badminton final removes it (`playerRepository.removeTitle`).
  - manual: `POST /tournament/:id/awards` (`tournamentService.grantAward`) pushes to
    `tournament.awards` and calls `playerRepository.addTitle`. No body validation.
- Organizer grants from `CategoryAnalyticsModal` (Awards button on a category): per competitor
  row, free-text title with a `<datalist>` of suggestions.
- Mobile renders `titles` as orange trophy rows, inline, in `app/(tabs)/profile.tsx` ("Honors")
  and `app/player/[playerId].tsx` ("Titles").

## Badge catalogue

Twelve selectable keys, fixed. Tier decides frame gradient, halo and label colour; emblem is
the glyph in the frame.

| key | name | tier | emblem |
|---|---|---|---|
| `player-of-the-match` | Player of the Match | legendary | star |
| `season-mvp` | Season MVP | legendary | trophy |
| `hat-trick` | Hat-Trick | elite | stumps |
| `undefeated-run` | Undefeated Run | elite | shield |
| `auction-steal` | Auction Steal | elite | gavel |
| `centurion` | Centurion | gold | bat |
| `clean-sweep` | Clean Sweep | gold | bracket |
| `rally-king` | Rally King | gold | racket |
| `ace-serve` | Ace Serve | rare | shuttle |
| `fair-play` | Fair Play | rare | flag |
| `iron-player` | Iron Player | steel | medal |
| `first-cap` | First Cap | steel | target |

Mobile-only, not selectable: `champion` (gold, trophy), the default for legacy `titles`
entries that carry no badge.

The catalogue is duplicated by necessity (three separate packages): server holds the key list
only; client and mobile hold key → name, tier, emblem plus their own SVG renderer.

## Server

- `Player.honors: [{ title: String, badge: String }]`, `_id: false`. `titles` unchanged.
- `tournament.awards[]` gains `badge: String`.
- `playerRepository.addHonor(id, { title, badge })` — `$addToSet`, same dedupe semantics as
  `addTitle` (identical title+badge granted twice shows once).
- `grantAward`: when `playerId` is present, `addHonor` instead of `addTitle`. Team-only awards
  write nothing to players (unchanged).
- Body validation on `POST /tournament/:id/awards`: `title` required, trimmed, 1–60 chars;
  `badge` required, one of the twelve keys. Invalid → 400.
- Public profile payload (`getPublicProfile`) adds `honors: player.honors || []`. `/player/me`
  returns the whole document already.

## Organizer (`client/`)

- New `src/pages/organizer/components/badges.tsx`: the catalogue, plus `<BadgeArt badge size />`
  — static web SVG (shared `<defs>` per instance, ids namespaced to avoid collisions).
- `CategoryAnalyticsModal` Grant Award form: 4×3 grid of badge thumbnails replaces the datalist.
  Selecting a badge sets `awardTitle` to its name; the title input stays editable. Confirm is
  disabled until a badge is selected and the trimmed title is non-empty. Payload adds `badge`.
  Form state resets when the form is cancelled or a grant succeeds.

## Mobile

- `src/lib/badges.ts`: catalogue + `Honor` type `{ title: string; badge: string }`.
- `src/components/profile/Badge.tsx`: `react-native-svg` port of frame + tier gradient + emblem +
  halo. Unknown key → `champion` art. At 44px: no orbit ring, sparks or sweep (design handoff).
- Motion: halo opacity/scale pulse on legendary, elite and gold only — one idle animation per
  row (DESIGN.md §6). Off under reduce-motion (`useReducedMotion`); cancelled on screen blur
  (`useIsFocused`). `inOut.cubic` curve.
- `src/components/profile/HonorsList.tsx`: rows of 44px badge + tier label (tier colour, Space
  Mono) + title (Anton, uppercase). Badged honours first, newest first; then legacy titles with
  `champion`. Renders nothing when both are empty. Takes the section label as a prop.
- Both profile screens replace their inline rows with `<HonorsList>`; labels stay "Honors" and
  "Titles". `User.honors?` and `PublicPlayer.honors` added to the types.

## Error handling

- Bad body → 400 from the validator; the modal already alerts `response.data.message`.
- Missing `honors` on older documents → treated as `[]` everywhere.
- Unknown badge key in stored data → renders `champion`, never crashes.

## Tests

- Server (vitest): grant with badge stores `{ title, badge }` on player and award; unknown badge
  → 400; 61-char title → 400.
- Mobile (jest): `HonorsList` renders badged honours then legacy titles, in order, and renders
  nothing when both are empty.

## Out of scope

Badges on the tournament Info tab's Awards list; linking an honour to its tournament; the
design's award-reveal / pin-to-profile sheet; organizer search outside the Awards modal;
the locked badge state.
