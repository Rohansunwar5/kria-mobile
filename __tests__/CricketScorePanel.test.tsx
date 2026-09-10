import { render, fireEvent } from '@testing-library/react-native';
import { CricketScorePanel } from '@/components/quick/CricketScorePanel';
import type { QuickMatch } from '@/api/quickMatch';

const live = (liveState: Record<string, unknown>, over: Record<string, unknown> = {}): QuickMatch => ({
  _id: 'm1', hostId: 'host', sport: 'cricket', joinCode: 'ABC123', status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', displayName: 'Kohli' }, { slotId: 'a2', displayName: 'Rahul' }] },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'Bumrah' }] },
  ],
  createdAt: '2026-09-10T00:00:00.000Z',
  cricketSetup: {
    toss: { winnerTeamId: 's1', decision: 'bat', recorded: true },
    lineupsSet: true,
    side1Lineup: [{ slotId: 'a1', name: 'Kohli' }, { slotId: 'a2', name: 'Rahul' }],
    side2Lineup: [{ slotId: 'b1', name: 'Bumrah' }],
  },
  liveState,
  ...over,
}) as unknown as QuickMatch;

const midInnings = {
  runs: 42, wickets: 3, completedOvers: 6, ballsInCurrentOver: 2,
  currentInnings: 1, matchStatus: 'innings1',
  battingTeamId: 's1', bowlingTeamId: 's2',
  strikerId: 'a1', nonStrikerId: 'a2', currentBowlerId: 'b1',
};

describe('CricketScorePanel', () => {
  it('shows the score line', () => {
    const { getByText } = render(
      <CricketScorePanel match={live(midInnings)} playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()} onCancel={jest.fn()} />
    );

    expect(getByText('42/3 (6.2)')).toBeTruthy();
  });

  it('posts a plain delivery from the run buttons, using the ids in liveState', () => {
    const onBall = jest.fn();
    const { getByText } = render(
      <CricketScorePanel match={live(midInnings)} playerId="host" busy={false} onBall={onBall} onUndo={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(getByText('4'));

    expect(onBall).toHaveBeenCalledWith({
      batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 4,
    });
  });

  it('shows the chase line in the second innings', () => {
    const { getByText } = render(
      <CricketScorePanel
        match={live({ ...midInnings, currentInnings: 2, matchStatus: 'innings2', runs: 40, target: 61 })}
        playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()} onCancel={jest.fn()}
      />
    );

    expect(getByText('Needs 21 to win')).toBeTruthy();
  });

  // The engine seeds the innings from the first ball's own ids, so they must be
  // collected rather than read from a liveState that does not have them yet.
  it('prompts for the opening batsmen and bowler on the first ball', () => {
    const { getByText, queryByText } = render(
      <CricketScorePanel
        match={live({ matchStatus: 'awaiting_start', currentInnings: 1, runs: 0, wickets: 0, completedOvers: 0, ballsInCurrentOver: 0 })}
        playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()} onCancel={jest.fn()}
      />
    );

    expect(getByText(/who is on strike/i)).toBeTruthy();
    expect(queryByText('4')).toBeNull();
  });

  it('prompts for a new batsman when the engine asks for one', () => {
    const { getByText } = render(
      <CricketScorePanel
        match={live({ ...midInnings, nextBatsmanNeeded: true })}
        playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()} onCancel={jest.fn()}
      />
    );

    expect(getByText(/who is on strike/i)).toBeTruthy();
  });

  it('prompts for a new bowler when the engine asks for one', () => {
    const { getByText } = render(
      <CricketScorePanel
        match={live({ ...midInnings, nextBowlerNeeded: true })}
        playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()} onCancel={jest.fn()}
      />
    );

    expect(getByText(/who is bowling/i)).toBeTruthy();
  });

  it('posts extras with their type and runs', () => {
    const onBall = jest.fn();
    const { getByText } = render(
      <CricketScorePanel match={live(midInnings)} playerId="host" busy={false} onBall={onBall} onUndo={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(getByText(/extras/i));
    fireEvent.press(getByText(/wide/i));

    expect(onBall).toHaveBeenCalledWith(expect.objectContaining({
      runs: 0, extrasType: 'wide', extrasRuns: 1,
    }));
  });

  it('posts a wicket with its type and the dismissed player', () => {
    const onBall = jest.fn();
    const { getByText } = render(
      <CricketScorePanel match={live(midInnings)} playerId="host" busy={false} onBall={onBall} onUndo={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(getByText(/wicket/i));
    fireEvent.press(getByText(/bowled/i));

    expect(onBall).toHaveBeenCalledWith(expect.objectContaining({
      runs: 0, wicketType: 'bowled', dismissedPlayerId: 'a1',
    }));
  });

  it('offers undo once play has started', () => {
    const onUndo = jest.fn();
    const { getByText } = render(
      <CricketScorePanel match={live(midInnings)} playerId="host" busy={false} onBall={jest.fn()} onUndo={onUndo} onCancel={jest.fn()} />
    );

    fireEvent.press(getByText(/undo/i));
    expect(onUndo).toHaveBeenCalled();
  });

  it('shows the outcome and no controls once completed', () => {
    const { getByText, queryByText } = render(
      <CricketScorePanel
        match={live({ ...midInnings, matchStatus: 'completed' }, { status: 'completed', outcome: 'side1' })}
        playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()} onCancel={jest.fn()}
      />
    );

    expect(getByText('Reds won')).toBeTruthy();
    expect(queryByText('4')).toBeNull();
  });

  it('gives a non-host the score and no controls', () => {
    const { getByText, queryByText } = render(
      <CricketScorePanel match={live(midInnings)} playerId="someone-else" busy={false} onBall={jest.fn()} onUndo={jest.fn()} onCancel={jest.fn()} />
    );

    expect(getByText('42/3 (6.2)')).toBeTruthy();
    expect(queryByText('4')).toBeNull();
  });

  it('disables the run buttons while a mutation is in flight', () => {
    const onBall = jest.fn();
    const { getByText } = render(
      <CricketScorePanel match={live(midInnings)} playerId="host" busy onBall={onBall} onUndo={jest.fn()} onCancel={jest.fn()} />
    );

    fireEvent.press(getByText('4'));
    expect(onBall).not.toHaveBeenCalled();
  });
});
