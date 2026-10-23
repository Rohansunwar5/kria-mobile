import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import MyEntries from '../src/app/profile/registrations';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
}));
const mockEntries = jest.fn();
const mockTournament = jest.fn();
const mockCats = jest.fn();
const mockWithdraw = jest.fn();
jest.mock('@/api/tournaments', () => ({
  getMyEntries: (...a: unknown[]) => mockEntries(...a),
  getTournament: (...a: unknown[]) => mockTournament(...a),
  getTournamentCategories: (...a: unknown[]) => mockCats(...a),
  withdrawEntry: (...a: unknown[]) => mockWithdraw(...a),
}));

const e = (id: string, t: string, o = {}) => ({ _id: id, tournamentId: t, categoryId: `c-${t}`, createdAt: '2026-10-01T00:00:00Z', status: 'pending', ...o });

beforeEach(() => {
  jest.clearAllMocks();
  mockEntries.mockResolvedValue([e('e1', 't1'), e('e2', 't2', { createdAt: '2026-09-01T00:00:00Z' })]);
  mockTournament.mockImplementation(async (id: string) => {
    if (id === 't2') throw new Error('boom');
    return { _id: id, name: 'Smash Open', status: 'open', sport: 'badminton' };
  });
  mockCats.mockImplementation(async (id: string) => [{ _id: `c-${id}`, name: 'Singles', sport: 'badminton' }]);
});

it('renders both rows when one lookup fails', async () => {
  render(<MyEntries />);
  expect(await screen.findByText('Smash Open')).toBeTruthy();
  expect(screen.getByText('Tournament')).toBeTruthy();
  expect(screen.getByText('Singles · Badminton')).toBeTruthy();
});

it('withdraws once on a double tap, then reloads', async () => {
  let resolve!: () => void;
  mockWithdraw.mockReturnValue(new Promise<void>((r) => (resolve = r)));
  render(<MyEntries />);
  await screen.findByText('Smash Open');
  fireEvent.press(screen.getAllByText('Withdraw')[0]);
  expect(screen.getByText('Withdraw from Smash Open?')).toBeTruthy();

  fireEvent.press(screen.getByLabelText('Withdraw'));
  fireEvent.press(screen.getByLabelText('Withdrawing'));
  expect(mockWithdraw).toHaveBeenCalledTimes(1);
  expect(mockWithdraw).toHaveBeenCalledWith('e1');
  await act(async () => resolve());
  await waitFor(() => expect(mockEntries).toHaveBeenCalledTimes(2));
});

it('shows the server message on failure', async () => {
  mockWithdraw.mockRejectedValue(new Error('Entry is locked'));
  render(<MyEntries />);
  await screen.findByText('Smash Open');
  fireEvent.press(screen.getAllByText('Withdraw')[0]);
  fireEvent.press(screen.getByLabelText('Withdraw'));
  expect(await screen.findByText('Entry is locked')).toBeTruthy();
});

it('Keep my entry closes the sheet with no call', async () => {
  render(<MyEntries />);
  await screen.findByText('Smash Open');
  fireEvent.press(screen.getAllByText('Withdraw')[0]);
  fireEvent.press(screen.getByLabelText('Keep my entry'));
  expect(mockWithdraw).not.toHaveBeenCalled();
});

it('tapping a row opens the category', async () => {
  render(<MyEntries />);
  fireEvent.press(await screen.findByLabelText('Smash Open'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/category/[categoryId]', params: { categoryId: 'c-t1', tournamentId: 't1' } });
});

it('empty state', async () => {
  mockEntries.mockResolvedValue([]);
  render(<MyEntries />);
  expect(await screen.findByText('No entries yet')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Find an event'));
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/events');
});

it('still loads after effects re-run (StrictMode mount/unmount/mount)', async () => {
  render(<StrictMode><MyEntries /></StrictMode>);
  expect(await screen.findByText('Smash Open')).toBeTruthy();
});
