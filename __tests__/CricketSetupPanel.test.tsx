import { render, fireEvent } from '@testing-library/react-native';
import { CricketSetupPanel } from '@/components/quick/CricketSetupPanel';
import type { QuickMatch } from '@/api/quickMatch';

const match = (over: Record<string, unknown> = {}): QuickMatch => ({
  _id: 'm1', hostId: 'host', sport: 'cricket', joinCode: 'ABC123', status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', playerId: 'p1', displayName: 'Kohli' }] },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'Guest' }] },
  ],
  createdAt: '2026-09-10T00:00:00.000Z',
  cricketSetup: { toss: { recorded: false }, lineupsSet: false, side1Lineup: [], side2Lineup: [] },
  ...over,
}) as QuickMatch;

const tossed = () => match({
  cricketSetup: {
    toss: { winnerTeamId: 's1', decision: 'bat', recorded: true },
    lineupsSet: false, side1Lineup: [], side2Lineup: [],
  },
});

describe('CricketSetupPanel', () => {
  it('asks for the toss first, offering both sides', () => {
    const { getByText } = render(
      <CricketSetupPanel match={match()} playerId="host" busy={false} onToss={jest.fn()} onLineup={jest.fn()} />
    );

    expect(getByText(/toss/i)).toBeTruthy();
    expect(getByText('Reds')).toBeTruthy();
    expect(getByText('Blues')).toBeTruthy();
  });

  it('reports the toss winner and decision the host picked', () => {
    const onToss = jest.fn();
    const { getByText } = render(
      <CricketSetupPanel match={match()} playerId="host" busy={false} onToss={onToss} onLineup={jest.fn()} />
    );

    fireEvent.press(getByText('Reds'));
    fireEvent.press(getByText(/^bat$/i));

    expect(onToss).toHaveBeenCalledWith({ winnerSideId: 's1', decision: 'bat' });
  });

  it('moves on to lineups once the toss is recorded', () => {
    const { getByText, queryByText } = render(
      <CricketSetupPanel match={tossed()} playerId="host" busy={false} onToss={jest.fn()} onLineup={jest.fn()} />
    );

    expect(getByText(/batting order/i)).toBeTruthy();
    expect(queryByText(/who won the toss/i)).toBeNull();
  });

  // The career-credit rule of spec §2, enforced at the UI boundary.
  it('submits a lineup derived from slots, carrying playerId through', () => {
    const onLineup = jest.fn();
    const { getByText } = render(
      <CricketSetupPanel match={tossed()} playerId="host" busy={false} onToss={jest.fn()} onLineup={onLineup} />
    );

    fireEvent.press(getByText(/confirm reds/i));

    expect(onLineup).toHaveBeenCalledWith({
      sideId: 's1',
      players: [{ slotId: 'a1', playerId: 'p1', name: 'Kohli' }],
    });
  });

  it('keeps a placeholder slot playerless', () => {
    const onLineup = jest.fn();
    const { getByText } = render(
      <CricketSetupPanel match={tossed()} playerId="host" busy={false} onToss={jest.fn()} onLineup={onLineup} />
    );

    fireEvent.press(getByText(/confirm blues/i));

    expect(onLineup).toHaveBeenCalledWith({
      sideId: 's2',
      players: [{ slotId: 'b1', name: 'Guest' }],
    });
  });

  it('offers no controls to a non-host', () => {
    const { queryByText } = render(
      <CricketSetupPanel match={match()} playerId="someone-else" busy={false} onToss={jest.fn()} onLineup={jest.fn()} />
    );

    expect(queryByText('Reds')).toBeNull();
    expect(queryByText(/only the host/i)).toBeTruthy();
  });

  it('disables the controls while a mutation is in flight', () => {
    const onToss = jest.fn();
    const { getByText } = render(
      <CricketSetupPanel match={match()} playerId="host" busy onToss={onToss} onLineup={jest.fn()} />
    );

    fireEvent.press(getByText('Reds'));
    fireEvent.press(getByText(/^bat$/i));

    expect(onToss).not.toHaveBeenCalled();
  });
});
