import { strengthLabel, passwordFormReady } from '@/lib/password';

it('labels strength 0-4', () => {
  expect([0, 1, 2, 3, 4].map(strengthLabel)).toEqual(['Too weak', 'Too weak', 'Fair', 'Strong', 'Very strong']);
});

describe('passwordFormReady', () => {
  const ok = { current: 'a', next: 'smash2026!', confirm: 'smash2026!' };
  it('true when complete', () => expect(passwordFormReady(ok)).toBe(true));
  it('false without current', () => expect(passwordFormReady({ ...ok, current: '' })).toBe(false));
  it('false when a rule fails', () => expect(passwordFormReady({ ...ok, next: 'smash2026', confirm: 'smash2026' })).toBe(false));
  it('false on mismatch', () => expect(passwordFormReady({ ...ok, confirm: 'smash2026?' })).toBe(false));
});
