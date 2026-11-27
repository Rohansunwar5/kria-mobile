import type { Achievement, SportSummary } from '@/api/career';
import type { Title } from '@/api/profileApi';
import type { QuickKnockout } from '@/api/quickKnockout';
import type { BadgeShape } from '@/components/AwardBadge';
import type { IconName } from '@/components/ui/iconPaths';
import type { Metal } from '@/constants/theme';
import { sportIcon } from '@/components/ui/Icon';
import { MONTHS, sportName } from '@/lib/homeView';
import type { Honor } from '@/lib/badges';
import { initials } from '@/lib/matchCard';
import { awardSeenKey, type RewardState } from '@/lib/rewardSeen';

/**
 * Names and monograms for the server's BADGE_KEYS (server/src/models/player.model.ts).
 * Names match the organiser portal's catalogue; the monogram is DESIGN §5.11's
 * "2-letter monogram" for an honour.
 */
export const HONOUR_BADGES: Record<string, { name: string; icon?: IconName; glyph?: string }> = {
  'player-of-the-match': { name: 'Player of the Match', icon: 'star' },
  'season-mvp': { name: 'Season MVP', icon: 'workspace_premium' },
  'hat-trick': { name: 'Hat-Trick', icon: 'counter_3' },
  'undefeated-run': { name: 'Undefeated Run', icon: 'local_fire_department' },
  'auction-steal': { name: 'Auction Steal', icon: 'gavel' },
  centurion: { name: 'Centurion', glyph: '100' },
  'clean-sweep': { name: 'Clean Sweep', icon: 'cleaning_services' },
  'rally-king': { name: 'Rally King', icon: 'crown' },
  'ace-serve': { name: 'Ace Serve', icon: 'bolt' },
  'fair-play': { name: 'Fair Play', icon: 'handshake' },
  'iron-player': { name: 'Iron Player', icon: 'fitness_center' },
  'first-cap': { name: 'First Cap', icon: 'counter_1' },
};
export const KNOCKOUT_BADGE = 'knockout-winner';

export interface Award {
  key: string;
  family: 'title' | 'honour' | 'knockout' | 'milestone';
  shape: BadgeShape;
  metal: Metal;
  glyph?: string;
  icon?: IconName;
  sub?: string;
  count?: number;
  progress?: number;
  name: string;
  /** Under the badge in a grid. */
  context: string;
  tier: string;
  description: string;
  criteria: string;
  status?: { label: string; value: string };
  earned: boolean;
  /** A title that can link to the tournament it was won at. Legacy titles have none. */
  tournamentId?: string;
  /** Stable "already seen" keys (reward spec C1); [] for locked and legacy items. */
  seenKeys: string[];
  /** Titles and honours: when it was given, for the reveal's order. */
  awardedAt?: string;
  /** The full-screen reveal's copy (reward spec C4), earned items only. */
  reveal?: { label: string; title: string; line: string; prevTarget?: number; nextTarget?: number };
}

export interface MilestoneTotals { played: number; won: number; sports: number }

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const keys = (k: string | null) => (k ? [k] : []);
const day = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const month = (iso: string) => {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st. */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** Career totals across sports, for the milestone cells' real counts. */
export function totalsFrom(sports: SportSummary[]): MilestoneTotals {
  return {
    played: sports.reduce((n, s) => n + s.played, 0),
    won: sports.reduce((n, s) => n + s.won, 0),
    sports: sports.filter((s) => s.played > 0).length,
  };
}

/** A winner's gold shield or a runner-up's silver one — the same shape, a different metal (spec §8). */
export function titleAward(title: Title, i: number): Award {
  const won = title.place === 'winner';
  const where = title.tournamentName ?? '';
  const label = won ? 'Champion' : 'Runner-up';
  return {
    key: `title-${i}`, family: 'title', shape: 'shield', metal: won ? 'gold' : 'silver', icon: 'emoji_events',
    name: title.categoryName ? `${label} · ${title.categoryName}` : label, context: where, tier: 'Tournament title',
    description: won ? `Won at ${where}.` : `Lost the final at ${where}.`,
    criteria: won ? 'Win a tournament category' : 'Reach a tournament category final',
    status: where ? { label: won ? 'Won at' : 'Runner-up at', value: where } : undefined,
    earned: true,
    tournamentId: title.tournamentId,
    seenKeys: keys(awardSeenKey({ kind: 'title', title })),
    awardedAt: title.awardedAt,
    reveal: {
      label: won ? 'Title · Winner' : 'Title · Runner-up',
      title: where,
      line: [title.categoryName ? `${title.categoryName}.` : '', title.awardedAt ? `Awarded ${day(title.awardedAt)}.` : ''].filter(Boolean).join(' '),
    },
  };
}

/**
 * The headline title: a win over a runner-up, then the newest awardedAt. An
 * undated (legacy) title sorts last, and a tie goes to the later-appended one —
 * the server appends, so that is the newer.
 */
function featuredTitle(titles: Title[]): number {
  const when = (t: Title) => (t.awardedAt ? Date.parse(t.awardedAt) : -Infinity);
  const beats = (a: Title, b: Title) =>
    (a.place === 'winner') !== (b.place === 'winner') ? a.place === 'winner' : when(a) >= when(b);
  return titles.reduce((best, t, i) => (best < 0 || beats(t, titles[best]) ? i : best), -1);
}

/**
 * An honour carries where it was earned (SERVER-GAPS #8). One given before
 * that, and not yet backfilled, falls back to the knockout in /mine.
 */
/** Index of the newest honour by awardedAt; undated sorts first, a tie goes to the later one. */
function latestHonour(honors: Honor[]): number {
  const when = (h: Honor) => (h.awardedAt ? Date.parse(h.awardedAt) : -Infinity);
  return honors.reduce((best, h, i) => (when(h) >= when(honors[best]) ? i : best), 0);
}

export function honourAward(h: Honor, i: number, knockouts: QuickKnockout[]): Award {
  const def = HONOUR_BADGES[h.badge];
  const where = h.eventName ?? (h.ref ? knockouts.find((x) => x._id === h.ref)?.name : undefined);
  return {
    key: `honour-${i}`, family: 'honour', shape: 'rosette', metal: 'gold', icon: def?.icon, glyph: def ? def.glyph : initials(h.title) || 'H',
    name: h.title || def?.name || 'Honour',
    context: where ?? (h.ref ? 'Quick knockout' : 'Given by an organiser'),
    tier: h.ref ? 'Knockout honour' : 'Organiser honour',
    description: h.ref ? 'Given by the host when the knockout finished.' : 'Given by a tournament organiser.',
    criteria: h.ref ? 'Chosen by the knockout host' : 'Chosen by the organiser',
    status: where ? { label: 'Earned at', value: where } : undefined,
    tournamentId: h.tournamentId,
    earned: true,
    seenKeys: keys(awardSeenKey({ kind: 'honour', honor: h })),
    awardedAt: h.awardedAt,
    reveal: {
      label: 'Honour',
      title: h.title || def?.name || 'Honour',
      line: [where, h.awardedAt ? month(h.awardedAt) : ''].filter(Boolean).join(' · '),
    },
  };
}

/**
 * Knockout wins, one hexagon per sport with ×N (DESIGN §5.11). The win carries
 * its knockout's name and sport; an old one not yet backfilled falls back to
 * /mine (newest 20), and past that groups under "Quick knockouts".
 */
export function knockoutAwards(wins: (Pick<Honor, 'title' | 'ref' | 'eventName' | 'sport'> & { badge?: string })[], knockouts: QuickKnockout[]): Award[] {
  const groups = new Map<string, string[]>();
  const refs = new Map<string, string[]>();
  for (const w of wins) {
    const k = w.ref ? knockouts.find((x) => x._id === w.ref) : undefined;
    const sport = w.sport ?? k?.sport ?? '';
    groups.set(sport, [...(groups.get(sport) ?? []), w.eventName ?? k?.name ?? w.title.replace(/^Won /, '')]);
    refs.set(sport, [...(refs.get(sport) ?? []), ...keys(awardSeenKey({ kind: 'honour', honor: { ...w, badge: KNOCKOUT_BADGE } }))]);
  }
  return [...groups.entries()].map(([sport, names]): Award => ({
    key: `ko-${sport || 'any'}`, family: 'knockout', shape: 'hex', metal: 'bronze',
    icon: sport ? sportIcon(sport) : 'emoji_events', count: names.length,
    name: 'Knockout winner', context: sport ? `${sportName(sport)} · ${plural(names.length, 'win')}` : plural(names.length, 'win'),
    tier: names.length > 1 ? `Quick knockout · ×${names.length}` : 'Quick knockout', description: 'Last one standing in a player-run knockout.',
    criteria: 'Win the final of a quick knockout',
    status: { label: 'Earned at', value: names.join(', ') },
    earned: true,
    seenKeys: refs.get(sport) ?? [],
    reveal: { label: 'Knockout winner', title: names[names.length - 1], line: `Your ${ordinal(wins.length)} knockout win.` },
  }));
}

/** Career milestones from the server's achievements: earned first, then locked by how close they are. */
export function milestoneAwards(achievements: Achievement[], totals: MilestoneTotals): Award[] {
  // The server clamps an earned milestone's progress to its target, so show the real count.
  const real = (kind: string): string | null =>
    kind === 'matches' ? `${totals.played} played` : kind === 'wins' ? `${totals.won} won` : kind === 'sports' ? `${plural(totals.sports, 'sport')} played` : null;
  return achievements
    .map((a): Award => {
      const kind = a.id.split('-')[0];
      const fraction = a.target ? a.progress / a.target : 0;
      return {
        key: a.id, family: 'milestone', shape: 'coin', metal: a.earned ? 'silver' : 'locked',
        glyph: String(a.target), sub: kind.toUpperCase(), progress: a.earned ? undefined : fraction,
        name: a.label, context: a.earned ? 'Earned' : `${a.progress} / ${a.target}`,
        tier: a.earned ? 'Career milestone' : 'Next milestone',
        description: a.earned ? 'Counted from every match you play.' : `${a.target - a.progress} to go. Quick matches count the same as tournament ones.`,
        criteria: a.label,
        status: { label: 'Progress', value: (a.earned && real(kind)) || `${a.progress} of ${a.target}` },
        earned: a.earned,
        seenKeys: a.earned ? keys(awardSeenKey({ kind: 'achievement', id: a.id })) : [],
        reveal: a.earned ? milestoneReveal(a, achievements) : undefined,
      };
    })
    .sort((x, y) => Number(y.earned) - Number(x.earned) || (y.progress ?? 1) - (x.progress ?? 1));
}

/** "50 matches played" / "25 wins" / "2 sports played", with the neighbouring targets of its kind. */
function milestoneReveal(a: Achievement, all: Achievement[]): NonNullable<Award['reveal']> {
  const kind = a.id.split('-')[0];
  const same = all.filter((x) => x.id.split('-')[0] === kind).map((x) => x.target);
  const below = same.filter((t) => t < a.target);
  const above = same.filter((t) => t > a.target);
  const nextTarget = above.length ? Math.min(...above) : undefined;
  return {
    label: 'Milestone',
    title: kind === 'wins' ? `${a.target} wins` : `${a.target} ${kind} played`,
    line: nextTarget ? `Next: ${nextTarget}.` : '',
    prevTarget: below.length ? Math.max(...below) : undefined,
    nextTarget,
  };
}

/**
 * The one award to reveal now (reward spec C3): titles, then honours, then
 * knockout wins, then milestones; within titles and honours the newest first.
 * Only `new` keys count — an announced one already had its batch's reveal.
 * `batch` is every new key, so the rest can be announced when this one mints.
 */
export function nextReveal(
  a: Pick<ReturnType<typeof buildAwards>, 'titles' | 'honours' | 'knockouts' | 'milestones'>,
  states: Map<string, RewardState>,
): { award: Award; key: string; batch: string[] } | null {
  const isNew = (k: string) => (states.get(k) ?? 'new') === 'new';
  const newest = (xs: Award[]) => [...xs].sort((x, y) => (y.awardedAt ? Date.parse(y.awardedAt) : -Infinity) - (x.awardedAt ? Date.parse(x.awardedAt) : -Infinity));
  const order = [...newest(a.titles), ...newest(a.honours), ...a.knockouts, ...a.milestones].filter((x) => x.earned);
  const batch = order.flatMap((x) => x.seenKeys).filter(isNew);
  for (const award of order) {
    const key = award.seenKeys.find(isNew);
    if (key) return { award, key, batch };
  }
  return null;
}

/** The "New" dot: any key of this award not yet opened. */
export function hasDot(award: Award, states: Map<string, RewardState>): boolean {
  // An unloaded key has no dot yet, so the grid never flashes dots before the states arrive.
  return award.seenKeys.some((k) => { const s = states.get(k); return s === 'new' || s === 'announced'; });
}

/** The cabinet before anything is earned: every honour's shape, locked. */
export function lockedHonours(): Award[] {
  return [
    ...Object.entries(HONOUR_BADGES).map(([badge, def]): Award => ({
      key: `locked-${badge}`, family: 'honour', shape: 'rosette', metal: 'locked', icon: def.icon, glyph: def.glyph,
      name: def.name, context: 'Organiser', tier: 'Organiser honour', description: 'Organisers give these at tournaments.',
      criteria: 'Chosen by the organiser', earned: false, seenKeys: [],
    })),
    {
      key: 'locked-ko', family: 'knockout', shape: 'hex', metal: 'locked', icon: 'emoji_events',
      name: 'Knockout winner', context: 'Quick knockout', tier: 'Quick knockout', description: 'Last one standing in a player-run knockout.',
      criteria: 'Win the final of a quick knockout', earned: false, seenKeys: [],
    },
  ];
}

/**
 * Everything on the Awards tab. The latest honour is the newest by `awardedAt`;
 * an undated (pre-#8) one sorts last, and a tie goes to the later-appended one.
 */
export function buildAwards(input: {
  titles: Title[];
  honors: Honor[];
  achievements: Achievement[];
  knockouts: QuickKnockout[];
  totals: MilestoneTotals;
}) {
  const titles = input.titles.map(titleAward);
  const honours = input.honors.filter((h) => h.badge !== KNOCKOUT_BADGE).map((h, i) => honourAward(h, i, input.knockouts));
  const knockouts = knockoutAwards(input.honors.filter((h) => h.badge === KNOCKOUT_BADGE), input.knockouts);
  const milestones = milestoneAwards(input.achievements, input.totals);
  const earned = titles.length + honours.length + knockouts.reduce((n, k) => n + (k.count ?? 1), 0) + milestones.filter((m) => m.earned).length;
  const closest = milestones.find((m) => !m.earned) ?? null;
  const pick = (award: Award, label: 'Latest title' | 'Latest honour' | 'Knockout winner' | 'Next milestone' | 'Closest first award') => ({ award, label });
  const featured = titles.length ? pick(titles[featuredTitle(input.titles)], 'Latest title')
    : honours.length ? pick(honours[latestHonour(input.honors.filter((h) => h.badge !== KNOCKOUT_BADGE))], 'Latest honour')
      : knockouts.length ? pick(knockouts[knockouts.length - 1], 'Knockout winner')
        : closest ? pick(closest, earned ? 'Next milestone' : 'Closest first award') : null;
  return { titles, honours, knockouts, milestones, earned, featured };
}
