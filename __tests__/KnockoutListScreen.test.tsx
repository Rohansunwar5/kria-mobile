import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import KnockoutList from '../src/app/knockout/index';
import type { QuickKnockout } from '../src/api/quickKnockout';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, canGoBack: () => true, replace: jest.fn() }),
}));

const mockList = jest.fn();
jest.mock('../src/api/quickKnockout', () => ({
  listMyQuickKnockouts: () => mockList(),
}));

const ko = (i: number): QuickKnockout => ({
  _id: `k${i}`,
  hostId: 'p1',
  name: `Cup ${i}`,
  sport: 'badminton',
  format: 'singles',
  matchConfig: { bestOf: 3, pointsToWin: 21 },
  status: 'live',
  players: [],
  pairs: [],
  entrants: [],
  fixtures: [],
  roundNames: [],
  awards: [],
  createdAt: '2026-10-01T00:00:00.000Z',
});

const store = () =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...authReducer(undefined, { type: '@@x' }), user: { _id: 'p1', firstName: 'R', lastName: 'S', email: 'r@k.c', phone: '9', status: 'active' } } },
  });
const ui = () => <Provider store={store()}><KnockoutList /></Provider>;

describe('My knockouts screen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists every knockout and opens a bracket', async () => {
    mockList.mockResolvedValue([ko(1), ko(2), ko(3), ko(4), ko(5)]);
    const { findAllByText, getByText } = render(ui());
    expect(await findAllByText(/^Cup \d$/)).toHaveLength(5);
    expect(getByText(/my knockouts/i)).toBeTruthy();
    fireEvent.press(getByText('Cup 4'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k4' } });
  });

  it('goes back from the header button', async () => {
    mockList.mockResolvedValue([ko(1)]);
    const { getByLabelText, findByText } = render(ui());
    await findByText('Cup 1');
    fireEvent.press(getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows an empty state', async () => {
    mockList.mockResolvedValue([]);
    const { findByText } = render(ui());
    expect(await findByText(/no knockouts yet/i)).toBeTruthy();
  });

  it('shows an error and retries', async () => {
    mockList.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([ko(1)]);
    const { findByText } = render(ui());
    fireEvent.press(await findByText(/retry/i));
    expect(await findByText('Cup 1')).toBeTruthy();
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });
});
