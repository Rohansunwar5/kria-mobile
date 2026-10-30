import {
  categoryFacts, howItWorks, entryBlocker, entryProfile, maskPhone, entryLine, timeline, enteredHeading,
  type EntryUser,
} from '@/lib/entryView';
import { dayDate } from '@/lib/matchCard';
import type { TournamentCategory, TournamentDetail, MyEntry } from '@/api/tournaments';

const cat = (o: Partial<TournamentCategory> = {}): TournamentCategory => ({
  _id: 'c1', tournamentId: 't1', name: 'Cat', status: 'registration', registrationFee: 0, isPaidRegistration: false, ...o,
});
const tour = (o: Partial<TournamentDetail> = {}): TournamentDetail => ({
  _id: 't1', name: 'T', sport: 'badminton', startDate: '2026-11-01T12:00:00Z', endDate: '2026-11-02T12:00:00Z',
  registrationDeadline: '2026-10-20T12:00:00Z', status: 'registration_open', venue: { name: 'V', city: 'C' }, ...o,
});
const user = (o: Partial<EntryUser> = {}): EntryUser => ({
  _id: 'u1', firstName: 'Asha', lastName: 'Rao', phone: '9876543412', gender: 'male', dateOfBirth: '1999-05-01', ...o,
});
const entry = (o: Partial<MyEntry> = {}): MyEntry => ({
  _id: 'e1', tournamentId: 't1', categoryId: 'c1', createdAt: '2026-10-05T12:00:00Z', status: 'pending', ...o,
});
const NOW = new Date('2026-10-10T12:00:00Z');
const NOW2 = new Date('2026-10-22T12:00:00Z');

describe('categoryFacts', () => {
  it('knockout singles', () => {
    expect(categoryFacts(cat({
      bracketType: 'knockout', matchType: 'singles', matchFormat: { bestOf: 3, pointsPerGame: 21 },
      gender: 'male', ageGroup: { label: 'Open (18+)' }, maxRegistrations: 64,
    }))).toEqual([
      { label: 'Format', value: 'Knockout · Singles' },
      { label: 'Scoring', value: 'Best of 3 · 21 points' },
      { label: 'Eligibility', value: 'Men · Open (18+)' },
      { label: 'Entries', value: 'Limited to 64' },
    ]);
  });
  it('no cap, mixed, open', () => {
    const f = categoryFacts(cat({ gender: 'mixed' }));
    expect(f[3].value).toBe('No limit');
    expect(f[2].value).toBe('Mixed · Open');
  });
  it('age wording', () => {
    const e = (a: TournamentCategory['ageGroup']) => categoryFacts(cat({ gender: 'female', ageGroup: a }))[2].value;
    expect(e({ max: 16 })).toBe('Women · Up to 16');
    expect(e({ min: 35 })).toBe('Women · 35 and over');
    expect(e({ min: 18, max: 30 })).toBe('Women · 18–30');
  });
  it('cricket scoring', () => {
    expect(categoryFacts(cat({ cricketConfig: { overs: 10, playersPerTeam: 11 } }))[1].value).toBe('10 overs · 11 a side');
  });
});

describe('howItWorks', () => {
  it('paid knockout with teams', () => {
    const s = howItWorks(cat({ isPaidRegistration: true, bracketType: 'knockout' }), 4);
    expect(s).toHaveLength(4);
    expect(s[0]).toEqual({ title: 'Register and pay', body: 'Your profile and skill level go to the organiser.' });
    expect(s[1].body).toBe('Approved players join the auction pool.');
    expect(s[2]).toEqual({ title: 'Team auction', body: '4 teams bid for players. You join the team that buys you.' });
    expect(s[3]).toEqual({ title: 'Knockout', body: "Lose once and you're out." });
  });
  it('free league no teams', () => {
    const s = howItWorks(cat({ bracketType: 'league' }), 0);
    expect(s).toHaveLength(3);
    expect(s[0].title).toBe('Register');
    expect(s[1].body).toBe('Approved players are placed in the draw.');
    expect(s[2]).toEqual({ title: 'League', body: 'Everyone plays everyone; the table decides.' });
  });
  it('team league', () => {
    const s = howItWorks(cat({ bracketType: 'team_league' }), 0);
    expect(s[s.length - 1]).toEqual({ title: 'Team league', body: 'Teams play ties in groups; points decide the table.' });
  });
});

describe('entryBlocker', () => {
  const c = cat({ gender: 'male' });
  it('login / closed', () => {
    expect(entryBlocker(c, tour(), null, NOW)).toBe('Log in to register');
    expect(entryBlocker(c, tour({ status: 'ongoing' }), user(), NOW)).toBe('Entries are closed');
    expect(entryBlocker(cat({ status: 'setup' }), tour(), user(), NOW)).toBe('Entries are closed');
    expect(entryBlocker(c, tour(), user(), new Date('2026-10-25T12:00:00Z'))).toBe('Entries are closed');
  });
  it('profile and eligibility', () => {
    expect(entryBlocker(c, tour(), user({ dateOfBirth: undefined }), NOW)).toBe('Add your date of birth and gender to enter');
    expect(entryBlocker(c, tour(), user({ gender: undefined }), NOW)).toBe('Add your date of birth and gender to enter');
    expect(entryBlocker(c, tour(), user({ gender: 'female' }), NOW)).toBe('This category is for men');
    expect(entryBlocker(cat({ gender: 'female' }), tour(), user(), NOW)).toBe('This category is for women');
    expect(entryBlocker(cat({ ageGroup: { min: 18 } }), tour(), user({ dateOfBirth: '2011-01-01' }), NOW)).toBe('This category is for players 18 and over');
    expect(entryBlocker(cat({ ageGroup: { max: 16 } }), tour(), user(), NOW)).toBe('This category is for players up to 16');
    expect(entryBlocker(c, tour(), user(), NOW)).toBeNull();
    expect(entryBlocker(cat({ gender: 'mixed' }), tour(), user({ gender: 'female' }), NOW)).toBeNull();
    expect(entryBlocker(cat({ gender: 'mixed' }), tour(), user(), NOW)).toBeNull();
  });
});

describe('entry profile', () => {
  it('entryProfile', () => {
    expect(entryProfile(user({ profileImage: 'p.png' }), 'advanced', NOW2)).toEqual({
      firstName: 'Asha', lastName: 'Rao', age: 27, gender: 'male', phone: '9876543412', photo: 'p.png', skillLevel: 'advanced',
    });
    expect('photo' in entryProfile(user(), 'advanced', NOW2)).toBe(false);
  });
  it('maskPhone', () => {
    expect(maskPhone('9876543412')).toBe('98••• ••412');
    expect(maskPhone('+919876543412')).toBe('+91 98••• ••412');
    expect(maskPhone('1234')).toBe('1234');
  });
  it('entryLine', () => {
    expect(entryLine(user(), NOW2)).toBe('Male · 27 · 98••• ••412');
  });
});

describe('timeline', () => {
  const t = (e: MyEntry, teams: boolean, paid: boolean) => timeline(e, teams, paid);
  const titles = (x: ReturnType<typeof t>) => x.map((s) => s.title);
  const states = (x: ReturnType<typeof t>) => x.map((s) => s.state);
  it('pending, teams, paid', () => {
    const x = t(entry(), true, true);
    expect(titles(x)).toEqual(['Payment received', 'Pending approval', 'Approved', 'In the auction pool', 'Assigned to a team']);
    expect(states(x)).toEqual(['done', 'now', 'next', 'next', 'next']);
    expect(x[0].sub).toBe(dayDate('2026-10-05T12:00:00Z'));
  });
  it('free', () => expect(t(entry(), false, false)[0].title).toBe('Registered'));
  it('approved', () => {
    expect(states(t(entry({ status: 'approved' }), false, false))).toEqual(['done', 'done', 'done']);
    expect(states(t(entry({ status: 'approved' }), true, false))).toEqual(['done', 'done', 'done', 'now', 'next']);
  });
  it('assigned', () => {
    const x = t(entry({ status: 'assigned', auctionData: { soldPrice: 16500 } }), true, false);
    expect(states(x)).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(x[4].sub).toBe('Sold for ₹16,500');
  });
  it('rejected / withdrawn', () => {
    const r = t(entry({ status: 'rejected' }), true, false);
    expect(titles(r)).toEqual(['Registered', 'Pending approval', 'Not accepted']);
    expect(states(r)).toEqual(['done', 'done', 'now']);
    const w = t(entry({ status: 'withdrawn' }), true, false);
    expect(titles(w)).toEqual(['Registered', 'Withdrawn']);
    expect(states(w)).toEqual(['done', 'now']);
  });
  // SERVER-GAPS #18: a date under each step the server dated.
  it('dates approval, rejection and withdrawal', () => {
    const at = '2026-10-09T12:00:00Z';
    expect(t(entry({ status: 'approved', approvedAt: at }), true, false)[2].sub).toBe(dayDate(at));
    expect(t(entry({ status: 'rejected', rejectedAt: at }), true, false)[2].sub).toBe(dayDate(at));
    expect(t(entry({ status: 'withdrawn', withdrawnAt: at }), true, false)[1].sub).toBe(dayDate(at));
  });
});

describe('enteredHeading', () => {
  it('pending', () => {
    expect(enteredHeading(entry(), true, undefined, 628.32)).toEqual({
      title: "You're in the queue for approval", line: '₹628.32 paid. The organiser reviews entries before the auction.',
    });
    expect(enteredHeading(entry(), false).line).toBe('The organiser reviews entries before the draw.');
  });
  it('approved', () => {
    expect(enteredHeading(entry({ status: 'approved' }), true)).toEqual({ title: "You're approved", line: "You're in the auction pool." });
    expect(enteredHeading(entry({ status: 'approved' }), false).line).toBe("You'll be placed in the draw.");
  });
  it('assigned, rejected, withdrawn', () => {
    expect(enteredHeading(entry({ status: 'assigned', auctionData: { soldPrice: 16500 } }), true, 'Sunrise'))
      .toEqual({ title: "You're on Sunrise", line: 'Sold for ₹16,500.' });
    expect(enteredHeading(entry({ status: 'rejected' }), true)).toEqual({ title: "Your entry wasn't accepted", line: 'The organiser turned this entry down.' });
    expect(enteredHeading(entry({ status: 'withdrawn' }), true)).toEqual({ title: 'You withdrew this entry', line: '' });
  });
  it('rejected, with the organiser\'s reason', () => {
    expect(enteredHeading(entry({ status: 'rejected', rejectionReason: 'Squad is full' }), true).line)
      .toBe('The organiser turned this entry down. Reason: Squad is full');
  });
});
