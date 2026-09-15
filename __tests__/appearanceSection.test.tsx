import { render, screen, fireEvent, act } from '@testing-library/react-native';
import AppearanceSection, { SHOW_APPEARANCE_CONTROL } from '../src/components/settings/AppearanceSection';
import { ThemeProvider } from '../src/lib/theme/ThemeProvider';
import * as secureStore from '../src/lib/secureStore';

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(secureStore, 'getItem').mockResolvedValue(null);
  jest.spyOn(secureStore, 'setItem').mockResolvedValue();
});

async function renderSection() {
  const utils = render(<ThemeProvider><AppearanceSection /></ThemeProvider>);
  await act(async () => {});
  return utils;
}

describe('AppearanceSection', () => {
  // The toggle ships hidden. A half-migrated screen in light mode draws
  // hardcoded near-black cards on paper, which reads as broken rather than
  // partial — so users must not reach light mode until migration completes.
  // This asserts the SHIPPED value; flipping it is a deliberate release step.
  it('is hidden while the colour-literal migration is incomplete', () => {
    expect(SHOW_APPEARANCE_CONTROL).toBe(false);
  });

  it('renders nothing at all while hidden', async () => {
    await renderSection();
    expect(screen.queryByLabelText('System')).toBeNull();
    // getByText, not getByLabelText: the heading is a Text node with no
    // accessibility label, so a label query could never have matched it and
    // would have passed even with the section rendered.
    expect(screen.queryByText('Appearance')).toBeNull();
  });
});

// The control's behaviour is tested by rendering it directly, so these cover
// real logic even while the section is gated off the settings screen.
describe('AppearanceSection, forced visible', () => {
  it('offers three modes and marks dark selected by default', async () => {
    render(<ThemeProvider><AppearanceSection forceVisible /></ThemeProvider>);
    await act(async () => {});
    expect(screen.getByLabelText('System')).toBeTruthy();
    expect(screen.getByLabelText('Light')).toBeTruthy();
    expect(screen.getByLabelText('Dark').props.accessibilityState.selected).toBe(true);
  });

  it('selects a mode and persists it', async () => {
    const setItem = jest.spyOn(secureStore, 'setItem').mockResolvedValue();
    render(<ThemeProvider><AppearanceSection forceVisible /></ThemeProvider>);
    await act(async () => {});
    await act(async () => { fireEvent.press(screen.getByLabelText('Light')); });
    expect(screen.getByLabelText('Light').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Dark').props.accessibilityState.selected).toBe(false);
    expect(setItem).toHaveBeenCalledWith('kria.theme.mode', 'light');
  });
});
