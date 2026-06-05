import reducer, {
  setSport,
  setProfileFields,
  resetOnboarding,
  initialOnboardingState,
} from '@/store/slices/onboardingSlice';

describe('onboardingSlice', () => {
  it('sets sport', () => {
    const s = reducer(initialOnboardingState, setSport('badminton'));
    expect(s.sport).toBe('badminton');
  });

  it('merges profile fields', () => {
    const s = reducer(initialOnboardingState, setProfileFields({ fullName: 'Aarav Mehta', age: 24 }));
    expect(s.fullName).toBe('Aarav Mehta');
    expect(s.age).toBe(24);
    expect(s.gender).toBeNull();
  });

  it('does not expose level or motivations on state', () => {
    expect(initialOnboardingState).not.toHaveProperty('level');
    expect(initialOnboardingState).not.toHaveProperty('motivations');
  });

  it('resets to initial state', () => {
    const dirty = reducer(initialOnboardingState, setSport('badminton'));
    const s = reducer(dirty, resetOnboarding());
    expect(s).toEqual(initialOnboardingState);
  });
});
