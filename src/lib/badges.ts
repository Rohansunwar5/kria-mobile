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
