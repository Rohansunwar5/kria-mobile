import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { createQuickKnockout, joinQuickKnockout, resolveQuickCode, addKnockoutPlayer } from '@/api/quickKnockout';

const mock = new MockAdapter(API);
const envelope = (payload: unknown) => ({ data: { data: payload } });
afterEach(() => mock.reset());

it('creates a knockout', async () => {
  mock.onPost('/quick-knockout').reply(200, envelope({ _id: 'k1', name: 'Cup' }));
  const k = await createQuickKnockout({ format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 }, name: 'Cup' });
  expect(k._id).toBe('k1');
  expect(JSON.parse(mock.history.post[0].data)).toEqual({ format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 11 }, name: 'Cup' });
});

it('joins by code, uppercased', async () => {
  mock.onPost('/quick-knockout/join/KX4P9M').reply(200, envelope({ _id: 'k1' }));
  await joinQuickKnockout('kx4p9m');
  expect(mock.history.post[0].url).toBe('/quick-knockout/join/KX4P9M');
});

it('adds a guest or a Kria player', async () => {
  mock.onPost('/quick-knockout/k1/players').reply(200, envelope({ _id: 'k1' }));
  await addKnockoutPlayer('k1', { displayName: 'Sam' });
  await addKnockoutPlayer('k1', { playerId: 'p9' });
  expect(mock.history.post.map((r) => JSON.parse(r.data))).toEqual([{ displayName: 'Sam' }, { playerId: 'p9' }]);
});

it('resolves a code to its kind', async () => {
  mock.onGet('/quick-code/KX4P9M').reply(200, envelope({ kind: 'knockout', data: { _id: 'k1' } }));
  expect(await resolveQuickCode('kx4p9m')).toEqual({ kind: 'knockout', data: { _id: 'k1' } });
});
