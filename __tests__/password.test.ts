import { strengthLabel, passwordFormReady, passwordRules, passwordScore, passwordOk } from '@/lib/password';

it('labels strength 0-4', () => {
  expect([0, 1, 2, 3, 4].map(strengthLabel)).toEqual(['', 'Too weak', 'Fair', 'Strong', 'Very strong']);
  expect(strengthLabel(2)).toBe('Fair');
});

it('has one required and one soft rule', () => {
  expect(passwordRules('abcdefgh')).toEqual([
    { label: 'At least 8 characters', met: true, required: true },
    { label: 'Add a number or symbol (recommended)', met: false, required: false },
  ]);
  expect(passwordRules('a1')[1].met).toBe(true);
  expect(passwordRules('a!')[1].met).toBe(true);
});

it('scores on its own scale', () => {
  const s = ['', 'abc', 'abcdefgh', 'abcdefg1', 'abcdefghijk!', 'abcdefghijkl'].map(passwordScore);
  expect(s).toEqual([0, 1, 2, 3, 4, 2]);
});

it('passwordOk is 8+ characters', () => {
  expect(passwordOk('abcdefg')).toBe(false);
  expect(passwordOk('abcdefgh')).toBe(true);
});

describe('passwordFormReady', () => {
  const ok = { current: 'a', next: 'abcdefgh', confirm: 'abcdefgh' };
  it('true with only the required rule', () => expect(passwordFormReady(ok)).toBe(true));
  it('false without current', () => expect(passwordFormReady({ ...ok, current: '' })).toBe(false));
  it('false when too short', () => expect(passwordFormReady({ ...ok, next: 'abcdefg', confirm: 'abcdefg' })).toBe(false));
  it('false on mismatch', () => expect(passwordFormReady({ ...ok, confirm: 'abcdefgi' })).toBe(false));
});
