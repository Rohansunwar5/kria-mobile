import API from './axios';
import { unwrap } from './unwrap';

/** One cricket innings: "118/6 (10.0)" is { runs 118, wickets 6, overs 10, balls 0 }. */
export interface InningsScore { runs: number; wickets: number; overs: number; balls: number }

interface LiveItemBase {
  matchId: string;
  sport: string;
  title?: string;
  /** The two side names, team 1 first. Read these, never split `title`: a name may contain " vs ". */
  sides?: [string, string];
  scoreline?: string;
  /** Cricket in play: each side's score in team order (null until it bats), and the chase (side 0 = team 1). */
  cricket?: {
    scores: [InningsScore | null, InningsScore | null];
    chase?: { side: 0 | 1; need: number; balls: number };
  };
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
      /** 0-based: "Quarter-final 4" is position 3. */
      positionInRound?: number;
      court?: string;
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
