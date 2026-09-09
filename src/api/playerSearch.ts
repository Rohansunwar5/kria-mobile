import API from './axios';

/**
 * What the server will return, and all it will return — id, name and avatar.
 * Never email or phone; `playerSearch.service.ts` projects them away and a
 * server test asserts their absence.
 */
export interface PlayerHit {
  _id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

function unwrap(res: unknown): unknown {
  const lvl1 = (res as { data?: unknown } | null)?.data;
  const lvl2 = (lvl1 as { data?: unknown } | null)?.data;
  const lvl3 = (lvl2 as { data?: unknown } | null)?.data;
  return lvl3 ?? lvl2 ?? null;
}

/**
 * Players matching a name prefix. The server requires 3 characters and 422s
 * anything shorter; a search box fires on every keystroke, so a rejected query
 * resolves to an empty list rather than surfacing an error the user cannot act
 * on.
 */
export async function searchPlayers(q: string): Promise<PlayerHit[]> {
  try {
    const payload = unwrap(await API.get('/player/search', { params: { q } })) as PlayerHit[] | null;
    return payload ?? [];
  } catch {
    return [];
  }
}
