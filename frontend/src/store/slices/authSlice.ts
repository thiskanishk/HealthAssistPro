import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import jwtDecode, { JwtPayload } from 'jwt-decode';
import { AppDispatch } from '../index';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface CustomJWTPayload extends JwtPayload {
  userId: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
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
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state: AuthState, action: PayloadAction<string | null>) => {
      state.error = action.payload;
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

export const { setCredentials, logout, setLoading, setError, updateUser } = authSlice.actions;
export default authSlice.reducer; 