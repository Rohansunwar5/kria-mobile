import { fireEvent, render, screen, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import Settings from '../src/app/profile/settings';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: (...a: unknown[]) => mockPush(...a), back: () => mockBack(), canGoBack: () => true, replace: jest.fn() }),
}));
const mockSend = jest.fn();
const mockDelete = jest.fn();
jest.mock('@/api/settings', () => ({ sendContactMessage: (...a: unknown[]) => mockSend(...a), deleteAccount: () => mockDelete() }));
const mockUnregister = jest.fn(async () => {});
jest.mock('@/lib/push', () => ({ unregisterPushToken: () => mockUnregister() }));
const mockLogout = jest.fn(() => ({ type: 'test/logout' }));
jest.mock('@/store/slices/authSlice', () => {
  const actual = jest.requireActual('@/store/slices/authSlice');
  return { ...actual, __esModule: true, default: actual.default, logout: () => mockLogout() };
});

const user = { _id: 'p1', firstName: 'Priya', lastName: 'Nair', email: 'priya@kria.club', phone: '9876543210', status: 'active', dateOfBirth: '2000-01-01', gender: 'female', sport: 'badminton' };
const renderIt = () =>
  render(
    <Provider store={configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, { type: '@@x' }), user } as never } })}>
      <Settings />
    </Provider>,
  );
const type = (t: string) => fireEvent.changeText(screen.getByLabelText('Message'), t);
const send = () => fireEvent.press(screen.getByLabelText('Send message'));

beforeEach(() => jest.clearAllMocks());

it('shows the account and opens change password', () => {
  renderIt();
  expect(screen.getByText('Signed in as')).toBeTruthy();
  expect(screen.getByText('priya@kria.club')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Change password'));
  expect(mockPush).toHaveBeenCalledWith('/profile/change-password');
  expect(screen.queryByText('Notifications')).toBeNull();
  expect(screen.queryByText('Appearance')).toBeNull();
});

it('disables Send when empty', () => {
  renderIt();
  expect(screen.getByLabelText('Send message').props.accessibilityState.disabled).toBe(true);
});

it('asks for more under 10 characters, no call', () => {
  renderIt();
  type('too short');
  send();
  expect(screen.getByText('Tell us a little more so we can help.')).toBeTruthy();
  expect(mockSend).not.toHaveBeenCalled();
});

it('sends once, ignores a second press, clears and confirms', async () => {
  let resolve!: () => void;
  mockSend.mockReturnValue(new Promise<void>((r) => (resolve = r)));
  renderIt();
  type('The draw did not load');
  send();
  fireEvent.press(screen.getByLabelText('Sending'));
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledWith({ fullName: 'Priya Nair', email: 'priya@kria.club', message: 'The draw did not load', phone: '9876543210' });
  await act(async () => resolve());
  expect(screen.getByText("Sent. We'll reply by email.")).toBeTruthy();
  expect(screen.getByLabelText('Message').props.value).toBe('');
});

it('shows the server message on failure', async () => {
  mockSend.mockRejectedValue(new Error('Server said no'));
  renderIt();
  type('The draw did not load');
  send();
  await waitFor(() => expect(screen.getByText('Server said no')).toBeTruthy());
});

// LAUNCH-AUDIT B7: Play requires deleting the account from inside the app.
describe('Delete account', () => {
  const open = () => fireEvent.press(screen.getByLabelText('Delete account'));
  const confirm = () => fireEvent.press(screen.getByLabelText('Delete my account'));

  it('asks before deleting, and Keep my account keeps it', () => {
    renderIt();
    open();
    expect(screen.getByText('Delete your account?')).toBeTruthy();
    expect(screen.getByText(/Your match results stay, shown as "Deleted player"/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Keep my account'));
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('deletes once, then forgets this device and signs out', async () => {
    let resolve!: () => void;
    mockDelete.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    renderIt();
    open();
    confirm();
    fireEvent.press(screen.getByLabelText('Deleting'));
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockLogout).not.toHaveBeenCalled();
    await act(async () => resolve());
    expect(mockUnregister).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('shows the server message and stays signed in when deletion fails', async () => {
    mockDelete.mockRejectedValue(new Error('Could not delete your account.'));
    renderIt();
    open();
    confirm();
    await waitFor(() => expect(screen.getByText('Could not delete your account.')).toBeTruthy());
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
