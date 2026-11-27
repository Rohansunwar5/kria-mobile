import type { Achievement, CareerProfile, SportSummary } from '@/api/career';
import type { QuickMatch } from '@/api/quickMatch';
import { buildResultMoment, viewerSide } from '@/lib/resultMoment';

const sum = (sport: string, played: number, decided: number, won: number): SportSummary => ({
  sport, played, decided, won, lost: decided - won, tied: 0, noResult: played - decided, winRate: decided ? won / decided : 0,
});
const ach = (id: string, label: string, progress: number, target: number): Achievement => ({
  id, label, progress: Math.min(progress, target), target, earned: progress >= target,
});
const prof = (sports: SportSummary[], achievements: Achievement[]): CareerProfile => ({ sports, bestSport: null, achievements });
const match = {
  _id: 'm1', hostId: 'me', sport: 'badminton', joinCode: 'ABC123', status: 'completed', createdAt: '2026-11-27T10:00:00Z',
  sides: [
    { sideId: 's1', name: 'Asha & Ravi', slots: [{ slotId: 'a', playerId: 'me', displayName: 'Asha' }] },
    { sideId: 's2', name: 'Meera & Dev', slots: [{ slotId: 'b', playerId: 'p2', displayName: 'Dev' }] },
  ],
} as QuickMatch;
const M50 = (p: number) => ach('matches-50', 'Play 50 matches', p, 50);
const M100 = (p: number) => ach('matches-100', 'Play 100 matches', p, 100);

test('a win that mints 50 matches', () => {
  const r = buildResultMoment(
    prof([sum('badminton', 12, 12, 7)], [M50(49), M100(49)]),
    prof([sum('badminton', 13, 13, 8)], [M50(50), M100(50)]),
    { ...match, outcome: 'side1' }, 'me',
  )!;
  expect(r.outcome).toBe('win');
  expect(r.sport).toBe('badminton');
  expect(r.winRate).toEqual({ from: '58.3%', to: '61.5%' });
  expect(r.decided).toEqual({ from: '12', to: '13' });
  expect(r.minted?.id).toBe('matches-50');
  expect(r.mintNext).toBe(100);
  expect(r.bar).toEqual({ label: 'Play 50 matches', from: 49, to: 50, target: 50 });
  expect(r.next).toEqual({ remaining: 50, unit: 'matches', target: 100 });
  expect(r.qualified).toBe(false);
});

test('a loss', () => {
  const r = buildResultMoment(
    prof([sum('badminton', 12, 12, 7)], [M50(38)]),
    prof([sum('badminton', 13, 13, 7)], [M50(39)]),
    { ...match, outcome: 'side2' }, 'me',
  )!;
  expect(r.outcome).toBe('loss');
  expect(r.winRate.to).toBe('53.8%');
  expect(r.minted).toBeNull();
  expect(r.bar).toEqual({ label: 'Play 50 matches', from: 38, to: 39, target: 50 });
});

test('a tie counts as decided, without a win', () => {
  const r = buildResultMoment(prof([sum('badminton', 12, 12, 7)], []), prof([sum('badminton', 13, 13, 7)], []), { ...match, outcome: 'tied' }, 'me')!;
  expect(r.outcome).toBe('tie');
});

test('no result leaves decided unchanged', () => {
  const r = buildResultMoment(prof([sum('badminton', 12, 12, 7)], []), prof([sum('badminton', 13, 12, 7)], []), { ...match, outcome: 'no_result' }, 'me')!;
  expect(r.outcome).toBe('nr');
  expect(r.decided).toEqual({ from: '12', to: '12' });
});

test('numbers that do not add up give null', () => {
  expect(buildResultMoment(prof([sum('badminton', 12, 12, 7)], []), prof([sum('badminton', 14, 14, 8)], []), { ...match, outcome: 'side1' }, 'me')).toBeNull();
  expect(buildResultMoment(prof([sum('badminton', 12, 12, 7)], []), prof([sum('badminton', 12, 12, 7)], []), { ...match, outcome: 'side1' }, 'me')).toBeNull();
});

test('the first decided match in the sport', () => {
  const r = buildResultMoment(prof([], []), prof([sum('badminton', 1, 1, 1)], []), { ...match, outcome: 'side1' }, 'me')!;
  expect(r.winRate).toEqual({ from: '—', to: '100.0%' });
  expect(r.next).toEqual({ remaining: 4, unit: 'ranked', target: 5 });
  expect(r.bar).toEqual({ label: 'Decided matches', from: 0, to: 1, target: 5 });
});

test('crossing the rank threshold replaces the bar with the qualify line', () => {
  const r = buildResultMoment(prof([sum('badminton', 4, 4, 2)], [M50(4)]), prof([sum('badminton', 5, 5, 3)], [M50(5)]), { ...match, outcome: 'side1' }, 'me')!;
  expect(r.qualified).toBe(true);
  expect(r.bar).toBeNull();
  expect(r.next).toEqual({ remaining: 45, unit: 'matches', target: 50 });
});

test('nothing left to aim for', () => {
  const done = [ach('wins-25', 'Win 25 matches', 25, 25)];
  const r = buildResultMoment(prof([sum('badminton', 30, 30, 26)], done), prof([sum('badminton', 31, 31, 27)], done), { ...match, outcome: 'side1' }, 'me')!;
  expect(r.next).toBeNull();
  expect(r.bar).toBeNull();
});

test('a viewer without a claimed slot gets null', () => {
  expect(buildResultMoment(prof([], []), prof([], []), { ...match, outcome: 'side1' }, 'spectator')).toBeNull();
  const guest = { ...match, sides: [{ ...match.sides[0], slots: [{ slotId: 'g', displayName: 'Guest' }] }, match.sides[1]] };
  expect(viewerSide(guest, 'me')).toBeNull();
  expect(viewerSide(match, 'p2')).toBe(1);
});
