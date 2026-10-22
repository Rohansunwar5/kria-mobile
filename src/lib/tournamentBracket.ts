import type { Match } from '@/api/match';
import type { BracketCard, BracketColumn, BracketRow, BracketScore } from '@/lib/bracket';
import { roundAbbr, roundLabel } from '@/lib/knockoutRoom';
import { dayDate } from '@/lib/matchCard';

export interface Me { registrationIds: string[]; teamId?: string }
type Slot = 1 | 2;

const isTeam = (m: Match) => !m.player1 && !m.player2;
const isBye = (m: Match) => m.status === 'walkover' && m.winReason === 'bye';
const isCricket = (m: Match) => m.matchConfig?.maxOvers != null;
const isOpen = (name?: string) => !name || name === 'TBD';
const slotKey = (m: Match, slot: Slot) => `${isTeam(m) ? 'team' : 'player'}${slot}`;

const compName = (m: Match, slot: Slot) => (slot === 1 ? m.player1?.name : m.player2?.name);
/** Player name, or team name for team matches. */
export function sideName(m: Match, slot: Slot): string {
  return (isTeam(m) ? (slot === 1 ? m.teams?.team1Name : m.teams?.team2Name) : compName(m, slot)) ?? '';
}
const sideId = (m: Match, slot: Slot) =>
  isTeam(m) ? (slot === 1 ? m.teams?.team1Id : m.teams?.team2Id) : slot === 1 ? m.player1?.registrationId : m.player2?.registrationId;
const sideSub = (m: Match, slot: Slot) => (isTeam(m) ? undefined : (slot === 1 ? m.player1?.teamName : m.player2?.teamName) || undefined);

/** "Final" has no number; "Preliminary Round" reads "Prelim" here (the knockout room keeps "PR"). */
const abbr = (round: string) => (round === 'Preliminary Round' ? 'Prelim' : roundAbbr(round));
const label = (m: Match) => (m.bracketRound === 'Final' ? 'Final' : `${abbr(m.bracketRound)} ${(m.positionInRound ?? 0) + 1}`);

export function isMine(m: Match, me: Me): boolean {
  if (isTeam(m)) return !!me.teamId && (m.teams?.team1Id === me.teamId || m.teams?.team2Id === me.teamId);
  return [m.player1, m.player2].some((p) => !!p && me.registrationIds.includes(p.registrationId));
}

function header(m: Match): string {
  const court = m.schedule?.court ? `Court ${m.schedule.court}` : '';
  const parts =
    m.status === 'completed' ? ['Final score']
    : m.status === 'in_progress' ? ['Live', court]
    : isBye(m) ? ['Bye']
    : m.status === 'walkover' ? ['Walkover']
    : m.status === 'cancelled' ? ['Cancelled']
    : [m.schedule?.time ?? '', court];
  return [label(m), ...parts.filter(Boolean)].join(' · ');
}

function scores(m: Match, slot: Slot, won: boolean): BracketScore[] {
  if (isCricket(m)) {
    const v = slot === 1 ? m.result?.team1Summary : m.result?.team2Summary;
    return v ? [{ v, strong: won }] : [];
  }
  return (m.gameScores ?? []).map((g) => {
    const [mine, theirs] = slot === 1 ? [g.team1Score, g.team2Score] : [g.team2Score, g.team1Score];
    return { v: String(mine), strong: mine > theirs };
  });
}

function row(m: Match, slot: Slot, all: Match[]): BracketRow {
  const name = sideName(m, slot);
  const id = sideId(m, slot);
  // The team generator names a bye's empty side 'BYE' (server knockoutTeam.ts).
  const open = isOpen(name) || (isBye(m) && name === 'BYE');
  const won = !open && !!m.winnerId && m.winnerId === id;
  const lost = !open && !!m.winnerId && m.winnerId !== id;
  let shown = name;
  if (open) {
    const feeder = all.find((x) => x.nextMatchId === m._id && x.nextMatchSlot === slotKey(m, slot));
    shown = isBye(m) ? 'Bye' : feeder ? `Winner of ${label(feeder)}` : 'TBD';
  }
  return { name: shown, sub: open ? undefined : sideSub(m, slot), scores: scores(m, slot, won), won, lost, open };
}

/** Columns by round, cards by position (both ascending). */
export function bracketColumns(matches: Match[], me: Me): BracketColumn[] {
  const rounds = new Map<number, Match[]>();
  for (const m of matches) rounds.set(m.roundNumber ?? 0, [...(rounds.get(m.roundNumber ?? 0) ?? []), m]);
  return [...rounds.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, ms]) => ({
      title: roundLabel(ms[0].bracketRound),
      cards: ms
        .sort((a, b) => (a.positionInRound ?? 0) - (b.positionInRound ?? 0))
        .map((m): BracketCard => ({
          id: m._id,
          header: header(m),
          live: m.status === 'in_progress',
          mine: isMine(m, me),
          openId: m.status === 'in_progress' || m.status === 'completed' ? m._id : undefined,
          rows: [row(m, 1, matches), row(m, 2, matches)],
        })),
    }));
}

/** My live match, else my earliest scheduled one. */
export function myNextMatch(matches: Match[], me: Me): Match | undefined {
  const mine = matches.filter((m) => isMine(m, me));
  return (
    mine.find((m) => m.status === 'in_progress') ??
    mine
      .filter((m) => m.status === 'scheduled')
      .sort((a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0) || (a.schedule?.date ?? '~').localeCompare(b.schedule?.date ?? '~'))[0]
  );
}

function format(m: Match): string {
  const c = m.matchConfig;
  if (!c) return '';
  if (isCricket(m)) return `${c.maxOvers} overs`;
  if (c.pointsToWin == null) return '';
  return `${(c.bestOf ?? 1) === 1 ? 'One game' : `Best of ${c.bestOf}`} to ${c.pointsToWin}`;
}

/** `all` names an undecided opponent by its feeder ("Winner of SF 2"); with no feeder found it falls back to "TBD". */
export function nextMatchView(m: Match, me: Me, all: Match[] = [m]) {
  const side = (slot: Slot) => { const r = row(m, slot, all); return { name: r.name, sub: r.sub }; };
  const round = roundLabel(m.bracketRound);
  return {
    header: `Your next match · ${m.bracketRound === 'Final' ? round : `${round} ${(m.positionInRound ?? 0) + 1}`}`,
    court: m.schedule?.court ? `Court ${m.schedule.court}` : undefined,
    sides: [side(1), side(2)] as [{ name: string; sub?: string }, { name: string; sub?: string }],
    when: [m.schedule?.date ? dayDate(m.schedule.date) : '', m.schedule?.time ?? '', format(m)].filter(Boolean).join(' · '),
  };
}

/** 2a CTA: "Your semi-final · 4:30 PM". */
export const nextMatchLabel = (m: Match) =>
  [`Your ${roundLabel(m.bracketRound).toLowerCase()}`, m.schedule?.time].filter(Boolean).join(' · ');

export const liveRound = (matches: Match[]) => matches.find((m) => m.status === 'in_progress')?.bracketRound;

export function champion(matches: Match[]): string | undefined {
  const f = matches.find((m) => m.bracketRound === 'Final' && !m.nextMatchId && m.status === 'completed' && m.winnerId);
  const slot = f && ([1, 2] as Slot[]).find((s) => sideId(f, s) === f.winnerId);
  return f && slot ? sideName(f, slot) : undefined;
}
