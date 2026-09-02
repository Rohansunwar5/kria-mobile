import API from './axios';

export interface GameScore {
  gameNumber: number;
  team1Score: number;
  team2Score: number;
  winnerId?: string;
}

export interface Competitor {
  registrationId?: string;
  name?: string;
  teamId?: string;
  teamName?: string;
}

export interface BadmintonMatch {
  _id: string;
  tournamentId: string;
  categoryId: string;
  competitorType: 'player' | 'team';
  bracketRound: string;
  matchNumber: number;
  player1?: Competitor;
  player2?: Competitor;
  teams?: { team1Id?: string; team2Id?: string; team1Name?: string; team2Name?: string };
  schedule?: { date?: string; time?: string; court?: string; venue?: string };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'walkover';
  gameScores: GameScore[];
  matchConfig?: { bestOf?: number; pointsToWin?: number };
  winnerId?: string;
  winReason?: string;
}

const unwrap = (res: any) => res?.data?.data?.data ?? res?.data?.data ?? null;

export async function getBadmintonMatch(matchId: string): Promise<BadmintonMatch | null> {
  const res = await API.get(`/sports/badminton/match/${matchId}`);
  return unwrap(res);
}

export async function getBadmintonMatchesByCategory(categoryId: string): Promise<BadmintonMatch[]> {
  const res = await API.get(`/sports/badminton/match/by-category/${categoryId}`);
  return unwrap(res) ?? [];
}
