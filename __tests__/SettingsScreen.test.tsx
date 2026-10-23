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
jest.mock('@/api/settings', () => ({ sendContactMessage: (...a: unknown[]) => mockSend(...a) }));

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
