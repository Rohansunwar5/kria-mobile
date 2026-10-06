import { Share } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { WaitingRoom } from '@/components/quick/WaitingRoom';
import type { QuickMatch, QuickMatchSide } from '@/api/quickMatch';

const sides = (rahulId?: string): QuickMatchSide[] => [
  { sideId: 's1', name: 'Arjun', slots: [{ slotId: 'a1', playerId: 'h1', displayName: 'Arjun Mehta' }] },
  { sideId: 's2', name: 'Rahul', slots: [{ slotId: 'b1', playerId: rahulId, displayName: 'Rahul Singh' }] },
];

const match = (over: Partial<QuickMatch> = {}): QuickMatch => ({
  _id: 'm1', hostId: 'h1', sport: 'badminton', joinCode: 'ABC234', status: 'waiting',
  sides: sides(),
  gameScores: [],
  matchConfig: { bestOf: 3, pointsToWin: 21 },
  createdAt: '2026-10-06T00:00:00.000Z',
  ...over,
});

const handlers = () => ({ onCancel: jest.fn(), onRemovePlayer: jest.fn() });

describe('WaitingRoom — host', () => {
  it('shows the code', () => {
    render(<WaitingRoom match={match()} playerId="h1" {...handlers()} />);
    expect(screen.getByText('ABC234')).toBeTruthy();
  });

  it('shares the code through the phone’s share sheet', () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    render(<WaitingRoom match={match()} playerId="h1" {...handlers()} />);

    fireEvent.press(screen.getByText('Share code'));

    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0]).toMatchObject({ message: expect.stringContaining('ABC234') });
    share.mockRestore();
  });

  it('shows who has joined, as they join', () => {
    const { rerender } = render(<WaitingRoom match={match()} playerId="h1" {...handlers()} />);
    expect(screen.getByText('1 of 2 joined')).toBeTruthy();
    expect(screen.getByText('Not joined')).toBeTruthy();

    rerender(<WaitingRoom match={match({ sides: sides('p2') })} playerId="h1" {...handlers()} />);
    expect(screen.getByText('2 of 2 joined')).toBeTruthy();
    expect(screen.getByText('Joined')).toBeTruthy();
  });

  it('can remove a player who claimed the wrong name', () => {
    const h = handlers();
    render(<WaitingRoom match={match({ sides: sides('p2') })} playerId="h1" {...h} />);

    fireEvent.press(screen.getByLabelText('Remove Rahul Singh'));

    expect(h.onRemovePlayer).toHaveBeenCalledWith('p2');
  });

  it('can cancel the match', () => {
    const h = handlers();
    render(<WaitingRoom match={match()} playerId="h1" {...h} />);

    fireEvent.press(screen.getByText('Cancel match'));

    expect(h.onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('WaitingRoom — joined player', () => {
  it('says who they are waiting for, and offers no host controls', () => {
    render(<WaitingRoom match={match({ sides: sides('p2') })} playerId="p2" {...handlers()} />);

    expect(screen.getByText('Waiting for Arjun Mehta to start')).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.queryByText('Cancel match')).toBeNull();
    expect(screen.queryByText('ABC234')).toBeNull();
  });

  it('names no one when the host is only keeping score', () => {
    const scoringHost = match({
      sides: [
        { sideId: 's1', name: 'A', slots: [{ slotId: 'a1', playerId: 'p2', displayName: 'Rahul Singh' }] },
        { sideId: 's2', name: 'B', slots: [{ slotId: 'b1', displayName: 'Dev' }] },
      ],
    });
    render(<WaitingRoom match={scoringHost} playerId="p2" {...handlers()} />);

    expect(screen.getByText('Waiting for the host to start')).toBeTruthy();
  });
});
