import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  Alert,
  Chip,
  Stack,
  Grid
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const SelfDiagnosisPage = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    symptoms: [],
    symptomText: '',
    vitals: {
      temperature: '',
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      heartRate: '',
      oxygenSaturation: ''
    },
    consent: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vitalErrors, setVitalErrors] = useState({});

  const handleSymptomAdd = () => {
    if (formData.symptomText.trim()) {
      setFormData(prev => ({
        ...prev,
        symptoms: [...prev.symptoms, prev.symptomText.trim()],
        symptomText: ''
      }));
    }
  };

  const handleSymptomDelete = (symptomToDelete) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.filter(symptom => symptom !== symptomToDelete)
    }));
  };

  const handleVitalsChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [field]: event.target.value
      }
    }));
  };

  const validateVitals = (vitals) => {
    const errors = {};

    // Validate temperature
    if (!vitals.temperature) {
      errors.temperature = 'Temperature is required';
    } else {
      const temp = parseFloat(vitals.temperature);
      if (isNaN(temp) || temp < 95 || temp > 108) {
        errors.temperature = 'Temperature must be between 95°F and 108°F';
      }
    }

    // Validate blood pressure systolic
    if (!vitals.bloodPressureSystolic) {
      errors.bloodPressureSystolic = 'Systolic pressure is required';
    } else {
      const systolic = parseInt(vitals.bloodPressureSystolic);
      if (isNaN(systolic) || systolic < 70 || systolic > 200) {
        errors.bloodPressureSystolic = 'Systolic pressure must be between 70 and 200';
      }
    }

    // Validate blood pressure diastolic
    if (!vitals.bloodPressureDiastolic) {
      errors.bloodPressureDiastolic = 'Diastolic pressure is required';
    } else {
      const diastolic = parseInt(vitals.bloodPressureDiastolic);
      if (isNaN(diastolic) || diastolic < 40 || diastolic > 130) {
        errors.bloodPressureDiastolic = 'Diastolic pressure must be between 40 and 130';
      }
    }

    // Validate heart rate
    if (!vitals.heartRate) {
      errors.heartRate = 'Heart rate is required';
    } else {
      const hr = parseInt(vitals.heartRate);
      if (isNaN(hr) || hr < 40 || hr > 200) {
        errors.heartRate = 'Heart rate must be between 40 and 200 BPM';
      }
    }

    // Validate oxygen saturation
    if (!vitals.oxygenSaturation) {
      errors.oxygenSaturation = 'Oxygen saturation is required';
    } else {
      const o2 = parseInt(vitals.oxygenSaturation);
      if (isNaN(o2) || o2 < 70 || o2 > 100) {
        errors.oxygenSaturation = 'Oxygen saturation must be between 70% and 100%';
      }
    }

    return errors;
  };

  const handleSubmit = async () => {
    try {
      // Validate symptoms first
      if (!formData.symptoms || formData.symptoms.length === 0) {
        setError('Please enter at least one symptom');
        setActiveStep(0);
        return;
      }

      setLoading(true);
      setError('');

      const errors = validateVitals(formData.vitals);
      if (Object.keys(errors).length > 0) {
        setVitalErrors(errors);
        setActiveStep(1);
        throw new Error('Please correct the vital signs values');
      }

      // Safe parsing of values with fallbacks
      const temperature = parseFloat(formData.vitals.temperature) || 98.6;
      const systolic = parseInt(formData.vitals.bloodPressureSystolic) || 120;
      const diastolic = parseInt(formData.vitals.bloodPressureDiastolic) || 80;
      const heartRate = parseInt(formData.vitals.heartRate) || 70;
      const oxygenSaturation = parseInt(formData.vitals.oxygenSaturation) || 98;

      const response = await fetch('/api/self-diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          symptoms: formData.symptoms,
          vitals: {
            temperature,
            bloodPressure: {
              systolic,
              diastolic
            },
            heartRate,
            oxygenSaturation
          }
        })
      });

      if (!response.ok) throw new Error('Failed to submit diagnosis');

      const result = await response.json();
      navigate('/patient/history', { state: { newDiagnosis: result.id } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Self-Diagnosis Assessment
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          <Step><StepLabel>Symptoms</StepLabel></Step>
          <Step><StepLabel>Vitals</StepLabel></Step>
          <Step><StepLabel>Review</StepLabel></Step>
        </Stepper>

        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Enter Your Symptoms
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Enter a symptom"
                value={formData.symptomText}
                onChange={(e) => setFormData(prev => ({ ...prev, symptomText: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleSymptomAdd()}
              />
              <Button variant="contained" onClick={handleSymptomAdd}>
                Add
              </Button>
            </Stack>
            <Box sx={{ mb: 2 }}>
              {formData.symptoms.map((symptom, index) => (
                <Chip
                  key={index}
                  label={symptom}
                  onDelete={() => handleSymptomDelete(symptom)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Enter Your Vitals
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Temperature (°F)"
                  type="number"
                  value={formData.vitals.temperature}
                  onChange={handleVitalsChange('temperature')}
                  error={!!vitalErrors.temperature}
                  helperText={vitalErrors.temperature}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="Blood Pressure (Systolic)"
                  type="number"
                  value={formData.vitals.bloodPressureSystolic}
                  onChange={handleVitalsChange('bloodPressureSystolic')}
                  error={!!vitalErrors.bloodPressureSystolic}
                  helperText={vitalErrors.bloodPressureSystolic}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="Blood Pressure (Diastolic)"
                  type="number"
                  value={formData.vitals.bloodPressureDiastolic}
                  onChange={handleVitalsChange('bloodPressureDiastolic')}
                  error={!!vitalErrors.bloodPressureDiastolic}
                  helperText={vitalErrors.bloodPressureDiastolic}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Heart Rate (BPM)"
                  type="number"
                  value={formData.vitals.heartRate}
                  onChange={handleVitalsChange('heartRate')}
                  error={!!vitalErrors.heartRate}
                  helperText={vitalErrors.heartRate}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Oxygen Saturation (%)"
                  type="number"
                  value={formData.vitals.oxygenSaturation}
                  onChange={handleVitalsChange('oxygenSaturation')}
                  error={!!vitalErrors.oxygenSaturation}
                  helperText={vitalErrors.oxygenSaturation}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review and Submit
            </Typography>
            
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Symptoms</Typography>
              <Box sx={{ mb: 2 }}>
                {formData.symptoms.map((symptom, index) => (
                  <Chip key={index} label={symptom} sx={{ m: 0.5 }} />
                ))}
              </Box>

              <Typography variant="subtitle1" gutterBottom>Vitals</Typography>
              <Grid container spacing={2}>
                {formData.vitals.temperature && (
                  <Grid item xs={12} sm={6}>
                    <Typography>Temperature: {formData.vitals.temperature}°F</Typography>
                  </Grid>
                )}
                {(formData.vitals.bloodPressureSystolic && formData.vitals.bloodPressureDiastolic) && (
                  <Grid item xs={12} sm={6}>
                    <Typography>
                      Blood Pressure: {formData.vitals.bloodPressureSystolic}/{formData.vitals.bloodPressureDiastolic}
                    </Typography>
                  </Grid>
                )}
                {formData.vitals.heartRate && (
                  <Grid item xs={12} sm={6}>
                    <Typography>Heart Rate: {formData.vitals.heartRate} BPM</Typography>
                  </Grid>
                )}
                {formData.vitals.oxygenSaturation && (
                  <Grid item xs={12} sm={6}>
                    <Typography>Oxygen Saturation: {formData.vitals.oxygenSaturation}%</Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.consent}
                  onChange={(e) => setFormData(prev => ({ ...prev, consent: e.target.checked }))}
                />
              }
              label="I consent to sharing this information for AI-powered diagnosis"
            />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0}
            onClick={() => setActiveStep(prev => prev - 1)}
          >
            Back
          </Button>
          <Button
            variant="contained"
            disabled={loading || (activeStep === 2 && !formData.consent)}
            onClick={() => {
              if (activeStep === 2) {
                handleSubmit();
              } else {
                setActiveStep(prev => prev + 1);
              }
            }}
          >
            {activeStep === 2 ? 'Submit' : 'Next'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SelfDiagnosisPage; 