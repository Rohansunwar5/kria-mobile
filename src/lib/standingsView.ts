import type { LeaderboardEntry } from '@/api/leaderboard';
import type { Match } from '@/api/match';
import type { GroupStandings, SubMatch, Tie, TieDetail } from '@/api/teamLeague';
import type { CategoryStatus, TournamentCategory } from '@/api/tournaments';
import { roundLabel } from '@/lib/knockoutRoom';
import { dayDate } from '@/lib/matchCard';
import { sideName } from '@/lib/tournamentBracket';

export interface TableRow { key: string; rank: number; name: string; sub?: string; p: number; w: number; l: number; d?: number; pts?: number; mine: boolean }
export type TableKind = 'players' | 'teams' | 'teamLeague';

export function tableKind(c: TournamentCategory): TableKind {
  if (c.bracketType === 'team_league') return 'teamLeague';
  return c.matchType === 'team' || c.sport === 'cricket' ? 'teams' : 'players';
}

export function playerTable(entries: LeaderboardEntry[], myRegIds: string[]): TableRow[] {
  return entries.map((e, i) => ({
    key: e._id, rank: e.rank ?? i + 1, name: e.playerName, sub: e.teamName || undefined,
    p: e.matchesPlayed, w: e.matchesWon, l: e.matchesPlayed - e.matchesWon, pts: e.totalPointsScored,
    mine: myRegIds.includes(e._id),
  }));
}

/** A completed match nobody won: a cricket tie ends with no winnerId ('by_score'), an organiser-settled one says 'tie', team leagues 'draw'. */
const level = (m: Match) => !m.winnerId || m.winReason === 'tie' || m.winReason === 'draw';

export function teamTable(matches: Match[], myTeamId?: string): TableRow[] {
  const t = new Map<string, TableRow>();
  const get = (id: string, name: string) => {
    if (!t.has(id)) t.set(id, { key: id, rank: 0, name, p: 0, w: 0, l: 0, d: 0, mine: !!myTeamId && id === myTeamId });
    return t.get(id)!;
  };
  for (const m of matches) {
    if (m.status !== 'completed' || !m.teams?.team1Id || !m.teams?.team2Id) continue;
    const a = get(m.teams.team1Id, m.teams.team1Name);
    const b = get(m.teams.team2Id, m.teams.team2Name);
    a.p++; b.p++;
    if (level(m)) { a.d!++; b.d!++; }
    else if (m.winnerId === a.key) { a.w++; b.l++; }
    else if (m.winnerId === b.key) { b.w++; a.l++; }
  }
  return [...t.values()]
    .sort((x, y) => y.w - x.w || x.l - y.l || x.name.localeCompare(y.name))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export function teamLeagueTable(s: GroupStandings, myTeamId?: string): TableRow[] {
  return s.standings.map((e, i) => ({
    key: e.teamId, rank: i + 1, name: e.teamName, p: e.played, w: e.won, l: e.lost, d: e.drawn, pts: e.points,
    mine: !!myTeamId && e.teamId === myTeamId,
  }));
}

export function ruleLine(c: TournamentCategory, kind: TableKind): string {
  if (kind === 'players') return 'Ranked by points scored, then point difference';
  if (kind === 'teams') return 'Ranked by wins';
  const t = c.teamLeagueConfig;
  return `Win ${t?.pointsForWin ?? 2} · Draw ${t?.pointsForDraw ?? 1} · Loss ${t?.pointsForLoss ?? 0} points`;
}

const date = (m: Match) => m.schedule?.date ?? '';
const court = (m: Match) => (m.schedule?.court ? `Court ${m.schedule.court}` : '');

export function resultRows(matches: Match[]) {
  return matches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => (date(b) || '').localeCompare(date(a) || '') || b.matchNumber - a.matchNumber)
    .map((m) => {
      const isTeam = !m.player1 && !m.player2;
      const id1 = isTeam ? m.teams?.team1Id : m.player1?.registrationId;
      const draw = level(m);
      const cricket = m.matchConfig?.maxOvers != null;
      const w: 1 | 2 = !draw && m.winnerId !== id1 && m.winnerId === (isTeam ? m.teams?.team2Id : m.player2?.registrationId) ? 2 : 1;
      const [ws, ls] = w === 1 ? [m.result?.team1Summary, m.result?.team2Summary] : [m.result?.team2Summary, m.result?.team1Summary];
      const score = cricket
        ? [ws, ls].filter(Boolean).join(' v ')
        : (m.gameScores ?? []).map((g) => (w === 1 ? `${g.team1Score}-${g.team2Score}` : `${g.team2Score}-${g.team1Score}`)).join(', ');
      return {
        key: m._id, winner: sideName(m, w), loser: sideName(m, w === 1 ? 2 : 1), score,
        ...(draw ? { draw: true } : {}),
        ...(draw && cricket ? { tie: true } : {}),
        meta: [roundLabel(m.bracketRound), court(m)].filter(Boolean).join(' · '),
      };
    });
}

export function comingUp(matches: Match[]) {
  return matches
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => (date(a) || '~').localeCompare(date(b) || '~') || a.matchNumber - b.matchNumber)
    .map((m) => ({
      key: m._id, a: sideName(m, 1), b: sideName(m, 2),
      meta: [m.schedule?.date ? dayDate(m.schedule.date) : '', m.schedule?.time ?? ''].filter(Boolean).join(' · '),
    }));
}

export function tieRow(t: Tie) {
  return {
    key: t._id, a: t.teams.team1Name, b: t.teams.team2Name,
    score: `${t.team1SubWins ?? 0}–${t.team2SubWins ?? 0}`,
    status: t.status === 'completed' ? 'Final' : tieLive(t, t.subMatches ?? []) ? 'Live' : `${t.completedCount ?? 0} of ${t.subMatchCount ?? 0} played`,
  };
}

// The server never marks a tie in progress, only its sub-matches.
const tieLive = (t: Tie, subs: { status: string }[]) => t.status === 'in_progress' || subs.some((m) => m.status === 'in_progress');

/** Empty Matches view: title and line by category status. */
export function emptyCopy(status: CategoryStatus): [string, string] {
  if (status === 'setup' || status === 'registration') return ['Draw after entries close', 'The organiser draws the matches once entries close.'];
  if (status === 'auction') return ['Draw after the auction', 'Matches appear once the auction is done.'];
  return ['No matches yet', 'Matches appear here once the organiser schedules them.'];
}

const SUB_STATUS: Record<string, string> = { completed: 'Final', in_progress: 'Live', walkover: 'Walkover', cancelled: 'Cancelled', scheduled: 'Not started' };

/** Tie screen (previewed): score in sub-matches won, one row per sub-match with each side's players and games. */
export function tieView({ tie, subMatches, lineups }: TieDetail & { tie: Tie }) {
  const { team1Id, team2Id } = tie.teams;
  const done = subMatches.filter((m) => m.status === 'completed');
  // The tie list's rule (server teamLeague.service): a side wins by its team id or its player's registration id.
  const winner = (m: SubMatch): 0 | 1 | 2 =>
    !m.winnerId ? 0
    : m.winnerId === team1Id || m.winnerId === m.player1?.registrationId ? 1
    : m.winnerId === team2Id || m.winnerId === m.player2?.registrationId ? 2 : 0;
  const wins = (s: 1 | 2) => done.filter((m) => winner(m) === s).length;
  const played = `${done.length} of ${subMatches.length} played`;
  const players = (team: string, slot: number, fallback?: string) =>
    lineups.find((l) => l.teamId === team)?.assignments.find((a) => a.slotNumber === slot)?.playerNames.join(' / ') || fallback || 'Not named yet';
  return {
    score: `${wins(1)}–${wins(2)}`,
    status: tie.status === 'completed' ? `Final · ${played}` : tieLive(tie, subMatches) ? `Live · ${played}` : played,
    subs: [...subMatches].sort((a, b) => a.subMatchSlotNumber - b.subMatchSlotNumber).map((m) => {
      const side = (s: 1 | 2) => {
        const team = s === 1 ? team1Id : team2Id;
        return {
          name: players(team, m.subMatchSlotNumber, (s === 1 ? m.player1 : m.player2)?.name),
          won: winner(m) === s,
          lost: !!m.winnerId && winner(m) !== s,
          games: (m.gameScores ?? []).map((g) => {
            const [a, b] = s === 1 ? [g.team1Score, g.team2Score] : [g.team2Score, g.team1Score];
            return { v: String(a), strong: a > b };
          }),
        };
      };
      return { key: m._id, slot: m.slotLabel ?? `Slot ${m.subMatchSlotNumber}`, status: SUB_STATUS[m.status] ?? '', live: m.status === 'in_progress', sides: [side(1), side(2)] };
    }),
  };
}
