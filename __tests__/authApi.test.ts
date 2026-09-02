import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { resendOtp, requestPasswordReset } from '@/api/auth';
import { passwordRules, passwordScore } from '@/components/auth/PasswordRules';

describe('auth api', () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(API);
  });
  afterEach(() => {
    mock.restore();
  });

  it('resendOtp posts the email to /player/auth/resend-otp', async () => {
    mock.onPost('/player/auth/resend-otp').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ email: 'rohan@kria.club' });
      return [200, { data: {} }];
    });
    await expect(resendOtp('rohan@kria.club')).resolves.toBeUndefined();
  });

  it('resendOtp rejects so the screen can leave the resend button available', async () => {
    mock.onPost('/player/auth/resend-otp').reply(429);
    await expect(resendOtp('rohan@kria.club')).rejects.toBeTruthy();
  });

  it('requestPasswordReset posts to /player/auth/forgot-password', async () => {
    mock.onPost('/player/auth/forgot-password').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ email: 'rohan@kria.club' });
      return [200, { data: {} }];
    });
    await expect(requestPasswordReset('rohan@kria.club')).resolves.toBeUndefined();
  });
});

describe('password rules', () => {
  it('requires 8 characters, a number and a symbol', () => {
    expect(passwordRules('abcdefgh').map((r) => r.met)).toEqual([true, false, false]);
    expect(passwordRules('abcdefg1').map((r) => r.met)).toEqual([true, true, false]);
    expect(passwordRules('abcdefg1!').map((r) => r.met)).toEqual([true, true, true]);
    expect(passwordRules('a1!').map((r) => r.met)).toEqual([false, true, true]);
  });

  it('scores 0 for empty, 3 when every rule is met and 4 past 12 characters', () => {
    expect(passwordScore('')).toBe(0);
    expect(passwordScore('short')).toBe(0);
    expect(passwordScore('abcdefg1!')).toBe(3);
    expect(passwordScore('abcdefghij1!')).toBe(4);
  });
});
