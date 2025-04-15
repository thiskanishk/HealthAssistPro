import { lazy } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Lazy-loaded components
const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));
const PatientDashboard = lazy(() => import('../components/Dashboard/PatientDashboard'));
const DoctorDashboard = lazy(() => import('../pages/DoctorDashboard'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const NurseDashboard = lazy(() => import('../pages/NurseDashboard'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Public Route wrapper (accessible only when not authenticated)
const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Route configuration
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />
  },
  {
    path: '/login',
    element: <PublicRoute><Login /></PublicRoute>
  },
  {
    path: '/register',
    element: <PublicRoute><Register /></PublicRoute>
  },
  {
    path: '/forgot-password',
    element: <PublicRoute><ForgotPassword /></PublicRoute>
  },
  {
    path: '/reset-password/:token',
    element: <PublicRoute><ResetPassword /></PublicRoute>
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute>
      {({ user }) => {
        switch (user?.role) {
          case 'patient':
            return <PatientDashboard />;
          case 'doctor':
            return <DoctorDashboard />;
          case 'admin':
            return <AdminDashboard />;
          case 'nurse':
            return <NurseDashboard />;
          default:
            return <Navigate to="/login" replace />;
        }
      }}
    </ProtectedRoute>
  },
  {
    path: '*',
    element: <NotFound />
  }
];
