import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Typography,
  TextField,
  Autocomplete,
  Chip,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { BodyMap } from './BodyMap';
import { SymptomTimeline } from './SymptomTimeline';
import { useSymptomAnalysis } from '../hooks/useSymptomAnalysis';
import { commonSymptoms } from '../data/symptoms';

export const SymptomAnalyzer: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [duration, setDuration] = useState<string>('');
  const [severity, setSeverity] = useState<number>(0);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  const { 
    analyze, 
    analysis, 
    loading, 
    error 
  } = useSymptomAnalysis();

  const steps = [
    'Select Body Region',
    'Specify Symptoms',
    'Add Details',
    'Review Analysis'
  ];

  const handleBodyPartSelect = (part: string) => {
    setBodyParts(prev => [...prev, part]);
    // Auto-suggest related symptoms
    const relatedSymptoms = getRelatedSymptoms(part);
    setSelectedSymptoms(prev => [...prev, ...relatedSymptoms]);
  };

  const handleAnalyze = async () => {
    const symptomData = {
      symptoms: selectedSymptoms,
      bodyParts,
      duration,
      severity,
      additionalNotes
    };
    await analyze(symptomData);
    setActiveStep(3);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        AI-Powered Symptom Analysis
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Box sx={{ mb: 3 }}>
          <BodyMap onPartSelect={handleBodyPartSelect} />
          <Box sx={{ mt: 2 }}>
            {bodyParts.map(part => (
              <Chip
                key={part}
                label={part}
                onDelete={() => setBodyParts(prev => prev.filter(p => p !== part))}
                sx={{ m: 0.5 }}
              />
            ))}
          </Box>
        </Box>
      )}

      {activeStep === 1 && (
        <Box sx={{ mb: 3 }}>
          <Autocomplete
            multiple
            options={commonSymptoms}
            value={selectedSymptoms}
            onChange={(_, newValue) => setSelectedSymptoms(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Symptoms"
                placeholder="Type to search symptoms"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  sx={{ m: 0.5 }}
                />
              ))
            }
          />
          <SymptomTimeline symptoms={selectedSymptoms} />
        </Box>
      )}

      {activeStep === 2 && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Additional Notes"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
          />
        </Box>
      )}

      {activeStep === 3 && (
        <Box sx={{ mb: 3 }}>
          {loading ? (
            <CircularProgress />
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : analysis ? (
            <AnalysisResults analysis={analysis} />
          ) : null}
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={() => setActiveStep(prev => prev - 1)}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={activeStep === 2 ? handleAnalyze : () => setActiveStep(prev => prev + 1)}
          disabled={loading}
        >
          {activeStep === 2 ? 'Analyze' : 'Next'}
        </Button>
      </Box>
    </Paper>
  );
}; 