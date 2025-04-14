/**
 * PatientIntakeForm Component
 * 
 * A comprehensive form for patient triage assessment that collects:
 * - Patient symptoms with severity and duration
 * - Vital signs (temperature, heart rate, blood pressure, etc.)
 * - Submits data for AI-powered triage assessment
 */

import React, { useState, ChangeEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Autocomplete,
  Chip,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  InputAdornment,
  SelectChangeEvent,
  AutocompleteChangeReason,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Define interfaces for type safety
interface Symptom {
  name: string;
  severity: number;
  duration: string;
}

interface VitalSigns {
  temperature?: number;
  heartRate?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  respiratoryRate?: number;
  oxygenSaturation?: number;
}

interface PatientIntakeFormProps {
  patientId: string;
  onSubmit?: (assessment: TriageAssessment) => void;
}

interface TriageAssessment {
  _id: string;
  patientId: string;
  symptoms: Symptom[];
  vitalSigns: VitalSigns;
  aiAssessment: {
    triageLevel: 'immediate' | 'emergency' | 'urgent' | 'semi-urgent' | 'non-urgent';
    confidenceScore: number;
    recommendedAction: string;
    estimatedWaitTime: number;
  };
}

// Predefined list of common symptoms for quick selection
const commonSymptoms = [
  'chest_pain',
  'difficulty_breathing',
  'severe_bleeding',
  'unconsciousness',
  'severe_pain',
  'high_fever',
  'trauma',
  'allergic_reaction',
  'nausea',
  'dizziness',
  'headache',
  'abdominal_pain',
];

// Duration options for symptom assessment
const durationOptions = [
  'Less than 1 hour',
  '1-6 hours',
  '6-12 hours',
  '12-24 hours',
  '1-3 days',
  'More than 3 days',
];

const PatientIntakeForm: React.FC<PatientIntakeFormProps> = ({ patientId, onSubmit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState<string>('');
  const [currentSeverity, setCurrentSeverity] = useState<number>(5);
  const [currentDuration, setCurrentDuration] = useState<string>(durationOptions[0]);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    temperature: undefined,
    heartRate: undefined,
    bloodPressure: {
      systolic: 120,
      diastolic: 80,
    },
    respiratoryRate: undefined,
    oxygenSaturation: undefined,
  });

  /**
   * Handles the addition of a new symptom to the symptoms list
   * Validates that a symptom name is provided before adding
   */
  const handleAddSymptom = () => {
    if (!currentSymptom) return;

    setSymptoms([
      ...symptoms,
      {
        name: currentSymptom,
        severity: currentSeverity,
        duration: currentDuration,
      },
    ]);

    setCurrentSymptom('');
    setCurrentSeverity(5);
  };

  const handleRemoveSymptom = (symptomName: string) => {
    setSymptoms(symptoms.filter((s: Symptom) => s.name !== symptomName));
  };

  /**
   * Updates vital sign values in the form
   * Handles both direct vital signs and blood pressure which has nested values
   */
  const handleVitalSignChange = (
    field: keyof VitalSigns,
    value: number | undefined,
    subField?: 'systolic' | 'diastolic'
  ) => {
    if (field === 'bloodPressure' && subField) {
      setVitalSigns({
        ...vitalSigns,
        bloodPressure: {
          ...vitalSigns.bloodPressure!,
          [subField]: value,
        },
      });
    } else {
      setVitalSigns({
        ...vitalSigns,
        [field]: value,
      });
    }
  };

  const handleSymptomChange = (_: unknown, newValue: string | null) => {
    setCurrentSymptom(newValue || '');
  };

  const handleDurationChange = (event: SelectChangeEvent<string>) => {
    setCurrentDuration(event.target.value);
  };

  const handleSeverityChange = (_: Event, value: number | number[]) => {
    setCurrentSeverity(value as number);
  };

  const handleTextFieldChange = (
    field: keyof VitalSigns,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    subField?: 'systolic' | 'diastolic'
  ) => {
    const value = event.target.value ? Number(event.target.value) : undefined;
    handleVitalSignChange(field, value, subField);
  };

  /**
   * Submits the triage assessment to the backend
   * Handles loading states and error scenarios
   * Navigates to the assessment view on successful submission
   */
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/triage/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          symptoms,
          vitalSigns,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit triage assessment');
      }

      const assessment = await response.json();
      
      if (onSubmit) {
        onSubmit(assessment);
      } else {
        navigate(`/triage/assessment/${assessment._id}`);
      }
    } catch (err) {
      setError('Failed to submit triage assessment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isValidForm = () => {
    return (
      symptoms.length > 0 &&
      (vitalSigns.temperature ||
        vitalSigns.heartRate ||
        vitalSigns.bloodPressure ||
        vitalSigns.respiratoryRate ||
        vitalSigns.oxygenSaturation)
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Patient Triage Assessment
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Symptoms
          </Typography>
          <Box display="flex" gap={2} mb={2}>
            <Autocomplete
              value={currentSymptom}
              onChange={handleSymptomChange}
              options={commonSymptoms}
              freeSolo
              fullWidth
              renderInput={(params) => (
                <TextField {...params} label="Select or type symptom" size="small" />
              )}
            />
            <FormControl sx={{ width: 200 }}>
              <InputLabel>Duration</InputLabel>
              <Select
                value={currentDuration}
                onChange={handleDurationChange}
                size="small"
                label="Duration"
              >
                {durationOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box mb={2}>
            <Typography gutterBottom>Severity (1-10)</Typography>
            <Slider
              value={currentSeverity}
              onChange={handleSeverityChange}
              min={1}
              max={10}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
          <Button variant="contained" onClick={handleAddSymptom} disabled={!currentSymptom}>
            Add Symptom
          </Button>
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {symptoms.map((symptom) => (
              <Chip
                key={symptom.name}
                label={`${symptom.name} (${symptom.severity}) - ${symptom.duration}`}
                onDelete={() => handleRemoveSymptom(symptom.name)}
              />
            ))}
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Vital Signs
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Temperature"
                type="number"
                fullWidth
                value={vitalSigns.temperature || ''}
                onChange={(e) => handleTextFieldChange('temperature', e)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">°C</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Heart Rate"
                type="number"
                fullWidth
                value={vitalSigns.heartRate || ''}
                onChange={(e) => handleTextFieldChange('heartRate', e)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">bpm</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Respiratory Rate"
                type="number"
                fullWidth
                value={vitalSigns.respiratoryRate || ''}
                onChange={(e) => handleTextFieldChange('respiratoryRate', e)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">breaths/min</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Oxygen Saturation"
                type="number"
                fullWidth
                value={vitalSigns.oxygenSaturation || ''}
                onChange={(e) => handleTextFieldChange('oxygenSaturation', e)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Blood Pressure (Systolic)"
                type="number"
                fullWidth
                value={vitalSigns.bloodPressure?.systolic || ''}
                onChange={(e) => handleTextFieldChange('bloodPressure', e, 'systolic')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">mmHg</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Blood Pressure (Diastolic)"
                type="number"
                fullWidth
                value={vitalSigns.bloodPressure?.diastolic || ''}
                onChange={(e) => handleTextFieldChange('bloodPressure', e, 'diastolic')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">mmHg</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isValidForm() || loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              Submit Assessment
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PatientIntakeForm; 