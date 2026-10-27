import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import API from '@/api/axios';
import authReducer from '@/store/slices/authSlice';
import Login from '../src/app/(auth)/login';
import LoginCode from '../src/app/(auth)/login-code';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));

let mock: MockAdapter;
const makeStore = () => configureStore({ reducer: { auth: authReducer } });
let store = makeStore();
const ui = (el: React.ReactElement) => render(<Provider store={store}>{el}</Provider>);
const flush = () => act(async () => {});
const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState.disabled;
const user = { _id: 'p1', firstName: 'A', lastName: 'B', email: 'asha@example.com', phone: '1', status: 'active' };

beforeEach(() => { mock = new MockAdapter(API); mockPush.mockClear(); mockReplace.mockClear(); mockParams = {}; store = makeStore(); });
afterEach(() => mock.restore());

describe('Log in by password', () => {
  const fill = () => {
    fireEvent.changeText(screen.getByLabelText('Email'), 'asha@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'hunter22');
  };

  it('maps a 401 to the mismatch line and stays', async () => {
    mock.onPost('/player/auth/login').reply(401, { message: 'Unauthorized' });
    ui(<Login />);
    fill();
    fireEvent.press(screen.getByLabelText('Log in'));
    await flush();
    expect(screen.getByText("That email and password don't match.")).toBeTruthy();
    expect(store.getState().auth.user).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows the server message on a 400 with a link that switches to code mode', async () => {
    mock.onPost('/player/auth/login').reply(400, { message: 'Password not set. Please use OTP login.' });
    ui(<Login />);
    fill();
    fireEvent.press(screen.getByLabelText('Log in'));
    await flush();
    expect(screen.getByText('Password not set. Please use OTP login.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Email me a code'));
    expect(screen.getByText("We'll email a one-time code to this address. No password needed.")).toBeTruthy();
    expect(screen.queryByLabelText('Password')).toBeNull();
  });

  it('offers the code link only for "Password not set", not for other errors', async () => {
    mock.onPost('/player/auth/login').reply(404, { message: 'Player not found.' });
    ui(<Login />);
    fill();
    fireEvent.press(screen.getByLabelText('Log in'));
    await flush();
    expect(screen.getByText('Player not found.')).toBeTruthy();
    expect(screen.queryByLabelText('Email me a code')).toBeNull();
  });

  it('sets the user on success', async () => {
    mock.onPost('/player/auth/login').reply(200, { data: { accessToken: 't', player: user } });
    ui(<Login />);
    fill();
    fireEvent.press(screen.getByLabelText('Log in'));
    await flush();
    expect(store.getState().auth.user?.email).toBe('asha@example.com');
  });

  it('after a reset shows the status card with the email prefilled', () => {
    mockParams = { reset: '1', email: 'asha@example.com' };
    ui(<Login />);
    expect(screen.getByText('Password changed. Log in with your new one.')).toBeTruthy();
    expect(screen.getByLabelText('Email').props.value).toBe('asha@example.com');
  });

  it('reads the reset params when Reset dismisses back to an open Log in', () => {
    const { rerender } = ui(<Login />);
    fireEvent.changeText(screen.getByLabelText('Password'), 'old-guess');
    mockParams = { reset: '1', email: 'asha@example.com' };
    rerender(<Provider store={store}><Login /></Provider>);
    expect(screen.getByText('Password changed. Log in with your new one.')).toBeTruthy();
    expect(screen.getByLabelText('Email').props.value).toBe('asha@example.com');
    expect(screen.getByLabelText('Password').props.value).toBe('');
  });

  it('opens Forgot password and the intro', () => {
    mockParams = { email: 'asha@example.com' };
    ui(<Login />);
    fireEvent.press(screen.getByLabelText('Forgot password'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(auth)/forgot-password', params: { email: 'asha@example.com' } });
    fireEvent.press(screen.getByLabelText('Create account'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/intro');
  });
});

describe('Log in by code', () => {
  it('posts the email then opens the code screen', async () => {
    mock.onPost('/player/auth/login/otp').reply((c) => {
      expect(JSON.parse(c.data)).toEqual({ email: 'asha@example.com' });
      return [200, { data: {} }];
    });
    ui(<Login />);
    fireEvent.press(screen.getByText('Email me a code'));
    fireEvent.changeText(screen.getByLabelText('Email'), 'asha@example.com');
    fireEvent.press(screen.getByLabelText('Email me a code'));
    await flush();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(auth)/login-code', params: { email: 'asha@example.com' } });
  });

  it('the code screen verifies through /login/otp/verify and signs in', async () => {
    mockParams = { email: 'asha@example.com' };
    mock.onPost('/player/auth/login/otp/verify').reply((c) => {
      expect(JSON.parse(c.data)).toEqual({ email: 'asha@example.com', otp: '123456' });
      return [200, { data: { accessToken: 't', player: user } }];
    });
    ui(<LoginCode />);
    expect(disabled('Log in')).toBe(true);
    fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
    fireEvent.press(screen.getByLabelText('Log in'));
    await flush();
    expect(store.getState().auth.user?.email).toBe('asha@example.com');
  });

  it('shows the server message on a wrong code and clears the boxes', async () => {
    mockParams = { email: 'asha@example.com' };
    mock.onPost('/player/auth/login/otp/verify').reply(400, { message: 'Invalid OTP' });
    ui(<LoginCode />);
    fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
    fireEvent.press(screen.getByLabelText('Log in'));
    await flush();
    expect(screen.getByText('Invalid OTP')).toBeTruthy();
    expect(screen.getByLabelText('Verification code').props.value).toBe('');
  });

  it('replaces back to Log in without an email', () => {
    ui(<LoginCode />);
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
