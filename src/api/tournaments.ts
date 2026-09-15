import API from './axios';
import { unwrap } from './unwrap';
import { toQuery, type Filters } from '@/lib/tournamentFilters';

export interface TournamentHit {
  _id: string;
  name: string;
  sport: string;
  status: string;
  venue?: { city?: string };
}

interface TournamentListPayload {
  tournaments: TournamentHit[];
  pagination?: { total?: number };
}

/**
 * Deliberately NOT the Redux `fetchPublicTournaments` thunk. That writes into
 * a single shared `publicTournaments` slot the Home screen reads, so a search
 * typed here would silently re-filter Home's tournament strip and the user
 * would find Home changed with no explanation.
 *
 * A search 422s below three characters the same way player search does, and
 * resolves to an empty list rather than surfacing an error the user cannot act
 * on. Anything else rethrows — a dead server must not look like no results.
 */
export async function searchTournaments(q: string, filters?: Filters): Promise<TournamentHit[]> {
  try {
    const params = { ...(filters ? toQuery(filters) : {}), q };
    const payload = unwrap<TournamentListPayload | null>(await API.get('/tournament', { params }));
    return payload?.tournaments ?? [];
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 422) return [];
    throw err;
  }
}
