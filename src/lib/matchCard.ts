import type { QuickKnockout } from '@/api/quickKnockout';
import type { QuickMatch } from '@/api/quickMatch';
import { currentGame, freeSlots, isHost, outcomeLabel } from '@/lib/quickMatchView';

/** One card for a quick match or knockout: Home "Up next" and Compete › Matches (DESIGN §5.5, mock 1c). */
export interface MatchCardView {
  id: string;
  href: string;
  status: QuickMatch['status'];
  sport: string;
  format: string;
  title: string;
  line: string;
  /** Top-right: join code while waiting, Live pill, else the date. */
  right: { kind: 'code'; code: string } | { kind: 'live' } | { kind: 'text'; text: string } | null;
  foot: string | null;
  footSub: string | null;
  avatars: string[];
  extra: number;
  result: 'W' | 'L' | 'T' | 'NR' | null;
  dim: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Sun 13 Oct" */
export const dayDate = (iso: string) => {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/** The server's join-code alphabet: no 0, O, 1 or I (codes get read aloud). */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LENGTH = 6;
export const normaliseCode = (input: string) =>
  input.toUpperCase().split('').filter((ch) => CODE_ALPHABET.includes(ch)).join('').slice(0, CODE_LENGTH);

function score(m: QuickMatch): string | null {
  if (m.sport === 'cricket') {
    if (m.status === 'completed') {
      const inns = [...(m.inningsScores ?? [])].sort((a, b) => a.inningsNumber - b.inningsNumber);
      return inns.length ? inns.map((i) => `${i.runs}/${i.wickets}`).join(' vs ') : null;
    }
    const ls = m.liveState;
    return ls ? `${ls.runs}/${ls.wickets} (${ls.completedOvers}.${ls.ballsInCurrentOver})` : null;
  }
  if (m.status === 'completed') {
    const games = m.gameScores ?? [];
    return games.length ? games.map((g) => `${g.side1Score}-${g.side2Score}`).join(', ') : null;
  }
  const g = currentGame(m);
  return g ? `Game ${g.gameNumber} · ${g.side1Score}–${g.side2Score}` : null;
}

function resultFor(m: QuickMatch, mySide: number): MatchCardView['result'] {
  if (m.status !== 'completed' || mySide < 0 || !m.outcome) return null;
  if (m.outcome === 'tied') return 'T';
  if (m.outcome === 'no_result') return 'NR';
  return (m.outcome === 'side1') === (mySide === 0) ? 'W' : 'L';
}

export function matchCard(m: QuickMatch, meId: string): MatchCardView {
  const slots = m.sides.flatMap((s) => s.slots);
  const perSide = m.sides[0]?.slots.length ?? 1;
  const cfg = m.matchConfig ?? {};
  const mySide = m.sides.findIndex((s) => s.slots.some((x) => x.playerId === meId));
  const host = slots.find((s) => s.playerId === m.hostId)?.displayName;
  const rules = m.sport === 'cricket'
    ? plural(cfg.maxOvers ?? 0, 'over')
    : `${(cfg.bestOf ?? 3) === 1 ? 'One game' : `Best of ${cfg.bestOf ?? 3}`} to ${cfg.pointsToWin ?? 21}`;
  const who = isHost(m, meId) ? "You're hosting" : host ? `Hosted by ${host}` : '';
  const claimed = slots.filter((s) => s.playerId);
  const waiting = m.status === 'waiting';
  // DESIGN §5.5: up to 3 avatars; "+N" only once 4 or more have joined.
  const shown = claimed.length >= 4 ? 2 : 3;
  const open = freeSlots(m).length;

  return {
    id: m._id,
    href: `/quick/${m._id}`,
    status: m.status,
    sport: m.sport,
    format: m.sport === 'cricket' ? `${cfg.playersPerTeam ?? perSide} a side` : perSide > 1 ? 'Doubles' : 'Singles',
    title: `${m.sides[0]?.name ?? 'Side 1'} vs ${m.sides[1]?.name ?? 'Side 2'}`,
    line: [rules, who].filter(Boolean).join(' · '),
    right: waiting ? { kind: 'code', code: m.joinCode } : m.status === 'live' ? { kind: 'live' } : { kind: 'text', text: dayDate(m.createdAt) },
    // Only the host can cancel (quickMatchService.cancel loads as host).
    foot: m.status === 'cancelled' ? 'Cancelled by host' : waiting ? (open ? `${plural(open, 'slot')} left` : null) : score(m),
    footSub: m.status === 'live' && mySide >= 0 ? `You play for ${m.sides[mySide].name}` : outcomeLabel(m),
    avatars: waiting ? claimed.slice(0, shown).map((s) => initials(s.displayName)) : [],
    extra: waiting && claimed.length >= 4 ? claimed.length - shown : 0,
    result: resultFor(m, mySide),
    dim: m.status === 'cancelled',
  };
}

export function knockoutCard(k: QuickKnockout): MatchCardView {
  return {
    id: k._id,
    href: `/knockout/${k._id}`,
    status: k.status,
    sport: k.sport,
    format: 'Knockout',
    title: k.name,
    line: plural(k.entrants.length, 'entrant'),
    right: k.status === 'waiting' ? (k.joinCode ? { kind: 'code', code: k.joinCode } : null) : k.status === 'live' ? { kind: 'live' } : { kind: 'text', text: dayDate(k.createdAt) },
    foot: k.status === 'cancelled' ? 'Cancelled by host' : null,
    footSub: null,
    avatars: [],
    extra: 0,
    result: null,
    dim: k.status === 'cancelled',
  };
}

const ORDER: Record<QuickMatch['status'], number> = { live: 0, waiting: 1, completed: 2, cancelled: 3 };

/** Live first, then waiting, then the rest; newest first within each. */
export function sortCards(cards: (MatchCardView & { createdAt: string })[]) {
  return [...cards].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.createdAt.localeCompare(a.createdAt));
}
