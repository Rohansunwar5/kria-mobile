import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import API from '@/api/axios';
import authReducer from '@/store/slices/authSlice';
import Welcome from '../src/app/(auth)/welcome';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

let mockAvailable = false;
const mockIdToken = jest.fn();
const mockSignOut = jest.fn(() => Promise.resolve());
jest.mock('@/lib/googleSignIn', () => ({
  googleSignInAvailable: () => mockAvailable,
  googleIdToken: () => mockIdToken(),
  googleSignOut: () => mockSignOut(),
}));

const makeStore = () => configureStore({ reducer: { auth: authReducer } });
let store = makeStore();
let mock: MockAdapter;
const ui = () => render(<Provider store={store}><Welcome /></Provider>);

beforeEach(() => {
  mockPush.mockClear();
  mockIdToken.mockReset();
  mockSignOut.mockClear();
  mockAvailable = false;
  store = makeStore();
  mock = new MockAdapter(API);
});
afterEach(() => mock.restore());

describe('Welcome', () => {
  it('shows the three headline lines', () => {
    ui();
    ['Play.', 'Compete.', 'Get on the board.'].forEach((t) => expect(screen.getByText(t)).toBeTruthy());
  });

  it('opens the intro and log in', () => {
    ui();
    fireEvent.press(screen.getByLabelText('Create account'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/intro');
    fireEvent.press(screen.getByLabelText('Log in'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });
});

// SERVER-GAPS #35: "Continue with Google" on 5a, Android builds only.
describe('Welcome, Continue with Google', () => {
  it("hides Google sign-in where it can't run", () => {
    ui();
    expect(screen.queryByText(/Google/)).toBeNull();
  });

  it("signs in with Google's token", async () => {
    mockAvailable = true;
    mockIdToken.mockResolvedValue('tok');
    mock.onPost('/player/auth/google').reply(200, { data: { data: { accessToken: 't', player: { _id: 'p' }, isNew: true } } });
    ui();
    fireEvent.press(screen.getByLabelText('Continue with Google'));

    await waitFor(() => expect(store.getState().auth.accessToken).toBe('t'));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ idToken: 'tok' });
    expect(store.getState().auth.pendingOnboarding).toBe(true);
  });

  it('a cancelled picker does nothing', async () => {
    mockAvailable = true;
    mockIdToken.mockResolvedValue(null);
    ui();
    fireEvent.press(screen.getByLabelText('Continue with Google'));

    await waitFor(() => expect(screen.getByLabelText('Continue with Google')).toBeTruthy());
    expect(mock.history.post).toHaveLength(0);
    expect(screen.queryByText(/Couldn't/)).toBeNull();
  });

  it('shows why sign-in failed', async () => {
    mockAvailable = true;
    mockIdToken.mockRejectedValueOnce(new Error('play services'));
    ui();
    fireEvent.press(screen.getByLabelText('Continue with Google'));
    expect(await screen.findByText("Couldn't sign in with Google. Try again.")).toBeTruthy();

    mockIdToken.mockResolvedValueOnce('tok');
    mock.onPost('/player/auth/google').reply(400, { message: 'This account is deactivated.' });
    fireEvent.press(screen.getByLabelText('Continue with Google'));
    expect(await screen.findByText('This account is deactivated.')).toBeTruthy();
  });

  it('hides server faults and network failures behind a plain message', async () => {
    mockAvailable = true;
    mockIdToken.mockResolvedValue('tok');
    mock.onPost('/player/auth/google').replyOnce(500, { message: 'GOOGLE_PLAYER_CLIENT_ID is not set.' });
    ui();
    fireEvent.press(screen.getByLabelText('Continue with Google'));
    expect(await screen.findByText("Couldn't sign in with Google. Try again.")).toBeTruthy();
    expect(screen.queryByText(/GOOGLE_PLAYER_CLIENT_ID/)).toBeNull();

    mock.onPost('/player/auth/google').networkErrorOnce();
    fireEvent.press(screen.getByLabelText('Continue with Google'));
    await waitFor(() => expect(mock.history.post).toHaveLength(2));
    expect(screen.getByText("Couldn't sign in with Google. Try again.")).toBeTruthy();
    expect(screen.queryByText(/Network Error/)).toBeNull();
  });

  it('logs why Google itself failed, to diagnose a build', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const err = Object.assign(new Error('DEVELOPER_ERROR'), { code: '10' });
    mockAvailable = true;
    mockIdToken.mockRejectedValue(err);
    ui();
    fireEvent.press(screen.getByLabelText('Continue with Google'));

    expect(await screen.findByText("Couldn't sign in with Google. Try again.")).toBeTruthy();
    expect(warn).toHaveBeenCalledWith('[google sign-in]', err);
    warn.mockRestore();
  });

  it('a refused account is signed out of Google, so the next tap can pick another', async () => {
    mockAvailable = true;
    mockIdToken.mockResolvedValue('tok');
    mock.onPost('/player/auth/google').reply(400, { message: 'This email already has a Kria account. Log in with your password or an emailed code.' });
    ui();
    fireEvent.press(screen.getByLabelText('Continue with Google'));

    expect(await screen.findByText(/already has a Kria account/)).toBeTruthy();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('is busy while signing in', async () => {
    mockAvailable = true;
    mockIdToken.mockReturnValue(new Promise(() => {}));
    ui();
    fireEvent.press(screen.getByLabelText('Continue with Google'));

    expect(await screen.findByLabelText('Signing in')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByLabelText('Signing in')); });
    expect(mockIdToken).toHaveBeenCalledTimes(1);
  });
});

describe('Welcome mark', () => {
  it('shows the Kria mark', () => {
    ui();
    expect(screen.getByLabelText('Kria')).toBeTruthy();
  });
});
