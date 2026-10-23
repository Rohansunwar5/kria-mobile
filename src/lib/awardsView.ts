import type { Achievement } from '@/api/career';
import type { QuickKnockout } from '@/api/quickKnockout';
import type { BadgeShape } from '@/components/AwardBadge';
import type { IconName } from '@/components/ui/iconPaths';
import type { Metal } from '@/constants/theme';
import { sportIcon } from '@/components/ui/Icon';
import { sportName } from '@/lib/homeView';
import type { Honor } from '@/lib/badges';
import { initials } from '@/lib/matchCard';

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
}

export interface MilestoneTotals { played: number; won: number; sports: number }

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** "Winner of Men's Doubles at HSR Shuttle Cup" — the only shape the server writes. */
export function titleAward(title: string, i: number): Award {
  const m = /^Winner of (.+?) at (.+)$/.exec(title);
  return {
    key: `title-${i}`, family: 'title', shape: 'shield', metal: 'gold', icon: 'emoji_events',
    name: m ? `Champion · ${m[1]}` : title, context: m ? m[2] : '', tier: 'Tournament title',
    description: m ? `Won at ${m[2]}.` : title,
    criteria: 'Win a tournament category',
    status: m ? { label: 'Won at', value: m[2] } : undefined,
    earned: true,
  };
}

export function honourAward(h: Honor, i: number, knockouts: QuickKnockout[]): Award {
  const def = HONOUR_BADGES[h.badge];
  const k = h.ref ? knockouts.find((x) => x._id === h.ref) : undefined;
  return {
    key: `honour-${i}`, family: 'honour', shape: 'rosette', metal: 'gold', icon: def?.icon, glyph: def ? def.glyph : initials(h.title) || 'H',
    name: h.title || def?.name || 'Honour',
    context: h.ref ? (k ? k.name : 'Quick knockout') : 'Given by an organiser',
    tier: h.ref ? 'Knockout honour' : 'Organiser honour',
    description: h.ref ? 'Given by the host when the knockout finished.' : 'Given by a tournament organiser.',
    criteria: h.ref ? 'Chosen by the knockout host' : 'Chosen by the organiser',
    status: k ? { label: 'Earned at', value: k.name } : undefined,
    earned: true,
  };
}

/**
 * Knockout wins, one hexagon per sport with ×N (DESIGN §5.11). The honour has
 * no sport; it comes from the knockout itself, when /mine still lists it
 * (newest 20). Older wins group under "Quick knockouts".
 */
export function knockoutAwards(wins: { title: string; ref?: string }[], knockouts: QuickKnockout[]): Award[] {
  const groups = new Map<string, string[]>();
  for (const w of wins) {
    const k = w.ref ? knockouts.find((x) => x._id === w.ref) : undefined;
    const sport = k?.sport ?? '';
    groups.set(sport, [...(groups.get(sport) ?? []), k?.name ?? w.title.replace(/^Won /, '')]);
  }
  return [...groups.entries()].map(([sport, names]) => ({
    key: `ko-${sport || 'any'}`, family: 'knockout', shape: 'hex', metal: 'bronze',
    icon: sport ? sportIcon(sport) : 'emoji_events', count: names.length,
    name: 'Knockout winner', context: sport ? `${sportName(sport)} · ${plural(names.length, 'win')}` : plural(names.length, 'win'),
    tier: names.length > 1 ? `Quick knockout · ×${names.length}` : 'Quick knockout', description: 'Last one standing in a player-run knockout.',
    criteria: 'Win the final of a quick knockout',
    status: { label: 'Earned at', value: names.join(', ') },
    earned: true,
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
      };
    })
    .sort((x, y) => Number(y.earned) - Number(x.earned) || (y.progress ?? 1) - (x.progress ?? 1));
}

/** The cabinet before anything is earned: every honour's shape, locked. */
export function lockedHonours(): Award[] {
  return [
    ...Object.entries(HONOUR_BADGES).map(([badge, def]): Award => ({
      key: `locked-${badge}`, family: 'honour', shape: 'rosette', metal: 'locked', icon: def.icon, glyph: def.glyph,
      name: def.name, context: 'Organiser', tier: 'Organiser honour', description: 'Organisers give these at tournaments.',
      criteria: 'Chosen by the organiser', earned: false,
    })),
    {
      key: 'locked-ko', family: 'knockout', shape: 'hex', metal: 'locked', icon: 'emoji_events',
      name: 'Knockout winner', context: 'Quick knockout', tier: 'Quick knockout', description: 'Last one standing in a player-run knockout.',
      criteria: 'Win the final of a quick knockout', earned: false,
    },
  ];
}

/**
 * Everything on the Awards tab. Honours carry no date (SERVER-GAPS.md #8), so
 * "most recent" is the order the server appended them in.
 */
export function buildAwards(input: {
  titles: string[];
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
  const featured = titles.length ? pick(titles[titles.length - 1], 'Latest title')
    : honours.length ? pick(honours[honours.length - 1], 'Latest honour')
      : knockouts.length ? pick(knockouts[knockouts.length - 1], 'Knockout winner')
        : closest ? pick(closest, earned ? 'Next milestone' : 'Closest first award') : null;
  return { titles, honours, knockouts, milestones, earned, featured };
}
