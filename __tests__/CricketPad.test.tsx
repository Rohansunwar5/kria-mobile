import type { ComponentProps } from 'react';
import { Modal } from 'react-native';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { Scorecard } from '@/api/cricketMatch';
import type { QuickMatch } from '@/api/quickMatch';
import { CricketPad } from '@/components/live/CricketPad';
import { BottomSheet } from '@/components/ui/BottomSheet';

// Ported from CricketScorePanel, CricketDismissedBatsman, CricketExtrasWicket
// and CricketPanelAffordances (new copy per the pad preview, same meaning).
// Three batters so a filter that drops one still leaves a real choice; two
// bowlers so the fielder and bowler lists are a real choice too.
const live = (liveState: Record<string, unknown> | undefined, over: Record<string, unknown> = {}): QuickMatch => ({
  _id: 'm1', hostId: 'host', sport: 'cricket', joinCode: 'ABC123', status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [
      { slotId: 'a1', displayName: 'Kohli' },
      { slotId: 'a2', displayName: 'Rahul' },
      { slotId: 'a3', displayName: 'Gill' },
    ] },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'Bumrah' }, { slotId: 'b2', displayName: 'Shami' }] },
  ],
  createdAt: '2026-09-10T00:00:00.000Z',
  cricketSetup: {
    toss: { winnerTeamId: 's1', decision: 'bat', recorded: true },
    lineupsSet: true,
    side1Lineup: [{ slotId: 'a1', name: 'Kohli' }, { slotId: 'a2', name: 'Rahul' }, { slotId: 'a3', name: 'Gill' }],
    side2Lineup: [{ slotId: 'b1', name: 'Bumrah' }, { slotId: 'b2', name: 'Shami' }],
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
const firstBall = { matchStatus: 'awaiting_start', currentInnings: 1, runs: 0, wickets: 0, completedOvers: 0, ballsInCurrentOver: 0 };
const ids = { batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1' };

type Props = ComponentProps<typeof CricketPad>;
const pad = (match: QuickMatch, over: Partial<Props> = {}) => {
  const props: Props = { match, scorecard: null, busy: false, problem: '', onBall: jest.fn(), onUndo: jest.fn(), ...over };
  const view = render(<CricketPad {...props} />);
  return { ...view, props, onBall: props.onBall as jest.Mock, onUndo: props.onUndo as jest.Mock };
};
const sheet = () => within(screen.UNSAFE_getByType(Modal));
const sheetOpen = () => screen.UNSAFE_getByType(BottomSheet).props.open as boolean;
const press = (label: string) => fireEvent.press(screen.getByLabelText(label));

describe('run keys', () => {
  it('records a run at once, with the ids in liveState', () => {
    const { onBall } = pad(live(midInnings));
    press('1 run');
    expect(onBall).toHaveBeenCalledWith({ ...ids, runs: 1 });
  });

  it('records 4 and 6 from their own tiles', () => {
    const v = pad(live(midInnings));
    expect(screen.getByText('Four')).toBeTruthy();
    press('Four');
    expect(v.onBall).toHaveBeenLastCalledWith({ ...ids, runs: 4 });
    // The server's answer is a new match, which frees the pad for the next ball.
    v.rerender(<CricketPad {...v.props} match={live(midInnings)} />);
    press('Six');
    expect(v.onBall).toHaveBeenLastCalledWith({ ...ids, runs: 6 });
    expect(v.onBall).toHaveBeenCalledTimes(2);
  });

  it('posts once for two fast taps, and nothing while a request is in flight', () => {
    const { onBall, unmount } = pad(live(midInnings));
    press('2 runs');
    press('2 runs');
    expect(onBall).toHaveBeenCalledTimes(1);
    unmount();

    const busy = pad(live(midInnings), { busy: true });
    press('2 runs');
    press('Wicket');
    expect(busy.onBall).not.toHaveBeenCalled();
    expect(sheetOpen()).toBe(false);
  });

  it('offers Undo only when there is a ball to undo', () => {
    const v = pad(live({ ...midInnings, matchStatus: undefined }));
    expect(screen.getByText('Extras')).toBeTruthy();
    expect(screen.queryByText('Undo')).toBeNull();
    v.unmount();

    const { onUndo } = pad(live(midInnings));
    press('Undo');
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('drops its picks on Undo, so a stale bowler cannot win over the server', () => {
    pad(live({ ...midInnings, nextBowlerNeeded: true }));
    fireEvent.press(sheet().getByText('Shami'));
    expect(screen.getByLabelText('1 run')).toBeTruthy();
    press('Undo');
    expect(screen.getByText('Pick the bowler')).toBeTruthy();
    expect(screen.queryByLabelText('1 run')).toBeNull();
  });

  it('names the bowler and the striker, with this over so far', () => {
    const over = (overNumber: number, labels: string[]) => ({
      overNumber, runs: 0, wickets: 0, balls: labels.map((label) => ({ label, runs: 0, isWicket: label === 'W' })),
    });
    const scorecard = { innings1: { oversTimeline: [over(6, ['lb1']), over(7, ['wd', 'W'])], bowlingCard: [] }, innings2: null } as unknown as Scorecard;
    pad(live(midInnings), { scorecard });
    expect(screen.getByText('Bumrah to Kohli')).toBeTruthy();
    expect(screen.getByText('wd')).toBeTruthy();
    expect(screen.getByText('W')).toBeTruthy();
    expect(screen.queryByText('lb1')).toBeNull(); // last over, not this one
  });
});

describe('extras', () => {
  it('records the kind and the runs from the Extras sheet, never 0', () => {
    const { onBall } = pad(live(midInnings));
    press('Extras');
    expect(sheet().getByText('Pick the kind, then tap the runs to record the ball.')).toBeTruthy();
    expect(sheet().getByText('Wide · runs')).toBeTruthy();
    expect(sheet().queryByText('0')).toBeNull();
    expect(sheet().getByText('6')).toBeTruthy();
    fireEvent.press(sheet().getByText('No ball'));
    expect(sheet().getByText('No ball · runs')).toBeTruthy();
    fireEvent.press(sheet().getByText('3'));
    expect(onBall).toHaveBeenCalledWith({ ...ids, runs: 0, extrasType: 'no_ball', extrasRuns: 3 });
  });

  it('records a wide of 4 when the ball runs away', () => {
    const { onBall } = pad(live(midInnings));
    press('Extras');
    fireEvent.press(sheet().getByText('4'));
    expect(onBall).toHaveBeenCalledWith({ ...ids, runs: 0, extrasType: 'wide', extrasRuns: 4 });
  });

  it('with "Wicket on this ball too" on, a runs key goes to the wicket step and one post carries both', () => {
    const { onBall } = pad(live(midInnings));
    press('Extras');
    expect(sheet().getByText('A stumping off a wide, a run out going for a bye')).toBeTruthy();
    press('Wicket on this ball too');
    fireEvent.press(sheet().getByText('Leg bye'));
    fireEvent.press(sheet().getByText('2'));
    expect(onBall).not.toHaveBeenCalled();
    expect(sheet().getByText('How was it out?')).toBeTruthy();
    fireEvent.press(sheet().getByText('Bowled'));
    expect(onBall).toHaveBeenCalledTimes(1);
    expect(onBall).toHaveBeenCalledWith({
      ...ids, runs: 0, extrasType: 'leg_bye', extrasRuns: 2, wicketType: 'bowled', dismissedPlayerId: 'a1',
    });
  });

  it('carries the extra through a run out: who is out, then the fielder', () => {
    const { onBall } = pad(live(midInnings));
    press('Extras');
    press('Wicket on this ball too');
    fireEvent.press(sheet().getByText('Bye'));
    fireEvent.press(sheet().getByText('1'));
    fireEvent.press(sheet().getByText('Run out'));
    fireEvent.press(sheet().getByText('Rahul'));
    fireEvent.press(sheet().getByText('Bumrah'));
    expect(onBall).toHaveBeenCalledTimes(1);
    expect(onBall).toHaveBeenCalledWith({
      ...ids, runs: 0, extrasType: 'bye', extrasRuns: 1, wicketType: 'run_out', dismissedPlayerId: 'a2', fielderId: 'b1',
    });
  });

  it('backs out of that wicket step to the extras, with the kind still chosen', () => {
    pad(live(midInnings));
    press('Extras');
    press('Wicket on this ball too');
    fireEvent.press(sheet().getByText('No ball'));
    fireEvent.press(sheet().getByText('2'));
    expect(sheet().getByText('How was it out?')).toBeTruthy();
    press('Back');
    expect(sheet().getByText('No ball · runs')).toBeTruthy();
    expect(sheet().queryByText('How was it out?')).toBeNull();
  });
});

describe('wickets', () => {
  it('Caught asks who took it, from the fielding side only, and posts the fielder', () => {
    const { onBall } = pad(live(midInnings));
    press('Wicket');
    expect(sheet().getByText('How was it out?')).toBeTruthy();
    expect(sheet().getByText('Kohli is on strike · Bumrah bowling')).toBeTruthy();
    expect(sheet().getAllByText('then batter')).toHaveLength(2);
    fireEvent.press(sheet().getByText('Caught'));
    expect(sheet().getByText('Caught by')).toBeTruthy();
    expect(sheet().getByText('Bumrah')).toBeTruthy();
    for (const batter of ['Kohli', 'Rahul', 'Gill']) expect(sheet().queryByText(batter)).toBeNull();
    fireEvent.press(sheet().getByText('Shami'));
    expect(onBall).toHaveBeenCalledWith({ ...ids, runs: 0, wicketType: 'caught', dismissedPlayerId: 'a1', fielderId: 'b2' });
  });

  it("Run out asks who's out, then who ran them out", () => {
    const { onBall } = pad(live(midInnings));
    press('Wicket');
    fireEvent.press(sheet().getByText('Run out'));
    expect(sheet().getByText("Who's out?")).toBeTruthy();
    expect(sheet().getByText('On strike')).toBeTruthy();
    expect(sheet().getByText('Non-striker')).toBeTruthy();
    fireEvent.press(sheet().getByText('Rahul'));
    expect(sheet().getByText('Run out by')).toBeTruthy();
    fireEvent.press(sheet().getByText('Bumrah'));
    expect(onBall).toHaveBeenCalledWith({ ...ids, runs: 0, wicketType: 'run_out', dismissedPlayerId: 'a2', fielderId: 'b1' });
  });

  it("Retired hurt asks who's out and records with no fielder", () => {
    const { onBall } = pad(live(midInnings));
    press('Wicket');
    fireEvent.press(sheet().getByText('Retired hurt'));
    fireEvent.press(sheet().getByText('Rahul'));
    expect(onBall).toHaveBeenCalledWith({ ...ids, runs: 0, wicketType: 'retired_hurt', dismissedPlayerId: 'a2' });
  });

  it('Bowled records at once, dismissing the striker', () => {
    const { onBall } = pad(live(midInnings));
    press('Wicket');
    fireEvent.press(sheet().getByText('Bowled'));
    expect(onBall).toHaveBeenCalledWith({ ...ids, runs: 0, wicketType: 'bowled', dismissedPlayerId: 'a1' });
  });

  it('Back steps one level at a time', async () => {
    const { onBall } = pad(live(midInnings));
    press('Wicket');
    fireEvent.press(sheet().getByText('Run out'));
    fireEvent.press(sheet().getByText('Kohli'));
    expect(sheet().getByText('Run out by')).toBeTruthy();
    press('Back');
    expect(sheet().getByText("Who's out?")).toBeTruthy();
    press('Back');
    expect(sheet().getByText('How was it out?')).toBeTruthy();
    press('Back');
    expect(sheetOpen()).toBe(false);
    await waitFor(() => expect(screen.queryByText('How was it out?')).toBeNull());
    expect(screen.getByLabelText('1 run')).toBeTruthy();
    expect(onBall).not.toHaveBeenCalled();
  });
});

describe('picks', () => {
  it('opens by itself on the first ball: striker, non-striker, bowler, then the keys', () => {
    const { onBall } = pad(live(firstBall));
    expect(sheetOpen()).toBe(true);
    expect(sheet().getByText('Opening batters')).toBeTruthy();
    expect(sheet().getByText('On strike')).toBeTruthy();
    expect(screen.queryByLabelText('1 run')).toBeNull();
    fireEvent.press(sheet().getByText('Kohli'));
    expect(sheet().getByText('Non-striker')).toBeTruthy();
    expect(sheet().queryByText('Kohli')).toBeNull();
    fireEvent.press(sheet().getByText('Rahul'));
    expect(sheet().getByText("Over 1 · who's bowling?")).toBeTruthy();
    fireEvent.press(sheet().getByText('Bumrah'));
    expect(sheetOpen()).toBe(false);
    press('1 run');
    expect(onBall).toHaveBeenCalledWith({ ...ids, runs: 1 });
  });

  it('closing it puts one "Pick the opening batters" button where the keys were', () => {
    pad(live(firstBall));
    press('Close');
    expect(sheetOpen()).toBe(false);
    expect(screen.getByText('Pick the opening batters')).toBeTruthy();
    expect(screen.queryByLabelText('1 run')).toBeNull();
    expect(screen.queryByText('Extras')).toBeNull();
    press('Pick the opening batters');
    expect(sheetOpen()).toBe(true);
  });

  it('does not open by itself while a ball is in flight', () => {
    const v = pad(live(firstBall), { busy: true });
    expect(sheetOpen()).toBe(false);
    v.rerender(<CricketPad {...v.props} busy={false} />);
    expect(sheetOpen()).toBe(true);
  });

  it('a new over asks "Over {n} · who\'s bowling?", with figures', () => {
    const scorecard = {
      innings1: { oversTimeline: [], bowlingCard: [{ registrationId: 'b1', name: 'Bumrah', overs: '2', maidens: 0, runs: 14, wickets: 1, economy: 7 }] },
      innings2: null,
    } as unknown as Scorecard;
    const { onBall } = pad(live({ ...midInnings, nextBowlerNeeded: true }), { scorecard });
    expect(sheet().getByText("Over 7 · who's bowling?")).toBeTruthy();
    expect(sheet().getByText('Reds 42/3 · Bumrah bowled the last over')).toBeTruthy();
    expect(sheet().getByText('2-0-14-1')).toBeTruthy();
    expect(sheet().getByText('yet to bowl')).toBeTruthy();
    expect(screen.getByText('Pick the bowler')).toBeTruthy();
    fireEvent.press(sheet().getByText('Shami'));
    press('1 run');
    expect(onBall).toHaveBeenCalledWith({ ...ids, bowlerId: 'b2', runs: 1 });
  });

  it('does not offer a batter who is out, nor the one at the other end', () => {
    pad(live({ ...midInnings, nextBatsmanNeeded: true, strikerId: undefined, dismissedIds: ['a1'] }));
    expect(sheet().getByText('Next batter')).toBeTruthy();
    expect(sheet().getByText('Gill')).toBeTruthy();
    expect(sheet().queryByText('Kohli')).toBeNull();
    expect(sheet().queryByText('Rahul')).toBeNull();
  });

  it('asks for the batter, then the bowler, and posts them rather than the stale ids', () => {
    const { onBall } = pad(live({
      ...midInnings, nextBatsmanNeeded: true, nextBowlerNeeded: true, strikerId: 'stale-striker', currentBowlerId: 'stale-bowler',
    }));
    expect(sheet().getByText('Next batter')).toBeTruthy();
    fireEvent.press(sheet().getByText('Gill'));
    expect(sheet().getByText("Over 7 · who's bowling?")).toBeTruthy();
    fireEvent.press(sheet().getByText('Shami'));
    press('Four');
    expect(onBall).toHaveBeenCalledWith({ batsmanOnStrikeId: 'a3', nonStrikerId: 'a2', bowlerId: 'b2', runs: 4 });
  });

  it('after a run out of the non-striker, fills the end the server emptied', () => {
    const v = pad(live(midInnings));
    press('Wicket');
    fireEvent.press(sheet().getByText('Run out'));
    fireEvent.press(sheet().getByText('Rahul'));
    fireEvent.press(sheet().getByText('Bumrah'));
    expect(v.onBall).toHaveBeenCalledWith(expect.objectContaining({ wicketType: 'run_out', dismissedPlayerId: 'a2' }));

    v.rerender(<CricketPad {...v.props} match={live({ ...midInnings, nextBatsmanNeeded: true, nonStrikerId: undefined, dismissedIds: ['a2'] })} />);
    expect(sheet().getByText('Next batter')).toBeTruthy();
    expect(sheet().queryByText('Kohli')).toBeNull(); // the survivor is not their own partner
    fireEvent.press(sheet().getByText('Gill'));
    press('Four');
    expect(v.onBall).toHaveBeenLastCalledWith({ batsmanOnStrikeId: 'a1', nonStrikerId: 'a3', bowlerId: 'b1', runs: 4 });
  });
});

describe('errors', () => {
  it('shows a refused ball above the keys and keeps the pad open', () => {
    pad(live(midInnings), { problem: 'That bowler has no overs left.' });
    expect(screen.getByText('That bowler has no overs left.')).toBeTruthy();
    expect(screen.getByLabelText('1 run')).toBeTruthy();
    expect(screen.getByText('Extras')).toBeTruthy();
  });

  it('shows the message inside the pick sheet when the refused ball needed a pick', () => {
    // Recording cleared the picks, so the sheet reopens over the pad: the reason goes with it.
    pad(live({ ...midInnings, nextBowlerNeeded: true }), { problem: 'That bowler has no overs left.' });
    expect(sheetOpen()).toBe(true);
    expect(sheet().getByText("Over 7 · who's bowling?")).toBeTruthy();
    expect(sheet().getByText('That bowler has no overs left.')).toBeTruthy();
  });
});
