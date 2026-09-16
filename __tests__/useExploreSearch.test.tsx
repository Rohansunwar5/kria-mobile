import { renderHook, waitFor, act } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '../src/api/axios';
import { useExploreSearch } from '../src/lib/useExploreSearch';
import { EMPTY_FILTERS } from '../src/lib/tournamentFilters';

let mock: MockAdapter;

const players = (items: unknown[]) => ({ data: { data: items } });
const tournaments = (items: unknown[]) => ({ data: { data: { tournaments: items, pagination: { total: items.length } } } });

const PLAYER = { _id: 'p1', firstName: 'Rohan', lastName: 'Sunwar', sport: 'badminton', location: 'Bangalore' };
const EVENT = { _id: 't1', name: 'Kria Smash Cup', sport: 'badminton', status: 'registration_open' };

beforeEach(() => { mock = new MockAdapter(API); jest.useFakeTimers(); });
afterEach(() => { mock.restore(); jest.useRealTimers(); });

async function typeAndSettle(result: { current: { setQuery: (q: string) => void } }, q: string) {
  await act(async () => { result.current.setQuery(q); });
  await act(async () => { jest.advanceTimersByTime(350); });
}

describe('useExploreSearch', () => {
  it('searches both sources and groups the results', async () => {
    mock.onGet('/player/search').reply(200, players([PLAYER]));
    mock.onGet('/tournament').reply(200, tournaments([EVENT]));

    const { result } = renderHook(() => useExploreSearch());
    await typeAndSettle(result, 'sunw');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toHaveLength(1);
    expect(result.current.tournaments).toHaveLength(1);
  });

  // The server 422s below three characters. Firing anyway would make every
  // first keystroke a wasted round trip that can only fail.
  it('does not search below three characters', async () => {
    mock.onGet('/player/search').reply(200, players([]));
    mock.onGet('/tournament').reply(200, tournaments([]));

    const { result } = renderHook(() => useExploreSearch());
    await typeAndSettle(result, 'su');

    expect(mock.history.get).toHaveLength(0);
  });

  it('debounces rather than firing on every keystroke', async () => {
    mock.onGet('/player/search').reply(200, players([]));
    mock.onGet('/tournament').reply(200, tournaments([]));

    const { result } = renderHook(() => useExploreSearch());
    await act(async () => {
      result.current.setQuery('sun');
      result.current.setQuery('sunw');
      result.current.setQuery('sunwa');
    });
    await act(async () => { jest.advanceTimersByTime(350); });

    // One search for the final text, not three.
    expect(mock.history.get.filter((r) => r.url === '/player/search')).toHaveLength(1);
  });

  // An empty result and a failed request must not look the same.
  it('surfaces a failure as an error rather than as no results', async () => {
    mock.onGet('/player/search').reply(500);
    mock.onGet('/tournament').reply(500);

    const { result } = renderHook(() => useExploreSearch());
    await typeAndSettle(result, 'sunw');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
  });

  // Pull-to-refresh style debounced re-searches make out-of-order resolution
  // routine: a short query returning slowly after a longer one must not win.
  // Uses real timers (like useLiveFeed's own race test) so the deferred
  // promises below can be resolved out of order across two real debounce
  // windows.
  it('discards a stale search that resolves after a newer one', async () => {
    jest.useRealTimers();

    const stale = { _id: 'stale', firstName: 'Stale', lastName: 'Result' };
    const fresh = { _id: 'fresh', firstName: 'Fresh', lastName: 'Result' };

    type ResolveType = (value: [number, unknown]) => void;
    let resolveFirst: ResolveType | null = null;
    let resolveSecond: ResolveType | null = null;

    const firstPromise = new Promise<[number, unknown]>((resolve) => { resolveFirst = resolve; });
    const secondPromise = new Promise<[number, unknown]>((resolve) => { resolveSecond = resolve; });

    mock.onGet('/tournament').reply(200, tournaments([]));
    mock.onGet('/player/search').replyOnce(() => firstPromise);
    mock.onGet('/player/search').replyOnce(() => secondPromise);

    const { result } = renderHook(() => useExploreSearch());

    await act(async () => {
      result.current.setQuery('sun');
      await new Promise((r) => setTimeout(r, 350));
    });

    await act(async () => {
      result.current.setQuery('sunw');
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => expect(mock.history.get.filter((r) => r.url === '/player/search')).toHaveLength(2));

    await act(async () => {
      resolveSecond!([200, players([fresh])]);
      await new Promise((r) => setTimeout(r, 10));
      resolveFirst!([200, players([stale])]);
      await new Promise((r) => setTimeout(r, 10));
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players[0]?._id).toBe('fresh');
  });

  // Reviewer-found gap: `error` was only ever cleared inside search()'s own
  // resolution (success or failure), never synchronously at the moment a NEW
  // search starts. A user who edits the query after a failed search would see
  // the OLD failure message for the retry's entire in-flight window, even
  // though a fresh request was already running underneath it.
  it('clears a stale error when a new search starts, before it resolves', async () => {
    mock.onGet('/player/search').replyOnce(500);
    mock.onGet('/tournament').replyOnce(200, tournaments([]));

    const { result } = renderHook(() => useExploreSearch());
    await typeAndSettle(result, 'sunw');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();

    type ResolveType = (value: [number, unknown]) => void;
    let resolveSecond: ResolveType | null = null;
    const secondPromise = new Promise<[number, unknown]>((resolve) => { resolveSecond = resolve; });
    mock.onGet('/player/search').replyOnce(() => secondPromise);
    mock.onGet('/tournament').reply(200, tournaments([]));

    await typeAndSettle(result, 'sunwa');

    // The retry is still in flight — secondPromise is deliberately unresolved
    // here. This is exactly the window the reviewer flagged: loading is true,
    // and the old failure must already be gone rather than lingering until
    // this request resolves.
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => { resolveSecond!([200, players([])]); });
  });

  // I2/I4 root cause: filters used to live outside this hook entirely, as a
  // second, screen-owned fetch with no epoch guard of its own. Folding them
  // in here means every tournament fetch — plain or filtered — goes through
  // the one debounced, epoch-guarded path.
  it('includes applied filters in the tournament search', async () => {
    mock.onGet('/player/search').reply(200, players([]));
    mock.onGet('/tournament', { params: { q: 'sunw', sport: 'cricket' } }).reply(200, tournaments([EVENT]));

    const { result } = renderHook(() => useExploreSearch());
    await typeAndSettle(result, 'sunw');
    await act(async () => { result.current.setFilters({ ...EMPTY_FILTERS, sport: 'cricket' }); });
    await act(async () => { jest.advanceTimersByTime(350); });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tournaments).toHaveLength(1);
  });

  // A fresh query must not silently drop a filter the user already applied —
  // that drift is exactly what let the badge and the list disagree (I4).
  it('keeps applying the current filter when the query changes', async () => {
    mock.onGet('/player/search').reply(200, players([]));
    mock.onGet('/tournament', { params: { q: 'sunw', sport: 'cricket' } }).reply(200, tournaments([EVENT]));
    mock.onGet('/tournament', { params: { q: 'sunwa', sport: 'cricket' } }).reply(200, tournaments([EVENT]));

    const { result } = renderHook(() => useExploreSearch());
    await typeAndSettle(result, 'sunw');
    await act(async () => { result.current.setFilters({ ...EMPTY_FILTERS, sport: 'cricket' }); });
    await act(async () => { jest.advanceTimersByTime(350); });
    await waitFor(() => expect(result.current.tournaments).toHaveLength(1));

    // If the query-changed path fired the search without the filter, this
    // would hit no registered mock (only the sport:'cricket' variant exists
    // for 'sunwa') and land as an error instead of a length-1 result.
    await typeAndSettle(result, 'sunwa');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.tournaments).toHaveLength(1);
  });
});
