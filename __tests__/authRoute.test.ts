import { routeFor } from '@/lib/authRoute';

const PUB = ['(auth)', 'auction', 'live'];
const r = (signedIn: boolean, pendingOnboarding: boolean, root: string) => routeFor({ signedIn, pendingOnboarding, root, publicRoots: PUB });

describe('routeFor', () => {
  it('signed out outside public roots goes to welcome', () => {
    expect(r(false, false, '(tabs)')).toBe('/(auth)/welcome');
    expect(r(false, false, 'undefined')).toBe('/(auth)/welcome');
    expect(r(false, false, '(onboarding)')).toBe('/(auth)/welcome');
  });
  it('signed out on a public root stays', () => {
    expect(r(false, false, '(auth)')).toBeNull();
    expect(r(false, false, 'live')).toBeNull();
  });
  it('pending onboarding goes to your-game unless already in (onboarding)', () => {
    expect(r(true, true, '(auth)')).toBe('/(onboarding)/your-game');
    expect(r(true, true, '(tabs)')).toBe('/(onboarding)/your-game');
    expect(r(true, true, '(onboarding)')).toBeNull();
  });
  it('signed in in (auth) or with no route goes home', () => {
    expect(r(true, false, '(auth)')).toBe('/(tabs)/home');
    expect(r(true, false, 'undefined')).toBe('/(tabs)/home');
  });
  it('signed in elsewhere stays', () => {
    expect(r(true, false, '(onboarding)')).toBeNull();
    expect(r(true, false, '(tabs)')).toBeNull();
  });
  // LAUNCH-AUDIT H26 (your call, 23 Nov): no account is usable without a date of
  // birth, whether onboarding was skipped, interrupted or never shown (Google).
  it('signed in with no date of birth goes to that step, wherever they are', () => {
    const noDob = (root: string) => routeFor({ signedIn: true, pendingOnboarding: false, needsDob: true, root, publicRoots: PUB });
    expect(noDob('(tabs)')).toBe('/(onboarding)/for-tournaments');
    expect(noDob('live')).toBe('/(onboarding)/for-tournaments');
    expect(noDob('(onboarding)')).toBeNull();
    expect(routeFor({ signedIn: true, pendingOnboarding: true, needsDob: true, root: '(tabs)', publicRoots: PUB })).toBe('/(onboarding)/your-game');
  });
});
