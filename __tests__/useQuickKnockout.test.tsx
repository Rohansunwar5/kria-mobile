import { renderHook, act, waitFor } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { socket } from '@/lib/socket';
import { useQuickKnockout } from '@/lib/useQuickKnockout';

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/lib/socket', () => {
  const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
  return {
    socket: {
      connected: true, connect: jest.fn(), disconnect: jest.fn(), emit: jest.fn(),
      on: jest.fn((e: string, fn: (...a: unknown[]) => void) => { (handlers[e] ||= []).push(fn); }),
      off: jest.fn((e: string, fn: (...a: unknown[]) => void) => { handlers[e] = (handlers[e] || []).filter((h) => h !== fn); }),
      __emit: (e: string, payload?: unknown) => (handlers[e] || []).forEach((h) => h(payload)),
    },
  };
});
const server = socket as unknown as { __emit: (e: string, p?: unknown) => void; emit: jest.Mock };

const mock = new MockAdapter(API);
const envelope = (payload: unknown) => ({ data: { data: payload } });
const knockout = (over: Record<string, unknown> = {}) => ({
  _id: 'k1', hostId: 'h1', joinCode: 'KX4P9M', name: 'Cup', sport: 'badminton', format: 'singles',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, status: 'waiting',
  players: [{ playerKey: 'a', playerId: 'h1', displayName: 'Arjun' }], pairs: [], entrants: [], fixtures: [], roundNames: [],
  awards: [], createdAt: '2026-10-07T00:00:00.000Z', ...over,
});

beforeEach(() => jest.clearAllMocks());
afterEach(() => mock.reset());

async function opened() {
  mock.onGet('/quick-knockout/k1').reply(200, envelope(knockout()));
  const hook = renderHook(() => useQuickKnockout('k1'));
  await waitFor(() => expect(hook.result.current.knockout).not.toBeNull());
  return hook;
}

it('joins the room and shows a pushed change, keeping the host\'s code', async () => {
  const { result } = await opened();
  expect(server.emit).toHaveBeenCalledWith('join:match', { matchId: 'k1' });
  const { joinCode: _x, ...pushed } = knockout({ players: [{ playerKey: 'a', playerId: 'h1', displayName: 'Arjun' }, { playerKey: 'b', displayName: 'Sam' }] });

  act(() => server.__emit('knockout:update', { knockout: pushed }));

  expect(result.current.knockout?.players).toHaveLength(2);
  expect(result.current.knockout?.joinCode).toBe('KX4P9M');
});

it('ignores a push for another knockout', async () => {
  const { result } = await opened();
  act(() => server.__emit('knockout:update', { knockout: knockout({ _id: 'other', status: 'live' }) }));
  expect(result.current.knockout?.status).toBe('waiting');
});

it('adopts an action\'s response and surfaces a refusal', async () => {
  const { result } = await opened();
  mock.onPost('/quick-knockout/k1/draw').reply(400, { message: 'A knockout needs at least 3 entrants.' });
  await act(async () => { await result.current.draw(); });
  expect(result.current.problem).toBe('A knockout needs at least 3 entrants.');

  mock.onPost('/quick-knockout/k1/players').reply(200, envelope(knockout({ players: [{ playerKey: 'a', displayName: 'Arjun' }, { playerKey: 'c', displayName: 'Sam' }] })));
  await act(async () => { await result.current.addGuest('Sam'); });
  expect(result.current.problem).toBe('');
  expect(result.current.knockout?.players).toHaveLength(2);
});

it('leaves the room on close', async () => {
  const { unmount } = await opened();
  unmount();
  expect(server.emit).toHaveBeenCalledWith('leave:match', { matchId: 'k1' });
});
