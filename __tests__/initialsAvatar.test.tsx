import { render } from '@testing-library/react-native';
import { InitialsAvatar } from '../src/components/InitialsAvatar';

describe('InitialsAvatar', () => {
  it('falls back to initials when a team has no logo', () => {
    const { getByText } = render(<InitialsAvatar name="Rally Kings" />);
    expect(getByText('RK')).toBeTruthy();
  });

  it('renders the crest instead of initials when a logo exists', () => {
    const { queryByText, getByLabelText } = render(
      <InitialsAvatar name="Rally Kings" logo="https://cdn.test/rk.png" />
    );
    expect(queryByText('RK')).toBeNull();
    expect(getByLabelText('Rally Kings')).toBeTruthy();
  });

  it('ignores a blank logo rather than rendering an empty box', () => {
    const { getByText } = render(<InitialsAvatar name="Rally Kings" logo="  " />);
    expect(getByText('RK')).toBeTruthy();
  });
});
