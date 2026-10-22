import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { QuickMatch } from '@/api/quickMatch';
import { TossCard } from '@/components/live/TossCard';

// Ported from CricketSetupPanel (new copy per the toss preview, same meaning).
// Who sees it (host only, live, before the first ball) is the room's call and
// is pinned in QuickMatchScreen.test.tsx.
const match = (over: Record<string, unknown> = {}): QuickMatch => ({
  _id: 'm1', hostId: 'host', sport: 'cricket', joinCode: 'ABC123', status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', playerId: 'p1', displayName: 'Kohli' }, { slotId: 'a2', displayName: 'Rahul' }] },
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

const card = (m: QuickMatch, over: Record<string, unknown> = {}) =>
  render(<TossCard match={m} busy={false} onToss={jest.fn()} onLineup={jest.fn()} {...over} />);

describe('the toss', () => {
  it('asks who won it, with both sides and their player counts', () => {
    card(match());
    expect(screen.getByText('Who won the toss?')).toBeTruthy();
    expect(screen.getByText('Reds')).toBeTruthy();
    expect(screen.getByText('2 players')).toBeTruthy();
    expect(screen.getByText('Blues')).toBeTruthy();
    expect(screen.getByText('1 player')).toBeTruthy();
    // Bat and Bowl wait for a winner.
    expect(screen.queryByText('Bat')).toBeNull();
  });

  it('records the winner and Bat', () => {
    const onToss = jest.fn();
    card(match(), { onToss });
    fireEvent.press(screen.getByText('Reds'));
    expect(screen.getByText('Reds chose to')).toBeTruthy();
    fireEvent.press(screen.getByText('Bat'));
    expect(onToss).toHaveBeenCalledWith({ winnerSideId: 's1', decision: 'bat' });
  });

  it('switches the winner when the other side is tapped', () => {
    const onToss = jest.fn();
    card(match(), { onToss });
    fireEvent.press(screen.getByText('Reds'));
    fireEvent.press(screen.getByText('Blues'));
    expect(screen.getByText('Blues chose to')).toBeTruthy();
    fireEvent.press(screen.getByText('Bowl'));
    expect(onToss).toHaveBeenCalledWith({ winnerSideId: 's2', decision: 'bowl' });
  });

  it('records nothing while a request is in flight', () => {
    const onToss = jest.fn();
    card(match(), { onToss, busy: true });
    fireEvent.press(screen.getByText('Reds'));
    fireEvent.press(screen.getByText('Bat'));
    expect(onToss).not.toHaveBeenCalled();
  });
});

describe('a toss recorded before the squads were filled for it', () => {
  it('asks to confirm the teams instead of the toss', () => {
    card(tossed());
    expect(screen.getByText('Confirm teams')).toBeTruthy();
    expect(screen.queryByText('Who won the toss?')).toBeNull();
  });

  it('confirms each empty side from its slots, one after the other', async () => {
    let release: () => void = () => undefined;
    const onLineup = jest.fn((input: { sideId: string }) =>
      input.sideId === 's1' ? new Promise<void>((resolve) => { release = resolve; }) : undefined);
    card(tossed(), { onLineup });

    fireEvent.press(screen.getByText('Confirm teams'));
    expect(onLineup).toHaveBeenCalledTimes(1); // waits for side 1's save
    await act(async () => { release(); });

    expect(onLineup).toHaveBeenNthCalledWith(1, {
      sideId: 's1', players: [{ slotId: 'a1', playerId: 'p1', name: 'Kohli' }, { slotId: 'a2', name: 'Rahul' }],
    });
    expect(onLineup).toHaveBeenNthCalledWith(2, { sideId: 's2', players: [{ slotId: 'b1', name: 'Guest' }] });
  });

  it('skips a side that already has its squad', async () => {
    const onLineup = jest.fn();
    card(tossed([{ slotId: 'a1', name: 'Kohli' }]), { onLineup });
    await act(async () => { fireEvent.press(screen.getByText('Confirm teams')); });
    expect(onLineup).toHaveBeenCalledTimes(1);
    expect(onLineup).toHaveBeenCalledWith({ sideId: 's2', players: [{ slotId: 'b1', name: 'Guest' }] });
  });

  it('confirms nothing while a request is in flight', () => {
    const onLineup = jest.fn();
    card(tossed(), { onLineup, busy: true });
    fireEvent.press(screen.getByText('Confirm teams'));
    expect(onLineup).not.toHaveBeenCalled();
  });
});
