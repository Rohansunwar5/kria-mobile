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
