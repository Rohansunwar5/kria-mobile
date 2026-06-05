import reducer, {
  setSport,
  setProfileFields,
  setLevel,
  toggleMotivation,
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

  it('sets level', () => {
    const s = reducer(initialOnboardingState, setLevel('intermediate'));
    expect(s.level).toBe('intermediate');
  });

  it('toggles motivation on and off', () => {
    const on = reducer(initialOnboardingState, toggleMotivation('winning'));
    expect(on.motivations).toEqual(['winning']);
    const off = reducer(on, toggleMotivation('winning'));
    expect(off.motivations).toEqual([]);
  });

  it('resets to initial state', () => {
    const dirty = reducer(initialOnboardingState, setSport('badminton'));
    const s = reducer(dirty, resetOnboarding());
    expect(s).toEqual(initialOnboardingState);
  });
});
