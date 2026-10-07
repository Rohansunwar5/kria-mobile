import {
  bracketColumns, championName, drawBlocker, entrantName, entrantShortName, isPlayable, unpairedPlayers, awardablePlayers, formatLabel, teamPlayers, awardBadges,
} from '@/lib/quickKnockoutView';
import type { QuickKnockout } from '@/api/quickKnockout';

const k = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k1', hostId: 'h1', name: 'Sunday Smash', sport: 'badminton', format: 'doubles',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, status: 'waiting',
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta' },
    { playerKey: 'b', playerId: 'p2', displayName: 'Priya Rao' },
    { playerKey: 'c', displayName: 'Sam' },
  ],
  pairs: [{ pairId: 'x', playerKeys: ['a', 'b'], byHost: true }],
  entrants: [{ entrantId: 'e1', playerKeys: ['a', 'b'] }, { entrantId: 'e2', playerKeys: ['c'] }],
  fixtures: [
    { fixtureId: 'f2', round: 2, position: 0, bye: false },
    { fixtureId: 'f1', round: 1, position: 0, entrantA: 'e1', entrantB: 'e2', bye: false, quickMatchId: 'm1' },
  ],
  roundNames: ['Semi-Final', 'Final'],
  awards: [],
  createdAt: '2026-10-07T00:00:00.000Z',
  ...over,
});

it('names entrants: full name alone, first names for pairs', () => {
  expect(entrantName(k(), 'e1')).toBe('Arjun & Priya');
  expect(entrantName(k(), 'e2')).toBe('Sam');
  expect(entrantName(k(), undefined)).toBe('');
  expect(entrantShortName(k({ format: 'singles', entrants: [{ entrantId: 'e3', playerKeys: ['a'] }] }), 'e3')).toBe('Arjun');
});

it('explains why Draw is blocked', () => {
  expect(drawBlocker(k())).toBe('Add one more player or remove one to draw.');
  expect(drawBlocker(k({ format: 'singles' }))).toBe(null);
  expect(drawBlocker(k({ format: 'singles', players: k().players.slice(0, 2) }))).toBe('A knockout needs at least 3 entrants.');
  const four = [...k().players, { playerKey: 'd', displayName: 'Dev' }];
  expect(drawBlocker(k({ players: four }))).toBe('A knockout needs at least 3 entrants.');
});

it('lists players not in a host pair', () => {
  expect(unpairedPlayers(k()).map((p) => p.playerKey)).toEqual(['c']);
});

it('lays the bracket out by round with names', () => {
  const cols = bracketColumns(k());
  expect(cols.map((c) => c.name)).toEqual(['Semi-Final', 'Final']);
  expect(cols[0].fixtures.map((f) => f.fixtureId)).toEqual(['f1']);
});

it('marks a fixture with a match and no winner as playable', () => {
  const [f2, f1] = k().fixtures;
  expect(isPlayable(f1)).toBe(true);
  expect(isPlayable(f2)).toBe(false);
  expect(isPlayable({ ...f1, winnerEntrantId: 'e1' })).toBe(false);
});

it('names the champion', () => {
  expect(championName(k({ championEntrantId: 'e1' }))).toBe('Arjun & Priya');
  expect(championName(k())).toBe('');
});

it('offers awards to Kria players other than the host', () => {
  expect(awardablePlayers(k(), 'h1').map((p) => p.playerId)).toEqual(['p2']);
});

const cricket = (over: Partial<QuickKnockout> = {}) => k({
  sport: 'cricket', format: 'teams', matchConfig: { maxOvers: 8, playersPerTeam: 3 },
  teams: [{ teamId: 't1', name: 'Strikers' }, { teamId: 't2', name: 'Royals' }, { teamId: 't3', name: 'Team 3' }],
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta', teamId: 't1' },
    { playerKey: 'b', playerId: 'p2', displayName: 'Priya Rao', teamId: 't1' },
    { playerKey: 'c', displayName: 'Sam' },
  ],
  pairs: [],
  entrants: [{ entrantId: 't1', playerKeys: ['a', 'b'] }],
  ...over,
});

it('names a cricket entrant by its team', () => {
  expect(entrantName(cricket(), 't1')).toBe('Strikers');
  expect(entrantShortName(cricket(), 't1')).toBe('Strikers');
  expect(championName(cricket({ championEntrantId: 't1' }))).toBe('Strikers');
});

it('labels the format', () => {
  expect(formatLabel(cricket())).toBe('Cricket · 8 overs');
  expect(formatLabel(k())).toBe('Doubles');
  expect(formatLabel(k({ format: 'singles' }))).toBe('Singles');
});

it('lists a team, or the Any-team pool', () => {
  expect(teamPlayers(cricket(), 't1').map((p) => p.playerKey)).toEqual(['a', 'b']);
  expect(teamPlayers(cricket()).map((p) => p.playerKey)).toEqual(['c']);
});

it('blocks a cricket Draw only when the loose players cannot lift every team to 2', () => {
  // Royals and Team 3 need 2 each; only Sam is loose.
  expect(drawBlocker(cricket())).toBe('Every team needs at least 2 players.');
  const three = ['d', 'e', 'f'].map((key) => ({ playerKey: key, displayName: key }));
  expect(drawBlocker(cricket({ players: [...cricket().players, ...three] }))).toBeNull();
  // The draw deals its own earlier placements again, so they count as loose.
  const players = [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta', teamId: 't1' },
    { playerKey: 'x', displayName: 'Xavi', teamId: 't1' },
    { playerKey: 'b', displayName: 'Bo', teamId: 't1', drawn: true },
    ...['c', 'd', 'e'].map((key) => ({ playerKey: key, displayName: key })),
  ];
  expect(drawBlocker(cricket({ players }))).toBeNull();
});

it('offers cricket three award badges, without Ace Serve', () => {
  expect(awardBadges(cricket()).map(([key]) => key)).toEqual(['iron-player', 'first-cap', 'fair-play']);
  expect(awardBadges(k()).map(([key]) => key)).toEqual(['iron-player', 'first-cap', 'ace-serve', 'fair-play']);
});
