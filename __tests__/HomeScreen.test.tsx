import { act, render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import Home from '../src/app/(tabs)/home';
import { fetchLiveFeed } from '../src/api/live';
import { latestTournaments } from '../src/api/tournaments';
import { listMyQuickKnockouts } from '../src/api/quickKnockout';
import { listMyQuickMatches } from '../src/api/quickMatch';

// There is no navigation container around a bare screen render, so focus
// degrades to an effect.
const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), navigate: (...a: unknown[]) => mockNavigate(...a) },
  useIsFocused: () => true,
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));

jest.mock('../src/api/live', () => ({ fetchLiveFeed: jest.fn(async () => ({ total: 0, items: [] })) }));
jest.mock('../src/api/tournaments', () => ({ latestTournaments: jest.fn(async () => []) }));
jest.mock('../src/api/quickKnockout', () => ({ listMyQuickKnockouts: jest.fn(async () => []) }));
jest.mock('../src/api/quickMatch', () => ({ listMyQuickMatches: jest.fn(async () => []) }));
jest.mock('../src/lib/useCareer', () => ({
  useCareer: () => ({ profile: { sports: [], bestSport: null }, recent: [], loading: false, error: false, recentError: false, reload: jest.fn() }),
}));

const INIT = { type: '@@preload' };

const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        ...authReducer(undefined, INIT),
        user: { _id: 'p1', firstName: 'Rohan', lastName: 'Sunwar', email: 'rohan@kria.club', phone: '9000000000', status: 'active' },
      },
    },
  });

// The lists resolve on the next microtask, so flush them before asserting.
const renderHome = async () => {
  const utils = render(<Provider store={makeStore()}><Home /></Provider>);
  await act(async () => {});
  return utils;
};

describe('Home', () => {
  it('opens straight on play, with no masthead or portal switch', async () => {
    const { getByLabelText, queryByLabelText, queryByText } = await renderHome();
    expect(getByLabelText('Host a match')).toBeTruthy();
    expect(queryByLabelText('Events')).toBeNull();
    expect(queryByLabelText('Profile')).toBeNull();
    expect(queryByText('Kria')).toBeNull();
  });

  it('peeks at live matches and links through to the full live list', async () => {
    (fetchLiveFeed as jest.Mock).mockResolvedValue({
      total: 1,
      items: [{ kind: 'quick', matchId: 'm1', sport: 'badminton', title: 'Rohan v Dev', startedAt: '2026-10-09T00:00:00.000Z' }],
    });
    const { getByText, getByLabelText } = await renderHome();

    expect(getByText('Live now')).toBeTruthy();
    expect(getByText('Rohan v Dev')).toBeTruthy();
    fireEvent.press(getByLabelText('View all live matches'));
    expect(mockPush).toHaveBeenCalledWith('/live');
  });

  it('leaves the live section out when nothing is live', async () => {
    (fetchLiveFeed as jest.Mock).mockResolvedValue({ total: 0, items: [] });
    const { queryByText } = await renderHome();
    expect(queryByText('Live now')).toBeNull();
  });

  // The two lists load side by side; a failed match list must not take the
  // knockouts down with it.
  it('still lists your knockouts when the quick-match list fails', async () => {
    (listMyQuickMatches as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    (listMyQuickKnockouts as jest.Mock).mockResolvedValueOnce([
      { _id: 'k1', name: 'Sunday Smash', status: 'live', format: 'singles', players: [] },
    ]);
    const { findByText } = await renderHome();

    expect(await findByText('Sunday Smash')).toBeTruthy();
  });

  it('previews the newest organiser tournaments and links through to Events', async () => {
    (latestTournaments as jest.Mock).mockResolvedValueOnce([
      { _id: 't1', name: 'JBN Badminton Tournament', sport: 'badminton', status: 'registration_open', startDate: '2026-09-22T00:00:00.000Z', venue: { city: 'Bangalore' } },
    ]);
    const { getByText, getByLabelText } = await renderHome();

    expect(getByText('Tournaments')).toBeTruthy();
    expect(getByText('JBN Badminton Tournament')).toBeTruthy();
    fireEvent.press(getByLabelText('View all tournaments'));
    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/events');
  });

  it('leaves the tournaments section out when there are none', async () => {
    const { queryByText } = await renderHome();
    expect(queryByText('View all tournaments')).toBeNull();
    expect(queryByText('Tournaments')).toBeNull();
  });
});
