import type { Achievement, RecentMatch, SportSummary } from '@/api/career';
import type { RankedPlayer } from '@/api/rankings';
import type { InProgress } from '@/lib/homePortal';
import { knockoutCard, matchCard, type MatchCardView } from '@/lib/matchCard';
import { RANKED_SPORTS, SPORT_LABELS } from '@/lib/sports';
import type { Tournament } from '@/store/slices/tournamentSlice';

/** Decided matches before a player is ranked; the server's RANKING_MIN_DECIDED. */
export const RANK_MIN = 5;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const sportName = (sport: string) => SPORT_LABELS[sport] ?? sport;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const pct = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

/** "Thursday, 15 Oct" */
export const todayLabel = (now: Date) => `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;

/** "20 OCT" — the date pill on event images, the one uppercase use. */
export const datePill = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()].toUpperCase()}`;
};

/** "Sun" within the last week, else "28 Sep". */
export function whenShort(iso: string, now: Date) {
  const d = new Date(iso);
  return now.getTime() - d.getTime() < 6 * 86_400_000 ? DAYS[d.getDay()].slice(0, 3) : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function greeting(now: Date, firstName: string, isNew: boolean) {
  if (isNew) return `Welcome, ${firstName}`;
  const h = now.getHours();
  return `${h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'}, ${firstName}`;
}

/** Sports actually played, most recently played first (the hero opens on the first). */
export function sportsByRecency(sports: SportSummary[], recent: RecentMatch[]) {
  const last = (sport: string) => recent.find((r) => r.sport === sport)?.playedAt ?? '';
  return sports.filter((s) => s.played > 0).sort((a, b) => last(b.sport).localeCompare(last(a.sport)) || b.played - a.played);
}

export interface Hero {
  big: string;
  rate: string;
  sub: string;
  /** The orange lead-in of the line under the hero, then the rest. */
  gapA: string;
  gapB: string;
  /** What the sport sheet shows on the right. */
  rankLabel: string;
  ranked: boolean;
}

/** `board` is the server's top-50 for this sport, or null when it couldn't be loaded. */
export function heroFor(s: SportSummary, board: RankedPlayer[] | null, meId: string): Hero {
  const base = { rate: s.decided ? pct(s.winRate) : '—', sub: `${s.won} won · ${s.decided} decided` };
  if (!RANKED_SPORTS.includes(s.sport)) {
    return { ...base, big: '—', gapA: '', gapB: `Kria doesn't rank ${sportName(s.sport).toLowerCase()} yet`, rankLabel: '—', ranked: false };
  }
  if (s.decided < RANK_MIN) {
    const left = RANK_MIN - s.decided;
    return { ...base, big: `${s.decided}/${RANK_MIN}`, gapA: `${left} more`, gapB: ` decided ${left === 1 ? 'match' : 'matches'} to get ranked`, rankLabel: 'Unranked', ranked: false };
  }
  if (!board) return { ...base, big: '—', gapA: '', gapB: 'Rankings unavailable right now', rankLabel: '—', ranked: false };

  const i = board.findIndex((p) => p.playerId === meId);
  if (i < 0) {
    // Under 50 rows and still missing means the board hasn't refreshed yet (~5 min).
    const full = board.length >= 50;
    return { ...base, big: '—', gapA: '', gapB: full ? 'Outside the top 50' : 'Rankings refresh every few minutes', rankLabel: full ? 'Outside top 50' : '—', ranked: false };
  }

  const me = board[i];
  const other = i > 0 ? board[i - 1] : board[1];
  const ranked = { ...base, big: `#${i + 1}`, rankLabel: `#${i + 1}`, ranked: true };
  if (!other) return { ...ranked, gapA: 'Top', gapB: ` of the ${sportName(s.sport).toLowerCase()} board` };
  const name = `#${i > 0 ? i : 2} ${other.firstName} ${other.lastName}`.trim();
  const gap = Math.abs(other.winRate - me.winRate) * 100;
  if (gap < 0.05) return { ...ranked, gapA: 'Level', gapB: ` with ${name} on win rate` };
  return { ...ranked, gapA: `${gap.toFixed(1)} pts`, gapB: i > 0 ? ` behind ${name}` : ` ahead of ${name}` };
}

/** The first of `inProgress()` as a card. */
export function upNext(item: InProgress, meId: string): MatchCardView {
  return item.kind === 'knockout' ? knockoutCard(item.knockout) : matchCard(item.match, meId);
}

export interface Milestone {
  label: string;
  glyph: string;
  sub: string;
  fraction: number;
  percent: string;
  hint: string;
}

/** The locked milestone closest to done; null once every one is earned. */
export function nextMilestone(achievements: Achievement[]): Milestone | null {
  const open = achievements.filter((a) => !a.earned && a.target > 0);
  if (!open.length) return null;
  const a = open.reduce((best, x) => (x.progress / x.target > best.progress / best.target ? x : best));
  const kind = a.id.split('-')[0];
  const left = a.target - a.progress;
  const hint =
    kind === 'matches' ? `${left} more, any sport, quick or tournament`
    : kind === 'wins' ? `${plural(left, 'more win', 'more wins')}, any sport`
    : kind === 'sports' ? `${plural(left, 'more sport')} to play`
    : `${left} to go`;
  const fraction = a.progress / a.target;
  // Floored, so an unearned milestone never reads 100%.
  return { label: a.label, glyph: String(a.target), sub: kind.toUpperCase(), fraction, percent: `${Math.floor(fraction * 100)}%`, hint };
}

export interface ChecklistItem {
  key: 'name' | 'sport' | 'dob' | 'gender' | 'photo';
  label: string;
  why: string;
  done: boolean;
}

/** DOB and gender gate tournament entry: registration copies both from the profile. */
export function checklist(user: { sport?: string; dateOfBirth?: string; gender?: string; profileImage?: string }) {
  const items: ChecklistItem[] = [
    { key: 'name', label: 'Name and email', why: 'Verified at sign-up', done: true },
    { key: 'sport', label: 'Primary sport', why: user.sport ? sportName(user.sport) : 'Pick the sport you play most', done: !!user.sport },
    { key: 'dob', label: 'Date of birth', why: 'Needed for age-group categories', done: !!user.dateOfBirth },
    { key: 'gender', label: 'Gender', why: "Needed for men's, women's and mixed categories", done: !!user.gender },
    { key: 'photo', label: 'Profile photo', why: 'Optional · organisers and teammates see it', done: !!user.profileImage },
  ].map((i) => (i.done && ['dob', 'gender', 'photo'].includes(i.key) ? { ...i, why: 'Added' } : i)) as ChecklistItem[];
  return { items, done: items.filter((i) => i.done).length, ready: !!user.dateOfBirth && !!user.gender };
}

/** Upcoming and running events, running first, then soonest. */
export function railTournaments(list: Tournament[]) {
  return list
    .filter((t) => !['completed', 'cancelled', 'draft'].includes(t.status))
    .sort((a, b) => Number(b.status === 'ongoing') - Number(a.status === 'ongoing') || a.startDate.localeCompare(b.startDate));
}

export function resultLetter(r: RecentMatch['result']) {
  return r === 'won' ? 'W' : r === 'lost' ? 'L' : r === 'tied' ? 'T' : 'NR';
}
