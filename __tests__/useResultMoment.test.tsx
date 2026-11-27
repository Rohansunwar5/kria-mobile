import { act, renderHook } from '@testing-library/react-native';
import type { Achievement, CareerProfile, SportSummary } from '@/api/career';
import type { QuickMatch } from '@/api/quickMatch';
import { getCareerProfile } from '@/api/career';
import { markOpened } from '@/lib/rewardSeen';
import { useResultMoment } from '@/lib/useResultMoment';

jest.mock('@/api/career', () => ({ getCareerProfile: jest.fn() }));
jest.mock('@/lib/rewardSeen', () => ({ markOpened: jest.fn(() => Promise.resolve()) }));

const sum = (played: number, decided: number, won: number): SportSummary => ({
  sport: 'badminton', played, decided, won, lost: decided - won, tied: 0, noResult: played - decided, winRate: won / decided,
});
const ach = (progress: number): Achievement => ({ id: 'matches-50', label: 'Play 50 matches', progress, target: 50, earned: progress >= 50 });
const prof = (s: SportSummary, a: Achievement): CareerProfile => ({ sports: [s], bestSport: null, achievements: [a] });
const BEFORE = prof(sum(12, 12, 7), ach(49));
const AFTER = prof(sum(13, 13, 8), ach(50));
const live = {
  _id: 'm1', hostId: 'me', sport: 'badminton', joinCode: 'ABC', status: 'live', createdAt: '2026-11-27T10:00:00Z',
  sides: [
    { sideId: 's1', name: 'Asha', slots: [{ slotId: 'a', playerId: 'me', displayName: 'Asha' }] },
    { sideId: 's2', name: 'Dev', slots: [{ slotId: 'b', playerId: 'p2', displayName: 'Dev' }] },
  ],
} as QuickMatch;
const done = { ...live, status: 'completed', outcome: 'side1' } as QuickMatch;
const fetchMock = getCareerProfile as jest.Mock;
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset();
  (markOpened as jest.Mock).mockClear();
});
afterEach(() => jest.useRealTimers());

test('fetches before while live, after on completion, and plays once', async () => {
  fetchMock.mockResolvedValueOnce(BEFORE).mockResolvedValueOnce(AFTER);
  const { result, rerender } = renderHook((p: { match: QuickMatch }) => useResultMoment({ match: p.match, meId: 'me', suppress: false }), { initialProps: { match: live } });
  await flush();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  rerender({ match: done });
  await flush();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result.current.moment?.outcome).toBe('win');
  expect(result.current.play).toBe(true);
  expect(markOpened).toHaveBeenCalledWith('me', ['ach_matches-50']);
});

test('retries once after 1.5s when the numbers do not add up yet', async () => {
  fetchMock.mockResolvedValueOnce(BEFORE).mockResolvedValueOnce(BEFORE).mockResolvedValueOnce(AFTER);
  const { result, rerender } = renderHook((p: { match: QuickMatch }) => useResultMoment({ match: p.match, meId: 'me', suppress: false }), { initialProps: { match: live } });
  await flush();
  rerender({ match: done });
  await flush();
  expect(result.current.moment).toBeNull();
  await act(async () => { jest.advanceTimersByTime(1500); });
  await flush();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(result.current.moment?.outcome).toBe('win');
});

test('gives up after the one retry: no moment', async () => {
  fetchMock.mockResolvedValue(BEFORE);
  const { result, rerender } = renderHook((p: { match: QuickMatch }) => useResultMoment({ match: p.match, meId: 'me', suppress: false }), { initialProps: { match: live } });
  await flush();
  rerender({ match: done });
  await flush();
  await act(async () => { jest.advanceTimersByTime(1500); });
  await flush();
  await act(async () => { jest.advanceTimersByTime(5000); });
  await flush();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(result.current.moment).toBeNull();
});

test('a match opened already completed never fetches and has no moment', async () => {
  const { result } = renderHook(() => useResultMoment({ match: done, meId: 'me', suppress: false }));
  await flush();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(result.current.moment).toBeNull();
});

test.each([
  ['a spectator', { match: live, meId: 'nobody', suppress: false }],
  ['cricket', { match: { ...live, sport: 'cricket' } as QuickMatch, meId: 'me', suppress: false }],
  ['a suppressed room (knockout host redirect)', { match: live, meId: 'me', suppress: true }],
])('%s: no fetch, no moment', async (_, props) => {
  const { result } = renderHook(() => useResultMoment(props));
  await flush();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(result.current.moment).toBeNull();
});

test('undo then a second completion does not replay', async () => {
  fetchMock.mockResolvedValueOnce(BEFORE).mockResolvedValueOnce(AFTER).mockResolvedValue(AFTER);
  const { result, rerender } = renderHook((p: { match: QuickMatch }) => useResultMoment({ match: p.match, meId: 'me', suppress: false }), { initialProps: { match: live } });
  await flush();
  rerender({ match: done });
  await flush();
  expect(result.current.moment?.outcome).toBe('win');
  rerender({ match: live });
  await flush();
  expect(result.current.moment).toBeNull();
  rerender({ match: done });
  await flush();
  await act(async () => { jest.advanceTimersByTime(5000); });
  await flush();
  expect(result.current.moment).toBeNull();
});
