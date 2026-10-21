import type { QuickMatch } from '@/api/quickMatch';
import { colors } from '@/constants/theme';
import { initials, matchCard } from '@/lib/matchCard';
import { freeSlots, gamesWon, isHost } from '@/lib/quickMatchView';
import { SPORT_LABELS } from '@/lib/sports';

/** Status = dot + word (DESIGN §5.10). */
export const STATUS: Record<QuickMatch['status'], { label: string; color: string }> = {
  waiting: { label: 'Waiting for players', color: colors.accent },
  live: { label: 'Live', color: colors.text },
  completed: { label: 'Completed', color: colors.text3 },
  cancelled: { label: 'Cancelled', color: colors.text4 },
};

/** DESIGN §5.9: a vertical swipe past 28px scores; anything shorter (a tap) does nothing. */
export const SWIPE = 28;
export function swipeDelta(dy: number): 1 | -1 | 0 {
  return dy < -SWIPE ? 1 : dy > SWIPE ? -1 : 0;
}

/** "Badminton · Doubles · Best of 3 to 21 · Hosted by you" */
export function roomLine(m: QuickMatch, meId: string) {
  const card = matchCard(m, meId);
  const [rules, ...who] = card.line.split(' · ');
  const host = isHost(m, meId) ? 'Hosted by you' : who.join(' · ');
  return [SPORT_LABELS[m.sport] ?? m.sport, card.format, rules, host].filter(Boolean).join(' · ');
}

export interface RosterSlot {
  key: string;
  playerId?: string;
  initials: string;
  name: string;
  sub: string;
  claimed: boolean;
  removable: boolean;
}

/** The waiting room's sides. Only the host may remove a claimed player, never in a knockout (server rule). */
export function roster(m: QuickMatch, meId: string) {
  const host = isHost(m, meId);
  const canRemove = host && !m.knockoutId && (m.status === 'waiting' || m.status === 'live');
  return m.sides.map((side) => ({
    key: side.sideId,
    name: side.name,
    count: `${side.slots.filter((s) => s.playerId).length} of ${side.slots.length} claimed`,
    slots: side.slots.map((s): RosterSlot => {
      const isTheHost = !!s.playerId && s.playerId === m.hostId;
      return {
        key: s.slotId,
        playerId: s.playerId,
        initials: initials(s.displayName),
        name: s.displayName,
        sub: isTheHost ? (s.playerId === meId ? 'Host · you' : 'Host') : s.playerId === meId ? 'You' : s.playerId ? 'Claimed' : 'Waiting to claim with the code',
        claimed: !!s.playerId,
        removable: canRemove && !!s.playerId && !isTheHost,
      };
    }),
  }));
}

/** Career credit is written only for slots with a playerId; guest spots earn nothing. */
export function waitingNote(m: QuickMatch, meId: string) {
  if (!isHost(m, meId)) {
    const host = m.sides.flatMap((s) => s.slots).find((s) => s.playerId === m.hostId)?.displayName;
    return host ? `Waiting for ${host} to start the match.` : 'Waiting for the host to start the match.';
  }
  return freeSlots(m).length
    ? 'You can start now. Unclaimed spots play as guests and earn no career stats.'
    : "Everyone's in. Start when you're ready.";
}

export function finishedGames(m: QuickMatch) {
  return (m.gameScores ?? []).filter((g) => g.winnerSideId).map((g) => ({ n: g.gameNumber, score: `${g.side1Score}–${g.side2Score}` }));
}

export function resultSummary(m: QuickMatch) {
  const won = gamesWon(m);
  const winner = m.outcome === 'side1' ? 0 : m.outcome === 'side2' ? 1 : -1;
  const headline = winner < 0
    ? (m.outcome === 'tied' ? 'Tied' : 'No result')
    : `${m.sides[winner].name} win ${Math.max(won.side1, won.side2)}–${Math.min(won.side1, won.side2)}`;
  const slots = m.sides.flatMap((s) => s.slots);
  const claimed = slots.filter((s) => s.playerId).length;
  const guests = slots.filter((s) => !s.playerId).map((s) => s.displayName);
  const credit = `Result added to the careers of the ${claimed} claimed ${claimed === 1 ? 'player' : 'players'}.`;
  const guestLine = guests.length === 1 ? ` ${guests[0]}'s guest spot earns nothing.` : guests.length ? ` Guest spots earn nothing: ${guests.join(', ')}.` : '';
  return { headline, note: credit + guestLine };
}
