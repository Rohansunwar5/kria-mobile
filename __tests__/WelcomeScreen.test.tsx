import { fireEvent, render, screen } from '@testing-library/react-native';
import Welcome from '../src/app/(auth)/welcome';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

describe('Welcome', () => {
  beforeEach(() => mockPush.mockClear());

  it('shows the three headline lines', () => {
    render(<Welcome />);
    ['Play.', 'Compete.', 'Get on the board.'].forEach((t) => expect(screen.getByText(t)).toBeTruthy());
  });

  it('opens the intro and log in', () => {
    render(<Welcome />);
    fireEvent.press(screen.getByLabelText('Create account'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/intro');
    fireEvent.press(screen.getByLabelText('Log in'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('has no Google button', () => {
    render(<Welcome />);
    expect(screen.queryByText(/Google/)).toBeNull();
  });
});

describe('Welcome mark', () => {
  it('shows the Kria mark', () => {
    render(<Welcome />);
    expect(screen.getByLabelText('Kria')).toBeTruthy();
  });
});
