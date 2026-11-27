import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { RollNumber } from '@/components/ui/RollNumber';

test('announces the final value and caps text scaling', () => {
  render(<RollNumber from="58.3%" to="61.5%" style={{ fontSize: 34 }} play />);
  expect(screen.getByLabelText('61.5%')).toBeTruthy();
  const texts = screen.UNSAFE_getAllByType(Text);
  expect(texts.length).toBeGreaterThan(0);
  texts.forEach((t) => expect(t.props.maxFontSizeMultiplier).toBe(1.3));
});

test('a static value renders as plain text', () => {
  render(<RollNumber from="—" to="100.0%" style={{ fontSize: 34 }} play />);
  expect(screen.getByText('100.0%')).toBeTruthy();
});

describe('large system text (review #3)', () => {
  const RN = jest.requireActual('react-native');
  afterEach(() => jest.restoreAllMocks());

  it('sizes each digit cell to the capped font scale, so scaled digits are not clipped', () => {
    jest.spyOn(RN, 'useWindowDimensions').mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 2 });
    render(<RollNumber from="58.3%" to="61.5%" style={{ fontSize: 34 }} play />);
    const cells = screen.getAllByTestId('roll-cell');
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach((c) => expect(c.props.style.height).toBeCloseTo(34 * 1.3));
  });
});
