import { fireEvent, render, screen } from '@testing-library/react-native';
import type { QuickKnockout } from '../src/api/quickKnockout';
import { CricketPeople } from '../src/components/knockout/People';
import { fixtureScores, koLine, koStatus, myPlayableFixture, roundAbbr, roundLabel, slotName } from '../src/lib/knockoutRoom';

const base = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k', hostId: 'h', name: 'Sunday Smash', sport: 'badminton', format: 'singles', status: 'live',
  matchConfig: { bestOf: 1, pointsToWin: 21 },
  players: [
    { playerKey: 'a', playerId: 'h', displayName: 'Rohan Sunwar' },
    { playerKey: 'b', playerId: 'me', displayName: 'Kabir Rao' },
    { playerKey: 'c', displayName: 'Sameer' },
  ],
  pairs: [], awards: [], createdAt: '',
  entrants: [{ entrantId: 'e1', playerKeys: ['a'] }, { entrantId: 'e2', playerKeys: ['b'] }, { entrantId: 'e3', playerKeys: ['c'] }],
  fixtures: [
    { fixtureId: 'f1', round: 1, position: 0, entrantA: 'e1', bye: true, winnerEntrantId: 'e1' },
    { fixtureId: 'f2', round: 1, position: 1, entrantA: 'e2', entrantB: 'e3', bye: false, quickMatchId: 'm2' },
    { fixtureId: 'f3', round: 2, position: 0, entrantA: 'e1', bye: false },
  ],
  roundNames: ['Semi-Final', 'Final'],
  ...over,
});

it('names rounds in sentence case and abbreviates them for open slots', () => {
  expect([roundLabel('Semi-Final'), roundLabel('Quarter-Final'), roundLabel('Round of 16')]).toEqual(['Semi-final', 'Quarter-final', 'Round of 16']);
  expect([roundAbbr('Semi-Final'), roundAbbr('Quarter-Final'), roundAbbr('Round of 16'), roundAbbr('Preliminary Round')]).toEqual(['SF', 'QF', 'R16', 'PR']);
});

it('fills a slot from the fixture feeding it: position p takes 2p and 2p+1', () => {
  const k = base();
  expect(slotName(k, k.fixtures[2], 'A')).toEqual({ name: 'Rohan Sunwar', open: false });
  expect(slotName(k, k.fixtures[2], 'B')).toEqual({ name: 'Winner of SF 2', open: true });
  expect(slotName(k, k.fixtures[0], 'B')).toEqual({ name: 'Bye', open: true });
});

it('finds your match only while it can be played', () => {
  expect(myPlayableFixture(base(), 'me')?.fixtureId).toBe('f2');
  expect(myPlayableFixture(base(), 'h')).toBeUndefined();
});

it('reads scores from the finished match by side id', () => {
  const f = base().fixtures[1];
  const m = {
    status: 'completed', sport: 'badminton', matchConfig: { bestOf: 1 },
    sides: [{ sideId: 'e2', name: '', slots: [] }, { sideId: 'e3', name: '', slots: [] }],
    gameScores: [{ gameNumber: 1, side1Score: 21, side2Score: 17, winnerSideId: 'e2' }],
  } as never;
  expect(fixtureScores(m, f)).toEqual(['21', '17']);
  expect(fixtureScores({ ...(m as object), status: 'live' } as never, f)).toBeNull();
});

it('calls a drawn but unstarted knockout what it is', () => {
  expect(koStatus(base({ status: 'waiting' })).label).toBe('Drawn · not started');
  expect(koStatus(base({ status: 'waiting', entrants: [] })).label).toBe('Waiting for players');
  expect(koLine(base({ status: 'waiting', entrants: [] }), 'h')).toBe('Badminton · Singles · One game to 21 · Hosted by you');
});

it('moves a cricket player with the sheet, and a full team is closed', () => {
  const onMove = jest.fn();
  const k = base({
    sport: 'cricket', format: 'teams', status: 'waiting', entrants: [], fixtures: [], roundNames: [],
    matchConfig: { maxOvers: 6, playersPerTeam: 1 },
    teams: [{ teamId: 't1', name: 'Team 1' }, { teamId: 't2', name: 'Team 2' }, { teamId: 't3', name: 'Team 3' }],
    players: [
      { playerKey: 'a', playerId: 'h', displayName: 'Rohan Sunwar', teamId: 't1' },
      { playerKey: 'b', playerId: 'me', displayName: 'Kabir Rao' },
    ],
  });
  render(<CricketPeople k={k} meId="h" busy={false} onRemove={jest.fn()} onMove={onMove} onAddTeam={jest.fn()} onRemoveTeam={jest.fn()} onRenameTeam={jest.fn()} />);
  fireEvent.press(screen.getByLabelText('Kabir Rao, Joined'));
  expect(screen.getByText('Move Kabir Rao')).toBeTruthy();
  expect(screen.getByText('1 / 1 · full')).toBeTruthy();
  const options = screen.getAllByText('Team 2');
  fireEvent.press(options[options.length - 1]); // the sheet's, below the section heading
  expect(onMove).toHaveBeenCalledWith('b', 't2');
});
