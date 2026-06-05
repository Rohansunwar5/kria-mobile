import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'competitive';

export interface OnboardingState {
  sport: string | null;
  fullName: string;
  age: number | null;
  gender: string | null;
  photoUri: string | null;
  level: SkillLevel | null;
  motivations: string[];
}

export const initialOnboardingState: OnboardingState = {
  sport: null,
  fullName: '',
  age: null,
  gender: null,
  photoUri: null,
  level: null,
  motivations: [],
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
    setLevel: (state, action: PayloadAction<SkillLevel>) => {
      state.level = action.payload;
    },
    toggleMotivation: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      state.motivations = state.motivations.includes(key)
        ? state.motivations.filter((m) => m !== key)
        : [...state.motivations, key];
    },
    resetOnboarding: () => initialOnboardingState,
  },
});

export const { setSport, setProfileFields, setLevel, toggleMotivation, resetOnboarding } =
  onboardingSlice.actions;

export default onboardingSlice.reducer;
