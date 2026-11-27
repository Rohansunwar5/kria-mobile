import type { SportSummary } from '@/api/career';
import type { RankedPlayer } from '@/api/rankings';
import { RANK_MIN } from '@/lib/homeView';
import { initials } from '@/lib/matchCard';

/** DESIGN §5.7: six rows per sport, then "See full rankings". */
export const VISIBLE = 6;

export interface RankRow {
  key: string;
  playerId?: string;
  rank: string;
  name: string;
  sub: string;
  rate: string;
  photo?: string;
  initials: string;
  medal: 'gold' | 'silver' | 'bronze' | null;
  mine: boolean;
  /** Unranked: the row's right side is a "Play" action instead of a rate. */
  play: boolean;
}

const MEDALS = ['gold', 'silver', 'bronze'] as const;
const pct = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

/**
 * The visible board, plus your own row appended after a "···" gap when you're
 * not among the visible rows (no pinned bar — DESIGN §5.7). `me` is your career
 * summary for this sport (undefined: never played it); `meName` gives initials.
 */
export function rankingRows(board: RankedPlayer[], meId: string, meName: string, me: SportSummary | undefined, expanded: boolean) {
  const shown = expanded ? board : board.slice(0, VISIBLE);
  const row = (p: RankedPlayer, i: number): RankRow => {
    const mine = p.playerId === meId;
    const name = `${p.firstName} ${p.lastName}`.trim();
    return {
      key: p.playerId, playerId: p.playerId, rank: String(i + 1), name: mine ? 'You' : name,
      sub: `${p.won} won · ${p.decided} decided`, rate: pct(p.winRate), photo: p.profileImage,
      initials: initials(name), medal: MEDALS[i] ?? null, mine, play: false,
    };
  };
  const rows = shown.map(row);

  const at = board.findIndex((p) => p.playerId === meId);
  let own: RankRow | null = null;
  if (at >= shown.length) own = { ...row(board[at], at), medal: null };
  else if (at < 0) {
    const decided = me?.decided ?? 0;
    const base = { key: 'me', rank: '—', name: 'You', initials: initials(meName), medal: null, mine: true };
    own = decided >= RANK_MIN
      ? { ...base, sub: board.length >= 50 ? 'Outside the top 50' : 'Rankings refresh every few minutes', rate: pct(me!.winRate), play: false }
      : { ...base, sub: `${decided} of ${RANK_MIN} decided matches`, rate: '', play: true };
  }
  return { rows, own };
}

/**
 * "Win your next N to pass X (#k)" on your own row (reward spec §9): the
 * fewest straight wins that would put you above the player directly above,
 * in the server's order (win rate desc, then decided desc). Whole numbers
 * only, never rounded rates. Null when you're #1, not on the board, or more
 * than 10 wins away (including never, e.g. above you is 100% and you've lost).
 */
export function nextRankLine(board: RankedPlayer[], meId: string): string | null {
  const i = board.findIndex((p) => p.playerId === meId);
  if (i <= 0) return null;
  const me = board[i];
  const a = board[i - 1];
  for (let x = 1; x <= 10; x++) {
    const mine = (me.won + x) * a.decided;
    const theirs = a.won * (me.decided + x);
    if (mine > theirs || (mine === theirs && me.decided + x > a.decided)) return `Win your next ${x} to pass ${a.firstName} (#${i})`;
  }
  return null;
}
