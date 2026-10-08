import { fireEvent, render, screen } from '@testing-library/react-native';
import { CricketTeams } from '@/components/knockout/CricketTeams';
import type { QuickKnockout } from '@/api/quickKnockout';

const knockout = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k1', hostId: 'h1', joinCode: 'KX4P9M', name: 'Sunday Cup', sport: 'cricket', format: 'teams',
  matchConfig: { maxOvers: 8, playersPerTeam: 2 }, status: 'waiting',
  teams: [{ teamId: 't1', name: 'Strikers' }, { teamId: 't2', name: 'Team 2' }, { teamId: 't3', name: 'Team 3' }],
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta', teamId: 't1' },
    { playerKey: 'b', playerId: 'p2', displayName: 'Priya Rao', teamId: 't1' },
    { playerKey: 'c', displayName: 'Sam' },
  ],
  pairs: [], entrants: [], fixtures: [], roundNames: [], awards: [], createdAt: '2026-10-07T00:00:00.000Z',
  ...over,
});
const handlers = () => ({ onRemove: jest.fn(), onMove: jest.fn(), onAddTeam: jest.fn(), onRemoveTeam: jest.fn(), onRenameTeam: jest.fn() });

it('shows each team with its count, then the Any-team pool', () => {
  render(<CricketTeams knockout={knockout()} playerId="h1" {...handlers()} />);
  expect(screen.getByText('Strikers')).toBeTruthy();
  expect(screen.getByText('2/2')).toBeTruthy();
  expect(screen.getAllByText('0/2')).toHaveLength(2);
  expect(screen.getByText('Any team')).toBeTruthy();
  expect(screen.getByText('Sam')).toBeTruthy();
});

it('host moves a player: tap them, then Move here — never into a full team', () => {
  const h = handlers();
  render(<CricketTeams knockout={knockout()} playerId="h1" {...h} />);
  fireEvent.press(screen.getByLabelText('Select Sam'));
  expect(screen.queryByLabelText('Move Sam to Strikers')).toBeNull();
  fireEvent.press(screen.getByLabelText('Move Sam to Team 2'));
  expect(h.onMove).toHaveBeenCalledWith('c', 't2');

  fireEvent.press(screen.getByLabelText('Select Priya Rao'));
  fireEvent.press(screen.getByLabelText('Move Priya Rao to Any team'));
  expect(h.onMove).toHaveBeenLastCalledWith('b', null);
});

it('host renames a team', () => {
  const h = handlers();
  render(<CricketTeams knockout={knockout()} playerId="h1" {...h} />);
  fireEvent.press(screen.getByLabelText('Rename Strikers'));
  fireEvent.changeText(screen.getByLabelText('New name for Strikers'), ' Royals ');
  fireEvent.press(screen.getByText('Save'));
  expect(h.onRenameTeam).toHaveBeenCalledWith('t1', 'Royals');
});

it('offers Remove only above 3 teams, and Add team only below 8', () => {
  const h = handlers();
  const { rerender } = render(<CricketTeams knockout={knockout()} playerId="h1" {...h} />);
  expect(screen.queryByLabelText('Remove Team 2')).toBeNull();
  fireEvent.press(screen.getByText('+ Add team'));
  expect(h.onAddTeam).toHaveBeenCalled();

  const eight = Array.from({ length: 8 }, (_, i) => ({ teamId: `t${i + 1}`, name: `Team ${i + 1}` }));
  rerender(<CricketTeams knockout={knockout({ teams: eight })} playerId="h1" {...h} />);
  fireEvent.press(screen.getByLabelText('Remove Team 8'));
  expect(h.onRemoveTeam).toHaveBeenCalledWith('t8');
  expect(screen.queryByText('+ Add team')).toBeNull();
});

it('a joined player sees the teams but cannot arrange them', () => {
  render(<CricketTeams knockout={knockout()} playerId="p2" {...handlers()} />);
  expect(screen.getByText('Strikers')).toBeTruthy();
  expect(screen.queryByLabelText('Select Sam')).toBeNull();
  expect(screen.queryByLabelText('Rename Strikers')).toBeNull();
  expect(screen.queryByText('+ Add team')).toBeNull();
});

it('keeps the host controls on screen, inert, while an action is running', () => {
  const h = handlers();
  render(<CricketTeams knockout={knockout()} playerId="h1" busy {...h} />);
  expect(screen.getByLabelText('Rename Strikers')).toBeTruthy();
  expect(screen.getByText('+ Add team')).toBeTruthy();
  fireEvent.press(screen.getByText('+ Add team'));
  fireEvent.press(screen.getByLabelText('Remove Sam'));
  expect(h.onAddTeam).not.toHaveBeenCalled();
  expect(h.onRemove).not.toHaveBeenCalled();
});

it('does not count drawn players toward a full team: the server would re-deal them', () => {
  const h = handlers();
  const drawn = knockout().players.map((p) => (p.teamId ? { ...p, drawn: true } : p));
  render(<CricketTeams knockout={knockout({ players: drawn })} playerId="h1" {...h} />);
  fireEvent.press(screen.getByLabelText('Select Sam'));
  fireEvent.press(screen.getByLabelText('Move Sam to Strikers'));
  expect(h.onMove).toHaveBeenCalledWith('c', 't1');
});
