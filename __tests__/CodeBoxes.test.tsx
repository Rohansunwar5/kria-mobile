import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { colors } from '@/constants/theme';
import { CodeBoxes } from '../src/components/signin/CodeBoxes';

describe('CodeBoxes', () => {
  it('keeps digits only', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(<CodeBoxes value="" onChange={onChange} />);
    fireEvent.changeText(getByLabelText('Verification code'), '12a34');
    expect(onChange).toHaveBeenCalledWith('1234');
  });
  it('shows a pasted code across six boxes', () => {
    const { getByText } = render(<CodeBoxes value="418236" onChange={() => {}} />);
    for (const d of '418236') expect(getByText(d, { includeHiddenElements: true })).toBeTruthy();
  });
  it('truncates to six digits', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(<CodeBoxes value="" onChange={onChange} />);
    fireEvent.changeText(getByLabelText('Verification code'), '12345678');
    expect(onChange).toHaveBeenCalledWith('123456');
  });
  it('exposes only the input to screen readers', () => {
    const { getByLabelText, getAllByTestId } = render(<CodeBoxes value="12" onChange={() => {}} />);
    expect(getByLabelText('Verification code')).toBeTruthy();
    const boxes = getAllByTestId('code-box', { includeHiddenElements: true });
    expect(boxes).toHaveLength(6);
    for (const b of boxes) {
      expect(b.props.accessibilityElementsHidden).toBe(true);
      expect(b.props.importantForAccessibility).toBe('no-hide-descendants');
    }
  });
  it('rings filled boxes in ring and the next box in text', () => {
    const { getAllByTestId } = render(<CodeBoxes value="12" onChange={() => {}} autoFocus />);
    const ring = getAllByTestId('code-box', { includeHiddenElements: true }).map((b) => StyleSheet.flatten(b.props.style).borderColor);
    expect(ring).toEqual([colors.ring, colors.ring, colors.text, undefined, undefined, undefined]);
  });
  it('is autofill-ready', () => {
    const { getByLabelText } = render(<CodeBoxes value="" onChange={() => {}} />);
    const p = getByLabelText('Verification code').props;
    expect(p.textContentType).toBe('oneTimeCode');
    expect(p.keyboardType).toBe('number-pad');
    expect(p.maxLength).toBe(6);
  });
});
