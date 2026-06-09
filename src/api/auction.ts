import API from './axios';

export interface AuctionPlayer {
  _id: string;
  profile: { firstName: string; lastName: string; age: number; gender: string; skillLevel: string; photo?: string };
  auctionData: { basePrice: number };
  careerStats?: { matchesPlayed: number; matchesWon: number; pointsContributed: number; tournamentsPlayed: number };
}

export interface AuctionTeam {
  _id: string;
  name: string;
  logo?: string;
  budget: number;
  initialBudget: number;
  playersCount: number;
  totalSpent: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface AuctionBid { teamId: string; teamName: string; amount: number; timestamp: string }

export interface AuctionStatus {
  _id: string;
  status: 'not_started' | 'in_progress' | 'paused' | 'sold' | 'completed';
  currentPlayerIndex: number;
  totalPlayers: number;
  logsCount: number;
  lastSoldResult?: { playerName: string; teamName: string; teamColor: string; soldPrice: number; timestamp: string };
  liveBid: {
    currentPrice: number;
    highestBidderId: string;
    highestBidderName: string;
    bidHistory: AuctionBid[];
    tiedTeams: string[];
    tieBreakerActive: boolean;
    spinWinnerId: string | null;
    spinStartedAt: string | null;
  };
  settings: { minBidIncrement: number; bidDurationSeconds: number; hardLimit: number };
  unsoldCount: number;
  rotationCount: number;
}

export interface AuctionSoldLog {
  _id: string;
  registrationId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  finalPrice: number;
  auctionType: string;
  recordedBy: string;
  timestamp: string;
}

export interface AuctionStatusResponse {
  auction: AuctionStatus;
  currentPlayer: AuctionPlayer | null;
  teams: AuctionTeam[];
  category?: { _id: string; name: string } | null;
  tournament?: { _id: string; name: string } | null;
}

export interface SoldLogResponse {
  logs: AuctionSoldLog[];
  totalSold: number;
  totalRevenue: number;
}

const unwrap = (res: any) => res.data?.data?.data || res.data?.data;

export async function getAuctionStatus(tournamentId: string, categoryId: string): Promise<AuctionStatusResponse> {
  const res = await API.get(`/auction/${tournamentId}/${categoryId}/status`);
  return unwrap(res);
}

export async function getAuctionSoldLog(tournamentId: string, categoryId: string): Promise<SoldLogResponse> {
  const res = await API.get(`/auction/${tournamentId}/${categoryId}/sold-log`);
  return unwrap(res) || { logs: [], totalSold: 0, totalRevenue: 0 };
}
