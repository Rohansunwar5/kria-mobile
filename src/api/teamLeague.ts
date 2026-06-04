import API from './axios';

const unwrap = (res: any) => res.data?.data?.data || res.data?.data;

export interface Group {
  _id: string;
  groupName: string;
  teamIds: string[];
}

export interface StandingEntry {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  subMatchesWon: number;
  subMatchesLost: number;
}

export interface GroupStandings {
  group: { _id: string; groupName: string };
  completedTies: number;
  totalTies: number;
  standings: StandingEntry[];
}

export interface Tie {
  _id: string;
  teams: { team1Id: string; team1Name: string; team2Id: string; team2Name: string };
  status: string;
  winnerId?: string;
  completedCount?: number;
  subMatchCount?: number;
}

export interface SubMatch {
  _id: string;
  subMatchSlotNumber: number;
  slotLabel?: string;
  status: string;
  winnerId?: string;
  player1?: { name: string; teamId: string };
  player2?: { name: string; teamId: string };
  gameScores?: { team1Score: number; team2Score: number }[];
}

export interface Lineup {
  _id: string;
  teamId: string;
  assignments: { slotNumber: number; playerNames: string[] }[];
}

export interface TieDetail {
  tie: Tie | null;
  subMatches: SubMatch[];
  lineups: Lineup[];
}

export async function getGroups(categoryId: string, stage?: number): Promise<Group[]> {
  const res = await API.get(`/sports/badminton/team-league/${categoryId}/groups`, { params: stage ? { stageNumber: stage } : {} });
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function getGroupStandings(categoryId: string, stage?: number): Promise<GroupStandings[]> {
  const res = await API.get(`/sports/badminton/team-league/${categoryId}/standings`, { params: stage ? { stageNumber: stage } : {} });
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function getTiesByGroup(groupId: string): Promise<Tie[]> {
  const res = await API.get(`/sports/badminton/team-league/groups/${groupId}/ties`);
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function getTieDetails(tieId: string): Promise<TieDetail> {
  const res = await API.get(`/sports/badminton/team-league/ties/${tieId}`);
  const data = unwrap(res);
  return {
    tie: data?.tie ?? null,
    subMatches: Array.isArray(data?.subMatches) ? data.subMatches : [],
    lineups: Array.isArray(data?.lineups) ? data.lineups : [],
  };
}
