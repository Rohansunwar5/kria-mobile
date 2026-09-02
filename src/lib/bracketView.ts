import { Match } from '@/api/match';

export interface Competitor {
  id: string;
  name: string;
  teamName: string;
  logo?: string;
  isTBD: boolean;
  isBye: boolean;
  score?: number;
  isWinner: boolean;
}

export interface VisibleRound {
  name: string;
  matches: Match[];
}

export interface Standing {
  id: string;
  name: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  points: number;
}

function extract(
  match: Match,
  slot: 1 | 2,
  competitorType: 'player' | 'team',
  logoById?: Record<string, string | undefined>
) {
  const player = slot === 1 ? match.player1 : match.player2;
  if (competitorType === 'player' && player) {
    return {
      id: player.registrationId,
      name: player.name,
      teamName: player.teamName,
      logo: logoById?.[player.teamId],
      isTBD: player.registrationId === 'TBD',
      isBye: player.name === 'TBD' && player.registrationId === 'TBD',
    };
  }
  const name = (slot === 1 ? match.teams?.team1Name : match.teams?.team2Name) || 'TBD';
  const id = (slot === 1 ? match.teams?.team1Id : match.teams?.team2Id) || '';
  return { id, name, teamName: '', logo: logoById?.[id], isTBD: name === 'TBD', isBye: name === 'BYE' };
}

export function getCompetitors(
  match: Match,
  competitorType: 'player' | 'team',
  logoById?: Record<string, string | undefined>
): { c1: Competitor; c2: Competitor } {
  const done = match.status === 'completed' || match.status === 'walkover';
  const b1 = extract(match, 1, competitorType, logoById);
  const b2 = extract(match, 2, competitorType, logoById);
  return {
    c1: { ...b1, score: match.result?.team1Total, isWinner: done && !!match.winnerId && match.winnerId === b1.id },
    c2: { ...b2, score: match.result?.team2Total, isWinner: done && !!match.winnerId && match.winnerId === b2.id },
  };
}

export function sortedRoundNames(rounds: Record<string, Match[]>): string[] {
  return Object.keys(rounds).sort((a, b) => {
    const aM = rounds[a]?.[0];
    const bM = rounds[b]?.[0];
    return (aM?.roundNumber || 0) - (bM?.roundNumber || 0);
  });
}

export function visibleRounds(rounds: Record<string, Match[]>): VisibleRound[] {
  return sortedRoundNames(rounds)
    .map((name) => ({
      name,
      matches: (rounds[name] || [])
        .filter((m) => !(m.status === 'walkover' && m.winReason === 'bye'))
        .sort((a, b) => (a.positionInRound ?? a.matchNumber) - (b.positionInRound ?? b.matchNumber)),
    }))
    .filter((r) => r.matches.length > 0);
}

export function leagueStandings(matches: Match[], competitorType: 'player' | 'team'): Standing[] {
  const table: Record<string, Standing> = {};
  const ensure = (id: string, name: string, teamName: string) => {
    if (!table[id]) table[id] = { id, name, teamName, played: 0, won: 0, lost: 0, points: 0 };
  };
  matches.forEach((m) => {
    const { c1, c2 } = getCompetitors(m, competitorType);
    ensure(c1.id, c1.name, c1.teamName);
    ensure(c2.id, c2.name, c2.teamName);
    if (m.status === 'completed') {
      table[c1.id].played++;
      table[c2.id].played++;
      if (m.winnerId === c1.id) {
        table[c1.id].won++;
        table[c1.id].points += 2;
        table[c2.id].lost++;
      } else if (m.winnerId === c2.id) {
        table[c2.id].won++;
        table[c2.id].points += 2;
        table[c1.id].lost++;
      }
    }
  });
  return Object.values(table).sort((a, b) => b.points - a.points || b.won - a.won);
}

/**
 * Which sport a category is, inferred from its matches.
 *
 * Cricket and badminton matches live in separate collections and neither
 * carries a reliable `sportType`, but their match configs differ: cricket is
 * overs-based, badminton is points-based. This is what decides whether a card
 * links to a scoreboard.
 */
export function categorySport(matches: Match[]): 'cricket' | 'badminton' | undefined {
  if (matches.some((m) => m.matchConfig?.maxOvers != null)) return 'cricket';
  if (matches.some((m) => m.matchConfig?.bestOf != null || m.matchConfig?.pointsToWin != null)) return 'badminton';
  if (matches.some((m) => (m.gameScores?.length ?? 0) > 0)) return 'badminton';
  return undefined;
}

/** Whether a match card opens a scoreboard, and which one it is showing. */
export function scoreboardLink(match: Match, sport?: string): 'live' | 'result' | null {
  // Badminton and cricket are the two sports with a mobile scoreboard.
  if (sport !== 'cricket' && sport !== 'badminton') return null;
  if (match.status === 'in_progress') return 'live';
  if (match.status === 'completed' || match.status === 'walkover') return 'result';
  return null;
}
