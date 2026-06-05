import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tournamentReducer from './slices/tournamentSlice';
import registrationReducer from './slices/registrationSlice';
import teamReducer from './slices/teamSlice';
import onboardingReducer from './slices/onboardingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tournament: tournamentReducer,
    registration: registrationReducer,
    team: teamReducer,
    onboarding: onboardingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
