import { act, renderHook } from '@testing-library/react-native';
import { getMatchLive } from '@/api/cricketMatch';
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
jest.mock('@/api/cricketMatch', () => ({ getMatchLive: jest.fn() }));
const feed = fetchLiveFeed as jest.Mock;

const item = { kind: 'tournament', sport: 'cricket', matchId: 'c1', startedAt: '2026-10-22T10:00:00.000Z' };
const flush = () => act(async () => {});
const tick = (ms: number) => act(async () => { jest.advanceTimersByTime(ms); });

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockFocused = true;
  feed.mockResolvedValue({ items: [item] });
  (getMatchLive as jest.Mock).mockResolvedValue({ liveState: null, recentBalls: [], match: null });
});
afterEach(() => jest.useRealTimers());

it('enriches tournament cricket rows by default, one request per row', async () => {
  const { result } = renderHook(() => useLiveNow());
  await flush();
  expect(result.current.count).toBe(1);
  expect(getMatchLive).toHaveBeenCalledTimes(1);
  expect(getMatchLive).toHaveBeenCalledWith('c1');
});

it('scores: false counts without any per-row cricket call', async () => {
  const { result } = renderHook(() => useLiveNow({ scores: false }));
  await flush();
  expect(result.current.count).toBe(1);
  await tick(30_000);
  expect(feed).toHaveBeenCalledTimes(2);
  expect(getMatchLive).not.toHaveBeenCalled();
});

it('refreshes every 30 s while focused and stops on blur', async () => {
  const { rerender } = renderHook(() => useLiveNow({ scores: false }));
  await flush();
  await tick(30_000);
  expect(feed).toHaveBeenCalledTimes(2);
  mockFocused = false;
  rerender({});
  await tick(90_000);
  expect(feed).toHaveBeenCalledTimes(2);
});

it('stops on unmount', async () => {
  const { unmount } = renderHook(() => useLiveNow({ scores: false }));
  await flush();
  unmount();
  await tick(90_000);
  expect(feed).toHaveBeenCalledTimes(1);
});
