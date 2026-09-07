import { goBack } from '../src/lib/nav';

const router = () => {
  const calls: string[] = [];
  return {
    calls,
    canGoBack: jest.fn(() => false),
    back: jest.fn(() => calls.push('back')),
    replace: jest.fn((href: string) => calls.push(`replace:${href}`)),
  };
};

describe('goBack', () => {
  it('goes back when there is a screen behind this one', () => {
    const r = router();
    r.canGoBack.mockReturnValue(true);
    goBack(r as any);
    expect(r.calls).toEqual(['back']);
  });

  it('falls back to home when the screen was opened directly', () => {
    // Deep link, notification tap, or a web refresh on a detail URL: the history
    // is empty, and an unguarded back() strands the user with a navigator warning.
    const r = router();
    goBack(r as any);
    expect(r.calls).toEqual(['replace:/(tabs)/home']);
  });

  it('honours a caller-supplied fallback', () => {
    const r = router();
    goBack(r as any, '/(auth)/login');
    expect(r.calls).toEqual(['replace:/(auth)/login']);
  });
});
