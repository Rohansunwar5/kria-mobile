import { render, fireEvent } from '@testing-library/react-native';
import { AuthInput } from '../src/components/auth/AuthInput';

describe('AuthInput', () => {
  it('renders its label and value', () => {
    const { getByText, getByDisplayValue } = render(
      <AuthInput label="Email" value="a@b.com" onChangeText={() => {}} />
    );
    expect(getByText('Email')).toBeTruthy();
    expect(getByDisplayValue('a@b.com')).toBeTruthy();
  });

  it('toggles password visibility when secureToggle is set', () => {
    const { getByLabelText, getByDisplayValue } = render(
      <AuthInput label="Password" value="secret" onChangeText={() => {}} secureToggle />
    );
    const input = getByDisplayValue('secret');
    expect(input.props.secureTextEntry).toBe(true);
    fireEvent.press(getByLabelText('Show password'));
    expect(getByDisplayValue('secret').props.secureTextEntry).toBe(false);
  });

  it('shows an error message when error prop is set', () => {
    const { getByText } = render(
      <AuthInput label="Email" value="" onChangeText={() => {}} error="Required" />
    );
    expect(getByText('Required')).toBeTruthy();
  });
});
