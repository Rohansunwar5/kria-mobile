import { act, renderHook, waitFor } from '@testing-library/react-native';
import { getMatchLive, getScorecard } from '@/api/cricketMatch';
import { acquireSocket, releaseSocket, socket } from '@/lib/socket';
import { useCricketMatchSocket } from '@/lib/useCricketMatchSocket';

jest.mock('@/api/cricketMatch', () => ({ getMatchLive: jest.fn(), getScorecard: jest.fn() }));
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
const server = socket as unknown as { emit: jest.Mock; __emit: (e: string, p?: unknown) => void; __count: (e: string) => number };
const EVENTS = ['ball:recorded', 'ball:undone', 'connect', 'disconnect', 'connect_error'];
const match = getMatchLive as jest.Mock;

const live = (runs: number, matchStatus = 'innings1') => ({ runs, wickets: 0, completedOvers: 0, ballsInCurrentOver: 1, currentInnings: 1, matchStatus });
const withMatch = (m: object, liveState: object | null = live(4)) => ({ match: m, liveState, recentBalls: [] });

beforeEach(() => {
  jest.clearAllMocks();
  match.mockResolvedValue(withMatch({ _id: 'm1', status: 'in_progress' }));
  (getScorecard as jest.Mock).mockResolvedValue({ innings1: null, innings2: null });
});

const mount = async () => {
  const hook = renderHook(() => useCricketMatchSocket('m1'));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

it('acquires, joins, then leaves and releases on unmount, listeners symmetric', async () => {
  const { unmount } = await mount();
  expect(acquireSocket).toHaveBeenCalledTimes(1);
  expect(server.emit).toHaveBeenCalledWith('join:match', { matchId: 'm1' });
  expect(EVENTS.map(server.__count)).toEqual([1, 1, 1, 1, 1]);
  unmount();
  expect(server.emit).toHaveBeenCalledWith('leave:match', { matchId: 'm1' });
  expect(releaseSocket).toHaveBeenCalledTimes(1);
  expect(EVENTS.map(server.__count)).toEqual([0, 0, 0, 0, 0]);
});

it("takes this match's ball:recorded and ignores another match's", async () => {
  const { result } = await mount();
  act(() => server.__emit('ball:recorded', { ball: { matchId: 'm2' }, liveState: live(99) }));
  expect(result.current.live?.runs).toBe(4);
  act(() => server.__emit('ball:recorded', { ball: { matchId: 'm1' }, liveState: live(5) }));
  expect(result.current.live?.runs).toBe(5);
});

it('reloads the match when a ball ends it, so the result shows', async () => {
  const { result } = await mount();
  match.mockClear();
  match.mockResolvedValue(withMatch({ _id: 'm1', status: 'completed', winnerId: 'tA', result: { marginOfVictory: 'by 7 wickets' } }, live(120, 'completed')));
  await act(async () => server.__emit('ball:recorded', { ball: { matchId: 'm1' }, liveState: live(120, 'completed'), matchEnded: true, winnerId: 'tA' }));
  await waitFor(() => expect(result.current.match?.status).toBe('completed'));
  expect(match).toHaveBeenCalledTimes(1);
});

it('connected: true at first, false on a failed connect or a disconnect, true again on connect', async () => {
  const { result } = await mount();
  expect(result.current.connected).toBe(true);
  act(() => server.__emit('connect_error'));
  expect(result.current.connected).toBe(false);
  await act(async () => server.__emit('connect'));
  expect(result.current.connected).toBe(true);
  act(() => server.__emit('disconnect'));
  expect(result.current.connected).toBe(false);
});
