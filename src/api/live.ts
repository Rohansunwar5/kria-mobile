import API from './axios';
import { unwrap } from './unwrap';

interface LiveItemBase {
  matchId: string;
  sport: string;
  title?: string;
  scoreline?: string;
  startedAt: string;
}

/**
 * Mirrors the server's union. `joinCode` is deliberately absent and must stay
 * absent: the feed is public, and the six-character code is what lets someone
 * JOIN a quick match rather than merely watch it.
 */
export type LiveItem =
  | (LiveItemBase & {
      kind: 'tournament';
      tournamentId: string;
      /** The row's heading. Optional: a match whose tournament was deleted
       *  still appears, headed by its sport instead of crashing the list. */
      tournamentName?: string;
      categoryId: string;
      categoryName?: string;
      round?: string;
    })
  | (LiveItemBase & { kind: 'quick' });

export interface LiveFeed {
  total: number;
  items: LiveItem[];
}

export async function fetchLiveFeed(): Promise<LiveFeed> {
  const payload = unwrap<LiveFeed | null>(await API.get('/live'));
  return payload ?? { total: 0, items: [] };
}
