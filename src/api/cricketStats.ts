import API from './axios';

const unwrap = (res: any) => res?.data?.data?.data ?? res?.data?.data ?? null;

export interface Ball {
  _id: string;
  matchId: string;
  inningsNumber: 1 | 2;
  overNumber: number;
  deliveryNumber: number;
  batsmanOnStrikeId: string;
  nonStrikerId: string;
  bowlerId: string;
  runs: number;
  extrasType?: 'wide' | 'no_ball' | 'bye' | 'leg_bye';
  extrasRuns: number;
  totalRuns: number;
  isLegalDelivery: boolean;
  wicketType?: string;
  dismissedPlayerId?: string;
  fielderId?: string;
  commentary?: string;
}

export interface CricketPlayerStats {
  registrationId: string;
  playerName?: string;
  teamName?: string;
  matches?: number;
  batting: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    outs: number;
    highest?: number;
  };
  bowling: {
    legalBalls: number;
    runsConceded: number;
    wickets: number;
    maidens?: number;
    bestFigureWickets?: number;
    bestFigureRuns?: number;
  };
  fielding?: { catches?: number; runOuts?: number; stumpings?: number };
  computed: {
    strikeRate: number | null;
    average: number | null;
    overs: string;
    economy: number | null;
    bestFigures: string | null;
  };
}

export type LeaderboardSort = 'runs' | 'wickets' | 'sr' | 'economy' | 'fours' | 'sixes' | 'highest';

export const SORT_LABELS: Record<LeaderboardSort, string> = {
  runs: 'Runs',
  wickets: 'Wickets',
  sr: 'Strike rate',
  economy: 'Economy',
  fours: 'Fours',
  sixes: 'Sixes',
  highest: 'Highest',
};

export const SORTS = Object.keys(SORT_LABELS) as LeaderboardSort[];

export async function getCricketLeaderboard(
  categoryId: string,
  sort: LeaderboardSort = 'runs'
): Promise<CricketPlayerStats[]> {
  const res = await API.get(`/sports/cricket/stats/categories/${categoryId}/leaderboard`, { params: { sort } });
  return unwrap(res)?.leaderboard ?? [];
}

/** Player stats are per-registration — scoped to one tournament, not global. */
export async function getCricketPlayerStats(
  registrationId: string,
  tournamentId: string
): Promise<CricketPlayerStats | null> {
  const res = await API.get(`/sports/cricket/stats/registrations/${registrationId}/stats`, { params: { tournamentId } });
  return unwrap(res);
}

export async function getInningsBalls(matchId: string, inningsNumber: 1 | 2): Promise<Ball[]> {
  const res = await API.get(`/sports/cricket/stats/matches/${matchId}/innings/${inningsNumber}/balls`);
  return unwrap(res)?.balls ?? [];
}
