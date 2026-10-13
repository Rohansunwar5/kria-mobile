import { act, fireEvent, render } from '@testing-library/react-native';
import { DobField } from '@/components/profile/DobField';

// The native picker is stood in by a component that hands its props back.
let mockPicker: { onValueChange: (e: unknown, d: Date) => void; onDismiss: () => void } | undefined;
jest.mock('@react-native-community/datetimepicker', () => (props: typeof mockPicker) => {
  mockPicker = props;
  return null;
});

test('a picked day is emitted as that local day, in any timezone', () => {
  const onChange = jest.fn();
  const { getByLabelText } = render(<DobField value="" onChange={onChange} />);
  fireEvent.press(getByLabelText('Date of birth'));
  // Local midnight: toISOString() would make this 2000-03-14 east of UTC.
  mockPicker!.onValueChange({}, new Date(2000, 2, 15));
  // Late evening: toISOString() would make this 2000-03-16 west of UTC.
  mockPicker!.onValueChange({}, new Date(2000, 2, 15, 23, 59));
  expect(onChange.mock.calls).toEqual([['2000-03-15'], ['2000-03-15']]);
});

test('cancelling the picker leaves the date unset', () => {
  const onChange = jest.fn();
  const { getByLabelText } = render(<DobField value="" onChange={onChange} />);
  fireEvent.press(getByLabelText('Date of birth'));
  act(() => mockPicker!.onDismiss());
  expect(onChange).not.toHaveBeenCalled();
});
