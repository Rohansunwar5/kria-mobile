import { awardSeenKey, loadStates, markAnnounced, markOpened, resetRewardCache, seedIfNeeded } from '@/lib/rewardSeen';

test('keys per source', () => {
  expect(awardSeenKey({ kind: 'achievement', id: 'matches-50' })).toBe('ach_matches-50');
  expect(awardSeenKey({ kind: 'title', title: { place: 'winner', tournamentId: 't1', categoryId: 'c1' } })).toBe('title_t1_c1_winner');
  expect(awardSeenKey({ kind: 'title', title: { place: 'winner' } })).toBeNull();
  expect(awardSeenKey({ kind: 'honour', honor: { title: 'Best Player', badge: 'season-mvp', tournamentId: 't9' } })).toBe('hon_season-mvp_t9_Best_Player');
  expect(awardSeenKey({ kind: 'honour', honor: { title: 'Won Sunday Smash', badge: 'knockout-winner', ref: 'k7' } })).toBe('ko_k7');
  expect(awardSeenKey({ kind: 'honour', honor: { title: 'Won it', badge: 'knockout-winner' } })).toBeNull();
});

test('keys are sanitised and capped at 120 characters', () => {
  const k = awardSeenKey({ kind: 'honour', honor: { title: 'MVP — Round #1 '.repeat(20), badge: 'season-mvp', tournamentId: 't' } })!;
  expect(k).toMatch(/^[A-Za-z0-9._-]+$/);
  expect(k.length).toBeLessThanOrEqual(120);
});

test('new → announced → opened, read back from the store', async () => {
  await markAnnounced('p1', ['ach_a']);
  expect((await loadStates('p1', ['ach_a', 'ach_b'])).get('ach_a')).toBe('announced');
  expect((await loadStates('p1', ['ach_b'])).get('ach_b')).toBe('new');
  await markOpened('p1', ['ach_a']);
  resetRewardCache();
  expect((await loadStates('p1', ['ach_a'])).get('ach_a')).toBe('opened');
});

test('opened implies announced', async () => {
  await markOpened('p5', ['ko_9']);
  resetRewardCache();
  expect((await loadStates('p5', ['ko_9'])).get('ko_9')).toBe('opened');
});

test('state is per player', async () => {
  await markOpened('p2', ['ach_x']);
  expect((await loadStates('p3', ['ach_x'])).get('ach_x')).toBe('new');
});

test('seeding opens everything already earned, once', async () => {
  expect(await seedIfNeeded('p4', ['ach_a', 'ko_1'])).toBe(true);
  expect([...(await loadStates('p4', ['ach_a', 'ko_1'])).values()]).toEqual(['opened', 'opened']);
  expect(await seedIfNeeded('p4', ['ach_a'])).toBe(false);
});
