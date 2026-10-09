import { render, fireEvent } from '@testing-library/react-native';
import { FilterButton, FilterChips } from '../src/components/home/FilterBar';

describe('FilterChips', () => {
  it('renders nothing when no filter is applied', () => {
    const { toJSON } = render(<FilterChips chips={[]} onClear={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('shows a chip per applied filter and clears just the one dismissed', () => {
    const onClear = jest.fn();
    const { getByText, getByLabelText } = render(
      <FilterChips chips={[{ key: 'city', label: 'Pune' }, { key: 'day', label: '22 Oct' }]} onClear={onClear} />,
    );
    expect(getByText('Pune')).toBeTruthy();
    expect(getByText('22 Oct')).toBeTruthy();

    fireEvent.press(getByLabelText('Clear Pune filter'));
    expect(onClear).toHaveBeenCalledWith('city');
  });
});

describe('FilterButton', () => {
  it('opens the sheet', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<FilterButton count={0} onPress={onPress} />);
    fireEvent.press(getByLabelText('Filter tournaments'));
    expect(onPress).toHaveBeenCalled();
  });

  it('carries the applied count', () => {
    const { getByLabelText } = render(<FilterButton count={3} onPress={jest.fn()} />);
    expect(getByLabelText('Filter tournaments, 3 applied')).toBeTruthy();
  });

  it('keeps a 44px hit target', () => {
    const { getByLabelText } = render(<FilterButton count={0} onPress={jest.fn()} />);
    expect(getByLabelText('Filter tournaments').props.style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
