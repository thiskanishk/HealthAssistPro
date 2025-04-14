
import React, { useState } from 'react';
import axios from '../hooks/useAxiosInterceptor';
import { Card, CardContent, Button, Typography, CircularProgress } from '@mui/material';

const PatientTrendAnalyzer = ({ patientId }) => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/analyze-history', { patientId });
      setSummary(data.summary);
    } catch (err) {
      console.error('Analysis failed:', err);
      setSummary('AI analysis failed. Please try again later.');
    }
    setLoading(false);
  };

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6">📊 Analyze Patient Trends</Typography>
        <Button variant="contained" onClick={handleAnalyze} disabled={loading} sx={{ mt: 1 }}>
          {loading ? <CircularProgress size={24} /> : 'Analyze Trends'}
        </Button>
        {summary && (
          <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
            {summary}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientTrendAnalyzer;
