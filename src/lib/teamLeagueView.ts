import { GroupStandings, StandingEntry, SubMatch } from '@/api/teamLeague';

export interface OverallEntry {
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

export function aggregateOverall(perStageStandings: GroupStandings[][]): OverallEntry[] {
  const map: Record<string, OverallEntry> = {};
  for (const stage of perStageStandings) {
    for (const gs of stage) {
      for (const e of gs.standings || []) {
        if (!map[e.teamId]) {
          map[e.teamId] = { teamId: e.teamId, teamName: e.teamName, played: 0, won: 0, lost: 0, drawn: 0, points: 0, subMatchesWon: 0, subMatchesLost: 0 };
        }
        const t = map[e.teamId];
        t.played += e.played || 0;
        t.won += e.won || 0;
        t.lost += e.lost || 0;
        t.drawn += e.drawn || 0;
        t.points += e.points || 0;
        t.subMatchesWon += e.subMatchesWon || 0;
        t.subMatchesLost += e.subMatchesLost || 0;
      }
    }
  }
  return Object.values(map).sort(
    (a, b) => b.points - a.points || (b.subMatchesWon - b.subMatchesLost) - (a.subMatchesWon - a.subMatchesLost),
  );
}

export function detectChampion(stageStandings: GroupStandings[]): StandingEntry | null {
  if (stageStandings.length === 0) return null;
  const allComplete = stageStandings.every((gs) => gs.completedTies > 0 && gs.completedTies === gs.totalTies);
  const isFinal = stageStandings.length === 1 && (stageStandings[0]?.standings?.length || 0) <= 2;
  return isFinal && allComplete ? stageStandings[0]?.standings?.[0] ?? null : null;
}

export function tieSubScore(subMatches: SubMatch[], team1Id?: string, team2Id?: string): { t1: number; t2: number; hasScore: boolean } {
  const t1 = subMatches.filter((sm) => sm.status === 'completed' && sm.winnerId === team1Id).length;
  const t2 = subMatches.filter((sm) => sm.status === 'completed' && sm.winnerId === team2Id).length;
  return { t1, t2, hasScore: t1 + t2 > 0 };
}

export function subMatchView(sm: SubMatch): { done: boolean; p1Wins: boolean; p2Wins: boolean; gameScores: string[] } {
  const done = sm.status === 'completed';
  const p1Wins = done && !!sm.player1 && sm.winnerId === sm.player1.teamId;
  const p2Wins = done && !!sm.player2 && sm.winnerId === sm.player2.teamId;
  const gameScores = done && sm.gameScores ? sm.gameScores.map((g) => `${g.team1Score}–${g.team2Score}`) : [];
  return { done, p1Wins, p2Wins, gameScores };
}
