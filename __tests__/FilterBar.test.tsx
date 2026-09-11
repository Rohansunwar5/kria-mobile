import { render, fireEvent } from '@testing-library/react-native';
import { FilterBar } from '../src/components/home/FilterBar';
import { EMPTY_FILTERS } from '../src/lib/tournamentFilters';

const props = (over = {}) => ({
  filters: EMPTY_FILTERS,
  onClear: jest.fn(),
  onOpen: jest.fn(),
  ...over,
});

describe('FilterBar', () => {
  it('says what is showing when nothing is filtered', () => {
    const { getByText } = render(<FilterBar {...props()} />);
    expect(getByText(/all tournaments/i)).toBeTruthy();
  });

  it('shows a chip per applied filter', () => {
    const { getByText } = render(
      <FilterBar {...props({ filters: { sport: 'badminton', city: 'Pune', status: 'All' } })} />
    );
    expect(getByText('Badminton')).toBeTruthy();
    expect(getByText('Pune')).toBeTruthy();
  });

  it('clears just the chip that was dismissed', () => {
    const p = props({ filters: { sport: 'badminton', city: 'Pune', status: 'All' } });
    const { getByLabelText } = render(<FilterBar {...p} />);
    fireEvent.press(getByLabelText('Clear Pune filter'));
    expect(p.onClear).toHaveBeenCalledWith('city');
  });

  it('opens the sheet from the filter button', () => {
    const p = props();
    const { getByLabelText } = render(<FilterBar {...p} />);
    fireEvent.press(getByLabelText('Filter tournaments'));
    expect(p.onOpen).toHaveBeenCalled();
  });

  // The count is what tells you filters are on without reading the chips.
  it('carries the applied count on the button', () => {
    const { getByLabelText } = render(
      <FilterBar {...props({ filters: { sport: 'badminton', city: 'Pune', status: 'ongoing' } })} />
    );
    expect(getByLabelText('Filter tournaments, 3 applied')).toBeTruthy();
  });

  it('keeps the filter button at a 44px hit target', () => {
    const { getByLabelText } = render(<FilterBar {...props()} />);
    expect(getByLabelText('Filter tournaments').props.style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
