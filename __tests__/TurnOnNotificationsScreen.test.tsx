import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import { askPushPermission, registerPushToken } from '@/lib/push';
import { setItem } from '@/lib/secureStore';
import TurnOnNotifications from '../src/app/turn-on-notifications';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: () => mockBack(), canGoBack: () => true, replace: jest.fn() }),
}));
jest.mock('@/lib/push', () => ({ askPushPermission: jest.fn(), registerPushToken: jest.fn() }));
jest.mock('@/lib/secureStore', () => ({ setItem: jest.fn() }));

const ask = askPushPermission as jest.Mock;
const register = registerPushToken as jest.Mock;
const save = setItem as jest.Mock;

const USER = { _id: 'u1', firstName: 'Aarav', lastName: 'Menon', email: 'a@kria.club', phone: '9812345412', status: 'active' };
const renderScreen = () =>
  render(
    <Provider store={configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, { type: '@@init' }), user: USER } as never } })}>
      <TurnOnNotifications />
    </Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  ask.mockResolvedValue(true);
  register.mockResolvedValue('tok');
  save.mockResolvedValue(undefined);
});

describe('turn on notifications ask', () => {
  it('has a header title', () => {
    renderScreen();
    expect(screen.getByRole('header', { name: "Know when it's your turn." })).toBeTruthy();
  });

  it('lists the five moments', () => {
    renderScreen();
    for (const t of [
      "Know when it's your turn.", "Only for things you're part of. No promotions.",
      'Your entry is decided', "Approved, or not, with the organiser's reason",
      "You're sold at auction", 'Which team picked you, and for how much',
      'Your match is starting', "The round, who you're playing and the court",
      'Tournament news', "Announcements from events you've entered",
      "You're added to a quick match", 'When a host puts you on a side',
      'Turn on notifications', 'Not now',
    ]) expect(screen.getByText(t)).toBeTruthy();
  });

  it("Turn on asks, registers when allowed, and doesn't ask again", async () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Turn on notifications'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(ask).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('u1');
    expect(save).toHaveBeenCalledWith('kria.pushAsked', '1');
  });

  it('does not register when refused, still remembers', async () => {
    ask.mockResolvedValue(false);
    renderScreen();
    fireEvent.press(screen.getByLabelText('Turn on notifications'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(register).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith('kria.pushAsked', '1');
  });

  it('Not now remembers and goes back', async () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Not now'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(save).toHaveBeenCalledWith('kria.pushAsked', '1');
    expect(ask).not.toHaveBeenCalled();
  });
});
