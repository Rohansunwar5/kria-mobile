import { fireEvent, render, screen } from '@testing-library/react-native';
import { QuickCricketLive } from '@/components/quick/QuickCricketLive';
import type { QuickMatch } from '@/api/quickMatch';
import type { InningsScorecard, Scorecard } from '@/api/cricketMatch';

const sides = [
  { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', playerId: 'p1', displayName: 'Kohli' }, { slotId: 'a2', displayName: 'Rahul' }] },
  { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', playerId: 'p3', displayName: 'Bumrah' }] },
];
const tossed = { toss: { recorded: true, winnerTeamId: 's1', decision: 'bat' }, lineupsSet: true, side1Lineup: [], side2Lineup: [] };
const match = (over: Record<string, unknown> = {}): QuickMatch => ({
  _id: 'm1', hostId: 'p1', sport: 'cricket', joinCode: 'ABC123', status: 'live', sides,
  createdAt: '2026-10-08T00:00:00.000Z', matchConfig: { maxOvers: 20 }, cricketSetup: tossed,
  liveState: {
    runs: 42, wickets: 3, completedOvers: 6, ballsInCurrentOver: 2, currentInnings: 1, matchStatus: 'innings1',
    battingTeamId: 's1', bowlingTeamId: 's2', strikerId: 'a1', nonStrikerId: 'a2', currentBowlerId: 'b1',
  },
  ...over,
}) as unknown as QuickMatch;

const innings1: InningsScorecard = {
  inningsNumber: 1, battingTeamId: 's1', battingTeamName: 'Reds', bowlingTeamId: 's2', bowlingTeamName: 'Blues',
  totals: { runs: 42, wickets: 3, overs: '6.2', extras: { wides: 1, noBalls: 0, byes: 0, legByes: 0, total: 1 } },
  battingCard: [
    { registrationId: 'a1', name: 'Kohli', runs: 20, ballsFaced: 15, fours: 2, sixes: 0, strikeRate: 133.3 },
    { registrationId: 'a2', name: 'Rahul', runs: 5, ballsFaced: 9, fours: 0, sixes: 0, strikeRate: 55.6 },
  ],
  bowlingCard: [{ registrationId: 'b1', name: 'Bumrah', overs: '6.2', maidens: 0, runs: 42, wickets: 3, economy: 6.6 }],
  oversTimeline: [], currentPartnership: null, fallOfWickets: [], partnerships: [],
};
const card: Scorecard = { innings1, innings2: null };

it('shows the score band, the toss and who is at the crease', () => {
  render(<QuickCricketLive match={match()} scorecard={card} />);
  expect(screen.getByText('Reds won the toss and chose to bat')).toBeTruthy();
  expect(screen.getByText('Reds batting')).toBeTruthy();
  expect(screen.getByText('Kohli')).toBeTruthy();
  expect(screen.getByText('20 (15)')).toBeTruthy();
  expect(screen.getByText('Bumrah')).toBeTruthy();
});

it('switches to the full scorecard', () => {
  render(<QuickCricketLive match={match()} scorecard={card} />);
  expect(screen.queryByText('Stands')).toBeNull();
  fireEvent.press(screen.getByText('Scorecard'));
  expect(screen.getByText('Stands')).toBeTruthy();
});

it('still shows the score with no scorecard, and offers no Scorecard tab', () => {
  render(<QuickCricketLive match={match()} scorecard={null} />);
  expect(screen.getByText('Reds v Blues')).toBeTruthy();
  expect(screen.queryByText('Scorecard')).toBeNull();
});

it('opens a finished match on its scorecard, with the result', () => {
  render(<QuickCricketLive match={match({ status: 'completed', outcome: 'side1' })} scorecard={card} />);
  expect(screen.getByText('Reds won')).toBeTruthy();
  expect(screen.getByText('Stands')).toBeTruthy();
});

it('says a cancelled match was cancelled', () => {
  render(<QuickCricketLive match={match({ status: 'cancelled' })} scorecard={null} />);
  expect(screen.getByText('Match cancelled')).toBeTruthy();
});

it('before the toss, shows the squads and marks the viewer', () => {
  const setup = { toss: { recorded: false }, lineupsSet: false, side1Lineup: [], side2Lineup: [] };
  render(<QuickCricketLive match={match({ cricketSetup: setup, liveState: undefined })} scorecard={null} playerId="p3" />);
  expect(screen.getByText('Waiting for the toss')).toBeTruthy();
  expect(screen.getByText('Squads')).toBeTruthy();
  expect(screen.getByText('Kohli')).toBeTruthy();
  expect(screen.getByText('Bumrah (you)')).toBeTruthy();
});
