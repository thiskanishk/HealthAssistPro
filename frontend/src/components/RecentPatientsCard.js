
import React, { useEffect, useState } from 'react';
import axios from '../hooks/useAxiosInterceptor';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Card,
  CardContent
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const RecentPatientsCard = () => {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const { data } = await axios.get('/patients?page=1&limit=5');
        setPatients(data);
      } catch (err) {
        console.error('Failed to load recent patients:', err);
      }
    };
    fetchPatients();
  }, []);

  return (
    <Card sx={{ mt: 2 }} variant="outlined">
      <CardContent>
        <Typography variant="h6">🧑‍⚕️ Recent Patients</Typography>
        {patients.map(p => (
          <Accordion key={p._id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>{p.name} (Age: {p.age})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">Last Visit: {new Date(p.createdAt).toLocaleDateString()}</Typography>
              <Typography variant="body2">Last Diagnosis: {p.diagnosisHistory?.slice(-1)[0] || 'N/A'}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </CardContent>
    </Card>
  );
};

export default RecentPatientsCard;
