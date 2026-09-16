import { render, screen, waitFor, act, fireEvent } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '../src/api/axios';
import ExploreScreen from '../src/app/(tabs)/explore';

let mock: MockAdapter;

const players = (items: unknown[]) => ({ data: { data: items } });
const tournaments = (items: unknown[]) => ({ data: { data: { tournaments: items, pagination: { total: items.length } } } });

const PLAYER = { _id: 'p1', firstName: 'Rohan', lastName: 'Sunwar', sport: 'badminton', location: 'Bangalore' };
const EVENT = { _id: 't1', name: 'Kria Smash Cup', sport: 'badminton', status: 'registration_open' };

beforeEach(() => { mock = new MockAdapter(API); jest.useFakeTimers(); });
afterEach(() => { mock.restore(); jest.useRealTimers(); });

async function typeSearch(text: string) {
  fireEvent.changeText(screen.getByPlaceholderText(/search/i), text);
  await act(async () => { jest.advanceTimersByTime(350); });
}

describe('Explore screen', () => {
  it('shows both groups when both have results', async () => {
    mock.onGet('/player/search').reply(200, players([PLAYER]));
    mock.onGet('/tournament').reply(200, tournaments([EVENT]));

    render(<ExploreScreen />);
    await typeSearch('sunw');

    await waitFor(() => expect(screen.getByText('Rohan Sunwar')).toBeTruthy());
    expect(screen.getByText('Kria Smash Cup')).toBeTruthy();
  });

  // A player may have neither sport nor location — both are optional on the
  // server. The row must render rather than showing a blank line.
  it('renders a player who has no sport or location', async () => {
    mock.onGet('/player/search').reply(200, players([{ _id: 'p2', firstName: 'Sparse', lastName: 'Record' }]));
    mock.onGet('/tournament').reply(200, tournaments([]));

    render(<ExploreScreen />);
    await typeSearch('spar');

    await waitFor(() => expect(screen.getByText('Sparse Record')).toBeTruthy());
  });

  it('says so when a search finds nothing', async () => {
    mock.onGet('/player/search').reply(200, players([]));
    mock.onGet('/tournament').reply(200, tournaments([]));

    render(<ExploreScreen />);
    await typeSearch('zzzz');

    await waitFor(() => expect(screen.getByText(/nothing matched/i)).toBeTruthy());
  });

  it('shows an error rather than an empty result when the server fails', async () => {
    mock.onGet('/player/search').reply(500);
    mock.onGet('/tournament').reply(500);

    render(<ExploreScreen />);
    await typeSearch('sunw');

    await waitFor(() => expect(screen.getByText(/could not search/i)).toBeTruthy());
  });

  // Before anything is typed the screen must invite a search rather than
  // claiming nothing matched.
  it('opens with a prompt, not an empty state', () => {
    render(<ExploreScreen />);
    expect(screen.getByText(/search for players or events/i)).toBeTruthy();
    expect(screen.queryByText(/nothing matched/i)).toBeNull();
  });
});

// M5: the artboard draws venue name, then city — "KORAMANGALA INDOOR ·
// BANGALORE". EventHitRow rendered only sport · city and TournamentHit did
// not even declare venue.name, though the server returns it.
describe('Explore screen — event meta (M5)', () => {
  it('shows the venue name before the city when the server provides one', async () => {
    mock.onGet('/player/search').reply(200, players([]));
    mock.onGet('/tournament').reply(200, tournaments([{ ...EVENT, venue: { name: 'Koramangala Indoor', city: 'Bangalore' } }]));

    render(<ExploreScreen />);
    await typeSearch('smash');

    await waitFor(() => expect(screen.getByText('Kria Smash Cup')).toBeTruthy());
    expect(screen.getByText('badminton · Koramangala Indoor · Bangalore')).toBeTruthy();
  });

  it('falls back to sport and city when the venue has no name', async () => {
    mock.onGet('/player/search').reply(200, players([]));
    mock.onGet('/tournament').reply(200, tournaments([{ ...EVENT, venue: { city: 'Bangalore' } }]));

    render(<ExploreScreen />);
    await typeSearch('smash');

    await waitFor(() => expect(screen.getByText('Kria Smash Cup')).toBeTruthy());
    expect(screen.getByText('badminton · Bangalore')).toBeTruthy();
  });
});

// I2/I3/I4 share one root cause: `filters` and a screen-owned `filteredEvents`
// were two sources of truth for one list. The fix folds filters into
// useExploreSearch as another input to its one debounced, epoch-guarded
// search, so `tournaments` is the only origin the Events group ever reads.
describe('Explore screen — filters (I2/I3/I4 root cause)', () => {
  const CRICKET_EVENT = { _id: 't2', name: 'Kria Smash Bash', sport: 'cricket', status: 'registration_open' };

  async function openSheetAndApply(sportLabel: string) {
    fireEvent.press(screen.getByLabelText(/^filter events/i));
    await waitFor(() => expect(screen.getByText(/^reset$/i)).toBeTruthy());
    fireEvent.press(screen.getByLabelText(sportLabel));
    fireEvent.press(screen.getByText(/show \d+ events?/i));
    await act(async () => { jest.advanceTimersByTime(350); });
  }

  it('applying a filter narrows the events', async () => {
    mock.onGet('/player/search').reply(200, players([]));
    mock.onGet('/tournament', { params: { q: 'smash' } }).reply(200, tournaments([EVENT, CRICKET_EVENT]));
    mock.onGet('/tournament', { params: { q: 'smash', sport: 'cricket' } }).reply(200, tournaments([CRICKET_EVENT]));

    render(<ExploreScreen />);
    await typeSearch('smash');
    await waitFor(() => expect(screen.getByText('Kria Smash Cup')).toBeTruthy());
    expect(screen.getByText('Kria Smash Bash')).toBeTruthy();

    await openSheetAndApply('Cricket');

    await waitFor(() => expect(screen.queryByText('Kria Smash Cup')).toBeNull());
    expect(screen.getByText('Kria Smash Bash')).toBeTruthy();
  });

  // I3: the Events heading (and the only control that can undo the filter)
  // used to render only when `events.length > 0`, so a filter matching
  // nothing took its own escape hatch down with it.
  it('a filter matching nothing still leaves the filter control reachable', async () => {
    mock.onGet('/player/search').reply(200, players([]));
    mock.onGet('/tournament', { params: { q: 'smash' } }).reply(200, tournaments([EVENT]));
    mock.onGet('/tournament', { params: { q: 'smash', sport: 'cricket' } }).reply(200, tournaments([]));

    render(<ExploreScreen />);
    await typeSearch('smash');
    await waitFor(() => expect(screen.getByText('Kria Smash Cup')).toBeTruthy());

    await openSheetAndApply('Cricket');

    await waitFor(() => expect(screen.queryByText('Kria Smash Cup')).toBeNull());
    expect(screen.queryByText(/nothing matched/i)).toBeNull();
    expect(screen.getByLabelText(/filter events/i)).toBeTruthy();
  });

  // I4: `filteredEvents` reset on query change but `filters` did not, so the
  // badge could keep announcing "N applied" over a list the filter no
  // longer produced.
  it('does not claim filters that are not shaping the current list', async () => {
    const CUP_EVENT = { _id: 't3', name: 'Kria Cup Clash', sport: 'cricket', status: 'registration_open' };
    mock.onGet('/player/search').reply(200, players([]));
    mock.onGet('/tournament', { params: { q: 'smash' } }).reply(200, tournaments([EVENT, CRICKET_EVENT]));
    mock.onGet('/tournament', { params: { q: 'smash', sport: 'cricket' } }).reply(200, tournaments([CRICKET_EVENT]));
    mock.onGet('/tournament', { params: { q: 'cup', sport: 'cricket' } }).reply(200, tournaments([CUP_EVENT]));
    // Decoy: what the OLD, filter-dropping code path would have fetched
    // instead. If a future change reintroduces that drop, this is what would
    // wrongly appear on screen (or nothing would, and the assertions below
    // would fail either way) rather than the test erroring out opaquely.
    mock.onGet('/tournament', { params: { q: 'cup' } }).reply(200, tournaments([{ _id: 't4', name: 'Kria Unfiltered Cup Meet', sport: 'badminton', status: 'registration_open' }]));

    render(<ExploreScreen />);
    await typeSearch('smash');
    await waitFor(() => expect(screen.getByText('Kria Smash Cup')).toBeTruthy());

    await openSheetAndApply('Cricket');
    await waitFor(() => expect(screen.getByLabelText(/filter events, 1 applied/i)).toBeTruthy());

    await typeSearch('cup');

    await waitFor(() => expect(screen.getByText('Kria Cup Clash')).toBeTruthy());
    // The badge must still describe exactly the filter that produced THIS list.
    expect(screen.getByLabelText(/filter events, 1 applied/i)).toBeTruthy();
    expect(screen.queryByText('Kria Smash Bash')).toBeNull();
  });

  // I2's exact repro: search, apply a filter, then edit the query again
  // before the filtered fetch resolves. Without one shared epoch guard the
  // stale (first) response can land after the fresh one and overwrite it.
  it('does not let a stale filtered response win over a newer query', async () => {
    jest.useRealTimers();

    mock.onGet('/player/search').reply(200, players([]));

    type ResolveType = (value: [number, unknown]) => void;
    let resolveStale: ResolveType | null = null;
    let resolveFresh: ResolveType | null = null;
    const stalePromise = new Promise<[number, unknown]>((resolve) => { resolveStale = resolve; });
    const freshPromise = new Promise<[number, unknown]>((resolve) => { resolveFresh = resolve; });

    mock.onGet('/tournament', { params: { q: 'smash' } }).reply(200, tournaments([EVENT]));
    mock.onGet('/tournament', { params: { q: 'smash', sport: 'cricket' } }).replyOnce(() => stalePromise);
    mock.onGet('/tournament', { params: { q: 'cup', sport: 'cricket' } }).replyOnce(() => freshPromise);
    // Decoy for the same reason as the badge test above: the OLD code path
    // would have fetched this, unfiltered, instead of carrying the filter
    // forward.
    mock.onGet('/tournament', { params: { q: 'cup' } }).reply(200, tournaments([]));

    render(<ExploreScreen />);

    fireEvent.changeText(screen.getByPlaceholderText(/search/i), 'smash');
    await act(async () => { await new Promise((r) => setTimeout(r, 350)); });
    await waitFor(() => expect(screen.getByText('Kria Smash Cup')).toBeTruthy());

    fireEvent.press(screen.getByLabelText(/^filter events/i));
    await waitFor(() => expect(screen.getByText(/^reset$/i)).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Cricket'));
    fireEvent.press(screen.getByText(/show \d+ events?/i));
    await act(async () => { await new Promise((r) => setTimeout(r, 350)); });
    // The filtered "smash" fetch is now in flight and deliberately held.

    fireEvent.changeText(screen.getByPlaceholderText(/search/i), 'cup');
    await act(async () => { await new Promise((r) => setTimeout(r, 350)); });
    // The "cup" fetch (same filter still applied) is in flight too — it is the newer one.

    await act(async () => {
      resolveFresh!([200, tournaments([{ _id: 't3', name: 'Kria Cup Clash', sport: 'cricket', status: 'registration_open' }])]);
      await new Promise((r) => setTimeout(r, 10));
      resolveStale!([200, tournaments([{ _id: 't2', name: 'Kria Smash Bash', sport: 'cricket', status: 'registration_open' }])]);
      await new Promise((r) => setTimeout(r, 10));
    });

    await waitFor(() => expect(screen.getByText('Kria Cup Clash')).toBeTruthy());
    expect(screen.queryByText('Kria Smash Bash')).toBeNull();
  });
});
