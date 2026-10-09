import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import tournamentReducer, { type Tournament } from '@/store/slices/tournamentSlice';
import Events from '../src/app/(tabs)/events';

// Stub the thunk so nothing reaches axios, but keep it a jest.fn() so tests can
// assert what the screen actually dispatched. Jest only lets the factory close
// over an out-of-scope variable whose name starts with `mock`.
type FetchPublicTournamentsParams = { limit?: number; sport?: string; city?: string; status?: string };

const mockFetchPublicTournaments = jest.fn((_params?: FetchPublicTournamentsParams) => ({ type: 'tournament/noop' }));

jest.mock('@/store/slices/tournamentSlice', () => {
  const actual = jest.requireActual('@/store/slices/tournamentSlice');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    fetchPublicTournaments: Object.assign(
      (params?: FetchPublicTournamentsParams) => mockFetchPublicTournaments(params),
      { pending: { type: 'p' }, fulfilled: { type: 'f' }, rejected: { type: 'r' } }
    ),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  router: { push: jest.fn() },
  useIsFocused: () => true,
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));

const INIT = { type: '@@preload' };

const tournament = (over: Partial<Tournament>): Tournament => ({
  _id: 't1',
  name: 'Kria Smash Cup',
  sport: 'badminton',
  status: 'registration_open',
  startDate: '2026-09-02T00:00:00.000Z',
  endDate: '2026-09-07T00:00:00.000Z',
  ...over,
}) as Tournament;

const makeStore = (publicTournaments: Tournament[] = [], publicTotal = publicTournaments.length) =>
  configureStore({
    reducer: { auth: authReducer, tournament: tournamentReducer },
    preloadedState: {
      auth: authReducer(undefined, INIT),
      tournament: { ...tournamentReducer(undefined, INIT), publicTournaments, publicTotal },
    },
  });

// `publicTotal` defaults to the fixture list's own length; pass it explicitly
// to simulate the server's true total diverging from what got fetched.
const renderEvents = async (tournaments: Tournament[] = [], publicTotal?: number) => {
  const utils = render(<Provider store={makeStore(tournaments, publicTotal)}><Events /></Provider>);
  await act(async () => {});
  return utils;
};

const openSheet = async (utils: Awaited<ReturnType<typeof renderEvents>>) => {
  fireEvent.press(utils.getByLabelText('Filter tournaments'));
  await waitFor(() => expect(utils.getByText(/^reset$/i)).toBeTruthy());
};

describe('Events', () => {
  it('lists the events', async () => {
    const { getByTestId } = await renderEvents();
    expect(getByTestId('events-list')).toBeTruthy();
  });

  // Rendered over a realistic mixed list so the strip cannot drift from what
  // is actually open: ongoing, completed, draft and deactivated all stay out.
  it('counts only the tournaments open for entry in the strip', async () => {
    const { getByText } = await renderEvents([
      tournament({ _id: 'a', status: 'registration_open' }),
      tournament({ _id: 'b', status: 'ongoing', name: 'City League' }),
      tournament({ _id: 'c', status: 'registration_open', name: 'Monsoon Open' }),
      tournament({ _id: 'd', status: 'completed', name: 'Winter Cup' }),
      tournament({ _id: 'e', status: 'draft', name: 'Unannounced' }),
      tournament({ _id: 'f', status: 'registration_open', name: 'Pulled Event', isActive: false }),
    ]);

    expect(getByText('ORGANISER-HOSTED · 2 OPEN')).toBeTruthy();
  });

  it('opens the filter sheet from the bar and applies a choice', async () => {
    const utils = await renderEvents();
    await openSheet(utils);

    fireEvent.press(utils.getByLabelText('Cricket'));
    fireEvent.press(utils.getByText(/show \d+ events?/i));

    // The chip proves the choice reached the screen's state, not just the sheet's.
    await waitFor(() => expect(utils.getByText('Cricket')).toBeTruthy());
  });

  // The fetch is capped at 100 (the max getAllTournamentsValidator accepts),
  // so the button must never quote the server's larger true total.
  it('never promises more events on the filter button than the fetch will return', async () => {
    const utils = await renderEvents([], 147);
    await openSheet(utils);

    expect(utils.getByText('Show 100 events')).toBeTruthy();
    expect(utils.queryByText(/show 147 events?/i)).toBeNull();
  });

  it('still shows the true count on the filter button when it is under the fetch limit', async () => {
    const utils = await renderEvents([], 3);
    await openSheet(utils);

    expect(utils.getByText('Show 3 events')).toBeTruthy();
  });

  it('sends the filter to the fetch as a query, without All values', async () => {
    const utils = await renderEvents();
    mockFetchPublicTournaments.mockClear();

    await openSheet(utils);
    fireEvent.press(utils.getByLabelText('Cricket'));
    fireEvent.press(utils.getByText(/show \d+ events?/i));

    await waitFor(() =>
      expect(mockFetchPublicTournaments).toHaveBeenCalledWith(expect.objectContaining({ sport: 'cricket' }))
    );
    const calls = mockFetchPublicTournaments.mock.calls;
    const [args] = calls[calls.length - 1];
    expect(args).not.toHaveProperty('city');
    expect(args).not.toHaveProperty('status');
  });

  // Toggling a value on and off before Apply yields a value-identical but
  // reference-different Filters, which must not refetch.
  it('does not refetch when Apply carries back the same filters that were already applied', async () => {
    const utils = await renderEvents();
    mockFetchPublicTournaments.mockClear();

    await openSheet(utils);
    fireEvent.press(utils.getByLabelText('Cricket'));
    fireEvent.press(utils.getByLabelText('Cricket'));
    fireEvent.press(utils.getByText(/show \d+ events?/i));

    expect(mockFetchPublicTournaments).not.toHaveBeenCalled();
  });
});
