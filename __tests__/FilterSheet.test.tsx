import { render, fireEvent } from '@testing-library/react-native';
import { FilterSheet } from '../src/components/home/FilterSheet';
import { EMPTY_FILTERS } from '../src/lib/tournamentFilters';

const props = (over = {}) => ({
  visible: true,
  filters: EMPTY_FILTERS,
  resultCount: 12,
  onApply: jest.fn(),
  onClose: jest.fn(),
  ...over,
});

describe('FilterSheet', () => {
  it('shows the result count on the apply button', () => {
    const { getByText } = render(<FilterSheet {...props()} />);
    expect(getByText(/show 12 events/i)).toBeTruthy();
  });

  it('uses the singular for one result', () => {
    const { getByText } = render(<FilterSheet {...props({ resultCount: 1 })} />);
    expect(getByText(/show 1 event$/i)).toBeTruthy();
  });

  // Editing a draft is the whole point of an apply button.
  it('does not apply until the footer button is pressed', () => {
    const p = props();
    const { getByLabelText, getByText } = render(<FilterSheet {...p} />);
    fireEvent.press(getByLabelText('Badminton'));
    expect(p.onApply).not.toHaveBeenCalled();

    fireEvent.press(getByText(/show 12 events/i));
    expect(p.onApply).toHaveBeenCalledWith({ ...EMPTY_FILTERS, sport: 'badminton' });
  });

  it('toggles a selected filter back off', () => {
    const p = props({ filters: { ...EMPTY_FILTERS, sport: 'badminton' } });
    const { getByLabelText, getByText } = render(<FilterSheet {...p} />);
    fireEvent.press(getByLabelText('Badminton'));
    fireEvent.press(getByText(/show 12 events/i));
    expect(p.onApply).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  it('resets every filter without closing', () => {
    const p = props({ filters: { sport: 'cricket', city: 'Pune', status: 'ongoing' } });
    const { getByText } = render(<FilterSheet {...p} />);
    fireEvent.press(getByText(/^reset$/i));
    expect(p.onClose).not.toHaveBeenCalled();
    fireEvent.press(getByText(/show 12 events/i));
    expect(p.onApply).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  // Colour is never the only signal (DESIGN.md §7).
  it('announces selection to a screen reader, not just by fill', () => {
    const { getByLabelText } = render(
      <FilterSheet {...props({ filters: { ...EMPTY_FILTERS, sport: 'badminton' } })} />
    );
    expect(getByLabelText('Badminton').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('Cricket').props.accessibilityState.selected).toBe(false);
  });

  // One label per distinct control that builds its own inline style in this
  // file — 'Clear all filters' was missing (fix round 1) and had no real
  // target. Sport/city/stage each share one component across several
  // instances (e.g. every CityChip), so one label per component is enough
  // to catch a regression in that shared style. The backdrop (full-bleed,
  // no natural height) and the two footer buttons (the reviewed `Btn`
  // primitive, which uses `height`, not `minHeight`, and already renders
  // at 54) are deliberately not asserted here.
  it('gives every control a 44px hit target', () => {
    const { getByLabelText } = render(<FilterSheet {...props()} />);
    for (const label of ['Badminton', 'Cricket', 'Bangalore', 'Open', 'Clear all filters']) {
      expect(getByLabelText(label).props.style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  // Reopening after a discarded edit must not resurrect the discarded draft.
  it('starts from the applied filters each time it opens', () => {
    const p = props();
    const { rerender, getByLabelText, getByText } = render(<FilterSheet {...p} />);
    fireEvent.press(getByLabelText('Cricket'));
    rerender(<FilterSheet {...p} visible={false} />);
    rerender(<FilterSheet {...p} visible />);
    fireEvent.press(getByText(/show 12 events/i));
    expect(p.onApply).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});
