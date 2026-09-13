import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { PALETTES, dark, type Palette, type ThemeName } from './palette';

// The default value passed to createContext (rather than `null` with a
// runtime check) is what makes useTheme() work with no provider mounted at
// all: React only falls back to this default when a consumer has no matching
// Provider above it in the tree. That is deliberate, not a missing guard —
// the provider mounts once at the app root, but ~70 existing test files
// render components directly with no provider, and dark is the app's only
// palette today. Throwing on a missing provider would mean re-wrapping every
// one of those files to buy nothing.
const ThemeContext = createContext<Palette>(dark);

// No toggle, no persistence, no useColorScheme wiring here. There is exactly
// one palette right now; a switch with a single position is dead code. That
// arrives together with the light palette that gives the switch its second
// position — this is not an oversight.
export function ThemeProvider({
  children,
  theme = 'dark',
}: {
  children: ReactNode;
  theme?: ThemeName;
}) {
  const palette = useMemo(() => PALETTES[theme], [theme]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
