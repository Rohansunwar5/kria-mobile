import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import HostChooser from '../src/app/quick/host';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));

it('offers a quick match or a knockout', () => {
  render(<HostChooser />);
  fireEvent.press(screen.getByText('Quick match'));
  expect(router.push).toHaveBeenCalledWith('/quick/new');
  fireEvent.press(screen.getByText('Knockout'));
  expect(router.push).toHaveBeenCalledWith('/knockout/new');
});
