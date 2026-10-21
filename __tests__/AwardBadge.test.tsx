import { render } from '@testing-library/react-native';
import { AwardBadge } from '../src/components/AwardBadge';

it('renders every family, large and small, with each option', () => {
  for (const size of [44, 132]) {
    render(<AwardBadge shape="shield" metal="gold" size={size} icon="emoji_events" laurel ribbon="WINNER" shine />);
    render(<AwardBadge shape="rosette" metal="gold" size={size} glyph="POM" />);
    render(<AwardBadge shape="hex" metal="bronze" size={size} icon="sports_tennis" count={3} />);
    render(<AwardBadge shape="coin" metal="locked" size={size} glyph="100" sub="MATCHES" progress={0.85} />);
  }
});
