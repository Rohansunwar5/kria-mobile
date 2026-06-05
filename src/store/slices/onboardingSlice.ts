import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OnboardingState {
  sport: string | null;
  fullName: string;
  age: number | null;
  gender: string | null;
  photoUri: string | null;
}

export const initialOnboardingState: OnboardingState = {
  sport: null,
  fullName: '',
  age: null,
  gender: null,
  photoUri: null,
};

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState: initialOnboardingState,
  reducers: {
    setSport: (state, action: PayloadAction<string>) => {
      state.sport = action.payload;
    },
    setProfileFields: (
      state,
      action: PayloadAction<Partial<Pick<OnboardingState, 'fullName' | 'age' | 'gender' | 'photoUri'>>>
    ) => {
      Object.assign(state, action.payload);
    },
    resetOnboarding: () => initialOnboardingState,
  },
});

export const { setSport, setProfileFields, resetOnboarding } = onboardingSlice.actions;

export default onboardingSlice.reducer;
