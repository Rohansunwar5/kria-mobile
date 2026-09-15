import { Text } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import { ThemeProvider, useTheme, useThemeMode, THEME_MODE_KEY } from '../src/lib/theme/ThemeProvider';
import { dark, light } from '../src/lib/theme/palette';
import * as secureStore from '../src/lib/secureStore';

let mockSystemScheme: 'light' | 'dark' | null = 'dark';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockSystemScheme,
}));

function Probe() {
  const theme = useTheme();
  const { mode, resolved } = useThemeMode();
  return <Text testID="probe">{`${theme.bg}|${mode}|${resolved}`}</Text>;
}

function probe() {
  return screen.getByTestId('probe').props.children as string;
}

beforeEach(() => {
  mockSystemScheme = 'dark';
  jest.restoreAllMocks();
  jest.spyOn(secureStore, 'getItem').mockResolvedValue(null);
  jest.spyOn(secureStore, 'setItem').mockResolvedValue();
});

describe('ThemeProvider', () => {
  // The app has always been dark and the light theme has never been on a
  // device. Defaulting to `system` would flip every user on a light phone to
  // an unverified UI at update time.
  it('defaults to dark, not to the system scheme', async () => {
    mockSystemScheme = 'light';
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => {});
    expect(probe()).toBe(`${dark.bg}|dark|dark`);
  });

  it('restores a persisted mode on mount', async () => {
    jest.spyOn(secureStore, 'getItem').mockResolvedValue('light');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => {});
    expect(probe()).toBe(`${light.bg}|light|light`);
  });

  it('follows the system scheme when the mode is system', async () => {
    mockSystemScheme = 'light';
    jest.spyOn(secureStore, 'getItem').mockResolvedValue('system');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => {});
    expect(probe()).toBe(`${light.bg}|system|light`);
  });

  // useColorScheme returns null when the platform cannot say. Falling through
  // to light there would flip the app on a device that never asked for it.
  it('resolves system to dark when the platform reports nothing', async () => {
    mockSystemScheme = null;
    jest.spyOn(secureStore, 'getItem').mockResolvedValue('system');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => {});
    expect(probe()).toBe(`${dark.bg}|system|dark`);
  });

  it('persists a mode change', async () => {
    const setItem = jest.spyOn(secureStore, 'setItem').mockResolvedValue();
    let setMode: (m: 'system' | 'light' | 'dark') => void = () => {};
    function Setter() {
      setMode = useThemeMode().setMode;
      return null;
    }
    render(<ThemeProvider><Setter /><Probe /></ThemeProvider>);
    await act(async () => {});
    await act(async () => { setMode('light'); });
    expect(probe()).toBe(`${light.bg}|light|light`);
    expect(setItem).toHaveBeenCalledWith(THEME_MODE_KEY, 'light');
  });

  // The mount effect's persisted-load promise can still be in flight when the
  // user makes an explicit choice. An explicit setMode must win regardless of
  // arrival order — a slower-resolving disk read must not clobber it once it
  // finally lands.
  it('lets an explicit setMode win over a slower-resolving persisted load', async () => {
    let resolveGetItem: (value: string | null) => void = () => {};
    jest.spyOn(secureStore, 'getItem').mockReturnValue(
      new Promise<string | null>((resolve) => {
        resolveGetItem = resolve;
      }),
    );
    let setMode: (m: 'system' | 'light' | 'dark') => void = () => {};
    function Setter() {
      setMode = useThemeMode().setMode;
      return null;
    }
    render(<ThemeProvider><Setter /><Probe /></ThemeProvider>);

    // The persisted load is still pending — the user picks a mode now.
    await act(async () => {
      setMode('light');
    });
    expect(probe()).toBe(`${light.bg}|light|light`);

    // The disk read finally resolves with a different, stale value.
    await act(async () => {
      resolveGetItem('dark');
    });
    await act(async () => {});

    // The explicit choice must still stand.
    expect(probe()).toBe(`${light.bg}|light|light`);
  });

  // A corrupted or hand-edited store value must not brick the app.
  it('ignores an unrecognised persisted value', async () => {
    jest.spyOn(secureStore, 'getItem').mockResolvedValue('chartreuse');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => {});
    expect(probe()).toBe(`${dark.bg}|dark|dark`);
  });

  // ~70 existing test files render components with no provider. The context
  // default is the only reason they work, and it must keep working.
  it('serves dark to a consumer with no provider mounted', () => {
    render(<Probe />);
    expect(probe()).toBe(`${dark.bg}|dark|dark`);
  });
});
