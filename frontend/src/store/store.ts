import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';

// Create the Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    // Add other reducers as they become available
    // patients: patientReducer,
    // diagnosis: diagnosisReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in specific action types
        ignoredActions: ['auth/login/fulfilled'],
      },
    }),
});

// Export types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 