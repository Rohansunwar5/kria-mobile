import API from './axios';
import { unwrap } from './unwrap';
import { toQuery, type Filters } from '@/lib/tournamentFilters';
import { visibleTournaments } from '@/lib/homePortal';
import type { Tournament } from '@/store/slices/tournamentSlice';

export interface TournamentHit {
  _id: string;
  name: string;
  sport: string;
  status: string;
  venue?: { name?: string; city?: string };
}

interface TournamentListPayload {
  tournaments: TournamentHit[];
  pagination?: { total?: number };
}

/**
 * Deliberately NOT the Redux `fetchPublicTournaments` thunk. That writes into
 * a single shared `publicTournaments` slot the Events tab reads, so a search
 * typed here would silently re-filter the Events list and the user
 * would find it changed with no explanation.
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

/**
 * The newest organiser tournaments for home's preview row — the server sorts by
 * start date, newest first. Also not the Redux thunk, for the same reason as
 * above: the Events tab's filters must not reach home. Explore passes a
 * `status` for its open-for-entry row; Events passes its own filters for the
 * "elsewhere" row.
 */
export async function latestTournaments(
  limit = 10,
  filters: { sport?: string; city?: string; status?: string } = {},
): Promise<Tournament[]> {
  const params = { limit, ...filters };
  const payload = unwrap<{ tournaments: Tournament[] } | null>(await API.get('/tournament', { params }));
  return visibleTournaments(payload?.tournaments ?? []);
}
