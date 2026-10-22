import { fireEvent, render, screen } from '@testing-library/react-native';
import { LiveNowRow } from '@/components/home/LiveNowRow';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
let mockCount = 0;
jest.mock('@/lib/useLiveNow', () => ({ useLiveNow: () => ({ count: mockCount }) }));

it('shows count and opens /live', () => {
  mockCount = 3;
  render(<LiveNowRow />);
  expect(screen.getByText('3 matches')).toBeTruthy();
  fireEvent.press(screen.getByText('Live now'));
  expect(mockPush).toHaveBeenCalledWith('/live');
});
it('absent at zero', () => {
  mockCount = 0;
  render(<LiveNowRow />);
  expect(screen.queryByText('Live now')).toBeNull();
});
