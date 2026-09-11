import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import tournamentReducer, { type Tournament } from '@/store/slices/tournamentSlice';
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

const tournament = (over: Partial<Tournament>): Tournament => ({
  _id: 't1',
  name: 'Kria Smash Cup',
  sport: 'badminton',
  status: 'registration_open',
  startDate: '2026-09-02T00:00:00.000Z',
  endDate: '2026-09-07T00:00:00.000Z',
  ...over,
}) as Tournament;

const makeStore = (publicTournaments: Tournament[] = []) =>
  configureStore({
    reducer: { auth: authReducer, tournament: tournamentReducer },
    preloadedState: {
      auth: {
        ...authReducer(undefined, INIT),
        user: { _id: 'p1', firstName: 'Rohan', lastName: 'Sunwar', email: 'rohan@kria.club', phone: '9000000000', status: 'active' },
      },
      tournament: { ...tournamentReducer(undefined, INIT), publicTournaments },
    },
  });

// The quick-match list resolves on the next microtask, so flush it before
// asserting — otherwise every test logs an out-of-act update it did not cause.
const renderHome = async (tournaments: Tournament[] = []) => {
  const utils = render(<Provider store={makeStore(tournaments)}><Home /></Provider>);
  await act(async () => {});
  return utils;
};

// PortalSwitch relabels the PLAY tab to 'Play, a match is live' the moment a
// fixture has a live quick match, so an exact-string query would break the
// first time one does. Match the prefix instead.
const PLAY_TAB = /^Play/;

describe('Home', () => {
  it('opens on the events portal', async () => {
    const { getByLabelText, getByTestId } = await renderHome();
    expect(getByLabelText('Events').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('events-list')).toBeTruthy();
  });

  it('crosses to the play portal and back', async () => {
    const { getByLabelText, getByTestId, queryByLabelText, queryByTestId } = await renderHome();

    fireEvent.press(getByLabelText(PLAY_TAB));
    await waitFor(() => expect(getByLabelText('Host a match')).toBeTruthy());
    expect(queryByTestId('events-list')).toBeNull();

    // Crossing back has to restore the events BODY, not just repaint the tab —
    // the two portals are swapped siblings, so a half-applied switch would
    // still flip the selected state while showing the wrong content.
    fireEvent.press(getByLabelText('Events'));
    await waitFor(() => expect(getByTestId('events-list')).toBeTruthy());
    expect(queryByLabelText('Host a match')).toBeNull();
    expect(getByLabelText(PLAY_TAB).props.accessibilityState.selected).toBe(false);
  });

  // The strip used to be unit-tested through portalStrip and nothing asserted
  // what the SCREEN puts in it, so a wrong count reached it unseen: it counted
  // every visible tournament, which includes the ongoing and completed ones,
  // under the word OPEN. This renders the real screen over a realistic mixed
  // list — portalStrip deliberately unmocked — so any future desync of the
  // strip from what is open fails here.
  it('counts only the tournaments open for entry in the strip', async () => {
    const { getByText } = await renderHome([
      tournament({ _id: 'a', status: 'registration_open' }),
      tournament({ _id: 'b', status: 'ongoing', name: 'City League' }),
      tournament({ _id: 'c', status: 'registration_open', name: 'Monsoon Open' }),
      tournament({ _id: 'd', status: 'completed', name: 'Winter Cup' }),
      tournament({ _id: 'e', status: 'draft', name: 'Unannounced' }),
      tournament({ _id: 'f', status: 'registration_open', name: 'Pulled Event', isActive: false }),
    ]);

    expect(getByText('ORGANISER-HOSTED · 2 OPEN')).toBeTruthy();
  });

  it('reports nothing open when every visible event has started or finished', async () => {
    const { getByText } = await renderHome([
      tournament({ _id: 'a', status: 'ongoing' }),
      tournament({ _id: 'b', status: 'completed', name: 'Winter Cup' }),
    ]);

    expect(getByText('ORGANISER-HOSTED · 0 OPEN')).toBeTruthy();
  });

  // Both portals stay mounted so neither loses its scroll position, which makes
  // "hidden" a real obligation rather than a side effect of unmounting: the
  // pane behind must be unreachable by touch AND by a screen reader, not merely
  // invisible. The default queries already exclude accessibility-hidden
  // subtrees, so the pair of assertions below is the proof — present in the
  // tree, absent to anyone using it.
  it('keeps the inactive portal mounted but out of reach of a screen reader', async () => {
    const { getByLabelText, queryByLabelText } = await renderHome();

    expect(queryByLabelText('Host a match')).toBeNull();
    expect(getByLabelText('Host a match', { includeHiddenElements: true })).toBeTruthy();

    fireEvent.press(getByLabelText(PLAY_TAB));

    await waitFor(() => expect(getByLabelText('Host a match')).toBeTruthy());
    expect(queryByLabelText('City')).toBeNull();
    expect(getByLabelText('City', { includeHiddenElements: true })).toBeTruthy();
  });

  // The masthead renders from cached auth state, which is the whole point of
  // the Patterns sheet — it must survive every load and every error.
  it('keeps the masthead across a portal change', async () => {
    const { getByLabelText, getByText } = await renderHome();
    expect(getByText('Kria')).toBeTruthy();
    fireEvent.press(getByLabelText(PLAY_TAB));
    expect(getByText('Kria')).toBeTruthy();
  });
});
