import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

interface Patient {
  _id: string;
  name: string;
  age: number;
  gender: string;
}

interface TriageAssessment {
  _id: string;
  patientId: Patient;
  timestamp: string;
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
  status: 'pending' | 'in_review' | 'completed';
  nurseReview?: {
    reviewed: boolean;
    reviewedBy?: string;
    reviewedAt?: string;
    adjustedTriageLevel?: string;
    notes?: string;
  };
}

const TriageDashboard: React.FC = () => {
  const [assessments, setAssessments] = useState<TriageAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<TriageAssessment | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [nurseReview, setNurseReview] = useState({
    adjustedTriageLevel: '',
    notes: '',
  });
  const { user } = useAuth();

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/triage/assessments');
      if (!response.ok) throw new Error('Failed to fetch assessments');
      const data = await response.json();
      setAssessments(data);
      setError(null);
    } catch (err) {
      setError('Failed to load triage assessments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
    // Set up polling for real-time updates
    const pollInterval = setInterval(fetchAssessments, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleReviewOpen = (assessment: TriageAssessment) => {
    setSelectedAssessment(assessment);
    setNurseReview({
      adjustedTriageLevel: assessment.aiAssessment.triageLevel,
      notes: '',
    });
    setReviewDialogOpen(true);
  };

  const handleReviewClose = () => {
    setReviewDialogOpen(false);
    setSelectedAssessment(null);
    setNurseReview({ adjustedTriageLevel: '', notes: '' });
  };

  const handleReviewSubmit = async () => {
    if (!selectedAssessment) return;

    try {
      const response = await fetch(`/api/triage/assessments/${selectedAssessment._id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewedBy: user?.id,
          ...nurseReview,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit review');
      
      await fetchAssessments();
      handleReviewClose();
    } catch (err) {
      setError('Failed to submit review');
      console.error(err);
    }
  };

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
    if (vitals.temperature) formatted.push(`Temp: ${vitals.temperature}°C`);
    if (vitals.heartRate) formatted.push(`HR: ${vitals.heartRate}`);
    if (vitals.bloodPressure) {
      formatted.push(`BP: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`);
    }
    if (vitals.respiratoryRate) formatted.push(`RR: ${vitals.respiratoryRate}`);
    if (vitals.oxygenSaturation) formatted.push(`O2: ${vitals.oxygenSaturation}%`);
    return formatted.join(' | ');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Triage Dashboard</Typography>
        <IconButton onClick={() => fetchAssessments()} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Immediate Cases
              </Typography>
              <Typography variant="h4">
                {assessments.filter(a => a.aiAssessment.triageLevel === 'immediate').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Wait Time
              </Typography>
              <Typography variant="h4">
                {Math.round(
                  assessments.reduce((acc, curr) => acc + curr.aiAssessment.estimatedWaitTime, 0) /
                    assessments.length
                )}{' '}
                min
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Reviews
              </Typography>
              <Typography variant="h4">
                {assessments.filter(a => !a.nurseReview?.reviewed).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                AI Confidence
              </Typography>
              <Typography variant="h4">
                {Math.round(
                  (assessments.reduce(
                    (acc, curr) => acc + curr.aiAssessment.confidenceScore,
                    0
                  ) /
                    assessments.length) *
                    100
                )}
                %
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Patient</TableCell>
              <TableCell>Symptoms</TableCell>
              <TableCell>Vital Signs</TableCell>
              <TableCell>Triage Level</TableCell>
              <TableCell>Wait Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assessments.map((assessment) => (
              <TableRow key={assessment._id}>
                <TableCell>
                  <Typography variant="subtitle2">{assessment.patientId.name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {assessment.patientId.age} yrs | {assessment.patientId.gender}
                  </Typography>
                </TableCell>
                <TableCell>
                  {assessment.symptoms.map((symptom) => (
                    <Chip
                      key={symptom.name}
                      label={`${symptom.name} (${symptom.severity})`}
                      size="small"
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </TableCell>
                <TableCell>{formatVitalSigns(assessment.vitalSigns)}</TableCell>
                <TableCell>
                  <Chip
                    label={assessment.aiAssessment.triageLevel}
                    color={getTriageLevelColor(assessment.aiAssessment.triageLevel) as any}
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <TimerIcon fontSize="small" sx={{ mr: 1 }} />
                    {assessment.aiAssessment.estimatedWaitTime} min
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={assessment.status}
                    color={assessment.status === 'completed' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleReviewOpen(assessment)}
                    disabled={assessment.status === 'completed'}
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={reviewDialogOpen} onClose={handleReviewClose} maxWidth="md" fullWidth>
        <DialogTitle>Review Triage Assessment</DialogTitle>
        <DialogContent>
          {selectedAssessment && (
            <Box>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Adjusted Triage Level"
                    value={nurseReview.adjustedTriageLevel}
                    onChange={(e) =>
                      setNurseReview({ ...nurseReview, adjustedTriageLevel: e.target.value })
                    }
                  >
                    <MenuItem value="immediate">Immediate</MenuItem>
                    <MenuItem value="emergency">Emergency</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                    <MenuItem value="semi-urgent">Semi-urgent</MenuItem>
                    <MenuItem value="non-urgent">Non-urgent</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Review Notes"
                    value={nurseReview.notes}
                    onChange={(e) => setNurseReview({ ...nurseReview, notes: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReviewClose}>Cancel</Button>
          <Button onClick={handleReviewSubmit} variant="contained" color="primary">
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TriageDashboard; 