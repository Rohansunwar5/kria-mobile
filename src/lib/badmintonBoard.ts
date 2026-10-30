import type { BadmintonMatch } from '@/api/badmintonMatch';
import { roundLabel } from '@/lib/knockoutRoom';

export interface RallyConfig { bestOf: number; pointsToWin: number; cap: number }
export function rallyConfig(m: Pick<BadmintonMatch, 'matchConfig'>): RallyConfig {
  return { bestOf: m.matchConfig?.bestOf ?? 3, pointsToWin: m.matchConfig?.pointsToWin ?? 21, cap: 30 };
}

/** The next point wins this game for `own` (server rule: 2-point lead at pointsToWin, or the cap). */
export function wouldWin(own: number, opp: number, c: RallyConfig): boolean {
  return own + 1 >= c.cap ? own + 1 > opp : own + 1 >= c.pointsToWin && own + 1 - opp >= 2;
}

type Side = { name: string; team?: string; teamId?: string };
export function sides(m: BadmintonMatch): [Side, Side] {
  if (m.player1 || m.player2) {
    const s = (p: BadmintonMatch['player1']): Side => ({ name: p?.name ?? '', team: p?.teamName, teamId: p?.teamId });
    return [s(m.player1), s(m.player2)];
  }
  return [{ name: m.teams?.team1Name ?? '' }, { name: m.teams?.team2Name ?? '' }];
}

const sideIds = (m: BadmintonMatch) =>
  m.player1 || m.player2
    ? [m.player1?.registrationId, m.player2?.registrationId]
    : [m.teams?.team1Id, m.teams?.team2Id];

export interface BoardRow { name: string; team?: string; teamId?: string; done: { v: number; won: boolean }[]; points: number | null; leading: boolean; lost: boolean }
export interface BoardView {
  top: string;
  format: string;
  rows: [BoardRow, BoardRow];
  chip: string | null;
  games: { n: number; score: string; winner: string; live: boolean }[];
  over: boolean;
}

export function badmintonBoard(m: BadmintonMatch): BoardView {
  const c = rallyConfig(m);
  const full = sides(m);
  const isPlayer = !!(m.player1 || m.player2);
  const short = full.map((s) => (isPlayer && !/ [&/] /.test(s.name) ? s.name.trim().split(/\s+/).pop() ?? '' : s.name));
  const ids = sideIds(m);
  const over = m.status === 'completed';
  const all = m.gameScores ?? [];
  const last = all[all.length - 1];
  const live = !over && last && !last.winnerId ? last : undefined;
  const finished = all.filter((x) => x !== live);
  const winnerIdx = (x: (typeof all)[number]) =>
    x.winnerId ? ids.indexOf(x.winnerId) : x.team1Score === x.team2Score ? -1 : x.team1Score > x.team2Score ? 0 : 1;
  const won = [0, 1].map((i) => finished.filter((x) => winnerIdx(x) === i).length);
  const cur = live ?? { gameNumber: finished.length + 1, team1Score: 0, team2Score: 0 };
  const pts = [cur.team1Score, cur.team2Score];

  let chip: string | null = null;
  if (!over) {
    const gp = [0, 1].map((i) => wouldWin(pts[i], pts[1 - i], c));
    const mp = [0, 1].map((i) => gp[i] && won[i] >= Math.ceil(c.bestOf / 2) - 1);
    if (gp[0] && gp[1]) chip = mp[0] || mp[1] ? 'Next point wins the match' : 'Next point wins the game';
    else if (gp[0] || gp[1]) {
      const i = gp[0] ? 0 : 1;
      chip = `${mp[i] ? 'Match point' : 'Game point'} · ${short[i]}`;
    }
  }

  let wi = m.winnerId ? ids.indexOf(m.winnerId) : -1;
  if (wi < 0) wi = won[0] === won[1] ? -1 : won[0] > won[1] ? 0 : 1;
  const top = over
    ? wi < 0 ? `Games ${won[0]}–${won[1]}` : `${short[wi]} won ${won[wi]}–${won[1 - wi]}`
    : `Game ${cur.gameNumber} · Games ${won[0]}–${won[1]}`;

  const row = (i: 0 | 1): BoardRow => ({
    ...full[i],
    done: finished.map((x) => ({ v: i ? x.team2Score : x.team1Score, won: winnerIdx(x) === i })),
    points: over ? null : pts[i],
    leading: !over && pts[i] > pts[1 - i],
    lost: over && wi >= 0 && wi !== i,
  });

  const games = [...finished, ...(live ? [live] : [])].map((x) => ({
    n: x.gameNumber,
    score: `${x.team1Score}–${x.team2Score}`,
    winner: x === live ? 'In play' : short[winnerIdx(x)] ?? '',
    live: x === live,
  }));

  return { top, format: `Best of ${c.bestOf} · to ${c.pointsToWin}`, rows: [row(0), row(1)], chip, games, over };
}

export function roundTitle(
  m: Pick<BadmintonMatch, 'bracketRound' | 'positionInRound' | 'tieId' | 'teams' | 'slotLabel' | 'subMatchSlotNumber'>,
): string {
  if (m.tieId) {
    const slot = m.slotLabel ?? (m.subMatchSlotNumber != null ? `Match ${m.subMatchSlotNumber}` : '');
    return [`${m.teams?.team1Name ?? ''} vs ${m.teams?.team2Name ?? ''}`, slot].filter(Boolean).join(' · ');
  }
  const label = roundLabel(m.bracketRound);
  return m.positionInRound != null && !/^(final|league)$/i.test(m.bracketRound) ? `${label} ${m.positionInRound + 1}` : label;
}

/** A feed row's round, numbered as roundTitle numbers a match ("Quarter-final 4"). */
export function feedRound(round?: string, positionInRound?: number): string | undefined {
  if (!round) return undefined;
  if (round.includes('-') && !/-final$/i.test(round)) return 'Team league';
  const label = roundLabel(round);
  return positionInRound != null && !/^(final|league)$/i.test(round) ? `${label} ${positionInRound + 1}` : label;
}

export function parseScoreline(s?: string): { a: number; b: number }[] {
  return (s ?? '').split(',').flatMap((p) => {
    const x = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(p);
    return x ? [{ a: +x[1], b: +x[2] }] : [];
  });
}
