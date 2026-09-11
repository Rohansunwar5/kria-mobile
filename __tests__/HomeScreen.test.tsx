import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import tournamentReducer from '@/store/slices/tournamentSlice';
import Home from '../src/app/(tabs)/home';

// This test is about the portal switch, not about loading. Stub the thunk so
// nothing reaches axios, and give the screen a real store — the repo builds
// stores with preloadedState rather than a mock-store library (see
// __tests__/uploadProfileImage.test.ts). Do NOT add redux-mock-store.
jest.mock('@/store/slices/tournamentSlice', () => {
  const actual = jest.requireActual('@/store/slices/tournamentSlice');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    fetchPublicTournaments: Object.assign(() => ({ type: 'tournament/noop' }), { pending: { type: 'p' }, fulfilled: { type: 'f' }, rejected: { type: 'r' } }),
  };
});

// Same shape as useQuickCricket.test.tsx / EventsPortal.test.tsx: there is no
// navigation container around a bare screen render, so focus degrades to an
// effect and every push is a no-op.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  router: { push: jest.fn() },
  useIsFocused: () => true,
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));

jest.mock('../src/api/quickMatch', () => ({ listMyQuickMatches: jest.fn(async () => []) }));
jest.mock('../src/lib/useCareer', () => ({
  useCareer: () => ({ profile: { sports: [], bestSport: null }, recent: [], loading: false, error: false, recentError: false, reload: jest.fn() }),
}));

// Each slice's own initial state, with only the fields this screen reads
// overridden — a hand-written partial does not typecheck against the full
// slice state, and `as any` is not available here.
const INIT = { type: '@@preload' };

const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer, tournament: tournamentReducer },
    preloadedState: {
      auth: {
        ...authReducer(undefined, INIT),
        user: { _id: 'p1', firstName: 'Rohan', lastName: 'Sunwar', email: 'rohan@kria.club', phone: '9000000000', status: 'active' },
      },
      tournament: { ...tournamentReducer(undefined, INIT), publicTournaments: [] },
    },
  });

// The quick-match list resolves on the next microtask, so flush it before
// asserting — otherwise every test logs an out-of-act update it did not cause.
const renderHome = async () => {
  const utils = render(<Provider store={makeStore()}><Home /></Provider>);
  await act(async () => {});
  return utils;
};

describe('Home', () => {
  it('opens on the events portal', async () => {
    const { getByLabelText } = await renderHome();
    expect(getByLabelText('Events').props.accessibilityState.selected).toBe(true);
  });

  it('crosses to the play portal and back', async () => {
    const { getByLabelText } = await renderHome();
    fireEvent.press(getByLabelText('Play'));
    await waitFor(() => expect(getByLabelText('Host a match')).toBeTruthy());

    fireEvent.press(getByLabelText('Events'));
    await waitFor(() => expect(getByLabelText('Play').props.accessibilityState.selected).toBe(false));
  });

  // The masthead renders from cached auth state, which is the whole point of
  // the Patterns sheet — it must survive every load and every error.
  it('keeps the masthead across a portal change', async () => {
    const { getByLabelText, getByText } = await renderHome();
    expect(getByText('Kria')).toBeTruthy();
    fireEvent.press(getByLabelText('Play'));
    expect(getByText('Kria')).toBeTruthy();
  });
});
