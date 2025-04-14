
import React from 'react';
import { Container, Typography, Box, Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QuickDiagnoseWidget from '../components/QuickDiagnoseWidget';
import RecentPatientsCard from '../components/RecentPatientsCard';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        🏥 Doctor Dashboard
      </Typography>

      <QuickDiagnoseWidget />
      <RecentPatientsCard />

      <Box position="fixed" bottom={24} right={24}>
        <Fab color="primary" aria-label="add" onClick={() => navigate('/patients/new')}>
          <AddIcon />
        </Fab>
      </Box>
    </Container>
  );
};

export default DashboardPage;
