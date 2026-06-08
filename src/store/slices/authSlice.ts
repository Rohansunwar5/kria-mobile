import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '@/api/axios';
import * as storage from '@/lib/storage';

export type Role = 'player';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  gender?: string;
  dateOfBirth?: string;
  sport?: string;
  location?: string;
  profileImage?: string;
  titles?: string[];
  [key: string]: any;
}

export interface PlayerStats {
  totalTournaments: number;
  pendingCount: number;
  approvedCount: number;
  auctionedCount: number;
  totalMatchesPlayed: number;
  totalMatchesWon: number;
  totalPointsContributed: number;
  totalEarnings: number;
  highestBid: number;
}

interface AuthState {
  user: User | null;
  role: Role | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  registrationStep: number;
  registrationEmail: string | null;
  playerStats: PlayerStats | null;
  statsLoading: boolean;
  bootstrapped: boolean;
  pendingOnboarding: boolean;
}

const initialState: AuthState = {
  user: null,
  role: null,
  accessToken: null,
  isLoading: false,
  error: null,
  registrationStep: 1,
  registrationEmail: null,
  playerStats: null,
  statsLoading: false,
  bootstrapped: false,
  pendingOnboarding: false,
};

const extractError = (err: any) =>
  err.response?.data?.message ||
  err.response?.data?.error ||
  err.message ||
  'Something went wrong';

export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    const token = await storage.getToken();
    const role = await storage.getRole();
    if (!token || !role) return { token: null, role: null, profile: null };
    try {
      const response = await API.get(`/${role}/auth/profile`);
      const profile = response.data?.data?.data || response.data?.data;
      return { token, role, profile };
    } catch (error) {
      await storage.clearAuth();
      return rejectWithValue(extractError(error));
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const role = state.auth.role;
      if (!role) return rejectWithValue('No role found');
      const response = await API.get(`/${role}/auth/profile`);
      return response.data?.data?.data || response.data?.data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ data }: { data: any }, { rejectWithValue }) => {
    try {
      const role: Role = 'player';
      const response = await API.post(`/${role}/auth/login`, data);
      const responseData = response.data?.data?.data || response.data?.data;
      if (responseData?.accessToken) await storage.setAuth(responseData.accessToken, role);
      return { role, responseData };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const requestLoginOtp = createAsyncThunk(
  'auth/requestLoginOtp',
  async ({ data }: { data: { email: string } }, { rejectWithValue }) => {
    try {
      await API.post(`/player/auth/login/otp`, data);
      return true;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const verifyLoginOtp = createAsyncThunk(
  'auth/verifyLoginOtp',
  async ({ data }: { data: { email: string; otp: string } }, { rejectWithValue }) => {
    try {
      const role: Role = 'player';
      const response = await API.post(`/${role}/auth/login/otp/verify`, data);
      const responseData = response.data?.data?.data || response.data?.data;
      if (responseData?.accessToken) await storage.setAuth(responseData.accessToken, role);
      return { role, responseData };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ data }: { data: any }, { rejectWithValue }) => {
    try {
      await API.post(`/player/auth/register`, data);
      return { email: data.email };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ data }: { data: { email: string; otp: string } }, { rejectWithValue }) => {
    try {
      await API.post(`/player/auth/verify-otp`, data);
      return true;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const setPassword = createAsyncThunk(
  'auth/setPassword',
  async ({ data }: { data: { email: string; password: string } }, { rejectWithValue }) => {
    try {
      const role: Role = 'player';
      const response = await API.post(`/${role}/auth/set-password`, data);
      const responseData = response.data?.data?.data || response.data?.data;
      if (responseData?.accessToken) await storage.setAuth(responseData.accessToken, role);
      return { role, responseData };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const fetchPlayerStats = createAsyncThunk(
  'auth/fetchPlayerStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await API.get('/player/auth/stats');
      return response.data?.data?.data || response.data?.data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (
    {
      data,
    }: {
      data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        gender?: string;
        dateOfBirth?: string;
        sport?: string;
        location?: string;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await API.patch(`/player/auth/profile`, data);
      return response.data?.data?.data || response.data?.data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const uploadPlayerProfileImage = createAsyncThunk(
  'auth/uploadPlayerProfileImage',
  async (asset: { uri: string; name: string; type: string }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      // React Native FormData takes a { uri, name, type } object, not a web File.
      formData.append('image', asset as any);
      const response = await API.put('/player/auth/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (data) => data,
      });
      return response.data?.data?.data || response.data?.data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await storage.clearAuth();
});

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetRegistration: (state) => {
      state.registrationStep = 1;
      state.registrationEmail = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    beginOnboardingHandoff: (state) => {
      state.pendingOnboarding = true;
    },
    endOnboardingHandoff: (state) => {
      state.pendingOnboarding = false;
    },
  },
  extraReducers: (builder) => {
    const handleLoginSuccess = (state: AuthState, action: any) => {
      state.isLoading = false;
      const { role, responseData } = action.payload;
      state.role = role;
      state.user = responseData.user || responseData.player || responseData.organizer;
      state.accessToken = responseData.accessToken;
    };

    builder.addCase(loginUser.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(loginUser.fulfilled, handleLoginSuccess);
    builder.addCase(loginUser.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder.addCase(requestLoginOtp.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(requestLoginOtp.fulfilled, (state) => { state.isLoading = false; });
    builder.addCase(requestLoginOtp.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder.addCase(verifyLoginOtp.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(verifyLoginOtp.fulfilled, handleLoginSuccess);
    builder.addCase(verifyLoginOtp.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder.addCase(registerUser.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.registrationStep = 2;
      state.registrationEmail = action.payload.email;
    });
    builder.addCase(registerUser.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder.addCase(verifyOtp.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(verifyOtp.fulfilled, (state) => { state.isLoading = false; state.registrationStep = 3; });
    builder.addCase(verifyOtp.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder.addCase(setPassword.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(setPassword.fulfilled, (state, action) => {
      handleLoginSuccess(state, action);
      state.registrationStep = 1;
      state.registrationEmail = null;
    });
    builder.addCase(setPassword.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder.addCase(updateProfile.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(updateProfile.fulfilled, (state, action) => {
      state.isLoading = false;
      if (state.user && action.payload) state.user = { ...state.user, ...action.payload };
    });
    builder.addCase(updateProfile.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder.addCase(uploadPlayerProfileImage.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(uploadPlayerProfileImage.fulfilled, (state, action) => {
      state.isLoading = false;
      if (state.user && action.payload) state.user = { ...state.user, ...action.payload };
    });
    builder.addCase(uploadPlayerProfileImage.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });

    builder.addCase(fetchPlayerStats.pending, (state) => { state.statsLoading = true; });
    builder.addCase(fetchPlayerStats.fulfilled, (state, action) => { state.statsLoading = false; state.playerStats = action.payload; });
    builder.addCase(fetchPlayerStats.rejected, (state) => { state.statsLoading = false; });

    builder.addCase(fetchProfile.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(fetchProfile.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload?.user || action.payload?.player || action.payload;
    });
    builder.addCase(fetchProfile.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
      state.user = null;
      state.role = null;
      state.accessToken = null;
    });

    builder.addCase(bootstrapAuth.fulfilled, (state, action) => {
      state.bootstrapped = true;
      const { token, role, profile } = action.payload as any;
      if (token && role && profile) {
        state.accessToken = token;
        state.role = role;
        state.user = profile?.user || profile?.player || profile;
      }
    });
    builder.addCase(bootstrapAuth.rejected, (state) => {
      state.bootstrapped = true;
      state.user = null;
      state.role = null;
      state.accessToken = null;
    });

    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.role = null;
      state.accessToken = null;
    });
  },
});

export const { resetRegistration, clearError, beginOnboardingHandoff, endOnboardingHandoff } = authSlice.actions;

export default authSlice.reducer;
