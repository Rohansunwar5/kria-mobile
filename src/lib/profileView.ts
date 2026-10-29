import type { RecentMatch, SportSummary } from '@/api/career';
import type { EntryResult } from '@/api/profileApi';
import type { RankedPlayer } from '@/api/rankings';
import { colors } from '@/constants/theme';
import { heroFor, RANK_MIN, sportName } from '@/lib/homeView';
import { RANKED_SPORTS } from '@/lib/sports';
import type { TournamentHistoryEntry } from '@/store/slices/registrationSlice';

export const ALL = 'all';

/** Every sport's figures summed: "All sports" is a real total, not an average of rates. */
export function allSports(sports: SportSummary[]): SportSummary {
  const sum = (k: keyof SportSummary) => sports.reduce((n, s) => n + (s[k] as number), 0);
  const decided = sum('decided');
  return { sport: ALL, played: sum('played'), decided, won: sum('won'), lost: sum('lost'), tied: sum('tied'), noResult: sum('noResult'), winRate: decided ? sum('won') / decided : 0 };
}

/**
 * DESIGN §5.8 ring: the win rate, or the distance to a ranking ("4/10") while
 * a rankable sport has under 10 decided matches.
 */
export function ringFor(s: SportSummary) {
  const towardsRank = s.sport !== ALL && RANKED_SPORTS.includes(s.sport) && s.decided < RANK_MIN;
  if (towardsRank) return { fraction: s.decided / RANK_MIN, label: `${s.decided}/${RANK_MIN}`, muted: true };
  if (!s.decided) return { fraction: 0, label: '—', muted: true };
  return { fraction: s.winRate, label: `${Math.round(s.winRate * 100)}%`, muted: false };
}

/** The W/L/T/NR split, in the order and colours of DESIGN §4.1. */
export function resultsBar(s: SportSummary) {
  const total = s.won + s.lost + s.tied + s.noResult;
  return [
    { label: 'Won', value: s.won, color: colors.accent },
    { label: 'Lost', value: s.lost, color: colors.loss },
    { label: 'Tied', value: s.tied, color: colors.tie },
    { label: 'No result', value: s.noResult, color: colors.noResult },
  ].map((b) => ({ ...b, share: total ? b.value / total : 0 }));
}

/** Last 10 for a sport (or all), newest first, from the career feed. */
export function formFor(recent: RecentMatch[], sport: string) {
  const rows = (sport === ALL ? recent : recent.filter((r) => r.sport === sport)).slice(0, 10);
  const won = rows.filter((r) => r.result === 'won').length;
  return { rows, note: rows.length ? `${won} of last ${rows.length} won` : '' };
}

/**
 * The ranking card under the form (mock 1h): title, one line, and the track while unranked.
 * `who` is "they" on another player's profile; only the not-ranked-yet line names its subject.
 */
export function rankNote(s: SportSummary, board: RankedPlayer[] | null | undefined, meId: string, who: 'you' | 'they' = 'you') {
  const name = sportName(s.sport).toLowerCase();
  if (!RANKED_SPORTS.includes(s.sport)) return { title: 'Not ranked', line: `Kria doesn't rank ${name} yet.`, progress: null };
  if (s.decided < RANK_MIN) {
    const left = RANK_MIN - s.decided;
    return { title: 'Not ranked yet', line: `${s.decided} of ${RANK_MIN} decided matches. ${left} more and ${who} appear on the ${name} board.`, progress: s.decided / RANK_MIN };
  }
  if (board === undefined) return { title: 'Ranking', line: 'Loading the board…', progress: null };
  const h = heroFor(s, board, meId);
  return { title: h.ranked ? `${h.big} in ${name} on Kria` : h.rankLabel === 'Outside top 50' ? `Outside the top 50 in ${name}` : 'Ranking', line: `${h.gapA}${h.gapB}`.trim(), progress: null };
}

/** The best (lowest) rank you hold across sports, for the chip under your name. */
export function bestRank(sports: SportSummary[], boards: Record<string, RankedPlayer[] | null>, meId: string) {
  let best: { rank: number; sport: string } | null = null;
  for (const s of sports) {
    const i = boards[s.sport]?.findIndex((p) => p.playerId === meId) ?? -1;
    if (i >= 0 && (!best || i + 1 < best.rank)) best = { rank: i + 1, sport: s.sport };
  }
  return best;
}

/** What a tournament row reads: your own history entry, or another player's public one. */
export interface RowEntry {
  _id: string;
  status: string;
  tournament?: { _id: string; name: string; sport?: string; status?: string };
  category?: { name: string } | null;
  team?: { name: string; logo?: string } | null;
  auctionData?: { soldPrice?: number };
  result?: EntryResult;
}

const SUFFIX = ['th', 'st', 'nd', 'rd'];
/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st, 22nd. */
const ordinal = (n: number) => `${n}${SUFFIX[((n % 100) - 20) % 10] || SUFFIX[n % 100] || SUFFIX[0]}`;

/**
 * Spec §8's wording for how far an entry got. A flat league's top two are the
 * places it awards titles to, so they read like the shields they hold; topping
 * a group in a staged event is not winning it.
 */
function resultLine(r: EntryResult): { text: string; color: string } | null {
  if (r.kind === 'winner') return { text: 'Winner', color: colors.gold };
  if (r.kind === 'runner_up') return { text: 'Runner-up', color: colors.silver };
  // "Quarter-Final" -> "Quarter-final"; "Round of 16" keeps its number.
  if (r.kind === 'knockout' && r.round) return { text: r.round.charAt(0) + r.round.slice(1).toLowerCase(), color: colors.text2 };
  if (r.kind === 'group' && r.position) {
    if (r.groupName) return { text: `${ordinal(r.position)} in group`, color: colors.text2 };
    if (r.position === 1) return { text: 'Winner', color: colors.gold };
    if (r.position === 2) return { text: 'Runner-up', color: colors.silver };
    return { text: r.outOf ? `${ordinal(r.position)} of ${r.outOf}` : ordinal(r.position), color: colors.text2 };
  }
  return null;
}

/**
 * Tournament rows (mock 1h). An entry's own recorded result comes first; one
 * with none yet says where the entry stands.
 */
export function tournamentRow(e: RowEntry) {
  const t = e.tournament;
  const result = (e.result && resultLine(e.result))
    || (t?.status === 'ongoing' ? { text: 'In progress', color: colors.text2 }
      : t?.status === 'completed' ? { text: 'Completed', color: colors.text3 }
        : t?.status === 'cancelled' ? { text: 'Cancelled', color: colors.text4 }
          : e.status === 'pending' ? { text: 'Awaiting approval', color: colors.text3 }
            : e.auctionData?.soldPrice ? { text: `Sold ₹${e.auctionData.soldPrice.toLocaleString('en-IN')}`, color: colors.text2 }
              : { text: 'Entered', color: colors.text2 });
  const sub = [e.category?.name, e.team ? `for ${e.team.name}` : 'individual entry'].filter(Boolean).join(' · ');
  return { key: e._id, tournamentId: t?._id, name: t?.name ?? 'Tournament', sub, sport: t?.sport, crest: e.team?.logo, team: e.team?.name, result };
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Tournaments (all) strip: entries, matches played and won, missing stats as 0. */
export function historyStrip(list: TournamentHistoryEntry[]) {
  const sum = (k: 'matchesPlayed' | 'matchesWon') => list.reduce((n, e) => n + (e.stats?.[k] ?? 0), 0);
  return { entered: list.length, matches: sum('matchesPlayed'), won: sum('matchesWon') };
}

const distinct = (xs: (string | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])];

export const historySports = (list: TournamentHistoryEntry[]) => distinct(list.map((e) => e.tournament?.sport));
export const matchSports = (list: RecentMatch[]) => distinct(list.map((m) => m.sport));

/** Newest first by tournament start (else entry creation), grouped by year. */
export function groupByYear<T extends { createdAt: string; tournament?: { startDate?: string } }>(list: T[]) {
  const at = (e: T) => new Date(e.tournament?.startDate || e.createdAt);
  const out: { year: string; items: T[] }[] = [];
  for (const e of [...list].sort((a, b) => at(b).getTime() - at(a).getTime())) {
    const year = String(at(e).getFullYear());
    const g = out.find((x) => x.year === year);
    if (g) g.items.push(e); else out.push({ year, items: [e] });
  }
  return out;
}

/** "N played · M won", or "Not played yet". */
export function recordLine(e: { stats?: { matchesPlayed?: number; matchesWon?: number } }) {
  const p = e.stats?.matchesPlayed ?? 0;
  return p > 0 ? `${p} played · ${e.stats?.matchesWon ?? 0} won` : 'Not played yet';
}

/** "October 2026" groups, newest first by playedAt. */
export function groupByMonth(list: RecentMatch[]) {
  const out: { month: string; items: RecentMatch[] }[] = [];
  for (const m of [...list].sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())) {
    const d = new Date(m.playedAt);
    const month = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    const g = out.find((x) => x.month === month);
    if (g) g.items.push(m); else out.push({ month, items: [m] });
  }
  return out;
}
