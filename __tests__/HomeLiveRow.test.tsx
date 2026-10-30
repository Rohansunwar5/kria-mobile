import { fireEvent, render, screen } from '@testing-library/react-native';
import { LiveNowRow } from '@/components/home/LiveNowRow';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
let mockCount = 0;
const mockUseLiveNow = jest.fn((_o?: unknown) => ({ count: mockCount }));
jest.mock('@/lib/useLiveNow', () => ({ useLiveNow: (o?: unknown) => mockUseLiveNow(o) }));

it('shows count and opens /live', () => {
  mockCount = 3;
  render(<LiveNowRow />);
  expect(screen.getByText('3 matches')).toBeTruthy();
  fireEvent.press(screen.getByText('Live now'));
  expect(mockPush).toHaveBeenCalledWith('/live');
});
it('one match is "1 match"', () => {
  mockCount = 1;
  render(<LiveNowRow />);
  expect(screen.getByText('1 match')).toBeTruthy();
});
it('absent at zero', () => {
  mockCount = 0;
  render(<LiveNowRow />);
  expect(screen.queryByText('Live now')).toBeNull();
});
