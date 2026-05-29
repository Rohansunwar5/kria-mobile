import reducer, {
  resetRegistration,
  clearError,
} from '@/store/slices/authSlice';

const initial = reducer(undefined, { type: '@@INIT' });

describe('authSlice reducers', () => {
  it('has a clean initial state (no sync storage read)', () => {
    expect(initial.user).toBeNull();
    expect(initial.role).toBeNull();
    expect(initial.accessToken).toBeNull();
    expect(initial.registrationStep).toBe(1);
  });

  it('clearError resets the error', () => {
    const dirty = { ...initial, error: 'boom' };
    expect(reducer(dirty, clearError()).error).toBeNull();
  });

  it('resetRegistration returns to step 1', () => {
    const dirty = { ...initial, registrationStep: 3, registrationEmail: 'a@b.c' };
    const next = reducer(dirty, resetRegistration());
    expect(next.registrationStep).toBe(1);
    expect(next.registrationEmail).toBeNull();
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

  it('register.fulfilled advances to step 2 with email', () => {
    const action = { type: 'auth/register/fulfilled', payload: { email: 'a@b.c' } };
    const next = reducer(initial, action);
    expect(next.registrationStep).toBe(2);
    expect(next.registrationEmail).toBe('a@b.c');
  });
});
