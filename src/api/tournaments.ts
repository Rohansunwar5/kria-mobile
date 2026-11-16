import API from './axios';
import { unwrap } from './unwrap';
import { visibleTournaments } from '@/lib/homePortal';

/** A row of the public tournament list (`GET /tournament`). */
export interface Tournament {
  _id: string;
  name: string;
  description?: string;
  sport: string;
  /** Multisport tournaments list every sport here; `sport` above is the
   *  legacy single field and defaults to badminton. */
  sports?: string[];
  bannerImage?: string;
  startDate: string;
  endDate: string;
  venue: {
    name: string;
    address?: string;
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  registrationDeadline: string;
  status: string;
  createdBy: string;
  staffIds: string[];
  settings: {
    maxTeams: number;
    defaultBudget: number;
    auctionType: string;
    allowLateRegistration: boolean;
  };
  isActive: boolean;
  updatedAt: string;
  registeredPlayersCount?: number;
  teamsCount?: number;
  /** Lowest entry fee across the tournament's categories; 0 when one of
   *  them is free. Absent when the tournament has no categories yet. */
  minFee?: number;
  /** Public display details of whoever is running it. */
  organizer?: { name: string; logo?: string; verified: boolean };
  awards?: any[];
}

/**
 * The newest organiser tournaments for home's preview row — the server sorts by
 * start date, newest first. Deliberately not the Redux `fetchPublicTournaments`
 * thunk, which writes the shared slot the Events tab reads: the Events tab's
 * filters must not reach home, nor home's reach Events. Explore passes a
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

/** How many public events each filter option would show; each count applies the other filters (SERVER-GAPS #7). */
export interface EventFacets {
  sports: Record<string, number>;
  statuses: Record<string, number>;
  cities: { city: string; count: number }[];
}

/** Bookmark or un-bookmark an event; answers with the player's saved list. */
export async function setTournamentSaved(id: string, saved: boolean): Promise<string[]> {
  const res = saved ? await API.post(`/player/auth/saved-tournaments/${id}`) : await API.delete(`/player/auth/saved-tournaments/${id}`);
  return unwrap<{ savedTournaments: string[] } | null>(res)?.savedTournaments ?? [];
}

export async function getEventFacets(filters: { sport?: string; city?: string; status?: string; q?: string } = {}): Promise<EventFacets> {
  const payload = unwrap<EventFacets | null>(await API.get('/tournament/facets', { params: filters }));
  return payload ?? { sports: {}, statuses: {}, cities: [] };
}

export type TournamentStatus ='draft' | 'registration_open' | 'registration_closed' | 'auction_in_progress' | 'ongoing' | 'completed' | 'cancelled';
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
  /** Groups, then a knockout: entries per group, and how many go through from each. */
  hybridConfig?: { leagueSize?: number; topN?: number };
  maxRegistrations?: number; registrationFee: number; isPaidRegistration: boolean;
}

export interface TournamentTeam { _id: string; name: string; shortName?: string; logo?: string; owner?: { name?: string }; budget: number; initialBudget: number; whatsappGroupLink?: string }

export interface MyEntry {
  _id: string; tournamentId: string; categoryId: string; createdAt: string; teamId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'auctioned' | 'assigned' | 'withdrawn';
  auctionData?: { basePrice?: number; soldPrice?: number };
  /** Filled in by the server so the list needs no per-tournament lookups. */
  tournament?: { _id: string; name: string; sport?: string; startDate?: string; endDate?: string; status?: TournamentStatus } | null;
  category?: { _id: string; name: string; sport?: string; matchType?: string; registrationFee?: number; isPaidRegistration?: boolean } | null;
  payment?: { status: string; amount: number; razorpayOrderId?: string; createdAt?: string } | null;
  /** Doubles: the teammate the organiser paired this entry with. */
  partnerRegistrationId?: string;
  partner?: { registrationId: string; name: string } | null;
  /** When the status changed (SERVER-GAPS #18); absent on entries from before. */
  approvedAt?: string; rejectedAt?: string; withdrawnAt?: string;
  /** The organiser's optional reason, on a rejected entry. */
  rejectionReason?: string;
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
