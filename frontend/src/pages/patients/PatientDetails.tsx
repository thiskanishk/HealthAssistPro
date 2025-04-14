import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, Button, Divider, 
  Tabs, Tab, CircularProgress, Alert 
} from '@mui/material';
import { 
  MedicalInformation, Person, 
  History, LocalHospital 
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PatientDetails: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    // Simulate API fetch
    const fetchPatient = async () => {
      try {
        setLoading(true);
        // In a real app, you would fetch data from your API
        // const response = await fetch(`/api/patients/${patientId}`);
        // const data = await response.json();
        
        // Using mock data for now
        setTimeout(() => {
          setPatient({
            id: patientId,
            name: 'John Doe',
            dateOfBirth: '1980-01-15',
            gender: 'Male',
            contactInfo: {
              email: 'john.doe@example.com',
              phone: '(555) 123-4567',
              address: '123 Main St, Anytown, USA'
            },
            bloodType: 'A+',
            allergies: ['Penicillin', 'Peanuts'],
            chronicConditions: ['Hypertension'],
            recentVitals: {
              bloodPressure: '120/80',
              heartRate: 72,
              temperature: 98.6,
              respiratoryRate: 16,
              oxygenSaturation: 98
            }
          });
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Failed to load patient details');
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatient();
    }
  }, [patientId]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBack = () => {
    navigate('/patients');
  };

  const handleNewDiagnosis = () => {
    navigate(`/diagnosis/new?patientId=${patientId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box m={3}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={handleBack} sx={{ mt: 2 }}>
          Back to Patient List
        </Button>
      </Box>
    );
  }

  if (!patient) {
    return (
      <Box m={3}>
        <Alert severity="warning">Patient not found</Alert>
        <Button variant="outlined" onClick={handleBack} sx={{ mt: 2 }}>
          Back to Patient List
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Patient Details
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleNewDiagnosis}
            startIcon={<MedicalInformation />}
            sx={{ mr: 2 }}
          >
            New Diagnosis
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleBack}
          >
            Back to List
          </Button>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ mb: 3, p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Typography><strong>Name:</strong> {patient.name}</Typography>
            <Typography><strong>Date of Birth:</strong> {patient.dateOfBirth}</Typography>
            <Typography><strong>Gender:</strong> {patient.gender}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Contact Information
            </Typography>
            <Typography><strong>Email:</strong> {patient.contactInfo.email}</Typography>
            <Typography><strong>Phone:</strong> {patient.contactInfo.phone}</Typography>
            <Typography><strong>Address:</strong> {patient.contactInfo.address}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="patient details tabs"
          centered
        >
          <Tab icon={<Person />} label="Medical Profile" />
          <Tab icon={<History />} label="Medical History" />
          <Tab icon={<LocalHospital />} label="Recent Visits" />
        </Tabs>
        <Divider />

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Medical Information</Typography>
              <Typography><strong>Blood Type:</strong> {patient.bloodType}</Typography>
              <Typography><strong>Allergies:</strong> {patient.allergies.join(', ') || 'None'}</Typography>
              <Typography><strong>Chronic Conditions:</strong> {patient.chronicConditions.join(', ') || 'None'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Recent Vitals</Typography>
              <Typography><strong>Blood Pressure:</strong> {patient.recentVitals.bloodPressure}</Typography>
              <Typography><strong>Heart Rate:</strong> {patient.recentVitals.heartRate} bpm</Typography>
              <Typography><strong>Temperature:</strong> {patient.recentVitals.temperature}°F</Typography>
              <Typography><strong>Respiratory Rate:</strong> {patient.recentVitals.respiratoryRate} breaths/min</Typography>
              <Typography><strong>Oxygen Saturation:</strong> {patient.recentVitals.oxygenSaturation}%</Typography>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="body1">No medical history records available.</Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="body1">No recent visits recorded.</Typography>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default PatientDetails; 