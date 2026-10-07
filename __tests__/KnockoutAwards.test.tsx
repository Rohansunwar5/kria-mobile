import { fireEvent, render, screen } from '@testing-library/react-native';
import { KnockoutAwards } from '@/components/knockout/KnockoutAwards';
import type { QuickKnockout } from '@/api/quickKnockout';

const k = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k1', hostId: 'h1', name: 'Cup', sport: 'badminton', format: 'singles',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, status: 'completed', awardsEligible: true,
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta' },
    { playerKey: 'b', playerId: 'p2', displayName: 'Rahul Singh' },
    { playerKey: 'c', displayName: 'Sam' },
  ],
  pairs: [], entrants: [], fixtures: [], roundNames: [], awards: [], createdAt: '2026-10-07T00:00:00.000Z',
  ...over,
});

it('gives an award: pick a player, pick a badge', () => {
  const onAward = jest.fn();
  render(<KnockoutAwards knockout={k()} hostId="h1" onAward={onAward} />);
  expect(screen.queryByText('Arjun Mehta')).toBeNull(); // not the host
  expect(screen.queryByText('Sam')).toBeNull();          // guests have no profile
  fireEvent.press(screen.getByText('Rahul Singh'));
  fireEvent.press(screen.getByText('Fair Play'));
  fireEvent.press(screen.getByText('Give award'));
  expect(onAward).toHaveBeenCalledWith('p2', 'fair-play');
});

it('lists given awards with who got each, and stops at 3', () => {
  const awards = [1, 2, 3].map((n) => ({ playerId: 'p2', badge: 'fair-play', title: `Award ${n}` }));
  render(<KnockoutAwards knockout={k({ awards })} hostId="h1" onAward={jest.fn()} />);
  expect(screen.getByText('Rahul Singh · Award 3')).toBeTruthy();
  expect(screen.queryByText('Give award')).toBeNull();
});

it('explains when awards are not available', () => {
  render(<KnockoutAwards knockout={k({ awardsEligible: false })} hostId="h1" onAward={jest.fn()} />);
  expect(screen.getByText(/at least 4 Kria players/i)).toBeTruthy();
});
