import React from 'react';
import { Box, Grid, Paper, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Patient Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Start Self-Diagnosis
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate('/patient/self-diagnose')}
              fullWidth
            >
              Begin Assessment
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              View History
            </Typography>
            <Button 
              variant="outlined"
              onClick={() => navigate('/patient/history')}
              fullWidth
            >
              View Past Diagnoses
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PatientDashboard; 