import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import registrationReducer, { type TournamentHistoryEntry } from '@/store/slices/registrationSlice';
import History from '../src/app/profile/history';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a) },
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [cb]);
  },
}));
const mockFetch = jest.fn(() => ({ type: 'registration/noop' }));
jest.mock('@/store/slices/registrationSlice', () => {
  const actual = jest.requireActual('@/store/slices/registrationSlice');
  return { ...actual, __esModule: true, default: actual.default, fetchPlayerTournamentHistory: () => mockFetch() };
});

const entry = (id: string, name: string, sport: string, played = 0, won = 0): TournamentHistoryEntry => ({
  _id: id, status: 'approved', createdAt: '2026-01-01T00:00:00Z',
  stats: { matchesPlayed: played, matchesWon: won, pointsContributed: 0 },
  auctionData: { soldPrice: 5000 },
  tournament: { _id: `t-${id}`, name, sport, startDate: '2026-03-01T00:00:00Z', endDate: '2026-03-02T00:00:00Z', status: 'completed' },
  category: { _id: 'c', name: 'Open', gender: 'male' },
});

const INIT = { type: '@@preload' };
const renderIt = (history: TournamentHistoryEntry[], extra: object = {}) =>
  render(
    <Provider store={configureStore({ reducer: { registration: registrationReducer }, preloadedState: { registration: { ...registrationReducer(undefined, INIT), tournamentHistory: history, ...extra } } })}>
      <History />
    </Provider>,
  );

beforeEach(() => jest.clearAllMocks());

it('shows the strip, no Earned, dispatches the fetch', () => {
  renderIt([entry('1', 'Alpha Cup', 'cricket', 4, 3), entry('2', 'Beta Cup', 'cricket')]);
  for (const t of ['Entered', 'Matches', 'Won']) expect(screen.getByText(t)).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.queryByText(/earned/i)).toBeNull();
  expect(screen.getByText('4 played · 3 won')).toBeTruthy();
  expect(screen.getByText('Not played yet')).toBeTruthy();
  expect(mockFetch).toHaveBeenCalled();
});

it('chips only with two sports, and filter', () => {
  const view = renderIt([entry('1', 'Alpha Cup', 'cricket'), entry('2', 'Beta Cup', 'badminton')]);
  fireEvent.press(screen.getByText('Badminton'));
  expect(screen.queryByText('Alpha Cup')).toBeNull();
  expect(screen.getByText('Beta Cup')).toBeTruthy();
  view.unmount();
  renderIt([entry('1', 'Alpha Cup', 'cricket')]);
  expect(screen.queryByText('All')).toBeNull();
});

it('tapping a row opens the tournament', () => {
  renderIt([entry('1', 'Alpha Cup', 'cricket')]);
  fireEvent.press(screen.getByLabelText(/^Alpha Cup/));
  expect(mockPush).toHaveBeenCalledWith('/tournament/t-1');
});

it('empty state', () => {
  renderIt([]);
  expect(screen.getByText('No tournaments yet')).toBeTruthy();
  fireEvent.press(screen.getByText('Find an event'));
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/events');
});

it('error shows Retry that refetches', () => {
  renderIt([], { error: 'boom' });
  mockFetch.mockClear();
  fireEvent.press(screen.getByText('Retry'));
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
