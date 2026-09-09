import { render } from '@testing-library/react-native';
import { MatchPanel } from '../src/components/quick/MatchPanel';
import type { QuickMatch } from '../src/api/quickMatch';

const base = (over: Partial<QuickMatch> = {}): QuickMatch => ({
  _id: 'm1',
  hostId: 'h1',
  sport: 'badminton',
  joinCode: 'ABC234',
  status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [{ slotId: 'sl1', playerId: 'h1', displayName: 'Host' }] },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'sl2', displayName: 'Open' }] },
  ],
  gameScores: [{ gameNumber: 1, side1Score: 5, side2Score: 3 }],
  matchConfig: { bestOf: 3, pointsToWin: 21 },
  createdAt: '2026-09-09T00:00:00.000Z',
  ...over,
});

const noop = () => undefined;

const panel = (match: QuickMatch, playerId: string) =>
  render(
    <MatchPanel
      match={match}
      playerId={playerId}
      onPoint={noop}
      onUndo={noop}
      onCancel={noop}
      onRemovePlayer={noop}
    />
  );

describe('MatchPanel', () => {
  it('shows both side names and the current score', () => {
    const { getAllByText, getByText } = panel(base(), 'h1');
    // getAllByText, not getByText: each side name renders twice — once as the
    // score column heading and once as the slot-list section heading.
    expect(getAllByText('Reds').length).toBeGreaterThan(0);
    expect(getAllByText('Blues').length).toBeGreaterThan(0);
    expect(getByText('5')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('gives the host scoring controls', () => {
    const { getByTestId } = panel(base(), 'h1');
    expect(getByTestId('point-side-1')).toBeTruthy();
    expect(getByTestId('point-side-2')).toBeTruthy();
    expect(getByTestId('cancel')).toBeTruthy();
  });

  it('gives a non-host none', () => {
    const { queryByTestId } = panel(base(), 'someone-else');
    expect(queryByTestId('point-side-1')).toBeNull();
    expect(queryByTestId('point-side-2')).toBeNull();
    expect(queryByTestId('cancel')).toBeNull();
    expect(queryByTestId('undo')).toBeNull();
  });

  it('shows the join code to the host while a slot is open', () => {
    const { getByTestId } = panel(base(), 'h1');
    expect(getByTestId('join-code')).toBeTruthy();
  });

  it('does not show the join code to a non-host', () => {
    const { queryByTestId } = panel(base(), 'someone-else');
    expect(queryByTestId('join-code')).toBeNull();
  });

  it('hides the join code once every slot is filled', () => {
    const full = base({
      sides: [
        { sideId: 's1', name: 'Reds', slots: [{ slotId: 'sl1', playerId: 'h1', displayName: 'Host' }] },
        { sideId: 's2', name: 'Blues', slots: [{ slotId: 'sl2', playerId: 'p2', displayName: 'Joiner' }] },
      ],
    });
    const { queryByTestId } = panel(full, 'h1');
    expect(queryByTestId('join-code')).toBeNull();
  });

  it('disables undo when there is no snapshot', () => {
    const { getByTestId } = panel(base(), 'h1');
    expect(getByTestId('undo').props.accessibilityState.disabled).toBe(true);
  });

  it('enables undo when the snapshot is an empty array', () => {
    // [] is a real snapshot — undoing the first point of the match.
    const { getByTestId } = panel(base({ previousGameScores: [] }), 'h1');
    expect(getByTestId('undo').props.accessibilityState.disabled).toBe(false);
  });

  it('drops +1 and cancel on a completed match but KEEPS undo', () => {
    // undoLastPoint refuses only a cancelled match; a completed one is
    // explicitly allowed, because correcting a mis-tapped match point is what
    // it is for. recordPoint and cancel both refuse a completed match.
    const done = base({
      status: 'completed',
      outcome: 'side1',
      previousGameScores: [{ gameNumber: 1, side1Score: 20, side2Score: 18 }],
      gameScores: [{ gameNumber: 1, side1Score: 21, side2Score: 18, winnerSideId: 's1' }],
    });
    const { queryByTestId, getByTestId, getByText } = panel(done, 'h1');

    expect(queryByTestId('point-side-1')).toBeNull();
    expect(queryByTestId('cancel')).toBeNull();
    expect(getByTestId('undo').props.accessibilityState.disabled).toBe(false);
    expect(getByText('Reds won')).toBeTruthy();
  });

  it('offers eject on another player but never on the host', () => {
    const withJoiner = base({
      sides: [
        { sideId: 's1', name: 'Reds', slots: [{ slotId: 'sl1', playerId: 'h1', displayName: 'Host' }] },
        { sideId: 's2', name: 'Blues', slots: [{ slotId: 'sl2', playerId: 'p2', displayName: 'Joiner' }] },
      ],
    });
    const { getByTestId, queryByTestId } = panel(withJoiner, 'h1');
    expect(getByTestId('remove-p2')).toBeTruthy();
    expect(queryByTestId('remove-h1')).toBeNull();
  });
});
