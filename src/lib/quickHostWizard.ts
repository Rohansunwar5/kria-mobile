import type { CreateQuickMatchBody } from '@/api/quickMatch';
import { buildCricketCreateBody } from '@/lib/quickCricketCreate';

export type Sport = 'badminton' | 'table_tennis' | 'cricket';
/** Scored point by point, game by game, on the same panel. */
export type RallySport = Exclude<Sport, 'cricket'>;

/** The host wizard, one question per step. Sport and role advance on tap. */
export const STEPS = ['sport', 'role', 'format', 'players', 'review'] as const;
export type Step = (typeof STEPS)[number];

/** `playerId` absent means a placeholder that a join code can claim later.
 *  `displayName` is required either way — the validator rejects an empty one. */
export type SlotDraft = { playerId?: string; displayName: string };

export interface HostDraft {
  sport: Sport;
  /** Career credit is written from slot playerIds, so this decides whether the
   *  host earns figures. See `buildCricketCreateBody` for the full reasoning. */
  hostPlays: boolean;
  doubles: boolean;
  bestOf: 1 | 3 | 5 | 7;
  pointsToWin: 11 | 15 | 21;
  maxOvers: number;
  squadSize: number;
  /** What the host typed; '' means "build it from the players". */
  teamNames: [string, string];
  /** Two slots per side, always — singles just reads the first. Side 1's
   *  first slot is ignored while the host plays, because the host fills it. */
  side1: [SlotDraft, SlotDraft];
  side2: [SlotDraft, SlotDraft];
}

const EMPTY: SlotDraft = { displayName: '' };

export const INITIAL_DRAFT: HostDraft = {
  sport: 'badminton',
  hostPlays: true,
  doubles: false,
  bestOf: 3,
  pointsToWin: 21,
  maxOvers: 8,
  squadSize: 6,
  teamNames: ['', ''],
  side1: [EMPTY, EMPTY],
  side2: [EMPTY, EMPTY],
};

export const BEST_OF: Record<HostDraft['bestOf'], { label: string; hint: string }> = {
  1: { label: 'One game', hint: 'A single game decides it' },
  3: { label: 'Best of 3', hint: 'First to win 2 games takes the match' },
  5: { label: 'Best of 5', hint: 'First to win 3 games takes the match' },
  7: { label: 'Best of 7', hint: 'First to win 4 games takes the match' },
};

/**
 * What each rally sport lets a host pick. Mirrors RALLY_FORMATS on the server
 * (server/src/models/quickMatch.model.ts), whose validators refuse anything else.
 */
export const RALLY_FORMATS: Record<RallySport, {
  bestOf: HostDraft['bestOf'][];
  points: { value: HostDraft['pointsToWin']; sub: string }[];
  defaults: Pick<HostDraft, 'bestOf' | 'pointsToWin'>;
}> = {
  badminton: {
    bestOf: [1, 3, 5],
    points: [{ value: 11, sub: 'Quick' }, { value: 15, sub: 'Short' }, { value: 21, sub: 'Standard' }],
    defaults: { bestOf: 3, pointsToWin: 21 },
  },
  table_tennis: {
    bestOf: [1, 3, 5, 7],
    points: [{ value: 11, sub: 'Standard' }, { value: 21, sub: 'Classic' }],
    defaults: { bestOf: 3, pointsToWin: 11 },
  },
};

/** The draft change for a sport tap. A newly picked rally sport starts on its
 *  own usual format, so badminton's 15 points never reach table tennis. */
export function pickSport(d: HostDraft, sport: Sport): Partial<HostDraft> {
  if (sport === d.sport || sport === 'cricket') return { sport };
  return { sport, ...RALLY_FORMATS[sport].defaults };
}

/** What the form calls each side. Never sent — `teamNames` is what goes out. */
export function sideLabels(hostPlays: boolean): [string, string] {
  return hostPlays ? ['Your team', 'Opponents'] : ['Team A', 'Team B'];
}

/** The slots actually in play for the current singles/doubles and role choice. */
export function activeSlots(d: HostDraft, host: SlotDraft): [SlotDraft[], SlotDraft[]] {
  const n = d.doubles ? 2 : 1;
  const side1 = d.hostPlays ? [host, d.side1[1]] : d.side1;
  return [side1.slice(0, n), d.side2.slice(0, n)];
}

function fromPlayers(slots: SlotDraft[]): string {
  const names = slots.map((s) => s.displayName.trim()).filter(Boolean);
  if (names.length < 2) return names[0] ?? '';
  return names.map((name) => name.split(/\s+/)[0]).join(' & ');
}

/**
 * The name each side goes out with: whatever the host typed, else (rally sports)
 * built from its players — "Arjun Mehta", "Arjun & Priya" — else Team A/B.
 * Cricket never builds from players: its slots are placeholders, and the
 * host's own name is not a team.
 */
export function teamNames(d: HostDraft, host: SlotDraft): [string, string] {
  const [s1, s2] = d.sport !== 'cricket' ? activeSlots(d, host) : [[], []];
  return [
    d.teamNames[0].trim() || fromPlayers(s1) || 'Team A',
    d.teamNames[1].trim() || fromPlayers(s2) || 'Team B',
  ];
}

/** Why the players step cannot continue yet, or null when it can. */
export function playersBlocker(d: HostDraft, host: SlotDraft): string | null {
  if (d.sport === 'cricket') return null;
  const named = activeSlots(d, host).flat().every((s) => s.displayName.trim().length > 0);
  return named ? null : 'Name every player to continue.';
}

export function formatChips(d: HostDraft): string[] {
  if (d.sport === 'cricket') return [`${d.maxOvers} overs`, `${d.squadSize} a side`];
  return [d.doubles ? 'Doubles' : 'Singles', BEST_OF[d.bestOf].label, `${d.pointsToWin} points`];
}

/** Both sports open in the waiting room, so the code is shared before play. */
export function buildCreateBody(d: HostDraft, host: SlotDraft): CreateQuickMatchBody {
  const [name1, name2] = teamNames(d, host);
  if (d.sport === 'cricket') {
    return {
      ...buildCricketCreateBody({
        side1Name: name1,
        side2Name: name2,
        maxOvers: d.maxOvers,
        squadSize: d.squadSize,
        hostPlayerId: host.playerId,
        hostName: host.displayName,
        hostPlays: d.hostPlays,
      }),
      waitForPlayers: true,
    };
  }
  const out = (slots: SlotDraft[]) => slots.map((s) => ({ playerId: s.playerId, displayName: s.displayName.trim() }));
  const [s1, s2] = activeSlots(d, host);
  return {
    sport: d.sport,
    sides: [{ name: name1, slots: out(s1) }, { name: name2, slots: out(s2) }],
    matchConfig: { bestOf: d.bestOf, pointsToWin: d.pointsToWin },
    waitForPlayers: true,
  };
}
