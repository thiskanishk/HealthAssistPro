import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SortIcon from '@mui/icons-material/Sort';
import { useLocation } from 'react-router-dom';

const DiagnosisHistoryPage = () => {
  const location = useLocation();
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackDialog, setFeedbackDialog] = useState({
    open: false,
    diagnosisId: null,
    rating: 0,
    comment: ''
  });
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterRating, setFilterRating] = useState('all');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    fetchDiagnoses();
  }, []);

  const fetchDiagnoses = async () => {
    try {
      const response = await fetch('/api/self-diagnose/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch diagnosis history');

      const data = await response.json();
      setDiagnoses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    try {
      setFeedbackLoading(true);
      const response = await fetch(`/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          diagnosisId: feedbackDialog.diagnosisId,
          rating: feedbackDialog.rating,
          comment: feedbackDialog.comment
        })
      });

      if (!response.ok) throw new Error('Failed to submit feedback');

      // Update local state
      setDiagnoses(prev => prev.map(d => 
        d._id === feedbackDialog.diagnosisId
          ? { ...d, feedback: { rating: feedbackDialog.rating, comment: feedbackDialog.comment } }
          : d
      ));

      setFeedbackDialog({ open: false, diagnosisId: null, rating: 0, comment: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const getSortedAndFilteredDiagnoses = () => {
    let filtered = [...diagnoses];
    
    if (filterRating !== 'all') {
      filtered = filtered.filter(d => 
        d.feedback && d.feedback.rating === parseInt(filterRating)
      );
    }
    
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Diagnosis History
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Filter Rating</InputLabel>
          <Select
            value={filterRating}
            label="Filter Rating"
            onChange={(e) => setFilterRating(e.target.value)}
          >
            <MenuItem value="all">All Ratings</MenuItem>
            {[1, 2, 3, 4, 5].map(rating => (
              <MenuItem key={rating} value={rating}>
                {rating} Stars
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Tooltip title={`Sort ${sortOrder === 'desc' ? 'Oldest' : 'Newest'} First`}>
          <IconButton onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
            <SortIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {getSortedAndFilteredDiagnoses().map((diagnosis) => (
        <Accordion key={diagnosis._id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography variant="subtitle1">
                {new Date(diagnosis.createdAt).toLocaleDateString()}
              </Typography>
              {diagnosis.aiDiagnosis.conditions[0] && (
                <Chip 
                  label={diagnosis.aiDiagnosis.conditions[0].name}
                  color="primary"
                  size="small"
                />
              )}
              {diagnosis.feedback && (
                <Rating 
                  value={diagnosis.feedback.rating} 
                  readOnly 
                  size="small"
                  sx={{ ml: 'auto' }}
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="h6" gutterBottom>Symptoms</Typography>
            <Box sx={{ mb: 2 }}>
              {diagnosis.symptoms.map((symptom, index) => (
                <Chip key={index} label={symptom} sx={{ m: 0.5 }} />
              ))}
            </Box>

            <Typography variant="h6" gutterBottom>Vitals</Typography>
            <Box sx={{ mb: 2 }}>
              {diagnosis.vitals.temperature && (
                <Typography>Temperature: {diagnosis.vitals.temperature}°F</Typography>
              )}
              {diagnosis.vitals.bloodPressure && (
                <Typography>
                  Blood Pressure: {diagnosis.vitals.bloodPressure.systolic}/{diagnosis.vitals.bloodPressure.diastolic}
                </Typography>
              )}
              {diagnosis.vitals.heartRate && (
                <Typography>Heart Rate: {diagnosis.vitals.heartRate} BPM</Typography>
              )}
              {diagnosis.vitals.oxygenSaturation && (
                <Typography>Oxygen Saturation: {diagnosis.vitals.oxygenSaturation}%</Typography>
              )}
            </Box>

            <Typography variant="h6" gutterBottom>AI Diagnosis</Typography>
            {diagnosis.aiDiagnosis.conditions.map((condition, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1">{condition.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Confidence: {(condition.confidence * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2">{condition.description}</Typography>
                {condition.treatments && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2">Suggested Treatments:</Typography>
                    <ul>
                      {condition.treatments.map((treatment, idx) => (
                        <li key={idx}>{treatment}</li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Paper>
            ))}

            {!diagnosis.feedback && (
              <Button
                variant="outlined"
                onClick={() => setFeedbackDialog({
                  open: true,
                  diagnosisId: diagnosis._id,
                  rating: 0,
                  comment: ''
                })}
              >
                Provide Feedback
              </Button>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      <Dialog open={feedbackDialog.open} onClose={() => setFeedbackDialog(prev => ({ ...prev, open: false }))}>
        <DialogTitle>Provide Feedback</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Rating
              value={feedbackDialog.rating}
              onChange={(_, newValue) => setFeedbackDialog(prev => ({ ...prev, rating: newValue }))}
            />
            <TextField
              multiline
              rows={4}
              label="Comments (optional)"
              value={feedbackDialog.comment}
              onChange={(e) => setFeedbackDialog(prev => ({ ...prev, comment: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog(prev => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleFeedbackSubmit}
            disabled={!feedbackDialog.rating || feedbackLoading}
          >
            {feedbackLoading ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiagnosisHistoryPage; 