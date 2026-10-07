import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import NewKnockoutScreen from '../src/app/knockout/new';
import { createQuickKnockout } from '@/api/quickKnockout';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'h1', firstName: 'Arjun', lastName: 'Mehta' } } }),
}));
jest.mock('@/api/quickKnockout', () => ({ createQuickKnockout: jest.fn(async () => ({ _id: 'k9' })) }));

it('walks format → name → review and creates the knockout', async () => {
  render(<NewKnockoutScreen />);
  expect(screen.getByText('Set the format')).toBeTruthy();
  fireEvent.press(screen.getByText('Doubles'));
  fireEvent.press(screen.getByText('Continue'));

  expect(screen.getByText('Name it')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText("Arjun's Knockout"), 'Sunday Smash');
  fireEvent.press(screen.getByText('Continue'));

  expect(screen.getByText('Ready to go?')).toBeTruthy();
  fireEvent.press(screen.getByText('Create knockout'));

  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k9' } }));
  expect(createQuickKnockout).toHaveBeenCalledWith({
    format: 'doubles', matchConfig: { bestOf: 1, pointsToWin: 21 }, name: 'Sunday Smash',
  });
});

it('leaves the name out when the host keeps the default', async () => {
  render(<NewKnockoutScreen />);
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('Create knockout'));
  await waitFor(() => expect(createQuickKnockout).toHaveBeenCalled());
  expect((createQuickKnockout as jest.Mock).mock.calls.at(-1)[0]).not.toHaveProperty('name');
});
