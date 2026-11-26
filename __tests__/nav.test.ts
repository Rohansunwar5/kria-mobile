import { Alert, Linking } from 'react-native';
import { goBack, openWebLink } from '../src/lib/nav';

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

// LAUNCH-AUDIT: organiser-supplied links (a team's WhatsApp group) open only as web pages.
describe('openWebLink', () => {
  const flush = () => new Promise((r) => setImmediate(r));
  let open: jest.SpyInstance;
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks(); // Linking.openURL is already jest-expo's mock, so a spy keeps its calls
    open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('opens http and https links', () => {
    openWebLink('https://chat.whatsapp.com/abc');
    openWebLink('HTTP://example.com');
    expect(open.mock.calls).toEqual([['https://chat.whatsapp.com/abc'], ['HTTP://example.com']]);
  });

  it('refuses any other scheme, and says so', () => {
    for (const url of ['javascript:alert(1)', 'intent://x#Intent;end', 'tel:123', 'chat.whatsapp.com/abc']) openWebLink(url);
    expect(open).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledTimes(4);
  });

  it('says so when the phone cannot open it, instead of an unhandled rejection', async () => {
    open.mockRejectedValue(new Error('no handler'));
    openWebLink('https://example.com');
    await flush();
    expect(alert).toHaveBeenCalledWith("Couldn't open this link");
  });
});
