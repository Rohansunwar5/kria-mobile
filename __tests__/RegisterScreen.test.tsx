import { fireEvent, render, screen } from '@testing-library/react-native';
import Register from '../src/app/(auth)/register';

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), back: jest.fn() }) }));

const mockDispatch = jest.fn();
jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (pick: (s: unknown) => unknown) =>
    pick({ auth: { isLoading: false, error: null, registrationStep: 1 }, onboarding: { fullName: '' } }),
}));

// Plain actions instead of the real thunk, so the payload can be asserted.
jest.mock('@/store/slices/authSlice', () => ({
  registerUser: (arg: unknown) => ({ type: 'auth/register', payload: arg }),
  clearError: () => ({ type: 'auth/clearError' }),
}));

const sendButton = () => screen.getByLabelText('Send me a code');

function fillEverythingButLastName() {
  fireEvent.changeText(screen.getByPlaceholderText('First name'), 'Helo');
  fireEvent.changeText(screen.getByPlaceholderText('you@email.com'), 'rohan@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('98450 12345'), '7364071493');
  fireEvent.press(screen.getByLabelText('Agree to the terms and privacy policy'));
}

describe('Register', () => {
  beforeEach(() => mockDispatch.mockClear());

  // The server requires a last name. One "Full name" box hid that: a
  // one-word name left the button dead with nothing saying why.
  it('asks for the last name as its own field', () => {
    render(<Register />);
    fillEverythingButLastName();
    expect(screen.getByText('Last name')).toBeTruthy();
    expect(sendButton().props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('sends the code once every field is filled', () => {
    render(<Register />);
    fillEverythingButLastName();
    fireEvent.changeText(screen.getByPlaceholderText('Last name'), 'Kumar');
    expect(sendButton().props.accessibilityState).toMatchObject({ disabled: false });

    fireEvent.press(sendButton());
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'auth/register',
      payload: { data: { firstName: 'Helo', lastName: 'Kumar', email: 'rohan@example.com', phone: '7364071493' } },
    });
  });
});
