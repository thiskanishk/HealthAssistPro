import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, User } from '../../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

const DashboardRouter: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth() as { user: User | null };

  useEffect(() => {
    if (user) {
      const role = user.role?.toLowerCase();
      switch (role) {
        case 'doctor':
          navigate('/dashboard/doctor', { replace: true });
          break;
        case 'nurse':
          navigate('/dashboard/nurse', { replace: true });
          break;
        case 'admin':
          navigate('/dashboard/admin', { replace: true });
          break;
        default:
          navigate('/unauthorized', { replace: true });
      }
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
};

export default DashboardRouter;
