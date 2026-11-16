import MockAdapter from 'axios-mock-adapter';
import { configureStore } from '@reduxjs/toolkit';
import API from '@/api/axios';
import reducer, {
  googleSignIn,
  logout,
  setSavedTournaments,
} from '@/store/slices/authSlice';
import { googleSignOut } from '@/lib/googleSignIn';

jest.mock('@/lib/googleSignIn', () => ({ googleSignOut: jest.fn(() => Promise.resolve()) }));

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
