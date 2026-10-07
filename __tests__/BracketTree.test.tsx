import { fireEvent, render, screen } from '@testing-library/react-native';
import { BracketTree } from '@/components/knockout/BracketTree';
import type { QuickKnockout } from '@/api/quickKnockout';

const k: QuickKnockout = {
  _id: 'k1', hostId: 'h1', name: 'Cup', sport: 'badminton', format: 'singles',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, status: 'live',
  players: [
    { playerKey: 'a', displayName: 'Arjun Mehta' }, { playerKey: 'b', displayName: 'Rahul Singh' },
    { playerKey: 'c', displayName: 'Priya Rao' }, { playerKey: 'd', displayName: 'Dev K' },
  ],
  pairs: [],
  entrants: ['a', 'b', 'c', 'd'].map((key) => ({ entrantId: `e${key}`, playerKeys: [key] })),
  fixtures: [
    { fixtureId: 'f1', round: 1, position: 0, entrantA: 'ea', entrantB: 'eb', bye: false, quickMatchId: 'm1', winnerEntrantId: 'ea' },
    { fixtureId: 'f2', round: 1, position: 1, entrantA: 'ec', entrantB: 'ed', bye: false, quickMatchId: 'm2' },
    { fixtureId: 'f3', round: 2, position: 0, entrantA: 'ea', bye: false },
  ],
  roundNames: ['Semi-Final', 'Final'],
  awards: [], createdAt: '2026-10-07T00:00:00.000Z',
};

it('draws one column per round with first names', () => {
  render(<BracketTree knockout={k} onOpenMatch={jest.fn()} />);
  expect(screen.getByText('Semi-Final')).toBeTruthy();
  expect(screen.getByText('Final')).toBeTruthy();
  expect(screen.getAllByText('Arjun')).toHaveLength(2);
});

it('opens a fixture’s match, and only fixtures that have one', () => {
  const open = jest.fn();
  render(<BracketTree knockout={k} onOpenMatch={open} />);
  fireEvent.press(screen.getByLabelText('Open Priya v Dev'));
  expect(open).toHaveBeenCalledWith('m2');
  expect(screen.queryByLabelText(/Open Arjun v/)).toBeTruthy(); // finished matches still open their scoreboard
  expect(screen.queryByLabelText('Open Arjun v —')).toBeNull(); // the final has no match yet
});
