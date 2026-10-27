import { fireEvent, render, screen, act } from '@testing-library/react-native';
import ChangePassword from '../src/app/profile/change-password';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
}));
const mockChange = jest.fn();
jest.mock('@/api/settings', () => ({ changePassword: (...a: unknown[]) => mockChange(...a) }));

const fill = (cur: string, next: string, conf: string) => {
  fireEvent.changeText(screen.getByLabelText('Current password'), cur);
  fireEvent.changeText(screen.getByLabelText('New password'), next);
  fireEvent.changeText(screen.getByLabelText('Confirm new password'), conf);
};
const update = () => screen.getByLabelText('Update password');

beforeEach(() => jest.clearAllMocks());

it('disables Update until ready', () => {
  render(<ChangePassword />);
  expect(update().props.accessibilityState.disabled).toBe(true);
  fill('old', 'smash2026!', 'smash2026!');
  expect(update().props.accessibilityState.disabled).toBe(false);
});

it('enables Update for 8 letters with no number or symbol', () => {
  render(<ChangePassword />);
  fill('old', 'abcdefgh', 'abcdefgh');
  expect(update().props.accessibilityState.disabled).toBe(false);
});

it('toggles each field visibility', () => {
  render(<ChangePassword />);
  const btns = screen.getAllByLabelText('Show password');
  expect(btns).toHaveLength(3);
  expect(screen.getByLabelText('Current password').props.secureTextEntry).toBe(true);
  fireEvent.press(btns[0]);
  expect(screen.getByLabelText('Current password').props.secureTextEntry).toBe(false);
  expect(screen.getByLabelText('Hide password')).toBeTruthy();
});

it('shows a mismatch', () => {
  render(<ChangePassword />);
  fill('old', 'smash2026!', 'smash');
  expect(screen.getByText("Doesn't match the new password")).toBeTruthy();
});

it('clears and confirms on success, ignoring a second press', async () => {
  let resolve!: () => void;
  mockChange.mockReturnValue(new Promise<void>((r) => (resolve = r)));
  render(<ChangePassword />);
  fill('old', 'smash2026!', 'smash2026!');
  fireEvent.press(update());
  fireEvent.press(screen.getByLabelText('Updating'));
  expect(mockChange).toHaveBeenCalledTimes(1);
  expect(mockChange).toHaveBeenCalledWith('old', 'smash2026!');
  await act(async () => resolve());
  expect(screen.getByText('Password changed.')).toBeTruthy();
  expect(screen.getByLabelText('Current password').props.value).toBe('');
  expect(screen.getByLabelText('New password').props.value).toBe('');
});

it('shows the rejection message', async () => {
  mockChange.mockRejectedValue(new Error('Current password is incorrect.'));
  render(<ChangePassword />);
  fill('bad', 'smash2026!', 'smash2026!');
  await act(async () => fireEvent.press(update()));
  expect(screen.getByText('Current password is incorrect.')).toBeTruthy();
  expect(screen.queryByText(/other devices/i)).toBeNull();
});
