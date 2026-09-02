import type { BadmintonMatch, GameScore } from '@/api/badmintonMatch';

export interface Rally {
  side: 1 | 2;
  gameNumber: number;
  team1Score: number;
  team2Score: number;
}

/** The game being played — the last one on the sheet. */
export function currentGame(match: BadmintonMatch): GameScore | null {
  const games = match.gameScores || [];
  return games.length ? games[games.length - 1] : null;
}

/** Games already decided, per side. The game in progress has no winner yet. */
export function gamesWon(match: BadmintonMatch): { one: number; two: number } {
  const id1 = match.competitorType === 'team' ? match.teams?.team1Id : match.player1?.registrationId;
  let one = 0;
  let two = 0;
  for (const g of match.gameScores || []) {
    if (!g.winnerId) continue;
    if (String(g.winnerId) === String(id1)) one += 1;
    else two += 1;
  }
  return { one, two };
}

/**
 * Who won the last rally, derived by diffing two score sheets.
 *
 * The server stores no point log and no serving side, but in rally scoring the
 * side that won the previous rally serves — so a socket update is enough to
 * know both. A score that goes *down* is the organiser correcting a mistake,
 * not a rally won, so it reports nothing.
 */
export function rallyFrom(prev: GameScore[], next: GameScore[]): Rally | null {
  if (!prev.length || !next.length) return null;
  const latest = next[next.length - 1];
  const before = prev.find((g) => g.gameNumber === latest.gameNumber) ?? {
    gameNumber: latest.gameNumber,
    team1Score: 0,
    team2Score: 0,
  };

  const d1 = latest.team1Score - before.team1Score;
  const d2 = latest.team2Score - before.team2Score;
  if (d1 === d2) return null;
  if (d1 <= 0 && d2 <= 0) return null;

  return {
    side: d1 > d2 ? 1 : 2,
    gameNumber: latest.gameNumber,
    team1Score: latest.team1Score,
    team2Score: latest.team2Score,
  };
}

/** The strip under the scoreboard. */
export function matchLine(match: BadmintonMatch): string {
  if (match.status === 'completed') return 'Match complete';
  const game = currentGame(match);
  if (!game) return 'Not started';

  const { one, two } = gamesWon(match);
  const bestOf = match.matchConfig?.bestOf ?? 3;
  const decider = one === two && one === Math.floor(bestOf / 2);
  return decider ? `Game ${game.gameNumber} · decider` : `Game ${game.gameNumber}`;
}
