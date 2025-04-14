import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

export type Severity = 'error' | 'warning' | 'info' | 'success';

interface ErrorState {
  message: string | null;
  severity: Severity;
  source?: string;
  timestamp?: number;
}

interface LoadingState {
  [key: string]: boolean;
}

interface UIState {
  error: ErrorState | null;
  loading: LoadingState;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: {
    unread: number;
    list: Array<{
      id: string;
      message: string;
      type: string;
      read: boolean;
      timestamp: number;
    }>;
  };
}

const initialState: UIState = {
  error: null,
  loading: {},
  theme: 'light',
  sidebarOpen: true,
  notifications: {
    unread: 0,
    list: [],
  },
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setError: (state, action: PayloadAction<ErrorState>) => {
      state.error = {
        ...action.payload,
        timestamp: Date.now(),
      };
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    addNotification: (state, action: PayloadAction<{
      message: string;
      type: string;
    }>) => {
      state.notifications.list.unshift({
        id: Date.now().toString(),
        ...action.payload,
        read: false,
        timestamp: Date.now(),
      });
      state.notifications.unread += 1;
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.list.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.notifications.unread -= 1;
      }
    },
    clearAllNotifications: (state) => {
      state.notifications.list = [];
      state.notifications.unread = 0;
    },
  },
});

export const {
  setError,
  clearError,
  setLoading,
  toggleTheme,
  toggleSidebar,
  addNotification,
  markNotificationAsRead,
  clearAllNotifications,
} = uiSlice.actions;

// Selectors
export const selectError = (state: RootState) => state.ui.error;
export const selectIsLoading = (key: string) => (state: RootState) => state.ui.loading[key];
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectNotifications = (state: RootState) => state.ui.notifications;

export default uiSlice.reducer; 