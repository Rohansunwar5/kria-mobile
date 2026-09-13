import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../src/lib/theme/ThemeProvider';
import { dark } from '../src/lib/theme/palette';

function Probe() {
  const t = useTheme();
  return <Text>{t.bg}</Text>;
}

describe('useTheme', () => {
  it('gives a consumer the dark palette under the provider', () => {
    const { getByText } = render(
      <ThemeProvider><Probe /></ThemeProvider>
    );
    expect(getByText(dark.bg)).toBeTruthy();
  });

  // Falling back rather than throwing is deliberate: the provider mounts once
  // at the root, and every one of the 70-odd existing test files renders
  // components without it. Throwing would mean re-wrapping all of them to buy
  // nothing — dark IS the app's only palette today.
  it('falls back to dark with no provider at all', () => {
    const { getByText } = render(<Probe />);
    expect(getByText(dark.bg)).toBeTruthy();
  });

  it('returns the same object identity across renders, so styles can be memoised', () => {
    const seen: unknown[] = [];
    function Capture() {
      seen.push(useTheme());
      return null;
    }
    const { rerender } = render(<ThemeProvider><Capture /></ThemeProvider>);
    rerender(<ThemeProvider><Capture /></ThemeProvider>);
    expect(seen[0]).toBe(seen[1]);
  });
});
