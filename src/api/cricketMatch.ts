import API from './axios';

const unwrap = (res: any) => res.data?.data?.data || res.data?.data;

export interface LiveState {
  runs: number;
  wickets: number;
  completedOvers: number;
  ballsInCurrentOver: number;
  currentInnings: 1 | 2;
  target?: number;
  battingTeamId?: string;
  strikerId?: string;
  nonStrikerId?: string;
  currentBowlerId?: string;
  extras?: { wides: number; noBalls: number; byes: number; legByes: number };
  matchStatus?: string;
}

export interface Dismissal {
  type: string;
  bowlerName?: string;
  fielderName?: string;
}

export interface BatterEntry {
  registrationId: string;
  name: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissal?: Dismissal;
}

export interface BowlerEntry {
  registrationId: string;
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface BallSummary { label: string; runs: number; isWicket: boolean }
export interface OverSummary { overNumber: number; runs: number; wickets: number; balls: BallSummary[] }

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  overs: string;
  batterName: string;
  dismissalLine: string;
}

export interface InningsScorecard {
  inningsNumber: 1 | 2;
  battingTeamId: string;
  battingTeamName: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  totals: { runs: number; wickets: number; overs: string; extras: { wides: number; noBalls: number; byes: number; legByes: number; total: number } };
  battingCard: BatterEntry[];
  bowlingCard: BowlerEntry[];
  oversTimeline: OverSummary[];
  fallOfWickets: FallOfWicket[];
}

export interface Scorecard {
  innings1: InningsScorecard | null;
  innings2: InningsScorecard | null;
}

export interface CricketMatch {
  _id: string;
  tournamentId: string;
  teams: { team1Id: string; team2Id: string; team1Name: string; team2Name: string };
  cricketSetup?: any;
  matchConfig?: { maxOvers?: number };
  status: string;
  winnerId?: string;
  result?: { marginOfVictory?: string };
}

export interface LiveMatchSummary {
  _id: string;
  status: string;
  teams: { team1Name?: string; team2Name?: string };
  cricketLiveState?: { runs?: number; wickets?: number; completedOvers?: number; ballsInCurrentOver?: number; target?: number };
  matchConfig?: { maxOvers?: number };
}

export async function getMatch(matchId: string): Promise<CricketMatch> {
  const res = await API.get(`/sports/cricket/match/${matchId}`);
  return unwrap(res);
}

export async function getLiveState(matchId: string): Promise<LiveState | null> {
  const res = await API.get(`/sports/cricket/match/${matchId}/live`);
  return unwrap(res)?.liveState ?? null;
}

export async function getScorecard(matchId: string): Promise<Scorecard> {
  const res = await API.get(`/sports/cricket/match/${matchId}/scorecard`);
  return unwrap(res) || { innings1: null, innings2: null };
}

export async function getTournamentMatches(tournamentId: string): Promise<LiveMatchSummary[]> {
  const res = await API.get(`/sports/cricket/match/by-tournament/${tournamentId}`);
  return unwrap(res) || [];
}

// Resolve a match's sport via the GENERIC endpoints (the cricket match endpoint
// 404s for non-cricket matches — exactly the case the route's guard must catch).
export async function resolveMatchSport(matchId: string): Promise<string | null> {
  const matchRes = await API.get(`/matches/${matchId}`);
  const tournamentId = unwrap(matchRes)?.tournamentId;
  if (!tournamentId) return null;
  const tRes = await API.get(`/tournament/${tournamentId}`);
  return unwrap(tRes)?.sport ?? null;
}
