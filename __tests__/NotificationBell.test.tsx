import { fireEvent, render, screen } from '@testing-library/react-native';
import { NotificationBell } from '@/components/home/NotificationBell';

it('labels the new count and shows the dot', () => {
  const onPress = jest.fn();
  render(<NotificationBell count={3} onPress={onPress} />);
  fireEvent.press(screen.getByLabelText('Notifications, 3 new'));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('bell-dot')).toBeTruthy();
});

it('has no dot when nothing is new', () => {
  render(<NotificationBell count={0} onPress={jest.fn()} />);
  expect(screen.getByLabelText('Notifications')).toBeTruthy();
  expect(screen.queryByTestId('bell-dot')).toBeNull();
});
