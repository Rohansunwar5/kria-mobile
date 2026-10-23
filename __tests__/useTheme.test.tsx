import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { useTheme } from '../src/lib/theme';
import { dark } from '../src/lib/theme/palette';

function Probe() {
  return <Text>{useTheme().bg}</Text>;
}

describe('useTheme', () => {
  it('returns the dark palette with no provider', () => {
    const { getByText } = render(<Probe />);
    expect(getByText(dark.bg)).toBeTruthy();
  });

  it('returns the same object across renders', () => {
    const seen: unknown[] = [];
    function Capture() {
      seen.push(useTheme());
      return null;
    }
    const { rerender } = render(<Capture />);
    rerender(<Capture />);
    expect(seen[0]).toBe(seen[1]);
    expect(seen[0]).toBe(dark);
  });
});
