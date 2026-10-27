import { render } from '@testing-library/react-native';
import { KriaMark, MarkBall, MarkBody, MARK_BALL, MARK_BODY_D } from '../src/components/KriaMark';

it('KriaMark renders the 800x700 viewBox, scaled height and default label', () => {
  const { getByLabelText, UNSAFE_getByType } = render(<KriaMark width={112} />);
  const Svg = require('react-native-svg').default;
  const svg = UNSAFE_getByType(Svg);
  expect(svg.props.viewBox).toBe('0 0 800 700');
  expect(svg.props.height).toBe(98);
  expect(getByLabelText('Kria')).toBeTruthy();
});

it('MarkBall has the ball circle; MarkBody the traced path', () => {
  const { Circle, Path } = require('react-native-svg');
  const ball = render(<MarkBall width={80} />);
  const c = ball.UNSAFE_getByType(Circle);
  expect([c.props.cx, c.props.cy, c.props.r]).toEqual([493, 91, 71]);
  expect(MARK_BALL.r).toBe(71);
  const body = render(<MarkBody width={80} />);
  expect(body.UNSAFE_getByType(Path).props.d).toBe(MARK_BODY_D);
});
