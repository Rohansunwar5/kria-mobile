import type { QuickKnockout } from '@/api/quickKnockout';
import type { QuickMatch } from '@/api/quickMatch';
import type { Tournament } from '@/api/tournaments';

/**
 * What the events list actually shows: drafts and deactivated tournaments are
 * the organiser's, not the player's.
 */
export function visibleTournaments(tournaments: Tournament[]): Tournament[] {
  return tournaments.filter((t) => t.status !== 'draft' && t.isActive !== false);
}

/** A match in progress carries its knockout when it belongs to one, so the top
 *  card can say which knockout and round it is. */
export type InProgress =
  | { kind: 'match'; match: QuickMatch; knockout?: QuickKnockout }
  | { kind: 'knockout'; knockout: QuickKnockout };

/**
 * Whether scoring has begun: a point on the board, or for cricket a recorded
 * toss — from then on the scorer is working on this match.
 */
export function hasBegun(match: QuickMatch): boolean {
  if (match.sport === 'cricket') return Boolean(match.cricketSetup?.toss?.recorded);
  return (match.gameScores ?? []).some((g) => g.side1Score + g.side2Score > 0);
}

/**
 * Everything of yours still unfinished, most urgent first: anything being
 * played before anything still filling up, and at each stage a quick match
 * before a knockout, since the match is where a score is running. Home's hero
 * takes the first; the rest list under it, so nothing in progress drops off
 * home.
 *
 * A knockout creates every drawn match live at once, so for a knockout match
 * "live" only means "drawn". It joins in once scoring has begun, and while it
 * does it stands in for its knockout rather than listing beside it — the match
 * screen links back to the bracket.
 */
export function inProgress(matches: QuickMatch[], knockouts: QuickKnockout[]): InProgress[] {
  const shown = matches.filter((m) => !m.knockoutId || (m.status === 'live' && hasBegun(m)));
  const playing = new Set(shown.map((m) => m.knockoutId).filter(Boolean));
  const at = (status: 'live' | 'waiting'): InProgress[] => [
    ...shown
      .filter((m) => m.status === status)
      .map((match) => ({ kind: 'match' as const, match, knockout: knockouts.find((k) => k._id === match.knockoutId) })),
    ...knockouts
      .filter((k) => k.status === status && !playing.has(k._id))
      .map((knockout) => ({ kind: 'knockout' as const, knockout })),
  ];
  return [...at('live'), ...at('waiting')];
}
