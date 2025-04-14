import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Edit,
  Save,
  ContentCopy,
  Add,
  VoiceChat
} from '@mui/icons-material';
import { useMedicalDocumentation } from '../hooks/useMedicalDocumentation';
import { VoiceRecorder } from './VoiceRecorder';

export const MedicalDocumentation: React.FC<{
  consultationId: string;
  patientId: string;
}> = ({ consultationId, patientId }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [editMode, setEditMode] = useState(false);

  const {
    generateNotes,
    updateNotes,
    notes,
    loading,
    error
  } = useMedicalDocumentation(consultationId);

  const handleVoiceInput = async (audioBlob: Blob) => {
    // Process voice input and update transcription
    const text = await processVoiceInput(audioBlob);
    setTranscription(text);
  };

  const handleGenerateNotes = async () => {
    await generateNotes({
      transcription,
      patientId,
      consultationId
    });
  };

  return (
    <Paper elevation={3} sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        AI-Assisted Medical Documentation
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Voice Input
            </Typography>
            <VoiceRecorder
              isRecording={isRecording}
              onToggleRecording={() => setIsRecording(!isRecording)}
              onRecordingComplete={handleVoiceInput}
            />
            {transcription && (
              <TextField
                fullWidth
                multiline
                rows={4}
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Generated Notes
            </Typography>
            {loading ? (
              <CircularProgress />
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : notes ? (
              <Box>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={notes.content}
                  onChange={(e) => updateNotes({ ...notes, content: e.target.value })}
                  disabled={!editMode}
                />
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <IconButton onClick={() => setEditMode(!editMode)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => navigator.clipboard.writeText(notes.content)}>
                    <ContentCopy />
                  </IconButton>
                </Box>
              </Box>
            ) : null}
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleGenerateNotes}
          disabled={loading || !transcription}
        >
          Generate Documentation
        </Button>
      </Box>
    </Paper>
  );
}; 