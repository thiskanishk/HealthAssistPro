import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import jwtDecode, { JwtPayload } from 'jwt-decode';
import { AppDispatch } from '../index';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'doctor' | 'nurse' | 'admin';
  specialization?: string;
  licenseNumber?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustomJWTPayload extends JwtPayload {
  userId: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
};

export const checkAuthTimeout = createAsyncThunk<void, number, { dispatch: AppDispatch }>(
  'auth/checkAuthTimeout',
  async (expirationTime: number, { dispatch }) => {
    setTimeout(() => {
      dispatch(logout());
    }, expirationTime * 1000);
  }
);

export const tryAutoLogin = createAsyncThunk<string | void, void, { dispatch: AppDispatch }>(
  'auth/tryAutoLogin',
  async (_, { dispatch }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    try {
      const decodedToken = jwtDecode<CustomJWTPayload>(token);
      const expirationTime = decodedToken.exp;

      if (!expirationTime) {
        dispatch(logout());
        return;
      }

      const currentTime = Date.now() / 1000;
      if (expirationTime < currentTime) {
        dispatch(logout());
        return;
      }

      const timeUntilExpiration = expirationTime - currentTime;
      dispatch(checkAuthTimeout(timeUntilExpiration));

      return token;
    } catch (error) {
      dispatch(logout());
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state: AuthState, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state: AuthState, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setUser: (state: AuthState, action: PayloadAction<{ user: User; token: string }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      localStorage.setItem('token', action.payload.token);
    },
    logout: (state: AuthState) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem('token');
    },
    updateUser: (state: AuthState, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(tryAutoLogin.pending, (state: AuthState) => {
        state.loading = true;
      })
      .addCase(tryAutoLogin.fulfilled, (state: AuthState, action: PayloadAction<string | void>) => {
        state.loading = false;
        if (action.payload) {
          state.token = action.payload;
          state.isAuthenticated = true;
        }
      })
      .addCase(tryAutoLogin.rejected, (state: AuthState) => {
        state.loading = false;
        state.error = 'Auto login failed';
      });
  },
});

export const { setLoading, setError, setUser, logout, updateUser } = authSlice.actions;
export default authSlice.reducer; 