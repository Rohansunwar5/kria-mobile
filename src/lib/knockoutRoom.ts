import type { KnockoutFixture, KnockoutPlayer, QuickKnockout } from '@/api/quickKnockout';
import type { QuickMatch } from '@/api/quickMatch';
import { colors } from '@/constants/theme';
import type { BracketColumn, BracketRow } from '@/lib/bracket';
import { gamesWon } from '@/lib/quickMatchView';
import { bracketColumns, entrantName, isKnockoutHost, isPlayable } from '@/lib/quickKnockoutView';
import { SPORT_LABELS } from '@/lib/sports';

/** Status = dot + word. A drawn knockout is still `waiting` on the server. */
export function koStatus(k: QuickKnockout) {
  if (k.status === 'waiting') return { label: k.entrants.length ? 'Drawn · not started' : 'Waiting for players', color: colors.accent };
  if (k.status === 'live') return { label: 'Live', color: colors.text };
  if (k.status === 'completed') return { label: 'Completed', color: colors.text3 };
  return { label: 'Cancelled', color: colors.text4 };
}

export const hostName = (k: QuickKnockout) => k.players.find((p) => p.playerId === k.hostId)?.displayName;

/** How each match is played: "One game to 21", "Best of 3 to 11", "6 overs". */
export function koRules(k: QuickKnockout) {
  const cfg = k.matchConfig;
  if (k.sport === 'cricket') return `${cfg.maxOvers ?? '?'} overs`;
  return `${(cfg.bestOf ?? 1) === 1 ? 'One game' : `Best of ${cfg.bestOf}`} to ${cfg.pointsToWin ?? 21}`;
}

/** "Badminton · Doubles · One game to 21 · Hosted by you" / "Cricket · 4 a side · 6 overs · 3 teams · 5 players" */
export function koLine(k: QuickKnockout, meId: string) {
  const cfg = k.matchConfig;
  const format = k.sport === 'cricket'
    ? [`${cfg.playersPerTeam ?? '?'} a side`, koRules(k), `${k.teams?.length ?? 0} teams`]
    : [k.format === 'doubles' ? 'Doubles' : 'Singles', koRules(k)];
  const host = isKnockoutHost(k, meId) ? 'Hosted by you' : hostName(k) ? `Hosted by ${hostName(k)}` : '';
  const tail = k.status === 'waiting' && !k.entrants.length ? host : `${k.players.length} ${k.players.length === 1 ? 'player' : 'players'}`;
  return [SPORT_LABELS[k.sport] ?? k.sport, ...format, tail].filter(Boolean).join(' · ');
}

/** "Semi-Final" → "Semi-final": DESIGN §4.2, no title-case headings. */
export const roundLabel = (name: string) => name.charAt(0) + name.slice(1).toLowerCase();

/** "Semi-Final" → "SF", "Round of 16" → "R16", "Final" → "F". */
export function roundAbbr(name: string) {
  const of = /Round of (\d+)/i.exec(name);
  if (of) return `R${of[1]}`;
  return name.split(/[\s-]+/).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/**
 * What one slot of a fixture shows. Winners feed forward: round r position p
 * takes round r−1 positions 2p (top) and 2p+1 (bottom), as the server's reconcile does.
 */
export function slotName(k: QuickKnockout, f: KnockoutFixture, side: 'A' | 'B'): { name: string; open: boolean } {
  const id = side === 'A' ? f.entrantA : f.entrantB;
  if (id) return { name: entrantName(k, id), open: false };
  if (side === 'B' && f.bye) return { name: 'Bye', open: true };
  if (f.round === 1) return { name: '—', open: true };
  const from = 2 * f.position + (side === 'A' ? 0 : 1);
  return { name: `Winner of ${roundAbbr(k.roundNames[f.round - 2] ?? '')} ${from + 1}`, open: true };
}

/** The entrant this player plays in, once drawn. */
export function myEntrant(k: QuickKnockout, meId: string) {
  const key = k.players.find((p) => p.playerId === meId)?.playerKey;
  return key ? k.entrants.find((e) => e.playerKeys.includes(key))?.entrantId : undefined;
}

/** Your match that is ready to play now (has a match, no winner). */
export function myPlayableFixture(k: QuickKnockout, meId: string) {
  const mine = myEntrant(k, meId);
  return mine ? k.fixtures.find((f) => isPlayable(f) && (f.entrantA === mine || f.entrantB === mine)) : undefined;
}

/** One person's line in the room. */
export function playerSub(k: QuickKnockout, p: KnockoutPlayer, meId: string) {
  if (p.playerId && p.playerId === k.hostId) return p.playerId === meId ? 'Host · you' : 'Host';
  if (p.playerId && p.playerId === meId) return 'You';
  if (p.playerId) return 'Joined';
  return isKnockoutHost(k, meId) ? 'Guest · can claim with the code' : 'Guest';
}

/** A finished fixture's score per entrant, read from its match: points for one game, games for more, runs/wickets for cricket. */
export function fixtureScores(m: QuickMatch, f: KnockoutFixture): [string, string] | null {
  if (m.status !== 'completed') return null;
  const of = (entrantId?: string) => {
    if (!entrantId) return '';
    if (m.sport === 'cricket') {
      const inn = (m.inningsScores ?? []).find((i) => i.battingSideId === entrantId);
      return inn ? `${inn.runs}/${inn.wickets}` : '';
    }
    const side = m.sides.findIndex((s) => s.sideId === entrantId);
    if (side < 0) return '';
    if ((m.matchConfig?.bestOf ?? 1) === 1) {
      const g = m.gameScores?.[0];
      return g ? String(side === 0 ? g.side1Score : g.side2Score) : '';
    }
    const won = gamesWon(m);
    return String(side === 0 ? won.side1 : won.side2);
  };
  return [of(f.entrantA), of(f.entrantB)];
}

/** The quick-knockout room's bracket as neutral columns: no header, one score per row, a "Live" badge on playable fixtures while live. */
export function knockoutColumns(k: QuickKnockout, meId: string, scores: Record<string, [string, string]>): BracketColumn[] {
  const mine = myEntrant(k, meId);
  return bracketColumns(k).map((col) => ({
    title: roundLabel(col.name),
    cards: col.fixtures.map((f) => {
      const row = (side: 'A' | 'B'): BracketRow => {
        const id = side === 'A' ? f.entrantA : f.bye ? undefined : f.entrantB;
        const slot = slotName(k, f, side);
        const lost = !!f.winnerEntrantId && !!id && f.winnerEntrantId !== id;
        const v = scores[f.fixtureId]?.[side === 'A' ? 0 : 1];
        return { name: slot.name, scores: v ? [{ v, strong: !lost }] : [], won: !!f.winnerEntrantId && f.winnerEntrantId === id, lost, open: slot.open };
      };
      return {
        id: f.fixtureId,
        live: k.status === 'live' && isPlayable(f),
        mine: !!mine && (f.entrantA === mine || f.entrantB === mine),
        openId: f.quickMatchId,
        rows: [row('A'), row('B')] as [BracketRow, BracketRow],
      };
    }),
  }));
}

/** Cricket: what the move sheet says under each team. */
export function teamLine(count: number, cap: number, here: boolean) {
  return `${count} / ${cap}${here ? ' · here now' : count >= cap ? ' · full' : ''}`;
}
