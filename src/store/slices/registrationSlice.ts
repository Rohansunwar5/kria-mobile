import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '@/api/axios';
import type { EntryResult } from '@/api/profileApi';

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
    tournamentHistory: TournamentHistoryEntry[];
    historyLoading: boolean;
    error: string | null;
}

const initialState: RegistrationState = {
    tournamentHistory: [],
    historyLoading: false,
    error: null,
};

const extractError = (err: any) => {
    return err.response?.data?.message || err.response?.data?.error || err.message || 'Something went wrong';
};

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

const registrationSlice = createSlice({
    name: 'registration',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
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
    },
});

export default registrationSlice.reducer;
