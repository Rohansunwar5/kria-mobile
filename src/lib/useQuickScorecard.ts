import { useEffect, useState } from 'react';
import type { Scorecard } from '@/api/cricketMatch';
import { getQuickScorecard, type QuickMatch } from '@/api/quickMatch';

/**
 * A cricket quick match's batting and bowling cards, read again whenever the
 * score moves. Every delivery and every undo changes a part of the key, and
 * `useQuickMatch` already receives each one as a `quick:update` push. A failed
 * read keeps the last card: the score band reads `liveState` regardless.
 */
export function useQuickScorecard(match: QuickMatch | null): Scorecard | null {
  const [card, setCard] = useState<Scorecard | null>(null);
  const id = match?._id;
  const live = match?.liveState;
  const key = match && match.sport === 'cricket' && match.status !== 'waiting'
    ? [match.status, live?.currentInnings, live?.runs, live?.wickets, live?.completedOvers, live?.ballsInCurrentOver].join(':')
    : null;

  useEffect(() => {
    if (!id || key === null) return;
    let alive = true;
    getQuickScorecard(id).then((next) => { if (alive) setCard(next); }).catch(() => undefined);
    return () => { alive = false; };
  }, [id, key]);

  return card;
}
