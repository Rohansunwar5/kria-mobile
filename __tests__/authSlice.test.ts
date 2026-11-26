import MockAdapter from 'axios-mock-adapter';
import { configureStore } from '@reduxjs/toolkit';
import API from '@/api/axios';
import reducer, {
  beginOnboardingHandoff,
  bootstrapAuth,
  googleSignIn,
  logout,
  setSavedTournaments,
} from '@/store/slices/authSlice';
import { googleSignOut } from '@/lib/googleSignIn';
import { saveProfileOnChange, store } from '@/store';
import { clearAuth, getProfile, getToken, setAuth } from '@/lib/storage';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/lib/googleSignIn', () => ({ googleSignOut: jest.fn(() => Promise.resolve()) }));
// Never settles: a logout that waited on it would hang the test.
const mockUnregister = jest.fn(() => new Promise<void>(() => {}));
jest.mock('@/lib/push', () => ({ unregisterPushToken: () => mockUnregister() }));

const initial = reducer(undefined, { type: '@@INIT' });

describe('authSlice reducers', () => {
  it('has a clean initial state (no sync storage read)', () => {
    expect(initial.user).toBeNull();
    expect(initial.role).toBeNull();
    expect(initial.accessToken).toBeNull();
    expect(initial.registrationStep).toBe(1);
  });

  // SERVER-GAPS #15: the bookmark flips at once; the server's list then settles it.
  it('setSavedTournaments replaces the saved list, and ignores a logged-out state', () => {
    const user = { _id: 'u1', firstName: 'A', lastName: 'B', email: 'e', phone: 'p', status: 'verified', savedTournaments: ['t0'] };
    expect(reducer({ ...initial, user }, setSavedTournaments(['t0', 't1'])).user!.savedTournaments).toEqual(['t0', 't1']);
    expect(reducer(initial, setSavedTournaments(['t1'])).user).toBeNull();
  });

  it('login.fulfilled stores user, role, and token in state', () => {
    const action = {
      type: 'auth/login/fulfilled',
      payload: {
        role: 'player',
        responseData: {
          player: { _id: '1', firstName: 'A', lastName: 'B', email: 'a@b.c', phone: '1', status: 'active' },
          accessToken: 'tok',
        },
      },
    };
    const next = reducer(initial, action);
    expect(next.role).toBe('player');
    expect(next.accessToken).toBe('tok');
    expect(next.user?._id).toBe('1');
  });

  it('logout.fulfilled also drops a pending onboarding handoff', () => {
    const next = reducer({ ...initial, pendingOnboarding: true }, { type: 'auth/logout/fulfilled' });
    expect(next.pendingOnboarding).toBe(false);
  });

  it('register.fulfilled advances to step 2 with email', () => {
    const action = { type: 'auth/register/fulfilled', payload: { email: 'a@b.c' } };
    const next = reducer(initial, action);
    expect(next.registrationStep).toBe(2);
    expect(next.registrationEmail).toBe('a@b.c');
  });
});

// SERVER-GAPS #35: "Continue with Google". `isNew` sends the player through
// Your game; the AuthGate reads both in the same update.
describe('Google sign-in', () => {
  const google = (isNew: boolean) => reducer(initial, {
    type: 'auth/google/fulfilled',
    payload: { role: 'player', responseData: { accessToken: 't', player: { _id: 'p' }, isNew } },
  });

  it('google.fulfilled signs a new player in and starts onboarding', () => {
    const next = google(true);
    expect(next.user?._id).toBe('p');
    expect(next.accessToken).toBe('t');
    expect(next.pendingOnboarding).toBe(true);
  });

  it('google.fulfilled for a returning player goes straight in', () => {
    expect(google(false).pendingOnboarding).toBe(false);
  });

  it('googleSignIn posts the token and stores the session', async () => {
    const mock = new MockAdapter(API);
    mock.onPost('/player/auth/google', { idToken: 'tok' }).reply(200, { data: { data: { accessToken: 't', player: { _id: 'p' }, isNew: false } } });
    const store = configureStore({ reducer: { auth: reducer } });
    await store.dispatch(googleSignIn({ idToken: 'tok' }));
    expect(store.getState().auth.accessToken).toBe('t');
    mock.restore();
  });

  it('logout signs out of Google too, so the picker shows next time', async () => {
    const store = configureStore({ reducer: { auth: reducer } });
    await store.dispatch(logout());
    expect(googleSignOut).toHaveBeenCalledTimes(1);
  });
});

// LAUNCH-AUDIT H20: a cold start that was offline, got a 5xx or landed during a
// deploy cleared the token, and nothing renewed it, so players were signed out.
describe('cold start (bootstrapAuth)', () => {
  let mock: MockAdapter;
  const player = { _id: 'p1', firstName: 'Asha' };
  const makeStore = () => {
    const store = configureStore({ reducer: { auth: reducer } });
    saveProfileOnChange(store);
    return store;
  };
  const start = async () => {
    const store = makeStore();
    await store.dispatch(bootstrapAuth());
    return store.getState().auth;
  };
  beforeEach(async () => {
    mock = new MockAdapter(API);
    await clearAuth();
    await setAuth('tok-1', 'player');
    mock.onPost('/player/auth/refresh-token').reply(200, { data: { data: { accessToken: 'tok-1' } } });
  });
  afterEach(() => mock.restore());

  it('keeps the token when the server cannot be reached', async () => {
    mock.onGet('/player/auth/profile').networkError();
    await start();
    expect(await getToken()).toBe('tok-1');
  });

  it('keeps the token on a server error', async () => {
    mock.onGet('/player/auth/profile').reply(503);
    await start();
    expect(await getToken()).toBe('tok-1');
  });

  it('opens signed in, on the last profile it saw, when offline', async () => {
    mock.onGet('/player/auth/profile').replyOnce(200, { data: { data: player } });
    await start();
    mock.onGet('/player/auth/profile').networkError();

    const auth = await start();
    expect(auth.bootstrapped).toBe(true);
    expect(auth.user?._id).toBe('p1');
  });

  it('opens signed in offline straight after a sign-in, and on the latest edits', async () => {
    const store = makeStore();
    store.dispatch({ type: 'auth/login/fulfilled', payload: { role: 'player', responseData: { player, accessToken: 'tok-1' } } });
    store.dispatch({ type: 'auth/updateProfile/fulfilled', payload: { firstName: 'Ashwini' } });
    mock.onGet('/player/auth/profile').networkError();

    const auth = await start();
    expect(auth.user?.firstName).toBe('Ashwini');
  });

  it('signs out on a 401', async () => {
    mock.onGet('/player/auth/profile').replyOnce(200, { data: { data: player } });
    await start();
    mock.onGet('/player/auth/profile').reply(401);

    const auth = await start();
    expect(auth.user).toBeNull();
    expect(await getToken()).toBeNull();
  });

  it('renews the token, so a player who opens the app weekly stays signed in', async () => {
    mock.onGet('/player/auth/profile').reply(200, { data: { data: player } });
    mock.onPost('/player/auth/refresh-token').reply(200, { data: { data: { accessToken: 'tok-2' } } });
    await start();
    await waitFor(async () => expect(await getToken()).toBe('tok-2'));
  });

  it('does not bring a token back after a logout that came first', async () => {
    let answer!: (r: [number, unknown]) => void;
    mock.onGet('/player/auth/profile').reply(200, { data: { data: player } });
    mock.onPost('/player/auth/refresh-token').reply(() => new Promise((r) => { answer = r; }));
    mock.onPost('/player/auth/logout').reply(200, {});
    const store = configureStore({ reducer: { auth: reducer } });
    await store.dispatch(bootstrapAuth());
    await waitFor(() => expect(answer).toBeDefined());

    await store.dispatch(logout());
    answer([200, { data: { data: { accessToken: 'tok-2' } } }]);
    await new Promise((r) => setTimeout(r, 0));
    expect(await getToken()).toBeNull();
  });
});

// LAUNCH-AUDIT H1: logging out ends the session on the server too, so a copied
// token stops working.
describe('logout ends the server session', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => mock.restore());

  it('sends the token it is about to clear', async () => {
    await setAuth('tok-1', 'player');
    let sent: unknown;
    mock.onPost('/player/auth/logout').reply((config) => { sent = config.headers?.Authorization; return [200, {}]; });

    await configureStore({ reducer: { auth: reducer } }).dispatch(logout());

    await waitFor(() => expect(sent).toBe('Bearer tok-1'));
    expect(await getToken()).toBeNull();
  });

  it('does not wait for the server to answer', async () => {
    await setAuth('tok-1', 'player');
    mock.onPost('/player/auth/logout').reply(() => new Promise(() => {}));

    await configureStore({ reducer: { auth: reducer } }).dispatch(logout());

    expect(await getToken()).toBeNull();
  });

  it('skips the call when the token is already gone (the 401 sign-out)', async () => {
    await clearAuth();
    await configureStore({ reducer: { auth: reducer } }).dispatch(logout());
    expect(mock.history.post).toHaveLength(0);
  });

  // Log out, a deleted account and a 401 all end here, so each stops this phone's pushes.
  it("releases this phone's push token on every logout, 401 included, without waiting for it", async () => {
    mockUnregister.mockClear();
    await setAuth('tok-1', 'player');
    mock.onPost('/player/auth/logout').reply(200, {});
    await configureStore({ reducer: { auth: reducer } }).dispatch(logout());
    await clearAuth(); // the 401 sign-out: the interceptor already cleared the token
    await configureStore({ reducer: { auth: reducer } }).dispatch(logout());
    expect(mockUnregister).toHaveBeenCalledTimes(2);
  });
});

// LAUNCH-AUDIT M17: logging out (and a 401 or a deleted account, which both log out)
// left the last player's data in memory for whoever signed in next.
describe('logout clears the last player out of memory', () => {
  it('resets every slice, keeping only that start-up has finished', async () => {
    await clearAuth();
    const initial = store.getState();
    store.dispatch({ type: 'auth/bootstrap/fulfilled', payload: { token: null, role: null, profile: null } });
    store.dispatch({ type: 'auth/login/fulfilled', payload: { role: 'player', responseData: { player: { _id: 'p1', phone: '9876543210' }, accessToken: 'tok-1' } } });
    store.dispatch({ type: 'auth/fetchPlayerStats/fulfilled', payload: { totalTournaments: 3 } });
    store.dispatch({ type: 'registration/fetchTournamentHistory/fulfilled', payload: [{ _id: 'h1' }] });
    store.dispatch({ type: 'auth/register/fulfilled', payload: { email: 'a@b.c' } });
    store.dispatch(beginOnboardingHandoff());

    await store.dispatch(logout());

    expect(store.getState()).toEqual({ ...initial, auth: { ...initial.auth, bootstrapped: true } });
    expect(await getProfile()).toBeNull(); // saveProfileOnChange wrote nothing back
  });
});
