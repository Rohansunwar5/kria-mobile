import type { SportSummary } from '../src/api/career';
import type { QuickMatch } from '../src/api/quickMatch';
import type { RankedPlayer } from '../src/api/rankings';
import { checklist, heroFor, nextMilestone, railTournaments, sportsByRecency, upNext } from '../src/lib/homeView';

const sport = (over: Partial<SportSummary>): SportSummary => ({
  sport: 'badminton', played: 0, decided: 0, won: 0, lost: 0, tied: 0, noResult: 0, winRate: 0, ...over,
});
const ranked = (playerId: string, winRate: number, firstName = playerId): RankedPlayer => ({
  playerId, firstName, lastName: 'X', played: 20, decided: 20, won: 10, winRate,
});

describe('heroFor', () => {
  const me = sport({ played: 64, decided: 61, won: 42, winRate: 42 / 61 });

  it('ranks from the server board, with the gap to the player above', () => {
    const board = [ranked('a', 0.9), ranked('b', 0.703), ranked('me', 42 / 61)];
    expect(heroFor(me, board, 'me')).toMatchObject({ big: '#3', rate: '68.9%', sub: '42 won · 61 decided', gapA: '1.4 pts', gapB: ' behind #2 b X' });
  });

  it('says how far #1 leads instead of a gap above', () => {
    expect(heroFor(me, [ranked('me', 0.7), ranked('b', 0.6)], 'me')).toMatchObject({ big: '#1', gapA: '10.0 pts', gapB: ' ahead of #2 b X' });
  });

  it('shows the distance to 10 decided matches when unranked', () => {
    const h = heroFor(sport({ played: 3, decided: 3, won: 2, winRate: 2 / 3 }), null, 'me');
    expect(h).toMatchObject({ big: '3/10', gapA: '7 more', gapB: ' decided matches to get ranked', rankLabel: 'Unranked' });
  });

  it('reads a full board without you as outside the top 50', () => {
    const board = Array.from({ length: 50 }, (_, i) => ranked(`p${i}`, 0.9));
    expect(heroFor(me, board, 'me')).toMatchObject({ big: '—', rankLabel: 'Outside top 50' });
  });

  it('never promises a rank in a sport the server cannot rank', () => {
    const h = heroFor(sport({ sport: 'table_tennis', played: 3, decided: 3, won: 2, winRate: 2 / 3 }), null, 'me');
    expect(h).toMatchObject({ big: '—', gapB: "Kria doesn't rank table tennis yet", ranked: false });
  });

  it('never invents a rank when the board failed to load', () => {
    expect(heroFor(me, null, 'me')).toMatchObject({ big: '—', ranked: false });
  });
});

it('orders sports by last played, then volume, and drops unplayed ones', () => {
  const sports = [sport({ sport: 'badminton', played: 64 }), sport({ sport: 'cricket', played: 18 }), sport({ sport: 'tennis', played: 0 })];
  const recent = [{ sport: 'cricket', playedAt: '2026-10-12T10:00:00Z' }, { sport: 'badminton', playedAt: '2026-10-10T10:00:00Z' }] as never;
  expect(sportsByRecency(sports, recent).map((s) => s.sport)).toEqual(['cricket', 'badminton']);
});

it('picks the locked milestone closest to done, floored so it never reads 100%', () => {
  const m = nextMilestone([
    { id: 'matches-50', label: 'Play 50 matches', earned: true, progress: 50, target: 50 },
    { id: 'matches-100', label: 'Play 100 matches', earned: false, progress: 85, target: 100 },
    { id: 'wins-25', label: 'Win 25 matches', earned: false, progress: 24.99, target: 25 },
  ]);
  expect(m).toMatchObject({ label: 'Win 25 matches', glyph: '25', sub: 'WINS', percent: '99%' });
  expect(nextMilestone([])).toBeNull();
});

describe('upNext', () => {
  const match = (slots: { playerId?: string; displayName: string }[][], over: Partial<QuickMatch> = {}): QuickMatch => ({
    _id: 'm1', hostId: 'me', sport: 'badminton', joinCode: 'K7QX2M', status: 'waiting', createdAt: '',
    sides: slots.map((s, i) => ({ sideId: `s${i}`, name: i ? 'Net Gains' : 'Smash Bros', slots: s.map((x, j) => ({ slotId: `${i}${j}`, ...x })) })),
    matchConfig: { bestOf: 3, pointsToWin: 21 },
    ...over,
  });

  it('shapes a waiting doubles match from the server record', () => {
    const v = upNext({ kind: 'match', match: match([[{ playerId: 'me', displayName: 'Aarav Menon' }, { playerId: 'k', displayName: 'Kabir Rao' }], [{ playerId: 'n', displayName: 'Nikhil Shetty' }, { displayName: 'Sameer' }]]) }, 'me');
    expect(v).toMatchObject({ format: 'Doubles', title: 'Smash Bros vs Net Gains', line: "Best of 3 to 21 · You're hosting", right: { kind: 'code', code: 'K7QX2M' }, foot: '1 slot left', avatars: ['AM', 'KR', 'NS'], extra: 0 });
  });

  it('shows +N only once 4 or more have joined', () => {
    const four = [[{ playerId: 'a', displayName: 'A A' }, { playerId: 'b', displayName: 'B B' }], [{ playerId: 'c', displayName: 'C C' }, { playerId: 'd', displayName: 'D D' }]];
    expect(upNext({ kind: 'match', match: match(four) }, 'me')).toMatchObject({ avatars: ['AA', 'BB'], extra: 2, foot: null });
  });
});

it('gates tournament readiness on date of birth and gender', () => {
  expect(checklist({ sport: 'badminton' })).toMatchObject({ done: 2, ready: false });
  expect(checklist({ sport: 'badminton', dateOfBirth: '2000-01-01', gender: 'male' })).toMatchObject({ done: 4, ready: true });
});

it('keeps only upcoming and running events, running first', () => {
  const t = (id: string, status: string, startDate: string) => ({ _id: id, status, startDate }) as never;
  expect(railTournaments([t('a', 'completed', '2026-01-01'), t('b', 'registration_open', '2026-11-01'), t('c', 'ongoing', '2026-12-01'), t('d', 'registration_open', '2026-10-25')]).map((x: { _id: string }) => x._id)).toEqual(['c', 'd', 'b']);
});
