import type { SportSummary } from '../src/api/career';
import { ALL, allSports, bestRank, formFor, rankNote, resultsBar, ringFor } from '../src/lib/profileView';

const s = (over: Partial<SportSummary>): SportSummary => ({ sport: 'badminton', played: 0, decided: 0, won: 0, lost: 0, tied: 0, noResult: 0, winRate: 0, ...over });

it('totals all sports from the counts, not by averaging rates', () => {
  const all = allSports([s({ played: 10, decided: 10, won: 9, lost: 1 }), s({ sport: 'cricket', played: 31, decided: 30, won: 6, lost: 24, noResult: 1 })]);
  expect(all).toMatchObject({ sport: ALL, played: 41, decided: 40, won: 15 });
  expect(all.winRate).toBeCloseTo(15 / 40);
});

it('rings a rate, a path to 10 for a short rankable sport, and a rate for an unrankable one', () => {
  expect(ringFor(s({ decided: 12, won: 9, winRate: 0.75 }))).toEqual({ fraction: 0.75, label: '75%', muted: false });
  expect(ringFor(s({ decided: 4, won: 3, winRate: 0.75 }))).toEqual({ fraction: 0.4, label: '4/10', muted: true });
  expect(ringFor(s({ sport: 'table_tennis', decided: 4, won: 3, winRate: 0.75 })).label).toBe('75%');
  expect(ringFor(s({ sport: ALL }))).toMatchObject({ label: '—', muted: true });
});

it('splits results and form by sport, newest first', () => {
  expect(resultsBar(s({ won: 3, lost: 1 })).map((b) => b.share)).toEqual([0.75, 0.25, 0, 0]);
  const recent = [
    { _id: '1', sport: 'cricket', result: 'won' },
    { _id: '2', sport: 'badminton', result: 'lost' },
    { _id: '3', sport: 'badminton', result: 'won' },
  ] as never;
  expect(formFor(recent, 'badminton')).toMatchObject({ note: '1 of last 2 won' });
  expect(formFor(recent, ALL).rows).toHaveLength(3);
});

describe('rankNote on another player\'s profile ("they")', () => {
  const row = (playerId: string, winRate: number) => ({ playerId, firstName: 'Dev', lastName: 'Shah', played: 20, decided: 20, won: 10, winRate }) as never;
  const ranked = s({ decided: 12, won: 9, winRate: 0.75 });
  const branches = {
    unranked: rankNote(s({ sport: 'table_tennis', decided: 4 }), undefined, 'p1', 'they'),
    short: rankNote(s({ decided: 3 }), undefined, 'p1', 'they'),
    loading: rankNote(ranked, undefined, 'p1', 'they'),
    unavailable: rankNote(ranked, null, 'p1', 'they'),
    outside: rankNote(ranked, Array.from({ length: 50 }, (_, i) => row(`x${i}`, 0.9)), 'p1', 'they'),
    refreshing: rankNote(ranked, [row('x', 0.9)], 'p1', 'they'),
    top: rankNote(ranked, [row('p1', 0.75)], 'p1', 'they'),
    level: rankNote(ranked, [row('x', 0.75), row('p1', 0.75)], 'p1', 'they'),
    behind: rankNote(ranked, [row('x', 0.8), row('p1', 0.75)], 'p1', 'they'),
  };

  it('reads in the third person on every branch', () => {
    for (const n of Object.values(branches)) expect(`${n.title} ${n.line}`).not.toMatch(/\byou/i);
    expect(branches.short.line).toBe('3 of 10 decided matches. 7 more and they appear on the badminton board.');
    expect(branches.unranked.line).toBe("Kria doesn't rank table tennis yet.");
    expect(branches.loading.line).toBe('Loading the board…');
    expect(branches.unavailable.line).toBe('Rankings unavailable right now');
    expect(branches.outside.title).toBe('Outside the top 50 in badminton');
    expect(branches.refreshing.line).toBe('Rankings refresh every few minutes');
    expect(branches.top).toMatchObject({ title: '#1 in badminton on Kria', line: 'Top of the badminton board' });
    expect(branches.level.line).toBe('Level with #1 Dev Shah on win rate');
    expect(branches.behind.line).toBe('5.0 pts behind #1 Dev Shah');
  });

  it('keeps "you" on your own profile', () => {
    expect(rankNote(s({ decided: 3 }), undefined, 'p1').line).toBe('3 of 10 decided matches. 7 more and you appear on the badminton board.');
  });
});

it('picks your best rank across boards', () => {
  const p = (id: string) => ({ playerId: id }) as never;
  expect(bestRank([s({}), s({ sport: 'cricket' })], { badminton: [p('a'), p('b'), p('me')], cricket: [p('me')] }, 'me')).toEqual({ rank: 1, sport: 'cricket' });
  expect(bestRank([s({})], { badminton: null }, 'me')).toBeNull();
});

import type { RecentMatch } from '../src/api/career';
import { groupByMonth, groupByYear, historySports, historyStrip, matchSports, recordLine } from '../src/lib/profileView';
import type { TournamentHistoryEntry } from '../src/store/slices/registrationSlice';

const he = (o: Partial<TournamentHistoryEntry> & { sport?: string; start?: string }): TournamentHistoryEntry =>
  ({ _id: 'x', status: 'approved', createdAt: '2024-01-01T00:00:00Z', ...o, tournament: o.start || o.sport ? { _id: 't', name: 'T', sport: o.sport ?? 'cricket', startDate: o.start ?? '', endDate: '', status: 'completed' } : undefined }) as TournamentHistoryEntry;

describe('history helpers', () => {
  it('historyStrip sums stats, missing as 0', () => {
    const l = [he({ stats: { matchesPlayed: 4, matchesWon: 3, pointsContributed: 0 } }), he({}), he({ stats: { matchesPlayed: 2, matchesWon: 1, pointsContributed: 0 } })];
    expect(historyStrip(l)).toEqual({ entered: 3, matches: 6, won: 4 });
  });
  it('historySports is distinct, first-seen', () => {
    expect(historySports([he({ sport: 'cricket' }), he({}), he({ sport: 'badminton' }), he({ sport: 'cricket' })])).toEqual(['cricket', 'badminton']);
  });
  it('groupByYear uses startDate then createdAt, newest first', () => {
    const a = he({ _id: 'a', start: '2025-03-01T00:00:00Z' });
    const b = he({ _id: 'b', start: '2026-03-01T00:00:00Z' });
    const c = he({ _id: 'c', createdAt: '2025-08-01T00:00:00Z' });
    const g = groupByYear([a, b, c]);
    expect(g.map((y) => y.year)).toEqual(['2026', '2025']);
    expect(g[1].items.map((e) => e._id)).toEqual(['c', 'a']);
  });
  it('recordLine', () => {
    expect(recordLine({ stats: { matchesPlayed: 4, matchesWon: 3 } })).toBe('4 played · 3 won');
    expect(recordLine({})).toBe('Not played yet');
    expect(recordLine({ stats: { matchesPlayed: 0, matchesWon: 0 } })).toBe('Not played yet');
  });
});

describe('match helpers', () => {
  const m = (id: string, playedAt: string, sport = 'badminton') => ({ _id: id, matchId: id, sport, context: 'quick', result: 'won', playedAt }) as RecentMatch;
  it('groupByMonth labels and orders newest first', () => {
    const g = groupByMonth([m('a', '2026-09-10T12:00:00Z'), m('b', '2026-10-20T12:00:00Z'), m('c', '2026-10-02T12:00:00Z')]);
    expect(g.map((x) => x.month)).toEqual(['October 2026', 'September 2026']);
    expect(g[0].items.map((x) => x._id)).toEqual(['b', 'c']);
  });
  it('matchSports distinct', () => {
    expect(matchSports([m('a', '2026-10-01T12:00:00Z', 'cricket'), m('b', '2026-10-01T12:00:00Z'), m('c', '2026-10-01T12:00:00Z', 'cricket')])).toEqual(['cricket', 'badminton']);
  });
});
