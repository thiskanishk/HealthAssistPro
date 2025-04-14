import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  CircularProgress,
} from '@mui/material';
import { useAIFeatures } from '../../hooks/useAIFeatures';

export const AIFeatureManager: React.FC = () => {
  const {
    analyzeImage,
    generateReport,
    analyzeDrugInteractions,
    optimizeTreatment,
    monitorHealth,
    communicateWithPatient,
    researchAssistant,
    loading,
  } = useAIFeatures();

  const features = [
    {
      title: 'Medical Image Analysis',
      description: 'AI-powered analysis of medical images',
      action: analyzeImage,
    },
    {
      title: 'Report Generation',
      description: 'Automated medical report generation',
      action: generateReport,
    },
    {
      title: 'Drug Interaction Analysis',
      description: 'Check for potential drug interactions',
      action: analyzeDrugInteractions,
    },
    // Add more features...
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AI-Powered Features
      </Typography>
      <Grid container spacing={3}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography color="text.secondary" paragraph>
                  {feature.description}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => feature.action()}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Use Feature'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}; 