import type { KnockoutFixture, KnockoutPlayer, QuickKnockout } from '@/api/quickKnockout';

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

function playersOf(k: QuickKnockout, entrantId?: string): KnockoutPlayer[] {
  const entrant = k.entrants.find((e) => e.entrantId === entrantId);
  return (entrant?.playerKeys ?? [])
    .map((key) => k.players.find((p) => p.playerKey === key))
    .filter((p): p is KnockoutPlayer => Boolean(p));
}

/** "Arjun Mehta" alone, "Arjun & Priya" as a pair — the name a match side carries. */
export function entrantName(k: QuickKnockout, entrantId?: string): string {
  const players = playersOf(k, entrantId);
  if (players.length === 1) return players[0].displayName;
  return players.map((p) => firstName(p.displayName)).join(' & ');
}

/** First names only, for the narrow bracket boxes. */
export function entrantShortName(k: QuickKnockout, entrantId?: string): string {
  return playersOf(k, entrantId).map((p) => firstName(p.displayName)).join(' & ');
}

export const isKnockoutHost = (k: QuickKnockout, playerId?: string) => Boolean(playerId) && k.hostId === playerId;

/** Mirrors the server's refusals, so Draw can say why it is disabled. */
export function drawBlocker(k: QuickKnockout): string | null {
  if (k.format === 'doubles' && k.players.length % 2 !== 0) return 'Add one more player or remove one to draw.';
  const entrants = k.format === 'doubles' ? k.players.length / 2 : k.players.length;
  if (entrants < 3) return 'A knockout needs at least 3 entrants.';
  return null;
}

export function unpairedPlayers(k: QuickKnockout): KnockoutPlayer[] {
  const paired = new Set(k.pairs.filter((p) => p.byHost).flatMap((p) => p.playerKeys));
  return k.players.filter((p) => !paired.has(p.playerKey));
}

export function bracketColumns(k: QuickKnockout): { name: string; fixtures: KnockoutFixture[] }[] {
  return k.roundNames.map((name, i) => ({
    name,
    fixtures: k.fixtures.filter((f) => f.round === i + 1).sort((a, b) => a.position - b.position),
  }));
}

/** Has a match and no winner yet — what the host scores next. */
export const isPlayable = (f: KnockoutFixture) => Boolean(f.quickMatchId) && !f.winnerEntrantId;

export const championName = (k: QuickKnockout) => (k.championEntrantId ? entrantName(k, k.championEntrantId) : '');

/** Low-tier badges a host may hand out; matches the server's QUICK_AWARD_BADGES. */
export const QUICK_AWARD_BADGES = {
  'iron-player': 'Iron Player',
  'first-cap': 'First Cap',
  'ace-serve': 'Ace Serve',
  'fair-play': 'Fair Play',
} as const;

export const awardablePlayers = (k: QuickKnockout, hostId: string) =>
  k.players.filter((p) => p.playerId && p.playerId !== hostId);
