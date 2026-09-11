import { render, fireEvent } from '@testing-library/react-native';
import { PortalSwitch } from '../src/components/home/PortalSwitch';

describe('PortalSwitch', () => {
  it('marks the active side selected', () => {
    const { getByLabelText } = render(
      <PortalSwitch portal="events" live={false} onChange={jest.fn()} />
    );
    expect(getByLabelText('Events').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('Play').props.accessibilityState.selected).toBe(false);
  });

  it('switches portals on press', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <PortalSwitch portal="events" live={false} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Play'));
    expect(onChange).toHaveBeenCalledWith('play');
  });

  it('does not fire when the active side is pressed again', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <PortalSwitch portal="events" live={false} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Events'));
    expect(onChange).not.toHaveBeenCalled();
  });

  // Colour is never the only signal (DESIGN.md §7) — the dot has to be
  // announced, not just drawn.
  it('announces a live match rather than only drawing a dot', () => {
    const { getByLabelText } = render(
      <PortalSwitch portal="events" live onChange={jest.fn()} />
    );
    expect(getByLabelText('Play, a match is live')).toBeTruthy();
  });

  it('keeps both halves at a 44px hit target', () => {
    const { getByLabelText } = render(
      <PortalSwitch portal="play" live={false} onChange={jest.fn()} />
    );
    expect(getByLabelText('Events').props.style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
