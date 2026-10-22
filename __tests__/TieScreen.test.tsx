import { fireEvent, render, screen } from '@testing-library/react-native';
import Tie from '../src/app/tournament/[id]/tie/[tieId]';

let mockParams: Record<string, string> = { id: 't1', tieId: 'tie1', group: 'Group A' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));
const mockHook = jest.fn();
jest.mock('@/lib/useTournament', () => ({ useTournament: () => mockHook() }));
jest.mock('@/api/teamLeague', () => ({ getTieDetails: jest.fn() }));
jest.mock('@/api/tournaments', () => ({ getTournamentTeams: jest.fn() }));
/* eslint-disable @typescript-eslint/no-require-imports */
const { getTieDetails } = require('@/api/teamLeague');
const { getTournamentTeams } = require('@/api/tournaments');
/* eslint-enable @typescript-eslint/no-require-imports */

const g = (a: number, b: number) => ({ team1Score: a, team2Score: b });
const detail = {
  tie: { _id: 'tie1', categoryId: 'c1', teams: { team1Id: 'T1', team1Name: 'Lions', team2Id: 'T2', team2Name: 'Tigers' }, status: 'scheduled' },
  subMatches: [
    { _id: 's2', subMatchSlotNumber: 2, slotLabel: "Men's doubles", status: 'in_progress', player1: { name: 'Cara & Dev', teamId: 'T1' }, player2: { name: 'Eve & Fay', teamId: 'T2' }, gameScores: [g(21, 19), g(5, 3)] },
    { _id: 's1', subMatchSlotNumber: 1, slotLabel: "Men's singles 1", status: 'completed', winnerId: 'T2', player1: { name: 'Asha', teamId: 'T1' }, player2: { name: 'Bina', teamId: 'T2' }, gameScores: [g(17, 21), g(15, 21)] },
    { _id: 's3', subMatchSlotNumber: 3, slotLabel: "Women's singles", status: 'scheduled' },
  ],
  lineups: [
    { _id: 'l1', teamId: 'T1', assignments: [{ slotNumber: 1, playerNames: ['Asha'] }, { slotNumber: 2, playerNames: ['Cara', 'Dev'] }] },
    { _id: 'l2', teamId: 'T2', assignments: [{ slotNumber: 1, playerNames: ['Bina'] }, { slotNumber: 2, playerNames: ['Eve', 'Fay'] }] },
  ],
};

function setup() {
  mockHook.mockReturnValue({ data: { tournament: { name: 'Arohance Open' }, categories: [{ _id: 'c1', name: 'Club Team Event' }], mine: [{ _id: 'e1', categoryId: 'c1', teamId: 'T1' }] }, loading: false, error: false, reload: jest.fn() });
  return render(<Tie />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 't1', tieId: 'tie1', group: 'Group A' };
  getTieDetails.mockResolvedValue(detail);
  getTournamentTeams.mockResolvedValue([]);
});

describe('Tie screen', () => {
  it('shows both teams, the tie score and each sub-match', async () => {
    setup();
    expect(await screen.findByText('Lions')).toBeTruthy();
    expect(screen.getByText('Group A tie')).toBeTruthy();
    expect(screen.getByText('Club Team Event · Arohance Open')).toBeTruthy();
    expect(screen.getByText('Tigers')).toBeTruthy();
    expect(screen.getByText('Your team')).toBeTruthy();
    expect(screen.getByText('0–1')).toBeTruthy();
    expect(screen.getByText('Live · 1 of 3 played')).toBeTruthy();
    expect(screen.getByText('Matches')).toBeTruthy();
    expect(screen.getByText("Men's singles 1")).toBeTruthy();
    expect(screen.getByText('Final')).toBeTruthy();
    expect(screen.getByText("Men's doubles")).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('Cara / Dev')).toBeTruthy();
    expect(screen.getByText('Eve / Fay')).toBeTruthy();
    expect(screen.getByText('Asha')).toBeTruthy();
    expect(screen.getByText('Bina')).toBeTruthy();
    expect(screen.getByText('17')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getByText("Women's singles")).toBeTruthy();
    expect(getTieDetails).toHaveBeenCalledWith('tie1');
    expect(getTournamentTeams).toHaveBeenCalledWith('t1');
  });

  it('a failed load offers a retry', async () => {
    getTieDetails.mockRejectedValueOnce(new Error('net'));
    setup();
    expect(await screen.findByText("Couldn't load the tie.")).toBeTruthy();
    fireEvent.press(await screen.findByText('Retry'));
    expect(await screen.findByText('Lions')).toBeTruthy();
    expect(getTieDetails).toHaveBeenCalledTimes(2);
  });
});
