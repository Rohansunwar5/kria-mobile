import { Share } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { KnockoutDrawBar, KnockoutWaitingRoom } from '@/components/knockout/KnockoutWaitingRoom';
import type { QuickKnockout } from '@/api/quickKnockout';

jest.mock('@/api/playerSearch', () => ({ searchPlayers: jest.fn(async () => [{ _id: 'p7', firstName: 'Dev', lastName: 'K' }]) }));

const knockout = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k1', hostId: 'h1', joinCode: 'KX4P9M', name: 'Sunday Smash', sport: 'badminton', format: 'doubles',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, status: 'waiting',
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta' },
    { playerKey: 'b', playerId: 'p2', displayName: 'Priya Rao' },
    { playerKey: 'c', displayName: 'Sam' },
  ],
  pairs: [], entrants: [], fixtures: [], roundNames: [], awards: [], createdAt: '2026-10-07T00:00:00.000Z',
  ...over,
});
const handlers = () => ({
  onAddGuest: jest.fn(), onAddPlayer: jest.fn(), onRemove: jest.fn(), onPair: jest.fn(), onUnpair: jest.fn(),
  onMove: jest.fn(), onAddTeam: jest.fn(), onRemoveTeam: jest.fn(), onRenameTeam: jest.fn(),
});

describe('host', () => {
  it('shows the code, shares it, and lists who is in', () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    render(<KnockoutWaitingRoom knockout={knockout()} playerId="h1" {...handlers()} />);
    expect(screen.getByText('KX4P9M')).toBeTruthy();
    expect(screen.getByText('3 players')).toBeTruthy();
    fireEvent.press(screen.getByText('Share code'));
    expect(share.mock.calls[0][0]).toMatchObject({ message: expect.stringContaining('KX4P9M') });
    share.mockRestore();
  });

  it('pairs two players by tapping them, in doubles', () => {
    const h = handlers();
    render(<KnockoutWaitingRoom knockout={knockout()} playerId="h1" {...h} />);
    fireEvent.press(screen.getByLabelText('Select Priya Rao'));
    fireEvent.press(screen.getByLabelText('Select Sam'));
    expect(h.onPair).toHaveBeenCalledWith('b', 'c');
  });

  it('shows a host pair and can split it', () => {
    const h = handlers();
    render(<KnockoutWaitingRoom knockout={knockout({ pairs: [{ pairId: 'x', playerKeys: ['a', 'b'], byHost: true }] })} playerId="h1" {...h} />);
    fireEvent.press(screen.getByLabelText('Split Arjun Mehta and Priya Rao'));
    expect(h.onUnpair).toHaveBeenCalledWith('x');
  });

  it('adds a guest by name and a Kria player from search', async () => {
    const h = handlers();
    render(<KnockoutWaitingRoom knockout={knockout()} playerId="h1" {...h} />);
    fireEvent.changeText(screen.getByPlaceholderText('Name, or search Kria players'), 'Dev');
    fireEvent.press(screen.getByText('Add as guest'));
    expect(h.onAddGuest).toHaveBeenCalledWith('Dev');

    fireEvent.changeText(screen.getByPlaceholderText('Name, or search Kria players'), 'Dev K');
    fireEvent.press(await screen.findByText('Dev K'));
    expect(h.onAddPlayer).toHaveBeenCalledWith('p7');
  });

  it('removes a player', () => {
    const h = handlers();
    render(<KnockoutWaitingRoom knockout={knockout()} playerId="h1" {...h} />);
    fireEvent.press(screen.getByLabelText('Remove Sam'));
    expect(h.onRemove).toHaveBeenCalledWith('c');
  });
});

describe('joined player', () => {
  it('waits, with no host controls and no code', () => {
    render(<KnockoutWaitingRoom knockout={knockout({ joinCode: undefined })} playerId="p2" {...handlers()} />);
    expect(screen.getByText('Waiting for Arjun Mehta to start')).toBeTruthy();
    expect(screen.queryByText('Share code')).toBeNull();
    expect(screen.queryByLabelText('Remove Sam')).toBeNull();
  });
});

describe('draw bar', () => {
  it('explains why Draw is disabled', () => {
    const onDraw = jest.fn();
    render(<KnockoutDrawBar knockout={knockout()} onDraw={onDraw} onStart={jest.fn()} />);
    expect(screen.getByText('Add one more player or remove one to draw.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Draw' }).props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByText('Draw'));
    expect(onDraw).not.toHaveBeenCalled();
  });

  it('offers Reshuffle and Start once drawn', () => {
    const onDraw = jest.fn();
    const onStart = jest.fn();
    const drawn = knockout({ format: 'singles', entrants: [{ entrantId: 'e1', playerKeys: ['a'] }, { entrantId: 'e2', playerKeys: ['b'] }, { entrantId: 'e3', playerKeys: ['c'] }] });
    render(<KnockoutDrawBar knockout={drawn} onDraw={onDraw} onStart={onStart} />);
    expect(screen.getByRole('button', { name: 'Start knockout' }).props.accessibilityState.disabled).toBe(false);
    fireEvent.press(screen.getByText('Reshuffle'));
    fireEvent.press(screen.getByText('Start knockout'));
    expect(onDraw).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

it('a cricket knockout shows team cards instead of the player list', () => {
  const cricket = knockout({
    sport: 'cricket', format: 'teams', matchConfig: { maxOvers: 8, playersPerTeam: 6 },
    teams: [{ teamId: 't1', name: 'Strikers' }, { teamId: 't2', name: 'Team 2' }, { teamId: 't3', name: 'Team 3' }],
  });
  render(<KnockoutWaitingRoom knockout={cricket} playerId="h1" {...handlers()} />);
  expect(screen.getByText('Knockout · Cricket · 8 overs')).toBeTruthy();
  expect(screen.getByText('Any team')).toBeTruthy();
  expect(screen.queryByText('Tap two players to pair them')).toBeNull();
});
