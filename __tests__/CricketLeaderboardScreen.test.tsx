import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Board from '../src/app/cricket/leaderboard/[categoryId]';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ categoryId: 'c1', tournamentName: 'Arohance Open', categoryName: 'Open T20' }),
}));
jest.mock('@/api/cricketStats', () => ({
  ...jest.requireActual('@/api/cricketStats'),
  getCricketLeaderboard: jest.fn(),
}));
jest.mock('@/api/tournaments', () => ({ getMyEntries: jest.fn() }));
/* eslint-disable @typescript-eslint/no-require-imports */
const { getCricketLeaderboard } = require('@/api/cricketStats');
const { getMyEntries } = require('@/api/tournaments');
/* eslint-enable @typescript-eslint/no-require-imports */

const P = (id: string, name: string, runs: number, wickets = 0) => ({
  registrationId: id, playerName: name, teamName: 'Lions',
  batting: { matches: 3, innings: 3, runs, balls: 50, fours: 2, sixes: 1, outs: 1, highest: 40 },
  bowling: { matches: 3, innings: 1, legalBalls: 12, runsConceded: 10, wickets },
  computed: { strikeRate: 100, average: 20, overs: '2.0', economy: 5, bestFigures: '1/10' },
});
const runsRows = [P('r1', 'Asha', 90), P('r2', 'Bina', 70), P('r3', 'Cara', 50)];
const wktRows = [P('r3', 'Cara', 50, 7), P('r1', 'Asha', 90, 2)];

beforeEach(() => {
  jest.clearAllMocks();
  getMyEntries.mockResolvedValue([{ _id: 'r2' }]);
  getCricketLeaderboard.mockResolvedValue(runsRows);
});

describe('Cricket player stats', () => {
  it('shows the header sub, leader card, and tints my row', async () => {
    render(<Board />);
    expect(await screen.findByText('Arohance Open · Open T20')).toBeTruthy();
    expect(await screen.findByText('Most runs')).toBeTruthy();
    expect(screen.getAllByText('90').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByLabelText(/Bina.*you/)).toBeTruthy());
    expect(screen.queryByLabelText(/Cara.*you/)).toBeNull();
  });

  it('opens the sheet from any row', async () => {
    render(<Board />);
    fireEvent.press(await screen.findByLabelText(/Cara/));
    expect(await screen.findByText('Lions · 3 matches')).toBeTruthy();
    expect(screen.getByText('Fielding')).toBeTruthy();
    expect(screen.queryByText('Maidens')).toBeNull();
  });

  it('keeps the latest sort when an earlier response arrives late', async () => {
    render(<Board />);
    await screen.findByText('Most runs');
    let resolveW!: (v: unknown) => void;
    getCricketLeaderboard.mockReturnValueOnce(new Promise((r) => { resolveW = r; }));
    fireEvent.press(screen.getByLabelText('Wickets'));
    getCricketLeaderboard.mockResolvedValueOnce(runsRows);
    fireEvent.press(screen.getByLabelText('Runs'));
    await screen.findByText('Most runs');
    await act(async () => { resolveW(wktRows); });
    expect(screen.queryByText('Most wickets')).toBeNull();
    expect(screen.getByText('Most runs')).toBeTruthy();
    expect(screen.getByText('Bina')).toBeTruthy();
  });

  it('says so when nothing is recorded', async () => {
    getCricketLeaderboard.mockResolvedValue([]);
    render(<Board />);
    expect(await screen.findByText('Nothing recorded yet')).toBeTruthy();
    expect(screen.getByText('Stats fill in as matches are scored.')).toBeTruthy();
  });
});
