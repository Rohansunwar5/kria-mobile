import { render } from '@testing-library/react-native';
import { PlayerIDCard } from '../src/components/onboarding/PlayerIDCard';

describe('PlayerIDCard', () => {
  it('renders name and sport in preview state', () => {
    const { getByText } = render(
      <PlayerIDCard name="Aarav Mehta" sport="Badminton" locked="preview" />
    );
    expect(getByText('Aarav Mehta')).toBeTruthy();
    expect(getByText(/Badminton/)).toBeTruthy();
  });

  it('renders unranked stats in unranked state', () => {
    const { getByText } = render(
      <PlayerIDCard name="Aarav Mehta" sport="Badminton" locked="unranked" />
    );
    expect(getByText('Unranked')).toBeTruthy();
    expect(getByText('0 Titles')).toBeTruthy();
    expect(getByText('0 Awards')).toBeTruthy();
  });
});
