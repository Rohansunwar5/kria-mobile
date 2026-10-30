import type { TournamentCategory, TournamentDetail, MyEntry, EntryProfile, SkillLevel } from '@/api/tournaments';
import { rupees } from '@/lib/format';
import { dayDate } from '@/lib/matchCard';

export interface EntryUser {
  _id: string; firstName: string; lastName: string; phone: string;
  gender?: string; dateOfBirth?: string; profileImage?: string;
}

const FORMAT = { knockout: 'Knockout', league: 'League', hybrid: 'League', team_league: 'Team league' } as const;
const MATCH_TYPE = { singles: 'Singles', doubles: 'Doubles', team: 'Team' } as const;
const GENDER_WORD = { male: 'Men', female: 'Women', mixed: 'Mixed' } as const;

/** Age at `now` (computeAge in format.ts reads the real clock, which tests and callers can't pin). */
function ageAt(dob: string, now: Date): number {
  const d = new Date(dob);
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function eligibility(c: TournamentCategory): string {
  const g = c.gender ? GENDER_WORD[c.gender] : undefined;
  const a = c.ageGroup;
  let age = 'Open';
  if (a?.label) age = a.label;
  else if (a?.min != null && a?.max != null) age = `${a.min}–${a.max}`;
  else if (a?.max != null) age = `Up to ${a.max}`;
  else if (a?.min != null) age = `${a.min} and over`;
  return [g, age].filter(Boolean).join(' · ');
}

export function categoryFacts(c: TournamentCategory): { label: string; value: string }[] {
  const fmt = c.bracketType ? FORMAT[c.bracketType] : undefined;
  const mt = c.matchType ? MATCH_TYPE[c.matchType] : undefined;
  const cr = c.cricketConfig;
  const mf = c.matchFormat;
  const scoring = cr?.overs
    ? [`${cr.overs} overs`, cr.playersPerTeam ? `${cr.playersPerTeam} a side` : ''].filter(Boolean)
    : [mf?.bestOf ? `Best of ${mf.bestOf}` : '', mf?.pointsPerGame ? `${mf.pointsPerGame} points` : ''].filter(Boolean);
  return [
    { label: 'Format', value: [fmt, mt].filter(Boolean).join(' · ') || '—' },
    { label: 'Scoring', value: scoring.join(' · ') || '—' },
    { label: 'Eligibility', value: eligibility(c) },
    { label: 'Entries', value: c.maxRegistrations ? `Limited to ${c.maxRegistrations}` : 'No limit' },
  ];
}

const LAST_STEP = {
  knockout: { title: 'Knockout', body: "Lose once and you're out." },
  league: { title: 'League', body: 'Everyone plays everyone; the table decides.' },
  team_league: { title: 'Team league', body: 'Teams play ties in groups; points decide the table.' },
} as const;

export function howItWorks(c: TournamentCategory, teamsCount: number): { title: string; body: string }[] {
  const hasTeams = teamsCount > 0;
  const steps = [
    { title: c.isPaidRegistration ? 'Register and pay' : 'Register', body: 'Your profile and skill level go to the organiser.' },
    { title: 'Organiser approves', body: hasTeams ? 'Approved players join the auction pool.' : 'Approved players are placed in the draw.' },
  ];
  if (hasTeams) steps.push({ title: 'Team auction', body: `${teamsCount} teams bid for players. You join the team that buys you.` });
  const last = c.bracketType === 'knockout' ? LAST_STEP.knockout : c.bracketType === 'team_league' ? LAST_STEP.team_league : LAST_STEP.league;
  steps.push({ ...last });
  return steps;
}

export function entryBlocker(c: TournamentCategory, t: TournamentDetail, user: EntryUser | null, now: Date): string | null {
  if (!user) return 'Log in to register';
  if (t.status !== 'registration_open' || c.status !== 'registration' || now.getTime() > new Date(t.registrationDeadline).getTime()) {
    return 'Entries are closed';
  }
  if (!user.dateOfBirth || !user.gender) return 'Add your date of birth and gender to enter';
  if (c.gender && c.gender !== 'mixed' && c.gender !== user.gender) {
    return `This category is for ${c.gender === 'male' ? 'men' : 'women'}`;
  }
  const age = ageAt(user.dateOfBirth, now);
  const { min, max } = c.ageGroup ?? {};
  if (min != null && age < min) return `This category is for players ${min} and over`;
  if (max != null && age > max) return `This category is for players up to ${max}`;
  return null;
}

export function entryProfile(user: EntryUser, skill: SkillLevel, now: Date): EntryProfile {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    age: ageAt(user.dateOfBirth ?? '', now),
    gender: user.gender as 'male' | 'female',
    phone: user.phone,
    ...(user.profileImage ? { photo: user.profileImage } : {}),
    skillLevel: skill,
  };
}

/** Keeps the first two and last three digits: "98••• ••412". A "+91" prefix stays, spaced. */
export function maskPhone(phone: string): string {
  const m = /^(\+\d{2})?(\d{5,})$/.exec(phone.replace(/[\s-]/g, ''));
  if (!m) return phone;
  const d = m[2];
  const masked = `${d.slice(0, 2)}••• ••${d.slice(-3)}`;
  return m[1] ? `${m[1]} ${masked}` : masked;
}

export function entryLine(user: EntryUser, now: Date): string {
  const g = user.gender === 'male' ? 'Male' : user.gender === 'female' ? 'Female' : '';
  const age = user.dateOfBirth ? String(ageAt(user.dateOfBirth, now)) : '';
  return [g, age, maskPhone(user.phone)].filter(Boolean).join(' · ');
}

export type StepState = 'done' | 'now' | 'next';

export function timeline(e: MyEntry, hasTeams: boolean, paid: boolean): { title: string; sub?: string; state: StepState }[] {
  const first = { title: paid ? 'Payment received' : 'Registered', sub: dayDate(e.createdAt) };
  const happy = ['Pending approval', 'Approved', ...(hasTeams ? ['In the auction pool', 'Assigned to a team'] : [])];
  const titles =
    e.status === 'rejected' ? ['Pending approval', 'Not accepted']
    : e.status === 'withdrawn' ? ['Withdrawn']
    : happy;
  // Index of the step in progress; past the end means every step is done.
  const now =
    e.status === 'rejected' ? 1
    : e.status === 'withdrawn' ? 0
    : e.status === 'pending' ? 0
    : e.status === 'approved' ? 2
    : titles.length; // auctioned / assigned
  // The dates the server stamps (SERVER-GAPS #18); older entries have none.
  const dated: Record<string, string | undefined> = { Approved: e.approvedAt, 'Not accepted': e.rejectedAt, Withdrawn: e.withdrawnAt };
  const rest = titles.map((title, i) => {
    const state = (i < now ? 'done' : i === now ? 'now' : 'next') as StepState;
    const at = state !== 'next' ? dated[title] : undefined;
    return { title, state, ...(at ? { sub: dayDate(at) } : {}) };
  });
  const sold = e.auctionData?.soldPrice;
  if ((e.status === 'assigned' || e.status === 'auctioned') && hasTeams && sold) {
    (rest[rest.length - 1] as { sub?: string }).sub = `Sold for ${rupees(sold)}`;
  }
  return [{ ...first, state: 'done' }, ...rest];
}

export function enteredHeading(e: MyEntry, hasTeams: boolean, teamName?: string, paidAmount?: number): { title: string; line: string } {
  const paid = paidAmount ? `${rupees(paidAmount)} paid. ` : '';
  switch (e.status) {
    case 'pending':
      return { title: "You're in the queue for approval", line: `${paid}The organiser reviews entries before the ${hasTeams ? 'auction' : 'draw'}.` };
    case 'approved':
      return { title: "You're approved", line: `${paid}${hasTeams ? "You're in the auction pool." : "You'll be placed in the draw."}` };
    case 'auctioned':
    case 'assigned': {
      const sold = e.auctionData?.soldPrice;
      return { title: `You're on ${teamName ?? 'a team'}`, line: `${paid}${sold ? `Sold for ${rupees(sold)}.` : ''}`.trim() };
    }
    case 'rejected':
      return {
        title: "Your entry wasn't accepted",
        line: `${paid}The organiser turned this entry down.${e.rejectionReason ? ` Reason: ${e.rejectionReason}` : ''}`,
      };
    case 'withdrawn':
      return { title: 'You withdrew this entry', line: '' };
  }
}
