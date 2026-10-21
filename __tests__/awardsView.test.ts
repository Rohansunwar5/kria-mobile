import { buildAwards, lockedHonours, milestoneAwards, titleAward } from '../src/lib/awardsView';

const ko = (id: string, name: string, sport: 'badminton' | 'cricket') => ({ _id: id, name, sport }) as never;

it('reads the server title string into name and tournament', () => {
  expect(titleAward("Winner of Men's Doubles at HSR Shuttle Cup 2026", 0)).toMatchObject({
    name: "Winner of Men's Doubles", context: 'HSR Shuttle Cup 2026', shape: 'shield', metal: 'gold',
  });
  expect(titleAward('Something else', 1)).toMatchObject({ name: 'Something else', context: '' });
});

it('groups knockout wins per sport as one hexagon with a count, falling back when the knockout is gone', () => {
  const a = buildAwards({
    titles: [],
    honors: [
      { title: 'Won Sunday Smash #14', badge: 'knockout-winner', ref: 'k14' },
      { title: 'Won Sunday Smash #11', badge: 'knockout-winner', ref: 'k11' },
      { title: 'Won Old Cup', badge: 'knockout-winner', ref: 'gone' },
      { title: 'Player of the Match', badge: 'player-of-the-match' },
    ],
    achievements: [],
    knockouts: [ko('k14', 'Sunday Smash #14', 'badminton'), ko('k11', 'Sunday Smash #11', 'badminton')],
  });
  expect(a.knockouts.map((k) => [k.icon, k.count, k.status?.value])).toEqual([
    ['sports_tennis', 2, 'Sunday Smash #14, Sunday Smash #11'],
    ['emoji_events', 1, 'Old Cup'],
  ]);
  expect(a.honours).toHaveLength(1);
  expect(a.honours[0]).toMatchObject({ glyph: 'POM', shape: 'rosette', context: 'Given by an organiser' });
  expect(a.earned).toBe(4);
  expect(a.featured).toMatchObject({ label: 'Signature honour', award: { name: 'Player of the Match' } });
});

it('orders milestones earned first, then closest, and features the closest for a new player', () => {
  const achievements = [
    { id: 'matches-50', label: 'Play 50 matches', earned: false, progress: 0, target: 50 },
    { id: 'sports-2', label: 'Play 2 different sports', earned: false, progress: 1, target: 2 },
    { id: 'wins-25', label: 'Win 25 matches', earned: true, progress: 25, target: 25 },
  ];
  expect(milestoneAwards(achievements).map((m) => m.key)).toEqual(['wins-25', 'sports-2', 'matches-50']);
  const fresh = buildAwards({ titles: [], honors: [], achievements: achievements.map((x) => ({ ...x, earned: false, progress: x.id === 'sports-2' ? 1 : 0 })), knockouts: [] });
  expect(fresh.featured).toMatchObject({ label: 'Closest first award', award: { key: 'sports-2', metal: 'locked', progress: 0.5 } });
  expect(fresh.earned).toBe(0);
});

it('shows every honour the server can give, locked', () => {
  expect(lockedHonours()).toHaveLength(13);
});
