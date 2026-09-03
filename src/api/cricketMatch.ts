import API from './axios';

const unwrap = (res: any) => res.data?.data?.data || res.data?.data;

/** `cricketLiveState.matchStatus` — the client used to test only for
 *  'completed', which left innings breaks looking like a frozen scoreboard. */
export type MatchStatus = 'awaiting_start' | 'innings1' | 'innings_break' | 'innings2' | 'completed';

export interface LiveState {
  runs: number;
  wickets: number;
  completedOvers: number;
  ballsInCurrentOver: number;
  currentInnings: 1 | 2;
  target?: number;
  battingTeamId?: string;
  bowlingTeamId?: string;
  strikerId?: string;
  nonStrikerId?: string;
  currentBowlerId?: string;
  extras?: { wides: number; noBalls: number; byes: number; legByes: number };
  matchStatus?: MatchStatus;
  /** First-innings score, so a chase can show `167/8 (20.0)` rather than
   *  reverse-engineering it from `target`. */
  innings1Summary?: { runs: number; wickets: number; completedOvers: number; ballsInCurrentOver: number };
  /** The scoreboard has legitimately stopped — say so instead of looking stale. */
  nextBatsmanNeeded?: boolean;
  nextBowlerNeeded?: boolean;
  /** { [registrationId]: { completedOvers, ballsInCurrentOver } } */
  bowlerStats?: Record<string, { completedOvers?: number; ballsInCurrentOver?: number }>;
}

export interface Dismissal {
  type: string;
  bowlerId?: string;
  bowlerName?: string;
  fielderId?: string;
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
  batterId?: string;
  batterName: string;
  dismissalLine: string;
  /** The stand that this wicket ended. */
  partnershipRuns: number;
  partnershipBalls: number;
}

/** The pair currently at the crease, straight from the server. */
export interface PartnershipInfo {
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  runs: number;
  balls: number;
}

/** Every stand in the innings, `unbroken` marking the one still going. */
export interface PartnershipRecord {
  wicketNumber: number;
  batter1Id: string;
  batter1Name: string;
  batter2Id: string;
  batter2Name: string;
  runs: number;
  balls: number;
  unbroken: boolean;
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
  currentPartnership: PartnershipInfo | null;
  fallOfWickets: FallOfWicket[];
  partnerships: PartnershipRecord[];
}

export interface Scorecard {
  innings1: InningsScorecard | null;
  innings2: InningsScorecard | null;
}

export interface PlayerSlot { registrationId: string; playerId?: string; name?: string }

export interface TeamLineup {
  teamId: string;
  startingXI: PlayerSlot[];
  reserves: PlayerSlot[];
  lineupSet: boolean;
}

export interface CricketSetup {
  toss?: { winnerTeamId?: string; decision?: 'bat' | 'bowl'; recorded?: boolean };
  team1Lineup?: TeamLineup;
  team2Lineup?: TeamLineup;
  setupComplete?: boolean;
}

export interface CricketMatch {
  _id: string;
  tournamentId: string;
  bracketRound?: string;
  matchNumber?: number;
  teams: { team1Id: string; team2Id: string; team1Name: string; team2Name: string };
  cricketSetup?: CricketSetup;
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

/** Team colours and logos for a tournament, keyed by team id. Non-critical —
 *  an empty map just means the neutral treatment everywhere. */
export interface TeamBrand { name: string; logo?: string; primaryColor?: string }

export async function getTeamBrands(tournamentId: string): Promise<Record<string, TeamBrand>> {
  try {
    const res = await API.get(`/tournaments/${tournamentId}/teams`);
    const teams = unwrap(res) || [];
    const map: Record<string, TeamBrand> = {};
    (teams as any[]).forEach((t) => {
      map[String(t._id)] = { name: t.name, logo: t.logo, primaryColor: t.primaryColor };
    });
    return map;
  } catch {
    return {};
  }
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
