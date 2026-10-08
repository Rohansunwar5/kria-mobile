import { render, fireEvent } from '@testing-library/react-native';
import { CricketScorePanel } from '@/components/quick/CricketScorePanel';
import type { QuickMatch } from '@/api/quickMatch';

const live = (over: Partial<QuickMatch> = {}): QuickMatch => ({
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
  liveState: {
    runs: 42, wickets: 3, completedOvers: 6, ballsInCurrentOver: 2,
    currentInnings: 1, matchStatus: 'innings1',
    battingTeamId: 's1', bowlingTeamId: 's2',
    strikerId: 'a1', nonStrikerId: 'a2', currentBowlerId: 'b1',
  },
  ...over,
}) as unknown as QuickMatch;

const panel = (match: QuickMatch, playerId = 'host') => render(
  <CricketScorePanel
    match={match} playerId={playerId} busy={false}
    onBall={jest.fn()} onUndo={jest.fn()}
  />
);

describe('every entry step can be backed out of', () => {
  it('returns from the extras sheet to the main controls', () => {
    // Previously the only escape from a half-finished entry was "Cancel
    // match", which ends the whole match.
    const { getByText, queryByText } = panel(live());

    fireEvent.press(getByText('Extras'));
    expect(queryByText('Wide')).toBeTruthy();

    fireEvent.press(getByText('Back'));
    expect(queryByText('Wide')).toBeNull();
    expect(getByText('Extras')).toBeTruthy();
  });

  it('returns from the runs step to the extras types', () => {
    const { getByText, queryByText } = panel(live());

    fireEvent.press(getByText('Extras'));
    fireEvent.press(getByText('Wide'));
    fireEvent.press(getByText('Back'));

    // Back at the type picker, not all the way out.
    expect(getByText('Wide')).toBeTruthy();
    expect(queryByText('Leg bye')).toBeTruthy();
  });

  it('returns from the wicket sheet to the main controls', () => {
    const { getByText, queryByText } = panel(live());

    fireEvent.press(getByText('Wicket'));
    expect(queryByText('Bowled')).toBeTruthy();

    fireEvent.press(getByText('Back'));
    expect(queryByText('Bowled')).toBeNull();
    expect(getByText('Wicket')).toBeTruthy();
  });

  it('returns from the who-was-dismissed step to the wicket types', () => {
    const { getByText, queryByText } = panel(live());

    fireEvent.press(getByText('Wicket'));
    fireEvent.press(getByText('Run out'));
    expect(queryByText(/who was dismissed/i)).toBeTruthy();

    fireEvent.press(getByText('Back'));
    expect(queryByText(/who was dismissed/i)).toBeNull();
    expect(getByText('Bowled')).toBeTruthy();
  });

  it('backs a wicket armed from the extras flow to the runs step, not out of it', () => {
    // The combined entry must not lose the extra the host already chose.
    const { getByText, queryByText } = panel(live());

    fireEvent.press(getByText('Extras'));
    fireEvent.press(getByText(/wicket too/i));
    fireEvent.press(getByText('Wide'));
    fireEvent.press(getByText('2'));
    expect(queryByText('Bowled')).toBeTruthy();

    fireEvent.press(getByText('Back'));
    // Back at the run count for the wide, with the type still chosen.
    expect(getByText('6')).toBeTruthy();
    expect(queryByText('Bowled')).toBeNull();
  });
});
