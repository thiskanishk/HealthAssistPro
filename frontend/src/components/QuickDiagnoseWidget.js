
import React from 'react';
import { Card, CardContent, Typography, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const commonSets = {
  Cold: ['fever', 'cough', 'runny nose'],
  ChestPain: ['chest pain', 'shortness of breath'],
  Fatigue: ['fatigue', 'loss of appetite']
};

const QuickDiagnoseWidget = () => {
  const navigate = useNavigate();

  const handleQuickDiagnose = (symptoms) => {
    navigate('/patients/new', { state: { prefillSymptoms: symptoms } });
  };

  return (
    <Card sx={{ mt: 2 }} variant="outlined">
      <CardContent>
        <Typography variant="h6">⚡ Quick Diagnose</Typography>
        <Stack spacing={1} mt={1}>
          {Object.entries(commonSets).map(([label, symptoms]) => (
            <Button key={label} variant="outlined" onClick={() => handleQuickDiagnose(symptoms)}>
              {label} Symptoms
            </Button>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default QuickDiagnoseWidget;
