import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer, { logout } from './slices/authSlice';
import registrationReducer from './slices/registrationSlice';
import * as storage from '@/lib/storage';

const appReducer = combineReducers({
  auth: authReducer,
  registration: registrationReducer,
});

/**
 * Logging out drops everything the last player loaded (LAUNCH-AUDIT M17). A 401
 * and a deleted account both end in logout. Only `bootstrapped` stays: it is the
 * app's start-up, not the player's, and losing it would leave a blank screen.
 */
const rootReducer: typeof appReducer = (state, action) => {
  if (!logout.fulfilled.match(action)) return appReducer(state, action);
  const fresh = appReducer(undefined, action);
  return { ...fresh, auth: { ...fresh.auth, bootstrapped: !!state?.auth?.bootstrapped } };
};

export const store = configureStore({ reducer: rootReducer });

/**
 * Keeps the signed-in profile on the phone whenever it changes (sign-in, an
 * edit, a new photo), so a cold start offline opens signed in (LAUNCH-AUDIT H20).
 */
export function saveProfileOnChange(s: { subscribe: (fn: () => void) => () => void; getState: () => { auth: { user: unknown } } }) {
  let last: unknown = null;
  return s.subscribe(() => {
    const user = s.getState().auth.user;
    if (user && user !== last) void storage.setProfile(user);
    last = user;
  });
}
saveProfileOnChange(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
