import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '@/api/axios';
import type { EntryResult } from '@/api/profileApi';

// --- TYPES ---

export interface Category {
    _id: string;
    tournamentId: string;
    name: string;
    description?: string;
    minAge?: number;
    maxAge?: number;
    gender: 'Male' | 'Female' | 'Mixed' | 'Any';
    maxParticipants: number;
    maxRegistrations?: number;
    isPaidRegistration: boolean;
    registrationFee: number;
    // Server enum: ICategoryStatus in server/src/models/category.model.ts. NOT the
    // tournament enum — a category never says 'registration_open'.
    status: 'setup' | 'registration' | 'auction' | 'groups_configured' | 'bracket_configured' | 'ongoing' | 'completed';
    bracketType?: 'knockout' | 'round_robin' | 'group_knockout' | 'league' | 'hybrid' | 'team_league';
    teamLeagueConfig?: {
        subTeamSlots: { slotNumber: number; matchType: string; label: string }[];
        numberOfGroups: number;
        topNPerGroup: number;
        pointsForWin?: number;
        pointsForLoss?: number;
        pointsForDraw?: number;
    };
    matchFormat?: string;
    /** A category carries its own sport — in a multisport tournament this, not
     *  `tournament.sport`, decides which scoreboard and leaderboard apply. */
    sport?: string;
    isActive: boolean;
}

export interface PlayerStats {
    battingStyle?: string;
    bowlingStyle?: string;
    role?: string;
    previousTeams?: string[];
    matchesPlayed?: number;
}

export interface TournamentDetails {
    _id: string;
    name: string;
    sport: string;
    startDate: string;
    endDate: string;
    status: string;
    venue?: { name: string; city: string };
}

export interface Registration {
    _id: string;
    tournamentId: string;
    categoryId: string;
    playerId: string;
    status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'assigned' | 'auctioned';
    paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
    playerStats?: PlayerStats;
    teamId?: string;
    auctionData?: {
        basePrice?: number;
        soldPrice?: number;
        auctionedAt?: string;
    };
    stats?: {
        matchesPlayed: number;
        matchesWon: number;
        pointsContributed: number;
    };
    categoryDetails?: Category;
    tournamentDetails?: TournamentDetails;
    profile?: {
        firstName: string;
        lastName: string;
        age: number;
        gender: string;
        phone: string;
        skillLevel?: string;
    };
}

export interface TournamentHistoryEntry {
    _id: string;
    status: string;
    profile?: { skillLevel?: string; age?: number; gender?: string };
    auctionData?: { basePrice?: number; soldPrice?: number; auctionedAt?: string };
    stats?: { matchesPlayed: number; matchesWon: number; pointsContributed: number };
    tournament?: { _id: string; name: string; sport: string; startDate: string; endDate: string; status: string; venue?: { name: string; city: string } };
    category?: { _id: string; name: string; gender: string };
    // The server selects `logo` too (playerAuth.service _buildTournamentHistory).
    team?: { _id: string; name: string; primaryColor?: string; logo?: string };
    result?: EntryResult;
    createdAt: string;
}

interface RegistrationState {
    categories: Category[];
    categoryRegistrations: Registration[];
    tournamentHistory: TournamentHistoryEntry[];
    historyLoading: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: RegistrationState = {
    categories: [],
    categoryRegistrations: [],
    tournamentHistory: [],
    historyLoading: false,
    isLoading: false,
    error: null,
};

// --- ERROR HELPER ---
const extractError = (err: any) => {
    return err.response?.data?.message || err.response?.data?.error || err.message || 'Something went wrong';
};

// --- THUNKS ---

// Fetch categories for a specific tournament (Public)
export const fetchTournamentCategories = createAsyncThunk(
    'registration/fetchCategories',
    async (tournamentId: string, { rejectWithValue }) => {
        try {
            const response = await API.get(`/tournaments/${tournamentId}/categories`);
            // Assuming standard API response wrapper { success, data: { data: [...] } }
            const data = response.data?.data?.data || response.data?.data || [];
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return rejectWithValue(extractError(error));
        }
    }
);

// Fetch player tournament history with enriched team/tournament/category details
export const fetchPlayerTournamentHistory = createAsyncThunk(
    'registration/fetchTournamentHistory',
    async (_, { rejectWithValue }) => {
        try {
            const response = await API.get('/player/auth/tournament-history');
            const data = response.data?.data?.data || response.data?.data || {};
            return Array.isArray(data.history) ? data.history : [];
        } catch (error) {
            return rejectWithValue(extractError(error));
        }
    }
);

// Fetch registrations by category (Public/Player View)
export const fetchRegistrationsByCategory = createAsyncThunk(
    'registration/fetchByCategory',
    async (categoryId: string, { rejectWithValue }) => {
        try {
            const response = await API.get(`/registrations/categories/${categoryId}`);
            const data = response.data?.data?.data || response.data?.data || [];
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return rejectWithValue(extractError(error));
        }
    }
);

// --- SLICE ---

const registrationSlice = createSlice({
    name: 'registration',
    initialState,
    reducers: {
        clearRegistrationError: (state) => {
            state.error = null;
        },
        clearCategories: (state) => {
            state.categories = [];
        }
    },
    extraReducers: (builder) => {
        // FETCH CATEGORIES
        builder.addCase(fetchTournamentCategories.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchTournamentCategories.fulfilled, (state, action) => {
            state.isLoading = false;
            state.categories = action.payload;
        });
        builder.addCase(fetchTournamentCategories.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        });

        // TOURNAMENT HISTORY
        builder.addCase(fetchPlayerTournamentHistory.pending, (state) => {
            state.historyLoading = true;
            state.error = null;
        });
        builder.addCase(fetchPlayerTournamentHistory.fulfilled, (state, action) => {
            state.historyLoading = false;
            state.tournamentHistory = action.payload;
        });
        builder.addCase(fetchPlayerTournamentHistory.rejected, (state, action) => {
            state.historyLoading = false;
            state.error = action.payload as string;
        });

        // FETCH BY CATEGORY
        builder.addCase(fetchRegistrationsByCategory.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchRegistrationsByCategory.fulfilled, (state, action) => {
            state.isLoading = false;
            state.categoryRegistrations = action.payload;
        });
        builder.addCase(fetchRegistrationsByCategory.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        });
    },
});

export const { clearRegistrationError, clearCategories } = registrationSlice.actions;
export default registrationSlice.reducer;
