import { renderHook, waitFor, act } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '../src/api/axios';
import { useLiveFeed } from '../src/lib/useLiveFeed';

let mock: MockAdapter;

const envelope = (items: unknown[]) => ({ data: { data: { total: items.length, items } } });

const quickItem = { kind: 'quick', matchId: 'q1', sport: 'badminton', title: 'A vs B', scoreline: '11-9', startedAt: '2026-09-15T10:00:00.000Z' };

beforeEach(() => { mock = new MockAdapter(API); });
afterEach(() => { mock.restore(); });

describe('useLiveFeed', () => {
  it('starts loading and then serves the feed', async () => {
    mock.onGet('/live').reply(200, envelope([quickItem]));
    const { result } = renderHook(() => useLiveFeed());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it('serves an empty feed without erroring', async () => {
    mock.onGet('/live').reply(200, envelope([]));
    const { result } = renderHook(() => useLiveFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  // A spectator feed failing is not the same as a quiet evening. An empty
  // list and a dead server must not look identical to the screen above.
  it('surfaces a server failure as an error, not as an empty feed', async () => {
    mock.onGet('/live').reply(500);
    const { result } = renderHook(() => useLiveFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.items).toEqual([]);
  });

  it('refetches on refresh', async () => {
    mock.onGet('/live').reply(200, envelope([quickItem]));
    const { result } = renderHook(() => useLiveFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mock.resetHistory();
    await act(async () => { result.current.refresh(); });
    await waitFor(() => expect(mock.history.get.length).toBe(1));
  });

  // Pull-to-refresh + 15s server cache makes out-of-order resolution likely.
  // Stale rows look identical to fresh ones, so the failure is invisible.
  // A later request must win regardless of which response lands first.
  it('discards stale responses when older request resolves after newer one', async () => {
    const staleItem = { kind: 'quick', matchId: 'stale', sport: 'badminton', scoreline: '0-0', startedAt: '2026-09-15T10:00:00.000Z' };
    const freshItem = { kind: 'quick', matchId: 'fresh', sport: 'badminton', scoreline: '11-9', startedAt: '2026-09-15T10:05:00.000Z' };

    type ResolveType = (value: [number, unknown]) => void;
    let resolveFirst: ResolveType | null = null;
    let resolveSecond: ResolveType | null = null;

    const firstPromise = new Promise<[number, unknown]>((resolve) => { resolveFirst = resolve; });
    const secondPromise = new Promise<[number, unknown]>((resolve) => { resolveSecond = resolve; });

    mock.onGet('/live').replyOnce(() => firstPromise);
    mock.onGet('/live').replyOnce(() => secondPromise);

    const { result } = renderHook(() => useLiveFeed());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
      result.current.refresh();
    });

    await waitFor(() => expect(mock.history.get.length).toBe(2));

    resolveSecond!([200, envelope([freshItem])]);
    await new Promise((r) => setTimeout(r, 10));
    resolveFirst!([200, envelope([staleItem])]);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items[0]?.matchId).toBe('fresh');
  });
});
