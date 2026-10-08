import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

/** A toss recorded by an app older than the server filling the squads. */
const tossed = (side1Lineup: unknown[] = []) => match({
  cricketSetup: { toss: { winnerTeamId: 's1', decision: 'bat', recorded: true }, lineupsSet: false, side1Lineup, side2Lineup: [] },
});

const panel = (m: QuickMatch, over: Record<string, unknown> = {}) =>
  render(<CricketSetupPanel match={m} playerId="host" busy={false} onToss={jest.fn()} onLineup={jest.fn()} {...over} />);

describe('the toss', () => {
  it('offers both sides as cards with their player counts', () => {
    panel(match());
    expect(screen.getByText('Toss — who won it?')).toBeTruthy();
    expect(screen.getByText('Reds')).toBeTruthy();
    expect(screen.getByText('Blues')).toBeTruthy();
    expect(screen.getAllByText('1 players')).toHaveLength(2);
    expect(screen.queryByText(/^bat$/i)).toBeNull();
  });

  it('reports the picked side and decision', () => {
    const onToss = jest.fn();
    panel(match(), { onToss });
    fireEvent.press(screen.getByText('Reds'));
    expect(screen.getByText('Reds chose to…')).toBeTruthy();
    fireEvent.press(screen.getByText(/^bat$/i));
    expect(onToss).toHaveBeenCalledWith({ winnerSideId: 's1', decision: 'bat' });
  });

  it('switches the pick when the other card is tapped', () => {
    const onToss = jest.fn();
    panel(match(), { onToss });
    fireEvent.press(screen.getByText('Reds'));
    fireEvent.press(screen.getByText('Blues'));
    fireEvent.press(screen.getByText(/^bowl$/i));
    expect(onToss).toHaveBeenCalledWith({ winnerSideId: 's2', decision: 'bowl' });
  });

  it('records nothing while a request is in flight', () => {
    const onToss = jest.fn();
    panel(match(), { onToss, busy: true });
    fireEvent.press(screen.getByText('Reds'));
    fireEvent.press(screen.getByText(/^bat$/i));
    expect(onToss).not.toHaveBeenCalled();
  });

  it('gives a non-host nothing — their setup view is the live view', () => {
    expect(panel(match(), { playerId: 'someone-else' }).toJSON()).toBeNull();
  });
});

describe('a toss recorded before the squads were filled for it', () => {
  it('asks to confirm the teams instead of the toss', () => {
    panel(tossed());
    expect(screen.getByText('Confirm teams')).toBeTruthy();
    expect(screen.queryByText('Toss — who won it?')).toBeNull();
  });

  it('confirms each empty side from its slots, one after the other', async () => {
    let release: () => void = () => undefined;
    const onLineup = jest.fn((input: { sideId: string }) =>
      input.sideId === 's1' ? new Promise<void>((resolve) => { release = resolve; }) : undefined);
    panel(tossed(), { onLineup });

    fireEvent.press(screen.getByText('Confirm teams'));
    expect(onLineup).toHaveBeenCalledTimes(1); // waits for side 1's save
    await act(async () => { release(); });

    expect(onLineup).toHaveBeenNthCalledWith(1, { sideId: 's1', players: [{ slotId: 'a1', playerId: 'p1', name: 'Kohli' }] });
    expect(onLineup).toHaveBeenNthCalledWith(2, { sideId: 's2', players: [{ slotId: 'b1', name: 'Guest' }] });
  });

  it('skips a side that already has its squad', async () => {
    const onLineup = jest.fn();
    panel(tossed([{ slotId: 'a1', name: 'Kohli' }]), { onLineup });
    await act(async () => { fireEvent.press(screen.getByText('Confirm teams')); });
    expect(onLineup).toHaveBeenCalledTimes(1);
    expect(onLineup).toHaveBeenCalledWith({ sideId: 's2', players: [{ slotId: 'b1', name: 'Guest' }] });
  });
});
