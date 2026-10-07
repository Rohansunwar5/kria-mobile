import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import HostChooser from '../src/app/quick/host';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));

// The chooser steps aside for what was picked, so Back from either wizard
// does not land on the chooser again.
it('offers a quick match or a knockout', () => {
  render(<HostChooser />);
  fireEvent.press(screen.getByText('Quick match'));
  expect(router.replace).toHaveBeenCalledWith('/quick/new');
  fireEvent.press(screen.getByText('Knockout'));
  expect(router.replace).toHaveBeenCalledWith('/knockout/new');
  expect(router.push).not.toHaveBeenCalled();
});
