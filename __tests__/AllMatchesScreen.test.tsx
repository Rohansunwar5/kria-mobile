import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AllMatches from '../src/app/matches/[playerId]';
import type { RecentMatch } from '../src/api/career';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ playerId: 'p1' }),
  useRouter: () => ({ push: jest.fn(), back: mockBack, canGoBack: () => true, replace: jest.fn() }),
}));

const mockGetRecent = jest.fn();
jest.mock('../src/api/career', () => ({
  getRecentMatches: (...a: unknown[]) => mockGetRecent(...a),
}));

const rows = (n: number): RecentMatch[] =>
  Array.from({ length: n }, (_, i) => ({
    _id: `r${i}`,
    matchId: `m${i}`,
    sport: 'badminton',
    title: `Match ${i}`,
    context: 'quick',
    result: 'won',
    playedAt: '2026-09-01T12:00:00.000Z',
  }));

describe('AllMatches screen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks for 50 and renders every row', async () => {
    mockGetRecent.mockResolvedValue(rows(12));
    const { findAllByText, getByText, queryByText } = render(<AllMatches />);
    expect(await findAllByText(/^match \d+$/i)).toHaveLength(12);
    expect(mockGetRecent).toHaveBeenCalledWith('p1', 50);
    expect(getByText(/all matches/i)).toBeTruthy();
    expect(queryByText('Recent matches')).toBeNull(); // the title already says it
  });

  it('goes back from the header button', async () => {
    mockGetRecent.mockResolvedValue(rows(1));
    const { getByLabelText, findByText } = render(<AllMatches />);
    await findByText(/^match 0$/i);
    fireEvent.press(getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows an error and retries', async () => {
    mockGetRecent.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(rows(2));
    const { findByText, findAllByText, queryByText } = render(<AllMatches />);
    const retry = await findByText(/retry/i);
    expect(queryByText(/pull to refresh/i)).toBeNull(); // this screen has none
    fireEvent.press(retry);
    expect(await findAllByText(/^match \d+$/i)).toHaveLength(2);
    await waitFor(() => expect(mockGetRecent).toHaveBeenCalledTimes(2));
  });
});
