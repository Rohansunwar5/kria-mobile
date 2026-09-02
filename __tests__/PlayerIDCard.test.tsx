import { render } from '@testing-library/react-native';
import { PlayerIDCard } from '../src/components/onboarding/PlayerIDCard';

describe('PlayerIDCard', () => {
  it('holds the number and issue date back in the preview state', () => {
    const { getByText } = render(
      <PlayerIDCard name="Aarav Mehta" sport="Badminton" city="Bangalore" variant="preview" />
    );
    expect(getByText('Aarav Mehta')).toBeTruthy();
    expect(getByText('Badminton')).toBeTruthy();
    expect(getByText('Bangalore')).toBeTruthy();
    expect(getByText('Preview')).toBeTruthy();
    expect(getByText('ADD A PHOTO')).toBeTruthy();
    expect(getByText('KRIA·0000')).toBeTruthy();
    expect(getByText('PENDING')).toBeTruthy();
  });

  it('shows the real number and date once issued', () => {
    const { getByText, queryByText } = render(
      <PlayerIDCard
        name="Aarav Mehta"
        sport="Badminton"
        city="Bangalore"
        variant="issued"
        playerNo="KRIA·4172"
        issuedOn="02 SEP 26"
      />
    );
    expect(getByText('KRIA·4172')).toBeTruthy();
    expect(getByText('02 SEP 26')).toBeTruthy();
    expect(queryByText('Preview')).toBeNull();
    expect(queryByText('PENDING')).toBeNull();
  });
});
