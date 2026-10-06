import { StyleSheet } from 'react-native';
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

  // The box is a Reanimated Animated.View, which NativeWind does not interop —
  // a className there is silently dropped, stacking the icon above the text.
  it('lays the icon and the text side by side', () => {
    const { getByDisplayValue } = render(
      <AuthInput label="Email" icon="mail" value="a@b.com" onChangeText={() => {}} />
    );
    let box = getByDisplayValue('a@b.com').parent;
    while (box && typeof box.type !== 'string') box = box.parent;
    expect(StyleSheet.flatten(box?.props.style)).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
    });
  });

  it('shows an error message when error prop is set', () => {
    const { getByText } = render(
      <AuthInput label="Email" value="" onChangeText={() => {}} error="Required" />
    );
    expect(getByText('Required')).toBeTruthy();
  });
});
