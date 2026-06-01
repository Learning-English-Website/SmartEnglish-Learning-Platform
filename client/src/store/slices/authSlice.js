import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../api/auth.api';

// ── Async Thunks ─────────────────────────────────────────────────────────────

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authAPI.getMe();
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to load user');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await authAPI.login({ email, password });
      return res.data?.user || res.user || res.data || res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ email, username, password }, { rejectWithValue }) => {
    try {
      const res = await authAPI.register({ email, username, password });
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Registration failed');
    }
  }
);

export const verifyEmailOtp = createAsyncThunk(
  'auth/verifyEmailOtp',
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const res = await authAPI.verifyEmailOtp({ email, otp });
      return res.data?.user || res.user || res.data || res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'OTP verification failed');
    }
  }
);

export const resendVerificationOtp = createAsyncThunk(
  'auth/resendVerificationOtp',
  async ({ email }, { rejectWithValue }) => {
    try {
      await authAPI.resendVerificationOtp({ email });
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to resend verification OTP');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore errors
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }, { rejectWithValue }) => {
    try {
      await authAPI.forgotPassword({ email });
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to send reset OTP');
    }
  }
);

export const resetPasswordOtp = createAsyncThunk(
  'auth/resetPasswordOtp',
  async ({ email, otp, newPassword }, { rejectWithValue }) => {
    try {
      await authAPI.resetPasswordOtp({ email, otp, newPassword });
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to reset password');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ username, avatar }, { rejectWithValue }) => {
    try {
      const res = await authAPI.updateProfile({ username, ...(avatar ? { avatar } : {}) });
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to update profile');
    }
  }
);

// ── Initial State ─────────────────────────────────────────────────────────────

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  requiresEmailVerification: false,
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.requiresEmailVerification = false;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // loadUser
    builder
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(loadUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      });

    // loginUser
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // registerUser
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        state.requiresEmailVerification = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // verifyEmailOtp
    builder
      .addCase(verifyEmailOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyEmailOtp.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
        state.requiresEmailVerification = false;
      })
      .addCase(verifyEmailOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // resendVerificationOtp
    builder
      .addCase(resendVerificationOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendVerificationOtp.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resendVerificationOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // logoutUser
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
        state.requiresEmailVerification = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      });

    // forgotPassword
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // resetPasswordOtp
    builder
      .addCase(resetPasswordOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPasswordOtp.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPasswordOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // updateProfile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, resetAuth, setUser } = authSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectRequiresEmailVerification = (state) => state.auth.requiresEmailVerification;

export default authSlice.reducer;
