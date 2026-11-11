import { render, screen } from '@testing-library/react-native';
import type { Match } from '@/api/match';
import type { TournamentCategory } from '@/api/tournaments';
import { Results } from '@/components/tournament/Results';

const cat = (o: Partial<TournamentCategory> = {}): TournamentCategory => ({
  _id: 'c1', tournamentId: 't1', name: 'Open Singles', status: 'completed', registrationFee: 0, isPaidRegistration: false, ...o,
});
const P = (id: string, name: string) => ({ registrationId: id, name, teamId: '', teamName: '' });
const mk = (o: Partial<Match>): Match => ({
  _id: 'x', tournamentId: 't1', categoryId: 'c1', sportType: 'badminton', bracketRound: 'Group A', matchNumber: 1, roundNumber: 1,
  positionInRound: 0, teams: { team1Id: '', team2Id: '', team1Name: '', team2Name: '' }, status: 'completed', gameScores: [], ...o,
}) as Match;

test('a finished groups-then-knockout category shows its champion from the Final', () => {
  const matches = [
    mk({ _id: 'g1', player1: P('r1', 'Asha'), player2: P('r2', 'Bina'), winnerId: 'r1' }),
    mk({ _id: 'f', bracketRound: 'Final', roundNumber: 2, player1: P('r1', 'Asha'), player2: P('r3', 'Cara'), winnerId: 'r1',
      gameScores: [{ gameNumber: 1, team1Score: 21, team2Score: 15 }] }),
  ];
  render(<Results categories={[cat({ bracketType: 'hybrid' })]} matches={{ c1: matches }} awards={[]} onTable={() => {}} />);

  expect(screen.getByText('Asha')).toBeTruthy();
  expect(screen.queryByText('Final table')).toBeNull();
});

test('one completed by hand before its Final is decided still offers its table', () => {
  const matches = [
    mk({ _id: 'g1', player1: P('r1', 'Asha'), player2: P('r2', 'Bina'), winnerId: 'r1' }),
    mk({ _id: 'f', bracketRound: 'Final', roundNumber: 2, player1: P('r1', 'Asha'), player2: P('r3', 'Cara'), status: 'scheduled' }),
  ];
  render(<Results categories={[cat({ bracketType: 'hybrid' })]} matches={{ c1: matches }} awards={[]} onTable={() => {}} />);

  expect(screen.getByText('Final table')).toBeTruthy();
});

test('one finished without a Final still offers its table', () => {
  render(<Results categories={[cat({ bracketType: 'hybrid' })]} matches={{ c1: [mk({ player1: P('r1', 'Asha'), player2: P('r2', 'Bina'), winnerId: 'r1' })] }} awards={[]} onTable={() => {}} />);

  expect(screen.getByText('Final table')).toBeTruthy();
});
