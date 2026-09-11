import { render, fireEvent } from '@testing-library/react-native';
import { CricketScorePanel } from '@/components/quick/CricketScorePanel';
import type { QuickMatch } from '@/api/quickMatch';

const live = (liveState: Record<string, unknown>): QuickMatch => ({
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
}) as unknown as QuickMatch;

const midInnings = {
  runs: 42, wickets: 3, completedOvers: 6, ballsInCurrentOver: 2,
  currentInnings: 1, matchStatus: 'innings1',
  battingTeamId: 's1', bowlingTeamId: 's2',
  strikerId: 'a1', nonStrikerId: 'a2', currentBowlerId: 'b1',
};

const panel = (onBall = jest.fn()) => ({
  onBall,
  ...render(
    <CricketScorePanel
      match={live(midInnings)}
      playerId="host" busy={false} onBall={onBall} onUndo={jest.fn()} onCancel={jest.fn()}
    />
  ),
});

describe('extras run options', () => {
  it('does not offer 0 runs for an extra', () => {
    // A wide or no-ball is worth at least the penalty run, and a bye of zero
    // is not a bye — `extrasRuns` is never legitimately 0 for any of the four.
    const { getByText, queryByText } = panel();
    fireEvent.press(getByText('Extras'));
    fireEvent.press(getByText('Wide'));

    expect(queryByText('0')).toBeNull();
    expect(getByText('1')).toBeTruthy();
    expect(getByText('6')).toBeTruthy();
  });
});

describe('an extra and a wicket on the same delivery', () => {
  it('offers a way to record both', () => {
    // A run-out off a wide or a bye is routine in casual play. The server has
    // always accepted both fields on one ball; only this panel forced a choice,
    // so the host recorded the wicket and silently lost the extra.
    const { getByText } = panel();
    fireEvent.press(getByText('Extras'));

    expect(getByText(/wicket too/i)).toBeTruthy();
  });

  it('posts the extra and the wicket together', () => {
    const onBall = jest.fn();
    const { getByText } = panel(onBall);

    fireEvent.press(getByText('Extras'));
    fireEvent.press(getByText(/wicket too/i));   // arm it
    fireEvent.press(getByText('Wide'));
    fireEvent.press(getByText('2'));             // 2 extras off the wide
    fireEvent.press(getByText('Bowled'));        // straight to post: no fielder, striker's end

    expect(onBall).toHaveBeenCalledTimes(1);
    expect(onBall.mock.calls[0][0]).toMatchObject({
      extrasType: 'wide',
      extrasRuns: 2,
      wicketType: 'bowled',
      dismissedPlayerId: 'a1',
    });
  });

  it('still posts an extra alone when the toggle is off', () => {
    // The common case must not gain a step.
    const onBall = jest.fn();
    const { getByText } = panel(onBall);

    fireEvent.press(getByText('Extras'));
    fireEvent.press(getByText('Leg bye'));
    fireEvent.press(getByText('1'));

    expect(onBall).toHaveBeenCalledTimes(1);
    expect(onBall.mock.calls[0][0]).toMatchObject({ extrasType: 'leg_bye', extrasRuns: 1 });
    expect(onBall.mock.calls[0][0].wicketType).toBeUndefined();
  });

  it('still posts a wicket alone from the wicket button', () => {
    const onBall = jest.fn();
    const { getByText } = panel(onBall);

    fireEvent.press(getByText('Wicket'));
    fireEvent.press(getByText('Bowled'));

    expect(onBall).toHaveBeenCalledTimes(1);
    expect(onBall.mock.calls[0][0]).toMatchObject({ wicketType: 'bowled' });
    expect(onBall.mock.calls[0][0].extrasType).toBeUndefined();
  });

  it('carries the extra through a run-out, which needs both extra steps', () => {
    // run_out is the combination that actually matters, and it is also the
    // longest path: who was dismissed, then the fielder.
    const onBall = jest.fn();
    const { getByText } = panel(onBall);

    fireEvent.press(getByText('Extras'));
    fireEvent.press(getByText(/wicket too/i));
    fireEvent.press(getByText('Bye'));
    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('Run out'));
    fireEvent.press(getByText('Rahul'));        // the non-striker was run out
    fireEvent.press(getByText('Bumrah'));       // fielder

    expect(onBall).toHaveBeenCalledTimes(1);
    expect(onBall.mock.calls[0][0]).toMatchObject({
      extrasType: 'bye',
      extrasRuns: 1,
      wicketType: 'run_out',
      dismissedPlayerId: 'a2',
      fielderId: 'b1',
    });
  });

  it('forgets an armed extra once the delivery is recorded', () => {
    // Otherwise the NEXT wicket silently carries the previous ball's extra.
    const onBall = jest.fn();
    const { getByText } = panel(onBall);

    fireEvent.press(getByText('Extras'));
    fireEvent.press(getByText(/wicket too/i));
    fireEvent.press(getByText('Wide'));
    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('Bowled'));

    fireEvent.press(getByText('Wicket'));
    fireEvent.press(getByText('Bowled'));

    expect(onBall).toHaveBeenCalledTimes(2);
    expect(onBall.mock.calls[1][0].extrasType).toBeUndefined();
    expect(onBall.mock.calls[1][0].extrasRuns).toBeUndefined();
  });
});
