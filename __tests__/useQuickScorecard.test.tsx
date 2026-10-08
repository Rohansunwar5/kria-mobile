import { renderHook, waitFor } from '@testing-library/react-native';
import { useQuickScorecard } from '@/lib/useQuickScorecard';
import { getQuickScorecard, type QuickMatch } from '@/api/quickMatch';

jest.mock('@/api/quickMatch', () => ({ getQuickScorecard: jest.fn() }));

const card = (runs: number) => ({ innings1: { totals: { runs } }, innings2: null });
const match = (live: Record<string, unknown>, over: Record<string, unknown> = {}) => ({
  _id: 'm1', sport: 'cricket', status: 'live',
  liveState: { currentInnings: 1, runs: 0, wickets: 0, completedOvers: 0, ballsInCurrentOver: 0, ...live },
  ...over,
}) as unknown as QuickMatch;

beforeEach(() => jest.clearAllMocks());

it('reads the card again when the score moves, and not otherwise', async () => {
  (getQuickScorecard as jest.Mock).mockResolvedValueOnce(card(0)).mockResolvedValueOnce(card(4));
  const { result, rerender } = renderHook(({ m }: { m: QuickMatch }) => useQuickScorecard(m), { initialProps: { m: match({}) } });
  await waitFor(() => expect(result.current).toEqual(card(0)));

  rerender({ m: match({}, { joinCode: 'NEW' }) }); // same score: no read
  expect(getQuickScorecard).toHaveBeenCalledTimes(1);

  rerender({ m: match({ runs: 4, ballsInCurrentOver: 1 }) });
  await waitFor(() => expect(result.current).toEqual(card(4)));
  expect(getQuickScorecard).toHaveBeenCalledTimes(2);
  expect(getQuickScorecard).toHaveBeenLastCalledWith('m1');
});

it('keeps the last card when a read fails', async () => {
  (getQuickScorecard as jest.Mock).mockResolvedValueOnce(card(0)).mockRejectedValueOnce(new Error('offline'));
  const { result, rerender } = renderHook(({ m }: { m: QuickMatch }) => useQuickScorecard(m), { initialProps: { m: match({}) } });
  await waitFor(() => expect(result.current).toEqual(card(0)));

  rerender({ m: match({ runs: 1, ballsInCurrentOver: 1 }) });
  await waitFor(() => expect(getQuickScorecard).toHaveBeenCalledTimes(2));
  expect(result.current).toEqual(card(0));
});

it('reads nothing for a badminton match, a waiting match, or no match', () => {
  renderHook(() => useQuickScorecard(match({}, { sport: 'badminton' })));
  renderHook(() => useQuickScorecard(match({}, { status: 'waiting' })));
  renderHook(() => useQuickScorecard(null));
  expect(getQuickScorecard).not.toHaveBeenCalled();
});
