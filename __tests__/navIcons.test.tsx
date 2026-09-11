import { render } from '@testing-library/react-native';
import { NavIcon, NAV_ICON_NAMES, NAV_ICON_PATHS } from '../src/components/icons/nav';

describe('nav icon set', () => {
  it('ships exactly the five nav glyphs', () => {
    expect(NAV_ICON_NAMES).toEqual(['home', 'search', 'plus', 'live', 'user']);
  });

  it('every glyph has at least one path', () => {
    for (const name of NAV_ICON_NAMES) {
      expect(NAV_ICON_PATHS[name].length).toBeGreaterThan(0);
    }
  });

  // DESIGN.md §4: the nav set is round-capped, the content set is square-capped.
  // That boundary is the whole reason this module is separate — if a square cap
  // ever lands here, the two languages have started to blur.
  it('renders with round caps and round joins, unlike the content set', () => {
    const { UNSAFE_root } = render(<NavIcon name="home" size={22} color="#fff" />);
    const svg = UNSAFE_root.findByProps({ strokeLinecap: 'round' });
    expect(svg.props.strokeLinejoin).toBe('round');
  });

  it('scales stroke width with size so a 44px glyph is not four times heavier', () => {
    const { UNSAFE_root } = render(<NavIcon name="user" size={44} color="#fff" />);
    // 1.8 at the 24 grid, doubled for a 44px render.
    expect(UNSAFE_root.findByProps({ strokeLinecap: 'round' }).props.strokeWidth).toBeCloseTo(3.3, 1);
  });
});
