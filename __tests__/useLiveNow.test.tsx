import { act, renderHook } from '@testing-library/react-native';
import { fetchLiveFeed } from '@/api/live';
import { useLiveNow } from '@/lib/useLiveNow';

// useFocusEffect as a focus-gated effect: flipping `mockFocused` and re-rendering blurs the screen.
let mockFocused = true;
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      const focused = mockFocused;
      useEffect(() => (focused ? cb() : undefined), [cb, focused]);
    },
  };
});
jest.mock('@/api/live', () => ({ fetchLiveFeed: jest.fn() }));
const feed = fetchLiveFeed as jest.Mock;

const item = {
  kind: 'tournament', sport: 'cricket', matchId: 'c1', startedAt: '2026-10-22T10:00:00.000Z', sides: ['A', 'B'],
  cricket: { scores: [{ runs: 20, wickets: 1, overs: 3, balls: 0 }, null] },
};
const flush = () => act(async () => {});
const tick = (ms: number) => act(async () => { jest.advanceTimersByTime(ms); });

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockFocused = true;
  feed.mockResolvedValue({ items: [item] });
});
afterEach(() => jest.useRealTimers());

it('builds rows, cricket scores included, from the one feed request (SERVER-GAPS #25)', async () => {
  const { result } = renderHook(() => useLiveNow());
  await flush();
  expect(result.current.count).toBe(1);
  expect(result.current.tournament[0].cricket!.scores).toEqual(['20/1 (3.0)', null]);
  expect(feed).toHaveBeenCalledTimes(1);
});

it('refreshes every 30 s while focused and stops on blur', async () => {
  const { rerender } = renderHook(() => useLiveNow());
  await flush();
  await tick(30_000);
  expect(feed).toHaveBeenCalledTimes(2);
  mockFocused = false;
  rerender({});
  await tick(90_000);
  expect(feed).toHaveBeenCalledTimes(2);
});

it('stops on unmount', async () => {
  const { unmount } = renderHook(() => useLiveNow());
  await flush();
  unmount();
  await tick(90_000);
  expect(feed).toHaveBeenCalledTimes(1);
});
