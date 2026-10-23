import { fireEvent, render, screen } from '@testing-library/react-native';
import AllMatches from '../src/app/matches/[playerId]';
import type { RecentMatch } from '../src/api/career';

const mockBack = jest.fn();
let mockParams: Record<string, string> = { playerId: 'p1' };
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: jest.fn(), back: mockBack, canGoBack: () => true, replace: jest.fn() }),
}));
const mockGetRecent = jest.fn();
jest.mock('../src/api/career', () => ({ getRecentMatches: (...a: unknown[]) => mockGetRecent(...a) }));

const rows = (n: number, sport = 'badminton'): RecentMatch[] =>
  Array.from({ length: n }, (_, i) => ({
    _id: `${sport}${i}`, matchId: `m${sport}${i}`, sport, title: `${sport} ${i}`, context: 'quick', result: 'won', playedAt: '2026-09-01T12:00:00.000Z',
  }));

beforeEach(() => { jest.clearAllMocks(); mockParams = { playerId: 'p1' }; });

it('asks for 50, titles the screen, shows the name sub-line', async () => {
  mockParams = { playerId: 'p1', name: 'Rohan Kulkarni' };
  mockGetRecent.mockResolvedValue(rows(3));
  render(<AllMatches />);
  expect(await screen.findAllByText(/^badminton \d$/)).toHaveLength(3);
  expect(mockGetRecent).toHaveBeenCalledWith('p1', 50);
  expect(screen.getByText('All matches')).toBeTruthy();
  expect(screen.getByText('Rohan Kulkarni')).toBeTruthy();
  expect(screen.getByText('September 2026')).toBeTruthy();
});

it('chips filter by sport', async () => {
  mockGetRecent.mockResolvedValue([...rows(2), ...rows(1, 'cricket')]);
  render(<AllMatches />);
  await screen.findByText('Cricket');
  fireEvent.press(screen.getByText('Cricket'));
  expect(screen.getAllByText(/^cricket \d$/)).toHaveLength(1);
  expect(screen.queryByText('badminton 0')).toBeNull();
});

it('cap note only at exactly 50', async () => {
  mockGetRecent.mockResolvedValue(rows(50));
  const v = render(<AllMatches />);
  expect(await screen.findByText('Showing the 50 most recent matches.')).toBeTruthy();
  v.unmount();
  mockGetRecent.mockResolvedValue(rows(49));
  render(<AllMatches />);
  await screen.findByText('badminton 0');
  expect(screen.queryByText('Showing the 50 most recent matches.')).toBeNull();
});

it('empty state', async () => {
  mockGetRecent.mockResolvedValue([]);
  render(<AllMatches />);
  expect(await screen.findByText('No matches yet')).toBeTruthy();
});

it('error shows Retry, which reloads; back works', async () => {
  mockGetRecent.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(rows(2));
  render(<AllMatches />);
  fireEvent.press(await screen.findByText('Retry'));
  expect(await screen.findAllByText(/^badminton \d$/)).toHaveLength(2);
  fireEvent.press(screen.getByLabelText('Back'));
  expect(mockBack).toHaveBeenCalled();
});
