import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Autocomplete,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Save, Add, Delete } from '@mui/icons-material';
import { useTelemedicine } from '../../hooks/useTelemedicine';
import { debounce } from 'lodash';

interface ConsultationNotesProps {
  sessionId: string;
  patientId: string;
}

interface Notes {
  doctorNotes: string;
  symptoms: string[];
  diagnosis: string;
  followUpNeeded: boolean;
  followUpDate: string | null;
}

const commonSymptoms = [
  'Fever',
  'Cough',
  'Fatigue',
  'Shortness of breath',
  'Headache',
  'Body aches',
  'Nausea',
  'Dizziness',
  'Chest pain',
  'Sore throat',
];

const ConsultationNotes: React.FC<ConsultationNotesProps> = ({
  sessionId,
  patientId,
}) => {
  const [notes, setNotes] = useState<Notes>({
    doctorNotes: '',
    symptoms: [],
    diagnosis: '',
    followUpNeeded: false,
    followUpDate: null,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSymptomDialog, setShowSymptomDialog] = useState(false);
  const [newSymptom, setNewSymptom] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { updateSessionNotes } = useTelemedicine();

  useEffect(() => {
    loadNotes();
  }, [sessionId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      // In a real app, fetch existing notes from the backend
      // For now, we'll use empty notes
      setLoading(false);
    } catch (error) {
      console.error('Error loading notes:', error);
      setError('Failed to load consultation notes');
      setLoading(false);
    }
  };

  const debouncedSave = debounce(async (updatedNotes: Notes) => {
    try {
      setSaving(true);
      await updateSessionNotes(sessionId, updatedNotes);
      setSaving(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      setError('Failed to save notes');
      setSaving(false);
    }
  }, 1000);

  const handleNotesChange = (
    field: keyof Notes,
    value: string | string[] | boolean
  ) => {
    const updatedNotes = { ...notes, [field]: value };
    setNotes(updatedNotes);
    debouncedSave(updatedNotes);
  };

  const handleAddSymptom = () => {
    if (newSymptom && !notes.symptoms.includes(newSymptom)) {
      const updatedSymptoms = [...notes.symptoms, newSymptom];
      handleNotesChange('symptoms', updatedSymptoms);
      setNewSymptom('');
      setShowSymptomDialog(false);
    }
  };

  const handleRemoveSymptom = (symptom: string) => {
    const updatedSymptoms = notes.symptoms.filter(s => s !== symptom);
    handleNotesChange('symptoms', updatedSymptoms);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Consultation Notes</Typography>
        {saving && <CircularProgress size={20} />}
      </Box>

      <Box mb={3}>
        <Typography variant="subtitle2" gutterBottom>
          Symptoms
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
          {notes.symptoms.map(symptom => (
            <Chip
              key={symptom}
              label={symptom}
              onDelete={() => handleRemoveSymptom(symptom)}
            />
          ))}
        </Box>
        <Button
          startIcon={<Add />}
          size="small"
          onClick={() => setShowSymptomDialog(true)}
        >
          Add Symptom
        </Button>
      </Box>

      <TextField
        fullWidth
        multiline
        rows={4}
        label="Doctor's Notes"
        value={notes.doctorNotes}
        onChange={e => handleNotesChange('doctorNotes', e.target.value)}
        margin="normal"
      />

      <TextField
        fullWidth
        label="Diagnosis"
        value={notes.diagnosis}
        onChange={e => handleNotesChange('diagnosis', e.target.value)}
        margin="normal"
      />

      <Box mt={2}>
        <FormControlLabel
          control={
            <Switch
              checked={notes.followUpNeeded}
              onChange={e => handleNotesChange('followUpNeeded', e.target.checked)}
            />
          }
          label="Follow-up Required"
        />
        {notes.followUpNeeded && (
          <TextField
            type="date"
            label="Follow-up Date"
            value={notes.followUpDate || ''}
            onChange={e => handleNotesChange('followUpDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            margin="normal"
          />
        )}
      </Box>

      <Dialog open={showSymptomDialog} onClose={() => setShowSymptomDialog(false)}>
        <DialogTitle>Add Symptom</DialogTitle>
        <DialogContent>
          <Autocomplete
            freeSolo
            options={commonSymptoms}
            value={newSymptom}
            onChange={(_, value) => setNewSymptom(value || '')}
            onInputChange={(_, value) => setNewSymptom(value)}
            renderInput={params => (
              <TextField
                {...params}
                label="Symptom"
                margin="normal"
                fullWidth
                autoFocus
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSymptomDialog(false)}>Cancel</Button>
          <Button onClick={handleAddSymptom} color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ConsultationNotes; 