import { render, screen, waitFor } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '../src/api/axios';
import LiveScreen from '../src/app/(tabs)/live';

let mock: MockAdapter;

const envelope = (items: unknown[]) => ({ data: { data: { total: items.length, items } } });

const tournamentItem = {
  kind: 'tournament', matchId: 't1', sport: 'badminton', title: 'Sunwar vs Iyer',
  scoreline: '21-18, 14-11', tournamentId: 'tr1', categoryId: 'c1', round: 'semi_final',
  startedAt: '2026-09-15T10:00:00.000Z',
};
const quickItem = {
  kind: 'quick', matchId: 'q1', sport: 'badminton', title: 'A. Kumar vs P. Nair',
  scoreline: '11-9', startedAt: '2026-09-15T09:00:00.000Z',
};

beforeEach(() => { mock = new MockAdapter(API); });
afterEach(() => { mock.restore(); });

describe('Live screen', () => {
  it('shows how many matches are live', async () => {
    mock.onGet('/live').reply(200, envelope([tournamentItem, quickItem]));
    render(<LiveScreen />);
    await waitFor(() => expect(screen.getByText(/2 MATCHES HAPPENING NOW/i)).toBeTruthy());
  });

  it('renders both kinds of match', async () => {
    mock.onGet('/live').reply(200, envelope([tournamentItem, quickItem]));
    render(<LiveScreen />);
    await waitFor(() => expect(screen.getByText('Sunwar vs Iyer')).toBeTruthy());
    expect(screen.getByText('A. Kumar vs P. Nair')).toBeTruthy();
  });

  // DESIGN.md §7: colour is never the only signal. The edge colour separates
  // the two kinds, and this word is what carries that distinction for anyone
  // who cannot use the colour.
  it('labels a quick match in words, not only by its edge colour', async () => {
    mock.onGet('/live').reply(200, envelope([quickItem]));
    render(<LiveScreen />);
    await waitFor(() => expect(screen.getByText('Quick')).toBeTruthy());
  });

  it('tells the user when nothing is live', async () => {
    mock.onGet('/live').reply(200, envelope([]));
    render(<LiveScreen />);
    await waitFor(() => expect(screen.getByText(/nothing live/i)).toBeTruthy());
  });

  it('shows an error rather than an empty feed when the server fails', async () => {
    mock.onGet('/live').reply(500);
    render(<LiveScreen />);
    await waitFor(() => expect(screen.getByText(/could not load/i)).toBeTruthy());
  });
});
