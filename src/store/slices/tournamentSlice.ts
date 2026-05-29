import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '@/api/axios';

// --- TYPES ---

export interface Tournament {
    _id: string;
    name: string;
    description?: string;
    sport: string;
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
    awards?: any[];
}

interface TournamentState {
    publicTournaments: Tournament[];
    currentTournament: Tournament | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: TournamentState = {
    publicTournaments: [],
    currentTournament: null,
    isLoading: false,
    error: null,
};

// --- ERROR HELPER ---
const extractError = (err: any) => {
    return err.response?.data?.message || err.response?.data?.error || err.message || 'Something went wrong';
};

// --- THUNKS ---

export const fetchPublicTournaments = createAsyncThunk(
    'tournament/fetchPublicTournaments',
    async (params: { status?: string, sport?: string, city?: string, limit?: number } | undefined, { rejectWithValue }) => {
        try {
            let url = '/tournament';
            if (params) {
                const queryParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                    if (value) queryParams.append(key, value.toString());
                });
                if (queryParams.toString()) url += `?${queryParams.toString()}`;
            }
            const response = await API.get(url);
            const payload = response.data?.data?.data || response.data?.data || {};
            const data = payload.tournaments || (Array.isArray(payload) ? payload : []);
            return data;
        } catch (error) {
            return rejectWithValue(extractError(error));
        }
    }
);

export const fetchTournament = createAsyncThunk(
    'tournament/fetchTournament',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await API.get(`/tournament/${id}`);
            const data = response.data?.data?.data || response.data?.data;
            return data;
        } catch (error) {
            return rejectWithValue(extractError(error));
        }
    }
);

// --- SLICE ---

const tournamentSlice = createSlice({
    name: 'tournament',
    initialState,
    reducers: {
        clearTournamentError: (state) => {
            state.error = null;
        },
        clearCurrentTournament: (state) => {
            state.currentTournament = null;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchPublicTournaments.pending, (state) => { state.isLoading = true; state.error = null; });
        builder.addCase(fetchPublicTournaments.fulfilled, (state, action) => {
            state.isLoading = false;
            state.publicTournaments = Array.isArray(action.payload) ? action.payload : [];
        });
        builder.addCase(fetchPublicTournaments.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

        builder.addCase(fetchTournament.pending, (state) => { state.isLoading = true; state.error = null; });
        builder.addCase(fetchTournament.fulfilled, (state, action) => {
            state.isLoading = false;
            state.currentTournament = action.payload;
        });
        builder.addCase(fetchTournament.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
    },
});

export const { clearTournamentError, clearCurrentTournament } = tournamentSlice.actions;
export default tournamentSlice.reducer;
