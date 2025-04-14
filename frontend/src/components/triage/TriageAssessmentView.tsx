import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
} from '@mui/material';
import {
  Timer as TimerIcon,
  Assessment as AssessmentIcon,
  LocalHospital as HospitalIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

interface TriageAssessment {
  _id: string;
  patientId: {
    _id: string;
    name: string;
    age: number;
    gender: string;
  };
  symptoms: Array<{
    name: string;
    severity: number;
    duration: string;
  }>;
  vitalSigns: {
    temperature?: number;
    heartRate?: number;
    bloodPressure?: {
      systolic: number;
      diastolic: number;
    };
    respiratoryRate?: number;
    oxygenSaturation?: number;
  };
  aiAssessment: {
    triageLevel: 'immediate' | 'emergency' | 'urgent' | 'semi-urgent' | 'non-urgent';
    confidenceScore: number;
    recommendedAction: string;
    estimatedWaitTime: number;
    potentialDiagnoses: Array<{
      condition: string;
      probability: number;
    }>;
  };
  nurseReview?: {
    reviewed: boolean;
    reviewedBy?: {
      _id: string;
      name: string;
    };
    reviewedAt?: string;
    adjustedTriageLevel?: string;
    notes?: string;
  };
  status: 'pending' | 'in_review' | 'completed';
  timestamp: string;
}

const TriageAssessmentView: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [assessment, setAssessment] = useState<TriageAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const response = await fetch(`/api/triage/assessments/${assessmentId}`);
        if (!response.ok) throw new Error('Failed to fetch assessment');
        const data = await response.json();
        setAssessment(data);
        setError(null);
      } catch (err) {
        setError('Failed to load triage assessment');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  const getTriageLevelColor = (level: string) => {
    const colors = {
      immediate: 'error',
      emergency: 'error',
      urgent: 'warning',
      'semi-urgent': 'info',
      'non-urgent': 'success',
    };
    return colors[level as keyof typeof colors];
  };

  const formatVitalSigns = (vitals: TriageAssessment['vitalSigns']) => {
    const formatted = [];
    if (vitals.temperature) formatted.push(`Temperature: ${vitals.temperature}°C`);
    if (vitals.heartRate) formatted.push(`Heart Rate: ${vitals.heartRate} bpm`);
    if (vitals.bloodPressure) {
      formatted.push(
        `Blood Pressure: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg`
      );
    }
    if (vitals.respiratoryRate) formatted.push(`Respiratory Rate: ${vitals.respiratoryRate} breaths/min`);
    if (vitals.oxygenSaturation) formatted.push(`Oxygen Saturation: ${vitals.oxygenSaturation}%`);
    return formatted;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !assessment) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error || 'Assessment not found'}
      </Alert>
    );
  }

  return (
    <Box p={3}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5">Triage Assessment</Typography>
              <Chip
                label={assessment.aiAssessment.triageLevel.toUpperCase()}
                color={getTriageLevelColor(assessment.aiAssessment.triageLevel)}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Patient Information
            </Typography>
            <Typography>
              Name: {assessment.patientId.name}
              <br />
              Age: {assessment.patientId.age} years
              <br />
              Gender: {assessment.patientId.gender}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Assessment Details
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <TimerIcon />
              <Typography>
                Estimated Wait Time: {assessment.aiAssessment.estimatedWaitTime} minutes
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <TrendingUpIcon />
              <Typography>AI Confidence: {(assessment.aiAssessment.confidenceScore * 100).toFixed(1)}%</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Symptoms
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {assessment.symptoms.map((symptom) => (
                <Chip
                  key={symptom.name}
                  label={`${symptom.name} (${symptom.severity}) - ${symptom.duration}`}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Vital Signs
            </Typography>
            <List>
              {formatVitalSigns(assessment.vitalSigns).map((vital, index) => (
                <ListItem key={index}>
                  <ListItemText primary={vital} />
                </ListItem>
              ))}
            </List>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              AI Assessment
            </Typography>
            <Typography color="text.secondary" paragraph>
              {assessment.aiAssessment.recommendedAction}
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              Potential Diagnoses:
            </Typography>
            <List>
              {assessment.aiAssessment.potentialDiagnoses.map((diagnosis) => (
                <ListItem key={diagnosis.condition}>
                  <ListItemText
                    primary={diagnosis.condition}
                    secondary={`Probability: ${(diagnosis.probability * 100).toFixed(1)}%`}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>

          {assessment.nurseReview && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Nurse Review
              </Typography>
              <Box bgcolor="background.default" p={2} borderRadius={1}>
                {assessment.nurseReview.reviewed ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Reviewed by {assessment.nurseReview.reviewedBy?.name} on{' '}
                      {new Date(assessment.nurseReview.reviewedAt!).toLocaleString()}
                    </Typography>
                    {assessment.nurseReview.adjustedTriageLevel && (
                      <Box mt={1}>
                        <Typography variant="subtitle2">Adjusted Triage Level:</Typography>
                        <Chip
                          label={assessment.nurseReview.adjustedTriageLevel.toUpperCase()}
                          color={getTriageLevelColor(assessment.nurseReview.adjustedTriageLevel)}
                          size="small"
                        />
                      </Box>
                    )}
                    {assessment.nurseReview.notes && (
                      <Box mt={2}>
                        <Typography variant="subtitle2">Notes:</Typography>
                        <Typography variant="body2">{assessment.nurseReview.notes}</Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography color="text.secondary">Pending nurse review</Typography>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
};

export default TriageAssessmentView; 