import {
  effectiveStage, liveAuctionCategory, statusLine, categoryStatus, formatLine, feeLabel, lowestFee, facts,
  overviewTabs, footerCta, announcementTag, timeAgo, directionsUrl, awardRow,
} from '@/lib/tournamentView';
import type { TournamentCategory, TournamentDetail, MyEntry } from '@/api/tournaments';
import type { Announcement } from '@/api/profileApi';

const cat = (o: Partial<TournamentCategory> = {}): TournamentCategory => ({
  _id: 'c1', tournamentId: 't1', name: "Men's Singles", sport: 'badminton', status: 'registration',
  matchType: 'singles', bracketType: 'knockout', matchFormat: { bestOf: 3, pointsPerGame: 21 },
  registrationFee: 600, isPaidRegistration: true, ...o,
});
const tour = (o: Partial<TournamentDetail> = {}): TournamentDetail => ({
  _id: 't1', name: 'Open', sport: 'badminton', startDate: '2026-10-20T12:00:00', endDate: '2026-10-20T12:00:00',
  registrationDeadline: '2026-10-17T12:00:00', status: 'registration_open',
  venue: { name: 'Tiger Stadium', address: 'Koramangala', city: 'Bengaluru' }, ...o,
});
const entry = (o: Partial<MyEntry> = {}): MyEntry => ({
  _id: 'e1', tournamentId: 't1', categoryId: 'c1', createdAt: '2026-10-10T10:00:00Z', status: 'approved', ...o,
});
const base = { categories: [cat()], auctions: {}, liveMatch: false, registrationDeadline: '2026-10-17T12:00:00', now: new Date('2026-10-10T12:00:00') };

describe('effectiveStage', () => {
  it('maps statuses', () => {
    expect(effectiveStage({ ...base, status: 'registration_open' })).toBe('registration');
    expect(effectiveStage({ ...base, status: 'registration_closed' })).toBe('closed');
    expect(effectiveStage({ ...base, status: 'draft' })).toBe('closed');
    expect(effectiveStage({ ...base, status: 'cancelled' })).toBe('cancelled');
  });
  it('auction and ongoing', () => {
    expect(effectiveStage({ ...base, status: 'registration_closed', auctions: { c1: 'in_progress' } })).toBe('auction');
    expect(effectiveStage({ ...base, status: 'registration_closed', auctions: { c1: 'paused' } })).toBe('auction');
    expect(effectiveStage({ ...base, status: 'registration_closed', auctions: { c1: 'completed' } })).toBe('closed');
    expect(effectiveStage({ ...base, status: 'registration_closed', categories: [cat({ status: 'ongoing' })] })).toBe('ongoing');
    expect(effectiveStage({ ...base, status: 'registration_closed', liveMatch: true })).toBe('ongoing');
    expect(effectiveStage({ ...base, status: 'completed', auctions: { c1: 'in_progress' } })).toBe('completed');
  });
  it('a past deadline closes registration, as 2b does', () => {
    const after = new Date('2026-10-18T12:00:00');
    expect(effectiveStage({ ...base, status: 'registration_open', now: after })).toBe('closed');
    expect(effectiveStage({ ...base, status: 'registration_open', now: after, auctions: { c1: 'in_progress' } })).toBe('auction');
  });
});

describe('liveAuctionCategory', () => {
  it('first live', () => {
    const cs = [cat({ _id: 'a' }), cat({ _id: 'b' })];
    expect(liveAuctionCategory(cs, { a: 'not_started', b: 'sold' })?._id).toBe('b');
    expect(liveAuctionCategory(cs, {})).toBeUndefined();
  });
});

describe('statusLine', () => {
  const t = tour();
  it('lines', () => {
    expect(statusLine('registration', t, {})).toEqual({ text: 'Registration open · closes Sat 17 Oct', tone: 'accent' });
    expect(statusLine('closed', t, {})).toEqual({ text: 'Registration closed · starts Tue 20 Oct', tone: 'text3' });
    expect(statusLine('auction', t, { auctionCategory: "Men's Singles" })).toEqual({ text: "Team auction live · Men's Singles", tone: 'accent' });
    expect(statusLine('auction', t, { auctionCategory: "Men's Singles", auctionPaused: true })).toEqual({ text: "Team auction paused · Men's Singles", tone: 'text' });
    expect(statusLine('auction', t, {})).toEqual({ text: 'Team auction · starts soon', tone: 'text2' });
    expect(statusLine('ongoing', t, {})).toEqual({ text: 'In progress', tone: 'text' });
    expect(statusLine('ongoing', t, { liveRound: 'Semi-Final' }).text).toBe('In progress · Semi-final live');
    expect(statusLine('completed', t, {})).toEqual({ text: 'Completed · Tue 20 Oct', tone: 'text3' });
    expect(statusLine('cancelled', t, {})).toEqual({ text: 'Cancelled', tone: 'text4' });
  });
});

describe('categoryStatus', () => {
  it('maps', () => {
    expect(categoryStatus(cat({ status: 'setup' }))).toEqual({ text: 'Opens soon', tone: 'text3' });
    expect(categoryStatus(cat())).toEqual({ text: 'Registration open', tone: 'accent' });
    const a = cat({ status: 'auction' });
    expect(categoryStatus(a, 'in_progress')).toEqual({ text: 'Auction live', tone: 'accent' });
    expect(categoryStatus(a, 'sold').text).toBe('Auction live');
    expect(categoryStatus(a, 'paused')).toEqual({ text: 'Auction paused', tone: 'text2' });
    expect(categoryStatus(a, undefined)).toEqual({ text: 'Auction starts soon', tone: 'text2' });
    expect(categoryStatus(a, 'not_started').text).toBe('Auction starts soon');
    expect(categoryStatus(a, 'completed')).toEqual({ text: 'Auction ended', tone: 'text2' });
    expect(categoryStatus(cat({ status: 'bracket_configured' }))).toEqual({ text: 'Draw is out', tone: 'text' });
    expect(categoryStatus(cat({ status: 'groups_configured' })).text).toBe('Draw is out');
    expect(categoryStatus(cat({ status: 'ongoing' }))).toEqual({ text: 'In progress', tone: 'text' });
    expect(categoryStatus(cat({ status: 'ongoing' }), undefined, 'Quarter-Final').text).toBe('Quarter-final live');
    expect(categoryStatus(cat({ status: 'completed' }))).toEqual({ text: 'Completed', tone: 'text3' });
  });
  it('a registration category past the deadline reads closed', () => {
    expect(categoryStatus(cat(), undefined, undefined, true)).toEqual({ text: 'Registration closed', tone: 'text3' });
    expect(categoryStatus(cat({ status: 'completed' }), undefined, undefined, true).text).toBe('Completed');
  });
});

describe('formatLine', () => {
  it('formats', () => {
    expect(formatLine(cat())).toBe('Knockout · Best of 3 to 21');
    expect(formatLine(cat({ matchFormat: { bestOf: 1, pointsPerGame: 21 } }))).toBe('Knockout · 1 game to 21');
    expect(formatLine(cat({ matchType: 'doubles' }))).toBe('Doubles · Knockout · Best of 3 to 21');
    expect(formatLine(cat({ bracketType: 'hybrid' }))).toBe('League · Best of 3 to 21');
    expect(formatLine(cat({ bracketType: 'team_league' }))).toBe('Team league · Best of 3 to 21');
    expect(formatLine(cat({ bracketType: 'league', matchFormat: undefined, cricketConfig: { overs: 10, playersPerTeam: 11 } }))).toBe('League · 10 overs · 11 a side');
    expect(formatLine(cat({ matchFormat: undefined }))).toBe('Knockout');
  });
});

describe('fees', () => {
  it('labels', () => {
    expect(feeLabel(cat())).toBe('₹600');
    expect(feeLabel(cat({ isPaidRegistration: false }))).toBe('Free');
    expect(feeLabel(cat({ registrationFee: 0 }))).toBe('Free');
    expect(lowestFee([cat(), cat({ registrationFee: 400 })])).toBe('₹400');
    expect(lowestFee([cat(), cat({ isPaidRegistration: false })])).toBe('free');
  });
});

describe('facts', () => {
  const before = new Date('2026-10-10T12:00:00');
  it('single day', () => {
    expect(facts(tour(), 3, before)).toEqual([
      { label: 'When', value: 'Tue 20 Oct 2026' }, { label: 'Where', value: 'Tiger Stadium' },
      { label: 'Format', value: '3 categories' }, { label: 'Entries close', value: 'Sat 17 Oct' },
    ]);
  });
  it('variants', () => {
    expect(facts(tour({ teamsCount: 4 }), 3, before)[2].value).toBe('3 categories · 4 teams');
    expect(facts(tour(), 1, before)[2].value).toBe('1 category');
    expect(facts(tour({ endDate: '2026-10-21T12:00:00' }), 3, before)[0].value).toBe('Tue 20 – Wed 21 Oct');
    expect(facts(tour(), 3, new Date('2026-10-18T12:00:00'))[3]).toEqual({ label: 'Entries closed', value: 'Sat 17 Oct' });
  });
});

describe('overviewTabs', () => {
  const all = { matches: true, auction: true, teams: true };
  it('orders', () => {
    expect(overviewTabs('registration', all)).toEqual(['teams']);
    expect(overviewTabs('auction', all)).toEqual(['auction', 'teams', 'matches']);
    expect(overviewTabs('ongoing', { matches: true, teams: true, auction: false })).toEqual(['matches', 'teams']);
    expect(overviewTabs('completed', all)).toEqual(['matches', 'teams', 'auction']);
    expect(overviewTabs('closed', all)).toEqual(['matches', 'teams', 'auction']);
    expect(overviewTabs('cancelled', all)).toEqual(['matches', 'teams', 'auction']);
  });
});

describe('footerCta', () => {
  const i = { stage: 'registration' as const, categories: [cat()], mine: [] as MyEntry[], loggedIn: true, auctions: {} };
  it('registration', () => {
    expect(footerCta({ ...i, loggedIn: false })).toEqual({ label: 'Register · from ₹600', variant: 'primary', go: { to: 'login' } });
    expect(footerCta(i)?.go).toEqual({ to: 'category', categoryId: 'c1' });
    expect(footerCta({ ...i, categories: [cat(), cat({ _id: 'c2' })] })?.go).toEqual({ to: 'categories' });
    expect(footerCta({ ...i, categories: [cat({ isPaidRegistration: false })] })?.label).toBe('Register · free');
  });
  it('registration all entered', () => {
    const cs = [cat(), cat({ _id: 'c2' })];
    const mine = [entry(), entry({ _id: 'e2', categoryId: 'c2', createdAt: '2026-10-12T10:00:00Z' })];
    expect(footerCta({ ...i, categories: cs, mine })).toEqual({ label: 'Your entry', variant: 'secondary', go: { to: 'category', categoryId: 'c2' } });
  });
  // The server keeps a withdrawn registration and refuses a new one, so 2b shows it: never offer Register for it.
  it('a withdrawn entry on the only open category is Your entry, not Register', () => {
    expect(footerCta({ ...i, mine: [entry({ status: 'withdrawn' })] })).toEqual({ label: 'Your entry', variant: 'secondary', go: { to: 'category', categoryId: 'c1' } });
    const cs = [cat(), cat({ _id: 'c2' })];
    const mine = [entry({ categoryId: 'c2' }), entry({ _id: 'e2', status: 'withdrawn', createdAt: '2026-10-12T10:00:00Z' })];
    expect(footerCta({ ...i, categories: cs, mine })?.go).toEqual({ to: 'category', categoryId: 'c2' });
  });
  it('other stages', () => {
    expect(footerCta({ ...i, stage: 'auction', auctions: { c2: 'in_progress' }, categories: [cat(), cat({ _id: 'c2' })] }))
      .toMatchObject({ label: 'Watch the auction', go: { to: 'auction', categoryId: 'c2' } });
    expect(footerCta({ ...i, stage: 'ongoing', next: { categoryId: 'c1', label: 'Your semi-final · 4:30 PM' } }))
      .toMatchObject({ label: 'Your semi-final · 4:30 PM', go: { to: 'matches', categoryId: 'c1' } });
    expect(footerCta({ ...i, stage: 'ongoing' })).toMatchObject({ label: 'See matches', go: { to: 'matches' } });
    expect(footerCta({ ...i, stage: 'completed' })).toMatchObject({ label: 'See results', go: { to: 'matches' } });
    expect(footerCta({ ...i, stage: 'closed' })).toBeNull();
    expect(footerCta({ ...i, stage: 'cancelled' })).toBeNull();
    expect(footerCta({ ...i, stage: 'closed', mine: [entry()] })?.label).toBe('Your entry');
    expect(footerCta({ ...i, stage: 'cancelled', mine: [entry()] })?.label).toBe('Your entry');
  });
});

describe('announcementTag', () => {
  const a = (o: Partial<Announcement>): Announcement => ({
    _id: 'a', tournamentId: 't1', message: 'm', severity: 'info', pinned: false, authorName: 'x', authorRole: 'y', createdAt: '', ...o,
  });
  it('tags', () => {
    expect(announcementTag(a({ pinned: true, severity: 'important' }))).toEqual({ text: 'Pinned · Important', tone: 'accent' });
    expect(announcementTag(a({ pinned: true, severity: 'schedule_change' })).text).toBe('Pinned · Schedule change');
    expect(announcementTag(a({}))).toEqual({ text: 'Info', tone: 'text2' });
    expect(announcementTag(a({ severity: 'important' }))).toEqual({ text: 'Important', tone: 'accent' });
    expect(announcementTag(a({ severity: 'schedule_change' }))).toEqual({ text: 'Schedule change', tone: 'accent' });
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  it('buckets', () => {
    expect(timeAgo(ago(30e3), now)).toBe('just now');
    expect(timeAgo(ago(12 * 60e3), now)).toBe('12 min ago');
    expect(timeAgo(ago(3 * 3600e3), now)).toBe('3 hr ago');
    expect(timeAgo(ago(30 * 3600e3), now)).toBe('yesterday');
    expect(timeAgo(ago(4 * 86400e3), now)).toBe('4 days ago');
    expect(timeAgo('2026-10-12T12:00:00Z', now)).toBe('Mon 12 Oct');
  });
});

describe('directionsUrl / awardRow', () => {
  it('urls', () => {
    expect(directionsUrl({ ...tour().venue, coordinates: { lat: 12.93, lng: 77.62 } }))
      .toBe('https://www.google.com/maps/search/?api=1&query=12.93,77.62');
    expect(directionsUrl(tour().venue))
      .toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Tiger Stadium, Koramangala, Bengaluru')}`);
  });
  it('awards', () => {
    expect(awardRow({ title: 'Winner', player: { firstName: 'Aarav', lastName: 'Menon' } })).toEqual({ title: 'Winner', who: 'Aarav Menon' });
    expect(awardRow({ title: 'Winner', team: { name: 'Tigers' } }).who).toBe('Tigers');
    expect(awardRow({ title: 'Winner' }).who).toBe('');
  });
});
