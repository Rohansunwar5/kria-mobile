import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { PALETTES, dark, type Palette, type ThemeName } from './palette';
import { getItem, setItem } from '@/lib/secureStore';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODE_KEY = 'kria.theme.mode';

const MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

function isMode(value: string | null): value is ThemeMode {
  return value !== null && (MODES as readonly string[]).includes(value);
}

// The default value passed to createContext (rather than `null` with a
// runtime check) is what makes useTheme() work with no provider mounted at
// all: React only falls back to this default when a consumer has no matching
// Provider above it in the tree. That is deliberate, not a missing guard —
// the provider mounts once at the app root, but ~70 existing test files
// render components directly with no provider. Throwing on a missing provider
// would mean re-wrapping every one of those files to buy nothing.
const ThemeContext = createContext<Palette>(dark);

interface ModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolved: ThemeName;
}

const ModeContext = createContext<ModeContextValue>({
  mode: 'dark',
  setMode: () => {},
  resolved: 'dark',
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Dark, not `system`, and not a "still loading" state. The app has been dark
  // its whole life, so dark is what every user already sees — starting there
  // means a restored preference can only ever change the screen to something
  // the user explicitly chose. Starting at `system` would flash the wrong
  // theme on every launch for anyone whose phone disagrees with their choice.
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const system = useColorScheme();

  // Set synchronously inside setMode, before the persisted-load promise below
  // can possibly resolve. An explicit choice must win no matter which settles
  // first: the mount-time getItem() read and a user tapping the toggle are
  // racing, and the read is not guaranteed to lose just because it started
  // first. A ref (not state) is required — it must be readable inside the
  // effect's already-scheduled `.then` without that callback re-running.
  const userChose = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getItem(THEME_MODE_KEY)
      .then((stored) => {
        // An unrecognised value (corrupted, hand-edited, or written by a
        // future version) falls through to the default rather than bricking
        // the app on a colour preference. A value the user has since
        // overridden falls through for the same reason: this read reflects
        // whatever was on disk before that choice, so applying it now would
        // silently revert an action already taken.
        if (!cancelled && !userChose.current && isMode(stored)) setModeState(stored);
      })
      .catch(() => {
        // A keychain read can fail on a locked device. Dark is already the
        // state; there is nothing to recover and nothing worth surfacing.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // useColorScheme returns null when the platform cannot say. Falling through
  // to light there would flip the app on a device that never asked for it.
  const resolved: ThemeName = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;

  const modeValue = useMemo<ModeContextValue>(
    () => ({
      mode,
      resolved,
      setMode: (next: ThemeMode) => {
        userChose.current = true;
        setModeState(next);
        // Fire-and-forget: the UI must not wait on the keychain to repaint.
        // A failed write costs the preference next launch, not this one.
        void setItem(THEME_MODE_KEY, next).catch(() => {});
      },
    }),
    [mode, resolved],
  );

  const palette = useMemo(() => PALETTES[resolved], [resolved]);

  return (
    <ModeContext.Provider value={modeValue}>
      <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>
    </ModeContext.Provider>
  );
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}

export function useThemeMode(): ModeContextValue {
  return useContext(ModeContext);
}
