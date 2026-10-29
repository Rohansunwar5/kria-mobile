import type { TournamentAward, TournamentCategory, TournamentDetail, TournamentStatus, MyEntry } from '@/api/tournaments';
import type { Announcement } from '@/api/profileApi';
import { dayDate } from '@/lib/matchCard';
import { rupees } from '@/lib/format';
import { roundLabel } from '@/lib/knockoutRoom';

export type Tone = 'accent' | 'text' | 'text2' | 'text3' | 'text4';
export type AuctionState = 'not_started' | 'in_progress' | 'paused' | 'sold' | 'completed';
export type Stage = 'registration' | 'closed' | 'auction' | 'ongoing' | 'completed' | 'cancelled';
type Auctions = Record<string, AuctionState | undefined>;

const isLive = (s?: AuctionState) => s === 'in_progress' || s === 'paused' || s === 'sold';

export function liveAuctionCategory(categories: TournamentCategory[], auctions: Auctions) {
  return categories.find((c) => isLive(auctions[c._id]));
}

/** 2b's entryBlocker rule: entries close at the deadline, whatever the organiser's status says. */
export const deadlinePassed = (registrationDeadline: string, now: Date) => now.getTime() > new Date(registrationDeadline).getTime();

export function effectiveStage(i: {
  status: TournamentStatus; categories: TournamentCategory[]; auctions: Auctions; liveMatch: boolean; registrationDeadline: string; now: Date;
}): Stage {
  if (i.status === 'completed') return 'completed';
  if (i.status === 'cancelled') return 'cancelled';
  if (i.status === 'ongoing' || i.liveMatch || i.categories.some((c) => c.status === 'ongoing')) return 'ongoing';
  if (i.status === 'auction_in_progress' || liveAuctionCategory(i.categories, i.auctions)) return 'auction';
  return i.status === 'registration_open' && !deadlinePassed(i.registrationDeadline, i.now) ? 'registration' : 'closed';
}

export function statusLine(
  stage: Stage, t: TournamentDetail, x: { auctionCategory?: string; auctionPaused?: boolean; liveRound?: string },
): { text: string; tone: Tone } {
  switch (stage) {
    case 'registration': return { text: `Registration open · closes ${dayDate(t.registrationDeadline)}`, tone: 'accent' };
    case 'closed': return { text: `Registration closed · starts ${dayDate(t.startDate)}`, tone: 'text3' };
    case 'auction': {
      // Before the first category's auction, or between two: nothing is live.
      if (!x.auctionCategory) return { text: 'Team auction · starts soon', tone: 'text2' };
      const cat = ` · ${x.auctionCategory}`;
      return x.auctionPaused ? { text: `Team auction paused${cat}`, tone: 'text' } : { text: `Team auction live${cat}`, tone: 'accent' };
    }
    case 'ongoing': return { text: x.liveRound ? `In progress · ${roundLabel(x.liveRound)} live` : 'In progress', tone: 'text' };
    case 'completed': return { text: `Completed · ${dayDate(t.endDate)}`, tone: 'text3' };
    case 'cancelled': return { text: 'Cancelled', tone: 'text4' };
  }
}

export function categoryStatus(c: TournamentCategory, auction?: AuctionState, liveRound?: string, pastDeadline = false): { text: string; tone: Tone } {
  switch (c.status) {
    case 'setup': return { text: 'Opens soon', tone: 'text3' };
    case 'registration': return pastDeadline ? { text: 'Registration closed', tone: 'text3' } : { text: 'Registration open', tone: 'accent' };
    case 'auction':
      if (auction === 'in_progress' || auction === 'sold') return { text: 'Auction live', tone: 'accent' };
      if (auction === 'paused') return { text: 'Auction paused', tone: 'text2' };
      if (auction === 'completed') return { text: 'Auction ended', tone: 'text2' };
      return { text: 'Auction starts soon', tone: 'text2' };
    case 'groups_configured':
    case 'bracket_configured': return { text: 'Draw is out', tone: 'text' };
    case 'ongoing': return { text: liveRound ? `${roundLabel(liveRound)} live` : 'In progress', tone: 'text' };
    case 'completed': return { text: 'Completed', tone: 'text3' };
  }
}

const BRACKET = { knockout: 'Knockout', league: 'League', hybrid: 'League', team_league: 'Team league' } as const;

export function formatLine(c: TournamentCategory): string {
  const parts: string[] = [];
  if (c.matchType === 'doubles') parts.push('Doubles');
  parts.push(BRACKET[c.bracketType ?? 'knockout']);
  const f = c.matchFormat;
  if (f?.bestOf) parts.push(f.bestOf === 1 ? `1 game to ${f.pointsPerGame}` : `Best of ${f.bestOf} to ${f.pointsPerGame}`);
  const k = c.cricketConfig;
  if (k?.overs) parts.push(`${k.overs} overs`);
  if (k?.playersPerTeam) parts.push(`${k.playersPerTeam} a side`);
  return parts.join(' · ');
}

export const isFree = (c: TournamentCategory) => !c.isPaidRegistration || !(c.registrationFee > 0);

export const feeLabel = (c: TournamentCategory) => (isFree(c) ? 'Free' : rupees(c.registrationFee));

/** The card's price pill, from the list's `minFee`. Nothing to say when the
 *  tournament has no categories yet, so no pill rather than a guess. */
export function minFeePill(minFee?: number): string | null {
  if (typeof minFee !== 'number') return null;
  return minFee > 0 ? `from ${rupees(minFee)}` : 'Free';
}

export function lowestFee(categories: TournamentCategory[]): string {
  if (categories.some(isFree)) return 'free';
  return rupees(Math.min(...categories.map((c) => c.registrationFee)));
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function facts(t: TournamentDetail, categoryCount: number, now: Date): { label: string; value: string }[] {
  const start = new Date(t.startDate);
  const same = dayDate(t.startDate) === dayDate(t.endDate);
  const from = dayDate(t.startDate).split(' ');
  const to = dayDate(t.endDate);
  // same month: "Tue 20 – Wed 21 Oct"; otherwise keep both months.
  const when = same
    ? `${dayDate(t.startDate)} ${start.getFullYear()}`
    : `${from[2] === to.split(' ')[2] ? from.slice(0, 2).join(' ') : from.join(' ')} – ${to}`;
  const format = count(categoryCount, 'category', 'categories') + (t.teamsCount ? ` · ${count(t.teamsCount, 'team', 'teams')}` : '');
  const closed = deadlinePassed(t.registrationDeadline, now);
  return [
    { label: 'When', value: when },
    { label: 'Where', value: t.venue.name },
    { label: 'Format', value: format },
    { label: closed ? 'Entries closed' : 'Entries close', value: dayDate(t.registrationDeadline) },
  ];
}

export type TabKey = 'matches' | 'auction' | 'teams';

const TAB_ORDER: Record<Stage, TabKey[]> = {
  registration: ['teams'],
  closed: ['matches', 'teams', 'auction'],
  auction: ['auction', 'teams', 'matches'],
  ongoing: ['matches', 'teams', 'auction'],
  completed: ['matches', 'teams', 'auction'],
  cancelled: ['matches', 'teams', 'auction'],
};

export const overviewTabs = (stage: Stage, has: Record<TabKey, boolean>): TabKey[] => TAB_ORDER[stage].filter((k) => has[k]);

export type CtaGo =
  | { to: 'category'; categoryId: string } | { to: 'categories' } | { to: 'auction'; categoryId: string }
  | { to: 'matches'; categoryId?: string } | { to: 'login' };

type Cta = { label: string; variant: 'primary' | 'secondary'; go: CtaGo };

export function footerCta(i: {
  stage: Stage; categories: TournamentCategory[]; mine: MyEntry[]; loggedIn: boolean; auctions: Auctions;
  next?: { categoryId: string; label: string };
}): Cta | null {
  const latest = (es: MyEntry[]) => es.reduce<MyEntry | undefined>((a, e) => (!a || e.createdAt > a.createdAt ? e : a), undefined);
  // A withdrawn entry still counts (2b shows it; the server refuses a new one), behind any active one.
  const newest = latest(i.mine.filter((e) => e.status !== 'withdrawn')) ?? latest(i.mine);
  const yourEntry: Cta | null = newest ? { label: 'Your entry', variant: 'secondary', go: { to: 'category', categoryId: newest.categoryId } } : null;

  switch (i.stage) {
    case 'registration': {
      const open = i.categories.filter((c) => c.status === 'registration' && !i.mine.some((e) => e.categoryId === c._id));
      if (!open.length) return yourEntry;
      const lowest = lowestFee(open);
      const label = `Register · ${lowest === 'free' ? 'free' : `from ${lowest}`}`;
      const go: CtaGo = !i.loggedIn ? { to: 'login' } : open.length === 1 ? { to: 'category', categoryId: open[0]._id } : { to: 'categories' };
      return { label, variant: 'primary', go };
    }
    case 'auction': {
      const live = liveAuctionCategory(i.categories, i.auctions);
      return live ? { label: 'Watch the auction', variant: 'primary', go: { to: 'auction', categoryId: live._id } } : yourEntry;
    }
    case 'ongoing':
      return i.next
        ? { label: i.next.label, variant: 'primary', go: { to: 'matches', categoryId: i.next.categoryId } }
        : { label: 'See matches', variant: 'primary', go: { to: 'matches' } };
    case 'completed': return { label: 'See results', variant: 'primary', go: { to: 'matches' } };
    case 'closed':
    case 'cancelled': return yourEntry;
  }
}

const SEVERITY = { info: 'Info', important: 'Important', schedule_change: 'Schedule change' } as const;

export function announcementTag(a: Announcement): { text: string; tone: Tone } {
  const label = SEVERITY[a.severity];
  const tone: Tone = a.severity === 'info' ? 'text2' : 'accent';
  return { text: a.pinned ? `Pinned · ${label}` : label, tone };
}

/** "Asha Rao · staff · 20 min ago". The role is set by the server from the poster's account. */
export function announcementMeta(a: Announcement, now: Date): string {
  const role = a.authorRole === 'staff' ? 'staff' : 'organiser';
  return `${a.authorName} · ${role} · ${timeAgo(a.createdAt, now)}`;
}

export function timeAgo(iso: string, now: Date): string {
  const s = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  if (s < 172800) return 'yesterday';
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} days ago`;
  return dayDate(iso);
}

export function directionsUrl(v: TournamentDetail['venue']): string {
  const q = v.coordinates ? `${v.coordinates.lat},${v.coordinates.lng}` : encodeURIComponent([v.name, v.address, v.city].filter(Boolean).join(', '));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function awardRow(a: TournamentAward): { title: string; who: string } {
  const p = a.player;
  const who = p ? [p.firstName, p.lastName].filter(Boolean).join(' ') : a.team?.name ?? '';
  return { title: a.title, who };
}
