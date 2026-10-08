import { fireEvent, render, screen } from '@testing-library/react-native';
import { CricketHostTools } from '@/components/quick/CricketScorePanel';
import type { QuickMatch } from '@/api/quickMatch';

const open = [
  { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', playerId: 'host', displayName: 'Kohli' }] },
  { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'Bumrah' }] },
];
const full = [open[0], { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', playerId: 'p2', displayName: 'Bumrah' }] }];
const match = (over: Record<string, unknown> = {}): QuickMatch => ({
  _id: 'm1', hostId: 'host', sport: 'cricket', joinCode: 'ABC123', status: 'live', sides: open,
  createdAt: '2026-09-10T00:00:00.000Z', ...over,
}) as unknown as QuickMatch;
const tools = (m: QuickMatch, playerId = 'host', onCancel = jest.fn(), busy = false) =>
  render(<CricketHostTools match={m} playerId={playerId} busy={busy} onCancel={onCancel} />);

it('shows the code while a slot is open, and not once every slot is taken', () => {
  const view = tools(match());
  expect(screen.getByTestId('join-code')).toBeTruthy();
  expect(screen.getByText('ABC123')).toBeTruthy();
  view.unmount();

  tools(match({ sides: full }));
  expect(screen.queryByText('ABC123')).toBeNull();
});

it('lets the host cancel, but not mid-request', () => {
  const onCancel = jest.fn();
  const view = tools(match(), 'host', onCancel, true);
  fireEvent.press(screen.getByText('Cancel match'));
  expect(onCancel).not.toHaveBeenCalled();
  view.unmount();

  tools(match(), 'host', onCancel);
  fireEvent.press(screen.getByText('Cancel match'));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('gives a non-host, a knockout match and a finished match nothing', () => {
  expect(tools(match(), 'someone-else').toJSON()).toBeNull();
  expect(tools(match({ knockoutId: 'k1' })).toJSON()).toBeNull();
  expect(tools(match({ status: 'completed' })).toJSON()).toBeNull();
});
