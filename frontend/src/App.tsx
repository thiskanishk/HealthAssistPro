import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from './theme/ThemeProvider';
import { CssBaseline } from '@mui/material';
import { store } from './store';
import { theme } from './theme';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Protected Pages
import Dashboard from './pages/dashboard/Dashboard';
import PatientList from './pages/patients/PatientList';
import PatientDetails from './pages/patients/PatientDetails';
import NewDiagnosis from './pages/diagnosis/NewDiagnosis';
import DiagnosisHistory from './pages/diagnosis/DiagnosisHistory';
import Profile from './pages/profile/Profile';
import Settings from './pages/settings/Settings';

// Layout Components
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/auth">
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                  <Route path="forgot-password" element={<ForgotPassword />} />
                </Route>

                {/* Protected Routes */}
                <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="patients">
                    <Route index element={<PatientList />} />
                    <Route path=":patientId" element={<PatientDetails />} />
                  </Route>
                  <Route path="diagnosis">
                    <Route path="new" element={<NewDiagnosis />} />
                    <Route path="history" element={<DiagnosisHistory />} />
                  </Route>
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                {/* Catch-all Route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </LocalizationProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App; 