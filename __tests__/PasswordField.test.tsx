import { render, fireEvent } from '@testing-library/react-native';
import { PasswordField } from '../src/components/signin/PasswordField';

describe('PasswordField', () => {
  it('toggles secureTextEntry and its label', () => {
    const { getByLabelText, getByDisplayValue, queryByLabelText } = render(
      <PasswordField label="Password" value="secret" onChangeText={() => {}} />
    );
    expect(getByDisplayValue('secret').props.secureTextEntry).toBe(true);
    fireEvent.press(getByLabelText('Show password'));
    expect(getByDisplayValue('secret').props.secureTextEntry).toBe(false);
    expect(queryByLabelText('Show password')).toBeNull();
    expect(getByLabelText('Hide password')).toBeTruthy();
  });
  it('asks the platform for a new or the current password', () => {
    const { getByLabelText, rerender } = render(<PasswordField label="Password" value="" onChangeText={() => {}} />);
    expect(getByLabelText('Password').props).toMatchObject({ textContentType: 'password', autoComplete: 'current-password' });
    rerender(<PasswordField label="Password" value="" onChangeText={() => {}} isNew />);
    expect(getByLabelText('Password').props).toMatchObject({ textContentType: 'newPassword', autoComplete: 'new-password' });
  });
});
