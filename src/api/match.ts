import API from './axios';

export interface MatchTeams {
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
}

export interface PlayerCompetitor {
  registrationId: string;
  name: string;
  teamId: string;
  teamName: string;
}

export interface GameScore {
  gameNumber: number;
  team1Score: number;
  team2Score: number;
  winnerId?: string;
}

export interface MatchResult {
  team1Summary?: string;
  team2Summary?: string;
  team1Total?: number;
  team2Total?: number;
  marginOfVictory?: string;
}

export interface Match {
  _id: string;
  tournamentId: string;
  categoryId: string;
  sportType: string;
  competitorType?: 'player' | 'team';
  bracketRound: string;
  matchNumber: number;
  roundNumber?: number;
  positionInRound?: number;
  nextMatchId?: string;
  nextMatchSlot?: string;
  teams: MatchTeams;
  player1?: PlayerCompetitor;
  player2?: PlayerCompetitor;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'walkover';
  gameScores: GameScore[];
  result?: MatchResult;
  winnerId?: string;
  winReason?: string;
}

export interface BracketResponse {
  matches: Match[];
  rounds: Record<string, Match[]>;
  competitorType: 'player' | 'team';
}

const unwrap = (res: any) => res.data?.data?.data || res.data?.data;

export async function getCategoryBracket(categoryId: string): Promise<BracketResponse> {
  const res = await API.get(`/matches/categories/${categoryId}`);
  return unwrap(res) || { matches: [], rounds: {}, competitorType: 'player' };
}
