import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { resendOtp, requestPasswordReset, resetPassword } from '@/api/auth';
import { passwordRules, passwordScore } from '@/lib/password';

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

  it('resetPassword posts email, otp and newPassword', async () => {
    mock.onPost('/player/auth/reset-password').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ email: 'a@b.co', otp: '123456', newPassword: 'abcdefg1' });
      return [200, { data: {} }];
    });
    await expect(resetPassword('a@b.co', '123456', 'abcdefg1')).resolves.toBeUndefined();
  });
});

describe('password rules', () => {
  it('requires 8 characters; a number or symbol is recommended', () => {
    expect(passwordRules('abcdefgh').map((r) => r.met)).toEqual([true, false]);
    expect(passwordRules('abcdefg1').map((r) => r.met)).toEqual([true, true]);
    expect(passwordRules('a1!').map((r) => r.met)).toEqual([false, true]);
  });

  it('scores on the length-plus-mix scale', () => {
    expect(passwordScore('')).toBe(0);
    expect(passwordScore('short')).toBe(1);
    expect(passwordScore('abcdefg1!')).toBe(3);
    expect(passwordScore('abcdefghij1!')).toBe(4);
  });
});
