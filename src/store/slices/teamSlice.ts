import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '@/api/axios';

export interface Team {
  _id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  owner: { name: string; phone: string; email?: string };
  captainId?: string;
  whatsappGroupLink?: string;
  tournamentId: string;
  budget: number;
  initialBudget: number;
  spent: number;
  remainingBudget: number;
  isActive: boolean;
  playersCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface TeamState {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TeamState = { teams: [], isLoading: false, error: null };

const extractError = (err: any) =>
  err.response?.data?.message || err.response?.data?.error || err.message || 'Something went wrong';

export const fetchTournamentTeams = createAsyncThunk(
  'team/fetchTournamentTeams',
  async (tournamentId: string, { rejectWithValue }) => {
    try {
      const response = await API.get(`/tournaments/${tournamentId}/teams`);
      return response.data?.data?.data || response.data?.data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    clearTeamError: (state) => { state.error = null; },
    clearTeams: (state) => { state.teams = []; },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchTournamentTeams.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(fetchTournamentTeams.fulfilled, (state, action) => {
      state.isLoading = false;
      state.teams = Array.isArray(action.payload) ? action.payload : [];
    });
    builder.addCase(fetchTournamentTeams.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
  },
});

export const { clearTeamError, clearTeams } = teamSlice.actions;
export default teamSlice.reducer;
