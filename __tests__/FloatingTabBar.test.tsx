import type { ComponentProps } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FloatingTabBar } from '../src/components/navigation/FloatingTabBar';

// Named `mockPush` (not `push`) because babel-plugin-jest-hoist only allows a
// jest.mock() factory to reference out-of-scope variables whose name starts
// with `mock` — otherwise the module factory throws before the suite runs.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

// Return type is annotated explicitly so `as never` below only widens the
// fixture past the exact BottomTabBarProps shape (real react-navigation state
// carries far more than `index`/`routes`) rather than collapsing every call
// site's result to `never`, which `tsc --noEmit` rejects when spread in JSX.
const props = (index = 0): ComponentProps<typeof FloatingTabBar> => ({
  state: {
    index,
    routes: [
      { key: 'home-1', name: 'home' },
      { key: 'profile-1', name: 'profile' },
    ],
  },
  navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() },
}) as never;

describe('FloatingTabBar', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders all five slots', () => {
    const { getByLabelText } = render(<FloatingTabBar {...props()} />);
    for (const label of ['Home', 'Explore', 'Host a match', 'Live', 'You']) {
      expect(getByLabelText(label)).toBeTruthy();
    }
  });

  it('marks the focused route selected', () => {
    const { getByLabelText } = render(<FloatingTabBar {...props(0)} />);
    expect(getByLabelText('Home').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('You').props.accessibilityState.selected).toBe(false);
  });

  // Explore and Live have no routes yet. They are drawn so the bar matches the
  // design, but they must announce themselves as disabled rather than look
  // tappable and do nothing.
  it('marks the unbuilt slots disabled', () => {
    const { getByLabelText } = render(<FloatingTabBar {...props()} />);
    expect(getByLabelText('Explore').props.accessibilityState.disabled).toBe(true);
    expect(getByLabelText('Live').props.accessibilityState.disabled).toBe(true);
    expect(getByLabelText('Home').props.accessibilityState.disabled).toBe(false);
  });

  it('does not navigate when a disabled slot is pressed', () => {
    const p = props();
    const { getByLabelText } = render(<FloatingTabBar {...p} />);
    fireEvent.press(getByLabelText('Explore'));
    expect(p.navigation.navigate).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates between real routes', () => {
    const p = props(0);
    const { getByLabelText } = render(<FloatingTabBar {...p} />);
    fireEvent.press(getByLabelText('You'));
    expect(p.navigation.navigate).toHaveBeenCalledWith('profile');
  });

  // Host is an ACTION, not a tab. It pushes rather than switching tabs, which is
  // why it never takes the selected state.
  it('pushes the new-quick-match route from Host', () => {
    const p = props();
    const { getByLabelText } = render(<FloatingTabBar {...p} />);
    fireEvent.press(getByLabelText('Host a match'));
    expect(mockPush).toHaveBeenCalledWith('/quick/new');
    expect(p.navigation.navigate).not.toHaveBeenCalled();
  });

  it('gives every slot a 44px hit target', () => {
    const { getByLabelText } = render(<FloatingTabBar {...props()} />);
    for (const label of ['Home', 'Explore', 'Host a match', 'Live', 'You']) {
      const style = getByLabelText(label).props.style;
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});
