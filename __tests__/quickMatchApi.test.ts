import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import {
  createQuickMatch,
  listMyQuickMatches,
  getQuickMatchByCode,
  claimQuickMatchSlot,
  recordQuickPoint,
  undoQuickPoint,
} from '@/api/quickMatch';
import { searchPlayers } from '@/api/playerSearch';

const match = (over: Record<string, unknown> = {}) => ({
  _id: 'm1',
  hostId: 'h1',
  sport: 'badminton',
  joinCode: 'ABC234',
  status: 'live',
  sides: [
    { sideId: 's1', name: 'A', slots: [{ slotId: 'sl1', playerId: 'h1', displayName: 'Host' }] },
    { sideId: 's2', name: 'B', slots: [{ slotId: 'sl2', displayName: 'Open' }] },
  ],
  gameScores: [],
  matchConfig: { bestOf: 3, pointsToWin: 21 },
  createdAt: '2026-09-09T00:00:00.000Z',
  ...over,
});

const wrap = (payload: unknown) => ({ data: { data: payload } });

describe('quick match api', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('unwraps the doubly-nested payload the server sends', async () => {
    mock.onGet('/quick-match/by-code/ABC234').reply(200, wrap(match()));

    const result = await getQuickMatchByCode('ABC234');

    expect(result._id).toBe('m1');
    expect(result.sides).toHaveLength(2);
  });

  it('unwraps an array payload for the list endpoint', async () => {
    mock.onGet('/quick-match/mine').reply(200, wrap([match(), match({ _id: 'm2' })]));

    const result = await listMyQuickMatches();

    expect(result).toHaveLength(2);
    expect(result[1]._id).toBe('m2');
  });

  it('returns an empty list rather than throwing when the payload is empty', async () => {
    mock.onGet('/quick-match/mine').reply(200, wrap([]));
    await expect(listMyQuickMatches()).resolves.toEqual([]);
  });

  it('returns every sport — the list is no longer badminton-scoped', async () => {
    // Spec 3b §4.1 deliberately widened this: quick cricket's mobile surface
    // is what the badminton-only filter was always waiting on.
    mock.onGet('/quick-match/mine').reply(200, wrap([
      match({ _id: 'm1', sport: 'badminton' }),
      match({ _id: 'm2', sport: 'cricket' }),
    ]));

    const result = await listMyQuickMatches();

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.sport)).toEqual(['badminton', 'cricket']);
  });

  it('hits unprefixed routes — this server mounts no /api/v1', async () => {
    mock.onGet('/quick-match/mine').reply(200, wrap([]));
    await listMyQuickMatches();
    expect(mock.history.get[0].url).toBe('/quick-match/mine');
  });

  it('uppercases a join code on the way out', async () => {
    mock.onGet(/\/quick-match\/by-code\/.*/).reply(200, wrap(match()));
    await getQuickMatchByCode('abc234');
    expect(mock.history.get[0].url).toBe('/quick-match/by-code/ABC234');
  });

  it('sends displayName on every slot, including slots that carry a playerId', async () => {
    // createQuickMatchValidator enforces notEmpty() on displayName
    // unconditionally, so omitting it for a real player is a 422.
    mock.onPost('/quick-match').reply(200, wrap(match()));

    await createQuickMatch({
      sport: 'badminton',
      sides: [
        { name: 'A', slots: [{ playerId: 'h1', displayName: 'Rohan Sunwar' }] },
        { name: 'B', slots: [{ displayName: 'Open' }] },
      ],
      matchConfig: { bestOf: 1, pointsToWin: 11 },
    });

    const sent = JSON.parse(mock.history.post[0].data);
    expect(sent.sides[0].slots[0].displayName).toBe('Rohan Sunwar');
    expect(sent.sides[0].slots[0].playerId).toBe('h1');
    expect(sent.matchConfig).toEqual({ bestOf: 1, pointsToWin: 11 });
  });

  it('claims a slot by code with the slotId in the body', async () => {
    mock.onPost('/quick-match/join/ABC234').reply(200, wrap(match()));

    await claimQuickMatchSlot('ABC234', 'sl2');

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ slotId: 'sl2' });
  });

  it('always sends delta 1 — there is no negative-point affordance', async () => {
    // delta -1 cannot repair a decided match (applyPoint short-circuits), so
    // undo is a separate endpoint and -1 is never sent.
    mock.onPost('/quick-match/m1/badminton/point').reply(200, wrap(match()));

    await recordQuickPoint('m1', 2);

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ side: 2, delta: 1 });
  });

  it('posts undo with no body', async () => {
    mock.onPost('/quick-match/m1/badminton/undo').reply(200, wrap(match()));
    await undoQuickPoint('m1');
    expect(mock.history.post[0].url).toBe('/quick-match/m1/badminton/undo');
  });
});

describe('player search api', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('passes the query as ?q and unwraps the hits', async () => {
    mock.onGet('/player/search').reply(200, wrap([
      { _id: 'p1', firstName: 'Rohan', lastName: 'Sunwar' },
    ]));

    const hits = await searchPlayers('roh');

    expect(hits).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ q: 'roh' });
  });

  it('returns an empty list for a query the server rejects', async () => {
    mock.onGet('/player/search').reply(422, { message: 'q must be at least 3 characters.' });
    await expect(searchPlayers('ro')).resolves.toEqual([]);
  });

  it('does not swallow a 401 as an empty list — an expired token is a real error', async () => {
    mock.onGet('/player/search').reply(401, { message: 'Unauthorized' });
    await expect(searchPlayers('roh')).rejects.toBeTruthy();
  });

  it('does not swallow a 5xx as an empty list', async () => {
    mock.onGet('/player/search').reply(500, { message: 'Internal error' });
    await expect(searchPlayers('roh')).rejects.toBeTruthy();
  });
});
