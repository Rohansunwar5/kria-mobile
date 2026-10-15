import { render, screen } from '@testing-library/react-native';
import LiveRow, { LiveChip } from '@/components/live/LiveRow';
import type { LiveItem } from '@/api/live';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const quick: LiveItem = {
  kind: 'quick', matchId: 'm1', sport: 'table_tennis', title: 'Arjun vs Rahul', scoreline: '7-5', startedAt: '2026-10-15T10:00:00Z',
};

// The feed is public: a sport key like `table_tennis` must read as words.
it('names the sport in words on the live feed row', () => {
  render(<LiveRow item={quick} />);
  expect(screen.getByText('Table Tennis')).toBeTruthy();
  expect(screen.queryByText('table_tennis')).toBeNull();
});

it('names the sport in words on the home ticker chip', () => {
  render(<LiveChip item={quick} />);
  expect(screen.getByText('Table Tennis')).toBeTruthy();
  expect(screen.queryByText('table_tennis')).toBeNull();
});
