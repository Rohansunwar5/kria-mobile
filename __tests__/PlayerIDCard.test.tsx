import { render } from '@testing-library/react-native';
import { PlayerIDCard } from '../src/components/onboarding/PlayerIDCard';

describe('PlayerIDCard', () => {
  it('renders name, sport and level in preview state', () => {
    const { getByText } = render(
      <PlayerIDCard name="Aarav Mehta" sport="Badminton" level="Intermediate" locked="preview" />
    );
    expect(getByText('Aarav Mehta')).toBeTruthy();
    expect(getByText(/Badminton/)).toBeTruthy();
    expect(getByText(/Intermediate/)).toBeTruthy();
  });

  it('renders unranked stats in unranked state', () => {
    const { getByText } = render(
      <PlayerIDCard name="Aarav Mehta" sport="Badminton" level="Intermediate" locked="unranked" />
    );
    expect(getByText('Unranked')).toBeTruthy();
    expect(getByText('0 Titles')).toBeTruthy();
    expect(getByText('0 Awards')).toBeTruthy();
  });
});
