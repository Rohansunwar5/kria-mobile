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
