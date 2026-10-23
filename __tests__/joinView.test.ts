import { joinView } from '@/lib/joinView';

const match = (slots2: { playerId?: string; displayName: string }[]) => ({
  kind: 'match' as const,
  data: {
    _id: 'm1', hostId: 'h', sport: 'badminton', joinCode: 'ABC234', status: 'waiting', createdAt: '',
    matchConfig: { bestOf: 3, pointsToWin: 21 },
    sides: [
      { sideId: 's1', name: 'Smash', slots: [{ slotId: 'a1', playerId: 'h', displayName: 'Arjun Rao' }] },
      { sideId: 's2', name: 'Net', slots: slots2.map((s, i) => ({ slotId: `b${i}`, ...s })) },
    ],
  } as never,
});

it('maps taken and open slots, and the header', () => {
  const v = joinView(match([{ displayName: 'Player 3' }]), 'me');
  if (v.kind !== 'match') throw new Error();
  expect(v.kicker).toBe('Quick match · Badminton');
  expect(v.title).toBe('Smash vs Net');
  expect(v.code).toBe('ABC234');
  expect(v.sides[0].slots[0]).toEqual({ slotId: 'a1', name: 'Arjun Rao', ini: 'AR', taken: true });
  expect(v.sides[1].slots[0]).toEqual({ slotId: 'b0', name: 'Player 3', ini: 'P3', taken: false });
  expect(v.full).toBe(false);
  expect(v.mine).toBe(false);
});

it('full when no slot is open; mine when a slot is mine', () => {
  const v = joinView(match([{ playerId: 'me', displayName: 'Me Me' }]), 'me');
  if (v.kind !== 'match') throw new Error();
  expect(v.full).toBe(true);
  expect(v.mine).toBe(true);
});

const ko = (over: object = {}) => ({
  kind: 'knockout' as const,
  data: {
    _id: 'k1', hostId: 'h', name: 'Sunday Cup', sport: 'badminton', format: 'singles', status: 'waiting',
    matchConfig: { bestOf: 3, pointsToWin: 21 },
    players: [{ playerKey: 'a', playerId: 'h', displayName: 'Arjun Mehta' }, { playerKey: 'g', displayName: 'Sam' }],
    ...over,
  } as never,
});

it('knockout header, host, guests, no teams for badminton', () => {
  const v = joinView(ko(), 'me');
  if (v.kind !== 'knockout') throw new Error();
  expect(v.kicker).toBe('Knockout · Badminton');
  expect(v.title).toBe('Sunday Cup');
  expect(v.host).toBe('Arjun Mehta');
  expect(v.count).toBe(2);
  expect(v.teams).toBeNull();
  expect(v.guests).toEqual([{ playerKey: 'g', name: 'Sam' }]);
  expect(v.closed).toBeNull();
  expect(v.mine).toBe(false);
});

it('host falls back to "the host"', () => {
  const v = joinView(ko({ hostId: 'zz' }), 'me');
  if (v.kind !== 'knockout') throw new Error();
  expect(v.host).toBe('the host');
});

it.each([
  ['live', 'This knockout has already started.'],
  ['completed', 'This knockout has finished.'],
  ['cancelled', 'This knockout was cancelled.'],
])('%s is closed', (status, msg) => {
  const v = joinView(ko({ status }), 'me');
  if (v.kind !== 'knockout') throw new Error();
  expect(v.closed).toBe(msg);
});

it('mine holds when closed', () => {
  const v = joinView(ko({ status: 'live', players: [{ playerKey: 'r', playerId: 'me', displayName: 'Me' }] }), 'me');
  if (v.kind !== 'knockout') throw new Error();
  expect(v.mine).toBe(true);
});

it('cricket teams with capacity', () => {
  const v = joinView(ko({
    sport: 'cricket', format: 'teams', matchConfig: { maxOvers: 8, playersPerTeam: 2 },
    teams: [{ teamId: 't1', name: 'Strikers' }, { teamId: 't2', name: 'Royals' }],
    players: [
      { playerKey: 'a', playerId: 'h', displayName: 'A', teamId: 't1' },
      { playerKey: 'b', displayName: 'B', teamId: 't1' },
    ],
  }), 'me');
  if (v.kind !== 'knockout') throw new Error();
  expect(v.format).toBe('Cricket · 8 overs · 2 a side');
  expect(v.teams).toEqual([
    { teamId: 't1', name: 'Strikers', count: 'Full', full: true },
    { teamId: 't2', name: 'Royals', count: '0/2', full: false },
  ]);
});
