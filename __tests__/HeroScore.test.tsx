import { render, screen } from '@testing-library/react-native';
import { HeroScore } from '@/components/cricket/HeroScore';
import type { LiveState } from '@/api/cricketMatch';

const live = { runs: 120, wickets: 4, completedOvers: 20, ballsInCurrentOver: 0, currentInnings: 2, matchStatus: 'completed' } as LiveState;
const match = { teams: { team1Id: 't1', team2Id: 't2', team1Name: 'Reds', team2Name: 'Blues' }, winnerId: 't2', result: { marginOfVictory: '6 wickets' } };

it('says who won by default, and a given label instead', () => {
  const { rerender } = render(<HeroScore match={match} live={live} innings={null} completed />);
  expect(screen.getByText('Blues won · 6 wickets')).toBeTruthy();

  rerender(<HeroScore match={match} live={live} innings={null} completed resultLabel="Tied · Reds went through" />);
  expect(screen.getByText('Tied · Reds went through')).toBeTruthy();
  expect(screen.queryByText(/Blues won/)).toBeNull();
});
