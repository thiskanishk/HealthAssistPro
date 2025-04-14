import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { CircularProgress } from '@mui/material';
import { User } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<User['role']>;
  requireVerified?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requireVerified = false,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check if email verification is required and user is not verified
  if (requireVerified && !user.isActive) {
    return <Navigate to="/auth/verify-email" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 