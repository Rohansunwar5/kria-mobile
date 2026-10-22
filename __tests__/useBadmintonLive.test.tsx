import { act, renderHook, waitFor } from '@testing-library/react-native';
import { getBadmintonMatch } from '@/api/badmintonMatch';
import { acquireSocket, releaseSocket, socket } from '@/lib/socket';
import { useBadmintonLive } from '@/lib/useBadmintonLive';

jest.mock('@/api/badmintonMatch', () => ({ getBadmintonMatch: jest.fn() }));
jest.mock('@/lib/socket', () => {
  const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
  return {
    acquireSocket: jest.fn(),
    releaseSocket: jest.fn(),
    socket: {
      connected: true,
      emit: jest.fn(),
      on: jest.fn((e: string, fn: (...a: unknown[]) => void) => { (handlers[e] ||= []).push(fn); }),
      off: jest.fn((e: string, fn: (...a: unknown[]) => void) => { handlers[e] = (handlers[e] || []).filter((h) => h !== fn); }),
      __emit: (e: string, p?: unknown) => (handlers[e] || []).forEach((h) => h(p)),
      __count: (e: string) => (handlers[e] || []).length,
    },
  };
});
const server = socket as unknown as { connected: boolean; emit: jest.Mock; __emit: (e: string, p?: unknown) => void; __count: (e: string) => number };
const EVENTS = ['score:update', 'connect', 'disconnect', 'connect_error'];
const get = getBadmintonMatch as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue({ _id: 'm1', status: 'in_progress' });
});

it('acquires, joins, then leaves and releases on unmount', async () => {
  const { result, unmount } = renderHook(() => useBadmintonLive('m1'));
  await waitFor(() => expect(result.current.match?._id).toBe('m1'));
  expect(acquireSocket).toHaveBeenCalledTimes(1);
  expect(server.emit).toHaveBeenCalledWith('join:match', { matchId: 'm1' });
  expect(EVENTS.map(server.__count)).toEqual([1, 1, 1, 1]);
  unmount();
  expect(server.emit).toHaveBeenCalledWith('leave:match', { matchId: 'm1' });
  expect(releaseSocket).toHaveBeenCalledTimes(1);
  expect(EVENTS.map(server.__count)).toEqual([0, 0, 0, 0]);
});

it('score:update replaces the match', async () => {
  const { result } = renderHook(() => useBadmintonLive('m1'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => server.__emit('score:update', { match: { _id: 'm1', status: 'completed' } }));
  expect(result.current.match?.status).toBe('completed');
});

it("ignores another match's score:update (a board stacked over this one shares the socket)", async () => {
  const { result } = renderHook(() => useBadmintonLive('m1'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => server.__emit('score:update', { match: { _id: 'm2', status: 'completed' } }));
  expect(result.current.match).toMatchObject({ _id: 'm1', status: 'in_progress' });
});

it('starts connected before the socket has, and a failed connect turns it off', async () => {
  server.connected = false;
  const { result } = renderHook(() => useBadmintonLive('m1'));
  server.connected = true;
  expect(result.current.connected).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => server.__emit('connect_error'));
  expect(result.current.connected).toBe(false);
  await act(async () => server.__emit('connect'));
  expect(result.current.connected).toBe(true);
});

it('disconnect then connect: connected flips, re-joins and reloads', async () => {
  const { result } = renderHook(() => useBadmintonLive('m1'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => server.__emit('disconnect'));
  expect(result.current.connected).toBe(false);
  server.emit.mockClear();
  get.mockClear();
  act(() => server.__emit('connect'));
  expect(result.current.connected).toBe(true);
  expect(server.emit).toHaveBeenCalledWith('join:match', { matchId: 'm1' });
  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
});
