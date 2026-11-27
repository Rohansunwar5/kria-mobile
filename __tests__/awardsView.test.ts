import type { Title } from '../src/api/profileApi';
import { buildAwards, honourAward, knockoutAwards, lockedHonours, milestoneAwards, titleAward } from '../src/lib/awardsView';

const ko = (id: string, name: string, sport: 'badminton' | 'cricket') => ({ _id: id, name, sport }) as never;
const totals = { played: 85, won: 53, sports: 3 };
const ach = (id: string, earned: boolean, progress: number, target: number) => ({ id, label: id, earned, progress, target });
const build = (over: Partial<Parameters<typeof buildAwards>[0]> = {}) =>
  buildAwards({ titles: [], honors: [], achievements: [], knockouts: [], totals, ...over });

const winner = (over: Partial<Title> = {}): Title => ({ place: 'winner', categoryName: 'MD', tournamentName: 'Cup', ...over });
const runnerUp = (over: Partial<Title> = {}): Title => ({ place: 'runner_up', categoryName: 'MS', tournamentName: 'Cup', ...over });

describe('titles', () => {
  it('renders a winner in gold', () => {
    expect(titleAward(winner(), 0)).toMatchObject({
      shape: 'shield', metal: 'gold', name: 'Champion · MD', context: 'Cup', tier: 'Tournament title',
      description: 'Won at Cup.', criteria: 'Win a tournament category', status: { label: 'Won at', value: 'Cup' },
    });
  });
  it('renders a runner-up in silver', () => {
    expect(titleAward(runnerUp(), 0)).toMatchObject({
      shape: 'shield', metal: 'silver', name: 'Runner-up · MS', context: 'Cup', tier: 'Tournament title',
      description: 'Lost the final at Cup.', criteria: 'Reach a tournament category final',
    });
  });
  it('links a title to its tournament only when it carries one', () => {
    expect(titleAward(winner({ tournamentId: 't1' }), 0).tournamentId).toBe('t1');
    expect(titleAward(winner(), 0).tournamentId).toBeUndefined();
  });
  it('survives a legacy title with no ids or date', () => {
    expect(titleAward(winner(), 0).earned).toBe(true);
  });
  it('names a title plainly when the server sent no category', () => {
    expect(titleAward({ place: 'winner' }, 0).name).toBe('Champion');
  });
  it('features a winner over a newer runner-up', () => {
    const a = build({ titles: [winner({ awardedAt: '2025-01-01' }), runnerUp({ awardedAt: '2026-10-01' })] });
    // Name as well as metal: every title used to render gold, so metal alone passed by accident.
    expect(a.featured!.award).toMatchObject({ metal: 'gold', name: 'Champion · MD' });
  });
  it('features the newest by awardedAt among winners, not the last in the list', () => {
    const a = build({ titles: [winner({ categoryName: 'New', awardedAt: '2026-10-01' }), winner({ categoryName: 'Old', awardedAt: '2024-01-01' })] });
    expect(a.featured!.award.name).toBe('Champion · New');
  });
  it('sorts an undated legacy title after a dated one', () => {
    const a = build({ titles: [winner({ categoryName: 'Dated', awardedAt: '2024-01-01' }), winner({ categoryName: 'Legacy' })] });
    expect(a.featured!.award.name).toBe('Champion · Dated');
  });
  it('falls back to the newest runner-up when there is no win', () => {
    const a = build({ titles: [runnerUp({ categoryName: 'New', awardedAt: '2026-10-01' }), runnerUp({ categoryName: 'Old', awardedAt: '2024-01-01' })] });
    expect(a.featured!.award.name).toBe('Runner-up · New');
  });
});

describe('honours', () => {
  it('uses the icon for a known key', () => {
    const a = honourAward({ title: 'Player of the Match', badge: 'player-of-the-match' }, 0, []);
    expect(a.icon).toBe('star');
    expect(a.glyph).toBeUndefined();
  });
  it('centurion is a glyph with no icon', () => {
    const a = honourAward({ title: 'Centurion', badge: 'centurion' }, 0, []);
    expect(a.glyph).toBe('100');
    expect(a.icon).toBeUndefined();
  });
  it('an unknown key falls back to a monogram', () => {
    expect(honourAward({ title: 'Smash King', badge: 'mystery' }, 0, []).glyph).toBe('SK');
  });
  // SERVER-GAPS #8: an honour says where it was earned, and links there.
  it('an organiser honour names its tournament, and links to it', () => {
    const a = honourAward({ title: 'Season MVP', badge: 'season-mvp', tournamentId: 't1', eventName: 'Indiranagar Smash Open' }, 0, []);
    expect(a).toMatchObject({
      context: 'Indiranagar Smash Open', tournamentId: 't1', status: { label: 'Earned at', value: 'Indiranagar Smash Open' },
    });
  });
  it('a knockout honour names its knockout without the /mine list', () => {
    const a = honourAward({ title: 'Fair Play · Cup', badge: 'fair-play', ref: 'k9', eventName: 'Cup', sport: 'badminton' }, 0, []);
    expect(a).toMatchObject({ context: 'Cup', status: { label: 'Earned at', value: 'Cup' } });
  });
  it('locked honours carry the same icons', () => {
    const l = lockedHonours();
    expect(l).toHaveLength(13);
    expect(l.find((x) => x.key === 'locked-hat-trick')?.icon).toBe('counter_3');
    expect(l.find((x) => x.key === 'locked-centurion')).toMatchObject({ glyph: '100' });
  });
});

describe('knockouts', () => {
  const wins = (n: number) => Array.from({ length: n }, (_, i) => ({ title: `Won K${i}`, ref: `k${i}` }));
  const kos = [ko('k0', 'K0', 'badminton'), ko('k1', 'K1', 'badminton')];
  it('two wins in a sport', () => {
    const [a] = knockoutAwards(wins(2), kos);
    expect(a).toMatchObject({ tier: 'Quick knockout · ×2', status: { label: 'Earned at', value: 'K0, K1' }, count: 2 });
  });
  it('one win', () => {
    expect(knockoutAwards(wins(1), kos)[0].tier).toBe('Quick knockout');
  });
  it('an old win past the /mine list still groups under its sport', () => {
    const [a] = knockoutAwards([{ title: 'Won Old', ref: 'kx', eventName: 'Old Cup', sport: 'cricket' }], []);
    expect(a).toMatchObject({ key: 'ko-cricket', status: { value: 'Old Cup' } });
  });
});

describe('milestones', () => {
  const m = (a: ReturnType<typeof ach>[]) => Object.fromEntries(milestoneAwards(a, totals).map((x) => [x.key, x.status?.value]));
  it('earned ones show the real count', () => {
    expect(m([ach('matches-50', true, 50, 50), ach('wins-25', true, 25, 25), ach('sports-2', true, 2, 2)])).toEqual({
      'matches-50': '85 played', 'wins-25': '53 won', 'sports-2': '3 sports played',
    });
  });
  it('locked ones show n of target', () => {
    expect(m([ach('matches-100', false, 85, 100)])['matches-100']).toBe('85 of 100');
  });
  it('orders earned first, then closest', () => {
    const order = milestoneAwards([ach('matches-50', false, 0, 50), ach('sports-2', false, 1, 2), ach('wins-25', true, 25, 25)], totals).map((x) => x.key);
    expect(order).toEqual(['wins-25', 'sports-2', 'matches-50']);
  });
});

describe('featured', () => {
  const honors = [{ title: 'Fair', badge: 'fair-play' }, { title: 'Last honour', badge: 'hat-trick' }, { title: 'Won K', badge: 'knockout-winner' }];
  // Undated (legacy), so the tie goes to the later-appended one, as it always has.
  const titles = [winner({ categoryName: 'A', tournamentName: 'T1' }), winner({ categoryName: 'B', tournamentName: 'T2' })];
  it('latest title first', () => {
    expect(build({ titles, honors }).featured).toMatchObject({ label: 'Latest title', award: { name: 'Champion · B' } });
  });
  it('then latest honour', () => {
    expect(build({ honors }).featured).toMatchObject({ label: 'Latest honour', award: { name: 'Last honour' } });
  });
  it('the latest honour is the newest by date, not by order', () => {
    const dated = [
      { title: 'Newer', badge: 'fair-play', awardedAt: '2026-05-01T00:00:00Z' },
      { title: 'Older', badge: 'hat-trick', awardedAt: '2026-01-01T00:00:00Z' },
    ];
    expect(build({ honors: dated }).featured).toMatchObject({ label: 'Latest honour', award: { name: 'Newer' } });
  });
  it('then knockout winner', () => {
    expect(build({ honors: [honors[2]] }).featured).toMatchObject({ label: 'Knockout winner' });
  });
  it('nothing earned: closest first award', () => {
    const f = build({ achievements: [ach('matches-50', false, 0, 50), ach('sports-2', false, 1, 2)] }).featured;
    expect(f).toMatchObject({ label: 'Closest first award', award: { key: 'sports-2', metal: 'locked', progress: 0.5 } });
  });
  it('only milestones earned: next milestone', () => {
    const a = build({ achievements: [ach('wins-25', true, 25, 25), ach('matches-50', false, 10, 50), ach('sports-2', false, 1, 2)] });
    expect(a.featured).toMatchObject({ label: 'Next milestone', award: { key: 'sports-2' } });
    expect(a.earned).toBe(1);
  });
});

describe('reveal identity and copy (reward spec C1, C4)', () => {
  const { hasDot, nextReveal, ordinal, totalsFrom } = jest.requireActual('../src/lib/awardsView') as typeof import('../src/lib/awardsView');
  type States = Map<string, 'new' | 'announced' | 'opened'>;
  const a2 = (id: string, label: string, progress: number, target: number) => ({ id, label, progress, target, earned: progress >= target });
  const make = () => buildAwards({
    titles: [{ place: 'winner', tournamentId: 't1', categoryId: 'c1', tournamentName: 'Kria City Open 2026', categoryName: "Women's singles", awardedAt: '2026-11-24T10:00:00Z' }],
    honors: [
      { title: 'Best Player', badge: 'season-mvp', tournamentId: 't1', eventName: 'Kria City Open 2026', awardedAt: '2026-11-20T10:00:00Z' },
      { title: 'Won Sunday Smash', badge: 'knockout-winner', ref: 'k1', eventName: 'Sunday Smash', sport: 'badminton' },
      { title: 'Won Friday Rally', badge: 'knockout-winner', ref: 'k2', eventName: 'Friday Rally', sport: 'badminton' },
    ],
    achievements: [a2('matches-50', 'Play 50 matches', 50, 50), a2('matches-100', 'Play 100 matches', 50, 100)],
    knockouts: [], totals: { played: 50, won: 30, sports: 1 },
  });

  it('gives every earned award stable keys and reveal copy', () => {
    const a = make();
    expect(a.titles[0].seenKeys).toEqual(['title_t1_c1_winner']);
    expect(a.titles[0].reveal).toEqual({ label: 'Title · Winner', title: 'Kria City Open 2026', line: "Women's singles. Awarded 24 Nov 2026." });
    expect(a.honours[0].seenKeys).toEqual(['hon_season-mvp_t1_Best_Player']);
    expect(a.honours[0].reveal).toEqual({ label: 'Honour', title: 'Best Player', line: 'Kria City Open 2026 · Nov 2026' });
    expect(a.knockouts[0].seenKeys).toEqual(['ko_k1', 'ko_k2']);
    expect(a.knockouts[0].reveal).toEqual({ label: 'Knockout winner', title: 'Friday Rally', line: 'Your 2nd knockout win.' });
    const m50 = a.milestones.find((m) => m.key === 'matches-50')!;
    expect(m50.seenKeys).toEqual(['ach_matches-50']);
    expect(m50.reveal).toEqual({ label: 'Milestone', title: '50 matches played', line: 'Next: 100.', nextTarget: 100 });
    expect(a.milestones.find((m) => m.key === 'matches-100')!.seenKeys).toEqual([]);
    expect(lockedHonours().every((l) => l.seenKeys.length === 0)).toBe(true);
  });

  it('a runner-up title, an undated title and a legacy title', () => {
    expect(titleAward({ place: 'runner_up', tournamentId: 't', categoryId: 'c', tournamentName: 'Cup', categoryName: 'MS' }, 0).reveal)
      .toEqual({ label: 'Title · Runner-up', title: 'Cup', line: 'MS.' });
    expect(titleAward({ place: 'winner', tournamentName: 'Old Cup' }, 0).seenKeys).toEqual([]);
  });

  it('nextReveal: title beats honour beats knockout beats milestone; the batch is every new key', () => {
    const r = nextReveal(make(), new Map() as States)!;
    expect(r.key).toBe('title_t1_c1_winner');
    expect(r.award.family).toBe('title');
    expect([...r.batch].sort()).toEqual(['ach_matches-50', 'hon_season-mvp_t1_Best_Player', 'ko_k1', 'ko_k2', 'title_t1_c1_winner'].sort());
  });

  it('announced keys are never revealed again but keep the dot; opened clears it', () => {
    const a = make();
    const states: States = new Map([['title_t1_c1_winner', 'announced']]);
    expect(nextReveal(a, states)!.key).toBe('hon_season-mvp_t1_Best_Player');
    expect(hasDot(a.titles[0], states)).toBe(true);
    expect(hasDot(a.titles[0], new Map([['title_t1_c1_winner', 'opened']]) as States)).toBe(false);
    expect(hasDot(a.milestones.find((m) => m.key === 'matches-100')!, new Map() as States)).toBe(false);
  });

  it('shows no dot for a key whose state has not loaded yet, so the grid does not flash dots (review M12)', () => {
    const a = make();
    expect(hasDot(a.titles[0], new Map() as States)).toBe(false);
    expect(hasDot(a.titles[0], new Map([['title_t1_c1_winner', 'new']]) as States)).toBe(true);
  });

  it('nothing new → null', () => {
    const a = make();
    const all = [...a.titles, ...a.honours, ...a.knockouts, ...a.milestones].flatMap((x) => x.seenKeys);
    expect(nextReveal(a, new Map(all.map((k) => [k, 'opened'])) as States)).toBeNull();
    expect(nextReveal(a, new Map(all.map((k) => [k, 'announced'])) as States)).toBeNull();
  });

  it('within titles, the newest awardedAt is revealed first', () => {
    const a = buildAwards({
      titles: [
        { place: 'winner', tournamentId: 'old', categoryId: 'c', tournamentName: 'A', categoryName: 'X', awardedAt: '2026-01-01T00:00:00Z' },
        { place: 'winner', tournamentId: 'new', categoryId: 'c', tournamentName: 'B', categoryName: 'X', awardedAt: '2026-06-01T00:00:00Z' },
      ],
      honors: [], achievements: [], knockouts: [], totals: { played: 0, won: 0, sports: 0 },
    });
    expect(nextReveal(a, new Map() as States)!.key).toBe('title_new_c_winner');
  });

  it('ordinal', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th']);
  });

  it('totalsFrom sums played and won and counts sports played', () => {
    const sp = (sport: string, played: number, won: number) => ({ sport, played, decided: played, won, lost: played - won, tied: 0, noResult: 0, winRate: 0 });
    expect(totalsFrom([sp('badminton', 10, 6), sp('cricket', 4, 1), sp('table_tennis', 0, 0)])).toEqual({ played: 14, won: 7, sports: 2 });
  });
});
