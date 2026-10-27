import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import API from '@/api/axios';
import authReducer, { registerUser } from '@/store/slices/authSlice';
import Register from '../src/app/(auth)/register';
import VerifyOtp from '../src/app/(auth)/verify-otp';
import SetPassword from '../src/app/(auth)/set-password';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), canGoBack: () => true }) }));

let mock: MockAdapter;
const makeStore = (email?: string) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  if (email) store.dispatch({ type: registerUser.fulfilled.type, payload: { email } });
  return store;
};
const ui = (el: React.ReactElement, store = makeStore()) => render(<Provider store={store}>{el}</Provider>);
const flush = () => act(async () => {});
const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState.disabled;

beforeEach(() => { mock = new MockAdapter(API); mockPush.mockClear(); mockReplace.mockClear(); });
afterEach(() => mock.restore());

describe('Register', () => {
  const fill = (first = 'Asha', last = 'Rao', email = 'asha@example.com', phone = '9845021764') => {
    fireEvent.changeText(screen.getByLabelText('First name'), first);
    fireEvent.changeText(screen.getByLabelText('Last name'), last);
    fireEvent.changeText(screen.getByLabelText('Email'), email);
    fireEvent.changeText(screen.getByLabelText('Mobile number'), phone);
  };

  it('enables send only when all four fields are valid', () => {
    ui(<Register />);
    expect(disabled('Send code to my email')).toBe(true);
    fill('Asha', 'Rao', 'asha@example.com', '984502176');
    expect(disabled('Send code to my email')).toBe(true);
    fireEvent.changeText(screen.getByLabelText('Mobile number'), '9845021764');
    expect(disabled('Send code to my email')).toBe(false);
  });

  it('shows Required for a touched empty name and the digits remaining', () => {
    ui(<Register />);
    fireEvent(screen.getByLabelText('First name'), 'blur');
    expect(screen.getByText('Required')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Mobile number'), '984502176');
    expect(screen.getByText('1 more digit')).toBeTruthy();
  });

  it('posts the 10-digit phone then opens Verify', async () => {
    mock.onPost('/player/auth/register').reply((c) => {
      expect(JSON.parse(c.data)).toEqual({ firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '9845021764' });
      return [200, { data: {} }];
    });
    ui(<Register />);
    fill();
    fireEvent.press(screen.getByLabelText('Send code to my email'));
    await flush();
    expect(mockPush).toHaveBeenCalledWith('/(auth)/verify-otp');
  });

  it('trims the email before validating and posting', async () => {
    mock.onPost('/player/auth/register').reply((c) => {
      expect(JSON.parse(c.data).email).toBe('name@example.com');
      return [200, { data: {} }];
    });
    ui(<Register />);
    fill('Asha', 'Rao', 'name@example.com ');
    expect(disabled('Send code to my email')).toBe(false);
    fireEvent.press(screen.getByLabelText('Send code to my email'));
    await flush();
    expect(mockPush).toHaveBeenCalledWith('/(auth)/verify-otp');
  });

  it('offers Log in when the email is already registered', async () => {
    mock.onPost('/player/auth/register').reply(400, { message: 'Email already registered. Please login.' });
    ui(<Register />);
    fill();
    fireEvent.press(screen.getByLabelText('Send code to my email'));
    await flush();
    expect(screen.getByText('Email already registered. Please login.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Log in'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    expect(mockPush).not.toHaveBeenCalledWith('/(auth)/verify-otp');
  });
});

describe('VerifyOtp', () => {
  const code = (v: string) => fireEvent.changeText(screen.getByLabelText('Verification code'), v);

  it('replaces to register when there is no email', () => {
    ui(<VerifyOtp />);
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/register');
  });

  it('enables Verify at 6 digits and opens Set password', async () => {
    mock.onPost('/player/auth/verify-otp').reply(200, { data: {} });
    ui(<VerifyOtp />, makeStore('asha@example.com'));
    expect(screen.getByText('asha@example.com')).toBeTruthy();
    code('12345');
    expect(disabled('Verify')).toBe(true);
    code('123456');
    expect(disabled('Verify')).toBe(false);
    fireEvent.press(screen.getByLabelText('Verify'));
    await flush();
    expect(mockPush).toHaveBeenCalledWith('/(auth)/set-password');
  });

  it('shows the server message and clears the boxes on failure', async () => {
    mock.onPost('/player/auth/verify-otp').reply(400, { message: 'Invalid or expired code' });
    ui(<VerifyOtp />, makeStore('asha@example.com'));
    code('123456');
    fireEvent.press(screen.getByLabelText('Verify'));
    await flush();
    expect(screen.getByText('Invalid or expired code')).toBeTruthy();
    expect(screen.getByLabelText('Verification code').props.value).toBe('');
  });

  it('offers Resend code after 30s and posts resend-otp', async () => {
    jest.useFakeTimers();
    try {
      mock.onPost('/player/auth/resend-otp').reply(200, { data: {} });
      ui(<VerifyOtp />, makeStore('asha@example.com'));
      expect(screen.queryByLabelText('Resend code')).toBeNull();
      act(() => { jest.advanceTimersByTime(31000); });
      await act(async () => { fireEvent.press(screen.getByLabelText('Resend code')); });
      expect(mock.history.post.map((r) => r.url)).toContain('/player/auth/resend-otp');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('SetPassword', () => {
  it('enables Create my account at 8 characters', () => {
    ui(<SetPassword />, makeStore('asha@example.com'));
    const pw = screen.getByLabelText('Password');
    fireEvent.changeText(pw, 'abcdefg');
    expect(disabled('Create my account')).toBe(true);
    fireEvent.changeText(pw, 'abcdefgh');
    expect(disabled('Create my account')).toBe(false);
  });

  it('begins the handoff before the request resolves', async () => {
    let release!: () => void;
    mock.onPost('/player/auth/set-password').reply(() => new Promise((res) => {
      release = () => res([200, { data: { accessToken: 't', player: { _id: 'p1' } } }]);
    }));
    const store = makeStore('asha@example.com');
    ui(<SetPassword />, store);
    fireEvent.changeText(screen.getByLabelText('Password'), 'abcdefgh');
    fireEvent.press(screen.getByLabelText('Create my account'));
    await flush();
    expect(store.getState().auth.pendingOnboarding).toBe(true);
    await act(async () => { release(); });
    expect(store.getState().auth.pendingOnboarding).toBe(true);
  });

  it('ends the handoff and shows the message on failure', async () => {
    mock.onPost('/player/auth/set-password').reply(400, { message: 'Could not set password' });
    const store = makeStore('asha@example.com');
    ui(<SetPassword />, store);
    fireEvent.changeText(screen.getByLabelText('Password'), 'abcdefgh');
    fireEvent.press(screen.getByLabelText('Create my account'));
    await flush();
    expect(store.getState().auth.pendingOnboarding).toBe(false);
    expect(screen.getByText('Could not set password')).toBeTruthy();
  });
});
