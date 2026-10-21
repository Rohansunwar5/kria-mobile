import type { SportSummary } from '../src/api/career';
import { ALL, allSports, bestRank, formFor, resultsBar, ringFor } from '../src/lib/profileView';

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

it('picks your best rank across boards', () => {
  const p = (id: string) => ({ playerId: id }) as never;
  expect(bestRank([s({}), s({ sport: 'cricket' })], { badminton: [p('a'), p('b'), p('me')], cricket: [p('me')] }, 'me')).toEqual({ rank: 1, sport: 'cricket' });
  expect(bestRank([s({})], { badminton: null }, 'me')).toBeNull();
});
