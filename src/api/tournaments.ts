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
  filters: { sport?: string; city?: string; status?: string; q?: string } = {},
): Promise<Tournament[]> {
  const params = { limit, ...filters };
  const payload = unwrap<{ tournaments: Tournament[] } | null>(await API.get('/tournament', { params }));
  return visibleTournaments(payload?.tournaments ?? []);
}

export type TournamentStatus = 'draft' | 'registration_open' | 'registration_closed' | 'auction_in_progress' | 'ongoing' | 'completed' | 'cancelled';
export type CategoryStatus = 'setup' | 'registration' | 'auction' | 'groups_configured' | 'bracket_configured' | 'ongoing' | 'completed';
export type BracketType = 'league' | 'knockout' | 'hybrid' | 'team_league';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

export interface TournamentAward { title: string; categoryId?: string; badge?: string; player?: { firstName?: string; lastName?: string } | null; team?: { name?: string } | null }

export interface TournamentDetail {
  _id: string; name: string; description?: string; sport: string; sports?: string[]; bannerImage?: string;
  startDate: string; endDate: string; registrationDeadline: string; status: TournamentStatus; teamsCount?: number;
  venue: { name: string; address?: string; city: string; coordinates?: { lat: number; lng: number } };
  awards?: TournamentAward[];
  /** Who is running it, for the "Organised by" row. Display fields only. */
  organizer?: { name: string; logo?: string; verified: boolean };
  /** Lowest entry fee across its categories; 0 when one of them is free. */
  minFee?: number;
}

export interface TournamentCategory {
  _id: string; tournamentId: string; name: string; sport?: string; status: CategoryStatus;
  gender?: 'male' | 'female' | 'mixed'; ageGroup?: { min?: number; max?: number; label?: string };
  matchType?: 'singles' | 'doubles' | 'team'; bracketType?: BracketType;
  matchFormat?: { bestOf?: number; pointsPerGame?: number; tieBreakPoints?: number };
  cricketConfig?: { overs?: number; playersPerTeam?: number };
  teamLeagueConfig?: { topNPerGroup?: number; pointsForWin?: number; pointsForLoss?: number; pointsForDraw?: number };
  maxRegistrations?: number; registrationFee: number; isPaidRegistration: boolean;
}

export interface TournamentTeam { _id: string; name: string; logo?: string; owner?: { name?: string }; budget: number; initialBudget: number; whatsappGroupLink?: string }

export interface MyEntry {
  _id: string; tournamentId: string; categoryId: string; createdAt: string; teamId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'auctioned' | 'assigned' | 'withdrawn';
  auctionData?: { basePrice?: number; soldPrice?: number };
  /** Filled in by the server so the list needs no per-tournament lookups. */
  tournament?: { _id: string; name: string; sport?: string; startDate?: string; endDate?: string; status?: TournamentStatus } | null;
  category?: { _id: string; name: string; sport?: string; matchType?: string; registrationFee?: number; isPaidRegistration?: boolean } | null;
  payment?: { status: string; amount: number; razorpayOrderId?: string; createdAt?: string } | null;
}

export interface EntryProfile { firstName: string; lastName: string; age: number; gender: 'male' | 'female'; phone: string; photo?: string; skillLevel: SkillLevel }

export async function getTournament(id: string): Promise<TournamentDetail> {
  return unwrap<TournamentDetail>(await API.get(`/tournament/${id}`));
}

export async function getTournamentCategories(id: string): Promise<TournamentCategory[]> {
  const list = unwrap<TournamentCategory[] | null>(await API.get(`/tournaments/${id}/categories`));
  return Array.isArray(list) ? list : [];
}

export async function getTournamentTeams(id: string): Promise<TournamentTeam[]> {
  const list = unwrap<TournamentTeam[] | null>(await API.get(`/tournaments/${id}/teams`));
  return Array.isArray(list) ? list : [];
}

export async function getMyEntries(): Promise<MyEntry[]> {
  const list = unwrap<MyEntry[] | null>(await API.get('/registrations/my-registrations'));
  return Array.isArray(list) ? list : [];
}

export async function registerEntry(body: { tournamentId: string; categoryId: string; profile: EntryProfile }): Promise<void> {
  await API.post('/registrations/register', body);
}

export async function withdrawEntry(id: string): Promise<void> {
  try {
    await API.post(`/registrations/${id}/withdraw`);
  } catch (e) {
    throw new Error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not withdraw this entry.');
  }
}
