import { render } from '@testing-library/react-native';
import { CricketScorePanel } from '@/components/quick/CricketScorePanel';
import type { QuickMatch } from '@/api/quickMatch';

/**
 * Three batsmen, so filtering one out still leaves a real choice — with only
 * two the picker would be empty either way and the test could not tell a
 * working filter from a broken one.
 */
const live = (liveState: Record<string, unknown>): QuickMatch => ({
  _id: 'm1', hostId: 'host', sport: 'cricket', joinCode: 'ABC123', status: 'live',
  sides: [
    {
      sideId: 's1',
      name: 'Reds',
      slots: [
        { slotId: 'a1', displayName: 'Kohli' },
        { slotId: 'a2', displayName: 'Rahul' },
        { slotId: 'a3', displayName: 'Gill' },
      ],
    },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'Bumrah' }] },
  ],
  createdAt: '2026-09-10T00:00:00.000Z',
  cricketSetup: {
    toss: { winnerTeamId: 's1', decision: 'bat', recorded: true },
    lineupsSet: true,
    side1Lineup: [{ slotId: 'a1', name: 'Kohli' }, { slotId: 'a2', name: 'Rahul' }, { slotId: 'a3', name: 'Gill' }],
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

const panel = (liveState: Record<string, unknown>) => render(
  <CricketScorePanel
    match={live(liveState)}
    playerId="host" busy={false} onBall={jest.fn()} onUndo={jest.fn()} onCancel={jest.fn()}
  />
);

describe('CricketScorePanel does not offer a dismissed batsman', () => {
  it('leaves an out batsman off the new-striker list', () => {
    // a1 is out; a2 holds the other end. Only Gill should be offered.
    const { queryByText, getByText } = panel({
      ...midInnings, nextBatsmanNeeded: true, dismissedIds: ['a1'],
    });

    expect(getByText(/who is on strike/i)).toBeTruthy();
    expect(getByText('Gill')).toBeTruthy();
    // The server refuses this ball anyway; offering it only earns the host a
    // 400 after they have already tapped.
    expect(queryByText('Kohli')).toBeNull();
  });

  it('leaves an out batsman off the new-non-striker list', () => {
    // The other end matters too: a run-out dismisses either batsman.
    const { queryByText, getByText } = panel({
      ...midInnings,
      strikerId: undefined,
      nonStrikerId: undefined,
      nextBatsmanNeeded: true,
      dismissedIds: ['a2'],
    });

    expect(getByText(/who is on strike/i)).toBeTruthy();
    expect(queryByText('Rahul')).toBeNull();
  });

  it('offers everyone when the match carries no dismissed list', () => {
    // A match already in flight before the field existed. It must keep
    // scoring — an empty picker would be worse than the bug.
    const { getByText } = panel({ ...midInnings, nextBatsmanNeeded: true });

    expect(getByText('Kohli')).toBeTruthy();
    expect(getByText('Gill')).toBeTruthy();
  });

  it('still keeps the other end out of the list', () => {
    // The pre-existing exclusion must survive: a2 is at the other end, so it
    // is not a candidate even though it is not dismissed.
    const { queryByText, getByText } = panel({
      ...midInnings, nextBatsmanNeeded: true, dismissedIds: ['a1'],
    });

    expect(queryByText('Rahul')).toBeNull();
    expect(getByText('Gill')).toBeTruthy();
  });
});
