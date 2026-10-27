import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import API from '@/api/axios';
import authReducer from '@/store/slices/authSlice';
import Forgot from '../src/app/(auth)/forgot-password';
import Reset from '../src/app/(auth)/reset-password';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockDismissTo = jest.fn();
let mockCanGoBack = true;
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, dismissTo: mockDismissTo, canGoBack: () => mockCanGoBack }),
  useLocalSearchParams: () => mockParams,
}));

let mock: MockAdapter;
const ui = (el: React.ReactElement) => render(<Provider store={configureStore({ reducer: { auth: authReducer } })}>{el}</Provider>);
const flush = () => act(async () => {});
const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState.disabled;

beforeEach(() => {
  mock = new MockAdapter(API); mockParams = {}; mockCanGoBack = true;
  [mockPush, mockReplace, mockBack, mockDismissTo].forEach((f) => f.mockClear());
});
afterEach(() => mock.restore());

describe('Forgot password', () => {
  it('prefills the email, posts it and opens Reset', async () => {
    mockParams = { email: 'asha@example.com' };
    mock.onPost('/player/auth/forgot-password').reply((c) => {
      expect(JSON.parse(c.data)).toEqual({ email: 'asha@example.com' });
      return [200, { data: {} }];
    });
    ui(<Forgot />);
    fireEvent.press(screen.getByLabelText('Email me a code'));
    await flush();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(auth)/reset-password', params: { email: 'asha@example.com' } });
  });

  it('shows the server message and offers Create account when unverified', async () => {
    mock.onPost('/player/auth/forgot-password').reply(400, { message: 'Account not verified.' });
    ui(<Forgot />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'asha@example.com');
    fireEvent.press(screen.getByLabelText('Email me a code'));
    await flush();
    expect(screen.getByText('Account not verified.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Create account'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/intro');
  });

  it('"Remembered it? Log in" goes back to Log in, or replaces to it when there is no history', () => {
    mockParams = { email: 'asha@example.com' };
    ui(<Forgot />);
    fireEvent.press(screen.getByLabelText('Log in'));
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    mockCanGoBack = false;
    fireEvent.press(screen.getByLabelText('Log in'));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/(auth)/login', params: { email: 'asha@example.com' } });
  });
});

describe('Reset password', () => {
  beforeEach(() => { mockParams = { email: 'asha@example.com' }; });

  it('enables Reset at 6 digits plus 8 characters, posts the payload, then dismisses to Log in', async () => {
    mock.onPost('/player/auth/reset-password').reply((c) => {
      expect(JSON.parse(c.data)).toEqual({ email: 'asha@example.com', otp: '418236', newPassword: 'smash2026' });
      return [200, { data: {} }];
    });
    ui(<Reset />);
    expect(disabled('Reset password')).toBe(true);
    fireEvent.changeText(screen.getByLabelText('Verification code'), '418236');
    fireEvent.changeText(screen.getByLabelText('New password'), 'short');
    expect(disabled('Reset password')).toBe(true);
    fireEvent.changeText(screen.getByLabelText('New password'), 'smash2026');
    expect(disabled('Reset password')).toBe(false);
    fireEvent.press(screen.getByLabelText('Reset password'));
    await flush();
    expect(mockDismissTo).toHaveBeenCalledWith({ pathname: '/(auth)/login', params: { reset: '1', email: 'asha@example.com' } });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows the server message on a wrong code and clears the boxes', async () => {
    mock.onPost('/player/auth/reset-password').reply(400, { message: 'Invalid or expired OTP' });
    ui(<Reset />);
    fireEvent.changeText(screen.getByLabelText('Verification code'), '418236');
    fireEvent.changeText(screen.getByLabelText('New password'), 'smash2026');
    fireEvent.press(screen.getByLabelText('Reset password'));
    await flush();
    expect(screen.getByText('Invalid or expired OTP')).toBeTruthy();
    expect(screen.getByLabelText('Verification code').props.value).toBe('');
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it('replaces back to Forgot without an email', () => {
    mockParams = {};
    ui(<Reset />);
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/forgot-password');
  });
});
