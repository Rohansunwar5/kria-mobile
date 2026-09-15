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
});
